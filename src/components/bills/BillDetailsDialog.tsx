import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useBusinessSettings } from '@/hooks/useBusinessSettings';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Printer, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
import { printBillReceipt } from './BillReceiptPrint';
import { DEFAULT_WHATSAPP_TEMPLATE, formatWhatsAppMessage } from '@/lib/whatsappConfig';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

interface Bill {
  id: string;
  bill_number: string;
  status: 'draft' | 'completed' | 'cancelled';
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  total_amount: number;
  created_at: string;
  completed_at?: string | null;
  customer_id?: string | null;
  customers?: { name: string; phone?: string; address?: string; } | null;
}

interface BillItem {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  cost_price: number;
}

interface BillDetailsDialogProps {
  bill: Bill | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BillDetailsDialog({ bill, open, onOpenChange }: BillDetailsDialogProps) {
  const { data: settings } = useBusinessSettings();
  const currencySymbol = settings?.currency_symbol || '₹';

  const { data: billItems = [] } = useQuery({
    queryKey: ['billItems', bill?.id],
    queryFn: async () => {
      if (!bill) return [];
      const { data, error } = await supabase
        .from('bill_items')
        .select('*')
        .eq('bill_id', bill.id);
      if (error) throw error;
      return data as BillItem[];
    },
    enabled: !!bill && open,
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'draft':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handlePrint = () => {
    if (bill) {
      printBillReceipt(bill, billItems, settings);
    }
  };

  const handleWhatsAppShare = () => {
    if (!bill) return;

    const phone = bill.customers?.phone || '';
    const cleanPhone = phone.replace(/\D/g, '');
    const formattedPhone = cleanPhone.length === 10 ? '91' + cleanPhone : cleanPhone;

    const template = localStorage.getItem('invoice_adda_whatsapp_template') || DEFAULT_WHATSAPP_TEMPLATE;

    const message = formatWhatsAppMessage(
      {
        bill_number: bill.bill_number,
        created_at: bill.created_at,
        customer_name: bill.customers?.name || 'Walk-in Customer',
        subtotal: bill.subtotal,
        discount_amount: bill.discount_amount,
        tax_amount: bill.tax_amount,
        total_amount: bill.total_amount,
        payment_status: bill.status === 'completed' ? 'Paid' : bill.status === 'cancelled' ? 'Cancelled' : 'Draft',
        payment_method: 'Cash/UPI',
      },
      billItems.map((item) => ({
        product_name: item.product_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
      })),
      settings || {},
      template
    );

    const url = `https://api.whatsapp.com/send?phone=${formattedPhone}&text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  if (!bill) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center justify-between border-b pb-4">
            <div className="space-y-1">
              <DialogTitle className="text-xl">Bill Details</DialogTitle>
              <p className="text-sm font-bold text-muted-foreground mr-1">#{bill.bill_number}</p>
            </div>
            <div className="flex items-center gap-2">
              {localStorage.getItem('invoice_adda_whatsapp_enabled') !== 'false' && (
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={handleWhatsAppShare} 
                  className="h-9 px-4 text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:text-emerald-400 dark:border-emerald-900/50 dark:hover:bg-emerald-950/20"
                >
                  <MessageSquare className="mr-2 h-4 w-4 fill-emerald-600 dark:fill-emerald-400 text-emerald-600 dark:text-emerald-400" />
                  WhatsApp
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={handlePrint} className="h-9 px-4">
                <Printer className="mr-2 h-4 w-4" />
                Print
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Date:</span>
              <p className="font-medium">
                {format(new Date(bill.created_at), 'dd/MM/yyyy HH:mm')}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Customer:</span>
              <p className="font-medium">{bill.customers?.name || 'Walk-in'}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Status:</span>
              <Badge className={getStatusColor(bill.status)} variant="secondary">
                {bill.status}
              </Badge>
            </div>
          </div>

          <div className="rounded-md border max-h-[50vh] overflow-y-auto">
            <Table>
              <TableHeader className="bg-muted/50 sticky top-0 z-10 shadow-sm">
                <TableRow>
                  <TableHead className="py-2">Item</TableHead>
                  <TableHead className="py-2 text-right">Price</TableHead>
                  <TableHead className="py-2 text-center">Qty</TableHead>
                  <TableHead className="py-2 text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {billItems.map((item) => (
                  <TableRow key={item.id} className="h-12">
                    <TableCell className="font-medium align-middle">{item.product_name}</TableCell>
                    <TableCell className="text-right align-middle text-muted-foreground">
                      {currencySymbol}{Number(item.unit_price).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-center align-middle font-medium">
                      {item.quantity}
                    </TableCell>
                    <TableCell className="text-right align-middle font-semibold">
                      {currencySymbol}{Number(item.total_price).toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="space-y-2.5 bg-muted/30 p-4 rounded-lg">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-medium">{currencySymbol}{Number(bill.subtotal).toFixed(2)}</span>
            </div>
            {Number(bill.discount_amount) > 0 && (
              <div className="flex justify-between text-sm text-destructive">
                <span>Discount</span>
                <span>-{currencySymbol}{Number(bill.discount_amount).toFixed(2)}</span>
              </div>
            )}
            {Number(bill.tax_amount) > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{settings?.tax_name || 'Tax'}</span>
                <span className="font-medium">{currencySymbol}{Number(bill.tax_amount).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between border-t pt-2.5 mt-2.5">
              <span className="text-lg font-bold">Total Amount</span>
              <span className="text-2xl font-bold text-emerald-600">
                {currencySymbol}{Number(bill.total_amount).toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
