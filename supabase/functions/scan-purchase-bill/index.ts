// supabase/functions/scan-purchase-bill/index.ts
// Edge Function: Scan supplier bill image/PDF using Google Gemini Vision API
// Set secret: supabase secrets set GEMINI_API_KEY=your_key_here

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const GEMINI_MODEL = "gemini-2.0-flash";

// Always return 200 so supabase.functions.invoke() doesn't throw on non-2xx
function jsonResponse(body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1. Authenticate caller (validate Supabase JWT)
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ success: false, error: "Unauthorized: Missing Authorization header", items: [] });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: authHeader }
      }
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return jsonResponse({ success: false, error: "Unauthorized: Invalid user session", items: [] });
    }

    // 2. Validate environment
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      return jsonResponse({
        success: false,
        error: "GEMINI_API_KEY not configured. Go to Supabase Dashboard → Edge Functions → Secrets and add GEMINI_API_KEY.",
        items: [],
      });
    }

    const body = await req.json();
    const { image } = body;

    if (!image) {
      return jsonResponse({ success: false, error: "No image provided", items: [] });
    }

    // Extract base64 data and mime type from data URL
    const match = image.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) {
      return jsonResponse({ success: false, error: "Invalid image format. Expected base64 data URL.", items: [] });
    }

    const mimeType = match[1]; // e.g. image/jpeg, image/png, application/pdf
    const base64Data = match[2];

    const prompt = `You are analyzing a supplier purchase bill/invoice image. Extract ALL product line items from this bill.

For each product found, return a JSON object with these fields:
- "name": product name (string, required)
- "quantity" or "stock": number of pieces/units purchased (number)
- "cost_price" or "price": unit cost/purchase price (number)
- "mrp_price" or "mrp": MRP if shown (number, 0 if not found)
- "selling_price": selling price if shown (number, 0 if not found)
- "wholesale_price": wholesale price if shown (number, 0 if not found)
- "items_per_case": pieces per case/box if shown (number, 0 if not found)

Return ONLY a valid JSON object in this exact format (no markdown, no extra text):
{"items": [{"name": "...", "quantity": 1, "cost_price": 0, "mrp_price": 0, "selling_price": 0, "wholesale_price": 0, "items_per_case": 0}]}

If you cannot detect any products, return: {"items": []}
Important: Return ONLY the JSON, nothing else.`;

    // Call Gemini API
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

    const geminiPayload = {
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inline_data: {
                mime_type: mimeType,
                data: base64Data,
              },
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 4096,
      },
    };

    const geminiRes = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(geminiPayload),
    });

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error("Gemini API error:", errText);
      let friendlyMsg = `Gemini API error (${geminiRes.status})`;
      if (geminiRes.status === 400) friendlyMsg = "Image could not be processed. Try a clearer photo.";
      else if (geminiRes.status === 403) friendlyMsg = "Gemini API key is invalid or expired. Check your GEMINI_API_KEY secret.";
      else if (geminiRes.status === 429) friendlyMsg = "Rate limit exceeded. Please wait a moment and try again.";
      return jsonResponse({ success: false, error: friendlyMsg, items: [] });
    }

    const geminiData = await geminiRes.json();

    // Extract text response
    const textContent =
      geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || "";

    if (!textContent) {
      return jsonResponse({ success: false, items: [], message: "AI returned empty response. Try a clearer photo." });
    }

    // Parse JSON from response (handle markdown code blocks)
    let parsed;
    try {
      // Try to extract JSON from markdown code block if present
      const jsonMatch = textContent.match(/```(?:json)?\s*([\s\S]*?)```/);
      const jsonStr = jsonMatch ? jsonMatch[1].trim() : textContent.trim();
      parsed = JSON.parse(jsonStr);
    } catch {
      console.error("Failed to parse AI response:", textContent);
      return jsonResponse({ success: false, items: [], message: "AI could not read the bill clearly. Try a different photo." });
    }

    // Normalize items
    const items = (parsed.items || []).map((item: any) => ({
      name: String(item.name || "Unknown Product").trim(),
      quantity: Number(item.quantity || item.stock || item.qty || 1),
      stock: Number(item.quantity || item.stock || item.qty || 1),
      cost_price: Number(item.cost_price || item.price || item.rate || item.unit_price || 0),
      mrp_price: Number(item.mrp_price || item.mrp || 0),
      selling_price: Number(item.selling_price || 0),
      wholesale_price: Number(item.wholesale_price || 0),
      items_per_case: Number(item.items_per_case || item.pcs_per_case || 0),
    }));

    return jsonResponse({ success: true, items, count: items.length });

  } catch (err) {
    console.error("Function error:", err);
    return jsonResponse({ success: false, error: err.message || "Internal server error", items: [] });
  }
});
