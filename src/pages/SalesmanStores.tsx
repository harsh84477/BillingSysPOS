/**
 * pages/SalesmanStores.tsx — Stores assigned to this salesman
 * Filters: store type, area, pincode, search
 * Click a store → see its bills/order history
 */
import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Store, Search, MapPin, Phone, Filter, ShoppingCart,
  ArrowLeft, IndianRupee, FileText, Plus, X,
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export default function SalesmanStores() {
  const { user, businessId } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedStoreId = searchParams.get('store');

  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterArea, setFilterArea] = useState('all');
  const [filterPincode, setFilterPincode] = useState('all');

  // ─── Fetch settings ───
  const { data: settings } = useQuery({
    queryKey: ['business-settings', businessId],
    queryFn: async () => {
      const { data } = await supabase.from('business_settings').select('currency_symbol').eq('business_id', businessId).maybeSingle();
      return data;
    },
    enabled: !!businessId,
  });
  const cs = settings?.currency_symbol || '₹';

  // ─── Fetch my assigned stores ───
  const { data: stores = [], isLoading } = useQuery({
    queryKey: ['salesman-stores-full', user?.id, businessId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('salesman_stores')
        .select('id, customer_id, assigned_at, customers(id, name, phone, email, address, store_type, location_name, pincode)')
        .eq('business_id', businessId)
        .eq('salesman_id', user!.id);
      if (error) throw error;
      return (data || []).map((s: any) => ({ ...s, ...s.customers, assignment_id: s.id, customer_id: s.customer_id }));
    },
    enabled: !!businessId && !!user?.id,
  });

  // ─── Fetch bills for selected store ───
  const { data: storeBills = [], isLoading: loadingBills } = useQuery({
    queryKey: ['store-bills', selectedStoreId, businessId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bills')
        .select('id, bill_number, total_amount, status, payment_status, created_at, salesman_name')
        .eq('business_id', businessId)
        .eq('customer_id', selectedStoreId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!businessId && !!selectedStoreId,
  });

  // ─── Filter options from data ───
  const storeTypes = useMemo(() => [...new Set(stores.map((s: any) => s.store_type).filter(Boolean))], [stores]);
  const areas = useMemo(() => [...new Set(stores.map((s: any) => s.location_name).filter(Boolean))], [stores]);
  const pincodes = useMemo(() => [...new Set(stores.map((s: any) => s.pincode).filter(Boolean))], [stores]);

  // ─── Filtered stores ───
  const filteredStores = useMemo(() => {
    const q = search.toLowerCase();
    return stores.filter((s: any) => {
      if (q && !s.name?.toLowerCase().includes(q) && !(s.phone || '').includes(q)) return false;
      if (filterType !== 'all' && s.store_type !== filterType) return false;
      if (filterArea !== 'all' && s.location_name !== filterArea) return false;
      if (filterPincode !== 'all' && s.pincode !== filterPincode) return false;
      return true;
    });
  }, [stores, search, filterType, filterArea, filterPincode]);

  // ─── Selected store detail ───
  const selectedStore = stores.find((s: any) => s.customer_id === selectedStoreId);
  const storeTotalOrders = storeBills.reduce((s: number, b: any) => s + Number(b.total_amount || 0), 0);
  const storeLastOrder = storeBills[0];

  const hasFilters = filterType !== 'all' || filterArea !== 'all' || filterPincode !== 'all';

  return (
    <div className="space-y-4 p-1">
      {/* ─── Header ─── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2"><Store className="h-5 w-5" /> My Stores</h1>
          <p className="text-sm text-muted-foreground">{stores.length} store{stores.length !== 1 ? 's' : ''} assigned to you</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => navigate('/salesman-billing')} className="gap-1">
          <Plus className="h-4 w-4" /> New Order
        </Button>
      </div>

      {/* ─── Search + Filters ─── */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search store name or phone..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[160px]"><Filter className="h-3 w-3 mr-1" /><SelectValue placeholder="Store Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {storeTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterArea} onValueChange={setFilterArea}>
          <SelectTrigger className="w-[160px]"><MapPin className="h-3 w-3 mr-1" /><SelectValue placeholder="Area" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Areas</SelectItem>
            {areas.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterPincode} onValueChange={setFilterPincode}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Pincode" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Pincodes</SelectItem>
            {pincodes.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={() => { setFilterType('all'); setFilterArea('all'); setFilterPincode('all'); }} className="gap-1">
            <X className="h-3 w-3" /> Clear
          </Button>
        )}
      </div>

      {/* ─── Stores Grid ─── */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
      ) : filteredStores.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          {stores.length === 0 ? 'No stores assigned to you yet.' : 'No stores match your filters.'}
        </CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredStores.map((store: any) => (
            <Card key={store.customer_id}
              className="cursor-pointer hover:shadow-md transition-all hover:border-primary/30"
              onClick={() => setSearchParams({ store: store.customer_id })}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-sm truncate">{store.name}</h3>
                    {store.phone && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Phone className="h-3 w-3" /> {store.phone}
                      </p>
                    )}
                  </div>
                  {store.store_type && <Badge variant="outline" className="text-[10px] flex-shrink-0 ml-2">{store.store_type}</Badge>}
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-3">
                  {store.location_name && (
                    <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{store.location_name}</span>
                  )}
                  {store.pincode && <span>{store.pincode}</span>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ─── Store Detail Dialog ─── */}
      <Dialog open={!!selectedStoreId} onOpenChange={(open) => { if (!open) setSearchParams({}); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {selectedStore && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Store className="h-5 w-5" /> {selectedStore.name}
                  {selectedStore.store_type && <Badge variant="outline" className="ml-2">{selectedStore.store_type}</Badge>}
                </DialogTitle>
              </DialogHeader>

              {/* Store info */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                {selectedStore.phone && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-4 w-4" /> {selectedStore.phone}
                  </div>
                )}
                {selectedStore.location_name && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4" /> {selectedStore.location_name}
                  </div>
                )}
                {selectedStore.pincode && (
                  <div className="text-muted-foreground">Pincode: {selectedStore.pincode}</div>
                )}
                {selectedStore.address && (
                  <div className="col-span-2 text-muted-foreground">{selectedStore.address}</div>
                )}
              </div>

              {/* Quick stats */}
              <div className="grid grid-cols-3 gap-3 my-2">
                <Card><CardContent className="p-3 text-center">
                  <p className="text-lg font-bold">{storeBills.length}</p>
                  <p className="text-[11px] text-muted-foreground">Total Orders</p>
                </CardContent></Card>
                <Card><CardContent className="p-3 text-center">
                  <p className="text-lg font-bold">{cs}{storeTotalOrders.toLocaleString('en-IN')}</p>
                  <p className="text-[11px] text-muted-foreground">Lifetime Value</p>
                </CardContent></Card>
                <Card><CardContent className="p-3 text-center">
                  <p className="text-lg font-bold">{storeLastOrder ? format(new Date(storeLastOrder.created_at), 'dd MMM') : '—'}</p>
                  <p className="text-[11px] text-muted-foreground">Last Order</p>
                </CardContent></Card>
              </div>

              {/* Orders table */}
              <div>
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-2"><FileText className="h-4 w-4" /> Order History</h4>
                {loadingBills ? (
                  <Skeleton className="h-24" />
                ) : storeBills.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">No orders yet for this store.</p>
                ) : (
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Bill #</TableHead>
                          <TableHead className="text-xs">Date</TableHead>
                          <TableHead className="text-xs text-right">Amount</TableHead>
                          <TableHead className="text-xs">Status</TableHead>
                          <TableHead className="text-xs">Payment</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {storeBills.map((bill: any) => (
                          <TableRow key={bill.id}>
                            <TableCell className="text-xs font-mono">{bill.bill_number}</TableCell>
                            <TableCell className="text-xs">{format(new Date(bill.created_at), 'dd MMM yy')}</TableCell>
                            <TableCell className="text-xs text-right font-semibold">{cs}{Number(bill.total_amount).toLocaleString('en-IN')}</TableCell>
                            <TableCell>
                              <Badge variant={bill.status === 'completed' ? 'default' : bill.status === 'draft' ? 'secondary' : 'outline'} className="text-[10px]">
                                {bill.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={bill.payment_status === 'paid' ? 'default' : 'outline'} className="text-[10px]">
                                {bill.payment_status || '—'}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>

              <Button onClick={() => navigate('/salesman-billing')} className="w-full gap-2 mt-2">
                <ShoppingCart className="h-4 w-4" /> Create New Order for {selectedStore.name}
              </Button>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
