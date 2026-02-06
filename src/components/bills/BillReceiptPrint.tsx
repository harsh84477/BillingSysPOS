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
  
  const receiptHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Bill #${bill.bill_number}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: 'Courier New', monospace;
          width: 400px;
          padding: 20px;
          font-size: 12px;
          line-height: 1.4;
        }
        .header { text-align: center; margin-bottom: 15px; border-bottom: 1px dashed #000; padding-bottom: 15px; }
        .business-name { font-size: 18px; font-weight: bold; margin-bottom: 5px; }
        .business-info { font-size: 11px; color: #333; }
        .bill-info { margin: 15px 0; padding: 10px 0; border-bottom: 1px dashed #000; }
        .bill-info-row { display: flex; justify-content: space-between; margin: 3px 0; }
        .items-header { display: flex; justify-content: space-between; font-weight: bold; border-bottom: 1px solid #000; padding: 5px 0; margin-bottom: 5px; }
        .item-row { display: flex; justify-content: space-between; padding: 3px 0; }
        .item-name { flex: 2; }
        .item-qty { flex: 1; text-align: center; }
        .item-price { flex: 1; text-align: right; }
        .totals { border-top: 1px dashed #000; margin-top: 15px; padding-top: 10px; }
        .total-row { display: flex; justify-content: space-between; margin: 3px 0; }
        .grand-total { font-size: 16px; font-weight: bold; border-top: 2px solid #000; margin-top: 10px; padding-top: 10px; }
        .footer { text-align: center; margin-top: 20px; padding-top: 15px; border-top: 1px dashed #000; font-size: 11px; }
        .status-badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: bold; text-transform: uppercase; }
        .status-completed { background: #dcfce7; color: #166534; }
        .status-draft { background: #fef3c7; color: #92400e; }
        .status-cancelled { background: #fee2e2; color: #991b1b; }
        @media print {
          body { width: 100%; }
          @page { margin: 10mm; }
        }
      </style>
    </head>
    <body>
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
        <div class="bill-info-row">
          <span>Status:</span>
          <span class="status-badge status-${bill.status}">${bill.status}</span>
        </div>
      </div>

      <div class="items-header">
        <span class="item-name">Item</span>
        <span class="item-qty">Qty</span>
        <span class="item-price">Amount</span>
      </div>
      
      ${items.map(item => `
        <div class="item-row">
          <span class="item-name">${item.product_name}</span>
          <span class="item-qty">${item.quantity}</span>
          <span class="item-price">${currencySymbol}${Number(item.total_price).toFixed(2)}</span>
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

      <div class="footer">
        <p>Thank you for your business!</p>
        <p style="margin-top: 5px; font-size: 10px;">Printed on ${format(new Date(), 'dd/MM/yyyy HH:mm')}</p>
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
