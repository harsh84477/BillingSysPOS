// @ts-nocheck
/**
 * components/billing/LoyaltyRedeemDialog.tsx — Loyalty Points Redemption Dialog
 *
 * Shown during billing when a customer is selected and eligble to redeem points.
 * - Shows current points balance
 * - Calculates max redeemable points (capped by max_redeem_pct of bill total)
 * - User enters points to redeem → shows discount amount
 * - Calls redeem_loyalty_points RPC on confirm
 * - Returns the discount amount to apply to the bill
 */
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Star, Gift, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  customerId: string;
  customerName: string;
  billTotal: number;
  onRedeem: (discountAmount: number) => void;
}

export default function LoyaltyRedeemDialog({ open, onOpenChange, customerId, customerName, billTotal, onRedeem }: Props) {
  const { businessId } = useAuth();
  const [pointsToRedeem, setPointsToRedeem] = useState('');

  // Fetch loyalty program config
  const { data: program } = useQuery({
    queryKey: ['loyalty-program', businessId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('loyalty_programs')
        .select('*')
        .eq('business_id', businessId)
        .eq('is_enabled', true)
        .maybeSingle();
      return data;
    },
    enabled: !!businessId && open,
  });

  // Fetch customer loyalty points balance
  const { data: customer } = useQuery({
    queryKey: ['customer-loyalty', customerId],
    queryFn: async () => {
      const { data } = await supabase
        .from('customers')
        .select('id, name, loyalty_points')
        .eq('id', customerId)
        .maybeSingle();
      return data;
    },
    enabled: !!customerId && open,
  });

  const currentPoints = customer?.loyalty_points || 0;
  const burnRate = Number(program?.burn_rate || 1);
  const minRedeem = Number(program?.min_redeem_pts || 50);
  const maxPct = Number(program?.max_redeem_pct || 20);
  const maxDiscountAllowed = (billTotal * maxPct) / 100;
  const maxPointsByPct = Math.floor(maxDiscountAllowed / burnRate);
  const maxRedeemable = Math.min(currentPoints, maxPointsByPct);

  const redeemPoints = Math.min(Math.max(0, Number(pointsToRedeem) || 0), maxRedeemable);
  const discountAmount = redeemPoints * burnRate;

  useEffect(() => {
    if (open) setPointsToRedeem('');
  }, [open]);

  const redeemMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await (supabase as any).rpc('redeem_loyalty_points', {
        p_business_id: businessId,
        p_customer_id: customerId,
        p_points_to_redeem: redeemPoints,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Redeemed ${redeemPoints} points for ₹${discountAmount.toFixed(2)} discount`);
      onRedeem(discountAmount);
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const canRedeem = redeemPoints >= minRedeem && redeemPoints > 0;

  if (!program) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-amber-500" />
            Redeem Loyalty Points
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Customer & Balance */}
          <div className="bg-amber-50 dark:bg-amber-950/20 rounded-xl p-3 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Customer</p>
              <p className="font-bold text-sm">{customerName}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Points Balance</p>
              <div className="flex items-center gap-1 justify-end">
                <Star className="h-4 w-4 text-amber-500" />
                <span className="text-xl font-black text-amber-600">{currentPoints.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Rules */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-muted/40 rounded-lg p-2">
              <p className="text-muted-foreground">Value per point</p>
              <p className="font-bold">₹{burnRate}</p>
            </div>
            <div className="bg-muted/40 rounded-lg p-2">
              <p className="text-muted-foreground">Max discount</p>
              <p className="font-bold">₹{maxDiscountAllowed.toFixed(2)} ({maxPct}%)</p>
            </div>
          </div>

          {currentPoints < minRedeem ? (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800">
              <AlertCircle className="h-4 w-4 text-orange-500 mt-0.5 shrink-0" />
              <p className="text-xs text-orange-700 dark:text-orange-300">
                Customer needs at least <strong>{minRedeem}</strong> points to redeem. They currently have <strong>{currentPoints}</strong>.
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground uppercase font-semibold">
                  Points to Redeem (max: {maxRedeemable.toLocaleString()})
                </Label>
                <Input
                  type="number"
                  min={minRedeem}
                  max={maxRedeemable}
                  value={pointsToRedeem}
                  onChange={(e) => setPointsToRedeem(e.target.value)}
                  placeholder={`${minRedeem} – ${maxRedeemable}`}
                  className="font-bold"
                  autoFocus
                />
                {pointsToRedeem && (
                  <p className="text-xs text-muted-foreground">
                    {redeemPoints} points = <span className="font-bold text-emerald-600">₹{discountAmount.toFixed(2)} discount</span>
                  </p>
                )}
                {Number(pointsToRedeem) > maxRedeemable && (
                  <p className="text-xs text-destructive">Exceeds maximum allowed ({maxRedeemable} pts)</p>
                )}
              </div>

              {canRedeem && (
                <div className="bg-emerald-50 dark:bg-emerald-950/20 rounded-lg p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Gift className="h-4 w-4 text-emerald-600" />
                    <span className="text-sm font-semibold">Discount applied</span>
                  </div>
                  <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 font-bold">
                    -₹{discountAmount.toFixed(2)}
                  </Badge>
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={() => redeemMutation.mutate()}
            disabled={!canRedeem || redeemMutation.isPending}
            className="bg-amber-500 hover:bg-amber-600 text-white"
          >
            {redeemMutation.isPending ? 'Redeeming…' : `Redeem ${redeemPoints} pts`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
