import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Building2, Search, Download, Users, FileText, Package,
  CheckCircle2, Clock, AlertTriangle, Activity, Heart,
  ChevronLeft, ChevronRight, RefreshCw, TrendingUp,
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { cn } from '@/lib/utils';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';

function getHealthScore(bills: number, products: number, users: number, daysSinceJoin: number) {
  if (daysSinceJoin < 3) return { score: 'new', label: 'New', color: 'bg-blue-100 text-blue-700', icon: Clock };
  const activityScore = Math.min(bills * 3 + products * 2 + users, 100);
  if (activityScore >= 30) return { score: 'healthy', label: 'Healthy', color: 'bg-emerald-100 text-emerald-700', icon: Heart };
  if (activityScore >= 10) return { score: 'moderate', label: 'Moderate', color: 'bg-amber-100 text-amber-700', icon: Activity };
  return { score: 'inactive', label: 'At Risk', color: 'bg-red-100 text-red-700', icon: AlertTriangle };
}

const PAGE_SIZE = 20;

export default function TenantsTab() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [healthFilter, setHealthFilter] = useState('all');
  const [page, setPage] = useState(0);

  const { data: businesses = [], isLoading: loadingBiz, refetch } = useQuery({
    queryKey: ['tenants-businesses'],
    queryFn: async () => {
      const { data, error } = await supabase.from('businesses').select('id, business_name, owner_id, mobile_number, created_at').order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: subscriptions = [] } = useQuery({
    queryKey: ['tenants-subscriptions'],
    queryFn: async () => { const { data } = await (supabase.rpc as any)('get_all_subscriptions'); return (data || []) as any[]; },
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ['tenants-profiles'],
    queryFn: async () => { const { data } = await supabase.from('profiles').select('business_id'); return data || []; },
  });

  const { data: billCounts = [] } = useQuery({
    queryKey: ['tenants-bill-counts'],
    queryFn: async () => { const { data } = await supabase.from('bills').select('business_id'); return data || []; },
  });

  const { data: productCounts = [] } = useQuery({
    queryKey: ['tenants-product-counts'],
    queryFn: async () => { const { data } = await supabase.from('products').select('business_id'); return data || []; },
  });

  const tenants = useMemo(() => {
    const subMap = new Map<string, any>();
    subscriptions.forEach((s: any) => subMap.set(s.business_id, s));
    const userCountMap = new Map<string, number>();
    profiles.forEach((p: any) => { if (p.business_id) userCountMap.set(p.business_id, (userCountMap.get(p.business_id) || 0) + 1); });
    const billCountMap = new Map<string, number>();
    billCounts.forEach((b: any) => { if (b.business_id) billCountMap.set(b.business_id, (billCountMap.get(b.business_id) || 0) + 1); });
    const prodCountMap = new Map<string, number>();
    productCounts.forEach((p: any) => { if (p.business_id) prodCountMap.set(p.business_id, (prodCountMap.get(p.business_id) || 0) + 1); });
    return businesses.map(b => {
      const sub = subMap.get(b.id);
      const bills = billCountMap.get(b.id) || 0;
      const products = prodCountMap.get(b.id) || 0;
      const users = userCountMap.get(b.id) || 0;
      const daysSinceJoin = differenceInDays(new Date(), new Date(b.created_at));
      return { ...b, sub, planName: sub?.plan_name || 'None', subStatus: sub?.status || 'none', bills, products, users, daysSinceJoin, health: getHealthScore(bills, products, users, daysSinceJoin) };
    });
  }, [businesses, subscriptions, profiles, billCounts, productCounts]);

  const filtered = useMemo(() => tenants.filter(t => {
    const matchSearch = !search || t.business_name?.toLowerCase().includes(search.toLowerCase()) || t.mobile_number?.includes(search);
    const matchStatus = statusFilter === 'all' || t.subStatus === statusFilter;
    const matchHealth = healthFilter === 'all' || t.health.score === healthFilter;
    return matchSearch && matchStatus && matchHealth;
  }), [tenants, search, statusFilter, healthFilter]);

  React.useEffect(() => { setPage(0); }, [search, statusFilter, healthFilter]);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const stats = useMemo(() => {
    const total = tenants.length;
    const active = tenants.filter(t => t.subStatus === 'active').length;
    const trial = tenants.filter(t => t.subStatus === 'trialing').length;
    const expired = tenants.filter(t => t.subStatus === 'expired').length;
    const healthy = tenants.filter(t => t.health.score === 'healthy').length;
    const atRisk = tenants.filter(t => t.health.score === 'inactive').length;
    const avgBills = total > 0 ? Math.round(tenants.reduce((s, t) => s + t.bills, 0) / total) : 0;
    const avgProducts = total > 0 ? Math.round(tenants.reduce((s, t) => s + t.products, 0) / total) : 0;
    return { total, active, trial, expired, healthy, atRisk, avgBills, avgProducts };
  }, [tenants]);

  const handleExport = () => {
    if (!filtered.length) { toast.error('No data'); return; }
    const rows = filtered.map(t => ({
      'Business': t.business_name, 'Phone': t.mobile_number || '', 'Plan': t.planName,
      'Status': t.subStatus, 'Health': t.health.label, 'Bills': t.bills,
      'Products': t.products, 'Team': t.users, 'Joined': format(new Date(t.created_at), 'yyyy-MM-dd'),
      'Days Active': t.daysSinceJoin,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Tenants');
    XLSX.writeFile(wb, `tenants_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    toast.success(`Exported ${rows.length} tenants`);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active': return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 text-[10px]">Active</Badge>;
      case 'trialing': return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 text-[10px]">Trial</Badge>;
      case 'expired': return <Badge className="bg-red-100 text-red-700 hover:bg-red-100 text-[10px]">Expired</Badge>;
      default: return <Badge variant="outline" className="text-[10px]">No Plan</Badge>;
    }
  };

  const KPI_CARDS = [
    { label: 'Total Tenants', value: stats.total, icon: Building2, color: 'text-slate-600', bg: 'bg-slate-100' },
    { label: 'Active', value: stats.active, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Trial', value: stats.trial, icon: Clock, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Expired', value: stats.expired, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50' },
    { label: 'Healthy', value: stats.healthy, icon: Heart, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'At Risk', value: stats.atRisk, icon: Activity, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Avg Bills/Shop', value: stats.avgBills, icon: FileText, color: 'text-violet-600', bg: 'bg-violet-50' },
    { label: 'Avg Products', value: stats.avgProducts, icon: Package, color: 'text-cyan-600', bg: 'bg-cyan-50' },
  ];

  if (loadingBiz) {
    return (<div className="space-y-6"><div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">{Array.from({length:8}).map((_,i)=><Skeleton key={i} className="h-24 rounded-xl"/>)}</div><Skeleton className="h-10"/><Skeleton className="h-96 rounded-xl"/></div>);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row justify-between gap-3">
        <div><h2 className="text-2xl font-bold tracking-tight">Shop Tenants</h2><p className="text-sm text-muted-foreground mt-1">Monitor tenant health, engagement, and subscription status.</p></div>
        <div className="flex gap-1.5 self-start">
          <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={handleExport}><Download className="h-3.5 w-3.5" />Export</Button>
          <Button variant="ghost" size="sm" className="h-9 w-9 p-0" onClick={() => refetch()}><RefreshCw className="h-3.5 w-3.5" /></Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {KPI_CARDS.map(card => (
          <Card key={card.label} className="group hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 border-slate-200/60">
            <CardContent className="p-3 flex flex-col items-center text-center gap-1.5">
              <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110", card.bg)}>
                <card.icon className={cn("h-4 w-4", card.color)} />
              </div>
              <p className="text-lg font-black tracking-tight leading-none">{card.value}</p>
              <p className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground leading-none">{card.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by business name or phone..." className="pl-9 h-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-36 h-9"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="trialing">Trial</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
            <SelectItem value="none">No Plan</SelectItem>
          </SelectContent>
        </Select>
        <Select value={healthFilter} onValueChange={setHealthFilter}>
          <SelectTrigger className="w-full sm:w-36 h-9"><SelectValue placeholder="Health" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Health</SelectItem>
            <SelectItem value="healthy">Healthy</SelectItem>
            <SelectItem value="moderate">Moderate</SelectItem>
            <SelectItem value="inactive">At Risk</SelectItem>
            <SelectItem value="new">New</SelectItem>
          </SelectContent>
        </Select>
        <Badge variant="outline" className="text-[10px] h-9 px-3 flex items-center shrink-0">{filtered.length} of {tenants.length}</Badge>
      </div>

      {/* Table */}
      <Card className="border-slate-200/60 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground"><Building2 className="h-12 w-12 mx-auto opacity-10 mb-4" /><p className="font-semibold text-foreground">No tenants found</p><p className="text-sm mt-1">Try adjusting your filters.</p></div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead>Business</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Health</TableHead>
                      <TableHead className="text-center">Bills</TableHead>
                      <TableHead className="text-center">Products</TableHead>
                      <TableHead className="text-center">Team</TableHead>
                      <TableHead>Joined</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paged.map(t => (
                      <TableRow key={t.id} className="hover:bg-muted/30 group">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                              <span className="text-xs font-bold text-primary">{(t.business_name || '?')[0].toUpperCase()}</span>
                            </div>
                            <div><p className="font-semibold text-sm">{t.business_name}</p><p className="text-[10px] text-muted-foreground">{t.mobile_number || 'No phone'}</p></div>
                          </div>
                        </TableCell>
                        <TableCell><Badge variant="outline" className="text-[10px]">{t.planName}</Badge></TableCell>
                        <TableCell>{getStatusBadge(t.subStatus)}</TableCell>
                        <TableCell><Badge className={cn('text-[10px] gap-1', t.health.color)}><t.health.icon className="h-3 w-3" />{t.health.label}</Badge></TableCell>
                        <TableCell className="text-center font-semibold text-sm">{t.bills}</TableCell>
                        <TableCell className="text-center font-semibold text-sm">{t.products}</TableCell>
                        <TableCell className="text-center font-semibold text-sm">{t.users}</TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {format(new Date(t.created_at), 'MMM dd, yyyy')}<br/>
                          <span className="text-[10px]">{t.daysSinceJoin}d ago</span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/20">
                  <p className="text-xs text-muted-foreground">Page {page + 1} of {totalPages} · {filtered.length} total</p>
                  <div className="flex gap-1.5">
                    <Button variant="outline" size="sm" className="h-7 w-7 p-0" disabled={page === 0} onClick={() => setPage(p => p - 1)}><ChevronLeft className="h-3.5 w-3.5" /></Button>
                    <Button variant="outline" size="sm" className="h-7 w-7 p-0" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}><ChevronRight className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
