import React from 'react';
import { createRoot } from 'react-dom/client';
import { InvoiceTemplate } from './InvoiceTemplate';
import { ThermalTemplate } from './ThermalTemplate';

// Inject once: @media print CSS that hides everything except the mobile overlay
function ensureMobilePrintStyles() {
  if (document.getElementById('spos-mobile-print-styles')) return;
  const style = document.createElement('style');
  style.id = 'spos-mobile-print-styles';
  style.textContent = `
    @media print {
      body > *:not(#spos-mobile-invoice-overlay) { display: none !important; }
      #spos-mobile-invoice-overlay { position: static !important; }
      #spos-mobile-invoice-topbar { display: none !important; }
    }
  `;
  document.head.appendChild(style);
}

function showMobileInvoiceOverlay(bill: Bill, items: BillItem[], settings?: any) {
  ensureMobilePrintStyles();

  // Remove any existing overlay
  document.getElementById('spos-mobile-invoice-overlay')?.remove();

  // ── Outer overlay ──
  const overlay = document.createElement('div');
  overlay.id = 'spos-mobile-invoice-overlay';
  overlay.style.cssText = `
    position: fixed; top: 0; left: 0; right: 0; bottom: 0;
    background: #f9fafb; z-index: 99999; overflow-y: auto;
    display: flex; flex-direction: column; font-family: system-ui, sans-serif;
  `;

  // ── Top action bar ──
  const topBar = document.createElement('div');
  topBar.id = 'spos-mobile-invoice-topbar';
  topBar.style.cssText = `
    position: sticky; top: 0; background: #1e293b; z-index: 1;
    display: flex; align-items: center; justify-content: space-between;
    padding: 12px 16px; gap: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.3);
  `;

  const titleEl = document.createElement('span');
  titleEl.textContent = `Invoice #${bill.bill_number}`;
  titleEl.style.cssText = 'font-weight: 700; font-size: 16px; color: #fff; flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;';

  const btnStyle = (bg: string, color = '#fff') => `
    background: ${bg}; color: ${color}; border: none; border-radius: 8px;
    padding: 9px 16px; font-size: 13px; font-weight: 600; cursor: pointer;
    display: flex; align-items: center; gap: 6px; white-space: nowrap;
    font-family: system-ui, sans-serif;
  `;

  // Share button  
  const shareBtn = document.createElement('button');
  shareBtn.innerHTML = '&#128228; Share';
  shareBtn.setAttribute('style', btnStyle('#2563eb'));
  shareBtn.onclick = async () => {
    try {
      // Build a plain-text version for the share sheet
      const lines: string[] = [];
      lines.push(`Invoice #${bill.bill_number}`);
      lines.push(`Date: ${new Date(bill.created_at).toLocaleString()}`);
      if (bill.customers?.name) lines.push(`Customer: ${bill.customers.name}`);
      lines.push('');
      items.forEach(i => lines.push(`${i.product_name}  x${i.quantity}  ₹${Number(i.total_price).toFixed(2)}`));
      lines.push('');
      if (Number(bill.discount_amount) > 0) lines.push(`Discount: -₹${Number(bill.discount_amount).toFixed(2)}`);
      if (Number(bill.tax_amount) > 0) lines.push(`Tax: ₹${Number(bill.tax_amount).toFixed(2)}`);
      lines.push(`Total: ₹${Number(bill.total_amount).toFixed(2)}`);
      lines.push('');
      if (settings?.business_name) lines.push(settings.business_name);
      if (settings?.phone) lines.push(settings.phone);

      if (navigator.share) {
        await navigator.share({ title: `Invoice #${bill.bill_number}`, text: lines.join('\n') });
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard?.writeText(lines.join('\n'));
        alert('Invoice text copied to clipboard!');
      }
    } catch (e: any) {
      if (e?.name !== 'AbortError') console.error('Share failed:', e);
    }
  };

  // Print button
  const printBtn = document.createElement('button');
  printBtn.innerHTML = '&#128424; Print';
  printBtn.setAttribute('style', btnStyle('#475569'));
  printBtn.onclick = () => {
    setTimeout(() => window.print(), 100);
  };

  // Close / Back button
  const closeBtn = document.createElement('button');
  closeBtn.innerHTML = '&#8592; Back';
  closeBtn.setAttribute('style', btnStyle('#ef4444'));
  closeBtn.onclick = () => overlay.remove();

  topBar.appendChild(closeBtn);
  topBar.appendChild(titleEl);
  topBar.appendChild(shareBtn);
  topBar.appendChild(printBtn);

  // ── Invoice content ──
  const contentDiv = document.createElement('div');
  contentDiv.style.cssText = 'flex: 1; padding: 12px; background: white; margin: 12px; border-radius: 8px; box-shadow: 0 1px 4px rgba(0,0,0,0.1);';

  overlay.appendChild(topBar);
  overlay.appendChild(contentDiv);
  document.body.appendChild(overlay);

  // Render React invoice component into the overlay
  const root = createRoot(contentDiv);
  const isThermal = settings?.print_thermal_default ?? false;
  if (isThermal) {
    root.render(<ThermalTemplate bill={bill} items={items} settings={settings} isPreview={false} />);
  } else {
    root.render(<InvoiceTemplate bill={bill} items={items} settings={settings} isPreview={false} />);
  }
}


