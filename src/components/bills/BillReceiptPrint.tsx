import React from 'react';
import { format } from 'date-fns';

interface BillItem {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
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
          width: 400px;
          padding: 20px;
          font-size: ${fontSize}px;
          line-height: 1.4;
          color: #1a1a1a;
        }
        .header { 
          text-align: ${style === 'modern' ? 'left' : 'center'}; 
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
        
        .items-table { width: 100%; border-collapse: collapse; margin: 15px 0; }
        .items-header { 
          display: flex; 
          justify-content: space-between; 
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
        .item-main { display: flex; justify-content: space-between; width: 100%; }
        .item-name { flex: 2; font-weight: ${style === 'modern' ? '500' : 'normal'}; }
        .item-qty { flex: 0.5; text-align: center; }
        .item-price { flex: 1; text-align: right; }
        .item-details { width: 100%; font-size: ${fontSize - 3}px; color: #6b7280; margin-top: 2px; }

        .totals { 
          border-top: ${showBorders ? '2px solid #000' : 'none'}; 
          margin-top: 15px; 
          padding-top: 10px; 
        }
        .total-row { display: flex; justify-content: space-between; margin: 4px 0; }
        .grand-total { 
          font-size: ${fontSize + 4}px; 
          font-weight: bold; 
          border-top: 2px solid #000; 
          margin-top: 10px; 
          padding: 12px 0;
          background: ${style === 'modern' ? '#f3f4f6' : 'transparent'};
          padding: ${style === 'modern' ? '8px' : '12px 0'};
        }
        
        .footer { 
          text-align: center; 
          margin-top: 30px; 
          padding-top: 15px; 
          border-top: ${showBorders ? '1px dashed #ccc' : 'none'}; 
          font-size: ${fontSize - 2}px;
          color: #6b7280;
        }
        
        @media print {
          body { width: 100%; }
          @page { margin: 10mm; }
        }
      </style>
    </head>
    <body class="style-${style}">
      <div class="header">
        <div class="business-name">${settings?.business_name || 'Business'}</div>
        ${settings?.address ? `<div class="business-info">${settings.address}</div>` : ''}
        ${settings?.phone ? `<div class="business-info">Tel: ${settings.phone}</div>` : ''}
        ${settings?.email ? `<div class="business-info">${settings.email}</div>` : ''}
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
        ${style === 'detailed' ? `
        <div class="bill-info-row">
          <span>Status:</span>
          <span class="status-badge status-${bill.status}">${bill.status}</span>
        </div>
        ` : ''}
      </div>

      <div class="items-header">
        <span style="flex: 2;">Item</span>
        <span style="flex: 1; text-align: right;">Amount</span>
      </div>
      
      ${items.map(item => `
        <div class="item-row">
          <div class="item-main">
            <span class="item-name">${item.product_name}</span>
            <span class="item-price">${currencySymbol}${Number(item.total_price).toFixed(2)}</span>
          </div>
          <div class="item-details">
            ${currencySymbol}${Number(item.unit_price).toFixed(2)} × ${item.quantity}
          </div>
        </div>
      `).join('')}

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

      </div>
    </body>
    </html>
  `;

  const printWindow = window.open('', '_blank', 'width=450,height=600');
  if (printWindow) {
    printWindow.document.write(receiptHTML);
    printWindow.document.close();

    // Wait for content to load then print
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 250);
  }
}
