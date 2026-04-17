/**
 * pages/SalesmanOrders.tsx — Salesman Orders
 *
 * For owner/manager: Shows list of salesmen on left, click to see their generated orders.
 * Shows order date/time, customer, amount, status (pending/finalized).
 * Finalize button marks order as completed and updates salesman target.
 * Target progress shown with gray for unfinalized, theme color for finalized.
 */
import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import {
  Search, User, Target, TrendingUp, ShoppingCart, Check,
  Clock, ChevronRight, IndianRupee, Package, CalendarDays,
  Filter, ChevronDown, Download,
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfWeek, startOfDay, parseISO, isWithinInterval } from 'date-fns';
import { cn } from '@/lib/utils';
import DraftBillModal from '@/components/bills/DraftBillModal';
import { exportStyledExcel } from '@/lib/exportToExcel';
import type { ExcelTableDef, ExcelSummaryDef } from '@/lib/exportToExcel';

type DateRange = 'today' | 'week' | 'month' | 'all';
type StatusFilter = 'all' | 'draft' | 'completed';

const INITIAL_DISPLAY = 15;

export default function SalesmanOrders() {
  const { businessId, userRole } = useAuth();
  const queryClient = useQueryClient();
  const [selectedSalesman, setSelectedSalesman] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBillId, setSelectedBillId] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [showAll, setShowAll] = useState(false);
  const today = new Date();

  // ─── Fetch all salesmen ───
  const { data: salesmen = [] } = useQuery({
    queryKey: ['salesman-orders-salesmen', businessId],
    queryFn: async () => {
      const { data: roles, error } = await supabase
        .from('user_roles')
        .select('user_id, role, created_at')
        .eq('business_id', businessId!)
        .eq('role', 'salesman');
      if (error) throw error;
      if (!roles || roles.length === 0) return [];
      const userIds = roles.map((r: any) => r.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name')
        .in('user_id', userIds);
      return roles.map((r: any) => {
        const p = (profiles as any[])?.find(pr => pr.user_id === r.user_id);
        return { user_id: r.user_id, name: p?.display_name || r.user_id, joined: r.created_at };
      });
    },
    enabled: !!businessId,
  });

  // ─── Fetch ALL salesman-generated orders (draft with salesman_name set) ───
  const { data: allOrders = [] } = useQuery({
    queryKey: ['salesman-orders-all', businessId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('bills')
        .select('id, bill_number, total_amount, status, salesman_name, created_by, created_at, customer_id, customers(name, phone)')
        .eq('business_id', businessId!)
        .not('salesman_name', 'is', null)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!businessId,
    staleTime: 0,
    refetchOnMount: 'always',
  });

  // ─── Fetch targets ───
  const { data: allTargets = [] } = useQuery({
    queryKey: ['salesman-orders-targets', businessId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('salesman_targets')
        .select('*')
        .eq('business_id', businessId!)
        .order('start_date', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!businessId,
    staleTime: 0,
    refetchOnMount: 'always',
  });

  // ─── Per-salesman stats ───
  const enrichedSalesmen = useMemo(() => {
    const monthStart = startOfMonth(today);
    const monthEnd = endOfMonth(today);

    return salesmen.map((s: any) => {
      const orders = allOrders.filter((o: any) => o.created_by === s.user_id);
      const pendingOrders = orders.filter((o: any) => o.status === 'draft');
      const completedOrders = orders.filter((o: any) => o.status === 'completed');
      const monthOrders = orders.filter((o: any) => {
        const d = new Date(o.created_at);
        return d >= monthStart && d <= monthEnd;
      });
      const monthPending = monthOrders.filter((o: any) => o.status === 'draft');
      const monthCompleted = monthOrders.filter((o: any) => o.status === 'completed');
      const monthPendingAmount = monthPending.reduce((sum: number, o: any) => sum + Number(o.total_amount), 0);
      const monthCompletedAmount = monthCompleted.reduce((sum: number, o: any) => sum + Number(o.total_amount), 0);

      const currentTarget = allTargets.find((t: any) =>
        t.salesman_id === s.user_id &&
        isWithinInterval(today, { start: parseISO(t.start_date), end: parseISO(t.end_date) })
      );

      return {
        ...s,
        orders,
        pendingCount: pendingOrders.length,
        completedCount: completedOrders.length,
        totalOrders: orders.length,
        monthPendingAmount,
        monthCompletedAmount,
        monthTotal: monthPendingAmount + monthCompletedAmount,
        monthBills: monthOrders.length,
        currentTarget,
      };
    });
  }, [salesmen, allOrders, allTargets, today]);

  const selected = enrichedSalesmen.find((s: any) => s.user_id === selectedSalesman);

  // Orders for selected salesman (filtered by date, status, search)
  const selectedOrders = useMemo(() => {
    if (!selected) return [];

    let cutoff: Date | null = null;
    if (dateRange === 'today') cutoff = startOfDay(today);
    else if (dateRange === 'week') cutoff = startOfWeek(today, { weekStartsOn: 1 });
    else if (dateRange === 'month') cutoff = startOfMonth(today);

    return allOrders
      .filter((o: any) => o.created_by === selected.user_id)
      .filter((o: any) => !cutoff || new Date(o.created_at) >= cutoff)
      .filter((o: any) => statusFilter === 'all' || o.status === statusFilter)
      .filter((o: any) =>
        o.bill_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (o.customers?.name || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
  }, [selected, allOrders, searchTerm, dateRange, statusFilter]);

  const filteredPending = selectedOrders.filter((o: any) => o.status === 'draft');
  const filteredCompleted = selectedOrders.filter((o: any) => o.status === 'completed');
  const filteredAmount = selectedOrders.reduce((s: number, o: any) => s + Number(o.total_amount || 0), 0);

  const displayedOrders = showAll ? selectedOrders : selectedOrders.slice(0, INITIAL_DISPLAY);
  const hasMore = selectedOrders.length > INITIAL_DISPLAY;

  // Export selected salesman's orders
  const handleExportSalesmanOrders = () => {
    if (!selected || selectedOrders.length === 0) {
      return;
    }
    const fmtNum = (v: unknown) => v == null ? '' : Number(Number(v).toFixed(2));
    const rows = selectedOrders.map((o: any) => ({
      billNumber: o.bill_number || '',
      customer: o.customers?.name || 'Walk-in',
      phone: o.customers?.phone || '',
      amount: Number(o.total_amount || 0),
      status: o.status === 'completed' ? 'Finalized' : o.status === 'draft' ? 'Pending' : o.status,
      date: o.created_at ? format(new Date(o.created_at), 'dd MMM yyyy') : '',
      time: o.created_at ? format(new Date(o.created_at), 'hh:mm a') : '',
    }));
    const columns = [
      { key: 'billNumber', header: 'Order #' },
      { key: 'customer', header: 'Customer' },
      { key: 'phone', header: 'Phone' },
      { key: 'amount', header: 'Amount', format: fmtNum },
      { key: 'status', header: 'Status' },
      { key: 'date', header: 'Date' },
      { key: 'time', header: 'Time' },
    ];
    const summary: ExcelSummaryDef = {
      title: `Orders by ${selected.name} — ${format(today, 'dd MMM yyyy')}`,
      items: [
        { label: 'Total Orders', value: rows.length },
        { label: 'Pending', value: filteredPending.length },
        { label: 'Finalized', value: filteredCompleted.length },
        { label: 'Total Amount', value: filteredAmount.toFixed(2) },
        { label: 'Pending Amount', value: filteredPending.reduce((s: number, o: any) => s + Number(o.total_amount || 0), 0).toFixed(2) },
        { label: 'Finalized Amount', value: filteredCompleted.reduce((s: number, o: any) => s + Number(o.total_amount || 0), 0).toFixed(2) },
      ],
    };
    const tables: ExcelTableDef[] = [
      { title: `Orders — ${selected.name}`, titleColor: '1F4E79', data: rows, columns },
    ];
    exportStyledExcel(tables, summary, `salesman-orders-${selected.name.replace(/[^a-zA-Z0-9]/g, '-')}-${format(today, 'yyyy-MM-dd')}`);
  };

  // Summary
  const totalPending = enrichedSalesmen.reduce((a, s) => a + s.pendingCount, 0);
  const totalCompleted = enrichedSalesmen.reduce((a, s) => a + s.completedCount, 0);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="spos-page-heading">Salesman Orders</h1>
        <p className="spos-page-subhead mb-0">
          View salesman-generated orders. Finalize to complete and update targets.
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <User className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{salesmen.length}</p>
              <p className="text-xs text-muted-foreground">Salesmen</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <ShoppingCart className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalPending}</p>
              <p className="text-xs text-muted-foreground">Pending</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
              <Check className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalCompleted}</p>
              <p className="text-xs text-muted-foreground">Finalized</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main layout: Salesmen list | Orders detail */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* Left: Salesmen list */}
        <div className="md:col-span-4 space-y-2">
          <p className="text-sm font-semibold text-muted-foreground">Salesmen ({salesmen.length})</p>
          {enrichedSalesmen.length === 0 ? (
            <Card><CardContent className="py-10 text-center text-muted-foreground text-sm">No salesmen found</CardContent></Card>
          ) : (
            enrichedSalesmen.map((s) => (
              <Card
                key={s.user_id}
                className={cn(
                  "cursor-pointer transition-all hover:shadow-md",
                  selectedSalesman === s.user_id && "ring-2 ring-primary border-primary"
                )}
                onClick={() => { setSelectedSalesman(s.user_id); setSearchTerm(''); setDateRange('all'); setStatusFilter('all'); setShowAll(false); }}
              >
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                      {s.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{s.name}</p>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                        <span className="flex items-center gap-0.5"><ShoppingCart className="h-3 w-3" /> {s.totalOrders} orders</span>
                        {s.pendingCount > 0 && (
                          <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 bg-amber-50 text-amber-700 border-amber-200">
                            {s.pendingCount} pending
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Right: Selected salesman detail */}
        <div className="md:col-span-8">
          {!selected ? (
            <Card>
              <CardContent className="py-20 text-center text-muted-foreground">
                <User className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p className="font-medium">Select a salesman</p>
                <p className="text-sm mt-1">Click on a salesman to view their orders</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {/* Salesman header + target */}
              <Card>
                <CardContent className="p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-11 w-11 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                        {selected.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold">{selected.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {selected.totalOrders} total orders · {selected.pendingCount} pending · {selected.completedCount} finalized
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Target progress with gray (pending) + theme (finalized) */}
                  {selected.currentTarget && (
                    <div className="p-3 rounded-lg bg-muted/30 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium flex items-center gap-1">
                          <Target className="h-3 w-3" /> Current Target
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {format(parseISO(selected.currentTarget.start_date), 'dd MMM')} – {format(parseISO(selected.currentTarget.end_date), 'dd MMM yyyy')}
                        </span>
                      </div>
                      {selected.currentTarget.target_amount > 0 && (() => {
                        const targetAmt = Number(selected.currentTarget.target_amount);
                        const completedPct = Math.min(100, (selected.monthCompletedAmount / targetAmt) * 100);
                        const pendingPct = Math.min(100 - completedPct, (selected.monthPendingAmount / targetAmt) * 100);
                        return (
                          <div>
                            <div className="flex justify-between text-xs mb-1">
                              <span className="text-muted-foreground">Amount</span>
                              <span className="font-semibold">₹{selected.monthTotal.toLocaleString('en-IN', { maximumFractionDigits: 0 })} / ₹{targetAmt.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                            </div>
                            {/* Stacked bar: theme color for finalized, gray for pending */}
                            <div className="relative h-3 rounded-full bg-muted overflow-hidden">
                              <div
                                className="absolute inset-y-0 left-0 rounded-full bg-primary transition-all"
                                style={{ width: `${completedPct}%` }}
                              />
                              <div
                                className="absolute inset-y-0 rounded-full bg-gray-400 transition-all"
                                style={{ left: `${completedPct}%`, width: `${pendingPct}%` }}
                              />
                            </div>
                            <div className="flex gap-3 mt-1.5 text-[10px]">
                              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-primary" /> Finalized: ₹{selected.monthCompletedAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-gray-400" /> Pending: ₹{selected.monthPendingAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                            </div>
                          </div>
                        );
                      })()}
                      {selected.currentTarget.target_bills > 0 && (() => {
                        const targetBills = Number(selected.currentTarget.target_bills);
                        const completedBillsPct = Math.min(100, (selected.completedCount / targetBills) * 100);
                        const pendingBillsPct = Math.min(100 - completedBillsPct, (selected.pendingCount / targetBills) * 100);
                        return (
                          <div>
                            <div className="flex justify-between text-xs mb-1">
                              <span className="text-muted-foreground">Bills</span>
                              <span className="font-semibold">{selected.monthBills} / {targetBills}</span>
                            </div>
                            <div className="relative h-3 rounded-full bg-muted overflow-hidden">
                              <div
                                className="absolute inset-y-0 left-0 rounded-full bg-primary transition-all"
                                style={{ width: `${completedBillsPct}%` }}
                              />
                              <div
                                className="absolute inset-y-0 rounded-full bg-gray-400 transition-all"
                                style={{ left: `${completedBillsPct}%`, width: `${pendingBillsPct}%` }}
                              />
                            </div>
                            <div className="flex gap-3 mt-1.5 text-[10px]">
                              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-primary" /> Finalized: {selected.completedCount}</span>
                              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-gray-400" /> Pending: {selected.pendingCount}</span>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Orders section */}
              <Card>
                <CardHeader className="pb-2 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <CardTitle className="text-sm">Orders by {selected.name}</CardTitle>
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1 sm:max-w-[200px]">
                        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                          placeholder="Search orders..."
                          className="pl-8 h-8 text-xs"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                        />
                      </div>
                      {selectedOrders.length > 0 && (
                        <Button variant="outline" size="sm" className="h-8 text-xs gap-1 shrink-0" onClick={handleExportSalesmanOrders}>
                          <Download className="h-3 w-3" /> Export
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Date range + Status filter */}
                  <div className="flex flex-wrap gap-1.5">
                    {([
                      { key: 'today', label: 'Today' },
                      { key: 'week', label: 'This Week' },
                      { key: 'month', label: 'This Month' },
                      { key: 'all', label: 'All Time' },
                    ] as { key: DateRange; label: string }[]).map(({ key, label }) => (
                      <Button
                        key={key}
                        size="sm"
                        variant={dateRange === key ? 'default' : 'outline'}
                        className={cn("h-7 text-[11px] px-2.5 gap-1", dateRange === key && "shadow-sm")}
                        onClick={() => { setDateRange(key); setShowAll(false); }}
                      >
                        {key === 'today' && <CalendarDays className="h-3 w-3" />}
                        {label}
                      </Button>
                    ))}
                    <div className="w-px bg-border mx-1 hidden sm:block" />
                    {([
                      { key: 'all', label: 'All' },
                      { key: 'draft', label: 'Pending' },
                      { key: 'completed', label: 'Finalized' },
                    ] as { key: StatusFilter; label: string }[]).map(({ key, label }) => (
                      <Button
                        key={key}
                        size="sm"
                        variant={statusFilter === key ? 'secondary' : 'ghost'}
                        className={cn("h-7 text-[11px] px-2.5", statusFilter === key && "font-semibold")}
                        onClick={() => { setStatusFilter(key); setShowAll(false); }}
                      >
                        {label}
                      </Button>
                    ))}
                  </div>

                  {/* Filtered summary bar */}
                  {selectedOrders.length > 0 && (
                    <div className="flex items-center gap-4 text-xs px-3 py-2 rounded-lg bg-muted/40">
                      <span className="font-semibold">{selectedOrders.length} orders</span>
                      <span className="text-muted-foreground">·</span>
                      <span className="text-primary font-semibold">₹{filteredAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                      <span className="text-muted-foreground">·</span>
                      <span className="text-amber-600">{filteredPending.length} pending</span>
                      <span className="text-muted-foreground">·</span>
                      <span className="text-green-600">{filteredCompleted.length} finalized</span>
                    </div>
                  )}
                </CardHeader>
                <CardContent>
                  {selectedOrders.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground text-sm">
                      No orders found{dateRange !== 'all' || statusFilter !== 'all' ? ' for this filter' : ''}
                    </div>
                  ) : (
                    <>
                      {/* Mobile cards */}
                      <div className="space-y-2 sm:hidden">
                        {displayedOrders.map((order: any) => (
                          <div key={order.id} className="flex items-center justify-between py-2.5 px-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className="text-xs font-semibold">{order.bill_number}</span>
                                {order.status === 'draft' ? (
                                  <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[9px] px-1.5">Pending</Badge>
                                ) : (
                                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-[9px] px-1.5">Finalized</Badge>
                                )}
                              </div>
                              <p className="text-[11px] text-muted-foreground">{order.customers?.name || 'Walk-in'}</p>
                              <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                                <Clock className="h-2.5 w-2.5" />
                                {format(new Date(order.created_at), 'dd MMM, hh:mm a')}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0 ml-2">
                              <span className="text-xs font-bold text-primary">₹{Number(order.total_amount).toFixed(0)}</span>
                              {order.status === 'draft' && (userRole === 'owner' || userRole === 'manager' || userRole === 'cashier') && (
                                <Button size="sm" className="h-7 text-[10px] px-2" onClick={() => setSelectedBillId(order.id)}>
                                  <Check className="h-3 w-3 mr-0.5" /> Finalize
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Desktop table */}
                      <div className="rounded-md border hidden sm:block">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="text-xs">Order #</TableHead>
                              <TableHead className="text-xs">Customer</TableHead>
                              <TableHead className="text-xs">Amount</TableHead>
                              <TableHead className="text-xs">Status</TableHead>
                              <TableHead className="text-xs">Date & Time</TableHead>
                              <TableHead className="text-xs text-right">Action</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {displayedOrders.map((order: any) => (
                              <TableRow key={order.id}>
                                <TableCell className="text-xs font-medium">{order.bill_number}</TableCell>
                                <TableCell className="text-xs">
                                  <div>
                                    <p className="font-medium">{order.customers?.name || 'Walk-in'}</p>
                                    {order.customers?.phone && <p className="text-[10px] text-muted-foreground">{order.customers.phone}</p>}
                                  </div>
                                </TableCell>
                                <TableCell className="text-xs font-semibold text-primary">₹{Number(order.total_amount).toFixed(0)}</TableCell>
                                <TableCell>
                                  {order.status === 'draft' ? (
                                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px]">Pending</Badge>
                                  ) : order.status === 'completed' ? (
                                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-[10px]">Finalized</Badge>
                                  ) : (
                                    <Badge variant="outline" className="text-[10px]">{order.status}</Badge>
                                  )}
                                </TableCell>
                                <TableCell className="text-xs text-muted-foreground">
                                  <div className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {format(new Date(order.created_at), 'dd MMM yyyy, hh:mm a')}
                                  </div>
                                </TableCell>
                                <TableCell className="text-right">
                                  {order.status === 'draft' && (userRole === 'owner' || userRole === 'manager' || userRole === 'cashier') && (
                                    <Button size="sm" variant="default" className="h-7 text-xs" onClick={() => setSelectedBillId(order.id)}>
                                      <Check className="h-3 w-3 mr-1" /> Finalize
                                    </Button>
                                  )}
                                  {order.status === 'completed' && (
                                    <span className="text-[10px] text-green-600 font-medium">Done</span>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>

                      {/* See More */}
                      {hasMore && !showAll && (
                        <div className="flex justify-center pt-3">
                          <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8 px-5" onClick={() => setShowAll(true)}>
                            <ChevronDown className="h-3.5 w-3.5" />
                            Show All ({selectedOrders.length - INITIAL_DISPLAY} more)
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* DraftBillModal for editing items, payment method, and finalizing */}
      {selectedBillId && (
        <DraftBillModal
          billId={selectedBillId}
          open={!!selectedBillId}
          mode="salesman-order"
          onClose={() => {
            setSelectedBillId(null);
            queryClient.invalidateQueries({ queryKey: ['salesman-orders-all'] });
            queryClient.invalidateQueries({ queryKey: ['salesman-orders-targets'] });
            queryClient.invalidateQueries({ queryKey: ['salesman-control-bills'] });
            queryClient.invalidateQueries({ queryKey: ['bills'] });
          }}
        />
      )}
    </div>
  );
}
