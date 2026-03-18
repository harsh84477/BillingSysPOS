import React from 'react';
import { format } from 'date-fns';
import { QRCodeSVG } from 'qrcode.react';
import { UrbanBillTemplate } from './UrbanBillTemplate';

export interface InvoiceTemplateProps {
  bill?: any;
  items?: any[];
  settings?: any;
  isPreview?: boolean;
}

export function InvoiceTemplate({ bill, items, settings: s, isPreview = false }: InvoiceTemplateProps) {

  // Check if Urban Bill Style is selected
  if (s?.print_regular_layout === 'urban_bill_style') {
    return <UrbanBillTemplate bill={bill} items={items} settings={s} isPreview={isPreview} />;
  }

  // --- Data Resolvers ---
  // If isPreview is true, we use dummy data. Otherwise we use the real bill object.
  const isMock = isPreview || !bill;

  const bNumber = isMock ? 'Inv. 101' : bill?.bill_number;
  const bDate = isMock ? '02-07-2019' : bill?.created_at ? format(new Date(bill.created_at), 'dd-MM-yyyy') : '';
  const bTime = isMock ? '12:30 PM' : bill?.created_at ? format(new Date(bill.created_at), 'hh:mm a') : '';
  const dueDate = isMock ? '17-07-2019' : ''; // You can plug real due dates if your DB has them
  
  const custName = isMock ? 'Classic enterprises' : (bill?.customers?.name || 'Cash Customer');
  const custAddr = isMock ? 'Plot No. 1, Shop No. 8, Koramangala, Banglore, 560034' : (bill?.customers?.address || '');
  const custPhone = isMock ? '8888888888' : (bill?.customers?.phone || '');

  const dataItems = isMock ? Array.from({ length: 12 }, (_, i) => ({
    name: `ITEM ${i + 1} - Sample Product Description`, 
    hsn: '1234', 
    qty: 2, 
    mrp: 15.00 + (i * 2.50),
    price: 10.00 + (i * 2.50), 
    discount: 0.10, 
    gstAmt: 0.50, 
    gstPct: 5, 
    total: 20.00 + (i * 5.00)
  })) : (items || []).map((i: any) => ({
    name: i.product_name,
    hsn: i.hsn_code || '-',
    qty: Number(i.quantity) || 0,
    mrp: Number(i.mrp_price) || Number(i.unit_price) || 0,
    price: Number(i.unit_price) || 0,
    discount: Number(i.discount_amount) || 0,
    gstAmt: Number(i.tax_amount) || 0, // Used as absolute Tax Amt
    gstPct: 0, // Placeholder if item-level tax % not tracked directly in items array
    total: Number(i.total_price) || 0
  }));

  const subTotal = isMock ? 40.00 : (Number(bill?.subtotal) || 0);
  const totalDisc = isMock ? 5.90 : (Number(bill?.discount_amount) || 0);
  const totalTax = isMock ? 2.52 : (Number(bill?.tax_amount) || 0);
  const grandTotal = isMock ? 45.80 : (Number(bill?.total_amount) || 0);

  const amtReceived = isMock ? 12000.00 : 0; // Update with real received if tracked in DB
  const amtBalance = isMock ? 30.32 : grandTotal; // Update with real balance if tracked

  // --- Setting Resolvers ---
  const companyName = s?.print_company_name_text || s?.business_name || 'My Company';
  const phone = s?.phone || '9625507147';
  const address = s?.address || 'Plot No. 1, Shop No. 8, Koramangala, Banglore';
  const email = s?.email || '';
  const docTitle = s?.invoice_title || 'INVOICE';

  const showAddr = s?.print_show_address ?? true;
  const showPhone = s?.print_show_phone ?? true;
  const showTaxMode = s?.print_tax_details ?? true;
  const showYouSaved = s?.print_you_saved ?? true;
  const showWords = s?.print_amount_words ?? false;
  const showReceived = s?.print_received_amount ?? true;
  const showBalanceMode = s?.print_balance_amount ?? true;
  const showDesc = s?.print_description ?? false;
  const showAck = s?.print_acknowledgement ?? true;
  const showTerms = (s?.print_terms_conditions || '').trim().length > 0;
  const showSignature = s?.print_show_signature ?? false;
  const sigText = s?.print_signature_text || 'Authorized Signatory';
  const showEmail = s?.print_show_email ?? true;
  const showGstin = s?.print_show_gstin ?? true;
  
  const nameSize = s?.print_company_name_size === 'v.small' ? '12px' : s?.print_company_name_size === 'small' ? '14px' : s?.print_company_name_size === 'medium' ? '17px' : s?.print_company_name_size === 'v.large' ? '24px' : s?.print_company_name_size === 'e.large' ? '28px' : '20px';
  const textSize = s?.print_invoice_text_size === 'v.small' ? '8px' : s?.print_invoice_text_size === 'small' ? '9px' : s?.print_invoice_text_size === 'large' ? '12px' : s?.print_invoice_text_size === 'v.large' ? '14px' : s?.print_invoice_text_size === 'e.large' ? '16px' : '10.5px';
  const showDecimal = s?.print_amount_decimal ?? true;
  const showCurrency = s?.print_show_currency ?? true;
  const currSym = showCurrency ? '₹ ' : '';
  const fmt = (n: number) => showDecimal ? `${currSym}${Number(n).toFixed(2)}` : `${currSym}${Math.round(n)}`;
  
  const accent = s?.print_accent_color || 'hsl(var(--primary))';
  const showCopyInfo = s?.print_original_duplicate ?? true;
  
  // Accept copyLabel as prop if provided by the multi-page wrapper, otherwise fallback to the default logic
  const copyLabelOverride = (s as any)?._forceCopyLabel;
  const copyLabel = showCopyInfo ? (copyLabelOverride || (s?.print_copy_original ? 'ORIGINAL FOR RECIPIENT' : 'DUPLICATE')) : '';
  
  const showHash = s?.print_show_item_number ?? true;
  const showHsn = s?.print_show_hsn_sac ?? true;
  const showQty = s?.print_show_quantity ?? true;
  const showMrp = s?.print_show_mrp ?? false; // new
  const showPrice = s?.print_show_price_unit ?? true;
  const showDisc = s?.print_show_discount ?? true;
  const showTaxPct = s?.print_show_tax_pct ?? false; // new
  const showTaxAmt = s?.print_show_gst ?? true; // Reusing print_show_gst logically for Tax Amt

  const showBank = s?.print_bank_details ?? true;
  const marginTopPx = (s?.print_extra_space_top || 0) * 3.77; // 1mm ≈ 3.77px
  const theme = s?.print_regular_layout || 'gst_theme_6';
  const paperSize = s?.print_paper_size || 'A4';

  // --- Print pagination logic ---
  const itemCount = dataItems.length;

  // Helper styles based on theme
  const isFrench = theme === 'french_elite';
  const isDouble = theme === 'double_divine';
  const isGst6 = theme === 'gst_theme_6';
  
  const fontFam = isFrench ? "'Playfair Display', 'Merriweather', serif" : "'Inter', 'Segoe UI', sans-serif";
  const headerBg = isDouble ? accent : isGst6 ? '#f3f4f6' : isFrench ? 'transparent' : `${accent}1A`; // 1A is ~10% opacity in hex
  const headerColor = isDouble ? '#ffffff' : isGst6 ? '#111827' : accent;
  const tableBorder = isDouble ? `2px solid ${accent}` : isGst6 ? '1px solid #d1d5db' : isFrench ? 'none' : `1px solid ${accent}4D`;
  const containerPad = isPreview ? '28px 24px' : '0'; // Real print manages margins via @page

  // Reusable hex rgba helper wrapper since op() isn't available here natively
  const opCss = (colorStr: string, pct: number) => {
    if (colorStr.startsWith('hsl')) return colorStr; // Fallback for raw hsl strings in preview
    // Simplistic converter or just assume we're fine relying on raw hex
    return colorStr;
  };

  const tableHeaderStyle: React.CSSProperties = {
    background: headerBg,
    color: headerColor,
    fontWeight: isFrench ? 600 : 700,
    fontSize: isFrench ? '10px' : '9px',
    textTransform: 'uppercase',
    letterSpacing: '0.03em',
    borderTop: isDouble ? tableBorder : 'none',
    borderBottom: isFrench ? `1px solid ${accent}` : tableBorder
  };

  const tdStyle: React.CSSProperties = {
    padding: isGst6 ? '4px 6px' : '6px 8px',
    borderBottom: isFrench ? '1px dashed #e5e7eb' : isGst6 ? '1px solid #e5e7eb' : '1px solid #f0f0f0',
    borderLeft: isGst6 ? '1px solid #e5e7eb' : 'none',
    borderRight: isGst6 ? '1px solid #e5e7eb' : 'none',
  };

  // cp = compact mode for ALL print outputs (not preview)
  // singlePage only controls whether page breaks are prevented
  const cp = !isPreview;
  const headerMb = cp ? '6px' : '16px';
  const billToMb = cp ? '6px' : '20px';
  const tableMb = cp ? '4px' : '16px';
  const footerGap = cp ? '8px' : '24px';
  const footerMt = cp ? '4px' : '16px';
  const sigMt = cp ? '6px' : '30px';
  const sigPt = cp ? '4px' : '16px';
  const sigSpace = cp ? '12px' : '32px';
  const ackMt = cp ? '12px' : '40px';
  const ackPt = cp ? '8px' : '20px';
  const headerPb = cp ? '6px' : '14px';

  return (
    <div className="invoice-template-root" style={{ 
      background: '#fff', 
      color: '#1a1a1a', 
      fontFamily: fontFam, 
      fontSize: textSize, 
      lineHeight: cp ? 1.3 : 1.5, 
      padding: containerPad, 
      paddingTop: isPreview ? `${28 + marginTopPx}px` : `${marginTopPx}px`, 
      position: 'relative',
      boxSizing: 'border-box',
      width: '100%',
      minHeight: '100%'
    }}>
      
      {/* Document Title Header Block */}
      {docTitle && (
        <div style={{ textAlign: isFrench ? 'center' : 'center', marginBottom: headerMb, borderBottom: isDouble ? `3px double ${accent}` : 'none', paddingBottom: isDouble ? '8px' : '0' }}>
            <span style={{ 
                fontSize: isFrench ? '16px' : '14px', 
                fontWeight: 800, 
                letterSpacing: isFrench ? '0.15em' : '0.1em', 
                color: isGst6 ? '#374151' : accent,
                textTransform: 'uppercase',
                border: isGst6 ? '1px solid #d1d5db' : 'none',
                padding: isGst6 ? '4px 16px' : '0',
                borderRadius: isGst6 ? '20px' : '0'
            }}>{docTitle}</span>
        </div>
      )}

      {/* Copy Label */}
      {showCopyInfo && (
        <div style={{ position: 'absolute', top: isPreview ? `${16 + marginTopPx}px` : `${marginTopPx}px`, right: isPreview ? '24px' : '0', fontSize: '9px', fontWeight: 600, color: '#666', letterSpacing: '0.05em' }}>
          {copyLabel}
        </div>
      )}

      {/* Main Company Header Area */}
      {(s?.print_company_name ?? true) && (
        <div style={{ 
            display: 'flex', 
            justifyContent: isFrench ? 'center' : (isDouble ? 'flex-start' : 'space-between'), 
            alignItems: isFrench ? 'center' : 'flex-end',
            flexDirection: isFrench ? 'column' : 'row',
            textAlign: isFrench ? 'center' : (isDouble ? 'left' : 'right'), 
            borderBottom: isFrench ? '1px solid #e5e7eb' : isGst6 ? '2px solid #111' : '1px solid #e5e7eb', 
            paddingBottom: headerPb, 
            marginBottom: headerMb,
            gap: isDouble ? '24px' : '0'
        }}>
          {isDouble && (
             <div style={{ width: cp ? '40px' : '60px', height: cp ? '40px' : '60px', background: `${accent}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px', color: accent, fontSize: cp ? '16px' : '24px', fontWeight: 900 }}>
                 {companyName.charAt(0)}
             </div>
          )}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: isFrench ? 'center' : (isDouble ? 'flex-start' : 'flex-end') }}>
            <div style={{ fontSize: nameSize, fontWeight: 800, color: '#111', letterSpacing: isFrench ? '0.05em' : 'normal' }}>{companyName}</div>
            {showPhone && <div style={{ fontSize: '10px', color: '#666' }}>Ph.no: {phone}</div>}
            {showEmail && email && <div style={{ fontSize: '10px', color: '#666', marginTop: '2px' }}>Email: {email}</div>}
            {showGstin && s?.gst_number && <div style={{ fontSize: '10px', color: '#666', marginTop: '2px' }}>GSTIN: {s.gst_number}</div>}
            {showAddr && address && <div style={{ fontSize: '10px', color: '#666', marginTop: '4px' }}>{address}</div>}
          </div>
        </div>
      )}

      {/* Bill To / Shipping / Invoice Details */}
      <div style={{ display: 'grid', gridTemplateColumns: isDouble ? '1.5fr 1fr' : '1fr 1fr 1fr', gap: cp ? '6px' : '12px', marginBottom: billToMb, fontSize: '9.5px' }}>
        <div style={{ background: isGst6 ? '#f9fafb' : 'transparent', padding: isGst6 ? '12px' : '0', border: isGst6 ? '1px solid #e5e7eb' : 'none', borderRadius: '6px' }}>
          <div style={{ fontWeight: 700, fontSize: '10px', marginBottom: '4px', color: isFrench ? accent : '#374151', textTransform: isFrench ? 'uppercase' : 'none' }}>Bill To:</div>
          <div style={{ fontWeight: 600, fontSize: '11px', color: '#111' }}>{custName}</div>
          {showAddr && <div style={{ color: '#555', lineHeight: 1.4, marginTop: '2px' }}>{custAddr}</div>}
          {showPhone && custPhone && <div style={{ color: '#555', marginTop: '2px' }}>Contact: {custPhone}</div>}
        </div>
        
        {!isDouble && (
            <div style={{ background: isGst6 ? '#f9fafb' : 'transparent', padding: isGst6 ? '12px' : '0', border: isGst6 ? '1px solid #e5e7eb' : 'none', borderRadius: '6px' }}>
            <div style={{ fontWeight: 700, fontSize: '10px', marginBottom: '4px', color: isFrench ? accent : '#374151', textTransform: isFrench ? 'uppercase' : 'none' }}>Shipping To:</div>
            <div style={{ color: '#555', lineHeight: 1.4 }}>{custAddr || 'Same as Billing Address'}</div>
            </div>
        )}

        <div style={{ textAlign: isDouble ? 'right' : 'right', background: isGst6 ? '#f9fafb' : 'transparent', padding: isGst6 ? '12px' : '0', border: isGst6 ? '1px solid #e5e7eb' : 'none', borderRadius: '6px' }}>
          <div style={{ fontWeight: 700, fontSize: '10px', marginBottom: '4px', color: isFrench ? accent : '#374151', textTransform: isFrench ? 'uppercase' : 'none' }}>Invoice Details</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', color: '#333' }}><span style={{ color: '#666' }}>Invoice No:</span> <span style={{ fontWeight: 600 }}>{bNumber}</span></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', color: '#333' }}><span style={{ color: '#666' }}>Date:</span> <span>{bDate}</span></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', color: '#333' }}><span style={{ color: '#666' }}>Time:</span> <span>{bTime}</span></div>
          {dueDate && <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', color: '#333' }}><span style={{ color: '#666' }}>Due Date:</span> <span>{dueDate}</span></div>}
        </div>
      </div>

      {/* Items Table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: tableMb, fontSize: textSize, border: isGst6 ? '1px solid #111' : 'none' }}>
        <thead>
          <tr style={tableHeaderStyle}>
            {showHash && <th style={{ padding: isGst6 ? '6px' : '8px 10px', textAlign: 'left', borderRight: isGst6 ? '1px solid #e5e7eb' : 'none' }}>#</th>}
            <th style={{ padding: isGst6 ? '6px' : '8px 10px', textAlign: 'left', borderRight: isGst6 ? '1px solid #e5e7eb' : 'none' }}>Item name</th>
            {showHsn && <th style={{ padding: isGst6 ? '6px' : '8px 10px', textAlign: 'center', borderRight: isGst6 ? '1px solid #e5e7eb' : 'none' }}>HSC/SAC</th>}
            {showQty && <th style={{ padding: isGst6 ? '6px' : '8px 10px', textAlign: 'center', borderRight: isGst6 ? '1px solid #e5e7eb' : 'none' }}>Qty</th>}
            {showMrp && <th style={{ padding: isGst6 ? '6px' : '8px 10px', textAlign: 'right', borderRight: isGst6 ? '1px solid #e5e7eb' : 'none' }}>MRP</th>}
            {showPrice && <th style={{ padding: isGst6 ? '6px' : '8px 10px', textAlign: 'right', borderRight: isGst6 ? '1px solid #e5e7eb' : 'none' }}>Price/unit</th>}
            {showDisc && <th style={{ padding: isGst6 ? '6px' : '8px 10px', textAlign: 'right', borderRight: isGst6 ? '1px solid #e5e7eb' : 'none' }}>Disc</th>}
            {showTaxPct && <th style={{ padding: isGst6 ? '6px' : '8px 10px', textAlign: 'right', borderRight: isGst6 ? '1px solid #e5e7eb' : 'none' }}>Tax %</th>}
            {showTaxAmt && <th style={{ padding: isGst6 ? '6px' : '8px 10px', textAlign: 'right', borderRight: isGst6 ? '1px solid #e5e7eb' : 'none' }}>Tax Amt</th>}
            <th style={{ padding: isGst6 ? '6px' : '8px 10px', textAlign: 'right' }}>Amt</th>
          </tr>
        </thead>
        <tbody>
          {dataItems.map((item: any, idx: number) => (
             <tr key={idx} style={{ background: isDouble && idx % 2 !== 0 ? '#f9fafb' : 'transparent' }}>
                 {showHash && <td style={tdStyle}>{idx + 1}</td>}
                 <td style={{ ...tdStyle, fontWeight: 600, color: '#111' }}>{item.name}</td>
                 {showHsn && <td style={{ ...tdStyle, textAlign: 'center' }}>{item.hsn}</td>}
                 {showQty && <td style={{ ...tdStyle, textAlign: 'center' }}>{item.qty}</td>}
                 {showMrp && <td style={{ ...tdStyle, textAlign: 'right' }}>{fmt(item.mrp)}</td>}
                 {showPrice && <td style={{ ...tdStyle, textAlign: 'right' }}>{fmt(item.price)}</td>}
                 {showDisc && <td style={{ ...tdStyle, textAlign: 'right' }}>{fmt(item.discount)}</td>}
                 {showTaxPct && <td style={{ ...tdStyle, textAlign: 'right' }}>{item.gstPct > 0 ? `${item.gstPct}%` : '-'}</td>}
                 {showTaxAmt && <td style={{ ...tdStyle, textAlign: 'right' }}>{item.gstAmt > 0 ? fmt(item.gstAmt) : '-'}</td>}
                 <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}>{fmt(item.total)}</td>
             </tr>
          ))}
          
          {/* Main Table Totals Row */}
          <tr style={{ fontWeight: 700, borderTop: isGst6 ? '2px solid #111' : '2px solid #d1d5db', background: isFrench ? '#f8fafc' : 'transparent' }}>
            <td colSpan={1 + (showHash ? 1 : 0) + (showHsn ? 1 : 0)} style={{ padding: '8px 10px', textTransform: 'uppercase', color: isFrench ? accent : '#111' }}>Total</td>
            {showQty && <td style={{ padding: '8px 10px', textAlign: 'center' }}>{dataItems.reduce((acc: number, item: any) => acc + item.qty, 0)}</td>}
            {showMrp && <td style={{ padding: '8px 10px', textAlign: 'right' }}></td>}
            <td colSpan={(showPrice ? 1 : 0)} style={{ padding: '8px 10px', textAlign: 'right' }}></td>
            {showDisc && <td style={{ padding: '8px 10px', textAlign: 'right' }}>{fmt(totalDisc)}</td>}
            {showTaxPct && <td style={{ padding: '8px 10px', textAlign: 'right' }}></td>}
            {showTaxAmt && <td style={{ padding: '8px 10px', textAlign: 'right' }}>{fmt(totalTax)}</td>}
            <td style={{ padding: '8px 10px', textAlign: 'right', fontSize: '11px', color: isFrench ? accent : '#111' }}>{fmt(grandTotal)}</td>
          </tr>
        </tbody>
      </table>

      {/* Footer section — no forced page breaks, browser fills remaining space naturally */}
      <div className="invoice-footer-block">

      {/* Two Column Layout for the bottom area */}
      <div style={{ display: 'flex', gap: footerGap, flexDirection: isFrench ? 'row-reverse' : 'row' }}>
          
          {/* Right/Left Side: Totals & Summaries */}
          <div style={{ flex: '0 0 240px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ background: isDouble ? `${accent}15` : isGst6 ? '#f9fafb' : '#fff', padding: isFrench ? '0' : '12px', borderRadius: '8px', border: isDouble ? `1px solid ${accent}30` : isFrench ? 'none' : '1px solid #e5e7eb' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', color: '#555', fontSize: '10px' }}>
                      <span>Subtotal:</span>
                      <span style={{ fontWeight: 600, color: '#111' }}>{fmt(subTotal)}</span>
                  </div>
                  {totalDisc > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', color: '#dc2626', fontSize: '10px' }}>
                          <span>Discount:</span>
                          <span style={{ fontWeight: 600 }}>-{fmt(totalDisc)}</span>
                      </div>
                  )}
                  {totalTax > 0 && (
                       <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', color: '#555', fontSize: '10px' }}>
                          <span>Tax Total:</span>
                          <span style={{ fontWeight: 600, color: '#111' }}>{fmt(totalTax)}</span>
                      </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '10px', borderTop: isDouble ? `1px dashed ${accent}` : '1px solid #d1d5db', fontSize: '12px', fontWeight: 800, color: isFrench ? accent : '#111' }}>
                      <span>GRAND TOTAL:</span>
                      <span>{fmt(grandTotal)}</span>
                  </div>
              </div>

              {showReceived && (
                 <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', padding: '0 4px' }}>
                    <span style={{ color: '#666' }}>Amount Received:</span>
                    <span style={{ fontWeight: 700 }}>{fmt(amtReceived)}</span>
                 </div>
              )}
              {showBalanceMode && (
                 <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', padding: '0 4px', color: '#dc2626' }}>
                    <span style={{ fontWeight: 600 }}>Balance Due:</span>
                    <span style={{ fontWeight: 800 }}>{fmt(amtBalance)}</span>
                 </div>
              )}
              {showYouSaved && totalDisc > 0 && (
                 <div style={{ textAlign: 'center', marginTop: '6px' }}>
                    <span style={{ background: '#dcfce7', color: '#166534', padding: '4px 12px', borderRadius: '20px', fontWeight: 700, fontSize: '9px', display: 'inline-block' }}>
                       You Saved {fmt(totalDisc)}!
                    </span>
                 </div>
              )}
          </div>

          {/* Left/Right Side: Bank, Words, Tax Breakdown */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {showWords && (
                  <div style={{ fontSize: '9.5px' }}>
                      <span style={{ fontWeight: 700, color: isFrench ? accent : '#555', textTransform: 'uppercase' }}>Amount in Words:</span>
                      <div style={{ fontWeight: 600, marginTop: '2px', color: '#111', fontStyle: isFrench ? 'italic' : 'normal' }}>One Hundred and Twenty Only (Auto-generated in production)</div>
                  </div>
              )}

              {showTaxMode && (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '8.5px', border: isGst6 ? '1px solid #e5e7eb' : 'none' }}>
                    <thead>
                    <tr style={{ background: isDouble ? `${accent}1A` : '#f3f4f6', color: isDouble ? accent : '#555' }}>
                        <th style={{ padding: '4px 6px', textAlign: 'left', fontWeight: 600 }}>Tax Type</th>
                        <th style={{ padding: '4px 6px', textAlign: 'right', fontWeight: 600 }}>Taxable Amt</th>
                        <th style={{ padding: '4px 6px', textAlign: 'right', fontWeight: 600 }}>Tax Amt</th>
                    </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td style={{ padding: '4px 6px', borderBottom: '1px solid #f0f0f0' }}>IGST @ 18%</td>
                            <td style={{ padding: '4px 6px', borderBottom: '1px solid #f0f0f0', textAlign: 'right' }}>{fmt(subTotal)}</td>
                            <td style={{ padding: '4px 6px', borderBottom: '1px solid #f0f0f0', textAlign: 'right' }}>{fmt(totalTax)}</td>
                        </tr>
                    </tbody>
                  </table>
              )}

              {showBank && (
                  <div style={{ border: isFrench ? '1px dashed #ccc' : `1px solid ${accent}4D`, background: isFrench ? 'transparent' : `${accent}0A`, padding: '10px', borderRadius: '6px', display: 'flex', gap: '16px' }}>
                      {(s?.print_upi_qr ?? true) && s?.upi_id && (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                             <div style={{ width: '56px', height: '56px', background: '#fff', padding: '4px', borderRadius: '4px', border: '1px solid #ddd', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                 <QRCodeSVG value={`upi://pay?pa=${s.upi_id}&pn=${encodeURIComponent(companyName)}&am=${grandTotal}&cu=INR`} size={46} />
                             </div>
                             {(s?.print_pay_now_btn ?? true) && (
                                 <div style={{ fontSize: '7px', fontWeight: 800, background: '#16a34a', color: '#fff', padding: '2px 8px', borderRadius: '12px', whiteSpace: 'nowrap' }}>PAY NOW</div>
                             )}
                          </div>
                      )}
                      <div>
                          <div style={{ fontSize: '9px', fontWeight: 700, color: isFrench ? accent : '#555', textTransform: 'uppercase', marginBottom: '4px' }}>Bank Details</div>
                          <div style={{ fontSize: '9px', lineHeight: 1.5, color: '#333' }}>
                              <div style={{ display: 'flex' }}><span style={{ width: '80px', color: '#666' }}>Bank Name:</span> <strong>{s?.print_bank_name || 'XXXXXXXXXX'}</strong></div>
                              <div style={{ display: 'flex' }}><span style={{ width: '80px', color: '#666' }}>Account No:</span> <strong>{s?.print_bank_account || '000000000000'}</strong></div>
                              <div style={{ display: 'flex' }}><span style={{ width: '80px', color: '#666' }}>IFSC Code:</span> <strong>{s?.print_bank_ifsc || 'XXXX0000000'}</strong></div>
                          </div>
                      </div>
                  </div>
              )}
          </div>
      </div>

      {/* Description & Terms */}
      <div style={{ marginTop: footerMt, display: 'flex', flexDirection: 'column', gap: cp ? '4px' : '8px' }}>
        {showDesc && (
            <div style={{ fontSize: '9px' }}>
                <span style={{ fontWeight: 700, color: isFrench ? accent : '#555' }}>Description:</span> <span style={{ color: '#333' }}>Standard sale description for professional recording.</span>
            </div>
        )}
        {showTerms && (
            <div style={{ fontSize: '8.5px', color: '#555', borderTop: '1px solid #f0f0f0', paddingTop: '8px' }}>
                <span style={{ fontWeight: 700 }}>Terms & Conditions:</span> {s?.print_terms_conditions}
            </div>
        )}
      </div>

      {/* Signature Area */}
      {showSignature && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: sigMt, paddingTop: sigPt, borderTop: isDouble ? `2px solid ${accent}` : '1px solid #e5e7eb' }}>
           <div style={{ textAlign: 'center', width: '180px' }}>
               <div style={{ fontSize: '8.5px', color: '#666', marginBottom: sigSpace }}>For {companyName}</div>
               {s?.signature_url && (
                 <img src={s.signature_url} alt="Signature" style={{ maxHeight: '40px', maxWidth: '120px', objectFit: 'contain', marginBottom: '4px' }} />
               )}
               <div style={{ borderBottom: '1px solid #111', width: '100%', marginBottom: '4px' }}></div>
               <div style={{ fontSize: '9px', fontWeight: 600 }}>{sigText}</div>
           </div>
        </div>
      )}

      {/* Acknowledgement Tear-off */}
      {showAck && (
          <div style={{ 
              marginTop: ackMt, 
              borderTop: '1px dashed #94a3b8', 
              paddingTop: ackPt
          }}>
              <div style={{ textAlign: 'center', marginBottom: cp ? '6px' : '16px' }}>
                  <div style={{ fontSize: '9px', fontWeight: 700, color: '#64748b', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Acknowledgement / Return Slip</div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9.5px' }}>
                  <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, color: '#111', marginBottom: '6px' }}>Received From: {companyName}</div>
                      <div style={{ color: '#555' }}>To: {custName}</div>
                      <div style={{ color: '#555', marginTop: '2px' }}>Amount: <span style={{ fontWeight: 700, color: '#111' }}>{fmt(grandTotal)}</span></div>
                  </div>
                  <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                     <div style={{ width: '140px', borderBottom: '1px solid #94a3b8', marginBottom: '4px' }}></div>
                     <div style={{ fontSize: '8px', color: '#666' }}>Receiver Signature & Seal</div>
                  </div>
              </div>
          </div>
      )}

      </div>{/* end .invoice-footer-block */}

    </div>
  );
}
