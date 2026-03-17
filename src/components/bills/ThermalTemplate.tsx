import React from 'react';

// Shared interfaces from regular invoice
export interface BillItem {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  cost_price?: number;
  mrp_price?: number;
  hsn_code?: string;
  discount_amount?: number;
}

export interface Bill {
  id: string;
  bill_number: string;
  status: string;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  total_amount: number;
  created_at: string;
  completed_at?: string | null;
  customer_id?: string | null;
  customers?: { name: string; phone?: string; address?: string } | null;
}

interface ThermalTemplateProps {
  bill: Bill | null;
  items: BillItem[];
  settings: any;
  isPreview?: boolean;
}

/**
 * Helper to ensure safe formatting of numbers
 */
function fmt(val: number | null | undefined): string {
  if (val == null || isNaN(val)) return '0.00';
  return Number(val).toFixed(2);
}

/**
 * Standardize dates
 */
function fmtDate(dateStr: string | null | undefined): string {
  if (!dateStr) return new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return dateStr;
  }
}

export function ThermalTemplate({ bill, items, settings, isPreview = false }: ThermalTemplateProps) {
  // Settings lookups
  const themeId = settings?.print_thermal_layout || 'theme_1';
  const companyName = settings?.print_thermal_company_name_text || settings?.business_name || 'My Company';
  const showCompany = settings?.print_thermal_company_name ?? true;
  const showLogo = settings?.print_thermal_company_logo ?? false;
  const isBold = settings?.print_thermal_bold ?? true;
  
  const showAddr = settings?.print_thermal_show_address ?? true;
  const showPhone = settings?.print_thermal_show_phone ?? true;
  const showEmail = settings?.print_thermal_show_email ?? false;
  const showGstin = settings?.print_thermal_show_gstin ?? true;
  
  const address = settings?.address || '123 Main Street, City';
  const phone = settings?.phone || '+1-555-0123';
  const email = settings?.email || 'contact@example.com';
  const gstin = settings?.gst_number || '29XXXXX0000X1Z5';
  
  const terms = settings?.print_terms_conditions || 'Thank you for your business!';
  
  // Page Size wrapper logic (2 inch = 58mm ~ 220px, 3 inch = 80mm ~ 280px, 4 inch = 100mm ~ 340px)
  const pageSize = settings?.print_thermal_page_size || '4inch';
  const maxW = pageSize === '2inch' ? '220px' : pageSize === '3inch' ? '280px' : '340px';
  // If we are strictly in real print vs preview:
  const wrapperW = isPreview ? maxW : '100%';
  const minH = isPreview ? '400px' : 'auto';

  // Derived Bill Data (fallback to demo data if in preview and bill is null)
  const isDemo = isPreview || !bill;
  const finalBillNumber = isDemo ? 'INV-10015' : bill.bill_number;
  const finalDate = fmtDate(isDemo ? null : bill.completed_at || bill.created_at);
  const custName = isDemo ? 'John Doe' : (bill.customers?.name || 'Cash/Walk-in');
  const custPhone = isDemo ? '9876543210' : (bill.customers?.phone || '');
  
  const finalItems = (isDemo && items.length === 0) ? [
    { id: '1', product_name: 'Britannia Chocolate Cake', quantity: 2, unit_price: 15.00, total_price: 30.00 },
    { id: '2', product_name: 'Filter Coffee', quantity: 1, unit_price: 5.00, total_price: 5.00 },
    { id: '3', product_name: 'Mineral Water 1L', quantity: 3, unit_price: 1.00, total_price: 3.00 }
  ] : items;

  const sub = isDemo ? 38.00 : bill.subtotal;
  const disc = isDemo ? 3.00 : bill.discount_amount;
  const tax = isDemo ? 1.75 : bill.tax_amount;
  const total = isDemo ? 36.75 : bill.total_amount;

  const totalQty = finalItems.reduce((acc, curr) => acc + (Number(curr.quantity) || 0), 0);

  // Layout-specific styling base
  const containerStyle: React.CSSProperties = {
    background: '#fff',
    color: '#000',
    fontFamily: themeId === 'theme_2' ? "'Inter', 'Segoe UI', sans-serif" : "'Courier New', Courier, monospace",
    fontSize: pageSize === '2inch' ? '9px' : '11px',
    lineHeight: themeId === 'theme_3' ? 1.2 : 1.5,
    padding: isPreview ? '16px' : '0',
    maxWidth: wrapperW,
    width: wrapperW,
    margin: isPreview ? '0 auto' : '0',
    minHeight: minH,
    fontWeight: isBold ? (themeId === 'theme_3' ? 800 : 700) : 400,
    boxShadow: isPreview ? '0 4px 12px rgba(0,0,0,0.1)' : 'none',
    boxSizing: 'border-box' as const
  };

  const hrStyle = (style: 'dashed' | 'dotted' | 'solid', width: string = '1px') => ({
    border: 'none',
    borderTop: `${width} ${style} #000`,
    margin: themeId === 'theme_3' ? '4px 0' : '8px 0',
    width: '100%'
  });

  // -------------- THEME RENDERERS -------------- //

  const renderTheme1 = () => (
    <div style={containerStyle} className="thermal-root">
      <div style={{ textAlign: 'center', marginBottom: '8px' }}>
        {showCompany && <div style={{ fontSize: '140%', fontWeight: 800 }}>{companyName}</div>}
        <div style={{ fontSize: '90%' }}>
          {showAddr && <div>{address}</div>}
          {showPhone && <div>Ph: {phone}</div>}
          {showEmail && <div>{email}</div>}
          {showGstin && <div>GSTIN: {gstin}</div>}
        </div>
      </div>
      
      <hr style={hrStyle('dotted')} />
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '90%' }}>
        <div>Bill No: {finalBillNumber}</div>
        <div>Date: {finalDate.split(' ')[0]}</div>
      </div>
      <div style={{ fontSize: '90%', marginBottom: '4px' }}>Cashier: Admin</div>
      <hr style={hrStyle('dotted')} />

      <table style={{ width: '100%', fontSize: '90%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ textAlign: 'left' }}>
            <th style={{ paddingBottom: '4px' }}>Item</th>
            <th style={{ textAlign: 'center', paddingBottom: '4px' }}>Qty</th>
            <th style={{ textAlign: 'right', paddingBottom: '4px' }}>Price</th>
            <th style={{ textAlign: 'right', paddingBottom: '4px' }}>Amt</th>
          </tr>
        </thead>
        <tbody>
          {finalItems.map((it, i) => (
            <tr key={it.id || i}>
              <td style={{ padding: '2px 0', paddingRight: '4px' }}>
                <span style={{ display: 'block', maxWidth: '100px', wordWrap: 'break-word' }}>
                  {it.product_name}
                </span>
              </td>
              <td style={{ textAlign: 'center', padding: '2px 0' }}>{it.quantity}</td>
              <td style={{ textAlign: 'right', padding: '2px 0' }}>{fmt(it.unit_price)}</td>
              <td style={{ textAlign: 'right', padding: '2px 0' }}>{fmt(it.total_price)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <hr style={hrStyle('dotted')} />
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '95%' }}>
        <span>Subtotal ({totalQty} items)</span>
        <span>{fmt(sub)}</span>
      </div>
      {disc > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '90%' }}>
          <span>Discount</span>
          <span>-{fmt(disc)}</span>
        </div>
      )}
      {tax > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '90%' }}>
          <span>Tax</span>
          <span>+{fmt(tax)}</span>
        </div>
      )}
      <hr style={hrStyle('dotted')} />
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '120%', fontWeight: 800 }}>
        <span>TOTAL</span>
        <span>{fmt(total)}</span>
      </div>
      <hr style={hrStyle('dotted')} />
      
      <div style={{ textAlign: 'center', marginTop: '12px', fontSize: '85%' }}>
        <div>===== THANK YOU =====</div>
        <div style={{ marginTop: '8px' }}>{terms}</div>
      </div>
    </div>
  );

  const renderTheme2 = () => (
    <div style={containerStyle} className="thermal-root">
      <div style={{ textAlign: 'left', marginBottom: '8px' }}>
        {showCompany && <div style={{ fontSize: '150%', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '-0.5px' }}>{companyName}</div>}
        <div style={{ fontSize: '85%', color: '#333' }}>
          {showAddr && <div>{address}</div>}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {showPhone && <span>T: {phone}</span>}
            {showEmail && <span>E: {email}</span>}
          </div>
          {showGstin && <div>GSTIN: {gstin}</div>}
        </div>
      </div>
      
      <div style={{ margin: '8px 0', borderTop: '1px solid #000', borderBottom: '1px solid #000', padding: '4px 0', fontSize: '85%', display: 'flex', justifyContent: 'space-between' }}>
        <div>
          <div>Order: <strong>{finalBillNumber}</strong></div>
          <div>Customer: {custName}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div>{finalDate}</div>
        </div>
      </div>

      <div style={{ fontSize: '90%', padding: '4px 0' }}>
        {finalItems.map((it, i) => (
          <div key={it.id || i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
            <div style={{ flex: 1, paddingRight: '8px' }}>
              <div>{it.product_name}</div>
              <div style={{ fontSize: '85%', color: '#444' }}>{it.quantity} x {fmt(it.unit_price)}</div>
            </div>
            <div style={{ fontWeight: 600 }}>{fmt(it.total_price)}</div>
          </div>
        ))}
      </div>

      <hr style={hrStyle('solid')} />
      <div style={{ fontSize: '90%', display: 'flex', flexDirection: 'column', gap: '2px', padding: '4px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#444' }}>Subtotal</span>
            <span>{fmt(sub)}</span>
        </div>
        {disc > 0 && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#444' }}>Discount</span><span>-{fmt(disc)}</span></div>}
        {tax > 0 && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#444' }}>Tax</span><span>{fmt(tax)}</span></div>}
      </div>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '130%', fontWeight: 800, margin: '8px 0', borderTop: '2px solid #000', paddingTop: '6px' }}>
        <span>Total</span>
        <span>{fmt(total)}</span>
      </div>
      
      <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '80%' }}>
        {terms}
      </div>
    </div>
  );

  const renderTheme3 = () => (
    <div style={containerStyle} className="thermal-root">
      {/* Super Compact & Bold Theme */}
      {showCompany && <div style={{ fontSize: '130%', fontWeight: 900, textAlign: 'center' }}>{companyName.toUpperCase()}</div>}
      <div style={{ textAlign: 'center', fontSize: '85%' }}>
        {showPhone && <span>{phone} </span>}
        {showGstin && <span>| GST: {gstin}</span>}
      </div>
      
      <hr style={hrStyle('solid', '2px')} />
      <div style={{ fontSize: '85%', display: 'flex', justifyContent: 'space-between' }}>
        <strong>B:{finalBillNumber}</strong>
        <strong>{finalDate}</strong>
      </div>
      <hr style={hrStyle('solid', '2px')} />

      <div style={{ width: '100%', fontSize: '95%' }}>
        {finalItems.map((it, i) => (
          <div key={it.id || i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
            <span style={{ width: '25px', display: 'inline-block' }}>{it.quantity}x</span>
            <span style={{ flex: 1, paddingRight: '4px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{it.product_name}</span>
            <span style={{ fontWeight: 900 }}>{fmt(it.total_price)}</span>
          </div>
        ))}
      </div>

      <hr style={hrStyle('solid', '2px')} />
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '90%' }}>
        <span>SUB: {fmt(sub)}</span>
        <span>TAX: {fmt(tax)}</span>
      </div>
      {disc > 0 && <div style={{ textAlign: 'right', fontSize: '90%' }}>DISC: -{fmt(disc)}</div>}
      
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '160%', fontWeight: 900, marginTop: '4px' }}>
        <span>TOT</span>
        <span>{fmt(total)}</span>
      </div>
      <hr style={hrStyle('solid', '2px')} />
      {terms && <div style={{ textAlign: 'center', fontSize: '75%', marginTop: '4px' }}>-- {terms} --</div>}
    </div>
  );

  const renderTheme4 = () => (
    <div style={containerStyle} className="thermal-root">
      {/* Elegant Boutique */}
      <div style={{ textAlign: 'center', paddingBottom: '12px' }}>
        {showCompany && <div style={{ fontFamily: "'Georgia', serif", fontSize: '160%', fontWeight: 'normal', fontStyle: 'italic', marginBottom: '4px' }}>{companyName}</div>}
        <div style={{ fontSize: '85%', fontWeight: 'normal' }}>
            {showAddr && <div>{address}</div>}
            {showPhone && <div>{phone}</div>}
        </div>
      </div>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '85%', fontWeight: 'normal', borderTop: '1px dashed #000', borderBottom: '1px dashed #000', padding: '6px 0', margin: '4px 0' }}>
         <div>Receipt: {finalBillNumber}</div>
         <div>{finalDate.split(' ')[0]}</div>
      </div>

      <div style={{ margin: '12px 0', fontSize: '85%' }}>
        {finalItems.map((it, i) => (
          <div key={it.id || i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600 }}>{it.product_name}</div>
              <div style={{ fontWeight: 'normal' }}>{it.quantity} @ {fmt(it.unit_price)}</div>
            </div>
            <div style={{ fontWeight: 600 }}>{fmt(it.total_price)}</div>
          </div>
        ))}
      </div>

      <hr style={hrStyle('dashed')} />
      <div style={{ padding: '4px 0', fontSize: '90%', fontWeight: 'normal' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Sub Unit Total</span><span>{fmt(sub)}</span></div>
        {tax > 0 && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Tax Applied</span><span>{fmt(tax)}</span></div>}
      </div>
      <hr style={hrStyle('dashed')} />
      
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '130%', fontWeight: 800, padding: '4px 0' }}>
        <span>Amount Due</span>
        <span>{fmt(total)}</span>
      </div>
      
      {disc > 0 && (
         <div style={{ textAlign: 'center', margin: '12px 0', padding: '6px', border: '1px solid #000', borderRadius: '4px' }}>
           <div style={{ fontSize: '85%' }}>YOU SAVED</div>
           <div style={{ fontSize: '110%', fontWeight: 800 }}>{fmt(disc)}</div>
         </div>
      )}

      <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '80%', fontStyle: 'italic' }}>
        {terms}
      </div>
    </div>
  );

  const renderTheme5 = () => (
    <div style={containerStyle} className="thermal-root">
      {/* Quick Service / Token */}
      <div style={{ border: '2px solid #000', textAlign: 'center', padding: '8px', marginBottom: '12px' }}>
        <div style={{ fontSize: '90%' }}>TOKEN / ORDER NO:</div>
        <div style={{ fontSize: '200%', fontWeight: 900 }}>{finalBillNumber.slice(-4)}</div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '85%', marginBottom: '8px' }}>
        <div>{finalDate}</div>
        <div>{totalQty} Items</div>
      </div>

      <hr style={hrStyle('dashed')} />
      <div style={{ fontSize: '110%', fontWeight: 700 }}>
        {finalItems.map((it, i) => (
          <div key={it.id || i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px dotted #ccc' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
               <span style={{ border: '1px solid #000', padding: '0 4px', borderRadius: '2px' }}>{it.quantity}</span>
               <span style={{ maxWidth: '180px' }}>{it.product_name}</span>
            </div>
            <span>{fmt(it.total_price)}</span>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '140%', fontWeight: 900, marginTop: '8px' }}>
        <span>TOTAL</span>
        <span>{fmt(total)}</span>
      </div>
      {disc > 0 && <div style={{ fontSize: '85%' }}>Includes disc: {fmt(disc)}</div>}
      
      <hr style={hrStyle('solid')} />
      <div style={{ textAlign: 'center', fontSize: '85%' }}>
        {showCompany && <div style={{ fontWeight: 800 }}>{companyName}</div>}
        <div style={{ marginTop: '4px' }}>{terms}</div>
      </div>
    </div>
  );

  switch (themeId) {
    case 'theme_2': return renderTheme2();
    case 'theme_3': return renderTheme3();
    case 'theme_4': return renderTheme4();
    case 'theme_5': return renderTheme5();
    case 'theme_1':
    default:
      return renderTheme1();
  }
}
