import React from 'react';
import { format } from 'date-fns';

interface BillItem {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  cost_price: number;
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
  customers?: { name: string } | null;
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
  invoice_paper_width?: '58mm' | '80mm' | 'A4';
  invoice_show_qr_code?: boolean;
  upi_id?: string | null;
  gst_number?: string | null;
  invoice_show_gst?: boolean;
  invoice_show_unit_price?: boolean;
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

  const widthStyle = paperWidth === '58mm' ? '240px' : paperWidth === 'A4' ? '100%' : '380px';
  const maxWidthStyle = paperWidth === 'A4' ? '800px' : widthStyle;
  const qrSize = paperWidth === '58mm' ? 100 : 120;

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
          padding: 10px 0; 
          border-bottom: ${showBorders ? '1px dashed #000' : 'none'};
          background: ${style === 'detailed' ? '#f9fafb' : 'transparent'};
          padding: ${style === 'detailed' ? '10px' : '10px 0'};
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
          text-align: center; 
          margin-top: 30px; 
          padding-top: 15px; 
          border-top: ${showBorders ? '1px dashed #ccc' : 'none'}; 
        }
        .footer-msg { font-size: ${footerFontSize}px; font-weight: 500; margin-bottom: 5px; }
        .footer-print-date { font-size: ${fontSize - 3}px; color: #6b7280; margin-top: 5px; }
        .terms { font-size: ${fontSize - 3}px; color: #4b5563; margin-top: 15px; text-align: left; font-style: italic; }
        
        .qr-placeholder {
          margin: 15px auto;
          width: 80px;
          height: 80px;
          border: 1px dashed #ccc;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 8px;
          color: #999;
          text-align: center;
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
      <div class="header">
        <div class="business-name">${settings?.business_name || 'Business'}</div>
        ${settings?.invoice_show_business_address !== false && settings?.address ? `<div class="business-info">${settings.address}</div>` : ''}
        ${settings?.invoice_show_business_phone !== false && settings?.phone ? `<div class="business-info">Tel: ${settings.phone}</div>` : ''}
        ${settings?.invoice_show_business_email !== false && settings?.email ? `<div class="business-info">${settings.email}</div>` : ''}
        ${settings?.invoice_show_gst !== false && settings?.gst_number ? `<div class="business-info">GST: ${settings.gst_number}</div>` : ''}
      </div>

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
          <span>${bill.customers?.name || 'Walk-in'}</span>
        </div>
      </div>

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

      <div class="footer">
        <div class="footer-msg">
          ${settings?.invoice_footer_message || 'Thank you for your business!'}
        </div>
        
        ${settings?.invoice_terms_conditions ? `
          <div class="terms">
            <strong>T&C:</strong> ${settings.invoice_terms_conditions}
          </div>
        ` : ''}

        ${settings?.invoice_show_qr_code && settings?.upi_id ? `
          <div class="qr-container" style="margin: 15px auto; text-align: center; min-height: ${qrSize}px;">
            <img 
              src="https://api.qrserver.com/v1/create-qr-code/?size=${qrSize}x${qrSize}&data=${encodeURIComponent(`upi://pay?pa=${settings.upi_id}&pn=${settings.business_name || 'Business'}&am=${Number(bill.total_amount).toFixed(2)}&cu=INR`)}" 
              alt="Payment QR"
              style="width: ${qrSize}px; height: ${qrSize}px; border: 1px solid #eee; padding: 5px; display: block; margin: 0 auto;"
            />
            <p style="font-size: 8px; color: #666; margin-top: 4px;">Scan to Pay: ${currencySymbol}${Number(bill.total_amount).toFixed(2)}</p>
          </div>
        ` : settings?.invoice_show_qr_code ? `
          <div class="qr-placeholder" style="margin: 15px auto; width: 80px; height: 80px; border: 1px dashed #ccc; display: flex; align-items: center; justify-content: center; font-size: 8px; color: #999; text-align: center;">
            UPI ID NOT SET
          </div>
        ` : ''}

        <div class="footer-print-date">
          Printed on ${format(new Date(), 'dd/MM/yyyy HH:mm')}
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
