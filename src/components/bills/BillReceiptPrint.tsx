import React from 'react';
import { createRoot } from 'react-dom/client';
import { InvoiceTemplate } from './InvoiceTemplate';

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

          /* ===== SINGLE PAGE MODE (≤12 items) — AGGRESSIVE COMPACTION ===== */
          .single-page-invoice {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          /* Tighter table rows */
          .single-page-invoice table tbody tr td {
            padding: 2px 6px !important;
            font-size: 9px !important;
            line-height: 1.25 !important;
          }
          .single-page-invoice table thead tr th {
            padding: 4px 6px !important;
            font-size: 8px !important;
          }
          /* Tighter totals row */
          .single-page-invoice table tbody tr:last-child td {
            padding: 4px 6px !important;
          }
          /* Footer must NOT break */
          .single-page-invoice .invoice-footer-block {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          /* Shrink QR code in single page */
          .single-page-invoice .invoice-footer-block img,
          .single-page-invoice .invoice-footer-block svg {
            max-width: 44px !important;
            max-height: 44px !important;
          }

          /* ===== MULTI PAGE MODE (>12 items) ===== */
          .multi-page-invoice table thead {
            display: table-header-group;
          }
          .multi-page-invoice table tbody tr {
            page-break-inside: avoid;
            break-inside: avoid;
          }
          .multi-page-invoice .invoice-footer-block {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            page-break-before: auto;
          }

          /* General print resets */
          @media print {
            .invoice-template-root {
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

      // Render our new unified InvoiceTemplate components with page breaks
      root.render(
        <React.Fragment>
          {finalCopies.map((label, idx) => (
            <div key={idx} style={{ pageBreakAfter: idx < finalCopies.length - 1 ? 'always' : 'auto' }}>
              <InvoiceTemplate 
                bill={bill} 
                items={items} 
                settings={{ ...settings, _forceCopyLabel: label }} 
                isPreview={false}
              />
            </div>
          ))}
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
