import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Zap, Loader2, CheckCircle2, ArrowRight, Calendar, Crown, Building2 } from 'lucide-react';
import { format, addMonths, addYears, addDays } from 'date-fns';
import { formatCurrency, DURATION_OPTIONS } from '../planTypes';

type ActionType = 'assign' | 'upgrade' | 'downgrade' | 'extend' | 'trial' | 'lifetime' | 'change_expiry';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  businessName: string;
  businessId: string;
  currentPlanId: string | null;
  currentPlanName: string | null;
  currentExpiry: string | null;
  plans: any[];
  isPending: boolean;
  onSubmit: (vars: { bizId: string; planId: string; status: string; periodEnd: string }) => void;
}

export default function SubscriptionModal({
  open, onOpenChange, businessName, businessId,
  currentPlanId, currentPlanName, currentExpiry,
  plans, isPending, onSubmit,
}: Props) {
  const [action, setAction] = useState<ActionType>('assign');
  const [selectedPlanId, setSelectedPlanId] = useState(currentPlanId || '');
  const [duration, setDuration] = useState('1_month');
  const [customDate, setCustomDate] = useState('');

  const selectedPlan = plans.find((p: any) => p.id === selectedPlanId);

  const computePeriodEnd = (): string => {
    const base = currentExpiry && new Date(currentExpiry) > new Date()
      ? new Date(currentExpiry) : new Date();

    if (action === 'lifetime') return new Date('2099-12-31').toISOString();
    if (action === 'change_expiry' && customDate) return new Date(customDate).toISOString();
    if (action === 'trial') return addDays(new Date(), 14).toISOString();

    const opt = DURATION_OPTIONS.find(d => d.value === duration);
    if (!opt || !opt.months) return addMonths(base, 1).toISOString();
    return addMonths(base, opt.months).toISOString();
  };

  const handleSubmit = () => {
    if (!selectedPlanId && action !== 'lifetime' && action !== 'trial') return;
    const status = action === 'trial' ? 'trialing' : 'active';
    const planId = selectedPlanId || (plans[0]?.id || '');
    onSubmit({ bizId: businessId, planId, status, periodEnd: computePeriodEnd() });
  };

  const actions: { value: ActionType; label: string }[] = [
    { value: 'assign', label: 'Assign Plan' },
    { value: 'upgrade', label: 'Upgrade' },
    { value: 'downgrade', label: 'Downgrade' },
    { value: 'extend', label: 'Extend' },
    { value: 'trial', label: 'Start Trial' },
    { value: 'lifetime', label: 'Assign Lifetime' },
    { value: 'change_expiry', label: 'Change Expiry' },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />Manage Subscription
          </DialogTitle>
          <DialogDescription className="flex items-center gap-2">
            <Building2 className="h-3.5 w-3.5" />{businessName}
            {currentPlanName && (
              <Badge variant="outline" className="text-[10px] ml-1">{currentPlanName}</Badge>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Action Type */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold">Action</Label>
            <div className="grid grid-cols-4 gap-1.5">
              {actions.map(a => (
                <Button key={a.value} size="sm" variant={action === a.value ? 'default' : 'outline'}
                  className="text-[10px] h-7 px-2" onClick={() => setAction(a.value)}>
                  {a.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Plan Selection */}
          {action !== 'trial' && action !== 'change_expiry' && (
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Select Plan</Label>
              <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
                <SelectTrigger><SelectValue placeholder="Choose a plan..." /></SelectTrigger>
                <SelectContent>
                  {plans.map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>
                      <span className="flex items-center gap-2">
                        <Crown className="h-3 w-3 text-muted-foreground" />
                        {p.name} — {formatCurrency(Number(p.price))}
                        {p.id === currentPlanId && <Badge variant="secondary" className="text-[8px] ml-1">Current</Badge>}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Duration */}
          {action !== 'lifetime' && action !== 'trial' && action !== 'change_expiry' && (
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Duration</Label>
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DURATION_OPTIONS.filter(d => d.value !== 'custom').map(d => (
                    <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Custom Expiry Date */}
          {action === 'change_expiry' && (
            <div className="space-y-2">
              <Label className="text-xs font-semibold">New Expiry Date</Label>
              <Input type="date" value={customDate} onChange={e => setCustomDate(e.target.value)} />
            </div>
          )}

          {/* Summary */}
          <div className="p-3 bg-muted/50 rounded-lg border space-y-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Summary</p>
            {selectedPlan && action !== 'trial' && (
              <p className="text-sm flex items-center gap-2">
                Plan: <span className="font-bold">{selectedPlan.name}</span>
                <ArrowRight className="h-3 w-3 text-muted-foreground" />
                <span className="font-bold">{formatCurrency(Number(selectedPlan.price))}</span>
              </p>
            )}
            {action === 'trial' && <p className="text-sm">14-day free trial</p>}
            {action === 'lifetime' && <p className="text-sm font-bold text-emerald-600">Lifetime access (never expires)</p>}
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Calendar className="h-3 w-3" />
              Expires: {format(new Date(computePeriodEnd()), 'MMM dd, yyyy')}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isPending} className="gap-1.5">
            {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            <CheckCircle2 className="h-3.5 w-3.5" />Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
