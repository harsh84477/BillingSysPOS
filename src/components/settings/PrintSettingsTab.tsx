import React, { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useBusinessSettings, useUpdateBusinessSettings } from '@/hooks/useBusinessSettings';
import { InvoiceTemplate } from '../bills/InvoiceTemplate';
import { ThermalTemplate } from '../bills/ThermalTemplate';
import {
  SettingsCard, Toggle, Counter, SettingRow, SectionLabel, TextInput,
  FieldLabel, SelectInput, SaveBtn, InfoBox, TabBar, T, op,
} from '@/components/settings/SettingsUI';

/* ═══════════════════════════════════════════════════
   Layouts
   ═══════════════════════════════════════════════════ */
const REGULAR_LAYOUTS = [
  { id: 'gst_theme_6', name: 'GST Theme 6', icon: '📋' },
  { id: 'urban_bill_style', name: 'Urban Bill', icon: '🏙️' },
  { id: 'double_divine', name: 'Double Divine', icon: '✨' },
  { id: 'french_elite', name: 'French Elite', icon: '🏛️' },
  { id: 'theme_1', name: 'Theme 1', icon: '📄' },
];
const THERMAL_LAYOUTS = [
  { id: 'theme_1', name: 'Theme 1', icon: '🧾' },
  { id: 'theme_2', name: 'Theme 2', icon: '📜' },
  { id: 'theme_3', name: 'Theme 3', icon: '📑' },
  { id: 'theme_4', name: 'Theme 4', icon: '📃' },
  { id: 'theme_5', name: 'Theme 5', icon: '🧾' },
];

/* ═══════════════════════════════════════════════════
   Premium Components
   ═══════════════════════════════════════════════════ */

