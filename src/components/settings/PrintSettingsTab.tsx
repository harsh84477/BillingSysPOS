import React, { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useBusinessSettings, useUpdateBusinessSettings } from '@/hooks/useBusinessSettings';
import { InvoiceTemplate } from '../bills/InvoiceTemplate';
import { Toggle, Counter, T, op } from '@/components/settings/SettingsUI';

/* ─── Layout lists ─── */
const REGULAR_LAYOUTS = [
  { id: 'urban_bill_style', name: 'Urban Bill', icon: '🏙️' },
  { id: 'gst_theme_6',     name: 'GST Theme 6', icon: '📋' },
  { id: 'classic_lite',    name: 'Classic Lite', icon: '📄' },
  { id: 'modern_dark',     name: 'Modern Dark',  icon: '🌙' },
  { id: 'double_divine',   name: 'Double Divine', icon: '✨' },
  { id: 'french_elite',    name: 'French Elite', icon: '🏛️' },
];
const THERMAL_LAYOUTS = [
  { id: 'theme_1', name: 'Theme 1', icon: '🧾' },
  { id: 'theme_2', name: 'Theme 2', icon: '📜' },
  { id: 'theme_3', name: 'Theme 3', icon: '📑' },
  { id: 'theme_4', name: 'Theme 4', icon: '📃' },
  { id: 'theme_5', name: 'Theme 5', icon: '🗒️' },
];

/* ─── Section header ─── */
function Sec({ title }: { title: string }) {
  return (
    <div style={{ padding: '22px 0 10px' }}>
      <div style={{ fontSize: '15px', fontWeight: 700, color: T.color.textPri }}>{title}</div>
      <div style={{ height: '1.5px', background: `linear-gradient(to right, hsl(var(--primary)), transparent)`, marginTop: '6px', borderRadius: '2px' }} />
    </div>
  );
}

/* ─── Row: label + right control ─── */
function Row({ label, desc, right, noBorder }: { label: string; desc?: string; right: React.ReactNode; noBorder?: boolean }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: '16px', padding: '13px 0',
      borderBottom: noBorder ? 'none' : `1px solid ${op(T.color.border, 60)}`,
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '13.5px', fontWeight: 550, color: T.color.textPri, lineHeight: 1.3 }}>{label}</div>
        {desc && <div style={{ fontSize: '11.5px', color: T.color.textMuted, marginTop: '2px', lineHeight: 1.4 }}>{desc}</div>}
      </div>
      <div style={{ flexShrink: 0 }}>{right}</div>
    </div>
  );
}

/* ─── Checkbox row ─── */
function Check({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '14px', padding: '12px 0',
      borderBottom: `1px solid ${op(T.color.border, 50)}`, cursor: disabled ? 'not-allowed' : 'pointer',
    }} onClick={() => !disabled && onChange(!checked)}>
      <div style={{
        width: '20px', height: '20px', borderRadius: '5px', flexShrink: 0,
        border: `2px solid ${checked ? 'hsl(var(--primary))' : T.color.border}`,
        background: checked ? 'hsl(var(--primary))' : 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.18s', opacity: disabled ? 0.5 : 1,
      }}>
        {checked && <span style={{ color: '#fff', fontSize: '11px', fontWeight: 800, lineHeight: 1 }}>✓</span>}
      </div>
      <span style={{ fontSize: '13.5px', fontWeight: 500, color: T.color.textPri, opacity: disabled ? 0.5 : 1 }}>{label}</span>
    </div>
  );
}

