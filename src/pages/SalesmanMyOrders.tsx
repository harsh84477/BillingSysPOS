/**
 * pages/SalesmanMyOrders.tsx — Salesman's own generated orders
 *
 * Replaces "Draft Bills" for salesman role.
 * Shows all orders the salesman has generated with status (Pending / Finalized).
 */
import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Search, ShoppingCart, Clock, Check, Package, Filter,
  IndianRupee, TrendingUp, Loader2, Pencil
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import DraftBillModal from '@/components/bills/DraftBillModal';

type StatusFilter = 'all' | 'draft' | 'completed';

export default function SalesmanMyOrders() {
  const { businessId, user } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedBillId, setSelectedBillId] = useState<string | null>(null);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['salesman-my-orders', user?.id, businessId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('bills')
        .select('id, bill_number, total_amount, status, salesman_name, created_at, customer_id, customers(name, phone)')
        .eq('business_id', businessId!)
        .eq('created_by', user?.id)
        .not('salesman_name', 'is', null)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!businessId && !!user?.id,
  });

  const filtered = useMemo(() => {
    return orders
      .filter((o: any) => statusFilter === 'all' || o.status === statusFilter)
      .filter((o: any) =>
        o.bill_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (o.customers?.name || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
  }, [orders, statusFilter, searchTerm]);

  const pendingCount = orders.filter((o: any) => o.status === 'draft').length;
  const finalizedCount = orders.filter((o: any) => o.status === 'completed').length;
  const pendingAmount = orders.filter((o: any) => o.status === 'draft').reduce((s: number, o: any) => s + Number(o.total_amount), 0);
  const finalizedAmount = orders.filter((o: any) => o.status === 'completed').reduce((s: number, o: any) => s + Number(o.total_amount), 0);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="spos-page-heading">My Orders</h1>
        <p className="spos-page-subhead mb-0">Your generated orders and their finalization status.</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <Card>
          <CardContent className="p-3 flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
              <ShoppingCart className="h-4 w-4 text-blue-500" />
            </div>
            <div>
              <p className="text-lg font-bold leading-tight">{orders.length}</p>
              <p className="text-[10px] text-muted-foreground">Total Orders</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
              <Clock className="h-4 w-4 text-amber-500" />
            </div>
            <div>
              <p className="text-lg font-bold leading-tight">{pendingCount}</p>
              <p className="text-[10px] text-muted-foreground">Pending</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0">
              <Check className="h-4 w-4 text-green-500" />
            </div>
            <div>
              <p className="text-lg font-bold leading-tight">{finalizedCount}</p>
              <p className="text-[10px] text-muted-foreground">Finalized</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <TrendingUp className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-lg font-bold leading-tight">₹{finalizedAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
              <p className="text-[10px] text-muted-foreground">Finalized Sales</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2.5 items-start sm:items-center">
        <div className="relative flex-1 w-full sm:max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search orders..."
            className="pl-8 h-8 text-xs"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-1.5">
          {(['all', 'draft', 'completed'] as StatusFilter[]).map((f) => (
            <Button
              key={f}
              size="sm"
              variant={statusFilter === f ? 'default' : 'outline'}
              className="h-8 text-xs px-3"
              onClick={() => setStatusFilter(f)}
            >
              {f === 'all' ? 'All' : f === 'draft' ? `Pending (${pendingCount})` : `Finalized (${finalizedCount})`}
            </Button>
          ))}
        </div>
      </div>

      {/* Orders list */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <Package className="h-10 w-10 mx-auto mb-3 opacity-20" />
            <p className="font-medium">No orders found</p>
            <p className="text-sm mt-1">
              {orders.length === 0 ? 'Generate your first order from Quick Bill.' : 'Try changing your filter.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="space-y-2 sm:hidden">
            {filtered.map((order: any) => (
              <Card key={order.id}>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-semibold text-xs">{order.bill_number}</span>
                    {order.status === 'draft' ? (
                      <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px]">Pending</Badge>
                    ) : (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-[10px]">Finalized</Badge>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{order.customers?.name || 'Walk-in'}</span>
                    <span className="font-bold text-primary">₹{Number(order.total_amount).toFixed(0)}</span>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {format(new Date(order.created_at), 'dd MMM yyyy, hh:mm a')}
                    </div>
                    {order.status === 'draft' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs gap-1 border-primary/30 text-primary"
                        onClick={() => setSelectedBillId(order.id)}
                      >
                        <Pencil className="h-3 w-3" /> Edit
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Desktop table */}
          <Card className="hidden sm:block">
            <CardContent className="p-0">
              <div className="rounded-md border">
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
                    {filtered.map((order: any) => (
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
                          {order.status === 'draft' && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs gap-1"
                              onClick={() => setSelectedBillId(order.id)}
                            >
                              <Pencil className="h-3 w-3" /> Edit
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Edit Order Modal */}
      {selectedBillId && (
        <DraftBillModal
          billId={selectedBillId}
          open={!!selectedBillId}
          mode="edit-order"
          onClose={() => {
            setSelectedBillId(null);
            queryClient.invalidateQueries({ queryKey: ['salesman-my-orders'] });
            queryClient.invalidateQueries({ queryKey: ['salesman-orders-all'] });
            queryClient.invalidateQueries({ queryKey: ['products'] });
          }}
        />
      )}
    </div>
  );
}
