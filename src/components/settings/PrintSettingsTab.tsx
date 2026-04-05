import React, { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useBusinessSettings, useUpdateBusinessSettings } from '@/hooks/useBusinessSettings';
import { InvoiceTemplate } from '../bills/InvoiceTemplate';
import { Toggle, Counter, T, op } from '@/components/settings/SettingsUI';

/* ─── constants ─── */
const REGULAR_LAYOUTS = [
  { id: 'urban_bill_style', name: 'Urban Bill',    preview: '🏙️' },
  { id: 'gst_theme_6',     name: 'GST Theme 6',   preview: '📋' },
  { id: 'classic_lite',    name: 'Classic Lite',  preview: '📄' },
  { id: 'modern_dark',     name: 'Modern Dark',   preview: '🌑' },
  { id: 'double_divine',   name: 'Double Divine', preview: '✨' },
  { id: 'french_elite',    name: 'French Elite',  preview: '🏛️' },
];
const THERMAL_LAYOUTS = [
  { id: 'theme_1', name: 'Theme 1', preview: '🧾' },
  { id: 'theme_2', name: 'Theme 2', preview: '📜' },
  { id: 'theme_3', name: 'Theme 3', preview: '📑' },
  { id: 'theme_4', name: 'Theme 4', preview: '📃' },
  { id: 'theme_5', name: 'Theme 5', preview: '🗒️' },
];
const TEXT_SIZES = [
  { value: 'v.small', label: 'XS' },
  { value: 'small',   label: 'S'  },
  { value: 'medium',  label: 'M'  },
  { value: 'large',   label: 'L'  },
  { value: 'v.large', label: 'XL' },
  { value: 'e.large', label: 'XXL'},
];

/* ═══ Tiny shared primitives ═══ */

/* Section heading with gradient underline */
function SecHead({ label }: { label: string }) {
  return (
    <div className="pst-sec-head">
      <span>{label}</span>
    </div>
  );
}

/* Row: label on left, control on right */
function SettRow({
  label, sub, right, border = true,
}: { label: string; sub?: string; right: React.ReactNode; border?: boolean }) {
  return (
    <div className={`pst-row${border ? '' : ' no-border'}`}>
      <div className="pst-row-label">
        <span className="pst-row-title">{label}</span>
        {sub && <span className="pst-row-sub">{sub}</span>}
      </div>
      <div className="pst-row-right">{right}</div>
    </div>
  );
}

/* Full-width checkbox row */
function ChkRow({
  checked, onChange, label, sub, disabled,
}: { checked: boolean; onChange: (v: boolean) => void; label: string; sub?: string; disabled?: boolean }) {
  return (
    <div
      className={`pst-chk${disabled ? ' disabled' : ''}`}
      onClick={() => !disabled && onChange(!checked)}
      role="checkbox"
      aria-checked={checked}
      tabIndex={disabled ? -1 : 0}
      onKeyDown={e => { if (!disabled && (e.key === ' ' || e.key === 'Enter')) onChange(!checked); }}
    >
      <div className={`pst-chk-box${checked ? ' checked' : ''}`}>
        {checked && <span>✓</span>}
      </div>
      <div>
        <div className="pst-chk-label">{label}</div>
        {sub && <div className="pst-chk-sub">{sub}</div>}
      </div>
    </div>
  );
}

/* 2-col layout card grid */
function LayoutCardGrid({
  items, selected, onSelect, disabled,
}: { items: { id: string; name: string; preview: string }[]; selected: string; onSelect: (id: string) => void; disabled?: boolean }) {
  return (
    <div className="pst-layout-grid">
      {items.map(l => {
        const active = selected === l.id;
        return (
          <button
            key={l.id} type="button" disabled={disabled}
            className={`pst-layout-card${active ? ' active' : ''}`}
            onClick={() => !disabled && onSelect(l.id)}
          >
            <div className="pst-layout-icon">{l.preview}</div>
            <div className="pst-layout-name">{l.name}</div>
            {active && <div className="pst-layout-check">✓</div>}
          </button>
        );
      })}
    </div>
  );
}

/* Pill group */
function Pills({
  options, value, onChange, disabled,
}: { options: { value: string; label: string }[]; value: string; onChange: (v: string) => void; disabled?: boolean }) {
  return (
    <div className="pst-pills">
      {options.map(o => (
        <button
          key={o.value} type="button" disabled={disabled}
          className={`pst-pill${value === o.value ? ' active' : ''}`}
          onClick={() => !disabled && onChange(o.value)}
        >{o.label}</button>
      ))}
    </div>
  );
}

/* Native <select> styled */
function Sel({
  value, onChange, options, disabled,
}: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; disabled?: boolean }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      disabled={disabled}
      className="pst-select"
    >
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

/* Text input */
function Inp({
  value, onChange, placeholder, disabled,
}: { value: string; onChange: (v: string) => void; placeholder?: string; disabled?: boolean }) {
  return (
    <input
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className="pst-input"
    />
  );
}

/* Textarea */
function Txa({
  value, onChange, placeholder, disabled, rows = 3,
}: { value: string; onChange: (v: string) => void; placeholder?: string; disabled?: boolean; rows?: number }) {
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      rows={rows}
      className="pst-input pst-textarea"
    />
  );
}

/* Card wrapper */
function PCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`pst-card ${className}`}>{children}</div>;
}

/* Sub-label */
function Sub({ children }: { children: React.ReactNode }) {
  return <div className="pst-sub-label">{children}</div>;
}

