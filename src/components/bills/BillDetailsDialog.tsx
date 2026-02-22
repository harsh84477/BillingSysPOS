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
import { Printer, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { printBillReceipt } from './BillReceiptPrint';
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
  customers?: { name: string } | null;
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

  if (!bill) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Bill #{bill.bill_number}</DialogTitle>
            <Button size="sm" variant="outline" onClick={handlePrint}>
              <Printer className="mr-2 h-4 w-4" />
              Print
            </Button>
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

          <div className="border-t pt-4">
            <h4 className="mb-2 font-medium">Items</h4>
            <div className="space-y-2">
              {billItems.map((item) => (
                <div
                  key={item.id}
                  className={cn(
                    "flex justify-between text-sm",
                    item.unit_price <= item.cost_price ? "text-destructive font-bold" : ""
                  )}
                >
                  <span>
                    {item.product_name} × {item.quantity}
                  </span>
                  <span>{currencySymbol}{Number(item.total_price).toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-1 border-t pt-4 text-sm">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>{currencySymbol}{Number(bill.subtotal).toFixed(2)}</span>
            </div>
            {Number(bill.discount_amount) > 0 && (
              <div className="flex justify-between text-destructive">
                <span>Discount</span>
                <span>-{currencySymbol}{Number(bill.discount_amount).toFixed(2)}</span>
              </div>
            )}
            {Number(bill.tax_amount) > 0 && (
              <div className="flex justify-between">
                <span>Tax</span>
                <span>{currencySymbol}{Number(bill.tax_amount).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold">
              <span>Total</span>
              <span className="text-primary">
                {currencySymbol}{Number(bill.total_amount).toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
