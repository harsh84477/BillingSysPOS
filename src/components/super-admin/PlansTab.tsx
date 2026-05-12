import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Sparkles, Plus, Crown, RefreshCw, LayoutGrid, Table2 } from 'lucide-react';
import { toast } from 'sonner';
import PlanCard from './plans/PlanCard';
import PlanBuilderModal from './plans/PlanBuilderModal';
import PlanDeleteModal from './plans/PlanDeleteModal';
import PlanComparisonTable from './plans/PlanComparisonTable';
import {
  Plan, PlanFormState, DEFAULT_PLAN_FORM,
  formatCurrency, formToFeatures, planToForm,
} from './planTypes';

export default function PlansTab() {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editing, setEditing] = useState<Plan | null>(null);
  const [deletingPlan, setDeletingPlan] = useState<Plan | null>(null);
  const [form, setForm] = useState<PlanFormState>(DEFAULT_PLAN_FORM);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['subscription-plans-admin'],
    queryFn: async () => {
      const { data, error } = await supabase.from('subscription_plans').select('*').order('price');
      if (error) return [];
      return (data || []) as Plan[];
    },
  });

  const { data: subscriptions = [] } = useQuery({
    queryKey: ['plan-subscriber-counts'],
    queryFn: async () => {
      const { data } = await (supabase.rpc as any)('get_all_subscriptions');
      return (data || []) as any[];
    },
  });

  const subscriberCounts = useMemo(() => {
    const counts = new Map<string, number>();
    subscriptions.filter((s: any) => s.status === 'active' || s.status === 'trialing')
      .forEach((s: any) => { if (s.plan_id) counts.set(s.plan_id, (counts.get(s.plan_id) || 0) + 1); });
    return counts;
  }, [subscriptions]);

  const totalMRR = useMemo(() =>
    subscriptions.filter((s: any) => s.status === 'active').reduce((sum: number, s: any) => sum + Number(s.plan_price || 0), 0),
  [subscriptions]);

  const activePlans = plans.filter(p => p.is_active);
  const inactivePlans = plans.filter(p => !p.is_active);
  const totalSubscribers = subscriptions.filter((s: any) => s.status === 'active').length;

  // ── Mutations ──
  const saveMutation = useMutation({
    mutationFn: async () => {
      const features = formToFeatures(form);
      let billingPeriod = form.billing_period;
      if (billingPeriod === '1_month') billingPeriod = 'monthly';
      const payload = { name: form.name, description: form.description || null, price: form.price, billing_period: billingPeriod, features, is_active: form.is_active };
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
      setDialogOpen(false); setEditing(null);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from('subscription_plans').update({ is_active }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => { toast.success(vars.is_active ? 'Plan activated' : 'Plan deactivated'); qc.invalidateQueries({ queryKey: ['subscription-plans-admin'] }); },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ id, reassignPlanId }: { id: string; reassignPlanId: string | null }) => {
      if (reassignPlanId) {
        const { error: re } = await supabase.from('subscriptions').update({ plan_id: reassignPlanId }).eq('plan_id', id);
        if (re) throw re;
      }
      const { error } = await supabase.from('subscription_plans').update({ is_active: false }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Plan deleted'); qc.invalidateQueries({ queryKey: ['subscription-plans-admin'] });
      qc.invalidateQueries({ queryKey: ['all-subscriptions'] }); setDeleteOpen(false); setDeletingPlan(null);
    },
    onError: (err: any) => toast.error(err.message),
  });

  // ── Handlers ──
  const openCreate = () => { setEditing(null); setForm({ ...DEFAULT_PLAN_FORM }); setDialogOpen(true); };
  const openEdit = (plan: Plan) => { setEditing(plan); setForm(planToForm(plan)); setDialogOpen(true); };
  const handleDuplicate = (plan: Plan) => { setEditing(null); const f = planToForm(plan); f.name = `${plan.name} (Copy)`; setForm(f); setDialogOpen(true); };
  const handleToggleActive = (plan: Plan) => { toggleActiveMutation.mutate({ id: plan.id, is_active: !plan.is_active }); };
  const handleArchive = (plan: Plan) => { toggleActiveMutation.mutate({ id: plan.id, is_active: false }); };
  const handleDeleteClick = (plan: Plan) => { setDeletingPlan(plan); setDeleteOpen(true); };
  const handleConfirmDelete = (reassignPlanId: string | null) => { if (deletingPlan) deleteMutation.mutate({ id: deletingPlan.id, reassignPlanId }); };
  const handleSave = () => { if (!form.name.trim()) { toast.error('Plan name is required'); return; } saveMutation.mutate(); };

  if (isLoading) {
    return (<div className="space-y-6"><Skeleton className="h-10 w-72" /><div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">{[1,2,3].map(i => <Skeleton key={i} className="h-80 rounded-xl" />)}</div></div>);
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
          <div className="flex items-center border rounded-lg p-0.5 bg-muted/50">
            <Button variant={viewMode === 'cards' ? 'default' : 'ghost'} size="sm" className="h-7 px-2.5 gap-1 text-xs" onClick={() => setViewMode('cards')}>
              <LayoutGrid className="h-3.5 w-3.5" />Cards
            </Button>
            <Button variant={viewMode === 'table' ? 'default' : 'ghost'} size="sm" className="h-7 px-2.5 gap-1 text-xs" onClick={() => setViewMode('table')}>
              <Table2 className="h-3.5 w-3.5" />Compare
            </Button>
          </div>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => qc.invalidateQueries({ queryKey: ['subscription-plans-admin'] })}>
            <RefreshCw className="h-3.5 w-3.5" />Refresh
          </Button>
          <Button size="sm" onClick={openCreate} className="gap-1.5"><Plus className="h-3.5 w-3.5" />New Plan</Button>
        </div>
      </div>

      {/* Summary Bar */}
      <Card className="border-slate-200/70 shadow-sm bg-gradient-to-r from-violet-500/5 via-transparent to-transparent">
        <CardContent className="py-4">
          <div className="flex flex-wrap items-center gap-6 sm:gap-10">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-violet-500/10 flex items-center justify-center"><Crown className="h-5 w-5 text-violet-600" /></div>
              <div><p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Active Plans</p><p className="text-2xl font-bold tracking-tight">{activePlans.length}</p></div>
            </div>
            <div><p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Inactive</p><p className="text-sm font-bold">{inactivePlans.length}</p></div>
            <div><p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Total MRR</p><p className="text-sm font-bold">{formatCurrency(totalMRR)}</p></div>
            <div><p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Subscribers</p><p className="text-sm font-bold">{totalSubscribers}</p></div>
          </div>
        </CardContent>
      </Card>

      {/* Content */}
      {plans.length === 0 ? (
        <Card className="border-slate-200/70 shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Sparkles className="h-12 w-12 opacity-15 mb-4" /><p className="font-semibold text-foreground">No plans yet</p>
            <p className="text-sm mt-1">Create your first subscription plan.</p>
            <Button onClick={openCreate} variant="outline" className="mt-4 gap-2"><Plus className="h-4 w-4" />Create Plan</Button>
          </CardContent>
        </Card>
      ) : viewMode === 'cards' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {plans.map(plan => (
            <PlanCard key={plan.id} plan={plan} subscriberCount={subscriberCounts.get(plan.id) || 0}
              onEdit={openEdit} onDuplicate={handleDuplicate} onToggleActive={handleToggleActive}
              onArchive={handleArchive} onDelete={handleDeleteClick} />
          ))}
        </div>
      ) : (
        <PlanComparisonTable plans={plans} />
      )}

      <PlanBuilderModal open={dialogOpen} onOpenChange={setDialogOpen} form={form} setForm={setForm}
        isEditing={!!editing} isSaving={saveMutation.isPending} onSave={handleSave} />
      <PlanDeleteModal open={deleteOpen} onOpenChange={setDeleteOpen} plan={deletingPlan}
        subscriberCount={deletingPlan ? (subscriberCounts.get(deletingPlan.id) || 0) : 0}
        allPlans={plans} isDeleting={deleteMutation.isPending} onConfirmDelete={handleConfirmDelete} />
    </div>
  );
}
