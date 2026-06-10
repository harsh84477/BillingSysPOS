import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { 
  SettingsCard, ColStack, TwoColGrid, FieldLabel, SettingRow, Toggle, SaveBtn 
} from '../SettingsUI';
import { 
  DEFAULT_WHATSAPP_TEMPLATE, 
  formatWhatsAppMessage, 
  parseWhatsAppMarkdown 
} from '@/lib/whatsappConfig';
import { useBusinessSettings } from '@/hooks/useBusinessSettings';
import { MessageSquare } from 'lucide-react';

const PLACEHOLDERS = [
  { code: '{business_name}', label: 'Business Name', desc: 'e.g. Invoice Adda' },
  { code: '{bill_no}', label: 'Bill Number', desc: 'e.g. INV-0001' },
  { code: '{date}', label: 'Invoice Date', desc: 'e.g. 10/06/2026' },
  { code: '{customer_name}', label: 'Customer Name', desc: 'e.g. Harsh Kumar' },
  { code: '{items}', label: 'Items List', desc: 'List of bought products' },
  { code: '{currency_symbol}', label: 'Currency', desc: 'e.g. ₹ or $' },
  { code: '{subtotal}', label: 'Subtotal Amount', desc: 'Total before taxes/discounts' },
  { code: '{discount}', label: 'Discount Amount', desc: 'e.g. 10.00' },
  { code: '{tax}', label: 'Tax / GST Amount', desc: 'e.g. 18.00' },
  { code: '{total}', label: 'Grand Total', desc: 'Final bill amount' },
  { code: '{payment_status}', label: 'Payment Status', desc: 'Paid / Draft / Unpaid' },
  { code: '{payment_method}', label: 'Payment Method', desc: 'Cash / UPI / Due' },
];

