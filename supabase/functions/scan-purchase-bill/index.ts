// supabase/functions/scan-purchase-bill/index.ts
// Edge Function: Scan supplier bill image/PDF using Google Gemini Vision API
// Set secret: supabase secrets set GEMINI_API_KEY=your_key_here

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const GEMINI_MODEL = "gemini-2.0-flash";

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "GEMINI_API_KEY not configured. Run: supabase secrets set GEMINI_API_KEY=your_key" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { image } = body;

    if (!image) {
      return new Response(
        JSON.stringify({ error: "No image provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extract base64 data and mime type from data URL
    const match = image.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) {
      return new Response(
        JSON.stringify({ error: "Invalid image format. Expected base64 data URL." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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
      return new Response(
        JSON.stringify({ error: `Gemini API error (${geminiRes.status}): ${errText.slice(0, 200)}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const geminiData = await geminiRes.json();

    // Extract text response
    const textContent =
      geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || "";

    if (!textContent) {
      return new Response(
        JSON.stringify({ items: [], message: "AI returned empty response" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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
      return new Response(
        JSON.stringify({ items: [], message: "AI response was not valid JSON", raw: textContent.slice(0, 500) }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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

    return new Response(
      JSON.stringify({ items, count: items.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("Function error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