/* ─── 2×2 Layout Grid ─── */
function LayoutGrid({ layouts, selected, onSelect, disabled }: {
  layouts: { id: string; name: string; icon: string }[];
  selected: string; onSelect: (id: string) => void; disabled?: boolean;
}) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', padding: '4px 0 8px' }}>
      {layouts.map(l => {
        const active = selected === l.id;
        return (
          <button key={l.id} type="button" disabled={disabled}
            onClick={() => !disabled && onSelect(l.id)}
            style={{
              padding: '16px 10px', borderRadius: '12px', textAlign: 'center' as const,
              border: `2px solid ${active ? 'hsl(var(--primary))' : T.color.border}`,
              background: active ? op('hsl(var(--primary))', 6) : T.color.cardBg,
              boxShadow: active ? `0 0 0 3px ${op('hsl(var(--primary))', 12)}` : T.shadow.card,
              cursor: disabled ? 'not-allowed' : 'pointer', fontFamily: T.font,
              opacity: disabled ? 0.5 : 1, transition: 'all 0.2s',
            }}>
            <div style={{ fontSize: '28px', marginBottom: '8px', lineHeight: 1 }}>{l.icon}</div>
            <div style={{ fontSize: '12px', fontWeight: active ? 700 : 500, color: active ? 'hsl(var(--primary))' : T.color.textPri, lineHeight: 1.3 }}>{l.name}</div>
            {active && <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: 'hsl(var(--primary))', color: '#fff', fontSize: '9px', fontWeight: 800, margin: '6px auto 0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✓</div>}
          </button>
        );
      })}
    </div>
  );
}

/* ─── Pill button group ─── */
function PillGroup({ options, value, onChange, disabled }: {
  options: { value: string; label: string; icon?: string }[];
  value: string; onChange: (v: string) => void; disabled?: boolean;
}) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: '6px' }}>
      {options.map(o => {
        const active = value === o.value;
        return (
          <button key={o.value} type="button" disabled={disabled}
            onClick={() => !disabled && onChange(o.value)}
            style={{
              padding: '7px 16px', borderRadius: '20px', fontFamily: T.font,
              fontSize: '12.5px', fontWeight: active ? 700 : 500,
              border: `1.5px solid ${active ? 'hsl(var(--primary))' : T.color.border}`,
              background: active ? 'hsl(var(--primary))' : T.color.cardBg,
              color: active ? '#fff' : T.color.textPri,
              cursor: disabled ? 'not-allowed' : 'pointer',
              opacity: disabled ? 0.5 : 1, transition: 'all 0.18s',
              display: 'flex', alignItems: 'center', gap: '5px',
            }}>
            {o.icon && <span style={{ fontSize: '13px' }}>{o.icon}</span>}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/* ─── Label above field ─── */
function FieldLbl({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: '11px', fontWeight: 600, color: T.color.textMuted, letterSpacing: '0.07em', textTransform: 'uppercase' as const, marginBottom: '6px' }}>{children}</div>;
}

/* ─── Text input ─── */
function Input({ value, onChange, placeholder, disabled }: { value: string; onChange: (v: string) => void; placeholder?: string; disabled?: boolean }) {
  return (
    <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} disabled={disabled}
      style={{ width: '100%', padding: '10px 14px', fontSize: '13.5px', borderRadius: '10px', border: `1.5px solid ${T.color.border}`, background: T.color.inputBg, outline: 'none', fontFamily: T.font, color: T.color.textPri, boxSizing: 'border-box' as const, opacity: disabled ? 0.5 : 1, transition: 'border 0.18s' }}
      onFocus={e => { e.currentTarget.style.borderColor = 'hsl(var(--primary))'; }}
      onBlur={e => { e.currentTarget.style.borderColor = T.color.border; }}
    />
  );
}

/* ─── Textarea ─── */
function Textarea({ value, onChange, placeholder, disabled, rows = 4 }: { value: string; onChange: (v: string) => void; placeholder?: string; disabled?: boolean; rows?: number }) {
  return (
    <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} disabled={disabled} rows={rows}
      style={{ width: '100%', padding: '10px 14px', fontSize: '13.5px', borderRadius: '10px', border: `1.5px solid ${T.color.border}`, background: T.color.inputBg, outline: 'none', fontFamily: T.font, color: T.color.textPri, boxSizing: 'border-box' as const, opacity: disabled ? 0.5 : 1, resize: 'vertical' as const, transition: 'border 0.18s' }}
      onFocus={e => { e.currentTarget.style.borderColor = 'hsl(var(--primary))'; }}
      onBlur={e => { e.currentTarget.style.borderColor = T.color.border; }}
    />
  );
}

/* ─── Card wrapper ─── */
function Card({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: T.color.cardBg, borderRadius: '14px', border: `1px solid ${T.color.border}`, boxShadow: T.shadow.card, padding: '0 18px' }}>
      {children}
    </div>
  );
}

/* ─── Divider inside card ─── */
function Divider() {
  return <div style={{ height: '1px', background: op(T.color.border, 50), margin: '0' }} />;
}