export default function WhatsappTab() {
  const { data: businessSettings } = useBusinessSettings();
  const [enabled, setEnabled] = useState(true);
  const [template, setTemplate] = useState(DEFAULT_WHATSAPP_TEMPLATE);

  // Load from LocalStorage
  useEffect(() => {
    const storedEnabled = localStorage.getItem('invoice_adda_whatsapp_enabled');
    const storedTemplate = localStorage.getItem('invoice_adda_whatsapp_template');

    if (storedEnabled !== null) {
      setEnabled(storedEnabled === 'true');
    }
    if (storedTemplate !== null) {
      setTemplate(storedTemplate);
    }
  }, []);

  const handleSave = () => {
    localStorage.setItem('invoice_adda_whatsapp_enabled', String(enabled));
    localStorage.setItem('invoice_adda_whatsapp_template', template);
    toast.success('WhatsApp sharing template saved successfully!');
  };

  const insertPlaceholder = (ph: string) => {
    const textarea = document.getElementById('whatsapp_template') as HTMLTextAreaElement;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newText = template.substring(0, start) + ph + template.substring(end);
    setTemplate(newText);
    
    // Restore selection focus
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + ph.length, start + ph.length);
    }, 10);
  };

  // Generate preview content using dummy data
  const dummyBill = {
    bill_number: 'INV-2026-0428',
    created_at: new Date(),
    customer_name: 'Harsh Kumar',
    subtotal: 350.00,
    discount_amount: 50.00,
    tax_amount: 54.00,
    total_amount: 354.00,
    payment_status: 'Paid',
    payment_method: 'UPI',
  };

  const dummyItems = [
    { product_name: 'Premium Wireless Mouse', quantity: 1, unit_price: 250.00, total_price: 250.00 },
    { product_name: 'AAA Alkaline Batteries', quantity: 2, unit_price: 50.00, total_price: 100.00 },
  ];

  const dummySettings = {
    business_name: businessSettings?.business_name || 'Invoice Adda Retail',
    currency_symbol: businessSettings?.currency_symbol || '₹',
  };

  const previewText = formatWhatsAppMessage(dummyBill, dummyItems, dummySettings, template);
  const previewHtml = parseWhatsAppMarkdown(previewText);

  return (
    <div className="flex flex-col gap-6">
      {/* Settings Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Editor (7 columns) */}
        <div className="lg:col-span-7 flex flex-col gap-5">
          <SettingsCard 
            title="WhatsApp Sharing Settings" 
            subtitle="Configure automatic receipt sharing options and customize messaging formats." 
            icon="💬" 
            accent="#25D366"
          >
            <div className="space-y-5">
              {/* Enabled Switch */}
              <SettingRow 
                label="Enable WhatsApp Sharing Options" 
                desc="Show sharing shortcuts and checkout confirmation prompts for WhatsApp."
                right={<Toggle on={enabled} onChange={setEnabled} />}
              />

              {/* Template Editor */}
              <div className="space-y-2 pt-2">
                <FieldLabel htmlFor="whatsapp_template">Message Styling Template</FieldLabel>
                <textarea
                  id="whatsapp_template"
                  value={template}
                  onChange={(e) => setTemplate(e.target.value)}
                  rows={12}
                  disabled={!enabled}
                  className="w-full p-3 font-mono text-xs border rounded-lg bg-input outline-none focus:ring-2 focus:ring-primary/50 transition-all text-foreground resize-y"
                  placeholder="Compose WhatsApp template message style..."
                  style={{ minHeight: '220px', lineHeight: '1.5' }}
                />
                <p className="text-[11px] text-muted-foreground italic mt-1">
                  Use standard WhatsApp markdown like *bold* or _italics_ to format details.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-4 border-t pt-4">
                <button
                  type="button"
                  onClick={() => setTemplate(DEFAULT_WHATSAPP_TEMPLATE)}
                  className="text-xs font-semibold text-muted-foreground hover:text-primary transition-colors hover:underline"
                  disabled={!enabled}
                >
                  Reset to Default
                </button>
                <SaveBtn label="Save Configuration" onClick={handleSave} color="#25D366" />
              </div>
            </div>
          </SettingsCard>

          {/* Placeholders Card */}
          <SettingsCard 
            title="Interactive Custom Variables" 
            subtitle="Click variables below to insert them into your text styling layout." 
            icon="🏷️" 
            accent="#3b82f6"
          >
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {PLACEHOLDERS.map((ph) => (
                <button
                  key={ph.code}
                  type="button"
                  disabled={!enabled}
                  onClick={() => insertPlaceholder(ph.code)}
                  className="text-left p-2 border rounded-lg hover:border-primary/50 hover:bg-primary/5 transition-all text-[11px] group disabled:opacity-40 disabled:pointer-events-none"
                  title={ph.desc}
                >
                  <code className="text-primary font-bold block mb-0.5 group-hover:text-primary-foreground group-hover:bg-primary px-1 rounded w-fit transition-colors">
                    {ph.code}
                  </code>
                  <span className="text-[10px] text-muted-foreground font-medium truncate block">
                    {ph.label}
                  </span>
                </button>
              ))}
            </div>
          </SettingsCard>
        </div>

        {/* Live Mock Chat Preview (5 columns) */}
        <div className="lg:col-span-5 lg:sticky lg:top-4">
          <div className="rounded-2xl border border-border overflow-hidden bg-[#E5DDD5] shadow-lg flex flex-col h-[520px]">
            {/* Mock Chat Header */}
            <div className="bg-[#075E54] text-white p-3 flex items-center justify-between gap-3 shadow-md shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center font-black text-sm text-[#25D366] border border-white/20 select-none">
                  iA
                </div>
                <div>
                  <h4 className="text-xs font-bold leading-tight">Invoice Adda Bot</h4>
                  <p className="text-[9px] text-emerald-200 font-medium">Online (Live Preview)</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-emerald-100">
                <span className="text-xs">📞</span>
                <span className="text-xs">⋮</span>
              </div>
            </div>

            {/* Chat Messages Body */}
            <div 
              className="flex-1 p-4 overflow-y-auto flex flex-col justify-end space-y-4"
              style={{
                backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")',
                backgroundSize: 'contain',
                backgroundBlendMode: 'overlay',
              }}
            >
              {/* Preview Message Bubble */}
              <div className="max-w-[85%] rounded-lg rounded-tr-none bg-white dark:bg-zinc-800 p-3 shadow-sm relative self-end text-foreground">
                {/* Bubble Tail */}
                <div className="absolute right-[-8px] top-0 w-3 h-3 bg-white dark:bg-zinc-800 clip-triangle" 
                  style={{
                    clipPath: 'polygon(0 0, 0% 100%, 100% 0)',
                  }}
                />
                
                {/* Parsed Message Content */}
                <div 
                  className="whatsapp-message-body text-xs font-sans whitespace-pre-wrap leading-relaxed select-all"
                  dangerouslySetInnerHTML={{ __html: previewHtml || '<i>No message written...</i>' }}
                />
                
                {/* Time Indicator */}
                <div className="text-[9px] text-muted-foreground text-right mt-1.5 flex items-center justify-end gap-1 select-none">
                  <span>{new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
                  <span className="text-emerald-500 font-bold">✓✓</span>
                </div>
              </div>
            </div>

            {/* Chat Input Footer */}
            <div className="bg-[#f0f0f0] dark:bg-zinc-900 p-2 flex items-center gap-2 border-t shrink-0">
              <span className="text-lg">😊</span>
              <div className="flex-1 bg-white dark:bg-zinc-800 rounded-full px-3 py-1.5 text-[11px] text-muted-foreground border border-border">
                Type a message
              </div>
              <div className="w-8 h-8 rounded-full bg-[#075E54] flex items-center justify-center text-white text-xs select-none">
                🎤
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
