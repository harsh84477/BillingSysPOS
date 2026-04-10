// @ts-nocheck
/**
 * components/bills/ReturnItemsDialog.tsx
 *
 * Shown from BillsHistory when a user clicks "Return" on a completed bill.
 * Flow:
 *  1. Loads bill items
 *  2. User picks which items (and how many) to return
 *  3. Confirms with a reason
 *  4. Calls process_sales_return RPC → stock restored + credit note issued
 */
import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useBusinessSettings } from '@/hooks/useBusinessSettings';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { RotateCcw, Package, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';

interface BillItem {
  id: string;
  product_id: string | null;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface ReturnLine {
  selected: boolean;
  quantity: number;
  maxQty: number;
}

interface ReturnItemsDialogProps {
  bill: {
    id: string;
    bill_number: string;
    total_amount: number;
    created_at: string;
    customers?: { name: string } | null;
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function generateReturnNumber(billNumber: string) {
  return `RTN-${billNumber}-${Date.now().toString().slice(-4)}`;
}

export function ReturnItemsDialog({ bill, open, onOpenChange }: ReturnItemsDialogProps) {
  const { businessId, user } = useAuth();
  const { data: settings } = useBusinessSettings();
  const qc = useQueryClient();
  const currencySymbol = settings?.currency_symbol || '₹';

  const [lines, setLines] = useState<Record<string, ReturnLine>>({});
  const [reason, setReason] = useState('');
  const [done, setDone] = useState<{ returnNumber: string; creditNote?: string; total: number } | null>(null);

  // Load bill items
  const { data: items = [], isLoading } = useQuery({
    queryKey: ['bill-items-for-return', bill?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bill_items')
        .select('id, product_id, product_name, quantity, unit_price, total_price')
        .eq('bill_id', bill!.id);
      if (error) throw error;
      return data as BillItem[];
    },
    enabled: !!bill?.id && open,
    onSuccess: (data) => {
      const initial: Record<string, ReturnLine> = {};
      data.forEach(item => {
        initial[item.id] = { selected: false, quantity: item.quantity, maxQty: item.quantity };
      });
      setLines(initial);
    },
  });

  const selectedItems = useMemo(() =>
    items.filter(i => lines[i.id]?.selected),
  [items, lines]);

  const returnTotal = useMemo(() =>
    selectedItems.reduce((s, i) => s + (lines[i.id]?.quantity || 0) * i.unit_price, 0),
  [selectedItems, lines]);

  const toggleItem = (id: string) => {
    setLines(prev => ({ ...prev, [id]: { ...prev[id], selected: !prev[id].selected } }));
  };

  const setQty = (id: string, val: number) => {
    const max = lines[id]?.maxQty || 1;
    setLines(prev => ({ ...prev, [id]: { ...prev[id], quantity: Math.min(Math.max(1, val), max) } }));
  };

  const returnMutation = useMutation({
    mutationFn: async () => {
      const returnNumber = generateReturnNumber(bill!.bill_number);
      const payload = selectedItems.map(i => ({
        product_id: i.product_id || '',
        product_name: i.product_name,
        quantity: lines[i.id].quantity,
        unit_price: i.unit_price,
        gst_rate: 0,
      }));

      const { data, error } = await supabase.rpc('process_sales_return', {
        p_business_id: businessId,
        p_bill_id: bill!.id,
        p_return_number: returnNumber,
        p_reason: reason || 'No reason provided',
        p_items: payload,
        p_user_id: user?.id,
      });
      if (error) throw error;
      const result = data as any;
      if (!result.success) throw new Error(result.error);
      return { ...result, returnNumber };
    },
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ['sales-returns', businessId] });
      qc.invalidateQueries({ queryKey: ['products', businessId] });
      setDone({ returnNumber: result.returnNumber, creditNote: result.credit_note, total: result.total });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handleClose = () => {
    setDone(null);
    setReason('');
    setLines({});
    onOpenChange(false);
  };

  if (!bill) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5 text-amber-500" />
            Return Items — Bill #{bill.bill_number}
          </DialogTitle>
          <DialogDescription>
            {bill.customers?.name || 'Walk-in'} · {format(new Date(bill.created_at), 'dd MMM yyyy')}
          </DialogDescription>
        </DialogHeader>

        {done ? (
          // ── Success state ─────────────────────────────────
          <div className="py-6 text-center space-y-4">
            <CheckCircle2 className="h-14 w-14 mx-auto text-green-500" />
            <div>
              <p className="text-lg font-bold">Return Processed!</p>
              <p className="text-sm text-muted-foreground mt-1">Return #{done.returnNumber}</p>
            </div>
            <div className="rounded-xl border bg-muted/40 p-4 text-left space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Return Amount</span>
                <span className="font-bold text-destructive">{currencySymbol}{Number(done.total).toFixed(2)}</span>
              </div>
              {done.creditNote && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Credit Note</span>
                  <Badge variant="secondary">{done.creditNote}</Badge>
                </div>
              )}
              <p className="text-xs text-muted-foreground pt-1">
                Stock has been restored and a credit note issued.
              </p>
            </div>
            <Button onClick={handleClose} className="w-full">Done</Button>
          </div>
        ) : (
          // ── Selection state ───────────────────────────────
          <>
            {isLoading ? (
              <div className="py-8 text-center text-sm text-muted-foreground">Loading items...</div>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto py-1 pr-1">
                {items.map(item => {
                  const line = lines[item.id];
                  if (!line) return null;
                  return (
                    <div key={item.id} className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${line.selected ? 'border-primary/50 bg-primary/5' : 'border-border'}`}>
                      <Checkbox
                        checked={line.selected}
                        onCheckedChange={() => toggleItem(item.id)}
                        id={`item-${item.id}`}
                      />
                      <label htmlFor={`item-${item.id}`} className="flex-1 cursor-pointer">
                        <div className="flex items-center gap-2">
                          <Package className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="text-sm font-medium">{item.product_name}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {currencySymbol}{item.unit_price.toFixed(2)} × {item.quantity} = {currencySymbol}{item.total_price.toFixed(2)}
                        </p>
                      </label>
                      {line.selected && (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Label className="text-xs text-muted-foreground">Qty:</Label>
                          <Input
                            type="number"
                            min={1}
                            max={line.maxQty}
                            value={line.quantity}
                            onChange={e => setQty(item.id, Number(e.target.value))}
                            className="h-7 w-16 text-center text-sm"
                          />
                          <span className="text-xs text-muted-foreground">/{line.maxQty}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-xs font-medium">Reason for Return</Label>
              <Textarea
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="Damaged goods, wrong item, customer changed mind..."
                rows={2}
                className="text-sm"
              />
            </div>

            {selectedItems.length > 0 && (
              <>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{selectedItems.length} item(s) selected</span>
                  <span className="font-bold text-destructive">{currencySymbol}{returnTotal.toFixed(2)} return</span>
                </div>
              </>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              <Button
                variant="destructive"
                onClick={() => returnMutation.mutate()}
                disabled={selectedItems.length === 0 || returnMutation.isPending}
                className="gap-2"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                {returnMutation.isPending ? 'Processing...' : 'Process Return'}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
