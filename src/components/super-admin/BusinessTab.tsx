import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import {
  Building2, Globe, Eye, Trash2, CreditCard, ChevronLeft, ChevronRight,
  Users, Package, MapPin,
} from 'lucide-react';
import { format, addMonths } from 'date-fns';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { useAuth } from '@/contexts/AuthContext';

import BusinessProfile from './BusinessProfile';
import BusinessKPIBar from './businesses/BusinessKPIBar';
import BusinessFilters, { SortField } from './businesses/BusinessFilters';
import BulkActionsBar from './businesses/BulkActionsBar';

interface Props { plans: any[]; }

const PAGE_SIZE = 20;

export default function BusinessTab({ plans }: Props) {
  const qc = useQueryClient();
  const { customAdminId } = useAuth();

  // View state
  const [selectedBiz, setSelectedBiz] = useState<any>(null);

  // Filter state
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [planFilter, setPlanFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortField, setSortField] = useState<SortField>('created');
  const [sortAsc, setSortAsc] = useState(false);

  // Pagination
  const [page, setPage] = useState(0);

  // Bulk selection
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Action states
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [subscribingId, setSubscribingId] = useState<string | null>(null);

  // ── Data Queries ──
  const { data: businesses = [], isLoading } = useQuery({
    queryKey: ['super-admin-all-businesses'],
    queryFn: async () => {
      const [{ data: bizData, error: bizErr }, { data: settingsData }, { data: profilesData }] = await Promise.all([
        supabase.from('businesses').select('*').order('created_at', { ascending: false }),
        supabase.from('business_settings').select('*'),
        supabase.from('profiles').select('id, display_name, role'),
      ]);
      if (bizErr) throw bizErr;

      const settingsMap: Record<string, any> = {};
      (settingsData || []).forEach((s: any) => { settingsMap[s.business_id] = s; });
      const profilesMap: Record<string, any> = {};
      (profilesData || []).forEach((p: any) => { profilesMap[p.id] = p; });

      return (bizData || []).map((b: any) => {
        const s = settingsMap[b.id] || {};
        const owner = profilesMap[b.owner_id] || {};
        return {
          ...b,
          business_name: s.business_name || b.business_name,
          address: s.address || '',
          phone: s.phone || b.mobile_number || '',
          email: s.email || '',
          logo_url: s.logo_url || null,
          gstin: s.gstin || '',
          business_category: s.business_category || '',
          business_id: b.id,
          owner_name: owner.display_name || b.mobile_number || '',
        };
      });
    },
  });

  const { data: subsMap = {} } = useQuery({
    queryKey: ['super-admin-subs-map'],
    queryFn: async () => {
      const { data } = await (supabase.rpc as any)('get_all_subscriptions');
      const map: Record<string, any> = {};
      for (const s of (data || [])) { map[s.business_id] = s; }
      return map;
    },
  });

  // ── Derived Data ──
  const categories = useMemo(() => {
    const cats = new Set<string>();
    businesses.forEach(b => { if (b.business_category) cats.add(b.business_category); });
    return Array.from(cats).sort();
  }, [businesses]);

  const kpiStats = useMemo(() => {
    const subs = Object.values(subsMap as Record<string, any>);
    return {
      total: businesses.length,
      active: subs.filter((s: any) => s.status === 'active').length,
      trial: subs.filter((s: any) => s.status === 'trialing').length,
      expired: subs.filter((s: any) => s.status === 'expired').length,
      noPlan: businesses.length - subs.length,
      mrr: subs.filter((s: any) => s.status === 'active').reduce((sum: number, s: any) => sum + Number(s.plan_price || 0), 0),
      totalSales: 0, // Would need bills aggregate RPC
      activeSubs: subs.filter((s: any) => s.status === 'active' || s.status === 'trialing').length,
    };
  }, [businesses, subsMap]);

  // ── Filtering + Sorting ──
  const filtered = useMemo(() => {
    let list = businesses.filter(b => {
      const q = search.toLowerCase();
      const matchSearch = !q || b.business_name?.toLowerCase().includes(q) ||
        b.owner_name?.toLowerCase().includes(q) || b.phone?.includes(q) || b.email?.toLowerCase().includes(q);

      const bizId = b.business_id || b.id;
      const sub = (subsMap as Record<string, any>)[bizId];
      const matchStatus = statusFilter === 'all' ||
        (statusFilter === 'active' && sub?.status === 'active') ||
        (statusFilter === 'trialing' && sub?.status === 'trialing') ||
        (statusFilter === 'expired' && sub?.status === 'expired') ||
        (statusFilter === 'no-plan' && !sub);

      const matchPlan = planFilter === 'all' || sub?.plan_id === planFilter;
      const matchCategory = categoryFilter === 'all' || b.business_category === categoryFilter;

      return matchSearch && matchStatus && matchPlan && matchCategory;
    });

    list.sort((a, b) => {
      let cmp = 0;
      const subA = (subsMap as Record<string, any>)[a.business_id || a.id];
      const subB = (subsMap as Record<string, any>)[b.business_id || b.id];
      switch (sortField) {
        case 'name': cmp = (a.business_name || '').localeCompare(b.business_name || ''); break;
        case 'revenue': cmp = Number(subA?.plan_price || 0) - Number(subB?.plan_price || 0); break;
        case 'created': cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime(); break;
        case 'plan': cmp = (subA?.plan_name || '').localeCompare(subB?.plan_name || ''); break;
        case 'staff': cmp = Number(a.max_members || 0) - Number(b.max_members || 0); break;
      }
      return sortAsc ? cmp : -cmp;
    });

    return list;
  }, [businesses, subsMap, search, statusFilter, planFilter, categoryFilter, sortField, sortAsc]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  // Reset page when filters change
  React.useEffect(() => { setPage(0); }, [search, statusFilter, planFilter, categoryFilter, sortField, sortAsc]);

  // ── Actions ──
  const getSubBadge = (bizId: string) => {
    const sub = (subsMap as Record<string, any>)[bizId];
    if (!sub) return <Badge variant="outline" className="text-[9px] bg-muted/50">No Plan</Badge>;
    if (sub.status === 'active') {
      if (sub.current_period_end && new Date(sub.current_period_end).getFullYear() >= 2099)
        return <Badge className="text-[9px] bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Lifetime</Badge>;
      return <Badge className="text-[9px] bg-green-600 hover:bg-green-600 text-white">Active</Badge>;
    }
    if (sub.status === 'trialing') return <Badge className="text-[9px] bg-blue-100 text-blue-700 hover:bg-blue-100">Trial</Badge>;
    return <Badge variant="destructive" className="text-[9px]">Expired</Badge>;
  };

  const handleDelete = async (bizId: string, bizName: string) => {
    setDeletingId(bizId);
    try {
      const { error } = await (supabase.rpc as any)('delete_business_cascade', { p_business_id: bizId });
      if (error) throw error;
      await (supabase.rpc as any)('log_admin_action', {
        p_admin_id: customAdminId || 'unknown', p_action: 'delete_business',
        p_target_id: bizId, p_target_type: 'business', p_details: { business_name: bizName },
      });
      toast.success(`Deleted "${bizName}"`);
      qc.invalidateQueries({ queryKey: ['super-admin-all-businesses'] });
      setSelected(prev => { const n = new Set(prev); n.delete(bizId); return n; });
    } catch (err: any) { toast.error(err.message); }
    finally { setDeletingId(null); }
  };

  const handleQuickSubscribe = async (bizId: string, bizName: string) => {
    if (!plans.length) { toast.error('No active plans'); return; }
    setSubscribingId(bizId);
    try {
      const plan = plans[0];
      const { error } = await (supabase.rpc as any)('manage_business_subscription', {
        p_business_id: bizId, p_plan_id: plan.id, p_status: 'active',
        p_period_end: addMonths(new Date(), 1).toISOString(),
      });
      if (error) throw error;
      toast.success(`Assigned "${plan.name}" to "${bizName}"`);
      qc.invalidateQueries({ queryKey: ['super-admin-subs-map'] });
    } catch (err: any) { toast.error(err.message); }
    finally { setSubscribingId(null); }
  };

  const handleExport = () => {
    const rows = filtered.map(b => {
      const bizId = b.business_id || b.id;
      const sub = (subsMap as Record<string, any>)[bizId];
      return {
        'Business Name': b.business_name, 'Owner': b.owner_name,
        'Phone': b.phone, 'Email': b.email, 'Address': b.address,
        'Category': b.business_category, 'GST': b.gstin,
        'Plan': sub?.plan_name || 'None', 'Status': sub?.status || 'No Plan',
        'Plan Price': sub?.plan_price || 0,
        'Expiry': sub?.current_period_end ? format(new Date(sub.current_period_end), 'yyyy-MM-dd') : '',
        'Registered': format(new Date(b.created_at), 'yyyy-MM-dd'),
      };
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Businesses');
    XLSX.writeFile(wb, `businesses_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    toast.success(`Exported ${rows.length} businesses`);
  };

  // Bulk actions
  const toggleSelect = (id: string) => {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };
  const toggleSelectAll = () => {
    if (selected.size === paged.length) setSelected(new Set());
    else setSelected(new Set(paged.map(b => b.business_id || b.id)));
  };

  const handleBulkSuspend = async () => {
    for (const bizId of selected) {
      try {
        await (supabase.rpc as any)('manage_business_subscription', {
          p_business_id: bizId, p_plan_id: null, p_status: 'expired', p_period_end: new Date().toISOString(),
        });
      } catch {}
    }
    toast.success(`Suspended ${selected.size} businesses`);
    setSelected(new Set());
    qc.invalidateQueries({ queryKey: ['super-admin-subs-map'] });
  };

  const handleBulkExport = () => {
    const selectedBizs = filtered.filter(b => selected.has(b.business_id || b.id));
    const rows = selectedBizs.map(b => ({
      'Business Name': b.business_name, 'Owner': b.owner_name, 'Phone': b.phone,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Selected');
    XLSX.writeFile(wb, `selected_businesses_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    toast.success(`Exported ${rows.length} businesses`);
  };

  // ── Render ──
  if (selectedBiz) {
    return <BusinessProfile businessId={selectedBiz.business_id || selectedBiz.id} business={selectedBiz} plans={plans} onBack={() => setSelectedBiz(null)} />;
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Business Management</h2>
        <p className="text-sm text-muted-foreground mt-1">Monitor and manage all registered businesses on the platform.</p>
      </div>

      {/* KPIs */}
      <BusinessKPIBar stats={kpiStats} />

      {/* Filters */}
      <BusinessFilters
        search={search} onSearchChange={setSearch}
        statusFilter={statusFilter} onStatusChange={setStatusFilter}
        planFilter={planFilter} onPlanChange={setPlanFilter}
        categoryFilter={categoryFilter} onCategoryChange={setCategoryFilter}
        sortField={sortField} onSortChange={setSortField}
        sortAsc={sortAsc} onSortDirToggle={() => setSortAsc(p => !p)}
        plans={plans} categories={categories}
        filteredCount={filtered.length} totalCount={businesses.length}
        onExport={handleExport}
        onRefresh={() => qc.invalidateQueries({ queryKey: ['super-admin-all-businesses'] })}
      />

      {/* Table */}
      <Card className="border-slate-200/60 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <Globe className="h-12 w-12 opacity-10 mb-4" />
              <p className="font-semibold text-foreground">No Businesses Found</p>
              <p className="text-sm mt-1">{search ? 'Try a different search.' : 'No businesses registered yet.'}</p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead className="w-10"><Checkbox checked={selected.size === paged.length && paged.length > 0} onCheckedChange={toggleSelectAll} /></TableHead>
                      <TableHead>Business</TableHead>
                      <TableHead>Owner</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Staff</TableHead>
                      <TableHead>Registered</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paged.map(biz => {
                      const bizId = biz.business_id || biz.id;
                      const sub = (subsMap as Record<string, any>)[bizId];
                      const isSelected = selected.has(bizId);
                      return (
                        <TableRow key={biz.id} className={cn("group hover:bg-muted/30 transition-colors", isSelected && "bg-primary/5")}>
                          <TableCell><Checkbox checked={isSelected} onCheckedChange={() => toggleSelect(bizId)} /></TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              {biz.logo_url ? (
                                <img src={biz.logo_url} alt="" className="h-9 w-9 rounded-lg object-cover border" />
                              ) : (
                                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                  <span className="text-xs font-bold text-primary">{(biz.business_name || '?')[0].toUpperCase()}</span>
                                </div>
                              )}
                              <div className="min-w-0">
                                <p className="font-semibold text-sm truncate">{biz.business_name}</p>
                                {biz.address && <p className="text-[10px] text-muted-foreground flex items-center gap-0.5 truncate"><MapPin className="h-2.5 w-2.5 shrink-0" />{biz.address}</p>}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <p className="text-sm font-medium truncate max-w-[120px]">{biz.owner_name || '—'}</p>
                            {biz.phone && <p className="text-[10px] text-muted-foreground">{biz.phone}</p>}
                          </TableCell>
                          <TableCell>
                            {biz.business_category ? <Badge variant="outline" className="text-[9px]">{biz.business_category}</Badge> : <span className="text-xs text-muted-foreground">—</span>}
                          </TableCell>
                          <TableCell>
                            {sub?.plan_name ? <Badge variant="outline" className="text-[10px]">{sub.plan_name}</Badge> : <span className="text-xs text-muted-foreground italic">None</span>}
                          </TableCell>
                          <TableCell>{getSubBadge(bizId)}</TableCell>
                          <TableCell>
                            <span className="text-sm font-medium flex items-center gap-1"><Users className="h-3 w-3 text-muted-foreground" />{biz.max_members || 1}</span>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{format(new Date(biz.created_at), 'MMM dd, yyyy')}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                              <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => setSelectedBiz(biz)}><Eye className="h-3 w-3" />View</Button>
                              {!sub && (
                                <Button variant="outline" size="sm" className="h-7 text-xs gap-1 text-green-600 border-green-200 hover:bg-green-50"
                                  disabled={subscribingId === bizId} onClick={() => handleQuickSubscribe(bizId, biz.business_name)}>
                                  <CreditCard className="h-3 w-3" />Subscribe
                                </Button>
                              )}
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="outline" size="sm" className="h-7 w-7 p-0 text-red-600 border-red-200 hover:bg-red-50"><Trash2 className="h-3 w-3" /></Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete "{biz.business_name}"?</AlertDialogTitle>
                                    <AlertDialogDescription>This will permanently delete the business and ALL its data. This cannot be undone.</AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction className="bg-red-600 hover:bg-red-700" disabled={deletingId === bizId} onClick={() => handleDelete(bizId, biz.business_name)}>
                                      {deletingId === bizId ? 'Deleting...' : 'Delete Everything'}
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card List */}
              <div className="md:hidden divide-y divide-border">
                {paged.map(biz => {
                  const bizId = biz.business_id || biz.id;
                  const sub = (subsMap as Record<string, any>)[bizId];
                  return (
                    <div key={biz.id} className="px-4 py-3">
                      <button onClick={() => setSelectedBiz(biz)} className="w-full text-left">
                        <div className="flex items-center justify-between">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                <span className="text-xs font-bold text-primary">{(biz.business_name || '?')[0]}</span>
                              </div>
                              <div className="min-w-0">
                                <p className="font-semibold text-sm truncate">{biz.business_name}</p>
                                <p className="text-[10px] text-muted-foreground">{biz.owner_name || biz.phone}</p>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 ml-2 shrink-0">
                            {getSubBadge(bizId)}
                            <Eye className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </div>
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/20">
                  <p className="text-xs text-muted-foreground">
                    Page {page + 1} of {totalPages} · {filtered.length} total
                  </p>
                  <div className="flex gap-1.5">
                    <Button variant="outline" size="sm" className="h-7 w-7 p-0" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="outline" size="sm" className="h-7 w-7 p-0" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      <BulkActionsBar
        selectedCount={selected.size}
        onClear={() => setSelected(new Set())}
        onSuspend={handleBulkSuspend}
        onAssignPlan={() => toast.info('Select a plan from the Plans tab to bulk assign.')}
        onExport={handleBulkExport}
        onDelete={() => toast.info('Use individual delete for safety.')}
      />
    </div>
  );
}
