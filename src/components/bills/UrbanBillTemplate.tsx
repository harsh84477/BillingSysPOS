import React from 'react';
import { format } from 'date-fns';
import { QRCodeSVG } from 'qrcode.react';

export interface UrbanBillTemplateProps {
  bill?: any;
  items?: any[];
  settings?: any;
  isPreview?: boolean;
}

// Utility to determine contrasting text color (white or dark) based on background hex
function getContrastColor(hexColor: string) {
  if (!hexColor) return '#ffffff';
  let hex = hexColor.replace('#', '');
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
  if (hex.length !== 6) return '#ffffff';
  
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 2), 16);
  const b = parseInt(hex.substring(4, 2), 16);
  const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
  
  return (yiq >= 128) ? '#111827' : '#ffffff';
}

export function UrbanBillTemplate({ bill, items, settings: s, isPreview = false }: UrbanBillTemplateProps) {
  // --- Data Resolvers ---
  const isMock = isPreview || !bill;

  const bNumber = isMock ? 'INV-2026-001' : bill?.bill_number;
  const bDate = isMock ? '18-03-2026' : bill?.created_at ? format(new Date(bill.created_at), 'dd-MM-yyyy') : '';
  const bTime = isMock ? '10:45 AM' : bill?.created_at ? format(new Date(bill.created_at), 'hh:mm a') : '';
  
  const custName = isMock ? 'Urban Tech Solutions' : (bill?.customers?.name || 'Cash Customer');
  const custAddr = isMock ? '45, Industrial Estate, Phase 2, New Delhi, 110020' : (bill?.customers?.address || '');
  const custPhone = isMock ? '+91 9876543210' : (bill?.customers?.phone || '');
  // Extract state assuming format like "New Delhi" or from notes, mocking for preview
  const custState = isMock ? 'Delhi' : ''; 
  const custGstin = isMock ? '07AAECU0000A1Z5' : '';

  // Data mapping for items
  const dataItems = isMock ? Array.from({ length: 5 }, (_, i) => ({
    name: i === 0 ? 'Logitech MX Master 3S Wireless Mouse' : `Product Item - Series 0${i + 1}`, 
    hsn: '8471', 
    qty: i === 0 ? 2 : 1, 
    mrp: 9500.00 + (i * 1200),
    price: 8500.00 + (i * 1000), 
    discount: 50.00, 
    gstAmt: 425.00, 
    gstPct: 18, 
    total: 8500.00 * (i === 0 ? 2 : 1) + 425.00
  })) : (items || []).map((i: any) => ({
    name: i.product_name,
    hsn: i.hsn_code || '-',
    qty: Number(i.quantity) || 0,
    mrp: Number(i.mrp_price) || Number(i.unit_price) || 0,
    price: Number(i.unit_price) || 0,
    discount: Number(i.discount_amount) || 0,
    gstAmt: Number(i.tax_amount) || 0,
    gstPct: 0,
    total: Number(i.total_price) || 0
  }));

  const subTotal = isMock ? 45000.00 : (Number(bill?.subtotal) || 0);
  const totalDisc = isMock ? 250.00 : (Number(bill?.discount_amount) || 0);
  const totalTax = isMock ? 8100.00 : (Number(bill?.tax_amount) || 0);
  const grandTotal = isMock ? 52850.00 : (Number(bill?.total_amount) || 0);

  const amtReceived = isMock ? 50000.00 : 0;
  const amtBalance = isMock ? 2850.00 : grandTotal;

  // --- Setting Resolvers ---
  const companyName = s?.print_company_name_text || s?.business_name || 'My Company';
  const phone = s?.phone || '9625507147';
  const address = s?.address || 'Plot No. 1, Shop No. 8, Koramangala, Banglore';
  const email = s?.email || '';
  const docTitle = s?.invoice_title || 'TAX INVOICE';
  const gstNumber = s?.gst_number || '29AABBCCDD1234E';

  const showAddr = s?.print_show_address ?? true;
  const showPhone = s?.print_show_phone ?? true;
  const showTaxMode = s?.print_tax_details ?? true;
  const showYouSaved = s?.print_you_saved ?? true;
  const showWords = s?.print_amount_words ?? true;
  const showReceived = s?.print_received_amount ?? true;
  const showBalanceMode = s?.print_balance_amount ?? true;
  const showTerms = (s?.print_terms_conditions || '').trim().length > 0;
  const sigText = s?.print_signature_text || 'Authorized Signatory';
  const showEmail = s?.print_show_email ?? true;
  const showGstin = s?.print_show_gstin ?? true;
  
  const showCurrency = s?.print_show_currency ?? true;
  const currSym = showCurrency ? '₹ ' : '';
  const fmt = (n: number) => showCurrency ? `${currSym}${Number(n).toFixed(2)}` : `${Math.round(n)}`;

  const primaryColor = s?.print_primary_color || '#242B3E';
  const secondaryColor = s?.print_secondary_color || '#E96020';
  const primaryText = getContrastColor(primaryColor);
  const secondaryText = getContrastColor(secondaryColor);

  const showCopyInfo = s?.print_original_duplicate ?? true;
  const copyLabelOverride = (s as any)?._forceCopyLabel;
  const copyLabel = showCopyInfo ? (copyLabelOverride || (s?.print_copy_original ? 'ORIGINAL FOR RECIPIENT' : 'DUPLICATE')) : '';

  const showHash = s?.print_show_item_number ?? true;
  const showHsn = s?.print_show_hsn_sac ?? true;
  const showQty = s?.print_show_quantity ?? true;
  const showPrice = s?.print_show_price_unit ?? true;
  const showDisc = s?.print_show_discount ?? true;
  const showTaxAmt = s?.print_show_gst ?? true;

  const showBank = s?.print_bank_details ?? true;
  const marginTopPx = (s?.print_extra_space_top || 0) * 3.77;

  // If isPreview, container uses padding so it looks like a paper on screen. 
  // In print mode, @page handles margins.
  const containerPad = isPreview ? '32px 32px' : '0';

  // Transport details (hardcoded mocks for representation, you could map this to extra bill fields if available)
  const transportName = isMock ? 'FastTrack Logistics' : '';
  const vehicleNo = isMock ? 'KA-01-AB-1234' : '';
  const deliveryDate = isMock ? '19-03-2026' : '';
  const hasTransport = transportName || vehicleNo || deliveryDate;

  return (
    <div className="urban-template-root" style={{
      background: '#fff',
      color: '#111827',
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
      fontSize: '10px',
      lineHeight: 1.4,
      padding: containerPad,
      paddingTop: isPreview ? `${32 + marginTopPx}px` : `${marginTopPx}px`,
      position: 'relative',
      boxSizing: 'border-box',
      width: '100%',
      minHeight: '100%',
      // Defining custom properties for use in CSS/inline styles
      ['--urban-primary' as any]: primaryColor,
      ['--urban-primary-text' as any]: primaryText,
      ['--urban-secondary' as any]: secondaryColor,
      ['--urban-secondary-text' as any]: secondaryText,
    }}>

      {/* Embedded CSS for styling complex pseudoelements or responsive aspects */}
      <style>{`
        .urban-template-root {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        .urban-card {
          border: 1px solid #E5E7EB;
          border-radius: 8px;
          overflow: hidden;
        }
        .urban-table th {
          background-color: var(--urban-primary) !important;
          color: var(--urban-primary-text) !important;
          font-weight: 600;
          text-transform: uppercase;
          font-size: 8.5px;
          letter-spacing: 0.05em;
          padding: 8px 10px;
          border-right: 1px solid rgba(255,255,255,0.1);
        }
        .urban-table th:last-child {
          border-right: none;
        }
        .urban-table td {
          padding: 8px 10px;
          border-bottom: 1px solid #E5E7EB;
          border-right: 1px solid #F3F4F6;
          vertical-align: top;
        }
        .urban-table tr:last-child td {
          border-bottom: none;
        }
        .urban-table td:last-child {
          border-right: none;
        }
        .urban-total-row td {
          background-color: #F8FAFC !important;
          font-weight: 700;
          color: #111827;
          border-top: 2px solid var(--urban-secondary) !important;
        }
        .urban-summary-row {
          display: flex;
          justify-content: space-between;
          padding: 6px 12px;
          border-bottom: 1px solid #F1F5F9;
        }
        .urban-summary-label {
          color: #475569;
        }
        .urban-summary-val {
          font-weight: 600;
        }
        .urban-header-shape {
          background-color: var(--urban-primary);
          color: var(--urban-primary-text);
          border-bottom-right-radius: 40px;
          padding: 24px;
        }
      `}</style>

      {/* Copy Label */}
      {showCopyInfo && (
        <div style={{ position: 'absolute', top: isPreview ? `${12 + marginTopPx}px` : `${marginTopPx}px`, right: isPreview ? '32px' : '0', fontSize: '9px', fontWeight: 600, color: '#6B7280', letterSpacing: '0.05em' }}>
          {copyLabel}
        </div>
      )}

      {/* 
        ====================================================
        A. HEADER SECTION
        ====================================================
      */}
      <div style={{ display: 'flex', gap: '24px', marginBottom: '24px', alignItems: 'stretch' }}>
        {/* Left Side: Dark Block with Logo/Company */}
        {(s?.print_company_name ?? true) && (
          <div className="urban-header-shape" style={{ flex: '0 0 auto', minWidth: '220px', maxWidth: '300px' }}>
            {s?.print_company_logo && s?.logo_url && (
              <img src={s.logo_url} alt="Logo" style={{ maxHeight: '50px', maxWidth: '120px', marginBottom: '12px', borderRadius: '4px', backgroundColor: '#fff', padding: '4px' }} />
            )}
            <div style={{ fontSize: '20px', fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.2 }}>
              {companyName}
            </div>
            {showGstin && s?.gst_number && (
              <div style={{ fontSize: '9px', opacity: 0.85, marginTop: '4px', letterSpacing: '0.02em' }}>GSTIN: {gstNumber}</div>
            )}
            <div style={{ marginTop: '12px', fontSize: '9px', opacity: 0.9, lineHeight: 1.5 }}>
              {showAddr && address && <div>{address}</div>}
              {showEmail && email && <div style={{ marginTop: '2px' }}>{email}</div>}
            </div>
          </div>
        )}

        {/* Right Side: Contact Capsule & Title */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'space-between', paddingTop: '10px' }}>
          
          {/* Top Contact Capsule uses Secondary Color */}
          {showPhone && (
            <div style={{
              backgroundColor: secondaryColor,
              color: secondaryText,
              padding: '6px 16px',
              borderRadius: '20px',
              fontSize: '11px',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }}>
              <span style={{ fontSize: '12px' }}>📞</span> {phone}
            </div>
          )}

          {/* Large Title */}
          <div style={{
            fontSize: '32px',
            fontWeight: 900,
            color: primaryColor,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginTop: 'auto',
            marginBottom: '8px'
          }}>
            {docTitle}
          </div>
        </div>
      </div>

      {/* 
        ====================================================
        B. BUSINESS DETAILS SECTION (3 Columns)
        ====================================================
      */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 1fr) minmax(0, 1fr)', gap: '16px', marginBottom: '24px' }}>
        
        {/* Col 1: Bill To */}
        <div className="urban-card" style={{ padding: '12px' }}>
          <div style={{ color: secondaryColor, fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
            Bill To
          </div>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#111827', marginBottom: '4px' }}>{custName}</div>
          <div style={{ color: '#4B5563', lineHeight: 1.5 }}>
            {showAddr && custAddr && <div>{custAddr}</div>}
            {custState && <div>State: {custState}</div>}
            {showPhone && custPhone && <div style={{ marginTop: '2px' }}>Phone: <span style={{ fontWeight: 600, color: '#374151' }}>{custPhone}</span></div>}
            {custGstin && <div style={{ marginTop: '2px' }}>GSTIN: <span style={{ fontWeight: 600, color: '#374151' }}>{custGstin}</span></div>}
          </div>
        </div>

        {/* Col 2: Transportation */}
        <div className="urban-card" style={{ padding: '12px', opacity: hasTransport ? 1 : 0.6 }}>
          <div style={{ color: secondaryColor, fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
            Transportation Details
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', color: '#4B5563' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Transport:</span> <span style={{ fontWeight: 600, color: '#111827' }}>{transportName || '-'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Vehicle No:</span> <span style={{ fontWeight: 600, color: '#111827' }}>{vehicleNo || '-'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Delivery Date:</span> <span style={{ fontWeight: 600, color: '#111827' }}>{deliveryDate || '-'}</span>
            </div>
          </div>
        </div>

        {/* Col 3: Invoice Info */}
        <div className="urban-card" style={{ padding: '12px', backgroundColor: '#F8FAFC', borderColor: '#E2E8F0' }}>
          <div style={{ color: secondaryColor, fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
            Invoice Info
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', color: '#4B5563' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Invoice No:</span> <span style={{ fontWeight: 700, color: '#111827' }}>{bNumber}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Date:</span> <span style={{ fontWeight: 600, color: '#111827' }}>{bDate}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Time:</span> <span style={{ fontWeight: 600, color: '#111827' }}>{bTime}</span>
            </div>
          </div>
        </div>

      </div>

      {/* 
        ====================================================
        C. ITEM TABLE
        ====================================================
      */}
      <div className="urban-card" style={{ marginBottom: '24px' }}>
        <table className="urban-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr>
              {showHash && <th style={{ width: '4%' }}>#</th>}
              <th style={{ width: '35%' }}>Item Description</th>
              {showHsn && <th style={{ textAlign: 'center' }}>HSN/SAC</th>}
              {showQty && <th style={{ textAlign: 'center' }}>Qty</th>}
              {showPrice && <th style={{ textAlign: 'right' }}>Price</th>}
              {showDisc && <th style={{ textAlign: 'right' }}>Disc.</th>}
              {showTaxAmt && <th style={{ textAlign: 'right' }}>Tax</th>}
              <th style={{ textAlign: 'right' }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {dataItems.map((item, idx) => (
              <tr key={idx}>
                {showHash && <td style={{ color: '#6B7280' }}>{idx + 1}</td>}
                <td style={{ fontWeight: 600, color: '#1F2937' }}>{item.name}</td>
                {showHsn && <td style={{ textAlign: 'center', color: '#4B5563' }}>{item.hsn}</td>}
                {showQty && <td style={{ textAlign: 'center', fontWeight: 600 }}>{item.qty}</td>}
                {showPrice && <td style={{ textAlign: 'right', color: '#4B5563' }}>{fmt(item.price)}</td>}
                {showDisc && <td style={{ textAlign: 'right', color: '#EF4444' }}>{item.discount > 0 ? `-${fmt(item.discount)}` : '-'}</td>}
                {showTaxAmt && <td style={{ textAlign: 'right', color: '#4B5563' }}>{item.gstAmt > 0 ? fmt(item.gstAmt) : '-'}</td>}
                <td style={{ textAlign: 'right', fontWeight: 700, color: '#111827' }}>{fmt(item.total)}</td>
              </tr>
            ))}
            
            {/* Table Bottom Total Row */}
            <tr className="urban-total-row">
              <td colSpan={1 + (showHash ? 1 : 0) + (showHsn ? 1 : 0)} style={{ textTransform: 'uppercase', fontSize: '10px' }}>
                Total Items
              </td>
              {showQty && <td style={{ textAlign: 'center', fontSize: '11px' }}>{dataItems.reduce((acc, i) => acc + i.qty, 0)}</td>}
              {showPrice && <td></td>}
              {showDisc && <td style={{ textAlign: 'right', color: '#EF4444' }}>{totalDisc > 0 ? `-${fmt(totalDisc)}` : '-'}</td>}
              {showTaxAmt && <td style={{ textAlign: 'right' }}>{totalTax > 0 ? fmt(totalTax) : '-'}</td>}
              <td style={{ textAlign: 'right', fontSize: '12px' }}>{fmt(grandTotal)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 
        ====================================================
        D. BOTTOM SPLIT LAYOUT
        ====================================================
      */}
      <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start', pageBreakInside: 'avoid' }}>
        
        {/* Left Column: QR, Pay To, Words, Terms, Signature */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Amount in words */}
          {showWords && (
            <div>
              <div style={{ color: primaryColor, fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px' }}>
                Invoice Amount In Words
              </div>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#374151' }}>
                Fifty Two Thousand Eight Hundred and Fifty Only
              </div>
            </div>
          )}

          {/* QR and Bank Details Box */}
          {showBank && (
            <div style={{ display: 'flex', gap: '16px', background: '#F8FAFC', padding: '16px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
              
              {/* QR Code */}
              {(s?.print_upi_qr ?? true) && s?.upi_id && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                  <div style={{ background: '#fff', padding: '6px', borderRadius: '6px', border: '1px solid #CBD5E1', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                    <QRCodeSVG value={`upi://pay?pa=${s.upi_id}&pn=${encodeURIComponent(companyName)}&am=${grandTotal}&cu=INR`} size={64} />
                  </div>
                  {(s?.print_pay_now_btn ?? true) && (
                    <div style={{ 
                      backgroundColor: secondaryColor, color: secondaryText, fontSize: '8px', fontWeight: 800, 
                      padding: '4px 12px', borderRadius: '12px', letterSpacing: '0.05em'
                    }}>
                      SCAN TO PAY
                    </div>
                  )}
                </div>
              )}

              {/* Pay To */}
              <div style={{ flex: 1 }}>
                <div style={{ color: primaryColor, fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
                  Bank Details & Pay To
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '10px', color: '#4B5563' }}>
                  <div style={{ display: 'flex' }}><span style={{ width: '80px' }}>Bank Name:</span> <strong style={{ color: '#111827' }}>{s?.print_bank_name || 'HDFC Bank Ltd.'}</strong></div>
                  <div style={{ display: 'flex' }}><span style={{ width: '80px' }}>Account No:</span> <strong style={{ color: '#111827' }}>{s?.print_bank_account || '50200012345678'}</strong></div>
                  <div style={{ display: 'flex' }}><span style={{ width: '80px' }}>IFSC Code:</span> <strong style={{ color: '#111827' }}>{s?.print_bank_ifsc || 'HDFC0001234'}</strong></div>
                </div>
              </div>
            </div>
          )}

          {/* Terms and Conditions */}
          {showTerms && (
            <div style={{ marginTop: '4px' }}>
              <div style={{ color: primaryColor, fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                Terms & Conditions
              </div>
              <div style={{ fontSize: '9px', color: '#6B7280', whiteSpace: 'pre-line', lineHeight: 1.5 }}>
                {s?.print_terms_conditions || '1. Goods once sold will not be taken back.\n2. Subject to local jurisdiction.\n3. E.& O.E.'}
              </div>
            </div>
          )}

          {/* Signature Space */}
          <div style={{ marginTop: '32px', display: 'flex', flexDirection: 'column', width: '200px' }}>
            <div style={{ fontSize: '9px', color: '#6B7280', marginBottom: '36px' }}>For : <span style={{ fontWeight: 700, color: '#111827' }}>{companyName}</span></div>
            <div style={{ borderBottom: '1px solid #94A3B8', marginBottom: '6px' }}></div>
            <div style={{ fontSize: '9.5px', fontWeight: 700, color: '#374151', textAlign: 'center' }}>{sigText}</div>
          </div>

        </div>

        {/* Right Column: Summary Panel */}
        <div style={{ flex: '0 0 280px' }}>
          <div className="urban-card" style={{ overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
            
            <div className="urban-summary-row">
              <span className="urban-summary-label">Sub Total</span>
              <span className="urban-summary-val">{fmt(subTotal)}</span>
            </div>
            
            {totalDisc > 0 && (
              <div className="urban-summary-row" style={{ color: '#EF4444' }}>
                <span className="urban-summary-label" style={{ color: '#EF4444' }}>Total Discount</span>
                <span className="urban-summary-val">-{fmt(totalDisc)}</span>
              </div>
            )}
            
            {showTaxMode && totalTax > 0 && (
              <div className="urban-summary-row">
                <span className="urban-summary-label">Total Tax</span>
                <span className="urban-summary-val">{fmt(totalTax)}</span>
              </div>
            )}
            
            {/* The grand total highlighted dramatically */}
            <div style={{ 
              display: 'flex', justifyContent: 'space-between', padding: '14px 16px', 
              backgroundColor: primaryColor, color: primaryText,
              alignItems: 'center'
            }}>
              <span style={{ fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Grand Total</span>
              <span style={{ fontSize: '18px', fontWeight: 800 }}>{fmt(grandTotal)}</span>
            </div>

            {/* Received & Balance inside the box below the total */}
            {(showReceived || showBalanceMode || showYouSaved) && (
              <div style={{ background: '#F8FAFC', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {showReceived && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px' }}>
                    <span style={{ color: '#6B7280' }}>Received</span>
                    <span style={{ fontWeight: 700, color: '#10B981' }}>{fmt(amtReceived)}</span>
                  </div>
                )}
                {showBalanceMode && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px' }}>
                    <span style={{ color: '#6B7280' }}>Balance Due</span>
                    <span style={{ fontWeight: 700, color: '#EF4444' }}>{fmt(amtBalance)}</span>
                  </div>
                )}
                {showYouSaved && totalDisc > 0 && (
                  <div style={{ 
                    marginTop: '8px', 
                    background: '#DCFCE7', 
                    color: '#166534', 
                    padding: '6px', 
                    borderRadius: '4px', 
                    textAlign: 'center', 
                    fontSize: '9.5px', 
                    fontWeight: 700,
                    border: '1px dashed #BBF7D0'
                  }}>
                    🎉 You Saved {fmt(totalDisc)}!
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