export interface BillItem {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  cost_price: number;
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

export function printBillReceipt(bill: Bill, items: BillItem[], settings?: any) {
  // ── MOBILE (Capacitor Android/iOS): show in-app overlay ──
  const isNative = !!(window as any).Capacitor?.isNativePlatform?.();
  if (isNative) {
    showMobileInvoiceOverlay(bill, items, settings);
    return;
  }

  // ── WEB: open popup window and print ──
  const printWindow = window.open('', '_blank', 'width=800,height=900');
  if (!printWindow) {
    alert('Please allow popups for this website to print invoices.');
    return;
  }

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Print Invoice - ${bill.bill_number}</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,700;1,600&display=swap" rel="stylesheet">
        <style>
          body { 
            margin: 0; 
            padding: 0; 
            background: #fff; 
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          @page {
            margin: 5mm; 
          }
          /* Ensure backgrounds print correctly */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          /* ===== COMPACT TABLE STYLES ===== */
          .invoice-template-root table tbody tr td {
            padding: 2px 6px !important;
            font-size: 9px !important;
            line-height: 1.25 !important;
          }
          .invoice-template-root table thead tr th {
            padding: 4px 6px !important;
            font-size: 8px !important;
          }
          .invoice-template-root table tbody tr:last-child td {
            padding: 4px 6px !important;
          }

          /* ===== NATURAL PRINT FLOW ===== */
          /* Repeat table headers on every printed page */
          .invoice-template-root table thead {
            display: table-header-group;
          }
          /* Individual table rows should not split */
          .invoice-template-root table tbody tr {
            page-break-inside: avoid;
            break-inside: avoid;
          }
          /* Container allows natural page flow — NO forced breaks */
          .invoice-template-root {
            page-break-inside: auto !important;
            break-inside: auto !important;
          }

          /* General print resets */
          @media print {
            .invoice-template-root {
              padding: 0 !important;
            }
          }

          /* ===== URBAN BILL STYLE — COMPACT PRINT ===== */
          .urban-template-root table tbody tr td {
            padding: 3px 6px !important;
            font-size: 8.5px !important;
            line-height: 1.2 !important;
          }
          .urban-template-root table thead tr th {
            padding: 4px 6px !important;
            font-size: 7.5px !important;
          }
          .urban-template-root table tbody tr:last-child td {
            padding: 4px 6px !important;
          }
          .urban-template-root table thead {
            display: table-header-group;
          }
          .urban-template-root table tbody tr {
            page-break-inside: avoid;
            break-inside: avoid;
          }
          .urban-template-root {
            page-break-inside: auto !important;
            break-inside: auto !important;
          }
          .urban-footer-block {
            break-inside: avoid;
            page-break-inside: avoid;
          }
          @media print {
            .urban-template-root {
              padding: 0 !important;
            }
          }
        </style>
      </head>
      <body>
        <div id="print-root"></div>
      </body>
    </html>
  `;

  // Write HTML to the new popup window
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();

  // Wait briefly for the DOM to become interactive, then mount the React root
  const checkReady = setInterval(() => {
    const rootEl = printWindow.document.getElementById('print-root');
    if (rootEl) {
      clearInterval(checkReady);
      const root = createRoot(rootEl);
      
      // Determine how many pages to render based on copy settings
      const copies = settings?.print_original_duplicate ? [
        settings?.print_copy_original ?? true ? 'ORIGINAL FOR RECIPIENT' : null,
        settings?.print_copy_duplicate ?? true ? 'DUPLICATE FOR TRANSPORTER' : null,
        settings?.print_copy_triplicate ?? true ? 'TRIPLICATE FOR SUPPLIER' : null
      ].filter(Boolean) : [null];
      
      const finalCopies = copies.length > 0 ? copies : [null];

      // Thermal prints typically only print 1 copy by default unless multiplied
      const isThermal = settings?.print_thermal_default ?? false;
      const thermalCopiesCount = settings?.print_thermal_copies ?? 1;
      const thermalCopiesArray = Array.from({ length: thermalCopiesCount });

      // Render our new unified InvoiceTemplate components with page breaks
      root.render(
        <React.Fragment>
          {isThermal ? (
            thermalCopiesArray.map((_, idx) => (
              <div key={idx} style={{ pageBreakAfter: idx < thermalCopiesArray.length - 1 ? 'always' : 'auto' }}>
                <ThermalTemplate 
                  bill={bill} 
                  items={items} 
                  settings={settings} 
                  isPreview={false}
                />
              </div>
            ))
          ) : (
            finalCopies.map((label, idx) => (
              <div key={idx} style={{ pageBreakAfter: idx < finalCopies.length - 1 ? 'always' : 'auto' }}>
                <InvoiceTemplate 
                  bill={bill} 
                  items={items} 
                  settings={{ ...settings, _forceCopyLabel: label }} 
                  isPreview={false}
                />
              </div>
            ))
          )}
        </React.Fragment>
      );

      // Trigger print after rendering and fonts have loaded
      setTimeout(() => {
        printWindow.focus();
        printWindow.print();
        // Setup an event hook to close the window after printing (works in some browsers)
        printWindow.onafterprint = () => printWindow.close();
      }, 750);
    }
  }, 50);
}