function ChipGroup({ options, value, onChange, disabled }: {
  options: { value: string; label: string }[];
  value: string; onChange: (v: string) => void; disabled?: boolean;
}) {
  return (
    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
      {options.map(opt => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            disabled={disabled}
            onClick={() => onChange(opt.value)}
            style={{
              padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 600,
              border: `1.5px solid ${active ? 'hsl(var(--primary))' : T.color.border}`,
              background: active ? 'hsl(var(--primary))' : T.color.cardBg,
              color: active ? '#fff' : T.color.textSec,
              cursor: disabled ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s',
              opacity: disabled ? 0.5 : 1,
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function CheckRow({ checked, onChange, label, inputPlaceholder, inputValue, onInputChange, disabled, noBorder }: {
  checked: boolean; onChange: (v: boolean) => void; label: string;
  inputPlaceholder?: string; inputValue?: string; onInputChange?: (v: string) => void; disabled?: boolean; noBorder?: boolean;
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 0',
      borderBottom: noBorder ? 'none' : `1px solid ${op(T.color.border, 30)}`,
    }}>
      <button type="button" onClick={() => !disabled && onChange(!checked)} disabled={disabled}
        style={{
          width: '20px', height: '20px', borderRadius: '6px', flexShrink: 0,
          border: `2px solid ${checked ? 'hsl(var(--primary))' : T.color.border}`,
          background: checked ? 'hsl(var(--primary))' : 'transparent',
          cursor: disabled ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.2s', opacity: disabled ? 0.5 : 1,
        }}>
        {checked && <span style={{ color: '#fff', fontSize: '11px', fontWeight: 900 }}>✓</span>}
      </button>
      {inputPlaceholder ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <span style={{ fontSize: '12.5px', fontWeight: 550, color: T.color.textPri }}>{label}</span>
          <input value={inputValue || ''} onChange={e => onInputChange?.(e.target.value)}
            placeholder={inputPlaceholder} disabled={disabled || !checked}
            style={{
              padding: '6px 12px', fontSize: '13px', borderRadius: '8px',
              border: `1.5px solid ${T.color.border}`, background: T.color.inputBg,
              outline: 'none', fontFamily: T.font, color: T.color.textPri,
              opacity: (!checked || disabled) ? 0.5 : 1, transition: 'all 0.2s',
            }} />
        </div>
      ) : (
        <span style={{ fontSize: '13px', fontWeight: 550, color: T.color.textPri }}>{label}</span>
      )}
    </div>
  );
}

function LayoutPicker({ layouts, selected, onSelect, disabled }: {
  layouts: { id: string; name: string; icon: string }[];
  selected: string; onSelect: (id: string) => void; disabled?: boolean;
}) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '12px',
      padding: '4px 0',
    }}>
      {layouts.map(layout => {
        const isActive = selected === layout.id;
        return (
          <button key={layout.id} type="button"
            onClick={() => !disabled && onSelect(layout.id)} disabled={disabled}
            style={{
              padding: '16px 8px', borderRadius: '12px',
              cursor: disabled ? 'not-allowed' : 'pointer',
              border: `2px solid ${isActive ? 'hsl(var(--primary))' : T.color.border}`,
              background: isActive ? op('hsl(var(--primary))', 6) : T.color.cardBg,
              transition: 'all 0.2s', textAlign: 'center', fontFamily: T.font,
              opacity: disabled ? 0.5 : 1, transform: isActive ? 'translateY(-2px)' : 'none',
              position: 'relative',
            }}
          >
            <div style={{ fontSize: '28px', marginBottom: '8px', display: 'block' }}>{layout.icon}</div>
            <div style={{
              fontSize: '11.5px', fontWeight: isActive ? 700 : 500,
              color: isActive ? 'hsl(var(--primary))' : T.color.textPri, lineHeight: 1.2,
            }}>{layout.name}</div>
            {isActive && (
              <div style={{
                position: 'absolute', top: '6px', right: '6px',
                width: '18px', height: '18px', borderRadius: '50%', background: 'hsl(var(--primary))',
                color: '#fff', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>✓</div>
            )}
          </button>
        );
      })}
    </div>
  );
}

function RegularPreview({ s }: { s: any }) {
  const copies = s?.print_original_duplicate ? [
    s?.print_copy_original ?? true ? 'ORIGINAL FOR RECIPIENT' : null,
    s?.print_copy_duplicate ?? false ? 'DUPLICATE FOR TRANSPORTER' : null,
    s?.print_copy_triplicate ?? false ? 'TRIPLICATE FOR SUPPLIER' : null
  ].filter(Boolean) : [null];
  
  const finalCopies = copies.length > 0 ? copies : [null];
  const paperSize = s?.print_paper_size || 'A4';
  const isA5 = paperSize === 'A5';
  const paperWidth = isA5 ? 560 : 794;
  const paperHeight = isA5 ? 794 : 1123;
  const containerWidth = 380;
  const scale = containerWidth / paperWidth;
  const scaledHeight = paperHeight * scale;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', padding: '20px 16px', background: '#f1f5f9', minHeight: '100%' }}>
      {finalCopies.map((label, idx) => (
        <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
          <div style={{ fontSize: '9px', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            PAGE {idx + 1} OF {finalCopies.length} {label && `— ${label}`}
          </div>
          <div style={{ 
            width: `${containerWidth}px`, 
            height: `${scaledHeight}px`,
            position: 'relative',
            boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
            borderRadius: '6px',
            overflow: 'hidden',
            background: '#fff',
            border: '1px solid #e2e8f0'
          }}>
            <div style={{
              width: `${paperWidth}px`,
              minHeight: `${paperHeight}px`,
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
              position: 'absolute',
              top: 0,
              left: 0
            }}>
              <InvoiceTemplate 
                settings={{ ...s, _forceCopyLabel: label }} 
                isPreview={true} 
                bill={null} 
                items={[]} 
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ThermalPreview({ s }: { s: any }) {
  const pageSize = s?.print_thermal_page_size || '4inch';
  const maxW = pageSize === '2inch' ? '220px' : pageSize === '3inch' ? '280px' : '340px';

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', 
      gap: '12px', padding: '24px 16px', background: '#f1f5f9', minHeight: '100%'
    }}>
      <div style={{
          boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
          borderRadius: '4px',
          overflow: 'hidden',
          background: '#fff',
          width: maxW,
          border: '1px solid #e2e8f0'
      }}>
        <ThermalTemplate settings={s} bill={null} items={[]} isPreview={true} />
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
  const [printerTab, setPrinterTab] = useState<'regular' | 'thermal'>('regular');
  const [regularSubTab, setRegularSubTab] = useState<'layout' | 'colors'>('layout');

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
    <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: '4px' }}>
      <SaveBtn label="Save Changes" onClick={saveAll} disabled={!hasChanges || isSaving} />
    </div>
  );

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !isAdmin) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 300; const MAX_HEIGHT = 300;
        let width = img.width; let height = img.height;
        if (width > height) { if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; } }
        else { if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; } }
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.width > 0 ? canvas.toDataURL('image/webp', 0.8) : null;
          if (dataUrl) u({ logo_url: dataUrl });
        }
      };
      if (typeof event.target?.result === 'string') img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden', background: 'hsl(var(--background))' }}>
      
      {/* ═══ LEFT: SCROLLABLE SETTINGS ═══ */}
      <div className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '0 24px 40px 0' }}>
        
        {/* Appearance / Printer Type */}
        <SettingsCard title="Appearance" subtitle="Customize layout and colors for regular printing" icon="🎨" accent="hsl(var(--primary))" footer={renderSaveBtn()}>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
            <button onClick={() => setPrinterTab('regular')} style={{
              flex: 1, padding: '10px', borderRadius: '8px', border: `2px solid ${printerTab === 'regular' ? 'hsl(var(--primary))' : T.color.border}`,
              background: printerTab === 'regular' ? 'hsl(var(--primary))' : T.color.cardBg,
              color: printerTab === 'regular' ? '#fff' : T.color.textSec, fontWeight: 700, fontSize: '13px', cursor: 'pointer', transition: 'all 0.15s'
            }}>🖨️ Regular Printer</button>
            <button onClick={() => setPrinterTab('thermal')} style={{
              flex: 1, padding: '10px', borderRadius: '8px', border: `2px solid ${printerTab === 'thermal' ? 'hsl(var(--primary))' : T.color.border}`,
              background: printerTab === 'thermal' ? 'hsl(var(--primary))' : T.color.cardBg,
              color: printerTab === 'thermal' ? '#fff' : T.color.textSec, fontWeight: 700, fontSize: '13px', cursor: 'pointer', transition: 'all 0.15s'
            }}>🧾 Thermal Printer</button>
          </div>

          {printerTab === 'regular' ? (
            <>
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '12px 0' }}>
                  <SectionLabel text="Theme Accent Colors" />
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    {['#22c55e', '#2563eb', '#ea580c', '#b91c1c', '#7c3aed', '#db2777', '#000000', '#475569'].map(color => {
                      const isActive = (settings?.print_accent_color === color || settings?.print_primary_color === color);
                      return (
                        <button key={color} onClick={() => u({ print_accent_color: color, print_primary_color: color })}
                          style={{
                             width: '36px', height: '36px', borderRadius: '50%', background: color, border: isActive ? '3px solid #fff' : '2px solid transparent',
                             boxShadow: isActive ? `0 0 0 2px ${color}` : 'none', cursor: 'pointer', transition: 'all 0.2s'
                          }}
                        />
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          ) : (
             <LayoutPicker layouts={THERMAL_LAYOUTS} selected={settings?.print_thermal_layout || 'theme_1'} onSelect={(id) => u({ print_thermal_layout: id })} disabled={!isAdmin} />
          )}
        </SettingsCard>

        {/* Company Info */}
        <SettingsCard title="Print Company Info / Header" subtitle="Configure what company details appear on printed invoices" icon="🏢" accent="#10b981" footer={renderSaveBtn()}>
          <SettingRow label="Make Printer Default" desc="Use this printer as the default method"
            right={<Toggle on={printerTab === 'regular' ? (settings?.print_regular_default ?? false) : (settings?.print_thermal_default ?? false)} onChange={(v) => u(printerTab === 'regular' ? { print_regular_default: v } : { print_thermal_default: v })} disabled={!isAdmin} />} />
          <SettingRow label="Repeat Header on All Pages" desc="Repeat company header on multi-page invoices"
            right={<Toggle on={settings?.print_repeat_header ?? false} onChange={(v) => u({ print_repeat_header: v })} disabled={!isAdmin} />} />
          
          <SectionLabel text="Company Details Visibility" />
          <CheckRow checked={true} onChange={() => {}} label="Document Title" inputPlaceholder="e.g. INVOICE" inputValue={settings?.invoice_title || 'INVOICE'} onInputChange={(v) => u({ invoice_title: v })} disabled={!isAdmin} />
          <CheckRow checked={settings?.print_company_name ?? true} onChange={(v) => u({ print_company_name: v })} label="Company Name" inputPlaceholder="My Company" inputValue={settings?.print_company_name_text || settings?.business_name || ''} onInputChange={(v) => u({ print_company_name_text: v })} disabled={!isAdmin} />
          
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${op(T.color.border, 30)}`, padding: '4px 0' }}>
            <div style={{ flex: 1 }}>
              <CheckRow checked={settings?.print_company_logo ?? false} onChange={(v) => u({ print_company_logo: v })} label="Company Logo" disabled={!isAdmin} noBorder />
            </div>
            {settings?.print_company_logo && (
              <label style={{ cursor: 'pointer', background: 'hsl(var(--primary))', color: '#fff', fontSize: '11px', fontWeight: 800, padding: '6px 14px', borderRadius: '6px' }}>
                {settings.logo_url ? 'Change Logo' : 'Upload Logo'}
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleLogoUpload} />
              </label>
            )}
          </div>

          <CheckRow checked={settings?.print_show_address ?? true} onChange={(v) => u({ print_show_address: v })} label="Address" inputPlaceholder="Full Address" inputValue={settings?.print_address_text || settings?.address || ''} onInputChange={(v) => u({ print_address_text: v })} disabled={!isAdmin} />
          <CheckRow checked={settings?.print_show_email ?? true} onChange={(v) => u({ print_show_email: v })} label="Email" inputPlaceholder="email@example.com" inputValue={settings?.print_email_text || settings?.email || ''} onInputChange={(v) => u({ print_email_text: v })} disabled={!isAdmin} />
          <CheckRow checked={settings?.print_show_phone ?? true} onChange={(v) => u({ print_show_phone: v })} label="Phone Number" inputPlaceholder="+91 1234..." inputValue={settings?.print_phone_text || settings?.phone || ''} onInputChange={(v) => u({ print_phone_text: v })} disabled={!isAdmin} />
          <CheckRow checked={settings?.print_show_gstin ?? true} onChange={(v) => u({ print_show_gstin: v })} label="GSTIN on Sale" disabled={!isAdmin} />
        </SettingsCard>

        {/* Page Setup */}
        <SettingsCard title="Page Setup" subtitle="Configure paper size and text dimensions" icon="📐" accent="#0ea5e9" footer={renderSaveBtn()}>
          <SettingRow label="Paper Size" desc="Choose your paper format"
            right={<ChipGroup value={settings?.print_paper_size || 'A4'} onChange={(v) => u({ print_paper_size: v })} options={[{value:'A4',label:'A4'},{value:'A5',label:'A5'},{value:'Letter',label:'Letter'}]} disabled={!isAdmin} />} />
          <SettingRow label="Orientation" desc="Print in Portrait or Landscape"
            right={<ChipGroup value={settings?.print_orientation || 'portrait'} onChange={(v) => u({ print_orientation: v })} options={[{value:'portrait',label:'Portrait'},{value:'landscape',label:'Landscape'}]} disabled={!isAdmin} />} />
          <SettingRow label="Company Name Size"
            right={<ChipGroup value={settings?.print_company_name_size || 'large'} onChange={(v) => u({ print_company_name_size: v })} options={[{value:'small',label:'S'},{value:'medium',label:'M'},{value:'large',label:'L'},{value:'v.large',label:'XL'}]} disabled={!isAdmin} />} />
          <SettingRow label="Invoice Content Size" noBorder
            right={<ChipGroup value={settings?.print_invoice_text_size || 'medium'} onChange={(v) => u({ print_invoice_text_size: v })} options={[{value:'small',label:'S'},{value:'medium',label:'M'},{value:'large',label:'L'}]} disabled={!isAdmin} />} />
        </SettingsCard>

        {/* Copies */}
        <SettingsCard title="Print Copies & Layout Setup" subtitle="Manage copy labels and margins" icon="📄" accent="#8b5cf6" footer={renderSaveBtn()}>
          <SettingRow label="Print Original/Duplicate" desc="Enable copy labels on prints" noBorder={!(settings?.print_original_duplicate ?? true)}
            right={<Toggle on={settings?.print_original_duplicate ?? true} onChange={(v) => u({ print_original_duplicate: v })} disabled={!isAdmin} />} />
          
          {(settings?.print_original_duplicate ?? true) && (
            <div style={{ padding: '8px 12px', background: op(T.color.border, 10), borderRadius: '10px', marginBottom: '16px' }}>
              <CheckRow checked={settings?.print_copy_original ?? true} onChange={(v) => u({ print_copy_original: v })} label="Original (RECIPIENT)" disabled={!isAdmin} />
              <CheckRow checked={settings?.print_copy_duplicate ?? false} onChange={(v) => u({ print_copy_duplicate: v })} label="Duplicate (TRANSPORTER)" disabled={!isAdmin} />
              <CheckRow checked={settings?.print_copy_triplicate ?? false} onChange={(v) => u({ print_copy_triplicate: v })} label="Triplicate (SUPPLIER)" disabled={!isAdmin} noBorder />
            </div>
          )}

          <SettingRow label="Top Margin (mm)" desc="Add extra space at the top of the PDF" noBorder
            right={<Counter value={settings?.print_extra_space_top ?? 0} onChange={(v) => u({ print_extra_space_top: v })} min={0} max={100} disabled={!isAdmin} />} />
        </SettingsCard>

        {/* Item Table */}
        <SettingsCard title="Item Table" subtitle="Customize invoice table columns" icon="📜" accent="#f59e0b" footer={renderSaveBtn()}>
          <SettingRow label="Minimum Rows" desc="Force empty rows for consistent layout"
            right={<Counter value={settings?.print_min_table_rows ?? 0} onChange={(v) => u({ print_min_table_rows: v })} min={0} max={20} disabled={!isAdmin} />} />
          
          <SectionLabel text="Column Visibility" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
             <CheckRow checked={settings?.print_show_item_number ?? true} onChange={(v) => u({ print_show_item_number: v })} label="# (Sr. No.)" disabled={!isAdmin} />
             <CheckRow checked={settings?.print_show_hsn_sac ?? true} onChange={(v) => u({ print_show_hsn_sac: v })} label="HSN/SAC" disabled={!isAdmin} />
             <CheckRow checked={settings?.print_show_quantity ?? true} onChange={(v) => u({ print_show_quantity: v })} label="Quantity" disabled={!isAdmin} />
             <CheckRow checked={settings?.print_show_mrp ?? false} onChange={(v) => u({ print_show_mrp: v })} label="MRP" disabled={!isAdmin} />
             <CheckRow checked={settings?.print_show_price_unit ?? true} onChange={(v) => u({ print_show_price_unit: v })} label="Price/unit" disabled={!isAdmin} />
             <CheckRow checked={settings?.print_show_discount ?? true} onChange={(v) => u({ print_show_discount: v })} label="Discount" disabled={!isAdmin} />
             <CheckRow checked={settings?.print_show_tax_pct ?? false} onChange={(v) => u({ print_show_tax_pct: v })} label="Tax %" disabled={!isAdmin} />
             <CheckRow checked={settings?.print_show_gst ?? true} onChange={(v) => u({ print_show_gst: v })} label="Tax Amt" disabled={!isAdmin} />
             <CheckRow checked={settings?.print_show_currency ?? true} onChange={(v) => u({ print_show_currency: v })} label="Currency Symbol (₹)" disabled={!isAdmin} />
          </div>
        </SettingsCard>

        {/* Totals & Taxes */}
        <SettingsCard title="Totals & Taxes" subtitle="Configure totals and financial details" icon="🧮" accent="#ef4444" footer={renderSaveBtn()}>
           <SettingRow label="Total Item Quantity" right={<Toggle on={settings?.print_total_item_quantity ?? true} onChange={(v) => u({ print_total_item_quantity: v })} disabled={!isAdmin} />} />
           <SettingRow label="Amount Decimal" desc="Show 0.00 precision" right={<Toggle on={settings?.print_amount_decimal ?? true} onChange={(v) => u({ print_amount_decimal: v })} disabled={!isAdmin} />} />
           <SettingRow label="Received Amount" right={<Toggle on={settings?.print_received_amount ?? true} onChange={(v) => u({ print_received_amount: v })} disabled={!isAdmin} />} />
           <SettingRow label="Balance Due" right={<Toggle on={settings?.print_balance_amount ?? true} onChange={(v) => u({ print_balance_amount: v })} disabled={!isAdmin} />} />
           <SettingRow label="Tax Breakdown" right={<Toggle on={settings?.print_tax_details ?? true} onChange={(v) => u({ print_tax_details: v })} disabled={!isAdmin} />} />
           <SettingRow label="Show Savings Badge" right={<Toggle on={settings?.print_you_saved ?? true} onChange={(v) => u({ print_you_saved: v })} disabled={!isAdmin} />} />
           <SettingRow label="Amount in Words" noBorder
             right={<ChipGroup value={settings?.print_amount_words_format || 'indian'} onChange={(v) => u({ print_amount_words_format: v, print_amount_words: true })} options={[{value:'indian',label:'Indian'},{value:'international',label:'Intl'}]} disabled={!isAdmin} />} />
        </SettingsCard>

        {/* Footer */}
        <SettingsCard title="Footer" subtitle="Customize the bottom of your invoice" icon="📝" accent="#6366f1" footer={renderSaveBtn()}>
          <SettingRow label="Keep Footer Together" desc="Prevent splitting across pages" right={<Toggle on={settings?.print_keep_footer_together ?? true} onChange={(v) => u({ print_keep_footer_together: v })} disabled={!isAdmin} />} />
          <SettingRow label="Print Authorised Signatory" right={<Toggle on={settings?.print_show_signature ?? false} onChange={(v) => u({ print_show_signature: v })} disabled={!isAdmin} />} />
          {settings?.print_show_signature && (
            <div style={{ marginBottom: '16px' }}>
              <TextInput value={settings?.print_signature_text || ''} onBlur={(e) => u({ print_signature_text: e.target.value })} placeholder="Authorized Signatory" />
            </div>
          )}
          <SettingRow label="Payment Mode" right={<Toggle on={settings?.print_payment_mode ?? false} onChange={(v) => u({ print_payment_mode: v })} disabled={!isAdmin} />} />
          <SettingRow label="Acknowledgements Slip" right={<Toggle on={settings?.print_acknowledgement ?? true} onChange={(v) => u({ print_acknowledgement: v })} disabled={!isAdmin} />} noBorder />
        </SettingsCard>

      </div>

      {/* ═══ RIGHT: FIXED PREVIEW ═══ */}
      <div style={{ 
        width: '420px', flexShrink: 0, borderLeft: `1px solid ${T.color.border}`,
        display: 'flex', flexDirection: 'column', background: '#f8fafc', overflow: 'hidden'
      }}>
        {/* Preview Header */}
        <div style={{ 
          padding: '16px 20px', borderBottom: `1px solid ${T.color.border}`, background: '#fff',
          display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0
        }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e' }}></div>
          <span style={{ fontSize: '13.5px', fontWeight: 700, color: T.color.textPri }}>
            Live Preview — {printerTab === 'regular' ? 'Regular Invoice' : 'Thermal Receipt'}
          </span>
        </div>

        {/* Scrollable Preview Area */}
        <div className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto' }}>
          {printerTab === 'regular' ? <RegularPreview s={settings} /> : <ThermalPreview s={settings} />}
        </div>
      </div>

    </div>
  );
}
