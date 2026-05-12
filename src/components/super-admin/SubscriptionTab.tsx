import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  CreditCard, IndianRupee, Users, AlertTriangle, Search,
  PlusCircle, XCircle, Building2, ArrowUpDown, Crown, Clock,
  CheckCircle2, ShieldX, RefreshCw, Zap, Settings2,
} from 'lucide-react';
import { format, addMonths, addYears } from 'date-fns';
import { toast } from 'sonner';
import SubscriptionModal from './plans/SubscriptionModal';

function formatCurrency(v: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v);
}

type Sub = {
  subscription_id: string; business_id: string; business_name: string;
  plan_id: string | null; plan_name: string | null; plan_price: number | null;
  billing_period: string | null; status: string; trial_end: string | null;
  current_period_end: string | null; created_at: string;
};

export default function SubscriptionTab() {
  const { customAdminId } = useAuth();
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<'business' | 'price' | 'expiry'>('business');
  const [sortAsc, setSortAsc] = useState(true);
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignBizId, setAssignBizId] = useState('');
  const [assignPlanId, setAssignPlanId] = useState('');
  const [assignDuration, setAssignDuration] = useState<'1m' | '6m' | '1y'>('1m');
  // Subscription modal state
  const [subModalOpen, setSubModalOpen] = useState(false);
  const [subModalTarget, setSubModalTarget] = useState<Sub | null>(null);

  // Data queries
  const { data: subscriptions = [], isLoading } = useQuery({
    queryKey: ['all-subscriptions'],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)('get_all_subscriptions');
      if (error) throw error;
      return (data || []) as Sub[];
    },
  });

  const { data: plans = [] } = useQuery({
    queryKey: ['subscription-plans'],
    queryFn: async () => {
      const { data } = await supabase.from('subscription_plans').select('*').eq('is_active', true).order('price');
      return data || [];
    },
  });

  const { data: allBusinesses = [] } = useQuery({
    queryKey: ['all-businesses-for-assign'],
    queryFn: async () => {
      const { data } = await (supabase.rpc as any)('get_all_businesses_admin');
      return (data || []) as any[];
    },
  });

  // Mutation
  const manageSub = useMutation({
    mutationFn: async (vars: { bizId: string; planId: string; status: string; periodEnd: string }) => {
      const { error } = await (supabase.rpc as any)('manage_business_subscription', {
        p_business_id: vars.bizId, p_plan_id: vars.planId,
        p_status: vars.status, p_period_end: vars.periodEnd,
      });
      if (error) throw error;
      await (supabase.rpc as any)('log_admin_action', {
        p_admin_id: customAdminId || 'unknown',
        p_action: vars.status === 'expired' ? 'cancel_subscription' : 'assign_subscription',
        p_target_id: vars.bizId, p_target_type: 'business',
        p_details: { plan_id: vars.planId, period_end: vars.periodEnd },
      });
    },
    onSuccess: () => {
      toast.success('Subscription updated');
      qc.invalidateQueries({ queryKey: ['all-subscriptions'] });
      qc.invalidateQueries({ queryKey: ['all-businesses-for-assign'] });
      qc.invalidateQueries({ queryKey: ['super-admin-overview-v2'] });
      setAssignOpen(false);
      setAssignBizId('');
      setAssignPlanId('');
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Computed
  const activeSubs = subscriptions.filter(s => s.status === 'active');
  const trialSubs = subscriptions.filter(s => s.status === 'trialing');
  const expiredSubs = subscriptions.filter(s => s.status === 'expired');
  const mrr = activeSubs.reduce((sum, s) => sum + Number(s.plan_price || 0), 0);
  const bizWithoutSub = allBusinesses.filter((b: any) => !subscriptions.some(s => s.business_id === b.id));
  const collectionRate = subscriptions.length > 0 ? (activeSubs.length / subscriptions.length) * 100 : 0;

  // Filtered & sorted
  const filtered = useMemo(() => {
    let list = subscriptions.filter(s => statusFilter === 'all' || s.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(s => s.business_name?.toLowerCase().includes(q) || s.plan_name?.toLowerCase().includes(q));
    }
    list.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'business') cmp = (a.business_name || '').localeCompare(b.business_name || '');
      else if (sortField === 'price') cmp = Number(a.plan_price || 0) - Number(b.plan_price || 0);
      else if (sortField === 'expiry') cmp = new Date(a.current_period_end || 0).getTime() - new Date(b.current_period_end || 0).getTime();
      return sortAsc ? cmp : -cmp;
    });
    return list;
  }, [subscriptions, statusFilter, search, sortField, sortAsc]);

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) setSortAsc(!sortAsc);
    else { setSortField(field); setSortAsc(true); }
  };

  const getStatusBadge = (s: Sub) => {
    const now = new Date();
    const isExpired = s.status === 'expired' ||
      (s.status === 'active' && s.current_period_end && new Date(s.current_period_end) < now) ||
      (s.status === 'trialing' && s.trial_end && new Date(s.trial_end) < now);

    if (isExpired) return <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-red-200 text-[10px] gap-1"><ShieldX className="h-3 w-3" />Expired</Badge>;
    if (s.status === 'active') return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-emerald-200 text-[10px] gap-1"><CheckCircle2 className="h-3 w-3" />Active</Badge>;
    if (s.status === 'trialing') return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-blue-200 text-[10px] gap-1"><Clock className="h-3 w-3" />Trial</Badge>;
    return <Badge variant="secondary" className="text-[10px]">{s.status}</Badge>;
  };

  const handleAssign = () => {
    if (!assignBizId || !assignPlanId) return;
    const now = new Date();
    const periodEnd = assignDuration === '1y' ? addYears(now, 1) : assignDuration === '6m' ? addMonths(now, 6) : addMonths(now, 1);
    manageSub.mutate({ bizId: assignBizId, planId: assignPlanId, status: 'active', periodEnd: periodEnd.toISOString() });
  };

  const openSubModal = (s: Sub) => {
    setSubModalTarget(s);
    setSubModalOpen(true);
  };

  const handleSubModalSubmit = (vars: { bizId: string; planId: string; status: string; periodEnd: string }) => {
    manageSub.mutate(vars);
    setSubModalOpen(false);
    setSubModalTarget(null);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{[1,2,3,4].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}</div>
        <Skeleton className="h-20 rounded-xl" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Subscription Management</h2>
          <p className="text-sm text-muted-foreground mt-1">Manage all business subscriptions, extend plans, and assign new ones.</p>
        </div>
        <div className="flex items-center gap-2 self-start">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => qc.invalidateQueries({ queryKey: ['all-subscriptions'] })}>
            <RefreshCw className="h-3.5 w-3.5" />Refresh
          </Button>
          <Button size="sm" className="gap-1.5" onClick={() => setAssignOpen(true)}>
            <PlusCircle className="h-3.5 w-3.5" />Assign Plan
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Active" value={activeSubs.length} icon={CheckCircle2} color="emerald" onClick={() => setStatusFilter('active')} active={statusFilter === 'active'} />
        <KpiCard label="Trialing" value={trialSubs.length} icon={Clock} color="blue" onClick={() => setStatusFilter('trialing')} active={statusFilter === 'trialing'} />
        <KpiCard label="Expired" value={expiredSubs.length} icon={ShieldX} color="red" onClick={() => setStatusFilter('expired')} active={statusFilter === 'expired'} />
        <KpiCard label="No Plan" value={bizWithoutSub.length} icon={AlertTriangle} color="amber" onClick={() => { setStatusFilter('all'); setAssignOpen(true); }} />
      </div>

      {/* MRR Banner */}
      <Card className="border-slate-200/70 shadow-sm bg-gradient-to-r from-emerald-500/5 via-transparent to-transparent">
        <CardContent className="py-4">
          <div className="flex flex-wrap items-center gap-6 sm:gap-10">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <IndianRupee className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Monthly Revenue</p>
                <p className="text-2xl font-bold tracking-tight">{formatCurrency(mrr)}</p>
              </div>
            </div>
            <Stat label="ARR" value={formatCurrency(mrr * 12)} />
            <Stat label="Active" value={`${activeSubs.length} subs`} />
            <Stat label="Collection" value={`${collectionRate.toFixed(0)}%`} />
            <Stat label="Total" value={`${subscriptions.length} subs`} />
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border-slate-200/70 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row justify-between gap-3">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-primary" />All Subscriptions
                <Badge variant="outline" className="text-xs ml-1">{filtered.length}</Badge>
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">Inline controls to extend, cancel, or reassign plans</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input placeholder="Search business..." className="pl-8 h-8 w-48 text-xs" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="trialing">Trialing</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {/* Desktop */}
          <div className="hidden sm:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="w-10">#</TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('business')}>
                    <span className="flex items-center gap-1">Business <ArrowUpDown className="h-3 w-3 opacity-40" /></span>
                  </TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('price')}>
                    <span className="flex items-center gap-1">Price <ArrowUpDown className="h-3 w-3 opacity-40" /></span>
                  </TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('expiry')}>
                    <span className="flex items-center gap-1">Expiry <ArrowUpDown className="h-3 w-3 opacity-40" /></span>
                  </TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((s, i) => (
                  <TableRow key={s.subscription_id} className="group">
                    <TableCell className="text-xs text-muted-foreground">{i + 1}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <Building2 className="h-3.5 w-3.5 text-primary" />
                        </div>
                        <span className="font-semibold text-sm">{s.business_name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {s.plan_name ? (
                        <Badge variant="outline" className="text-[10px]">{s.plan_name}</Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">No plan</span>
                      )}
                    </TableCell>
                    <TableCell>{getStatusBadge(s)}</TableCell>
                    <TableCell className="font-semibold text-sm">{s.plan_price ? formatCurrency(Number(s.plan_price)) : '—'}</TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {s.current_period_end
                        ? format(new Date(s.current_period_end), 'MMM dd, yyyy')
                        : s.trial_end
                          ? format(new Date(s.trial_end), 'MMM dd, yyyy') + ' (trial)'
                          : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1.5 justify-end opacity-70 group-hover:opacity-100 transition-opacity">
                        <Button size="sm" variant="outline" className="h-7 text-xs px-2.5 gap-1" onClick={() => openSubModal(s)}>
                          <Settings2 className="h-3 w-3" />Subscription
                        </Button>
                        <Button size="sm" variant="destructive" className="h-7 text-xs px-2.5" disabled={manageSub.isPending}
                          onClick={() => manageSub.mutate({
                            bizId: s.business_id, planId: s.plan_id || '', status: 'expired',
                            periodEnd: new Date().toISOString(),
                          })}>
                          <XCircle className="h-3 w-3 mr-1" />Cancel
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-16 text-muted-foreground">
                      <CreditCard className="h-8 w-8 mx-auto mb-2 opacity-20" />
                      <p className="text-sm font-medium">No subscriptions found</p>
                      <p className="text-xs mt-1">Try changing the filter or search term</p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile */}
          <div className="sm:hidden divide-y divide-border">
            {filtered.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">No subscriptions found.</div>
            ) : (
              filtered.map(s => (
                <div key={s.subscription_id} className="px-4 py-3 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Building2 className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <span className="font-semibold text-sm">{s.business_name}</span>
                    </div>
                    {getStatusBadge(s)}
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{s.plan_name || 'No plan'}</span>
                    <span className="font-bold text-foreground">{s.plan_price ? formatCurrency(Number(s.plan_price)) : '—'}</span>
                  </div>
                  <div className="flex gap-1.5">
                    <Button size="sm" variant="outline" className="h-7 text-xs px-2 flex-1 gap-1" onClick={() => openSubModal(s)}>
                      <Settings2 className="h-3 w-3" />Subscription
                    </Button>
                    <Button size="sm" variant="destructive" className="h-7 text-xs px-2" disabled={manageSub.isPending}
                      onClick={() => manageSub.mutate({
                        bizId: s.business_id, planId: s.plan_id || '', status: 'expired',
                        periodEnd: new Date().toISOString(),
                      })}>Cancel</Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Assign Plan Dialog — for unsubscribed businesses */}
      {assignOpen && (
        <SubscriptionModal
          open={assignOpen}
          onOpenChange={setAssignOpen}
          businessName={allBusinesses.find((b: any) => b.id === assignBizId)?.business_name || 'Select Business'}
          businessId={assignBizId}
          currentPlanId={null}
          currentPlanName={null}
          currentExpiry={null}
          plans={plans}
          isPending={manageSub.isPending}
          onSubmit={handleSubModalSubmit}
        />
      )}

      {/* Subscription Modal — for existing subscriptions */}
      {subModalTarget && (
        <SubscriptionModal
          open={subModalOpen}
          onOpenChange={(v) => { setSubModalOpen(v); if (!v) setSubModalTarget(null); }}
          businessName={subModalTarget.business_name}
          businessId={subModalTarget.business_id}
          currentPlanId={subModalTarget.plan_id}
          currentPlanName={subModalTarget.plan_name}
          currentExpiry={subModalTarget.current_period_end}
          plans={plans}
          isPending={manageSub.isPending}
          onSubmit={handleSubModalSubmit}
        />
      )}
    </div>
  );
}

// ─── Sub-components ───

function KpiCard({ label, value, icon: Icon, color, onClick, active }: {
  label: string; value: number; icon: React.ElementType;
  color: 'emerald' | 'blue' | 'red' | 'amber'; onClick?: () => void; active?: boolean;
}) {
  const colors = {
    emerald: 'text-emerald-600 bg-emerald-500/10',
    blue: 'text-blue-600 bg-blue-500/10',
    red: 'text-red-600 bg-red-500/10',
    amber: 'text-amber-600 bg-amber-500/10',
  };
  return (
    <Card className={cn(
      "border-slate-200/70 shadow-sm cursor-pointer transition-all hover:shadow-md",
      active && "ring-2 ring-primary/30 border-primary/30"
    )} onClick={onClick}>
      <CardContent className="pt-4 pb-3">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">{label}</p>
            <p className="text-3xl font-bold tracking-tight mt-1">{value}</p>
          </div>
          <div className={cn("h-9 w-9 rounded-xl flex items-center justify-center", colors[color])}>
            <Icon className="h-4.5 w-4.5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">{label}</p>
      <p className="text-sm font-bold">{value}</p>
    </div>
  );
}
