/**
 * pages/SalesmanOrders.tsx — Sales Orders Overview
 *
 * Shows which salesman took how many orders and their target completion.
 * Owner/manager/cashier can see all salesmen's performance at a glance.
 */
import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search, User, Target, TrendingUp, ShoppingCart, Package } from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { Progress } from '@/components/ui/progress';

export default function SalesmanOrders() {
  const { businessId } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');

  // Get all salesman orders (bills with salesman_name)
  const { data: allOrders = [] } = useQuery({
    queryKey: ['salesmanAllOrders', businessId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('bills')
        .select('id, bill_number, total_amount, status, salesman_name, created_by, created_at, customers(name)')
        .eq('business_id', businessId!)
        .not('salesman_name', 'is', null)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!businessId,
  });

  // Get salesman targets for current month
  const { data: targets = [] } = useQuery({
    queryKey: ['salesmanTargets', businessId],
    queryFn: async () => {
      const now = new Date();
      const { data, error } = await (supabase as any)
        .from('salesman_targets')
        .select('*')
        .eq('business_id', businessId!)
        .lte('start_date', format(endOfMonth(now), 'yyyy-MM-dd'))
        .gte('end_date', format(startOfMonth(now), 'yyyy-MM-dd'));
      if (error) throw error;
      return data || [];
    },
    enabled: !!businessId,
  });

  // Aggregate per salesman
  const salesmanStats = useMemo(() => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    const map: Record<string, {
      name: string;
      salesman_id: string;
      totalOrders: number;
      pendingOrders: number;
      completedOrders: number;
      cancelledOrders: number;
      totalAmount: number;
      completedAmount: number;
      monthlyOrders: number;
      monthlyAmount: number;
      targetAmount: number;
      targetBills: number;
      recentOrders: typeof allOrders;
    }> = {};

    for (const order of allOrders) {
      const key = order.salesman_name || 'Unknown';
      if (!map[key]) {
        map[key] = {
          name: key,
          salesman_id: order.created_by,
          totalOrders: 0,
          pendingOrders: 0,
          completedOrders: 0,
          cancelledOrders: 0,
          totalAmount: 0,
          completedAmount: 0,
          monthlyOrders: 0,
          monthlyAmount: 0,
          targetAmount: 0,
          targetBills: 0,
          recentOrders: [],
        };
      }
      const s = map[key];
      s.totalOrders++;
      s.totalAmount += Number(order.total_amount);
      if (order.status === 'draft') s.pendingOrders++;
      else if (order.status === 'completed') {
        s.completedOrders++;
        s.completedAmount += Number(order.total_amount);
      }
      else if (order.status === 'cancelled') s.cancelledOrders++;

      const orderDate = new Date(order.created_at);
      if (orderDate >= monthStart && orderDate <= monthEnd) {
        s.monthlyOrders++;
        s.monthlyAmount += Number(order.total_amount);
      }

      if (s.recentOrders.length < 5) s.recentOrders.push(order);
    }

    // Attach targets
    for (const t of targets) {
      for (const key of Object.keys(map)) {
        if (map[key].salesman_id === t.salesman_id) {
          map[key].targetAmount = Number(t.target_amount);
          map[key].targetBills = Number(t.target_bills);
        }
      }
    }

    return Object.values(map);
  }, [allOrders, targets]);

  const filteredStats = salesmanStats.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Summary cards
  const totalPending = salesmanStats.reduce((a, s) => a + s.pendingOrders, 0);
  const totalCompleted = salesmanStats.reduce((a, s) => a + s.completedOrders, 0);
  const totalSalesAmount = salesmanStats.reduce((a, s) => a + s.completedAmount, 0);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="spos-page-heading">Sales Orders</h1>
        <p className="spos-page-subhead mb-0">
          Track salesman performance, order counts, and target progress.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <User className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{salesmanStats.length}</p>
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
              <Package className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalCompleted}</p>
              <p className="text-xs text-muted-foreground">Completed</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">₹{totalSalesAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
              <p className="text-xs text-muted-foreground">Total Sales</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="relative w-full sm:max-w-sm">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search salesman..."
          className="pl-8"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Per-salesman cards */}
      <div className="space-y-4">
        {filteredStats.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center text-muted-foreground">
              <User className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No salesman orders found</p>
              <p className="text-sm mt-1">Orders generated by salesmen will appear here.</p>
            </CardContent>
          </Card>
        ) : (
          filteredStats.map((s) => {
            const amountProgress = s.targetAmount > 0 ? Math.min(100, (s.monthlyAmount / s.targetAmount) * 100) : 0;
            const billsProgress = s.targetBills > 0 ? Math.min(100, (s.monthlyOrders / s.targetBills) * 100) : 0;

            return (
              <Card key={s.name}>
                <CardHeader className="pb-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                        {s.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <CardTitle className="text-base">{s.name}</CardTitle>
                        <CardDescription className="text-xs">
                          {s.totalOrders} total orders · ₹{s.totalAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })} total value
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                        {s.pendingOrders} pending
                      </Badge>
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        {s.completedOrders} completed
                      </Badge>
                      {s.cancelledOrders > 0 && (
                        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                          {s.cancelledOrders} cancelled
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Target Progress */}
                  {(s.targetAmount > 0 || s.targetBills > 0) && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 rounded-lg bg-muted/30">
                      {s.targetAmount > 0 && (
                        <div>
                          <div className="flex justify-between text-xs mb-1.5">
                            <span className="text-muted-foreground flex items-center gap-1">
                              <Target className="h-3 w-3" /> Amount Target
                            </span>
                            <span className="font-semibold">
                              ₹{s.monthlyAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })} / ₹{s.targetAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                            </span>
                          </div>
                          <Progress value={amountProgress} className="h-2" />
                          <p className="text-[10px] text-muted-foreground mt-1">{amountProgress.toFixed(0)}% achieved this month</p>
                        </div>
                      )}
                      {s.targetBills > 0 && (
                        <div>
                          <div className="flex justify-between text-xs mb-1.5">
                            <span className="text-muted-foreground flex items-center gap-1">
                              <Target className="h-3 w-3" /> Bills Target
                            </span>
                            <span className="font-semibold">
                              {s.monthlyOrders} / {s.targetBills}
                            </span>
                          </div>
                          <Progress value={billsProgress} className="h-2" />
                          <p className="text-[10px] text-muted-foreground mt-1">{billsProgress.toFixed(0)}% achieved this month</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Recent Orders */}
                  {s.recentOrders.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2">Recent Orders</p>
                      <div className="rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="text-xs">Order #</TableHead>
                              <TableHead className="text-xs">Customer</TableHead>
                              <TableHead className="text-xs">Amount</TableHead>
                              <TableHead className="text-xs">Status</TableHead>
                              <TableHead className="text-xs hidden sm:table-cell">Date</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {s.recentOrders.map((order) => (
                              <TableRow key={order.id}>
                                <TableCell className="text-xs font-medium">{order.bill_number}</TableCell>
                                <TableCell className="text-xs">{(order.customers as any)?.name || 'Walk-in'}</TableCell>
                                <TableCell className="text-xs font-semibold text-primary">₹{Number(order.total_amount).toFixed(0)}</TableCell>
                                <TableCell>
                                  <Badge
                                    variant="outline"
                                    className={
                                      order.status === 'draft'
                                        ? 'bg-amber-50 text-amber-700 border-amber-200 text-[10px]'
                                        : order.status === 'completed'
                                        ? 'bg-green-50 text-green-700 border-green-200 text-[10px]'
                                        : 'bg-red-50 text-red-700 border-red-200 text-[10px]'
                                    }
                                  >
                                    {order.status === 'draft' ? 'Pending' : order.status}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-xs text-muted-foreground hidden sm:table-cell">
                                  {format(new Date(order.created_at), 'dd MMM, hh:mm a')}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