/* ═══ Live Preview — Thermal ═══ */
function ThermalPreview({ s }: { s: any }) {
  const companyName = s?.print_thermal_company_name_text || s?.business_name || 'My Company';
  const phone      = s?.phone || '9876543210';
  const pageSize   = s?.print_thermal_page_size || '4inch';
  const isBold     = s?.print_thermal_bold ?? true;
  const maxW       = pageSize === '2inch' ? 200 : pageSize === '3inch' ? 250 : 300;
  const sampleItems = [
    { name: 'Britannia Good Day', qty: 2, rate: 45,  amt: 90  },
    { name: 'Cadbury Dairy Milk', qty: 3, rate: 50,  amt: 150 },
    { name: 'Colgate MaxFresh',   qty: 1, rate: 85,  amt: 85  },
  ];
  return (
    <div style={{ fontFamily: "'Courier New', monospace", fontSize: 11, color: '#111', background: '#fff', padding: '14px 12px', maxWidth: maxW, margin: '0 auto', fontWeight: isBold ? 700 : 400, lineHeight: 1.5 }}>
      {/* Header */}
      <div style={{ textAlign: 'center', borderBottom: '2px dashed #999', paddingBottom: 8, marginBottom: 8 }}>
        {(s?.print_thermal_company_name ?? true) && <div style={{ fontSize: 14, fontWeight: 800 }}>{companyName}</div>}
        {(s?.print_thermal_show_address ?? true) && <div style={{ fontSize: 9 }}>Koramangala, Bangalore — 560034</div>}
        {(s?.print_thermal_show_phone ?? true) && <div style={{ fontSize: 9 }}>Ph: {phone}</div>}
        {(s?.print_thermal_show_email ?? false) && <div style={{ fontSize: 9 }}>{s?.email || 'info@example.com'}</div>}
        {(s?.print_thermal_show_gstin ?? true) && s?.gst_number && <div style={{ fontSize: 9 }}>GSTIN: {s.gst_number}</div>}
      </div>
      {/* Bill info */}
      <div style={{ fontSize: 9, marginBottom: 6 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Bill No: INV-0101</span><span>06/04/2026</span></div>
        <div>Cust: <strong>Walk-in Customer</strong></div>
      </div>
      {/* Items */}
      <div style={{ borderTop: '1px dashed #bbb', borderBottom: '1px dashed #bbb', padding: '4px 0', margin: '4px 0' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '14px 1fr 22px 40px 44px', gap: 2, fontSize: 9, fontWeight: 800, borderBottom: '1px dashed #ccc', paddingBottom: 2, marginBottom: 2 }}>
          <span>#</span><span>Item</span><span>Q</span><span>Rate</span><span style={{ textAlign: 'right' }}>Amt</span>
        </div>
        {sampleItems.map((it, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '14px 1fr 22px 40px 44px', gap: 2, fontSize: 9, padding: '1px 0' }}>
            <span>{i + 1}</span>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.name}</span>
            <span>{it.qty}</span><span>{it.rate}</span><span style={{ textAlign: 'right' }}>{it.amt.toFixed(2)}</span>
          </div>
        ))}
      </div>
      {/* Totals */}
      <div style={{ fontSize: 9, padding: '4px 0', borderBottom: '1px dashed #bbb' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Subtotal</span><span>325.00</span></div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Discount</span><span>-15.00</span></div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>GST 5%</span><span>16.25</span></div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: 12, borderTop: '1px dashed #ccc', marginTop: 3, paddingTop: 3 }}>
          <span>TOTAL</span><span>₹326.25</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Received</span><span>326.25</span></div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Balance</span><span>0.00</span></div>
      </div>
      {/* Footer */}
      <div style={{ textAlign: 'center', padding: '7px 0 2px', fontSize: 9, color: '#666' }}>
        {s?.print_terms_conditions || 'Thank you for your purchase!'}
      </div>
    </div>
  );
}

/* ═══ Live Preview — Regular ═══ */
function RegularPreview({ s }: { s: any }) {
  return <InvoiceTemplate settings={s} isPreview bill={null} items={[]} />;
}

/* ═══════════════════════════════════════════════════
   MAIN EXPORT
   ═══════════════════════════════════════════════════ */
