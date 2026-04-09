// @ts-nocheck
import React, { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useBusinessSettings, useUpdateBusinessSettings } from '@/hooks/useBusinessSettings';
import { InvoiceTemplate } from '../bills/InvoiceTemplate';
import { toast } from 'sonner';

// ---- Toggle switch ----
const Tog = ({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) => (
  <button role="switch" aria-checked={on} onClick={() => onChange(!on)}
    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors flex-shrink-0 ${on ? 'bg-emerald-500' : 'bg-gray-200'}`}>
    <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${on ? 'translate-x-5' : 'translate-x-0.5'}`} />
  </button>
);

// ---- Stepper ----
const Stepper = ({ value, onChange, min = 0, max = 999 }: { value: number; onChange: (v: number) => void; min?: number; max?: number }) => (
  <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
    <button onClick={() => onChange(Math.max(min, value - 1))} className="w-7 h-7 bg-gray-50 hover:bg-gray-100 text-gray-500 flex items-center justify-center text-sm font-bold">-</button>
    <span className="w-8 text-center text-sm font-medium text-gray-800">{value}</span>
    <button onClick={() => onChange(Math.min(max, value + 1))} className="w-7 h-7 bg-gray-50 hover:bg-gray-100 text-gray-500 flex items-center justify-center text-sm font-bold">+</button>
  </div>
);

