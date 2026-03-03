import React from 'react';
import { format } from 'date-fns';

interface BillItem {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  cost_price: number;
  mrp_price?: number;
  items_per_case?: number;
}

interface Bill {
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

interface BusinessSettings {
  business_name?: string;
  address?: string;
  phone?: string;
  email?: string;
  currency_symbol?: string;
  tax_name?: string;
  invoice_style?: 'classic' | 'modern' | 'detailed';
  invoice_font_size?: number;
  invoice_spacing?: number;
  invoice_show_borders?: boolean;
  invoice_show_item_price?: boolean;
  invoice_footer_message?: string | null;
  invoice_footer_font_size?: number;
  invoice_header_align?: 'left' | 'center' | 'right';
  invoice_show_business_phone?: boolean;
  invoice_show_business_email?: boolean;
  invoice_show_business_address?: boolean;
  invoice_terms_conditions?: string | null;
  invoice_paper_width?: '58mm' | '80mm' | 'A4' | 'A5';
  invoice_show_qr_code?: boolean;
  upi_id?: string | null;
  gst_number?: string | null;
  invoice_show_gst?: boolean;
  invoice_show_unit_price?: boolean;
  invoice_title?: string;
  invoice_border_top?: boolean;
  invoice_border_bottom?: boolean;
  invoice_border_left?: boolean;
  invoice_border_right?: boolean;
  invoice_border_inner_v?: boolean;
  invoice_border_inner_h?: boolean;
}

interface BillReceiptPrintProps {
  bill: Bill;
  items: BillItem[];
  settings?: BusinessSettings | null;
  onPrintComplete?: () => void;
}

export function printBillReceipt(
  bill: Bill,
  items: BillItem[],
  settings?: BusinessSettings | null
) {
  const currencySymbol = settings?.currency_symbol || '₹';
  const style = settings?.invoice_style || 'classic';
  const fontSize = settings?.invoice_font_size || 12;
  const spacing = settings?.invoice_spacing || 4;
  const showBorders = settings?.invoice_show_borders !== false;
  const paperWidth = settings?.invoice_paper_width || '80mm';
  const headerAlign = settings?.invoice_header_align || 'center';
  const footerFontSize = settings?.invoice_footer_font_size || 10;

  const invoiceTitle = settings?.invoice_title !== undefined ? settings?.invoice_title : 'ESTIMATE';
  const borderTop = settings?.invoice_border_top ?? true;
  const borderBottom = settings?.invoice_border_bottom ?? true;
  const borderLeft = settings?.invoice_border_left ?? true;
  const borderRight = settings?.invoice_border_right ?? true;
  const borderInnerV = settings?.invoice_border_inner_v ?? true;
  const borderInnerH = settings?.invoice_border_inner_h ?? true;
  const borderWholeBill = (settings as any)?.invoice_border_whole_bill ?? false;
  const outerBorderMargin = (settings as any)?.invoice_margin ?? 0;
  const outerBorderPadding = (settings as any)?.invoice_padding ?? 20;
  const showCaseCol = (settings as any)?.invoice_show_case !== false;

  const qrPosition = (settings as any)?.invoice_qr_position || 'bottom-center';
  const qrSizeSetting = (settings as any)?.invoice_qr_size || 'medium';

  const widthStyle = paperWidth === '58mm' ? '240px' : (paperWidth === 'A4' || paperWidth === 'A5') ? '100%' : '380px';
  const maxWidthStyle = paperWidth === 'A4' ? '794px' : paperWidth === 'A5' ? '560px' : widthStyle;

  const isGridFormat = paperWidth === 'A5' || paperWidth === 'A4';

  let qrSize = 100;
  if (qrSizeSetting === 'small') qrSize = 60;
  else if (qrSizeSetting === 'medium') qrSize = 80;
  else if (qrSizeSetting === 'large') qrSize = 140;
  if (!isGridFormat && qrSizeSetting === 'large') qrSize = 100; // Limit large size on small paper

  const generatedQR = (settings?.invoice_show_qr_code && settings?.upi_id) ? `
    <div class="qr-container" style="margin: 0 auto; text-align: center;">
      <img 
        src="https://api.qrserver.com/v1/create-qr-code/?size=${qrSize}x${qrSize}&data=${encodeURIComponent(`upi://pay?pa=${settings.upi_id}&pn=${settings.business_name || 'Business'}&am=${Number(bill.total_amount).toFixed(2)}&cu=INR`)}" 
        alt="Payment QR"
        style="width: ${qrSize}px; height: ${qrSize}px; border: 1px solid #ccc; padding: 3px; display: block; margin: 0 auto;"
      />
      <p style="font-size: 8px; color: #666; margin-top: 4px; line-height: 1;">Scan to Pay:<br/>${currencySymbol}${Number(bill.total_amount).toFixed(2)}</p>
    </div>
  ` : (settings?.invoice_show_qr_code ? `
    <div class="qr-placeholder" style="margin: 0 auto; width: ${qrSize}px; height: ${qrSize}px; border: 1px dashed #ccc; display: flex; align-items: center; justify-content: center; font-size: 8px; color: #999; text-align: center;">
      UPI ID<br/>NOT SET
    </div>
  ` : '');

  const sharedHeader = `
    <div class="header" style="text-align: ${headerAlign}; position: relative; min-height: ${(qrPosition === 'top-right' || qrPosition === 'top-left') && generatedQR ? qrSize + 20 : 0}px; border-bottom: none; padding-bottom: 5px;">
      ${(qrPosition === 'top-left' && generatedQR) ? `<div style="position: absolute; left: 0; top: 0;">${generatedQR}</div>` : ''}
      ${(qrPosition === 'top-right' && generatedQR) ? `<div style="position: absolute; right: 0; top: 0;">${generatedQR}</div>` : ''}
      <div style="${(qrPosition === 'top-left' && generatedQR) ? `padding-left: ${qrSize + 20}px;` : ''} ${(qrPosition === 'top-right' && generatedQR) ? `padding-right: ${qrSize + 20}px;` : ''}">
        ${invoiceTitle ? `<div class="business-name" style="font-size: ${isGridFormat ? fontSize + 8 : fontSize + 4}px; text-transform: uppercase; text-decoration: ${isGridFormat ? 'underline' : 'none'}; margin-bottom: ${isGridFormat ? '15px' : '8px'};">${invoiceTitle}</div>` : ''}
        <div class="business-name" style="font-size: ${fontSize + 6}px;">${settings?.business_name || 'Business'}</div>
        ${settings?.invoice_show_business_address !== false && settings?.address ? `<div class="business-info" style="${isGridFormat ? 'margin-top: 4px;' : ''}">${settings.address}</div>` : ''}
        <div class="business-info" style="${isGridFormat ? 'margin-top: 4px;' : ''}">
          ${settings?.invoice_show_business_phone !== false && settings?.phone ? `${isGridFormat ? 'Mobile' : 'Tel'}: ${settings.phone}` : ''}
          ${settings?.invoice_show_business_phone !== false && settings?.phone && settings?.invoice_show_business_email !== false && settings?.email ? (isGridFormat ? ' | ' : '<br/>') : ''}
          ${settings?.invoice_show_business_email !== false && settings?.email ? `${isGridFormat ? 'Email' : 'Email'}: ${settings.email}` : ''}
        </div>
        ${settings?.invoice_show_gst !== false && settings?.gst_number ? `<div class="business-info" style="${isGridFormat ? 'margin-top: 4px;' : ''}">GSTIN: ${settings.gst_number}</div>` : ''}
      </div>
    </div>
  `;

  const receiptHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Bill #${bill.bill_number}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: ${style === 'modern' ? "'Inter', sans-serif" : "'Courier New', monospace"};
          width: ${widthStyle};
          max-width: ${maxWidthStyle};
          margin: ${paperWidth === 'A4' ? '0 auto' : '0'};
          padding: ${paperWidth === 'A4' ? '40px' : '15px'};
          font-size: ${fontSize}px;
          line-height: 1.4;
          color: #1a1a1a;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .header { 
          text-align: ${headerAlign}; 
          margin-bottom: 20px; 
          border-bottom: ${showBorders ? '1px dashed #000' : 'none'}; 
          padding-bottom: 15px; 
        }
        .business-name { 
          font-size: ${fontSize + 6}px; 
          font-weight: bold; 
          margin-bottom: 5px; 
          color: ${style === 'modern' ? '#3b82f6' : '#000'};
        }
        .business-info { font-size: ${fontSize - 2}px; color: #4b5563; }
        
        .bill-info { 
          margin: 15px 0; 
          padding: 10px; 
          border-top: ${showBorders ? '1px dashed #000' : 'none'};
          border-bottom: ${showBorders ? '1px dashed #000' : 'none'};
          background: #f9fafb;
        }
        .bill-info-row { display: flex; justify-content: space-between; margin: ${spacing}px 0; }
        
        .items-header { 
          display: flex; 
          font-weight: bold; 
          border-bottom: 2px solid #000; 
          padding: 8px 0; 
          margin-bottom: 8px;
          text-transform: uppercase;
          font-size: ${fontSize - 1}px;
        }
        .item-row { 
          display: flex; 
          flex-wrap: wrap;
          padding: ${spacing}px 0; 
          border-bottom: ${style === 'detailed' ? '1px solid #e5e7eb' : 'none'};
        }
        .item-row:nth-child(even) {
          background-color: ${style === 'modern' ? '#f9fafb' : 'transparent'};
        }

        .totals { 
          border-top: 1px solid #000; 
          margin-top: 20px; 
          padding-top: 10px; 
        }
        .total-row { display: flex; justify-content: space-between; margin: 6px 0; }
        .grand-total { 
          font-size: ${fontSize + 4}px; 
          font-weight: bold; 
          border-top: 2px solid #000; 
          margin-top: 10px; 
          padding: 12px 0;
          background: ${style === 'modern' ? '#f3f4f6' : 'transparent'};
          padding: ${style === 'modern' ? '12px' : '15px 0'};
        }
        
        .footer { 
          text-align: ${headerAlign}; 
          margin-top: 30px; 
          padding-top: 15px; 
          border-top: ${showBorders ? '1px dashed #ccc' : 'none'}; 
        }
        .footer-msg { font-size: ${footerFontSize}px; font-weight: 500; margin-bottom: 5px; }
        .footer-print-date { font-size: ${fontSize - 3}px; color: #6b7280; margin-top: 5px; }
        .terms { font-size: ${fontSize - 3}px; color: #4b5563; margin-top: 15px; text-align: left; font-style: italic; }
        
        .qr-placeholder {
          margin: 15px auto;
          width: ${qrSize}px;
          height: ${qrSize}px;
          border: 1px dashed #ccc;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 8px;
          color: #999;
          text-align: center;
        }

        .a5-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 15px;
          margin-bottom: 15px;
          font-size: ${fontSize - 1}px;
          border-top: ${borderTop ? '1px solid #000' : 'none'};
          border-bottom: ${borderBottom ? '1px solid #000' : 'none'};
          border-left: ${borderLeft ? '1px solid #000' : 'none'};
          border-right: ${borderRight ? '1px solid #000' : 'none'};
        }
        .a5-table th, .a5-table td {
          border: none;
          ${borderInnerH ? 'border-top: 1px solid #000; border-bottom: 1px solid #000;' : ''}
          ${borderInnerV ? 'border-left: 1px solid #000; border-right: 1px solid #000;' : ''}
          padding: 6px 4px;
        }
        /* Reset outer borders so inner ones don't bleed */
        .a5-table th:first-child, .a5-table td:first-child { border-left: none; }
        .a5-table th:last-child, .a5-table td:last-child { border-right: none; }
        .a5-table tr:first-child th { border-top: none; }
        .a5-table tr:last-child td { border-bottom: none; }
        
        .a5-table th {
          font-weight: bold;
          text-align: center;
          background-color: #f9fafb;
          border-bottom: 2px solid #000 !important;
        }

        .receipt-outer-wrapper {
          border: ${borderWholeBill ? '2px solid #000' : 'none'};
          padding: ${borderWholeBill ? outerBorderPadding + 'px' : '0'};
          margin: ${borderWholeBill ? outerBorderMargin + 'px' : '0'};
          box-sizing: border-box;
          min-height: calc(95vh - ${borderWholeBill ? outerBorderMargin * 2 : 0}px);
        }

        @media print {
          body { width: 100%; border: none; padding: 0; margin: 0; }
          @page { margin: 0; }
        }
      </style>
      <script>
        window.onload = function() {
          var images = document.getElementsByTagName('img');
          var loaded = 0;
          var total = images.length;
          
          if (total === 0) {
            setTimeout(function() { window.print(); }, 800);
            return;
          }

          function checkAllLoaded() {
            loaded++;
            if (loaded >= total) {
              setTimeout(function() { window.print(); }, 1000);
            }
          }

          for (var i = 0; i < total; i++) {
            if (images[i].complete) {
              checkAllLoaded();
            } else {
              images[i].addEventListener('load', checkAllLoaded);
              images[i].addEventListener('error', checkAllLoaded);
            }
          }

          // Safety timeout
          setTimeout(function() {
            if (loaded < total) window.print();
          }, 3000);
        };
      </script>
    </head>
    <body>
      <div class="receipt-outer-wrapper">
      ${sharedHeader}
      ${isGridFormat ? `
        <div style="display: flex; justify-content: space-between; border: 1px solid #000; padding: 10px; margin-bottom: 0; border-bottom: none;">
          <div>
            <strong>M/s ${bill.customers?.name || 'Walk-in Customer'}</strong>
            <br/>ADD. ${bill.customers?.address || 'N/A'}
            <br/>MOB: ${bill.customers?.phone || 'N/A'}
          </div>
          <div style="text-align: right;">
            <div>Invoice No.: <strong>${bill.bill_number}</strong></div>
            <br/>
            <div>Date : ${format(new Date(bill.created_at), 'dd/MM/yyyy')}</div>
          </div>
        </div>
      ` : `
        <div class="bill-info">
          <div class="bill-info-row">
            <span>Bill #:</span>
            <strong>${bill.bill_number}</strong>
          </div>
          <div class="bill-info-row">
            <span>Date:</span>
            <span>${format(new Date(bill.created_at), 'dd/MM/yyyy HH:mm')}</span>
          </div>
          <div class="bill-info-row">
            <span>Customer:</span>
            <span>${bill.customers?.name || 'Walk-in Customer'}</span>
          </div>
          ${bill.customers?.phone ? `
          <div class="bill-info-row">
            <span>Phone:</span>
            <span>${bill.customers.phone}</span>
          </div>` : ''}
          ${bill.customers?.address ? `
          <div class="bill-info-row">
            <span>Address:</span>
            <span>${bill.customers.address}</span>
          </div>` : ''}
        </div>
      `}

      ${isGridFormat ? `
      <table class="a5-table" style="margin-top: 0;">
        <thead>
          <tr>
            <th style="width: 5%">S.</th>
            ${showCaseCol ? '<th style="width: 8%">CASE</th>' : ''}
            <th style="width: 8%">PCS</th>
            <th style="text-align: left; width: ${showCaseCol ? '43' : '51'}%">ITEM DESCRIPTION</th>
            <th style="width: 12%">M.R.P</th>
            <th style="width: 12%">RATE</th>
            <th style="width: 12%">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${items.map((item, idx) => `
            <tr>
              <td style="text-align: center;">${idx + 1}</td>
              ${showCaseCol ? `<td style="text-align: center;">${(item.items_per_case && item.items_per_case > 0) ? Number(item.quantity / item.items_per_case).toFixed(2) : '0.00'}</td>` : ''}
              <td style="text-align: center;">${Number(item.quantity).toFixed(2)}</td>
              <td>${item.product_name}</td>
              <td style="text-align: center;">${Number(item.mrp_price || item.unit_price).toFixed(2)}</td>
              <td style="text-align: center;">${Number(item.unit_price).toFixed(2)}</td>
              <td style="text-align: right;">${Number(item.total_price).toFixed(2)}</td>
            </tr>
          `).join('')}
          <tr>
            <td colspan="${showCaseCol ? '5' : '4'}" style="border-right: none; border-bottom: none; border-top: 1px solid #000;"></td>
            <td style="text-align: right; border-left: none; padding-right: 10px; border-top: 1px solid #000;">Subtotal:</td>
            <td style="text-align: right; border-top: 1px solid #000;">${currencySymbol}${Number(bill.subtotal).toFixed(2)}</td>
          </tr>
          ${Number(bill.discount_amount) > 0 ? `
            <tr style="color: #dc2626;">
              <td colspan="${showCaseCol ? '5' : '4'}" style="border-right: none; border-bottom: none; border-top: none;"></td>
              <td style="text-align: right; border-left: none; padding-right: 10px; border-top: none;">Discount:</td>
              <td style="text-align: right; border-top: none;">-${currencySymbol}${Number(bill.discount_amount).toFixed(2)}</td>
            </tr>
          ` : ''}
          ${Number(bill.tax_amount) > 0 ? `
            <tr>
              <td colspan="${showCaseCol ? '5' : '4'}" style="border-right: none; border-bottom: none; border-top: none;"></td>
              <td style="text-align: right; border-left: none; padding-right: 10px; border-top: none;">${settings?.tax_name || 'Tax'}:</td>
              <td style="text-align: right; border-top: none;">${currencySymbol}${Number(bill.tax_amount).toFixed(2)}</td>
            </tr>
          ` : ''}
          <tr>
            <td colspan="${showCaseCol ? '5' : '4'}" style="border-right: none; border-top: none;"></td>
            <td style="text-align: right; border-left: none; padding-right: 10px; font-weight: bold; border-top: none;">TOTAL:</td>
            <td style="text-align: right; font-weight: bold; font-size: ${fontSize + 2}px; border-top: none;">${currencySymbol}${Number(bill.total_amount).toFixed(2)}</td>
          </tr>
        </tbody>
      </table>
      ` : `
      <div class="items-header">
        <span style="flex: ${settings?.invoice_show_unit_price !== false ? '2' : '2.8'};">ITEM</span>
        ${settings?.invoice_show_unit_price !== false ? '<span style="flex: 0.8; text-align: right;">PRICE</span>' : ''}
        <span style="flex: 0.5; text-align: right;">QTY</span>
        <span style="flex: 1; text-align: right;">TOTAL</span>
      </div>
      
      <div class="items-container">
        ${items.map(item => `
          <div class="item-row" style="display: flex; align-items: flex-start; padding: ${spacing}px 0; font-size: ${fontSize - 1}px;">
            <div style="flex: ${settings?.invoice_show_unit_price !== false ? '2' : '2.8'}; overflow-wrap: break-word;">
              <div>${item.product_name}</div>
              ${settings?.invoice_show_item_price === true ? `
                <div style="font-size: ${fontSize - 3}px; color: #666;">
                  ${Number(item.unit_price).toFixed(0)} x ${item.quantity}
                </div>
              ` : ''}
            </div>
            ${settings?.invoice_show_unit_price !== false ? `<span style="flex: 0.8; text-align: right;">${Number(item.unit_price).toFixed(0)}</span>` : ''}
            <span style="flex: 0.5; text-align: right;">${item.quantity}</span>
            <span style="flex: 1; text-align: right;">${Number(item.total_price).toFixed(0)}</span>
          </div>
        `).join('')}
      </div>
      `}

      ${!isGridFormat ? `
      <div class="totals">
        <div class="total-row">
          <span>Subtotal:</span>
          <span>${currencySymbol}${Number(bill.subtotal).toFixed(2)}</span>
        </div>
        ${Number(bill.discount_amount) > 0 ? `
          <div class="total-row" style="color: #dc2626;">
            <span>Discount:</span>
            <span>-${currencySymbol}${Number(bill.discount_amount).toFixed(2)}</span>
          </div>
        ` : ''}
        ${Number(bill.tax_amount) > 0 ? `
          <div class="total-row">
            <span>${settings?.tax_name || 'Tax'}:</span>
            <span>${currencySymbol}${Number(bill.tax_amount).toFixed(2)}</span>
          </div>
        ` : ''}
        <div class="total-row grand-total">
          <span>TOTAL:</span>
          <span>${currencySymbol}${Number(bill.total_amount).toFixed(2)}</span>
        </div>
      </div>
      ` : ''}

      <div class="footer">
        <div class="footer-msg">
          ${settings?.invoice_footer_message || 'Thank you for your business!'}
        </div>
        
        ${settings?.invoice_terms_conditions ? `
          <div class="terms">
            <strong>T&C:</strong> ${settings.invoice_terms_conditions}
          </div>
        ` : ''}

        ${(qrPosition === 'bottom-left' || qrPosition === 'bottom-center' || qrPosition === 'bottom-right') && generatedQR ? `
          <div style="margin: 20px 0 10px 0; display: flex; justify-content: ${qrPosition === 'bottom-left' ? 'flex-start' : qrPosition === 'bottom-right' ? 'flex-end' : 'center'};">
            ${generatedQR}
          </div>
        ` : ''}

        <div class="footer-print-date">
          Printed on ${format(new Date(), 'dd/MM/yyyy HH:mm')}
        </div>
      </div>
      </div>
    </body>
    </html>
  `;

  const printWindow = window.open('', '_blank', 'width=500,height=700');
  if (printWindow) {
    printWindow.document.write(receiptHTML);
    printWindow.document.close();

    // Wait for content to load then focus
    setTimeout(() => {
      printWindow.focus();
    }, 250);
  }
}
