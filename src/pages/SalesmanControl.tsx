/**
 * pages/SalesmanControl.tsx — Business Owner / Manager panel
 * Manage all salesmen: view performance, set targets, assign stores
 */
import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Users, Target, Store, TrendingUp, IndianRupee, Search,
  Plus, Trash2, Calendar, UserCheck, ShoppingCart, FileText,
  ChevronRight, Eye,
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, parseISO, isWithinInterval } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function SalesmanControl() {
  const { businessId } = useAuth();
  const queryClient = useQueryClient();
  const today = new Date();

  const [selectedSalesman, setSelectedSalesman] = useState<string | null>(null);
  const [targetDialogOpen, setTargetDialogOpen] = useState(false);
  const [storeDialogOpen, setStoreDialogOpen] = useState(false);
  const [detailTab, setDetailTab] = useState('overview');

  // Target form
  const [targetForm, setTargetForm] = useState({
    period: 'monthly',
    target_amount: '',
    target_bills: '',
    start_date: format(startOfMonth(today), 'yyyy-MM-dd'),
    end_date: format(endOfMonth(today), 'yyyy-MM-dd'),
  });

  // Store assignment
  const [storeSearch, setStoreSearch] = useState('');
  const [selectedStoreIds, setSelectedStoreIds] = useState<string[]>([]);

  const { data: settings } = useQuery({
    queryKey: ['business-settings', businessId],
    queryFn: async () => {
      const { data } = await supabase.from('business_settings').select('currency_symbol').eq('business_id', businessId).maybeSingle();
      return data;
    },
    enabled: !!businessId,
  });
  const cs = settings?.currency_symbol || '₹';

  // ─── Fetch all salesmen in this business ───
  const { data: salesmen = [], isLoading: loadingSalesmen } = useQuery({
    queryKey: ['all-salesmen', businessId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('user_id, role, created_at, profiles(display_name, email)')
        .eq('business_id', businessId)
        .eq('role', 'salesman');
      if (error) throw error;
      return (data || []).map((r: any) => ({
        user_id: r.user_id,
        name: r.profiles?.display_name || r.profiles?.email?.split('@')[0] || 'Salesman',
        email: r.profiles?.email || '',
        joined: r.created_at,
      }));
    },
    enabled: !!businessId,
  });

  // ─── Fetch all bills by all salesmen this month ───
  const { data: allBills = [] } = useQuery({
    queryKey: ['salesman-control-bills', businessId],
    queryFn: async () => {
      const salesmanIds = salesmen.map((s: any) => s.user_id);
      if (salesmanIds.length === 0) return [];
      const { data, error } = await supabase
        .from('bills')
        .select('id, total_amount, status, created_by, created_at, customer_id')
        .eq('business_id', businessId)
        .in('created_by', salesmanIds)
        .neq('status', 'draft');
      if (error) throw error;
      return data || [];
    },
    enabled: !!businessId && salesmen.length > 0,
  });

  // ─── Fetch all targets ───
  const { data: allTargets = [] } = useQuery({
    queryKey: ['salesman-control-targets', businessId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('salesman_targets')
        .select('*')
        .eq('business_id', businessId)
        .order('start_date', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!businessId,
  });

  // ─── Fetch all store assignments ───
  const { data: allAssignments = [] } = useQuery({
    queryKey: ['salesman-control-assignments', businessId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('salesman_stores')
        .select('id, salesman_id, customer_id, customers(id, name, store_type, location_name, pincode)')
        .eq('business_id', businessId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!businessId,
  });

  // ─── Fetch all customers (for store assignment dialog) ───
  const { data: allCustomers = [] } = useQuery({
    queryKey: ['all-customers', businessId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('id, name, phone, store_type, location_name, pincode')
        .eq('business_id', businessId)
        .order('name');
      if (error) throw error;
      return data || [];
    },
    enabled: !!businessId,
  });

  // ─── Enriched salesmen data ───
  const enrichedSalesmen = useMemo(() => {
    return salesmen.map((s: any) => {
      const mBills = allBills.filter((b: any) => b.created_by === s.user_id);
      const monthStart = startOfMonth(today);
      const monthEnd = endOfMonth(today);
      const monthBills = mBills.filter((b: any) => {
        const d = new Date(b.created_at);
        return d >= monthStart && d <= monthEnd;
      });
      const monthSales = monthBills.reduce((sum: number, b: any) => sum + Number(b.total_amount || 0), 0);
      const stores = allAssignments.filter((a: any) => a.salesman_id === s.user_id);
      const currentTarget = allTargets.find((t: any) =>
        t.salesman_id === s.user_id && isWithinInterval(today, { start: parseISO(t.start_date), end: parseISO(t.end_date) })
      );
      const targetPct = currentTarget?.target_amount > 0
        ? Math.min(100, (monthSales / currentTarget.target_amount) * 100) : 0;

      return {
        ...s,
        totalBills: mBills.length,
        monthBills: monthBills.length,
        monthSales,
        storeCount: stores.length,
        stores,
        currentTarget,
        targetPct,
      };
    });
  }, [salesmen, allBills, allAssignments, allTargets, today]);

  const selected = enrichedSalesmen.find((s: any) => s.user_id === selectedSalesman);

  // ─── Save target mutation ───
  const saveTargetMutation = useMutation({
    mutationFn: async () => {
      if (!selectedSalesman) throw new Error('No salesman selected');
      const { error } = await (supabase as any).from('salesman_targets').insert({
        business_id: businessId,
        salesman_id: selectedSalesman,
        period: targetForm.period,
        target_amount: Number(targetForm.target_amount) || 0,
        target_bills: Number(targetForm.target_bills) || 0,
        start_date: targetForm.start_date,
        end_date: targetForm.end_date,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Target set successfully');
      setTargetDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['salesman-control-targets'] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  // ─── Assign stores mutation ───
  const assignStoresMutation = useMutation({
    mutationFn: async () => {
      if (!selectedSalesman || selectedStoreIds.length === 0) throw new Error('Select stores to assign');
      const rows = selectedStoreIds.map(cid => ({
        business_id: businessId,
        salesman_id: selectedSalesman,
        customer_id: cid,
      }));
      const { error } = await (supabase as any).from('salesman_stores').upsert(rows, { onConflict: 'salesman_id,customer_id' });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(`${selectedStoreIds.length} store(s) assigned`);
      setStoreDialogOpen(false);
      setSelectedStoreIds([]);
      queryClient.invalidateQueries({ queryKey: ['salesman-control-assignments'] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  // ─── Remove store assignment ───
  const removeAssignmentMutation = useMutation({
    mutationFn: async (assignmentId: string) => {
      const { error } = await (supabase as any).from('salesman_stores').delete().eq('id', assignmentId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Store unassigned');
      queryClient.invalidateQueries({ queryKey: ['salesman-control-assignments'] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  // ─── Delete target ───
  const deleteTargetMutation = useMutation({
    mutationFn: async (targetId: string) => {
      const { error } = await (supabase as any).from('salesman_targets').delete().eq('id', targetId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Target deleted');
      queryClient.invalidateQueries({ queryKey: ['salesman-control-targets'] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Filter customers for assignment dialog (exclude already assigned)
  const assignedIds = allAssignments.filter((a: any) => a.salesman_id === selectedSalesman).map((a: any) => a.customer_id);
  const availableCustomers = allCustomers.filter((c: any) => {
    if (assignedIds.includes(c.id)) return false;
    if (!storeSearch) return true;
    const q = storeSearch.toLowerCase();
    return c.name?.toLowerCase().includes(q) || (c.phone || '').includes(q) || (c.store_type || '').toLowerCase().includes(q);
  });

  // Salesman targets (for selected)
  const salesmanTargets = allTargets.filter((t: any) => t.salesman_id === selectedSalesman);

  // Salesman bills (for selected)
  const salesmanBills = allBills.filter((b: any) => b.created_by === selectedSalesman);

  // KPI summary
  const totalMonthSales = enrichedSalesmen.reduce((s: number, sm: any) => s + sm.monthSales, 0);
  const totalMonthBills = enrichedSalesmen.reduce((s: number, sm: any) => s + sm.monthBills, 0);

  return (
    <div className="space-y-5 p-1">
      {/* ─── Header ─── */}
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2"><Users className="h-5 w-5" /> Salesman Control</h1>
        <p className="text-sm text-muted-foreground">Manage salesmen, set targets, assign stores, track performance</p>
      </div>

      {/* ─── Overview KPIs ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MiniKPI icon={Users} label="Total Salesmen" value={String(salesmen.length)} color="blue" />
        <MiniKPI icon={IndianRupee} label="Month Sales (All)" value={`${cs}${totalMonthSales.toLocaleString('en-IN')}`} color="emerald" />
        <MiniKPI icon={FileText} label="Month Bills (All)" value={String(totalMonthBills)} color="violet" />
        <MiniKPI icon={Store} label="Stores Assigned" value={String(allAssignments.length)} color="amber" />
      </div>

      {loadingSalesmen ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
      ) : salesmen.length === 0 ? (
        <Card><CardContent className="py-16 text-center">
          <Users className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
          <p className="text-muted-foreground font-medium">No Salesmen Yet</p>
          <p className="text-xs text-muted-foreground mt-1">Share your business join code with salesmen so they can join.</p>
        </CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* ─── Left: Salesmen List ─── */}
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-muted-foreground">Salesmen ({salesmen.length})</h2>
            {enrichedSalesmen.map((s: any) => (
              <Card key={s.user_id}
                className={cn('cursor-pointer transition-all hover:shadow-md',
                  selectedSalesman === s.user_id && 'border-primary shadow-md')}
                onClick={() => { setSelectedSalesman(s.user_id); setDetailTab('overview'); }}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate">{s.name}</p>
                      <p className="text-xs text-muted-foreground">{s.email}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  </div>
                  <div className="flex items-center gap-3 mt-2 text-xs">
                    <span className="flex items-center gap-1"><ShoppingCart className="h-3 w-3" /> {s.monthBills} bills</span>
                    <span className="flex items-center gap-1"><IndianRupee className="h-3 w-3" /> {cs}{s.monthSales.toLocaleString('en-IN')}</span>
                    <span className="flex items-center gap-1"><Store className="h-3 w-3" /> {s.storeCount}</span>
                  </div>
                  {s.currentTarget && (
                    <Progress value={s.targetPct} className="h-1.5 mt-2" />
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* ─── Right: Salesman Detail ─── */}
          <div className="lg:col-span-2">
            {!selected ? (
              <Card><CardContent className="py-16 text-center text-muted-foreground">
                <UserCheck className="h-8 w-8 mx-auto mb-2 opacity-50" />
                Select a salesman to view details
              </CardContent></Card>
            ) : (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center justify-between">
                    <span>{selected.name}</span>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="gap-1"
                        onClick={() => {
                          setTargetForm({
                            period: 'monthly',
                            target_amount: '',
                            target_bills: '',
                            start_date: format(startOfMonth(today), 'yyyy-MM-dd'),
                            end_date: format(endOfMonth(today), 'yyyy-MM-dd'),
                          });
                          setTargetDialogOpen(true);
                        }}>
                        <Target className="h-3 w-3" /> Set Target
                      </Button>
                      <Button size="sm" variant="outline" className="gap-1"
                        onClick={() => { setStoreSearch(''); setSelectedStoreIds([]); setStoreDialogOpen(true); }}>
                        <Store className="h-3 w-3" /> Assign Stores
                      </Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Tabs value={detailTab} onValueChange={setDetailTab}>
                    <TabsList className="w-full grid grid-cols-3">
                      <TabsTrigger value="overview">Overview</TabsTrigger>
                      <TabsTrigger value="targets">Targets</TabsTrigger>
                      <TabsTrigger value="stores">Stores</TabsTrigger>
                    </TabsList>

                    {/* ─── Overview Tab ─── */}
                    <TabsContent value="overview" className="space-y-4 mt-4">
                      <div className="grid grid-cols-3 gap-3">
                        <Card><CardContent className="p-3 text-center">
                          <p className="text-xl font-bold">{selected.monthBills}</p>
                          <p className="text-[11px] text-muted-foreground">Bills This Month</p>
                        </CardContent></Card>
                        <Card><CardContent className="p-3 text-center">
                          <p className="text-xl font-bold">{cs}{selected.monthSales.toLocaleString('en-IN')}</p>
                          <p className="text-[11px] text-muted-foreground">Sales This Month</p>
                        </CardContent></Card>
                        <Card><CardContent className="p-3 text-center">
                          <p className="text-xl font-bold">{selected.storeCount}</p>
                          <p className="text-[11px] text-muted-foreground">Assigned Stores</p>
                        </CardContent></Card>
                      </div>

                      {selected.currentTarget && (
                        <div>
                          <p className="text-sm font-medium mb-2">Current Target Progress</p>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-muted-foreground">
                              {format(parseISO(selected.currentTarget.start_date), 'dd MMM')} – {format(parseISO(selected.currentTarget.end_date), 'dd MMM')}
                            </span>
                            <span className="font-semibold">{Math.round(selected.targetPct)}%</span>
                          </div>
                          <Progress value={selected.targetPct} className="h-3" />
                          <p className="text-xs text-muted-foreground mt-1">
                            {cs}{selected.monthSales.toLocaleString('en-IN')} / {cs}{Number(selected.currentTarget.target_amount).toLocaleString('en-IN')}
                          </p>
                        </div>
                      )}

                      <div>
                        <p className="text-xs text-muted-foreground">
                          Joined: {format(new Date(selected.joined), 'dd MMM yyyy')} · Total bills: {selected.totalBills}
                        </p>
                      </div>
                    </TabsContent>

                    {/* ─── Targets Tab ─── */}
                    <TabsContent value="targets" className="mt-4">
                      {salesmanTargets.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-8">No targets set. Click "Set Target" to create one.</p>
                      ) : (
                        <div className="space-y-3">
                          {salesmanTargets.map((t: any) => {
                            const isCurrent = isWithinInterval(today, { start: parseISO(t.start_date), end: parseISO(t.end_date) });
                            const billsInRange = salesmanBills.filter((b: any) => {
                              const d = new Date(b.created_at);
                              return d >= parseISO(t.start_date) && d <= parseISO(t.end_date);
                            });
                            const achieved = billsInRange.reduce((s: number, b: any) => s + Number(b.total_amount || 0), 0);
                            const pct = t.target_amount > 0 ? Math.min(100, (achieved / t.target_amount) * 100) : 0;

                            return (
                              <div key={t.id} className="border rounded-lg p-3">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <Badge variant={isCurrent ? 'default' : 'secondary'} className="text-[10px]">
                                      {isCurrent ? 'Active' : 'Past'}
                                    </Badge>
                                    <span className="text-sm font-medium capitalize">{t.period}</span>
                                    <span className="text-xs text-muted-foreground">
                                      {format(parseISO(t.start_date), 'dd MMM')} – {format(parseISO(t.end_date), 'dd MMM yy')}
                                    </span>
                                  </div>
                                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive"
                                    onClick={() => deleteTargetMutation.mutate(t.id)}>
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                                <div className="flex items-center gap-3">
                                  <Progress value={pct} className="h-2 flex-1" />
                                  <span className="text-xs font-semibold">{cs}{achieved.toLocaleString('en-IN')} / {cs}{Number(t.target_amount).toLocaleString('en-IN')}</span>
                                </div>
                                {t.target_bills > 0 && (
                                  <p className="text-xs text-muted-foreground mt-1">Bills target: {t.target_bills}</p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </TabsContent>

                    {/* ─── Stores Tab ─── */}
                    <TabsContent value="stores" className="mt-4">
                      {selected.stores.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-8">No stores assigned. Click "Assign Stores" to add.</p>
                      ) : (
                        <div className="space-y-2">
                          {selected.stores.map((a: any) => (
                            <div key={a.id} className="flex items-center justify-between py-2 px-3 border rounded-lg">
                              <div className="min-w-0">
                                <p className="text-sm font-medium truncate">{a.customers?.name || 'Unknown'}</p>
                                <p className="text-xs text-muted-foreground">
                                  {[a.customers?.store_type, a.customers?.location_name, a.customers?.pincode].filter(Boolean).join(' · ')}
                                </p>
                              </div>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive flex-shrink-0"
                                onClick={() => removeAssignmentMutation.mutate(a.id)}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* ─── Set Target Dialog ─── */}
      <Dialog open={targetDialogOpen} onOpenChange={setTargetDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Target for {selected?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Period</Label>
              <Select value={targetForm.period} onValueChange={v => {
                setTargetForm(f => ({ ...f, period: v }));
              }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Start Date</Label>
                <Input type="date" value={targetForm.start_date} onChange={e => setTargetForm(f => ({ ...f, start_date: e.target.value }))} />
              </div>
              <div>
                <Label>End Date</Label>
                <Input type="date" value={targetForm.end_date} onChange={e => setTargetForm(f => ({ ...f, end_date: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>Target Amount ({cs})</Label>
              <Input type="number" placeholder="e.g. 50000" value={targetForm.target_amount}
                onChange={e => setTargetForm(f => ({ ...f, target_amount: e.target.value }))} />
            </div>
            <div>
              <Label>Target Bills (optional)</Label>
              <Input type="number" placeholder="e.g. 100" value={targetForm.target_bills}
                onChange={e => setTargetForm(f => ({ ...f, target_bills: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTargetDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => saveTargetMutation.mutate()} disabled={saveTargetMutation.isPending}>
              {saveTargetMutation.isPending ? 'Saving...' : 'Save Target'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Assign Stores Dialog ─── */}
      <Dialog open={storeDialogOpen} onOpenChange={setStoreDialogOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Assign Stores to {selected?.name}</DialogTitle>
          </DialogHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search customers/stores..." value={storeSearch} onChange={e => setStoreSearch(e.target.value)} className="pl-9" />
          </div>
          <div className="flex-1 overflow-y-auto border rounded-lg min-h-0 max-h-[400px]">
            {availableCustomers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No unassigned customers found.</p>
            ) : (
              availableCustomers.map((c: any) => (
                <label key={c.id} className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted/50 cursor-pointer border-b last:border-b-0">
                  <Checkbox
                    checked={selectedStoreIds.includes(c.id)}
                    onCheckedChange={(checked) => {
                      setSelectedStoreIds(prev =>
                        checked ? [...prev, c.id] : prev.filter(id => id !== c.id)
                      );
                    }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{c.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {[c.store_type, c.location_name, c.pincode, c.phone].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                </label>
              ))
            )}
          </div>
          <DialogFooter>
            <div className="flex items-center justify-between w-full">
              <span className="text-sm text-muted-foreground">{selectedStoreIds.length} selected</span>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStoreDialogOpen(false)}>Cancel</Button>
                <Button onClick={() => assignStoresMutation.mutate()}
                  disabled={selectedStoreIds.length === 0 || assignStoresMutation.isPending}>
                  {assignStoresMutation.isPending ? 'Assigning...' : `Assign ${selectedStoreIds.length} Store(s)`}
                </Button>
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MiniKPI({ icon: Icon, label, value, color }: {
  icon: React.ElementType; label: string; value: string; color: 'blue' | 'emerald' | 'violet' | 'amber';
}) {
  const bg = { blue: 'bg-blue-50 dark:bg-blue-950/30', emerald: 'bg-emerald-50 dark:bg-emerald-950/30', violet: 'bg-violet-50 dark:bg-violet-950/30', amber: 'bg-amber-50 dark:bg-amber-950/30' };
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className={cn('p-2 rounded-lg', bg[color])}>
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-lg font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
