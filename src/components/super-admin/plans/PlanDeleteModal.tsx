import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Loader2, Trash2, ArrowRight } from 'lucide-react';

interface Plan { id: string; name: string; price: number; is_active: boolean; features: any; }

function formatCurrency(v: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v);
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  plan: Plan | null;
  subscriberCount: number;
  allPlans: Plan[];
  isDeleting: boolean;
  onConfirmDelete: (reassignPlanId: string | null) => void;
}

export default function PlanDeleteModal({ open, onOpenChange, plan, subscriberCount, allPlans, isDeleting, onConfirmDelete }: Props) {
  const [reassignPlanId, setReassignPlanId] = useState<string>('');
  const otherPlans = allPlans.filter(p => p.id !== plan?.id && p.is_active);
  const hasSubscribers = subscriberCount > 0;
  if (!plan) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />Delete: {plan.name}
          </DialogTitle>
          <DialogDescription>
            {hasSubscribers
              ? `This plan has ${subscriberCount} active subscriber${subscriberCount !== 1 ? 's' : ''}.`
              : 'No active subscribers. Safe to delete.'}
          </DialogDescription>
        </DialogHeader>
        {hasSubscribers && (
          <div className="space-y-4 py-2">
            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 rounded-lg">
              <p className="text-sm font-semibold text-amber-800 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />{subscriberCount} business{subscriberCount !== 1 ? 'es' : ''} affected
              </p>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold flex items-center gap-2">
                <ArrowRight className="h-3 w-3" />Reassign to another plan
              </Label>
              <Select value={reassignPlanId} onValueChange={setReassignPlanId}>
                <SelectTrigger><SelectValue placeholder="Select a plan..." /></SelectTrigger>
                <SelectContent>
                  {otherPlans.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name} — {formatCurrency(p.price)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
        <DialogFooter className="flex gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          {hasSubscribers && (
            <Button variant="destructive" size="sm" disabled={isDeleting} onClick={() => onConfirmDelete(null)} className="gap-1.5 text-xs">
              {isDeleting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <Trash2 className="h-3.5 w-3.5" />Force Delete
            </Button>
          )}
          <Button variant={hasSubscribers ? "default" : "destructive"} disabled={isDeleting || (hasSubscribers && !reassignPlanId)}
            onClick={() => onConfirmDelete(reassignPlanId || null)} className="gap-1.5">
            {isDeleting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {hasSubscribers ? 'Reassign & Delete' : 'Delete Plan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