export default function PrintSettingsTab() {
  const { isAdmin }        = useAuth();
  const { data: gSettings } = useBusinessSettings();
  const updateSettings      = useUpdateBusinessSettings();

  const [localSettings, setLocalSettings] = useState<Record<string, any>>({});
  const settings = useMemo(
    () => ({ ...(gSettings || {}), ...localSettings }),
    [gSettings, localSettings],
  );

  const u = (patch: Record<string, any>) => {
    if (!isAdmin) return;
    setLocalSettings(p => ({ ...p, ...patch }));
  };

  const hasChanges = Object.keys(localSettings).length > 0;
  const isSaving   = updateSettings.isPending;
  const saveAll    = () => {
    if (!hasChanges || !isAdmin) return;
    updateSettings.mutate(localSettings, { onSuccess: () => setLocalSettings({}) });
  };

  const [printerTab,   setPrinterTab]   = useState<'regular' | 'thermal'>('regular');
  const [showPreview,  setShowPreview]   = useState(false);
  const [previewOpen,  setPreviewOpen]   = useState(false);   // desktop sticky preview expand

  /* ── desktop two-column layout or single-column ── */
  const previewPanel = (
    <div className={`pst-preview-panel${previewOpen ? ' open' : ''}`}>
      <div className="pst-preview-header" onClick={() => setPreviewOpen(v => !v)}>
        <span>🖨️</span>
        <span style={{ flex: 1 }}>Live Preview — {printerTab === 'regular' ? 'Regular Invoice' : 'Thermal Receipt'}</span>
        <span style={{ fontSize: 12, opacity: 0.6 }}>{previewOpen ? '▲ Close' : '▼ Expand'}</span>
      </div>
      {previewOpen && (
        <div className="pst-preview-scroll custom-scrollbar">
          <div className="pst-preview-content">
            {printerTab === 'regular' ? <RegularPreview s={settings} /> : <ThermalPreview s={settings} />}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="pst-root">

      {/* ── Tab switcher ── */}
      <div className="pst-tabs">
        {([
          { id: 'regular'  as const, label: 'Regular Printer', s: 'Regular',  icon: '🖨️' },
          { id: 'thermal'  as const, label: 'Thermal Printer', s: 'Thermal',  icon: '🧾' },
        ]).map(tab => (
          <button
            key={tab.id} type="button"
            className={`pst-tab${printerTab === tab.id ? ' active' : ''}`}
            onClick={() => setPrinterTab(tab.id)}
          >
            <span className="pst-tab-icon">{tab.icon}</span>
            <span className="pst-tab-full">{tab.label}</span>
            <span className="pst-tab-short">{tab.s}</span>
          </button>
        ))}
      </div>

      {/* ── Desktop: two-col grid ── */}
      <div className="pst-layout">

        {/* ═══ CONTROLS COLUMN ═══ */}
        <div className="pst-controls">

          {/* ─── REGULAR ─── */}
          {printerTab === 'regular' && (<>

            {/* Appearance */}
            <SecHead label="Appearance" />
            <PCard>
              <LayoutCardGrid
                items={REGULAR_LAYOUTS}
                selected={settings?.print_regular_layout || 'urban_bill_style'}
                onSelect={id => u({ print_regular_layout: id })}
                disabled={!isAdmin}
              />
            </PCard>

            {/* Company Info / Header */}
            <SecHead label="Company Info / Header" />
            <PCard>
              <SettRow label="Document Title" sub="Appears at the top of the invoice"
                right={<Inp value={settings?.invoice_title || ''} onChange={v => u({ invoice_title: v })} placeholder="INVOICE" disabled={!isAdmin} />}
              />
              <SettRow label="Company Name" sub="Business name on the invoice"
                right={
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Toggle on={settings?.print_company_name ?? true} onChange={v => u({ print_company_name: v })} disabled={!isAdmin} />
                    {(settings?.print_company_name ?? true) && (
                      <Inp value={settings?.print_company_name_text || settings?.business_name || ''} onChange={v => u({ print_company_name_text: v })} placeholder="My Business" disabled={!isAdmin} />
                    )}
                  </div>
                }
              />
              <SettRow label="Company Logo" right={<Toggle on={settings?.print_company_logo ?? false} onChange={v => u({ print_company_logo: v })} disabled={!isAdmin} />} />
              <SettRow label="Show Address" right={<Toggle on={settings?.print_show_address ?? true} onChange={v => u({ print_show_address: v })} disabled={!isAdmin} />} />
              <SettRow label="Show Phone Number" right={<Toggle on={settings?.print_show_phone ?? true} onChange={v => u({ print_show_phone: v })} disabled={!isAdmin} />} />
              <SettRow label="Show Email" right={<Toggle on={settings?.print_show_email ?? true} onChange={v => u({ print_show_email: v })} disabled={!isAdmin} />} />
              <SettRow label="Show GSTIN on Invoice" right={<Toggle on={settings?.print_show_gstin ?? true} onChange={v => u({ print_show_gstin: v })} disabled={!isAdmin} />} />
              <SettRow label="Repeat Header on All Pages" right={<Toggle on={settings?.print_repeat_header ?? false} onChange={v => u({ print_repeat_header: v })} disabled={!isAdmin} />} border={false} />
            </PCard>

            {/* Page Setup */}
            <SecHead label="Page Setup" />
            <PCard>
              <div className="pst-field-block">
                <Sub>Paper Size</Sub>
                <Pills
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
              <div className="pst-field-block">
                <Sub>Orientation</Sub>
                <Pills
                  value={settings?.print_orientation || 'portrait'}
                  onChange={v => u({ print_orientation: v })}
                  disabled={!isAdmin}
                  options={[
                    { value: 'portrait', label: '↕ Portrait' },
                    { value: 'landscape', label: '↔ Landscape' },
                  ]}
                />
              </div>
              <SettRow label="Company Name Size"
                right={<Sel value={settings?.print_company_name_size || 'large'} onChange={v => u({ print_company_name_size: v })} disabled={!isAdmin} options={TEXT_SIZES} />}
              />
              <SettRow label="Invoice Text Size"
                right={<Sel value={settings?.print_invoice_text_size || 'medium'} onChange={v => u({ print_invoice_text_size: v })} disabled={!isAdmin} options={TEXT_SIZES} />}
              />
              <SettRow label="Regular Printer as Default" right={<Toggle on={settings?.print_regular_default ?? false} onChange={v => u({ print_regular_default: v })} disabled={!isAdmin} />} />
              <SettRow label="Extra Space on Top (mm)" right={<Counter value={settings?.print_extra_space_top ?? 0} min={0} max={200} onChange={v => u({ print_extra_space_top: v })} disabled={!isAdmin} />} />
              <SettRow label="Content Margin (px)" right={<Counter value={settings?.print_content_padding ?? 20} min={0} max={100} onChange={v => u({ print_content_padding: v })} disabled={!isAdmin} />} border={false} />
            </PCard>

            {/* Print Copies */}
            <SecHead label="Print Copies" />
            <PCard>
              <SettRow label="Print Original / Duplicate"
                right={<Toggle on={settings?.print_original_duplicate ?? true} onChange={v => u({ print_original_duplicate: v })} disabled={!isAdmin} />}
              />
              {(settings?.print_original_duplicate ?? true) && (
                <div className="pst-indent">
                  <ChkRow checked={settings?.print_copy_original ?? true} onChange={v => u({ print_copy_original: v })} label="Original" sub="Original for Recipient" disabled={!isAdmin} />
                  <ChkRow checked={settings?.print_copy_duplicate ?? true} onChange={v => u({ print_copy_duplicate: v })} label="Duplicate" sub="Duplicate for Transporter" disabled={!isAdmin} />
                  <ChkRow checked={settings?.print_copy_triplicate ?? false} onChange={v => u({ print_copy_triplicate: v })} label="Triplicate" sub="Triplicate for Supplier" disabled={!isAdmin} />
                </div>
              )}
              <div className="pst-field-block" style={{ paddingTop: 8 }}>
                <Sub>Default No. of Copies</Sub>
                <Pills
                  value={String(settings?.print_default_copies ?? 1)}
                  onChange={v => u({ print_default_copies: Number(v) })}
                  disabled={!isAdmin}
                  options={[{ value: '1', label: '1 Copy' }, { value: '2', label: '2 Copies' }, { value: '3', label: '3 Copies' }]}
                />
              </div>
            </PCard>

            {/* Item Table */}
            <SecHead label="Item Table Customization" />
            <PCard>
              <div className="pst-check-grid">
                <ChkRow checked={settings?.print_show_item_number ?? true} onChange={v => u({ print_show_item_number: v })} label="Sr. No. (#)" disabled={!isAdmin} />
                <ChkRow checked={settings?.print_show_hsn_sac ?? true} onChange={v => u({ print_show_hsn_sac: v })} label="HSN/SAC Code" disabled={!isAdmin} />
                <ChkRow checked={settings?.print_show_quantity ?? true} onChange={v => u({ print_show_quantity: v })} label="Quantity" disabled={!isAdmin} />
                <ChkRow checked={settings?.print_show_price_unit ?? true} onChange={v => u({ print_show_price_unit: v })} label="Unit Price" disabled={!isAdmin} />
                <ChkRow checked={settings?.print_show_discount ?? true} onChange={v => u({ print_show_discount: v })} label="Discount %" disabled={!isAdmin} />
                <ChkRow checked={settings?.print_show_gst ?? true} onChange={v => u({ print_show_gst: v, print_show_tax: v })} label="GST Column" disabled={!isAdmin} />
                <ChkRow checked={settings?.print_show_mrp ?? false} onChange={v => u({ print_show_mrp: v })} label="MRP Column" disabled={!isAdmin} />
              </div>
              <SettRow label="Min Rows in Table" sub="Pad with blank rows for consistency"
                right={<Counter value={settings?.print_min_table_rows ?? 5} min={0} max={20} onChange={v => u({ print_min_table_rows: v })} disabled={!isAdmin} />}
                border={false}
              />
            </PCard>

            {/* Totals & Taxes */}
            <SecHead label="Totals & Taxes" />
            <PCard>
              <SettRow label="Show GST / Tax Summary" right={<Toggle on={settings?.print_tax_details ?? true} onChange={v => u({ print_tax_details: v })} disabled={!isAdmin} />} />
              <SettRow label="Total Item Quantity" right={<Toggle on={settings?.print_total_item_quantity ?? true} onChange={v => u({ print_total_item_quantity: v })} disabled={!isAdmin} />} />
              <SettRow label="Received Amount" right={<Toggle on={settings?.print_received_amount ?? true} onChange={v => u({ print_received_amount: v })} disabled={!isAdmin} />} />
              <SettRow label="Balance Amount" right={<Toggle on={settings?.print_balance_amount ?? true} onChange={v => u({ print_balance_amount: v })} disabled={!isAdmin} />} />
              <SettRow label="Current Party Balance" right={<Toggle on={settings?.print_current_balance ?? false} onChange={v => u({ print_current_balance: v })} disabled={!isAdmin} />} />
              <SettRow label="Amount with Decimal" right={<Toggle on={settings?.print_amount_decimal ?? true} onChange={v => u({ print_amount_decimal: v })} disabled={!isAdmin} />} />
              <SettRow label="Group Large Numbers (₹1,00,000)" right={<Toggle on={settings?.print_amount_grouping ?? true} onChange={v => u({ print_amount_grouping: v })} disabled={!isAdmin} />} />
              <SettRow label="You Saved (discount highlight)" right={<Toggle on={settings?.print_you_saved ?? true} onChange={v => u({ print_you_saved: v })} disabled={!isAdmin} />} />
              <SettRow label="Amount in Words"
                right={
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Toggle on={settings?.print_amount_words ?? false} onChange={v => u({ print_amount_words: v })} disabled={!isAdmin} />
                    {(settings?.print_amount_words) && (
                      <Sel value={settings?.print_amount_words_format || 'indian'} onChange={v => u({ print_amount_words_format: v })} disabled={!isAdmin}
                        options={[{ value: 'indian', label: 'Indian' }, { value: 'international', label: 'International' }]} />
                    )}
                  </div>
                }
                border={false}
              />
            </PCard>

            {/* Bank Details */}
            <SecHead label="Bank Details" />
            <PCard>
              <SettRow label="Show Bank Details on Invoice" right={<Toggle on={settings?.print_bank_details ?? true} onChange={v => u({ print_bank_details: v })} disabled={!isAdmin} />} />
              {(settings?.print_bank_details ?? true) && (
                <div className="pst-indent">
                  <div className="pst-field-block">
                    <Sub>Bank Name</Sub>
                    <Inp value={settings?.print_bank_name || ''} onChange={v => u({ print_bank_name: v })} placeholder="e.g. HDFC Bank" disabled={!isAdmin} />
                  </div>
                  <div className="pst-field-block">
                    <Sub>Account Number</Sub>
                    <Inp value={settings?.print_bank_account || ''} onChange={v => u({ print_bank_account: v })} placeholder="e.g. 1234567890" disabled={!isAdmin} />
                  </div>
                  <div className="pst-field-block">
                    <Sub>IFSC Code</Sub>
                    <Inp value={settings?.print_bank_ifsc || ''} onChange={v => u({ print_bank_ifsc: v })} placeholder="e.g. HDFC0001234" disabled={!isAdmin} />
                  </div>
                </div>
              )}
              <SettRow label="Print UPI QR Code"
                right={<Toggle on={settings?.print_upi_qr ?? true} onChange={v => u({ print_upi_qr: v })} disabled={!isAdmin} />}
              />
              {(settings?.print_upi_qr ?? true) && (
                <div className="pst-indent">
                  <div className="pst-field-block">
                    <Sub>UPI ID</Sub>
                    <Inp value={settings?.upi_id || ''} onChange={v => u({ upi_id: v })} placeholder="e.g. yourname@bank" disabled={!isAdmin} />
                  </div>
                </div>
              )}
              <SettRow label="Print 'PAY NOW' Button" right={<Toggle on={settings?.print_pay_now_btn ?? true} onChange={v => u({ print_pay_now_btn: v })} disabled={!isAdmin} />} border={false} />
            </PCard>

            {/* Footer */}
            <SecHead label="Footer" />
            <PCard>
              <div className="pst-field-block">
                <Sub>Terms &amp; Conditions / Footer Text</Sub>
                <Txa value={settings?.print_terms_conditions || ''} onChange={v => u({ print_terms_conditions: v })} placeholder="Thank you for your business!" disabled={!isAdmin} rows={3} />
              </div>
              <SettRow label="Print Description on Invoice" right={<Toggle on={settings?.print_description ?? false} onChange={v => u({ print_description: v })} disabled={!isAdmin} />} />
              <SettRow label="Received By" right={<Toggle on={settings?.print_received_by ?? true} onChange={v => u({ print_received_by: v })} disabled={!isAdmin} />} />
              <SettRow label="Delivered By" right={<Toggle on={settings?.print_delivered_by ?? false} onChange={v => u({ print_delivered_by: v })} disabled={!isAdmin} />} />
              <SettRow label="Payment Mode" right={<Toggle on={settings?.print_payment_mode ?? false} onChange={v => u({ print_payment_mode: v })} disabled={!isAdmin} />} />
              <SettRow label="Print Acknowledgement" right={<Toggle on={settings?.print_acknowledgement ?? true} onChange={v => u({ print_acknowledgement: v })} disabled={!isAdmin} />} />
              <SettRow label="Print Signature"
                right={<Toggle on={settings?.print_show_signature ?? false} onChange={v => u({ print_show_signature: v })} disabled={!isAdmin} />}
              />
              {(settings?.print_show_signature ?? false) && (
                <div className="pst-indent">
                  <div className="pst-field-block">
                    <Sub>Signature Label</Sub>
                    <Inp value={settings?.print_signature_text || ''} onChange={v => u({ print_signature_text: v })} placeholder="Authorized Signatory" disabled={!isAdmin} />
                  </div>
                </div>
              )}
            </PCard>

          </>)}

          {/* ─── THERMAL ─── */}
          {printerTab === 'thermal' && (<>

            {/* Layout */}
            <SecHead label="Appearance" />
            <PCard>
              <LayoutCardGrid
                items={THERMAL_LAYOUTS}
                selected={settings?.print_thermal_layout || 'theme_1'}
                onSelect={id => u({ print_thermal_layout: id })}
                disabled={!isAdmin}
              />
            </PCard>

            {/* Paper & Hardware */}
            <SecHead label="Paper & Hardware Config" />
            <PCard>
              <div className="pst-field-block">
                <Sub>Paper / Roll Width</Sub>
                <Pills
                  value={settings?.print_thermal_page_size || '4inch'}
                  onChange={v => u({ print_thermal_page_size: v })}
                  disabled={!isAdmin}
                  options={[
                    { value: '2inch', label: '2" · 58mm' },
                    { value: '3inch', label: '3" · 80mm' },
                    { value: '4inch', label: '4" · 80mm' },
                    { value: 'custom', label: 'Custom' },
                  ]}
                />
              </div>
              <SettRow label="Printing Type"
                right={<Sel value={settings?.print_thermal_printing_type || 'text'} onChange={v => u({ print_thermal_printing_type: v })} disabled={!isAdmin}
                  options={[{ value: 'text', label: 'Text (Fast)' }, { value: 'graphic', label: 'Graphic (Rich)' }]} />}
              />
              <SettRow label="Make Thermal Printer Default" right={<Toggle on={settings?.print_thermal_default ?? false} onChange={v => u({ print_thermal_default: v })} disabled={!isAdmin} />} />
              <SettRow label="Bold Text Styling" right={<Toggle on={settings?.print_thermal_bold ?? true} onChange={v => u({ print_thermal_bold: v })} disabled={!isAdmin} />} />
              <SettRow label="Auto-Cut Paper After Print" right={<Toggle on={settings?.print_thermal_auto_cut ?? false} onChange={v => u({ print_thermal_auto_cut: v })} disabled={!isAdmin} />} />
              <SettRow label="Open Cash Drawer After Print" right={<Toggle on={settings?.print_thermal_open_drawer ?? false} onChange={v => u({ print_thermal_open_drawer: v })} disabled={!isAdmin} />} />
              <SettRow label="Extra Blank Lines at End" right={<Counter value={settings?.print_thermal_extra_lines ?? 0} min={0} max={10} onChange={v => u({ print_thermal_extra_lines: v })} disabled={!isAdmin} />} />
              <SettRow label="Number of Copies" right={<Counter value={settings?.print_thermal_copies ?? 1} min={1} max={5} onChange={v => u({ print_thermal_copies: v })} disabled={!isAdmin} />} border={false} />
            </PCard>

            {/* Thermal Company Info */}
            <SecHead label="Company Info / Header" />
            <PCard>
              <ChkRow checked={settings?.print_thermal_company_name ?? true} onChange={v => u({ print_thermal_company_name: v })} label="Company Name" disabled={!isAdmin} />
              {(settings?.print_thermal_company_name ?? true) && (
                <div className="pst-indent" style={{ paddingBottom: 8 }}>
                  <Inp value={settings?.print_thermal_company_name_text || settings?.business_name || ''} onChange={v => u({ print_thermal_company_name_text: v })} placeholder="My Business" disabled={!isAdmin} />
                </div>
              )}
              <ChkRow checked={settings?.print_thermal_company_logo ?? false} onChange={v => u({ print_thermal_company_logo: v })} label="Company Logo" disabled={!isAdmin} />
              <ChkRow checked={settings?.print_thermal_show_address ?? true} onChange={v => u({ print_thermal_show_address: v })} label="Address" disabled={!isAdmin} />
              <ChkRow checked={settings?.print_thermal_show_phone ?? true} onChange={v => u({ print_thermal_show_phone: v })} label="Phone Number" disabled={!isAdmin} />
              <ChkRow checked={settings?.print_thermal_show_email ?? false} onChange={v => u({ print_thermal_show_email: v })} label="Email" disabled={!isAdmin} />
              <ChkRow checked={settings?.print_thermal_show_gstin ?? true} onChange={v => u({ print_thermal_show_gstin: v })} label="GSTIN on Receipt" disabled={!isAdmin} />
            </PCard>

            {/* Thermal Footer */}
            <SecHead label="Footer" />
            <PCard>
              <div className="pst-field-block">
                <Sub>Footer / Thank-you Text</Sub>
                <Inp value={settings?.print_terms_conditions || ''} onChange={v => u({ print_terms_conditions: v })} placeholder="Thank you for your purchase!" disabled={!isAdmin} />
              </div>
            </PCard>

          </>)}

          {/* ── Instant Preview (mobile button) ── */}
          <button type="button" className="pst-preview-btn" onClick={() => setShowPreview(true)}>
            <span style={{ fontSize: 28 }}>🖨️</span>
            <span style={{ fontWeight: 700, fontSize: 15 }}>Instant Preview</span>
            <span style={{ fontSize: 12, opacity: 0.65 }}>Preview your print layout on-the-go</span>
          </button>

          {/* ── Save Changes ── */}
          <button
            type="button"
            className={`pst-save-btn${hasChanges && isAdmin ? ' active' : ''}`}
            onClick={saveAll}
            disabled={!hasChanges || isSaving || !isAdmin}
          >
            {isSaving ? 'Saving...' : 'SAVE CHANGES'}
          </button>

        </div>{/* end controls */}

        {/* ═══ PREVIEW COLUMN (desktop sticky) ═══ */}
        <aside className="pst-preview-aside">
          <div className="pst-preview-aside-inner">
            <div className="pst-preview-header">
              <span>🖨️</span>
              <span>Live Preview — {printerTab === 'regular' ? 'Regular Invoice' : 'Thermal Receipt'}</span>
            </div>
            <div className="pst-preview-scroll custom-scrollbar">
              <div className="pst-preview-content">
                {printerTab === 'regular' ? <RegularPreview s={settings} /> : <ThermalPreview s={settings} />}
              </div>
            </div>
          </div>
        </aside>

      </div>{/* end pst-layout */}

      {/* ── Full-screen Preview Drawer (mobile) ── */}
      {showPreview && (
        <div className="pst-drawer-overlay" onClick={() => setShowPreview(false)}>
          <div className="pst-drawer" onClick={e => e.stopPropagation()}>
            <div className="pst-drawer-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span>🖨️</span>
                <span style={{ fontWeight: 700, fontSize: 14 }}>
                  {printerTab === 'regular' ? 'Regular Invoice Preview' : 'Thermal Receipt Preview'}
                </span>
              </div>
              <button type="button" className="pst-drawer-close" onClick={() => setShowPreview(false)}>✕</button>
            </div>
            <div className="pst-drawer-body custom-scrollbar">
              <div className="pst-preview-content">
                {printerTab === 'regular' ? <RegularPreview s={settings} /> : <ThermalPreview s={settings} />}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── All CSS ── */}
      <style>{`
        /* Root */
        .pst-root {
          font-family: var(--spos-sans, system-ui, sans-serif);
          color: var(--spos-text);
          width: 100%;
        }

        /* Layout grid */
        .pst-layout {
          display: grid;
          grid-template-columns: 1fr 380px;
          gap: 24px;
          align-items: start;
          margin-top: 20px;
        }

        /* Tab switcher */
        .pst-tabs {
          display: flex;
          background: var(--spos-bg, #f4f5f7);
          border-radius: 12px;
          padding: 4px;
          gap: 4px;
          border: 1px solid var(--spos-border);
        }
        .pst-tab {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          padding: 10px 14px;
          border-radius: 9px;
          border: none;
          cursor: pointer;
          font-family: inherit;
          font-size: 13px;
          font-weight: 500;
          color: var(--spos-text-sub);
          background: transparent;
          transition: all 0.18s;
          white-space: nowrap;
        }
        .pst-tab.active {
          background: hsl(var(--primary));
          color: #fff;
          font-weight: 700;
          box-shadow: 0 2px 10px hsl(var(--primary) / 0.3);
        }
        .pst-tab-short { display: none; }

        /* Section headings */
        .pst-sec-head {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 20px 0 8px;
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          color: var(--spos-text-sub, #64748b);
        }
        .pst-sec-head span:first-child {
          flex: 1;
          border-bottom: 2px solid hsl(var(--primary) / 0.2);
          padding-bottom: 4px;
        }

        /* Card */
        .pst-card {
          background: var(--card, #fff);
          border-radius: 12px;
          border: 1px solid var(--spos-border, #e2e8f0);
          box-shadow: 0 1px 4px rgba(0,0,0,0.05);
          padding: 0 18px;
          overflow: hidden;
        }

        /* Row */
        .pst-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          padding: 12px 0;
          border-bottom: 1px solid var(--spos-border, #f0f0f0);
        }
        .pst-row.no-border { border-bottom: none; }
        .pst-row-label { flex: 1; min-width: 0; }
        .pst-row-title { display: block; font-size: 13.5px; font-weight: 550; color: var(--spos-text); line-height: 1.3; }
        .pst-row-sub { display: block; font-size: 11px; color: var(--spos-text-sub); margin-top: 2px; }
        .pst-row-right { flex-shrink: 0; }

        /* Checkbox row */
        .pst-chk {
          display: flex;
          align-items: flex-start;
          gap: 13px;
          padding: 11px 0;
          border-bottom: 1px solid var(--spos-border, #f0f0f0);
          cursor: pointer;
          transition: background 0.12s;
          border-radius: 4px;
        }
        .pst-chk:last-child { border-bottom: none; }
        .pst-chk.disabled { cursor: not-allowed; opacity: 0.5; }
        .pst-chk-box {
          width: 18px; height: 18px; border-radius: 4px; flex-shrink: 0; margin-top: 2px;
          border: 2px solid var(--spos-border);
          background: transparent;
          display: flex; align-items: center; justify-content: center;
          transition: all 0.15s;
          color: var(--spos-border);
          font-size: 11px; font-weight: 800;
        }
        .pst-chk-box.checked {
          background: hsl(var(--primary));
          border-color: hsl(var(--primary));
          color: #fff;
        }
        .pst-chk-label { font-size: 13.5px; font-weight: 500; color: var(--spos-text); line-height: 1.3; }
        .pst-chk-sub { font-size: 11px; color: var(--spos-text-sub); margin-top: 2px; }

        /* Check grid (2 col) */
        .pst-check-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0 16px;
          padding-bottom: 4px;
        }

        /* Layout cards grid */
        .pst-layout-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          padding: 4px 0 8px;
        }
        .pst-layout-card {
          display: flex; flex-direction: column; align-items: center;
          padding: 16px 10px;
          border-radius: 11px;
          border: 2px solid var(--spos-border, #e2e8f0);
          background: var(--card, #fff);
          cursor: pointer; font-family: inherit;
          transition: all 0.2s;
          box-shadow: 0 1px 3px rgba(0,0,0,0.04);
          position: relative;
        }
        .pst-layout-card:hover { border-color: hsl(var(--primary) / 0.5); transform: translateY(-1px); }
        .pst-layout-card.active {
          border-color: hsl(var(--primary));
          background: hsl(var(--primary) / 0.05);
          box-shadow: 0 0 0 3px hsl(var(--primary) / 0.12);
        }
        .pst-layout-card:disabled { opacity: 0.5; cursor: not-allowed; }
        .pst-layout-icon { font-size: 26px; margin-bottom: 7px; line-height: 1; }
        .pst-layout-name { font-size: 11.5px; font-weight: 600; color: var(--spos-text); line-height: 1.3; text-align: center; }
        .pst-layout-card.active .pst-layout-name { color: hsl(var(--primary)); }
        .pst-layout-check {
          position: absolute; top: 6px; right: 6px;
          width: 16px; height: 16px; border-radius: 50%;
          background: hsl(var(--primary)); color: #fff;
          font-size: 9px; font-weight: 800;
          display: flex; align-items: center; justify-content: center;
        }

        /* Pills */
        .pst-pills { display: flex; flex-wrap: wrap; gap: 6px; }
        .pst-pill {
          padding: 6px 14px; border-radius: 20px;
          font-family: inherit; font-size: 12.5px; font-weight: 500;
          border: 1.5px solid var(--spos-border);
          background: var(--card, #fff);
          color: var(--spos-text);
          cursor: pointer; transition: all 0.15s;
        }
        .pst-pill.active {
          background: hsl(var(--primary));
          border-color: hsl(var(--primary));
          color: #fff; font-weight: 700;
        }
        .pst-pill:disabled { opacity: 0.5; cursor: not-allowed; }

        /* Select */
        .pst-select {
          padding: 7px 10px; border-radius: 8px;
          border: 1.5px solid var(--spos-border);
          background: var(--card, #fff);
          font-family: inherit; font-size: 13px; color: var(--spos-text);
          outline: none; cursor: pointer; min-width: 100px;
        }
        .pst-select:disabled { opacity: 0.5; cursor: not-allowed; }

        /* Input */
        .pst-input {
          width: 100%; padding: 9px 13px;
          font-size: 13.5px; border-radius: 9px;
          border: 1.5px solid var(--spos-border);
          background: var(--background, #fff);
          outline: none; font-family: inherit;
          color: var(--spos-text);
          box-sizing: border-box;
          transition: border 0.15s;
        }
        .pst-input:focus { border-color: hsl(var(--primary)); }
        .pst-input:disabled { opacity: 0.5; cursor: not-allowed; }
        .pst-textarea { resize: vertical; min-height: 72px; }

        /* Sub-label */
        .pst-sub-label {
          font-size: 11px; font-weight: 600;
          color: var(--spos-text-sub, #64748b);
          letter-spacing: 0.06em; text-transform: uppercase;
          margin-bottom: 7px;
        }

        /* Field block */
        .pst-field-block {
          padding: 14px 0;
          border-bottom: 1px solid var(--spos-border, #f0f0f0);
        }

        /* Indent for sub-settings */
        .pst-indent {
          margin-left: 4px;
          padding-left: 16px;
          border-left: 2px solid hsl(var(--primary) / 0.2);
          margin-bottom: 4px;
        }

        /* Preview button (mobile only, hidden on desktop) */
        .pst-preview-btn {
          display: none;
        }

        /* Save button */
        .pst-save-btn {
          width: 100%; margin-top: 12px; margin-bottom: 32px;
          padding: 15px; border-radius: 11px; border: none;
          font-family: inherit; font-size: 13.5px; font-weight: 700;
          letter-spacing: 0.07em;
          background: var(--spos-border, #e2e8f0);
          color: var(--spos-text-sub, #94a3b8);
          cursor: not-allowed; transition: all 0.2s;
        }
        .pst-save-btn.active {
          background: hsl(var(--primary));
          color: #fff; cursor: pointer;
          box-shadow: 0 4px 14px hsl(var(--primary) / 0.25);
        }
        .pst-save-btn.active:hover { opacity: 0.9; }

        /* Desktop preview aside */
        .pst-preview-aside {
          position: sticky;
          top: 20px;
          align-self: start;
        }
        .pst-preview-aside-inner {
          background: var(--card, #fff);
          border-radius: 12px;
          border: 1px solid var(--spos-border);
          box-shadow: 0 2px 8px rgba(0,0,0,0.07);
          overflow: hidden;
        }
        .pst-preview-header {
          padding: 12px 16px;
          background: hsl(var(--primary) / 0.06);
          border-bottom: 1px solid var(--spos-border);
          display: flex;
          align-items: center;
          gap: 9px;
          font-size: 12.5px;
          font-weight: 700;
          color: var(--spos-text);
          cursor: default;
        }
        .pst-preview-scroll {
          max-height: calc(100vh - 200px);
          overflow-y: auto;
        }
        .pst-preview-content {
          background: #eef0f3;
          padding: 14px;
          min-height: 200px;
        }

        /* Drawer (mobile) */
        .pst-drawer-overlay {
          position: fixed; inset: 0; z-index: 1000;
          background: rgba(0,0,0,0.5);
          backdrop-filter: blur(4px);
          display: flex; flex-direction: column;
          animation: pstFade 0.2s ease;
        }
        .pst-drawer {
          flex: 1; margin-top: 52px;
          border-radius: 20px 20px 0 0;
          background: var(--card, #fff);
          display: flex; flex-direction: column;
          overflow: hidden;
          animation: pstSlide 0.3s cubic-bezier(.32,1.28,.48,1);
        }
        .pst-drawer-header {
          padding: 15px 18px;
          border-bottom: 1px solid var(--spos-border);
          display: flex; align-items: center; justify-content: space-between;
          flex-shrink: 0;
        }
        .pst-drawer-close {
          width: 32px; height: 32px; border-radius: 50%;
          border: 1px solid var(--spos-border);
          background: var(--background);
          cursor: pointer; font-size: 15px;
          display: flex; align-items: center; justify-content: center;
          color: var(--spos-text);
        }
        .pst-drawer-body {
          flex: 1; overflow-y: auto;
          background: #eef0f3; padding: 16px;
          -webkit-overflow-scrolling: touch;
        }

        @keyframes pstFade  { from { opacity: 0 } to { opacity: 1 } }
        @keyframes pstSlide { from { transform: translateY(100%) } to { transform: translateY(0) } }

        /* ─── Tablet (≤1100px): collapse preview aside ─── */
        @media (max-width: 1100px) {
          .pst-layout {
            grid-template-columns: 1fr;
          }
          .pst-preview-aside { display: none; }
          .pst-preview-btn {
            display: flex; flex-direction: column; align-items: center;
            gap: 5px; width: 100%; margin-top: 20px;
            padding: 26px 20px; border-radius: 15px; border: none;
            background: linear-gradient(135deg, #1a2d5a, #1e3d8e);
            color: #fff; cursor: pointer; font-family: inherit;
            box-shadow: 0 4px 18px rgba(26,45,90,0.28);
            transition: opacity 0.18s;
          }
          .pst-preview-btn:hover { opacity: 0.9; }
        }

        /* ─── Mobile (≤640px) ─── */
        @media (max-width: 640px) {
          .pst-tabs { padding: 3px; }
          .pst-tab { padding: 9px 8px; font-size: 12px; gap: 5px; }
          .pst-tab-full { display: none; }
          .pst-tab-short { display: inline; }
          .pst-check-grid { grid-template-columns: 1fr; }
          .pst-layout-grid { grid-template-columns: 1fr 1fr; gap: 8px; }
          .pst-layout-card { padding: 13px 8px; }
          .pst-layout-icon { font-size: 22px; }
          .pst-layout-name { font-size: 10.5px; }
          .pst-card { padding: 0 14px; }
          .pst-row { flex-wrap: wrap; gap: 8px; }
          .pst-row-right { width: 100%; display: flex; justify-content: flex-start; }
        }
      `}</style>

    </div>
  );
}

