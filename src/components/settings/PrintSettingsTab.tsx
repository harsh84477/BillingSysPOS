import React, { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useBusinessSettings, useUpdateBusinessSettings } from '@/hooks/useBusinessSettings';
import { InvoiceTemplate } from '../bills/InvoiceTemplate';
import {
  SettingsCard, Toggle, Counter, SettingRow, SectionLabel, TextInput, TextArea,
  FieldLabel, ButtonGroup, SelectInput, SaveBtn, InfoBox, ColStack, TwoColGrid,
  TabBar, T, op,
} from '@/components/settings/SettingsUI';

/* ═══════════════════════════════════════════════════
   Layouts
   ═══════════════════════════════════════════════════ */
const REGULAR_LAYOUTS = [
  { id: 'gst_theme_6', name: 'GST Theme 6', icon: '📋' },
  { id: 'double_divine', name: 'Double Divine', icon: '✨' },
  { id: 'french_elite', name: 'French Elite', icon: '🏛️' },
  { id: 'theme_1', name: 'Theme 1', icon: '📄' },
];
const THERMAL_LAYOUTS = [
  { id: 'theme_1', name: 'Theme 1', icon: '🧾' },
  { id: 'theme_2', name: 'Theme 2', icon: '📜' },
  { id: 'theme_3', name: 'Theme 3', icon: '📑' },
  { id: 'theme_4', name: 'Theme 4', icon: '📃' },
];

/* ═══════════════════════════════════════════════════
   Sub-Tab Switcher
   ═══════════════════════════════════════════════════ */