/* ═══════════════════════════════════════════════════════════════
   LIVE PREVIEW — Regular
   ═══════════════════════════════════════════════════════════════ */
function RegularPreview({ s }: { s: any }) {
  return <InvoiceTemplate settings={s} isPreview={true} bill={null} items={[]} />;
}

/* ═══════════════════════════════════════════════════════════════
   LIVE PREVIEW — Thermal
   ═══════════════════════════════════════════════════════════════ */
function ThermalPreview({ s }: { s: any }) {
  const companyName = s?.print_thermal_company_name_text || s?.business_name || 'My Company';
  const phone = s?.phone || '9876543210';
  const isBold = s?.print_thermal_bold ?? true;
  const showAddr = s?.print_thermal_show_address ?? true;
  const showPhone = s?.print_thermal_show_phone ?? true;
  const showEmail = s?.print_thermal_show_email ?? false;
  const showGstin = s?.print_thermal_show_gstin ?? true;
  const pageSize = s?.print_thermal_page_size || '4inch';
  const maxW = pageSize === '2inch' ? '220px' : pageSize === '3inch' ? '280px' : '340px';
  const fs = pageSize === '2inch' ? '9px' : '11px';
  const sampleItems = [
    { name: 'Britannia Good Day', qty: 2, price: 45.00, amt: 90.00 },
    { name: 'Cadbury Dairy Milk', qty: 3, price: 50.00, amt: 150.00 },
    { name: 'Colgate MaxFresh',   qty: 1, price: 85.00, amt: 85.00 },
  ];
  const grandTotal = 326.25;
  return (
    <div style={{ background: '#fff', color: '#111', fontFamily: "'Courier New', monospace", fontSize: fs, lineHeight: 1.5, padding: '16px 12px', maxWidth: maxW, margin: '0 auto', fontWeight: isBold ? 700 : 400 }}>
      <div style={{ textAlign: 'center', borderBottom: '2px dashed #aaa', paddingBottom: '8px', marginBottom: '8px' }}>
        {(s?.print_thermal_company_name ?? true) && <div style={{ fontSize: pageSize === '2inch' ? '12px' : '14px', fontWeight: 800 }}>{companyName}</div>}
        {showAddr && <div style={{ fontSize: '9px', marginTop: '2px' }}>Koramangala, Bangalore, Karnataka</div>}
        {showPhone && <div style={{ fontSize: '9px' }}>Ph: {phone}</div>}
        {showEmail && <div style={{ fontSize: '9px' }}>{s?.email || 'email@example.com'}</div>}
        {showGstin && s?.gst_number && <div style={{ fontSize: '9px' }}>GSTIN: {s.gst_number}</div>}
      </div>
      <div style={{ fontSize: '9px', marginBottom: '6px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Bill No: INV-101</span><span>06/04/2026</span></div>
        <div>Customer: <strong>Walk-in Customer</strong></div>
      </div>
      <div style={{ borderTop: '1px dashed #999', borderBottom: '1px dashed #999', padding: '4px 0', margin: '4px 0' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '18px 1fr 28px 48px 52px', gap: '2px', fontSize: '9px', fontWeight: 800, borderBottom: '1px dashed #ccc', paddingBottom: '3px', marginBottom: '3px' }}>
          <span>#</span><span>Item</span><span>Qty</span><span>Rate</span><span style={{ textAlign: 'right' }}>Amt</span>
        </div>
        {sampleItems.map((item, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '18px 1fr 28px 48px 52px', gap: '2px', fontSize: '9px', padding: '2px 0' }}>
            <span>{i + 1}</span><span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</span>
            <span>{item.qty}</span><span>{item.price.toFixed(2)}</span><span style={{ textAlign: 'right' }}>{item.amt.toFixed(2)}</span>
          </div>
        ))}
      </div>
      <div style={{ fontSize: '9px', padding: '4px 0', borderBottom: '1px dashed #999' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Subtotal</span><span>325.00</span></div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Discount</span><span>-15.00</span></div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Tax (5%)</span><span>16.25</span></div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '12px', marginTop: '4px', borderTop: '1px dashed #ccc', paddingTop: '4px' }}>
          <span>TOTAL</span><span>₹{grandTotal.toFixed(2)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Received</span><span>{grandTotal.toFixed(2)}</span></div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Balance</span><span>0.00</span></div>
      </div>
      <div style={{ textAlign: 'center', padding: '8px 0', fontSize: '9px', color: '#666' }}>
        {s?.print_terms_conditions || 'Thank you for your purchase!'}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════ */
export default function PrintSettingsTab() {
  const { isAdmin } = useAuth();
  const { data: globalSettings } = useBusinessSettings();
  const updateSettings = useUpdateBusinessSettings();

  const [localSettings, setLocalSettings] = useState<any>({});
  const settings = useMemo(() => ({ ...(globalSettings || {}), ...localSettings }), [globalSettings, localSettings]);

  const u = (patch: any) => { if (!isAdmin) return; setLocalSettings((p: any) => ({ ...p, ...patch })); };
  const hasChanges = Object.keys(localSettings).length > 0;
  const isSaving = updateSettings.isPending;
  const saveAll = () => {
    if (!hasChanges || !isAdmin) return;
    updateSettings.mutate(localSettings, { onSuccess: () => setLocalSettings({}) });
  };

  const [printerTab, setPrinterTab] = useState<'regular' | 'thermal'>('regular');
  const [showPreview, setShowPreview] = useState(false);

  const previewContent = (
    <div style={{ borderRadius: '8px', overflow: 'hidden', boxShadow: '0 2px 16px rgba(0,0,0,0.08)' }}>
      {printerTab === 'regular' ? <RegularPreview s={settings} /> : <ThermalPreview s={settings} />}
    </div>
  );

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', fontFamily: T.font }}>

      {/* ── Printer type switcher ── */}
      <div style={{ display: 'flex', background: op(T.color.border, 30), borderRadius: '12px', padding: '4px', gap: '4px', marginBottom: '4px' }}>
        {([
          { id: 'regular' as const, label: 'Regular Printer', icon: '🖨️' },
          { id: 'thermal' as const, label: 'Thermal Printer', icon: '🧾' },
        ]).map(tab => {
          const active = tab.id === printerTab;
          return (
            <button key={tab.id} type="button" onClick={() => setPrinterTab(tab.id)} style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
              padding: '11px 12px', borderRadius: '9px', border: 'none', cursor: 'pointer',
              fontFamily: T.font, fontSize: '13px', fontWeight: active ? 700 : 500,
              color: active ? '#fff' : T.color.textSec,
              background: active ? `linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.85))` : 'transparent',
              boxShadow: active ? '0 2px 8px rgba(0,0,0,0.15)' : 'none',
              transition: 'all 0.2s',
            }}>
              <span>{tab.icon}</span>
              <span className="ps-tab-label">{tab.label}</span>
              <span className="ps-tab-short" style={{ display: 'none' }}>{tab.id === 'regular' ? 'Regular' : 'Thermal'}</span>
            </button>
          );
        })}
      </div>

      {/* ══════════ REGULAR PRINTER SETTINGS ══════════ */}
      {printerTab === 'regular' && (
        <>
          {/* ── Appearance ── */}
          <Sec title="Appearance" />
          <Card>
            <div style={{ padding: '16px 0' }}>
              <LayoutGrid
                layouts={REGULAR_LAYOUTS}
                selected={settings?.print_regular_layout || 'urban_bill_style'}
                onSelect={id => u({ print_regular_layout: id })}
                disabled={!isAdmin}
              />
            </div>
          </Card>

          {/* ── Company Info / Header ── */}
          <Sec title="Company Info/Header" />
          <Card>
            <Row label="Print Company Logo" right={<Toggle on={settings?.print_company_logo ?? false} onChange={v => u({ print_company_logo: v })} disabled={!isAdmin} />} />
            <Row label="Extra Space on Top (mm)" right={<Counter value={settings?.print_extra_space_top ?? 0} min={0} max={200} onChange={v => u({ print_extra_space_top: v })} disabled={!isAdmin} />} />
            <Row label="Show Address" right={<Toggle on={settings?.print_show_address ?? true} onChange={v => u({ print_show_address: v })} disabled={!isAdmin} />} />
            <Row label="Show Phone Number" right={<Toggle on={settings?.print_show_phone ?? true} onChange={v => u({ print_show_phone: v })} disabled={!isAdmin} />} />
            <Row label="Show Email" right={<Toggle on={settings?.print_show_email ?? true} onChange={v => u({ print_show_email: v })} disabled={!isAdmin} />} />
            <Row label="Show GSTIN on Invoice" right={<Toggle on={settings?.print_show_gstin ?? true} onChange={v => u({ print_show_gstin: v })} disabled={!isAdmin} />} />
            <Row label="Company Name" right={<Toggle on={settings?.print_company_name ?? true} onChange={v => u({ print_company_name: v })} disabled={!isAdmin} />} />
            <Row label="Repeat header on all pages" noBorder right={<Toggle on={settings?.print_repeat_header ?? false} onChange={v => u({ print_repeat_header: v })} disabled={!isAdmin} />} />
          </Card>

          {/* ── Page Setup ── */}
          <Sec title="Page Setup" />
          <Card>
            <div style={{ padding: '14px 0', borderBottom: `1px solid ${op(T.color.border, 50)}` }}>
              <FieldLbl>Paper Size</FieldLbl>
              <PillGroup
                value={settings?.print_paper_size || 'A4'}
                onChange={v => u({ print_paper_size: v })}
                disabled={!isAdmin}
                options={[
                  { value: 'A4', label: 'A4' },
                  { value: 'A5', label: 'A5' },
                  { value: 'Letter', label: 'Letter' },
                  { value: 'Legal', label: 'Legal' },
                ]}
              />
            </div>
            <div style={{ padding: '14px 0', borderBottom: `1px solid ${op(T.color.border, 50)}` }}>
              <FieldLbl>Orientation</FieldLbl>
              <PillGroup
                value={settings?.print_orientation || 'portrait'}
                onChange={v => u({ print_orientation: v })}
                disabled={!isAdmin}
                options={[
                  { value: 'portrait', label: 'Portrait', icon: '🖨️' },
                  { value: 'landscape', label: 'Landscape', icon: '🛫' },
                ]}
              />
            </div>
            <Row label="Regular Printer Default" right={<Toggle on={settings?.print_regular_default ?? false} onChange={v => u({ print_regular_default: v })} disabled={!isAdmin} />} />
            <Row label="Company Name Size" right={
              <select value={settings?.print_company_name_size || 'large'} onChange={e => u({ print_company_name_size: e.target.value })} disabled={!isAdmin}
                style={{ padding: '7px 10px', borderRadius: '8px', border: `1.5px solid ${T.color.border}`, background: T.color.inputBg, fontFamily: T.font, fontSize: '13px', color: T.color.textPri, outline: 'none', cursor: 'pointer', opacity: !isAdmin ? 0.5 : 1 }}>
                {['v.small','small','medium','large','v.large','e.large'].map(s => <option key={s} value={s}>{s.replace('v.','V. ').replace('e.','E. ').replace(/^\w/, c => c.toUpperCase())}</option>)}
              </select>
            } />
            <Row label="Invoice Text Size" noBorder right={
              <select value={settings?.print_invoice_text_size || 'medium'} onChange={e => u({ print_invoice_text_size: e.target.value })} disabled={!isAdmin}
                style={{ padding: '7px 10px', borderRadius: '8px', border: `1.5px solid ${T.color.border}`, background: T.color.inputBg, fontFamily: T.font, fontSize: '13px', color: T.color.textPri, outline: 'none', cursor: 'pointer', opacity: !isAdmin ? 0.5 : 1 }}>
                {['v.small','small','medium','large','v.large','e.large'].map(s => <option key={s} value={s}>{s.replace('v.','V. ').replace('e.','E. ').replace(/^\w/, c => c.toUpperCase())}</option>)}
              </select>
            } />
          </Card>

          {/* ── Item Table Customization ── */}
          <Sec title="Item Table Customization" />
          <Card>
            <Check checked={settings?.print_show_hsn_sac ?? true} onChange={v => u({ print_show_hsn_sac: v, print_show_code: v })} label="HSN/SAC Code" disabled={!isAdmin} />
            <Check checked={settings?.print_show_item_number ?? true} onChange={v => u({ print_show_item_number: v, print_show_index: v })} label="Item Description (#)" disabled={!isAdmin} />
            <Check checked={settings?.print_show_price_unit ?? true} onChange={v => u({ print_show_price_unit: v })} label="Unit Price" disabled={!isAdmin} />
            <Check checked={settings?.print_show_discount ?? true} onChange={v => u({ print_show_discount: v })} label="Discount %" disabled={!isAdmin} />
            <Check checked={settings?.print_show_quantity ?? true} onChange={v => u({ print_show_quantity: v })} label="Quantity" disabled={!isAdmin} />
            <Check checked={settings?.print_show_gst ?? true} onChange={v => u({ print_show_gst: v, print_show_tax: v })} label="GST Column" disabled={!isAdmin} />
            <Check checked={settings?.print_show_mrp ?? false} onChange={v => u({ print_show_mrp: v })} label="MRP Column" disabled={!isAdmin} />
            <div style={{ padding: '14px 0' }}>
              <Row label="Min No. of Rows" noBorder right={<Counter value={settings?.print_min_table_rows ?? 5} min={0} max={20} onChange={v => u({ print_min_table_rows: v })} disabled={!isAdmin} />} />
            </div>
          </Card>

          {/* ── Totals & Taxes ── */}
          <Sec title="Totals & Taxes" />
          <Card>
            <Row label="Show GST Summary" right={<Toggle on={settings?.print_tax_details ?? true} onChange={v => u({ print_tax_details: v })} disabled={!isAdmin} />} />
            <Row label="Total Item Quantity" right={<Toggle on={settings?.print_total_item_quantity ?? true} onChange={v => u({ print_total_item_quantity: v })} disabled={!isAdmin} />} />
            <Row label="Received Amount" right={<Toggle on={settings?.print_received_amount ?? true} onChange={v => u({ print_received_amount: v })} disabled={!isAdmin} />} />
            <Row label="Balance Amount" right={<Toggle on={settings?.print_balance_amount ?? true} onChange={v => u({ print_balance_amount: v })} disabled={!isAdmin} />} />
            <Row label="Amount with Decimal" right={<Toggle on={settings?.print_amount_decimal ?? true} onChange={v => u({ print_amount_decimal: v })} disabled={!isAdmin} />} />
            <Row label="You Saved" right={<Toggle on={settings?.print_you_saved ?? true} onChange={v => u({ print_you_saved: v })} disabled={!isAdmin} />} />
            <Row label="Amount in Words" noBorder right={<Toggle on={settings?.print_amount_words ?? false} onChange={v => u({ print_amount_words: v })} disabled={!isAdmin} />} />
          </Card>

          {/* ── Bank Details & Footer ── */}
          <Sec title="Bank Details & Footer" />
          <Card>
            <div style={{ padding: '14px 0', borderBottom: `1px solid ${op(T.color.border, 50)}` }}>
              <FieldLbl>Bank Information</FieldLbl>
              <Textarea
                value={[
                  settings?.print_bank_name ? `Bank: ${settings.print_bank_name}` : '',
                  settings?.print_bank_account ? `A/C No: ${settings.print_bank_account}` : '',
                  settings?.print_bank_ifsc ? `IFSC: ${settings.print_bank_ifsc}` : '',
                ].filter(Boolean).join('\n') || ''}
                onChange={v => {
                  const lines = v.split('\n');
                  const patch: any = {};
                  lines.forEach(line => {
                    if (line.startsWith('Bank:')) patch.print_bank_name = line.replace('Bank:', '').trim();
                    else if (line.startsWith('A/C No:')) patch.print_bank_account = line.replace('A/C No:', '').trim();
                    else if (line.startsWith('IFSC:')) patch.print_bank_ifsc = line.replace('IFSC:', '').trim();
                  });
                  u(patch);
                }}
                placeholder="Enter Bank Name, A/C No, IFSC..."
                disabled={!isAdmin}
                rows={3}
              />
            </div>
            <div style={{ padding: '14px 0', borderBottom: `1px solid ${op(T.color.border, 50)}` }}>
              <FieldLbl>Footer Text</FieldLbl>
              <Input
                value={settings?.print_terms_conditions || ''}
                onChange={v => u({ print_terms_conditions: v })}
                placeholder="Thank you for your business!"
                disabled={!isAdmin}
              />
            </div>
            <div style={{ padding: '14px 0', borderBottom: `1px solid ${op(T.color.border, 50)}` }}>
              <Row label="Show UPI QR Code" noBorder right={<Toggle on={settings?.print_upi_qr ?? true} onChange={v => u({ print_upi_qr: v })} disabled={!isAdmin} />} />
              {(settings?.print_upi_qr ?? true) && (
                <div style={{ marginTop: '8px' }}>
                  <FieldLbl>UPI ID</FieldLbl>
                  <Input value={settings?.upi_id || ''} onChange={v => u({ upi_id: v })} placeholder="e.g. yourname@bank" disabled={!isAdmin} />
                </div>
              )}
            </div>
            <div style={{ padding: '14px 0' }}>
              <FieldLbl>Default No. of Copies</FieldLbl>
              <PillGroup
                value={String(settings?.print_default_copies ?? 1)}
                onChange={v => u({ print_default_copies: Number(v) })}
                disabled={!isAdmin}
                options={[
                  { value: '1', label: '1 Copy' },
                  { value: '2', label: '2 Copies' },
                  { value: '3', label: '3 Copies' },
                ]}
              />
            </div>
          </Card>
        </>
      )}

      {/* ══════════ THERMAL PRINTER SETTINGS ══════════ */}
      {printerTab === 'thermal' && (
        <>
          {/* ── Layout ── */}
          <Sec title="Appearance" />
          <Card>
            <div style={{ padding: '16px 0' }}>
              <LayoutGrid
                layouts={THERMAL_LAYOUTS}
                selected={settings?.print_thermal_layout || 'theme_1'}
                onSelect={id => u({ print_thermal_layout: id })}
                disabled={!isAdmin}
              />
            </div>
          </Card>

          {/* ── Paper & Hardware ── */}
          <Sec title="Paper & Hardware" />
          <Card>
            <div style={{ padding: '14px 0', borderBottom: `1px solid ${op(T.color.border, 50)}` }}>
              <FieldLbl>Paper Size</FieldLbl>
              <PillGroup
                value={settings?.print_thermal_page_size || '4inch'}
                onChange={v => u({ print_thermal_page_size: v })}
                disabled={!isAdmin}
                options={[
                  { value: '2inch', label: '2" (58mm)' },
                  { value: '3inch', label: '3" (80mm)' },
                  { value: '4inch', label: '4" (80mm)' },
                  { value: 'custom', label: 'Custom' },
                ]}
              />
            </div>
            <Row label="Make Thermal Printer Default" right={<Toggle on={settings?.print_thermal_default ?? false} onChange={v => u({ print_thermal_default: v })} disabled={!isAdmin} />} />
            <Row label="Bold Text Styling" right={<Toggle on={settings?.print_thermal_bold ?? true} onChange={v => u({ print_thermal_bold: v })} disabled={!isAdmin} />} />
            <Row label="Auto Cut Paper" right={<Toggle on={settings?.print_thermal_auto_cut ?? false} onChange={v => u({ print_thermal_auto_cut: v })} disabled={!isAdmin} />} />
            <Row label="Open Cash Drawer" right={<Toggle on={settings?.print_thermal_open_drawer ?? false} onChange={v => u({ print_thermal_open_drawer: v })} disabled={!isAdmin} />} />
            <Row label="Extra Lines at End" right={<Counter value={settings?.print_thermal_extra_lines ?? 0} min={0} max={10} onChange={v => u({ print_thermal_extra_lines: v })} disabled={!isAdmin} />} />
            <Row label="Number of Copies" noBorder right={<Counter value={settings?.print_thermal_copies ?? 1} min={1} max={5} onChange={v => u({ print_thermal_copies: v })} disabled={!isAdmin} />} />
          </Card>

          {/* ── Company Info ── */}
          <Sec title="Company Info / Header" />
          <Card>
            <Check checked={settings?.print_thermal_company_name ?? true} onChange={v => u({ print_thermal_company_name: v })} label="Company Name" disabled={!isAdmin} />
            <Check checked={settings?.print_thermal_show_address ?? true} onChange={v => u({ print_thermal_show_address: v })} label="Address" disabled={!isAdmin} />
            <Check checked={settings?.print_thermal_show_phone ?? true} onChange={v => u({ print_thermal_show_phone: v })} label="Phone Number" disabled={!isAdmin} />
            <Check checked={settings?.print_thermal_show_email ?? false} onChange={v => u({ print_thermal_show_email: v })} label="Email" disabled={!isAdmin} />
            <Check checked={settings?.print_thermal_show_gstin ?? true} onChange={v => u({ print_thermal_show_gstin: v })} label="GSTIN on Sale" disabled={!isAdmin} />
            <Check checked={settings?.print_thermal_company_logo ?? false} onChange={v => u({ print_thermal_company_logo: v })} label="Company Logo" disabled={!isAdmin} />
          </Card>

          {/* ── Footer ── */}
          <Sec title="Footer" />
          <Card>
            <div style={{ padding: '14px 0' }}>
              <FieldLbl>Footer Text</FieldLbl>
              <Input value={settings?.print_terms_conditions || ''} onChange={v => u({ print_terms_conditions: v })} placeholder="Thank you for your purchase!" disabled={!isAdmin} />
            </div>
          </Card>
        </>
      )}

      {/* ── Instant Preview ── */}
      <div style={{ marginTop: '24px' }}>
        <button type="button" onClick={() => setShowPreview(true)} style={{
          width: '100%', padding: '28px 20px', borderRadius: '16px',
          background: 'linear-gradient(135deg, #1a2d5a, #253d7a)',
          border: 'none', cursor: 'pointer', fontFamily: T.font,
          display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: '6px',
          transition: 'opacity 0.2s', boxShadow: '0 4px 20px rgba(26,45,90,0.3)',
        }}
          onMouseEnter={e => { e.currentTarget.style.opacity = '0.92'; }}
          onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
        >
          <span style={{ fontSize: '30px', marginBottom: '2px' }}>🖨️</span>
          <span style={{ color: '#fff', fontWeight: 700, fontSize: '16px' }}>Instant Preview</span>
          <span style={{ color: 'rgba(255,255,255,0.65)', fontSize: '12.5px' }}>Preview your print layout on-the-go</span>
        </button>
      </div>

      {/* ── Save Changes ── */}
      <div style={{ marginTop: '12px', marginBottom: '32px' }}>
        <button
          type="button"
          onClick={saveAll}
          disabled={!hasChanges || isSaving || !isAdmin}
          style={{
            width: '100%', padding: '16px', borderRadius: '12px', border: 'none',
            background: hasChanges && isAdmin ? 'hsl(var(--primary))' : op(T.color.textMuted, 20),
            color: hasChanges && isAdmin ? '#fff' : T.color.textMuted,
            fontFamily: T.font, fontSize: '14px', fontWeight: 700,
            letterSpacing: '0.06em', textTransform: 'uppercase' as const,
            cursor: !hasChanges || isSaving || !isAdmin ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s',
            boxShadow: hasChanges && isAdmin ? '0 4px 14px rgba(0,0,0,0.15)' : 'none',
          }}>
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {/* ── Preview Drawer ── */}
      {showPreview && (
        <div style={{
          position: 'fixed' as const, inset: 0, zIndex: 1000,
          background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
          display: 'flex', flexDirection: 'column' as const, animation: 'psFadeIn 0.2s ease',
        }} onClick={() => setShowPreview(false)}>
          <div style={{
            flex: 1, marginTop: '48px', borderRadius: '20px 20px 0 0',
            background: T.color.cardBg, display: 'flex', flexDirection: 'column' as const,
            overflow: 'hidden', animation: 'psSlideUp 0.3s cubic-bezier(.32,1.4,.48,1)',
          }} onClick={e => e.stopPropagation()}>
            <div style={{
              padding: '16px 20px', borderBottom: `1px solid ${T.color.border}`,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '18px' }}>🖨️</span>
                <span style={{ fontSize: '14px', fontWeight: 700, color: T.color.textPri }}>
                  {printerTab === 'regular' ? 'Regular Invoice Preview' : 'Thermal Receipt Preview'}
                </span>
              </div>
              <button type="button" onClick={() => setShowPreview(false)} style={{
                width: '34px', height: '34px', borderRadius: '50%', border: `1px solid ${T.color.border}`,
                background: T.color.cardBg, cursor: 'pointer', display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: '16px', color: T.color.textPri,
              }}>✕</button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto' as const, padding: '16px', background: '#eef0f3' }} className="custom-scrollbar">
              {previewContent}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 480px) {
          .ps-tab-label { display: none !important; }
          .ps-tab-short { display: inline !important; }
        }
        @keyframes psSlideUp {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes psFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