// ---- Chips ----
function Chips<T extends string>({ options, value, onChange, disabled }: {
  options: { value: T; label: string }[]; value: T; onChange: (v: T) => void; disabled?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map(o => (
        <button key={o.value} onClick={() => !disabled && onChange(o.value)} disabled={disabled}
          className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${value === o.value ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'}`}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ---- Section card ----
const Sec = ({ icon, title, sub, children }: { icon?: string; title: string; sub?: string; children: React.ReactNode }) => (
  <div className="bg-white rounded-xl border border-gray-100 mb-4 overflow-hidden shadow-sm">
    <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
      {icon && (
        <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-xl flex-shrink-0">{icon}</div>
      )}
      <div>
        <h3 className="text-sm font-bold text-gray-800">{title}</h3>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
    {children}
  </div>
);

// ---- Row ----
const Row = ({ label, sub, children, last }: { label: string; sub?: string; children: React.ReactNode; last?: boolean }) => (
  <div className={`flex items-center justify-between px-4 py-2.5 ${last ? '' : 'border-b border-gray-50'}`}>
    <div className="flex-1 min-w-0 pr-3">
      <p className="text-[13px] text-gray-800 leading-snug">{label}</p>
      {sub && <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>}
    </div>
    <div className="flex-shrink-0">{children}</div>
  </div>
);

// ---- CheckRow ----
const ChkRow = ({ label, sub, checked, onChange }: { label: string; sub?: string; checked: boolean; onChange: (v: boolean) => void }) => (
  <label className="flex items-center gap-2.5 px-4 py-2.5 border-b border-gray-50 last:border-b-0 cursor-pointer hover:bg-gray-50/50 transition-colors">
    <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="w-3.5 h-3.5 accent-emerald-500 flex-shrink-0" />
    <div>
      <span className="text-[13px] text-gray-800">{label}</span>
      {sub && <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>}
    </div>
  </label>
);

// ---- Field block ----
const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="p-4 border-b border-gray-50 last:border-b-0">
    <p className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase mb-2">{label}</p>
    {children}
  </div>
);

// ---- Input ----
const Inp = ({ value, onChange, placeholder, disabled }: { value: string; onChange: (v: string) => void; placeholder?: string; disabled?: boolean }) => (
  <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} disabled={disabled}
    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 disabled:opacity-50 transition-all" />
);

// ---- Textarea ----
const Txa = ({ value, onChange, placeholder, disabled }: { value: string; onChange: (v: string) => void; placeholder?: string; disabled?: boolean }) => (
  <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} disabled={disabled} rows={3}
    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 disabled:opacity-50 resize-y min-h-[64px] transition-all" />
);

// ---- Layout data ----
const REGULAR_LAYOUTS = [
  { id: 'urban_bill_style', name: 'Urban Bill',    icon: '🏙️' },
  { id: 'gst_theme_6',     name: 'GST Theme 6',   icon: '📋' },
  { id: 'classic_lite',    name: 'Classic Lite',  icon: '📄' },
  { id: 'modern_dark',     name: 'Modern Dark',   icon: '🌑' },
  { id: 'double_divine',   name: 'Double Divine', icon: '✨' },
  { id: 'french_elite',    name: 'French Elite',  icon: '🏛️' },
];
const THERMAL_LAYOUTS = [
  { id: 'theme_1', name: 'Theme 1', icon: '🧾' },
  { id: 'theme_2', name: 'Theme 2', icon: '📜' },
  { id: 'theme_3', name: 'Theme 3', icon: '📑' },
  { id: 'theme_4', name: 'Theme 4', icon: '📃' },
  { id: 'theme_5', name: 'Theme 5', icon: '🗒️' },
];

// ---- Thermal live preview ----
const ThermalPreview = ({ s }: { s: any }) => {
  const companyName = s?.print_thermal_company_name_text || s?.business_name || 'My Store';
  const isBold = s?.print_thermal_bold ?? true;
  const pageSize = s?.print_thermal_page_size || '4inch';
  const W: Record<string, number> = { '2inch': 174, '3inch': 214, '4inch': 234, custom: 234 };
  const w = W[pageSize] ?? 234;
  const items = [['Britannia Good Day', 2, 45, 90], ['Cadbury Dairy Milk', 3, 50, 150], ['Colgate MaxFresh', 1, 85, 85]];
  return (
    <div className="mx-auto rounded overflow-hidden shadow-lg border border-dashed border-gray-300" style={{ width: w, fontFamily: "'Courier New', monospace", fontSize: 8, color: '#111', background: '#fff', fontWeight: isBold ? 700 : 400 }}>
      <div className="h-2 bg-gray-100 border-b-2 border-dashed border-gray-300" />
      <div className="p-3">
        <div className="text-center border-b-2 border-dashed border-gray-300 pb-2 mb-2">
          {(s?.print_thermal_company_name ?? true) && <div style={{ fontSize: 13, fontWeight: 900 }}>{companyName}</div>}
          {(s?.print_thermal_show_address ?? true) && <div style={{ fontSize: 7 }}>Koramangala, Bangalore - 560034</div>}
          {(s?.print_thermal_show_phone ?? true) && <div style={{ fontSize: 7 }}>Ph: 9876543210</div>}
          {(s?.print_thermal_show_email ?? false) && <div style={{ fontSize: 7 }}>info@example.com</div>}
        </div>
        <div className="flex justify-between mb-1" style={{ fontSize: 7 }}><span>Bill: INV-0101</span><span>09/04/2026</span></div>
        <div className="mb-2" style={{ fontSize: 7 }}>Cust: Walk-in Customer</div>
        <div className="border-t border-b border-dashed border-gray-300 py-1 my-1">
          <div className="flex font-black border-b border-dashed border-gray-200 pb-1 mb-1" style={{ fontSize: 7 }}>
            <span className="flex-1">Item</span><span className="w-5 text-center">Q</span><span className="w-8 text-right">Rate</span><span className="w-9 text-right">Amt</span>
          </div>
          {items.map(([n, q, r, a]) => (
            <div key={String(n)} className="flex py-px" style={{ fontSize: 7 }}>
              <span className="flex-1 truncate pr-1">{n}</span>
              <span className="w-5 text-center">{q}</span>
              <span className="w-8 text-right">{r}</span>
              <span className="w-9 text-right">{Number(a).toFixed(2)}</span>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 7 }}>
          {[['Subtotal', '325.00'], ['Discount (5%)', '-15.00'], ['GST 5%', '16.25']].map(([l, v]) => (
            <div key={l} className="flex justify-between py-px"><span>{l}</span><span>{v}</span></div>
          ))}
          <div className="flex justify-between font-black border-t-2 border-dashed border-gray-400 mt-1 pt-1" style={{ fontSize: 11 }}>
            <span>TOTAL</span><span>Rs.326.25</span>
          </div>
          <div className="flex justify-between py-px" style={{ fontSize: 7 }}><span>Received</span><span>326.25</span></div>
          <div className="flex justify-between py-px" style={{ fontSize: 7 }}><span>Balance</span><span className="font-black">0.00</span></div>
        </div>
        <div className="text-center border-t border-dashed border-gray-300 mt-2 pt-1.5" style={{ fontSize: 7, color: '#666' }}>
          {s?.print_terms_conditions || 'Thank you for your purchase!'}
        </div>
      </div>
      <div className="h-2 bg-gray-100 border-t-2 border-dashed border-gray-300" />
    </div>
  );
};

// ---- Regular live preview ----
const RegularPreview = ({ s }: { s: any }) => {
  const ref = React.useRef<HTMLDivElement>(null);
  const [scale, setScale] = React.useState(0.5);
  React.useEffect(() => {
    if (!ref.current) return;
    const obs = new ResizeObserver(entries => {
      const w = entries[0].contentRect.width;
      setScale(Math.min(1, (w - 8) / 794));
    });
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  const A4_H = 1123;
  return (
    <div ref={ref} style={{ width: '100%' }}>
      {/* Page label */}
      <div style={{ textAlign: 'center', fontSize: 10, color: '#94a3b8', marginBottom: 6, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
        Page 1
      </div>
      {/* A4 paper container */}
      <div style={{ position: 'relative', width: '100%', height: A4_H * scale }}>
        <div style={{
          position: 'absolute', top: 0, left: 0,
          width: 794, minHeight: A4_H,
          background: '#fff',
          boxShadow: '0 4px 24px rgba(0,0,0,0.18), 0 1px 6px rgba(0,0,0,0.1)',
          transformOrigin: 'top left',
          transform: `scale(${scale})`,
        }}>
          <InvoiceTemplate settings={s} isPreview bill={null} items={[]} />
        </div>
      </div>
    </div>
  );
};

// ---- Main Component ----
export default function PrintSettingsTab() {
  const { isAdmin }         = useAuth();
  const { data: gSettings } = useBusinessSettings();
  const updateSettings      = useUpdateBusinessSettings();
  const [local, setLocal]   = useState<Record<string, any>>({});
  const settings = useMemo(() => ({ ...(gSettings || {}), ...local }), [gSettings, local]);
  const u = (patch: Record<string, any>) => { if (!isAdmin) return; setLocal(p => ({ ...p, ...patch })); };
  const hasChanges = Object.keys(local).length > 0;
  const isSaving   = updateSettings.isPending;
  const saveAll = () => {
    if (!hasChanges || !isAdmin) return;
    updateSettings.mutate(local, { onSuccess: () => { setLocal({}); toast.success('Print settings saved!'); } });
  };

  const [tab, setTab] = useState<'regular' | 'thermal'>('regular');
  const [appearanceTab, setAppearanceTab] = useState<'layout' | 'colors'>('layout');

  return (
    <div className="flex bg-gray-50 relative" style={{ minHeight: 'calc(100vh - 140px)' }}>

      {/* LEFT: Settings column */}
      <div className="min-w-0 overflow-y-auto p-4 pb-24" style={{ width: '60%', maxHeight: 'calc(100vh - 140px)' }}>

        {/* Printer mode toggle */}
        <div className="flex mb-4 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {(['regular', 'thermal'] as const).map((p, i) => (
            <button key={p} onClick={() => setTab(p)}
              className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-bold uppercase tracking-wide transition-all ${i === 0 ? '' : 'border-l border-gray-100'} ${tab === p ? 'bg-emerald-500 text-white' : 'bg-white text-gray-400 hover:bg-gray-50'}`}>
              <span className="text-base">{p === 'regular' ? '🖨️' : '🧾'}</span>
              {p === 'regular' ? 'Regular Printer' : 'Thermal Printer'}
            </button>
          ))}
        </div>

        {/* REGULAR SETTINGS */}
        {tab === 'regular' && (<>

          <Sec icon="🎨" title="Appearance" sub="Customize layout and colors for regular printing">
            {/* Sub-tabs */}
            <div className="flex gap-6 px-5 border-b border-gray-100">
              <button onClick={() => setAppearanceTab('layout')}
                className={`py-3 text-xs font-bold tracking-widest uppercase transition-all -mb-px ${
                  appearanceTab === 'layout' ? 'text-emerald-500 border-b-2 border-emerald-500' : 'text-gray-400 hover:text-gray-600'
                }`}>Change Layout</button>
              <button onClick={() => setAppearanceTab('colors')}
                className={`py-3 text-xs font-bold tracking-widest uppercase transition-all -mb-px ${
                  appearanceTab === 'colors' ? 'text-emerald-500 border-b-2 border-emerald-500' : 'text-gray-400 hover:text-gray-600'
                }`}>Change Colors</button>
            </div>
            {/* Horizontal scroll layout cards */}
            {appearanceTab === 'layout' && (
              <div className="flex gap-3 p-4 overflow-x-auto">
                {REGULAR_LAYOUTS.map(l => {
                  const active = (settings?.print_regular_layout || 'urban_bill_style') === l.id;
                  return (
                    <button key={l.id} onClick={() => isAdmin && u({ print_regular_layout: l.id })} disabled={!isAdmin}
                      className={`flex-shrink-0 flex flex-col items-center border-2 rounded-xl p-4 w-28 transition-all ${
                        active ? 'border-emerald-500 bg-white shadow-sm' : 'border-gray-100 bg-white hover:border-emerald-200 hover:bg-gray-50'
                      }`}>
                      <div className={`w-16 h-16 rounded-xl flex items-center justify-center text-3xl mb-2.5 ${active ? 'bg-emerald-50' : 'bg-gray-50'}`}>
                        {l.icon}
                      </div>
                      <span className={`text-[11px] font-semibold text-center leading-tight ${active ? 'text-emerald-600' : 'text-gray-600'}`}>{l.name}</span>
                      {active && (
                        <div className="mt-2 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-white text-[10px] font-black">✓</span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
            {appearanceTab === 'colors' && (
              <div className="p-5">
                <p className="text-xs text-gray-400 text-center py-4">Color themes coming soon</p>
              </div>
            )}
          </Sec>

          <Sec icon="🏢" title="Company Info / Header" sub="Business name, logo and contact details on the invoice">
            <Field label="Document Title">
              <Inp value={settings?.invoice_title || ''} onChange={v => u({ invoice_title: v })} placeholder="INVOICE" disabled={!isAdmin} />
            </Field>
            <Row label="Company Name" sub={settings?.business_name}><Tog on={settings?.print_company_name ?? true} onChange={v => u({ print_company_name: v })} /></Row>
            <Row label="Company Logo"><Tog on={settings?.print_company_logo ?? false} onChange={v => u({ print_company_logo: v })} /></Row>
            <Row label="Show Address"><Tog on={settings?.print_show_address ?? true} onChange={v => u({ print_show_address: v })} /></Row>
            <Row label="Show Phone Number"><Tog on={settings?.print_show_phone ?? true} onChange={v => u({ print_show_phone: v })} /></Row>
            <Row label="Show Email"><Tog on={settings?.print_show_email ?? true} onChange={v => u({ print_show_email: v })} /></Row>
            <Row label="Show GSTIN on Invoice"><Tog on={settings?.print_show_gstin ?? true} onChange={v => u({ print_show_gstin: v })} /></Row>
            <Row label="Repeat Header on All Pages" last><Tog on={settings?.print_repeat_header ?? false} onChange={v => u({ print_repeat_header: v })} /></Row>
          </Sec>

          <Sec icon="📐" title="Page Setup" sub="Paper size, orientation and spacing">
            <Field label="Paper Size">
              <Chips options={[{value:'A4',label:'A4'},{value:'A5',label:'A5'},{value:'Letter',label:'Letter'},{value:'Legal',label:'Legal'}]} value={settings?.print_paper_size || 'A4'} onChange={v => u({ print_paper_size: v })} disabled={!isAdmin} />
            </Field>
            <Field label="Orientation">
              <Chips options={[{value:'portrait',label:'Portrait'},{value:'landscape',label:'Landscape'}]} value={settings?.print_orientation || 'portrait'} onChange={v => u({ print_orientation: v })} disabled={!isAdmin} />
            </Field>
            <Row label="Company Name Size">
              <select value={settings?.print_company_name_size || 'large'} onChange={e => u({ print_company_name_size: e.target.value })} disabled={!isAdmin} className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:border-emerald-400 disabled:opacity-50">
                <option value="v.small">XS</option><option value="small">S</option><option value="medium">M</option><option value="large">L</option><option value="v.large">XL</option><option value="e.large">XXL</option>
              </select>
            </Row>
            <Row label="Invoice Text Size">
              <select value={settings?.print_invoice_text_size || 'medium'} onChange={e => u({ print_invoice_text_size: e.target.value })} disabled={!isAdmin} className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:border-emerald-400 disabled:opacity-50">
                <option value="v.small">XS</option><option value="small">S</option><option value="medium">M</option><option value="large">L</option><option value="v.large">XL</option>
              </select>
            </Row>
            <Row label="Regular Printer as Default"><Tog on={settings?.print_regular_default ?? false} onChange={v => u({ print_regular_default: v })} /></Row>
            <Row label="Extra Space on Top (mm)"><Stepper value={settings?.print_extra_space_top ?? 0} onChange={v => u({ print_extra_space_top: v })} /></Row>
            <Row label="Content Margin (px)" last><Stepper value={settings?.print_content_padding ?? 20} onChange={v => u({ print_content_padding: v })} /></Row>
          </Sec>

          <Sec icon="📑" title="Print Copies" sub="Number of copies and Original / Duplicate labels">
            <Row label="Print Original / Duplicate"><Tog on={settings?.print_original_duplicate ?? true} onChange={v => u({ print_original_duplicate: v })} /></Row>
            {(settings?.print_original_duplicate ?? true) && (
              <div className="px-4 py-2 border-b border-gray-50 space-y-2">
                {([['print_copy_original','Original','Original for Recipient'],['print_copy_duplicate','Duplicate','Duplicate for Transporter'],['print_copy_triplicate','Triplicate','Triplicate for Supplier']] as [string,string,string][]).map(([k,l,s]) => (
                  <label key={k} className="flex items-start gap-2 cursor-pointer py-1">
                    <input type="checkbox" checked={settings?.[k] ?? (k==='print_copy_triplicate'?false:true)} onChange={e => u({ [k]: e.target.checked })} className="mt-0.5 w-3.5 h-3.5 accent-emerald-500" />
                    <div><p className="text-[13px] text-gray-800">{l}</p><p className="text-[10px] text-gray-400">{s}</p></div>
                  </label>
                ))}
              </div>
            )}
            <Field label="Default No. of Copies">
              <Chips options={[{value:'1',label:'1 Copy'},{value:'2',label:'2 Copies'},{value:'3',label:'3 Copies'}]} value={String(settings?.print_default_copies ?? 1)} onChange={v => u({ print_default_copies: Number(v) })} disabled={!isAdmin} />
            </Field>
          </Sec>

          <Sec icon="📋" title="Item Table Customization" sub="Columns to show in the item summary table">
            <div className="grid grid-cols-2">
              {([['print_show_item_number','Sr. No. (#)'],['print_show_hsn_sac','HSN/SAC Code'],['print_show_quantity','Quantity'],['print_show_price_unit','Unit Price'],['print_show_discount','Discount %'],['print_show_gst','GST Column'],['print_show_mrp','MRP Column']] as [string,string][]).map(([k,l]) => (
                <ChkRow key={k} label={l} checked={settings?.[k] ?? (k==='print_show_mrp'?false:true)} onChange={v => u({ [k]: v })} />
              ))}
            </div>
            <Row label="Min Rows in Table" sub="Pad with blank rows" last>
              <Stepper value={settings?.print_min_table_rows ?? 5} onChange={v => u({ print_min_table_rows: v })} />
            </Row>
          </Sec>

          <Sec icon="🧮" title="Totals & Taxes" sub="Amount display, tax breakdown and rounding options">
            {([['print_tax_details','Show GST / Tax Summary'],['print_total_item_quantity','Total Item Quantity'],['print_received_amount','Received Amount'],['print_balance_amount','Balance Amount'],['print_current_balance','Current Party Balance'],['print_amount_decimal','Amount with Decimal'],['print_amount_grouping','Group Large Numbers'],['print_you_saved','You Saved (discount)']] as [string,string][]).map(([k,l]) => (
              <Row key={k} label={l}><Tog on={settings?.[k] ?? true} onChange={v => u({ [k]: v })} /></Row>
            ))}
            <Row label="Amount in Words" last>
              <div className="flex items-center gap-2">
                <Tog on={settings?.print_amount_words ?? false} onChange={v => u({ print_amount_words: v })} />
                <select value={settings?.print_amount_words_format || 'indian'} onChange={e => u({ print_amount_words_format: e.target.value })} className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:border-emerald-400">
                  <option value="indian">Indian</option><option value="international">International</option>
                </select>
              </div>
            </Row>
          </Sec>

          <Sec icon="🏦" title="Bank Details" sub="Bank account and UPI payment information">
            <Row label="Show Bank Details on Invoice"><Tog on={settings?.print_bank_details ?? true} onChange={v => u({ print_bank_details: v })} /></Row>
            {(settings?.print_bank_details ?? true) && (<>
              <Field label="Bank Name"><Inp value={settings?.print_bank_name || ''} onChange={v => u({ print_bank_name: v })} placeholder="e.g. HDFC Bank" disabled={!isAdmin} /></Field>
              <Field label="Account Number"><Inp value={settings?.print_bank_account || ''} onChange={v => u({ print_bank_account: v })} placeholder="e.g. 1234567890" disabled={!isAdmin} /></Field>
              <Field label="IFSC Code"><Inp value={settings?.print_bank_ifsc || ''} onChange={v => u({ print_bank_ifsc: v })} placeholder="e.g. HDFC0001234" disabled={!isAdmin} /></Field>
            </>)}
            <Row label="Print UPI QR Code"><Tog on={settings?.print_upi_qr ?? true} onChange={v => u({ print_upi_qr: v })} /></Row>
            {(settings?.print_upi_qr ?? true) && (
              <Field label="UPI ID"><Inp value={settings?.upi_id || ''} onChange={v => u({ upi_id: v })} placeholder="yourname@bank" disabled={!isAdmin} /></Field>
            )}
            <Row label="Print PAY NOW Button" last><Tog on={settings?.print_pay_now_btn ?? true} onChange={v => u({ print_pay_now_btn: v })} /></Row>
          </Sec>

          <Sec icon="📝" title="Footer" sub="Terms, conditions and signature at the bottom">
            <Field label="Terms and Conditions / Footer Text">
              <Txa value={settings?.print_terms_conditions || ''} onChange={v => u({ print_terms_conditions: v })} placeholder="Thank you for your business!" disabled={!isAdmin} />
            </Field>
            {([['print_description','Print Description on Invoice'],['print_received_by','Received By'],['print_delivered_by','Delivered By'],['print_payment_mode','Payment Mode'],['print_acknowledgement','Print Acknowledgement'],['print_show_signature','Print Signature']] as [string,string][]).map(([k,l]) => (
              <Row key={k} label={l}><Tog on={settings?.[k] ?? false} onChange={v => u({ [k]: v })} /></Row>
            ))}
            {(settings?.print_show_signature ?? false) && (
              <Field label="Signature Label">
                <Inp value={settings?.print_signature_text || ''} onChange={v => u({ print_signature_text: v })} placeholder="Authorized Signatory" disabled={!isAdmin} />
              </Field>
            )}
          </Sec>

        </>)}

        {/* THERMAL SETTINGS */}
        {tab === 'thermal' && (<>

          <Sec icon="🎨" title="Appearance" sub="Choose a receipt print style">
            <div className="flex gap-3 p-4 overflow-x-auto">
              {THERMAL_LAYOUTS.map(l => {
                const active = (settings?.print_thermal_layout || 'theme_1') === l.id;
                return (
                  <button key={l.id} onClick={() => isAdmin && u({ print_thermal_layout: l.id })} disabled={!isAdmin}
                    className={`flex-shrink-0 flex flex-col items-center border-2 rounded-xl p-4 w-24 transition-all ${
                      active ? 'border-emerald-500 bg-white shadow-sm' : 'border-gray-100 bg-white hover:border-emerald-200 hover:bg-gray-50'
                    }`}>
                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-2xl mb-2 ${active ? 'bg-emerald-50' : 'bg-gray-50'}`}>
                      {l.icon}
                    </div>
                    <span className={`text-[11px] font-semibold ${active ? 'text-emerald-600' : 'text-gray-600'}`}>{l.name}</span>
                    {active && (
                      <div className="mt-1.5 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-[9px] font-black">✓</span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </Sec>

          <Sec icon="⚙️" title="Paper & Hardware Config" sub="Roll width, cut, cash drawer and copy settings">
            <Field label="Paper / Roll Width">
              <Chips options={[{value:'2inch',label:'2in 58mm'},{value:'3inch',label:'3in 80mm'},{value:'4inch',label:'4in 80mm'},{value:'custom',label:'Custom'}]} value={settings?.print_thermal_page_size || '4inch'} onChange={v => u({ print_thermal_page_size: v })} disabled={!isAdmin} />
            </Field>
            <Row label="Printing Type">
              <select value={settings?.print_thermal_printing_type || 'text'} onChange={e => u({ print_thermal_printing_type: e.target.value })} disabled={!isAdmin} className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:border-emerald-400 disabled:opacity-50">
                <option value="text">Text (Fast)</option>
                <option value="graphic">Graphic (Rich)</option>
                <option value="escpos">ESC/POS</option>
              </select>
            </Row>
            <Row label="Make Thermal Printer Default"><Tog on={settings?.print_thermal_default ?? false} onChange={v => u({ print_thermal_default: v })} /></Row>
            <Row label="Bold Text Styling"><Tog on={settings?.print_thermal_bold ?? true} onChange={v => u({ print_thermal_bold: v })} /></Row>
            <Row label="Auto-Cut Paper After Print"><Tog on={settings?.print_thermal_auto_cut ?? false} onChange={v => u({ print_thermal_auto_cut: v })} /></Row>
            <Row label="Open Cash Drawer After Print"><Tog on={settings?.print_thermal_open_drawer ?? false} onChange={v => u({ print_thermal_open_drawer: v })} /></Row>
            <Row label="Extra Blank Lines at End"><Stepper value={settings?.print_thermal_extra_lines ?? 0} onChange={v => u({ print_thermal_extra_lines: v })} /></Row>
            <Row label="Number of Copies" last><Stepper value={settings?.print_thermal_copies ?? 1} onChange={v => u({ print_thermal_copies: v })} min={1} /></Row>
          </Sec>

          <Sec icon="🏢" title="Company Info / Header" sub="Business name and contact details on the receipt">
            <ChkRow label="Company Name" checked={settings?.print_thermal_company_name ?? true} onChange={v => u({ print_thermal_company_name: v })} />
            {(settings?.print_thermal_company_name ?? true) && (
              <div className="px-4 py-2 border-b border-gray-50">
                <Inp value={settings?.print_thermal_company_name_text || settings?.business_name || ''} onChange={v => u({ print_thermal_company_name_text: v })} placeholder="My Business" disabled={!isAdmin} />
              </div>
            )}
            <ChkRow label="Company Logo" checked={settings?.print_thermal_company_logo ?? false} onChange={v => u({ print_thermal_company_logo: v })} />
            <ChkRow label="Address" checked={settings?.print_thermal_show_address ?? true} onChange={v => u({ print_thermal_show_address: v })} />
            <ChkRow label="Phone Number" checked={settings?.print_thermal_show_phone ?? true} onChange={v => u({ print_thermal_show_phone: v })} />
            <ChkRow label="Email" checked={settings?.print_thermal_show_email ?? false} onChange={v => u({ print_thermal_show_email: v })} />
            <ChkRow label="GSTIN on Receipt" checked={settings?.print_thermal_show_gstin ?? true} onChange={v => u({ print_thermal_show_gstin: v })} />
          </Sec>

          <Sec icon="📝" title="Footer" sub="Thank-you message at the bottom of the receipt">
            <Field label="Footer / Thank-You Text">
              <Txa value={settings?.print_terms_conditions || ''} onChange={v => u({ print_terms_conditions: v })} placeholder="Thank you for your purchase!" disabled={!isAdmin} />
            </Field>
          </Sec>

        </>)}
      </div>

      {/* RIGHT: Live Preview */}
      <div className="flex-shrink-0 sticky top-0 flex flex-col bg-white border-l border-gray-100 overflow-hidden" style={{ width: '40%', height: 'calc(100vh - 140px)' }}>
        <div className="flex items-center gap-2 px-3 py-2.5 border-b border-gray-100 bg-gray-50/60 flex-shrink-0">
          <span className="text-[11px] font-semibold text-gray-600 flex-1 truncate">
            {tab === 'regular' ? 'Regular Invoice' : 'Thermal Receipt'}
          </span>
          <span className="text-[9px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-bold flex-shrink-0">
            {tab === 'regular'
              ? (settings?.print_paper_size || 'A4')
              : (settings?.print_thermal_page_size === '2inch' ? '2in-58mm' : settings?.print_thermal_page_size === '3inch' ? '3in-76mm' : '4in-80mm')}
          </span>
        </div>
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 bg-gray-100">
          {tab === 'regular' ? <RegularPreview s={settings} /> : <ThermalPreview s={settings} />}
        </div>
      </div>

      {/* Fixed Save Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-gray-100 px-5 py-3 flex justify-end gap-2 z-30" style={{ boxShadow: '0 -2px 12px rgba(0,0,0,0.06)' }}>
        <button onClick={() => { setLocal({}); toast('Changes reset'); }} disabled={!hasChanges}
          className="px-4 py-2 text-sm text-gray-500 border border-gray-200 rounded-lg bg-gray-50 hover:bg-gray-100 disabled:opacity-40 transition-all">
          Reset
        </button>
        <button onClick={saveAll} disabled={!hasChanges || isSaving || !isAdmin}
          className="px-5 py-2 text-sm font-semibold text-white bg-emerald-500 hover:bg-emerald-600 rounded-lg transition-colors disabled:opacity-40 shadow-sm">
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}