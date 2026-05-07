import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  Sparkles, Plus, Edit2, Trash2, Loader2, Package, IndianRupee,
  Users, CheckCircle2, Crown, Zap, Shield, Clock, FileSpreadsheet,
  HeadphonesIcon, RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';

function formatCurrency(v: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v);
}

// The DB schema for subscription_plans only has:
// id, name, description, price, billing_period, features (JSONB), is_active
// All plan limits are stored INSIDE features JSONB
interface PlanFeatures {
  feature_list?: string[];
  max_users?: number;
  max_products?: number;
  max_bills_per_day?: number;
  max_items_per_day?: number;
  support?: string;
  history_days?: number;
  can_export?: boolean;
}

interface Plan {
  id: string;
  name: string;
  description: string | null;
  price: number;
  billing_period: string;
  features: PlanFeatures;
  is_active: boolean;
  created_at: string;
}

const defaultFeatures: PlanFeatures = {
  feature_list: [],
  max_users: 5,
  max_products: 100,
  max_bills_per_day: 50,
  max_items_per_day: 100,
  support: 'None',
  history_days: 30,
  can_export: false,
};

const PERIOD_LABELS: Record<string, string> = {
  monthly: 'Monthly',
  '6_months': '6 Months',
  yearly: 'Yearly',
  lifetime: 'Lifetime',
  trial: 'Trial',
};

const PERIOD_SHORT: Record<string, string> = {
  monthly: '/mo',
  '6_months': '/6mo',
  yearly: '/yr',
  lifetime: '',
  trial: '',
};