function PrinterTabBar({ active, onSelect }: { active: 'regular' | 'thermal'; onSelect: (v: 'regular' | 'thermal') => void }) {
  return (
    <div style={{
      display: 'inline-flex', gap: '0', background: T.color.cardBg,
      borderRadius: '8px', overflow: 'hidden',
      border: `1.5px solid ${T.color.border}`, boxShadow: T.shadow.card,
    }}>
      {([
        { id: 'regular' as const, label: 'REGULAR PRINTER', icon: '🖨️' },
        { id: 'thermal' as const, label: 'THERMAL PRINTER', icon: '🧾' },
      ]).map(tab => {
        const isActive = tab.id === active;
        return (
          <button key={tab.id} type="button" onClick={() => onSelect(tab.id)} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: '8px', padding: '10px 18px',
            fontSize: '11.5px', fontWeight: isActive ? 700 : 500,
            letterSpacing: '0.04em', textTransform: 'uppercase' as const,
            color: isActive ? '#fff' : T.color.textSec,
            background: isActive
              ? `linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.85))`
              : 'transparent',
            border: 'none', cursor: 'pointer',
            transition: 'all 0.25s cubic-bezier(.4,0,.2,1)',
            fontFamily: T.font, whiteSpace: 'nowrap' as const,
            borderBottom: isActive ? '3px solid hsl(var(--primary))' : '3px solid transparent',
            boxShadow: isActive ? `0 2px 12px ${op('hsl(var(--primary))', 25)}` : 'none',
          }}>
            <span style={{ fontSize: '15px' }}>{tab.icon}</span>
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   Layout Picker
   ═══════════════════════════════════════════════════ */
function LayoutPicker({ layouts, selected, onSelect, disabled }: {
  layouts: { id: string; name: string; icon: string }[];
  selected: string; onSelect: (id: string) => void; disabled?: boolean;
}) {
  return (
    <div style={{
      display: 'flex', gap: '12px', overflowX: 'auto' as const,
      padding: '4px 2px 8px', WebkitOverflowScrolling: 'touch' as const,
      scrollbarWidth: 'none',
    }} className="scrollbar-hide">
      {layouts.map(layout => {
        const isActive = selected === layout.id;
        return (
          <button key={layout.id} type="button"
            onClick={() => !disabled && onSelect(layout.id)} disabled={disabled}
            style={{
              minWidth: '120px', padding: '16px 14px', borderRadius: '12px',
              cursor: disabled ? 'not-allowed' : 'pointer',
              border: `2.5px solid ${isActive ? 'hsl(var(--primary))' : T.color.border}`,
              background: isActive ? op('hsl(var(--primary))', 6) : T.color.cardBg,
              boxShadow: isActive ? `0 0 0 3px ${op('hsl(var(--primary))', 10)}, 0 4px 12px ${op('hsl(var(--primary))', 12)}` : T.shadow.card,
              transition: 'all 0.25s', textAlign: 'center' as const, fontFamily: T.font, flexShrink: 0,
              opacity: disabled ? 0.5 : 1, transform: isActive ? 'translateY(-2px)' : 'none',
            }}
            onMouseEnter={e => { if (!disabled && !isActive) { e.currentTarget.style.boxShadow = T.shadow.cardHover; e.currentTarget.style.transform = 'translateY(-2px)'; } }}
            onMouseLeave={e => { if (!disabled && !isActive) { e.currentTarget.style.boxShadow = T.shadow.card; e.currentTarget.style.transform = 'none'; } }}
          >
            <div style={{
              width: '56px', height: '72px', margin: '0 auto 10px', borderRadius: '6px',
              background: op(T.color.textPri, 5), border: `1px solid ${op(T.color.border, 60)}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px',
            }}>{layout.icon}</div>
            <div style={{
              fontSize: '11px', fontWeight: isActive ? 700 : 500,
              color: isActive ? 'hsl(var(--primary))' : T.color.textPri, lineHeight: 1.3,
            }}>{layout.name}</div>
            {isActive && (
              <div style={{
                width: '18px', height: '18px', borderRadius: '50%', background: 'hsl(var(--primary))',
                color: '#fff', fontSize: '10px', fontWeight: 700, margin: '6px auto 0',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>✓</div>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   CheckRow
   ═══════════════════════════════════════════════════ */
function CheckRow({ checked, onChange, label, inputPlaceholder, inputValue, onInputChange, disabled }: {
  checked: boolean; onChange: (v: boolean) => void; label: string;
  inputPlaceholder?: string; inputValue?: string; onInputChange?: (v: string) => void; disabled?: boolean;
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0',
      borderBottom: `1px solid ${op(T.color.border, 40)}`,
    }}>
      <button type="button" onClick={() => !disabled && onChange(!checked)} disabled={disabled}
        style={{
          width: '20px', height: '20px', borderRadius: '5px', flexShrink: 0,
          border: `2px solid ${checked ? 'hsl(var(--primary))' : T.color.border}`,
          background: checked ? 'hsl(var(--primary))' : 'transparent',
          cursor: disabled ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.2s', opacity: disabled ? 0.5 : 1,
        }}>
        {checked && <span style={{ color: '#fff', fontSize: '12px', fontWeight: 700 }}>✓</span>}
      </button>
      {inputPlaceholder ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' as const, gap: '4px' }}>
          <span style={{ fontSize: '12px', fontWeight: 500, color: T.color.textMuted }}>{label}</span>
          <input value={inputValue || ''} onChange={e => onInputChange?.(e.target.value)}
            placeholder={inputPlaceholder} disabled={disabled || !checked}
            style={{
              padding: '7px 12px', fontSize: '13px', borderRadius: '8px',
              border: `1.5px solid ${T.color.border}`, background: T.color.inputBg,
              outline: 'none', fontFamily: T.font, color: T.color.textPri,
              opacity: (!checked || disabled) ? 0.5 : 1, transition: 'all 0.2s',
            }} />
        </div>
      ) : (
        <span style={{ fontSize: '13px', fontWeight: 500, color: T.color.textPri }}>{label}</span>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   PageSizeSelector
   ═══════════════════════════════════════════════════ */
function PageSizeSelector({ value, onChange, disabled }: {
  value: string; onChange: (v: string) => void; disabled?: boolean;
}) {
  const sizes = [
    { id: '2inch', label: '2 inch', sub: '58mm' },
    { id: '3inch', label: '3 inch', sub: '80mm' },
    { id: '4inch', label: '4 inch', sub: '80mm' },
    { id: 'custom', label: 'Custom', sub: '(Chars)' },
  ];
  return (
    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' as const }}>
      {sizes.map(s => {
        const active = value === s.id;
        return (
          <button key={s.id} type="button" disabled={disabled}
            onClick={() => !disabled && onChange(s.id)}
            style={{
              padding: '8px 14px', borderRadius: '8px',
              border: `2px solid ${active ? 'hsl(var(--primary))' : T.color.border}`,
              background: active ? op('hsl(var(--primary))', 8) : T.color.cardBg,
              cursor: disabled ? 'not-allowed' : 'pointer', transition: 'all 0.2s',
              fontFamily: T.font, opacity: disabled ? 0.5 : 1,
              boxShadow: active ? `0 0 0 2px ${op('hsl(var(--primary))', 12)}` : 'none',
            }}>
            <div style={{ fontSize: '12px', fontWeight: active ? 700 : 500, color: active ? 'hsl(var(--primary))' : T.color.textPri }}>{s.label}</div>
            <div style={{ fontSize: '10px', color: T.color.textMuted }}>{s.sub}</div>
          </button>
        );
      })}
    </div>
  );
}

function RegularPreview({ s }: { s: any }) {
  // Determine how many pages to render based on copy settings
  const copies = s?.print_original_duplicate ? [
    s?.print_copy_original ?? true ? 'ORIGINAL FOR RECIPIENT' : null,
    s?.print_copy_duplicate ?? true ? 'DUPLICATE FOR TRANSPORTER' : null,
    s?.print_copy_triplicate ?? true ? 'TRIPLICATE FOR SUPPLIER' : null
  ].filter(Boolean) : [null];
  
  const finalCopies = copies.length > 0 ? copies : [null];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', padding: '24px 16px', background: '#e5e7eb', minHeight: '100%' }}>
      {finalCopies.map((label, idx) => (
        <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', letterSpacing: '0.05em' }}>
            PAGE {idx + 1} OF {finalCopies.length} {label ? `— ${label}` : ''}
          </div>
          <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
            <InvoiceTemplate 
              settings={{ ...s, _forceCopyLabel: label }} 
              isPreview={true} 
              bill={null} 
              items={[]} 
            />
          </div>
        </div>
      ))}
    </div>
  );
}



/* ═══════════════════════════════════════════════════════════════
   LIVE INVOICE PREVIEW — Thermal
   ═══════════════════════════════════════════════════════════════ */
function ThermalPreview({ s }: { s: any }) {
  const companyName = s?.print_thermal_company_name_text || s?.business_name || 'My Company';
  const phone = s?.phone || '9625507147';
  const isBold = s?.print_thermal_bold ?? true;
  const showAddr = s?.print_thermal_show_address ?? true;
  const showPhone = s?.print_thermal_show_phone ?? true;
  const showEmail = s?.print_thermal_show_email ?? false;
  const showGstin = s?.print_thermal_show_gstin ?? true;
  const pageSize = s?.print_thermal_page_size || '4inch';
  const maxW = pageSize === '2inch' ? '220px' : pageSize === '3inch' ? '280px' : '340px';

  return (
    <div style={{
      background: '#fff', color: '#111', fontFamily: "'Courier New', monospace",
      fontSize: '11px', lineHeight: 1.6, padding: '20px 16px',
      maxWidth: maxW, margin: '20px auto', minHeight: '400px',
      fontWeight: isBold ? 700 : 400,
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
      borderRadius: '2px'
    }}>
      {/* Header */}
      <div style={{ textAlign: 'center', borderBottom: '2px dashed #aaa', paddingBottom: '10px', marginBottom: '10px' }}>
        {(s?.print_thermal_company_name ?? true) && (
          <div style={{ fontSize: '15px', fontWeight: 800, letterSpacing: '0.02em' }}>{companyName}</div>
        )}
        {showPhone && <div style={{ fontSize: '10px' }}>Ph.No: {phone}</div>}
        <div style={{ borderTop: '1px dotted #ccc', marginTop: '6px', paddingTop: '4px', fontSize: '10px' }}>
          {showAddr && <div>Koramangala, Banglore, Karnataka</div>}
          {showEmail && <div>{s?.email || 'email@example.com'}</div>}
          {showGstin && s?.gst_number && <div>GSTIN: {s.gst_number}</div>}
        </div>
      </div>

      {/* Party Info */}
      <div style={{ fontSize: '10px', marginBottom: '8px' }}>
        <div><strong>Vyapar tech solutions (Sample Party Name)</strong></div>
        <div>Ph. No: +91-4356352</div>
        <div>Date: 11/03/2020</div>
        <div>Bill To:</div>
        <div>Indranagar Road, Bangalore</div>
      </div>

      {/* Items */}
      <div style={{ borderTop: '1px dashed #999', borderBottom: '1px dashed #999', padding: '6px 0', margin: '6px 0' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '20px 1fr 50px 50px 60px', gap: '2px', fontSize: '10px', fontWeight: 800, marginBottom: '4px' }}>
          <span>#</span><span>Name</span><span>Qty</span><span>Price</span><span style={{ textAlign: 'right' }}>Amount</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '20px 1fr 50px 50px 60px', gap: '2px', fontSize: '10px', padding: '4px 0' }}>
          <span>1</span><span>Britannia Chocolate Ca...</span><span>100 + 20...</span><span>100.00</span><span style={{ textAlign: 'right' }}>10,000.00</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '20px 1fr 50px 50px 60px', gap: '2px', fontSize: '10px', padding: '4px 0' }}>
          <span>2</span><span>Cadbury Chocolate</span><span>50 + 0p...</span><span>150.00</span><span style={{ textAlign: 'right' }}>7,500.00</span>
        </div>
      </div>

      {/* Totals */}
      <div style={{ fontSize: '10px', padding: '6px 0', borderBottom: '1px dashed #999' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Total</span><span style={{ fontWeight: 800 }}>150 + 1</span></div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Disc.(2%)</span><span>-1,500.00</span></div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Tax(5%)</span><span>500.00</span></div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Total Disc.</span><span>-1,500.00</span></div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '12px', marginTop: '4px' }}><span>Total</span><span>20,000.00</span></div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Received</span><span>20,000.00</span></div>
      </div>

      {/* Terms */}
      <div style={{ textAlign: 'center', padding: '10px 0', fontSize: '10px', color: '#666' }}>
        <div style={{ fontWeight: 700 }}>Terms & Conditions</div>
        <div>{s?.print_terms_conditions || 'Thanks for doing business with us'}</div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN PRINT SETTINGS TAB
   ═══════════════════════════════════════════════════════════════ */
export default function PrintSettingsTab() {
  const { isAdmin } = useAuth();
  const { data: globalSettings } = useBusinessSettings();
  const updateSettings = useUpdateBusinessSettings();
  
  const [localSettings, setLocalSettings] = useState<any>({});
  
  const settings = useMemo(() => ({
    ...(globalSettings || {}),
    ...localSettings
  }), [globalSettings, localSettings]);

  const u = (patch: any) => {
    if (!isAdmin) return;
    setLocalSettings((prev: any) => ({ ...prev, ...patch }));
  };

  const hasChanges = Object.keys(localSettings).length > 0;
  const isSaving = updateSettings.isPending;

  const saveAll = () => {
    if (!hasChanges || !isAdmin) return;
    updateSettings.mutate(localSettings, {
      onSuccess: () => {
        setLocalSettings({});
      }
    });
  };
  
  const renderSaveBtn = () => (
    <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '16px', borderTop: '1px solid #e2e8f0', marginTop: '8px' }}>
      <SaveBtn label="Save Changes" onClick={saveAll} disabled={!hasChanges || isSaving} />
    </div>
  );

  const [printerTab, setPrinterTab] = useState<'regular' | 'thermal'>('regular');
  const [regularSubTab, setRegularSubTab] = useState<'layout' | 'colors'>('layout');

  return (
    <div style={{ width: '100%' }}>
      {/* Printer Type Switcher — Left aligned */}
      <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
         <PrinterTabBar active={printerTab} onSelect={setPrinterTab} />
      </div>

      {/* Two-column layout: Controls left (fixed width), Preview right (expanding) */}
      <div style={{
        display: 'grid', gridTemplateColumns: '480px 1fr',
        gap: '24px', marginTop: '20px', alignItems: 'start',
      }} className="print-settings-grid">
        {/* ═══ LEFT: Controls ═══ */}
        <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '20px' }}>

          {/* ─── REGULAR CONTROLS ─── */}
          {printerTab === 'regular' && (<>
            <SettingsCard title="Appearance" subtitle="Customize layout and colors for regular printing" icon="🎨" accent="hsl(var(--primary))" footer={renderSaveBtn()}>
              <div style={{ marginBottom: '16px' }}>
                <TabBar 
                  tabs={[
                    { id: 'layout', label: 'CHANGE LAYOUT', icon: '📄' },
                    { id: 'colors', label: 'CHANGE COLORS', icon: '🎨' }
                  ]}
                  active={regularSubTab}
                  onSelect={(id) => setRegularSubTab(id as any)}
                />
              </div>
              
              {regularSubTab === 'layout' && (
                <LayoutPicker layouts={REGULAR_LAYOUTS} selected={settings?.print_regular_layout || 'gst_theme_6'} onSelect={(id) => u({ print_regular_layout: id })} disabled={!isAdmin} />
              )}
              {regularSubTab === 'colors' && (
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', padding: '12px 0' }}>
                  {['#7c3aed', '#2563eb', '#ea580c', '#16a34a', '#db2777', '#475569', '#000000', '#dc2626'].map(color => {
                    const isActive = (settings?.print_accent_color || '#7c3aed') === color;
                    return (
                      <button key={color} type="button" 
                        onClick={() => u({ print_accent_color: color })}
                        disabled={!isAdmin}
                        style={{
                          width: '38px', height: '38px', borderRadius: '50%',
                          background: color, border: isActive ? '3px solid #fff' : '3px solid transparent',
                          cursor: !isAdmin ? 'not-allowed' : 'pointer',
                          boxShadow: isActive ? `0 0 0 2px ${color}, 0 4px 8px ${op(color, 30)}` : '0 2px 4px rgba(0,0,0,0.1)',
                          transition: 'all 0.2s', opacity: isAdmin ? 1 : 0.5,
                          transform: isActive ? 'scale(1.1)' : 'scale(1)',
                        }}
                      />
                    );
                  })}
                </div>
              )}
            </SettingsCard>

            <SettingsCard title="Print Company Info / Header" subtitle="Configure what company details appear on printed invoices" icon="🏢" accent="#10b981" footer={renderSaveBtn()}>
              <SettingRow label="Make Regular Printer Default" desc="Use regular printer as the default printing method"
                right={<Toggle on={settings?.print_regular_default ?? false} onChange={(v) => u({ print_regular_default: v })} disabled={!isAdmin} />} />
              <SettingRow label="Print repeat header in all pages" desc="Repeat company header on every page of multi-page invoices"
                right={<Toggle on={settings?.print_repeat_header ?? false} onChange={(v) => u({ print_repeat_header: v })} disabled={!isAdmin} />} />

              <SectionLabel text="Company Details" />
              <CheckRow checked={true} onChange={() => {}} // Dummy, Title is always visible if set
                label="Document Title" inputPlaceholder="e.g. ESTIMATE or INVOICE"
                inputValue={settings?.invoice_title || 'INVOICE'}
                onInputChange={(v) => u({ invoice_title: v })} disabled={!isAdmin} />
              <CheckRow checked={settings?.print_company_name ?? true} onChange={(v) => u({ print_company_name: v })}
                label="Company Name" inputPlaceholder="My Company"
                inputValue={settings?.print_company_name_text || settings?.business_name || ''}
                onInputChange={(v) => u({ print_company_name_text: v })} disabled={!isAdmin} />
              <CheckRow checked={settings?.print_company_logo ?? false} onChange={(v) => u({ print_company_logo: v })}
                label="Company Logo" disabled={!isAdmin} />
              <CheckRow checked={settings?.print_show_address ?? true} onChange={(v) => u({ print_show_address: v })}
                label="Address" inputPlaceholder="Business address"
                inputValue={settings?.print_address_text || settings?.address || ''} 
                onInputChange={(v) => u({ print_address_text: v })} disabled={!isAdmin} />
              <CheckRow checked={settings?.print_show_email ?? true} onChange={(v) => u({ print_show_email: v })}
                label="Email" inputPlaceholder="email@example.com"
                inputValue={settings?.print_email_text || settings?.email || ''} 
                onInputChange={(v) => u({ print_email_text: v })} disabled={!isAdmin} />
              <CheckRow checked={settings?.print_show_phone ?? true} onChange={(v) => u({ print_show_phone: v })}
                label="Phone Number" inputPlaceholder="Phone number"
                inputValue={settings?.print_phone_text || settings?.phone || ''} 
                onInputChange={(v) => u({ print_phone_text: v })} disabled={!isAdmin} />
              <CheckRow checked={settings?.print_show_gstin ?? true} onChange={(v) => u({ print_show_gstin: v })}
                label="GSTIN on Sale" disabled={!isAdmin} />

              <SectionLabel text="Page Setup" />
              <SettingRow label="Paper Size" desc="Select paper size for printing"
                right={<SelectInput value={settings?.print_paper_size || 'A4'} onChange={(v) => u({ print_paper_size: v })} disabled={!isAdmin}
                  options={[{ value: 'A4', label: 'A4' }, { value: 'A5', label: 'A5' }, { value: 'Letter', label: 'Letter' }, { value: 'Legal', label: 'Legal' }]} />} />
              <SettingRow label="Orientation" desc="Page print orientation"
                right={<SelectInput value={settings?.print_orientation || 'portrait'} onChange={(v) => u({ print_orientation: v })} disabled={!isAdmin}
                  options={[{ value: 'portrait', label: 'Portrait' }, { value: 'landscape', label: 'Landscape' }]} />} />
              <SettingRow label="Company Name Text Size" desc="Size of the company name on invoice"
                right={<SelectInput value={settings?.print_company_name_size || 'large'} onChange={(v) => u({ print_company_name_size: v })} disabled={!isAdmin}
                  options={[{ value: 'v.small', label: 'V. Small' }, { value: 'small', label: 'Small' }, { value: 'medium', label: 'Medium' }, { value: 'large', label: 'Large' }]} />} />
              <SettingRow label="Invoice Text Size" desc="Size of content text on invoice" noBorder
                right={<SelectInput value={settings?.print_invoice_text_size || 'medium'} onChange={(v) => u({ print_invoice_text_size: v })} disabled={!isAdmin}
                  options={[{ value: 'small', label: 'Small' }, { value: 'medium', label: 'Medium' }, { value: 'large', label: 'Large' }]} />} />
            </SettingsCard>

            <SettingsCard title="Print Copies & Layout Setup" subtitle="Configure number of copies and extra spacing" icon="📄" accent="#0ea5e9" footer={renderSaveBtn()}>
              <SettingRow label="Print Original/Duplicate" desc="Enable copy labels on prints" noBorder={!(settings?.print_original_duplicate ?? true)}
                right={<Toggle on={settings?.print_original_duplicate ?? true} onChange={(v) => u({ print_original_duplicate: v })} disabled={!isAdmin} />} />
              
              {(settings?.print_original_duplicate ?? true) && (
                <div style={{ marginLeft: '12px', paddingLeft: '16px', borderLeft: `2px solid ${T.color.border}`, display: 'flex', flexDirection: 'column', gap: '0px', marginBottom: '16px', paddingBottom: '16px', borderBottom: `1px solid ${op(T.color.border, 50)}` }}>
                  <SectionLabel text="Choose default no. of copies" />
                  <CheckRow checked={settings?.print_copy_original ?? true} onChange={(v) => u({ print_copy_original: v })} label="Original (ORIGINAL FOR RECIPIENT)" disabled={!isAdmin} />
                  <CheckRow checked={settings?.print_copy_duplicate ?? true} onChange={(v) => u({ print_copy_duplicate: v })} label="Duplicate (DUPLICATE FOR TRANSPORTER)" disabled={!isAdmin} />
                  <CheckRow checked={settings?.print_copy_triplicate ?? true} onChange={(v) => u({ print_copy_triplicate: v })} label="Triplicate (TRIPLICATE FOR SUPPLIER)" disabled={!isAdmin} />
                </div>
              )}

              <SettingRow label="Extra space on Top of PDF" desc="Add margin at the top of the printed page" noBorder
                right={
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Counter value={settings?.print_extra_space_top ?? 0} min={0} max={200} onChange={(v) => u({ print_extra_space_top: v })} disabled={!isAdmin} />
                    <span style={{ fontSize: '12px', color: T.color.textMuted }}>mm</span>
                  </div>
                } />
            </SettingsCard>

            <SettingsCard title="Item Table" subtitle="Configure columns and rows in the invoice table" icon="📜" accent="#eab308" footer={renderSaveBtn()}>
              <SettingRow label="Min No. of Rows in Item Table" desc="Ensure consistency by forcing empty rows"
                right={<Counter value={settings?.print_min_table_rows ?? 0} min={0} max={20} onChange={(v) => u({ print_min_table_rows: v })} disabled={!isAdmin} />} />
              
              <div style={{ marginTop: '0px' }}>
                <SectionLabel text="Item Table Customization" />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px' }}>
                  <CheckRow checked={settings?.print_show_item_number ?? true} onChange={(v) => u({ print_show_item_number: v })} label="#" disabled={!isAdmin} />
                  <CheckRow checked={settings?.print_show_hsn_sac ?? true} onChange={(v) => u({ print_show_hsn_sac: v })} label="HSN/SAC" disabled={!isAdmin} />
                  <CheckRow checked={settings?.print_show_quantity ?? true} onChange={(v) => u({ print_show_quantity: v })} label="Quantity" disabled={!isAdmin} />
                  <CheckRow checked={settings?.print_show_price_unit ?? true} onChange={(v) => u({ print_show_price_unit: v })} label="Price/unit" disabled={!isAdmin} />
                  <CheckRow checked={settings?.print_show_discount ?? true} onChange={(v) => u({ print_show_discount: v })} label="Discount" disabled={!isAdmin} />
                  <CheckRow checked={settings?.print_show_gst ?? true} onChange={(v) => u({ print_show_gst: v })} label="GST" disabled={!isAdmin} />
                </div>
              </div>
            </SettingsCard>

            <SettingsCard title="Totals & Taxes" subtitle="Control which totals and tax details appear on printed invoices" icon="🧮" accent="#f97316" footer={renderSaveBtn()}>
              <SettingRow label="Total Item Quantity" desc="Show total number of items on invoice"
                right={<Toggle on={settings?.print_total_item_quantity ?? true} onChange={(v) => u({ print_total_item_quantity: v })} disabled={!isAdmin} />} />
              <SettingRow label="Amount with Decimal" desc="Display amounts with decimal precision (e.g. ₹ 0.00)"
                right={<Toggle on={settings?.print_amount_decimal ?? true} onChange={(v) => u({ print_amount_decimal: v })} disabled={!isAdmin} />} />
              <SettingRow label="Received Amount" desc="Show received payment amount on invoice"
                right={<Toggle on={settings?.print_received_amount ?? true} onChange={(v) => u({ print_received_amount: v })} disabled={!isAdmin} />} />
              <SettingRow label="Balance Amount" desc="Show remaining balance amount"
                right={<Toggle on={settings?.print_balance_amount ?? true} onChange={(v) => u({ print_balance_amount: v })} disabled={!isAdmin} />} />
              <SettingRow label="Current Balance of Party" desc="Show customer's current outstanding balance"
                right={<Toggle on={settings?.print_current_balance ?? false} onChange={(v) => u({ print_current_balance: v })} disabled={!isAdmin} />} />
              <SettingRow label="Tax Details" desc="Display GST/tax breakdown on invoice"
                right={<Toggle on={settings?.print_tax_details ?? true} onChange={(v) => u({ print_tax_details: v })} disabled={!isAdmin} />} />
              <SettingRow label="You Saved" desc="Show total discount/savings amount to customer"
                right={<Toggle on={settings?.print_you_saved ?? true} onChange={(v) => u({ print_you_saved: v })} disabled={!isAdmin} />} />
              <SettingRow label="Print Amount with Grouping" desc="Format large numbers with commas (e.g. 1,00,000)"
                right={<Toggle on={settings?.print_amount_grouping ?? true} onChange={(v) => u({ print_amount_grouping: v })} disabled={!isAdmin} />} />
              <SettingRow label="Amount in Words" desc="Print total amount in words below the total" noBorder
                right={
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Toggle on={settings?.print_amount_words ?? false} onChange={(v) => u({ print_amount_words: v })} disabled={!isAdmin} />
                    {(settings?.print_amount_words) && (
                      <SelectInput value={settings?.print_amount_words_format || 'indian'} onChange={(v) => u({ print_amount_words_format: v })} disabled={!isAdmin}
                        options={[{ value: 'indian', label: 'Indian' }, { value: 'international', label: 'International' }]} />
                    )}
                  </div>
                } />
            </SettingsCard>

            <SettingsCard title="Bank Details" subtitle="Display bank account and payment options" icon="🏦" accent="#10b981" footer={renderSaveBtn()}>
              <SettingRow label="Enable Bank Details" desc="Show bank information on printed invoices" noBorder={!(settings?.print_bank_details ?? true)}
                right={<Toggle on={settings?.print_bank_details ?? true} onChange={(v) => u({ print_bank_details: v })} disabled={!isAdmin} />} />
              
              {(settings?.print_bank_details ?? true) && (
                <div style={{ padding: '0 0 16px', display: 'flex', flexDirection: 'column', gap: '12px', borderBottom: `1px solid ${op(T.color.border, 50)}`, marginBottom: '12px' }}>
                  <div>
                    <FieldLabel>Bank Name</FieldLabel>
                    <TextInput value={settings?.print_bank_name || ''} onChange={(e) => u({ print_bank_name: e.target.value })} placeholder="e.g. HDFC Bank" disabled={!isAdmin} />
                  </div>
                  <div>
                    <FieldLabel>Account Number</FieldLabel>
                    <TextInput value={settings?.print_bank_account || ''} onChange={(e) => u({ print_bank_account: e.target.value })} placeholder="e.g. 1234567890" disabled={!isAdmin} />
                  </div>
                  <div>
                    <FieldLabel>IFSC Code</FieldLabel>
                    <TextInput value={settings?.print_bank_ifsc || ''} onChange={(e) => u({ print_bank_ifsc: e.target.value })} placeholder="e.g. HDFC0001234" disabled={!isAdmin} />
                  </div>
                  <div style={{ marginTop: '8px' }}>
                    <CheckRow checked={settings?.print_upi_qr ?? true} onChange={(v) => u({ print_upi_qr: v })} label="Print UPI QR Code" disabled={!isAdmin} />
                    {(settings?.print_upi_qr ?? true) && (
                      <div style={{ paddingLeft: '32px', marginTop: '-4px', marginBottom: '8px' }}>
                        <TextInput value={settings?.upi_id || ''} onChange={(e) => u({ upi_id: e.target.value })} placeholder="e.g. yourname@bank" hint="Required for the dynamic QR code to work properly." disabled={!isAdmin} />
                      </div>
                    )}
                    <CheckRow checked={settings?.print_pay_now_btn ?? true} onChange={(v) => u({ print_pay_now_btn: v })} label="Print 'PAY NOW' button" disabled={!isAdmin} />
                  </div>
                </div>
              )}
            </SettingsCard>

            <SettingsCard title="Footer" subtitle="Customize the footer section of your printed invoices" icon="📝" accent="#8b5cf6" footer={renderSaveBtn()}>
              <SettingRow label="Print Description" desc="Show sale description on invoice"
                right={<Toggle on={settings?.print_description ?? false} onChange={(v) => u({ print_description: v })} disabled={!isAdmin} />} />
              <div style={{ padding: '12px 0' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 550, color: T.color.textPri }}>Terms and Conditions</span>
                </div>
                <textarea value={settings?.print_terms_conditions || ''} onChange={(e) => u({ print_terms_conditions: e.target.value })}
                  placeholder="Thanks for doing business with us!" disabled={!isAdmin} rows={3}
                  style={{ width: '100%', padding: '10px 13px', fontSize: '13px', borderRadius: '10px', border: `1.5px solid ${T.color.border}`,
                    background: T.color.inputBg, outline: 'none', fontFamily: T.font, color: T.color.textPri,
                    resize: 'vertical' as const, boxSizing: 'border-box' as const, opacity: !isAdmin ? 0.5 : 1 }} />
              </div>
              <SettingRow label="Print Received by details" desc="Add received by name on invoice"
                right={<Toggle on={settings?.print_received_by ?? true} onChange={(v) => u({ print_received_by: v })} disabled={!isAdmin} />} />
              <SettingRow label="Print Delivered by details" desc="Add delivered by name on invoice"
                right={<Toggle on={settings?.print_delivered_by ?? false} onChange={(v) => u({ print_delivered_by: v })} disabled={!isAdmin} />} />
              <div style={{ padding: '10px 0', borderBottom: `1px solid ${op(T.color.border, 50)}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Toggle on={settings?.print_show_signature ?? false} onChange={(v) => u({ print_show_signature: v })} disabled={!isAdmin} />
                  <span style={{ fontSize: '13px', fontWeight: 550, color: T.color.textPri }}>Print Signature</span>
                </div>
                {(settings?.print_show_signature ?? false) && (
                  <div style={{ marginTop: '12px', paddingLeft: '56px' }}>
                    <FieldLabel>Signature Text</FieldLabel>
                    <TextInput value={settings?.print_signature_text || ''} onChange={(e) => u({ print_signature_text: e.target.value })}
                      placeholder="Authorized Signatory" disabled={!isAdmin} />
                  </div>
                )}
              </div>
              <SettingRow label="Payment Mode" desc="Show payment method used on invoice"
                right={<Toggle on={settings?.print_payment_mode ?? false} onChange={(v) => u({ print_payment_mode: v })} disabled={!isAdmin} />} />
              <SettingRow label="Print Acknowledgement" desc="Include customer acknowledgement section" noBorder
                right={<Toggle on={settings?.print_acknowledgement ?? true} onChange={(v) => u({ print_acknowledgement: v })} disabled={!isAdmin} />} />
            </SettingsCard>
          </>)}

          {/* ─── THERMAL CONTROLS ─── */}
          {printerTab === 'thermal' && (<>
            <SettingsCard title="Change Layout" subtitle="Select a print layout template for thermal receipt printing" icon="🎨" accent="hsl(var(--primary))" footer={renderSaveBtn()}>
              <LayoutPicker layouts={THERMAL_LAYOUTS} selected={settings?.print_thermal_layout || 'theme_1'} onSelect={(id) => u({ print_thermal_layout: id })} disabled={!isAdmin} />
            </SettingsCard>

            <SettingsCard title="Thermal Printer Configuration" subtitle="Configure thermal receipt printer hardware settings" icon="⚙️" accent="#3b82f6" footer={renderSaveBtn()}>
              <SettingRow label="Make Thermal Printer Default" desc="Use thermal printer as the default printing method"
                right={<Toggle on={settings?.print_thermal_default ?? false} onChange={(v) => u({ print_thermal_default: v })} disabled={!isAdmin} />} />
              <div style={{ padding: '12px 0', borderBottom: `1px solid ${op(T.color.border, 50)}` }}>
                <div style={{ marginBottom: '10px' }}>
                  <div style={{ fontSize: '13.5px', fontWeight: 550, color: T.color.textPri }}>Page Size</div>
                  <div style={{ fontSize: '11.5px', color: T.color.textMuted, marginTop: '2px' }}>Select the width of your thermal receipt paper</div>
                </div>
                <PageSizeSelector value={settings?.print_thermal_page_size || '4inch'} onChange={(v) => u({ print_thermal_page_size: v })} disabled={!isAdmin} />
              </div>
              <SettingRow label="Printing Type" desc="Text mode for speed, Graphic for rich layouts"
                right={<SelectInput value={settings?.print_thermal_printing_type || 'text'} onChange={(v) => u({ print_thermal_printing_type: v })} disabled={!isAdmin}
                  options={[{ value: 'text', label: 'Text Printing' }, { value: 'graphic', label: 'Graphic Printing' }]} />} />
              <SettingRow label="Use Text Styling (Bold)" desc="Apply bold text styling for emphasis on receipts"
                right={<Toggle on={settings?.print_thermal_bold ?? true} onChange={(v) => u({ print_thermal_bold: v })} disabled={!isAdmin} />} />
              <SettingRow label="Auto Cut Paper After Printing" desc="Automatically cut receipt paper when printing is done"
                right={<Toggle on={settings?.print_thermal_auto_cut ?? false} onChange={(v) => u({ print_thermal_auto_cut: v })} disabled={!isAdmin} />} />
              <SettingRow label="Open Cash Drawer After Printing" desc="Trigger cash drawer to open when a receipt is printed"
                right={<Toggle on={settings?.print_thermal_open_drawer ?? false} onChange={(v) => u({ print_thermal_open_drawer: v })} disabled={!isAdmin} />} />
              <SettingRow label="Extra lines at the end" desc="Add blank lines after receipt content"
                right={<Counter value={settings?.print_thermal_extra_lines ?? 0} min={0} max={10} onChange={(v) => u({ print_thermal_extra_lines: v })} disabled={!isAdmin} />} />
              <SettingRow label="Number of copies" desc="Print multiple copies of each receipt" noBorder
                right={<Counter value={settings?.print_thermal_copies ?? 1} min={1} max={5} onChange={(v) => u({ print_thermal_copies: v })} disabled={!isAdmin} />} />
            </SettingsCard>

            <SettingsCard title="Print Company Info / Header" subtitle="Configure company details on thermal receipts" icon="🏢" accent="#10b981" footer={renderSaveBtn()}>
              <CheckRow checked={settings?.print_thermal_company_name ?? true} onChange={(v) => u({ print_thermal_company_name: v })}
                label="Company Name" inputPlaceholder="My Company"
                inputValue={settings?.print_thermal_company_name_text || settings?.business_name || ''}
                onInputChange={(v) => u({ print_thermal_company_name_text: v })} disabled={!isAdmin} />
              <CheckRow checked={settings?.print_thermal_company_logo ?? false} onChange={(v) => u({ print_thermal_company_logo: v })}
                label="Company Logo" disabled={!isAdmin} />
              <CheckRow checked={settings?.print_thermal_show_address ?? true} onChange={(v) => u({ print_thermal_show_address: v })}
                label="Address" disabled={!isAdmin} />
              <CheckRow checked={settings?.print_thermal_show_email ?? false} onChange={(v) => u({ print_thermal_show_email: v })}
                label="Email" disabled={!isAdmin} />
              <CheckRow checked={settings?.print_thermal_show_phone ?? true} onChange={(v) => u({ print_thermal_show_phone: v })}
                label="Phone Number" disabled={!isAdmin} />
              <CheckRow checked={settings?.print_thermal_show_gstin ?? true} onChange={(v) => u({ print_thermal_show_gstin: v })}
                label="GSTIN on Sale" disabled={!isAdmin} />
              <InfoBox bg={op('#10b981', 8)} border={`1px solid ${op('#10b981', 25)}`} icon="💡" title="Tip" titleColor="#10b981" value="Configure your thermal printer driver first for best results. Ensure the correct paper width is selected." />
            </SettingsCard>
          </>)}
        </div>

        {/* ═══ RIGHT: Live Preview (Sticky with clean bounds) ═══ */}
        <div style={{ position: 'sticky' as const, top: '20px', alignSelf: 'start', height: 'calc(100vh - 40px)' }}>
          <div style={{
            background: T.color.cardBg, borderRadius: '14px',
            border: `1px solid ${T.color.border}`, boxShadow: T.shadow.card,
            overflow: 'hidden', height: '100%', display: 'flex', flexDirection: 'column'
          }}>
            {/* Preview Header */}
            <div style={{
              padding: '12px 16px', borderBottom: `1px solid ${T.color.border}`,
              background: `linear-gradient(135deg, ${op('hsl(var(--primary))', 6)} 0%, transparent 100%)`,
              display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0
            }}>
              <span style={{ fontSize: '14px' }}>👁️</span>
              <span style={{ fontSize: '12.5px', fontWeight: 700, color: T.color.textPri, letterSpacing: '-0.01em' }}>
                Live Preview — {printerTab === 'regular' ? 'Regular Invoice' : 'Thermal Receipt'}
              </span>
            </div>

            {/* Scrollable preview occupying all remaining card space */}
            <div style={{
              flex: 1, overflowY: 'auto' as const,
              background: '#e5e7eb', // subtle dim outline behind paper
              position: 'relative',
              width: '100%',
              overflowX: 'hidden'
            }} className="custom-scrollbar">
               {/* We remove transform: scale(0.92) so the preview fully fills the available wide container */}
               {printerTab === 'regular' ? <RegularPreview s={settings} /> : <ThermalPreview s={settings} />}
            </div>
          </div>
        </div>
      </div>

      {/* Responsive: hide preview on mobile, stack on tablet */}
      <style>{`
        @media (max-width: 1024px) {
          .print-settings-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
