// @ts-nocheck
/**
 * pages/Purchases.tsx — Purchase Orders List
 *
 * Lists all purchase orders with status, supplier, total, and date.
 * Allows creating a new purchase order and viewing/receiving existing ones.
 * Owner / Manager only.
 */
import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useBusinessSettings } from '@/hooks/useBusinessSettings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search, ShoppingBag, X, Truck, CheckCircle2, Clock, XCircle, FileText } from 'lucide-react';
import { format } from 'date-fns';

interface PurchaseOrder {
  id: string;
  order_number: string;
  status: 'draft' | 'ordered' | 'received' | 'cancelled';
  total_amount: number;
  ordered_at: string | null;
  received_at: string | null;
  created_at: string;
  suppliers: { name: string } | null;
}

const STATUS_CONFIG = {
  draft:     { label: 'Draft',     color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: FileText },
  ordered:   { label: 'Ordered',   color: 'bg-blue-100 text-blue-800 border-blue-200',       icon: Clock },
  received:  { label: 'Received',  color: 'bg-green-100 text-green-800 border-green-200',    icon: CheckCircle2 },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-800 border-red-200',          icon: XCircle },
};

export default function Purchases() {
  const { businessId } = useAuth();
  const { data: settings } = useBusinessSettings();
  const navigate = useNavigate();
  const currencySymbol = settings?.currency_symbol || '₹';

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['purchase-orders', businessId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('purchase_orders')
        .select('*, suppliers(name)')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as PurchaseOrder[];
    },
    enabled: !!businessId,
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return orders.filter(o => {
      const matchStatus = statusFilter === 'all' || o.status === statusFilter;
      const matchSearch =
        o.order_number.toLowerCase().includes(q) ||
        (o.suppliers?.name || '').toLowerCase().includes(q);
      return matchStatus && matchSearch;
    });
  }, [orders, search, statusFilter]);

  const stats = useMemo(() => ({
    total: orders.length,
    draft: orders.filter(o => o.status === 'draft').length,
    ordered: orders.filter(o => o.status === 'ordered').length,
    received: orders.filter(o => o.status === 'received').length,
  }), [orders]);

  return (
    <div className="space-y-5 p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="spos-page-heading">Purchases</h1>
          <p className="spos-page-subhead" style={{ marginBottom: 0 }}>
            Stock-in from suppliers via purchase orders
          </p>
        </div>
        <Button onClick={() => navigate('/purchase-order/new')} size="sm">
          <Plus className="mr-2 h-4 w-4" />
          New Purchase Order
        </Button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Orders', value: stats.total, color: 'text-foreground', bg: 'bg-muted/50' },
          { label: 'Draft', value: stats.draft, color: 'text-yellow-700', bg: 'bg-yellow-50 dark:bg-yellow-950/20' },
          { label: 'Ordered', value: stats.ordered, color: 'text-blue-700', bg: 'bg-blue-50 dark:bg-blue-950/20' },
          { label: 'Received', value: stats.received, color: 'text-green-700', bg: 'bg-green-50 dark:bg-green-950/20' },
        ].map(s => (
          <div key={s.label} className={`rounded-xl border p-3 ${s.bg}`}>
            <p className="text-xs text-muted-foreground font-medium">{s.label}</p>
            <p className={`text-2xl font-black mt-0.5 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search orders..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        {['all', 'draft', 'ordered', 'received', 'cancelled'].map(s => (
          <Button
            key={s}
            variant={statusFilter === s ? 'default' : 'outline'}
            size="sm"
            className="text-xs capitalize h-9"
            onClick={() => setStatusFilter(s)}
          >
            {s === 'all' ? 'All' : s}
          </Button>
        ))}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading purchase orders...</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <ShoppingBag className="h-12 w-12 mx-auto text-muted-foreground/30" />
              <p className="text-muted-foreground font-medium">
                {search || statusFilter !== 'all' ? 'No orders match your filter' : 'No purchase orders yet'}
              </p>
              {!search && statusFilter === 'all' && (
                <Button variant="outline" size="sm" onClick={() => navigate('/purchase-order/new')}>
                  <Plus className="mr-2 h-4 w-4" />Create first purchase order
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>PO Number</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="hidden md:table-cell">Date</TableHead>
                    <TableHead className="w-20 text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(o => {
                    const cfg = STATUS_CONFIG[o.status] || STATUS_CONFIG.draft;
                    const Icon = cfg.icon;
                    return (
                      <TableRow
                        key={o.id}
                        className="cursor-pointer hover:bg-muted/40"
                        onClick={() => navigate(`/purchase-order/${o.id}`)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                              <ShoppingBag className="h-4 w-4 text-primary" />
                            </div>
                            <span className="font-mono text-sm font-semibold">{o.order_number}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5 text-sm">
                            <Truck className="h-3.5 w-3.5 text-muted-foreground" />
                            {o.suppliers?.name || <span className="text-muted-foreground italic">No supplier</span>}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={`${cfg.color} border text-xs font-medium gap-1`} variant="outline">
                            <Icon className="h-3 w-3" />
                            {cfg.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {currencySymbol}{Number(o.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                          {format(new Date(o.created_at), 'dd MMM yyyy')}
                        </TableCell>
                        <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => navigate(`/purchase-order/${o.id}`)}
                          >
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