export default function PlansTab() {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Plan | null>(null);
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formPrice, setFormPrice] = useState<number>(0);
  const [formPeriod, setFormPeriod] = useState('monthly');
  const [formIsActive, setFormIsActive] = useState(true);
  const [formFeatures, setFormFeatures] = useState<PlanFeatures>(defaultFeatures);
  const [featuresText, setFeaturesText] = useState('');

  // Fetch
  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['subscription-plans-admin'],
    queryFn: async () => {
      const { data, error } = await supabase.from('subscription_plans').select('*').order('price');
      if (error) return [];
      return (data || []) as Plan[];
    },
  });

  // Subscriber counts
  const { data: subscriptions = [] } = useQuery({
    queryKey: ['plan-subscriber-counts'],
    queryFn: async () => {
      const { data } = await (supabase.rpc as any)('get_all_subscriptions');
      return (data || []) as any[];
    },
  });

  const subscriberCounts = useMemo(() => {
    const counts = new Map<string, number>();
    subscriptions.filter((s: any) => s.status === 'active' || s.status === 'trialing').forEach((s: any) => {
      if (s.plan_id) counts.set(s.plan_id, (counts.get(s.plan_id) || 0) + 1);
    });
    return counts;
  }, [subscriptions]);

  const totalMRR = useMemo(() => {
    return subscriptions
      .filter((s: any) => s.status === 'active')
      .reduce((sum: number, s: any) => sum + Number(s.plan_price || 0), 0);
  }, [subscriptions]);

  // Save
  const saveMutation = useMutation({
    mutationFn: async () => {
      const featureList = featuresText.split('\n').map(f => f.trim()).filter(Boolean);
      const features = { ...formFeatures, feature_list: featureList };
      const payload = {
        name: formName,
        description: formDescription || null,
        price: formPrice,
        billing_period: formPeriod,
        features,
        is_active: formIsActive,
      };
      if (editing) {
        const { error } = await supabase.from('subscription_plans').update(payload).eq('id', editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('subscription_plans').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? 'Plan updated' : 'Plan created');
      qc.invalidateQueries({ queryKey: ['subscription-plans-admin'] });
      qc.invalidateQueries({ queryKey: ['subscription-plans'] });
      closeDialog();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('subscription_plans').update({ is_active: false }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Plan deactivated');
      qc.invalidateQueries({ queryKey: ['subscription-plans-admin'] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const openCreate = () => {
    setEditing(null);
    setFormName('');
    setFormDescription('');
    setFormPrice(0);
    setFormPeriod('monthly');
    setFormIsActive(true);
    setFormFeatures(defaultFeatures);
    setFeaturesText('');
    setDialogOpen(true);
  };

  const openEdit = (plan: Plan) => {
    const f = plan.features || {};
    setEditing(plan);
    setFormName(plan.name);
    setFormDescription(plan.description || '');
    setFormPrice(plan.price);
    setFormPeriod(plan.billing_period);
    setFormIsActive(plan.is_active);
    setFormFeatures({
      max_users: f.max_users ?? 5,
      max_products: f.max_products ?? 100,
      max_bills_per_day: f.max_bills_per_day ?? 50,
      max_items_per_day: f.max_items_per_day ?? 100,
      support: f.support ?? 'None',
      history_days: f.history_days ?? 30,
      can_export: f.can_export ?? false,
    });
    setFeaturesText((f.feature_list || []).join('\n'));
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditing(null);
  };

  const handleSave = () => {
    if (!formName.trim()) { toast.error('Plan name is required'); return; }
    saveMutation.mutate();
  };

  const activePlans = plans.filter(p => p.is_active);
  const inactivePlans = plans.filter(p => !p.is_active);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-72" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-72 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Plans & Pricing</h2>
          <p className="text-sm text-muted-foreground mt-1">Create and manage subscription tiers for businesses.</p>
        </div>
        <div className="flex items-center gap-2 self-start">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => qc.invalidateQueries({ queryKey: ['subscription-plans-admin'] })}>
            <RefreshCw className="h-3.5 w-3.5" />Refresh
          </Button>
          <Button size="sm" onClick={openCreate} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" />New Plan
          </Button>
        </div>
      </div>

      {/* Summary Bar */}
      <Card className="border-slate-200/70 shadow-sm bg-gradient-to-r from-violet-500/5 via-transparent to-transparent">
        <CardContent className="py-4">
          <div className="flex flex-wrap items-center gap-6 sm:gap-10">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
                <Crown className="h-5 w-5 text-violet-600" />
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Total Plans</p>
                <p className="text-2xl font-bold tracking-tight">{activePlans.length}</p>
              </div>
            </div>
            <StatItem label="Inactive" value={String(inactivePlans.length)} />
            <StatItem label="Total MRR" value={formatCurrency(totalMRR)} />
            <StatItem label="Subscribers" value={String(subscriptions.filter((s: any) => s.status === 'active').length)} />
          </div>
        </CardContent>
      </Card>

      {/* Plan Cards */}
      {plans.length === 0 ? (
        <Card className="border-slate-200/70 shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Sparkles className="h-12 w-12 opacity-15 mb-4" />
            <p className="font-semibold text-foreground">No plans yet</p>
            <p className="text-sm mt-1">Create your first subscription plan to get started.</p>
            <Button onClick={openCreate} variant="outline" className="mt-4 gap-2">
              <Plus className="h-4 w-4" />Create Plan
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {plans.map((plan, idx) => {
            const f = plan.features || {};
            const subs = subscriberCounts.get(plan.id) || 0;
            const isPopular = idx === Math.floor(activePlans.length / 2) && plan.is_active;

            return (
              <Card key={plan.id} className={cn(
                "relative overflow-hidden transition-all hover:shadow-lg border-slate-200/70 shadow-sm group",
                !plan.is_active && "opacity-50 grayscale",
                isPopular && "ring-2 ring-primary/30 border-primary/20"
              )}>
                {/* Popular badge */}
                {isPopular && (
                  <div className="absolute top-0 right-0">
                    <div className="bg-primary text-primary-foreground text-[9px] font-bold uppercase tracking-widest px-3 py-1 rounded-bl-lg">
                      Popular
                    </div>
                  </div>
                )}

                {/* Inactive badge */}
                {!plan.is_active && (
                  <div className="absolute top-3 right-3">
                    <Badge variant="secondary" className="text-[10px]">Inactive</Badge>
                  </div>
                )}

                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "h-8 w-8 rounded-lg flex items-center justify-center",
                      plan.is_active ? "bg-primary/10" : "bg-muted"
                    )}>
                      <Crown className={cn("h-4 w-4", plan.is_active ? "text-primary" : "text-muted-foreground")} />
                    </div>
                    <div>
                      <CardTitle className="text-base">{plan.name}</CardTitle>
                      <CardDescription className="text-[11px]">{PERIOD_LABELS[plan.billing_period] || plan.billing_period}</CardDescription>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Price */}
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black tracking-tight">{formatCurrency(plan.price)}</span>
                    <span className="text-sm text-muted-foreground">{PERIOD_SHORT[plan.billing_period] || ''}</span>
                  </div>

                  {/* Subscribers */}
                  <div className="flex items-center gap-1.5 text-xs">
                    <Users className="h-3 w-3 text-muted-foreground" />
                    <span className="font-medium">{subs} active subscriber{subs !== 1 ? 's' : ''}</span>
                  </div>

                  {/* Limits grid */}
                  <div className="grid grid-cols-2 gap-2">
                    <LimitChip icon={Users} label="Users" value={f.max_users ?? '∞'} />
                    <LimitChip icon={Package} label="Products" value={f.max_products ?? '∞'} />
                    <LimitChip icon={FileSpreadsheet} label="Bills/day" value={f.max_bills_per_day ?? '∞'} />
                    <LimitChip icon={Clock} label="History" value={f.history_days === -1 ? '∞' : `${f.history_days ?? 30}d`} />
                  </div>

                  {/* Feature flags */}
                  <div className="flex flex-wrap gap-1.5">
                    {f.can_export && (
                      <Badge variant="outline" className="text-[9px] gap-0.5 bg-emerald-50 text-emerald-700 border-emerald-200">
                        <CheckCircle2 className="h-2.5 w-2.5" />Export
                      </Badge>
                    )}
                    {f.support && f.support !== 'None' && (
                      <Badge variant="outline" className="text-[9px] gap-0.5 bg-blue-50 text-blue-700 border-blue-200">
                        <HeadphonesIcon className="h-2.5 w-2.5" />{f.support}
                      </Badge>
                    )}
                  </div>

                  {/* Feature list */}
                  {f.feature_list && f.feature_list.length > 0 && (
                    <ul className="space-y-1.5 border-t border-slate-100 pt-3">
                      {f.feature_list.slice(0, 5).map((feat, i) => (
                        <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                          <CheckCircle2 className="h-3 w-3 text-emerald-500 mt-0.5 shrink-0" />
                          <span>{feat}</span>
                        </li>
                      ))}
                      {f.feature_list.length > 5 && (
                        <li className="text-[10px] text-muted-foreground/60 ml-5">+{f.feature_list.length - 5} more</li>
                      )}
                    </ul>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 pt-2 border-t border-slate-100">
                    <Button variant="outline" size="sm" className="flex-1 h-8 text-xs gap-1" onClick={() => openEdit(plan)}>
                      <Edit2 className="h-3 w-3" />Edit
                    </Button>
                    {plan.is_active && (
                      <Button variant="ghost" size="sm"
                        className="h-8 text-xs text-destructive hover:text-destructive gap-1"
                        disabled={deleteMutation.isPending}
                        onClick={() => deleteMutation.mutate(plan.id)}>
                        <Trash2 className="h-3 w-3" />Deactivate
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              {editing ? 'Edit Plan' : 'Create New Plan'}
            </DialogTitle>
            <DialogDescription>
              {editing ? 'Update the subscription plan details.' : 'Set up a new subscription tier for your businesses.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Name & Description */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Plan Name</Label>
              <Input placeholder="e.g. Starter, Pro, Enterprise" value={formName} onChange={e => setFormName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Description</Label>
              <Input placeholder="Short description" value={formDescription} onChange={e => setFormDescription(e.target.value)} />
            </div>

            {/* Price & Period */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Price (₹)</Label>
                <Input type="number" placeholder="299" value={formPrice || ''} onChange={e => setFormPrice(Number(e.target.value))} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Billing Period</Label>
                <Select value={formPeriod} onValueChange={setFormPeriod}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="6_months">6 Months</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                    <SelectItem value="lifetime">Lifetime</SelectItem>
                    <SelectItem value="trial">Trial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Limits */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Plan Limits</Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Max Users</Label>
                  <Input type="number" value={formFeatures.max_users ?? ''} onChange={e => setFormFeatures(f => ({ ...f, max_users: Number(e.target.value) }))} />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Max Products</Label>
                  <Input type="number" value={formFeatures.max_products ?? ''} onChange={e => setFormFeatures(f => ({ ...f, max_products: Number(e.target.value) }))} />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Bills per Day</Label>
                  <Input type="number" value={formFeatures.max_bills_per_day ?? ''} onChange={e => setFormFeatures(f => ({ ...f, max_bills_per_day: Number(e.target.value) }))} />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Items per Day</Label>
                  <Input type="number" value={formFeatures.max_items_per_day ?? ''} onChange={e => setFormFeatures(f => ({ ...f, max_items_per_day: Number(e.target.value) }))} />
                </div>
              </div>
            </div>

            {/* Support & History */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">Support Level</Label>
                <Select value={formFeatures.support || 'None'} onValueChange={v => setFormFeatures(f => ({ ...f, support: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="None">None</SelectItem>
                    <SelectItem value="Standard">Standard</SelectItem>
                    <SelectItem value="24/7 Priority">24/7 Priority</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">History (days, -1=∞)</Label>
                <Input type="number" value={formFeatures.history_days ?? ''} onChange={e => setFormFeatures(f => ({ ...f, history_days: Number(e.target.value) }))} placeholder="-1 for unlimited" />
              </div>
            </div>

            {/* Toggles */}
            <div className="flex items-center justify-between rounded-lg border border-slate-200/70 px-4 py-3">
              <div>
                <Label className="text-sm font-medium">Export Enabled</Label>
                <p className="text-[11px] text-muted-foreground">Allow data export (Excel/CSV)</p>
              </div>
              <Switch checked={formFeatures.can_export ?? false} onCheckedChange={v => setFormFeatures(f => ({ ...f, can_export: v }))} />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-slate-200/70 px-4 py-3">
              <div>
                <Label className="text-sm font-medium">Active</Label>
                <p className="text-[11px] text-muted-foreground">Visible to businesses</p>
              </div>
              <Switch checked={formIsActive} onCheckedChange={setFormIsActive} />
            </div>

            {/* Feature list */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Features (one per line)</Label>
              <textarea
                className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder={"Unlimited billing\nInventory tracking\nMulti-user support"}
                value={featuresText}
                onChange={e => setFeaturesText(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancel</Button>
            <Button onClick={handleSave} disabled={saveMutation.isPending} className="gap-2">
              {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {editing ? 'Update Plan' : 'Create Plan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Sub-components ───

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">{label}</p>
      <p className="text-sm font-bold">{value}</p>
    </div>
  );
}

function LimitChip({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string | number }) {
  return (
    <div className="flex items-center gap-1.5 rounded-md bg-slate-50 px-2 py-1.5 text-[11px]">
      <Icon className="h-3 w-3 text-muted-foreground shrink-0" />
      <span className="text-muted-foreground">{label}:</span>
      <span className="font-bold text-slate-700">{value}</span>
    </div>
  );
}
