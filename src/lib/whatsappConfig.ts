/**
 * lib/whatsappConfig.ts — WhatsApp Template & Parsing Utilities
 */

export const DEFAULT_WHATSAPP_TEMPLATE = `*INVOICE RECEIPT*
----------------------------------
*Business:* {business_name}
*Invoice No:* #{bill_no}
*Date:* {date}
*Customer:* {customer_name}

*Items:*
{items}

*Subtotal:* {currency_symbol}{subtotal}
*Discount:* {currency_symbol}{discount}
*Tax:* {currency_symbol}{tax}
*Total Amount:* {currency_symbol}{total}

*Payment Status:* {payment_status}
*Payment Method:* {payment_method}

Thank you for shopping with us!`;

export interface WhatsAppBillInfo {
  bill_number: string;
  created_at: string | Date;
  customer_name?: string;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  total_amount: number;
  payment_status?: string;
  payment_method?: string;
}

export interface WhatsAppBillItem {
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface WhatsAppBusinessSettings {
  business_name?: string;
  currency_symbol?: string;
}

/**
 * Replaces placeholders in the WhatsApp template with actual bill details.
 */
export function formatWhatsAppMessage(
  bill: WhatsAppBillInfo,
  items: WhatsAppBillItem[],
  settings: WhatsAppBusinessSettings,
  template: string
): string {
  const currencySymbol = settings?.currency_symbol || '₹';
  const businessName = settings?.business_name || 'Our Business';
  const customerName = bill.customer_name || 'Walk-in Customer';
  const billNo = bill.bill_number;
  
  const dateObj = typeof bill.created_at === 'string' ? new Date(bill.created_at) : bill.created_at;
  const dateStr = dateObj instanceof Date && !isNaN(dateObj.getTime())
    ? dateObj.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : String(bill.created_at);

  // Format list of items
  const formattedItems = items
    .map(
      (item) =>
        `• ${item.product_name} x ${item.quantity} = ${currencySymbol}${Number(item.total_price).toFixed(2)}`
    )
    .join('\n');

  let msg = template || DEFAULT_WHATSAPP_TEMPLATE;
  msg = msg.replace(/{business_name}/g, businessName);
  msg = msg.replace(/{bill_no}/g, billNo);
  msg = msg.replace(/{date}/g, dateStr);
  msg = msg.replace(/{customer_name}/g, customerName);
  msg = msg.replace(/{items}/g, formattedItems);
  msg = msg.replace(/{currency_symbol}/g, currencySymbol);
  msg = msg.replace(/{subtotal}/g, Number(bill.subtotal).toFixed(2));
  msg = msg.replace(/{discount}/g, Number(bill.discount_amount).toFixed(2));
  msg = msg.replace(/{tax}/g, Number(bill.tax_amount).toFixed(2));
  msg = msg.replace(/{total}/g, Number(bill.total_amount).toFixed(2));
  msg = msg.replace(/{payment_status}/g, bill.payment_status || 'Paid');
  msg = msg.replace(/{payment_method}/g, bill.payment_method || 'Cash');

  return msg;
}

/**
 * Escapes HTML utility to avoid XSS issues when rendering dangerouslySetInnerHTML.
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Translates WhatsApp markdown syntax (*bold*, _italics_, ~strike~, ```code```) to HTML elements.
 */
export function parseWhatsAppMarkdown(text: string): string {
  if (!text) return '';
  
  let html = escapeHtml(text);

  // Bold: *text* -> <strong>text</strong>
  html = html.replace(/\*(?!\s)(.*?)(?!\s)\*/g, '<strong>$1</strong>');

  // Italics: _text_ -> <em>text</em>
  html = html.replace(/_(?!\s)(.*?)(?!\s)_/g, '<em>$1</em>');

  // Strikethrough: ~text~ -> <del>text</del>
  html = html.replace(/~(?!\s)(.*?)(?!\s)~/g, '<del>$1</del>');

  // Monospace: ```text``` -> <code>text</code>
  html = html.replace(/```(?!\s)(.*?)(?!\s)```/g, '<code>$1</code>');

  // Line breaks: \n -> <br />
  html = html.replace(/\n/g, '<br />');

  return html;
}
