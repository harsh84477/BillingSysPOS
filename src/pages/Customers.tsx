import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useBusinessSettings } from '@/hooks/useBusinessSettings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { EmptyState } from '@/components/ui/EmptyState';
import { BillDetailsDialog } from '@/components/bills/BillDetailsDialog';
import { printBillReceipt } from '@/components/bills/BillReceiptPrint';
import { exportStyledExcel } from '@/lib/exportToExcel';
import { toast } from 'sonner';
import {
  Plus, Pencil, Trash2, Users, Search, Phone, Mail,
  Download, ShoppingBag, Calendar, Eye, Printer,
  ArrowLeft, TrendingUp, FileText, X,
} from 'lucide-react';
import {
  format, parseISO, startOfDay, endOfDay, isWithinInterval,
  startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  subMonths,
} from 'date-fns';

interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  store_type: string | null;
  location_name: string | null;
  pincode: string | null;
  notes: string | null;
  created_at: string;
}

interface CustomerBill {
  id: string;
  bill_number: string;
  total_amount: number;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  status: string;
  created_at: string;
  customer_id: string | null;
  customers?: { name: string } | null;
}

// ─── date filter presets ─────────────────────────
type DatePreset = 'all' | 'week' | 'month' | 'prevmonth';

function getPresetRange(preset: DatePreset): { from: Date; to: Date } | null {
  const now = new Date();
  if (preset === 'week')      return { from: startOfWeek(now, { weekStartsOn: 1 }), to: endOfWeek(now, { weekStartsOn: 1 }) };
  if (preset === 'month')     return { from: startOfMonth(now), to: endOfMonth(now) };
  if (preset === 'prevmonth') {
    const prev = subMonths(now, 1);
    return { from: startOfMonth(prev), to: endOfMonth(prev) };
  }
  return null;
}

const PRESET_LABELS: { id: DatePreset; label: string }[] = [
  { id: 'all',       label: 'All Time' },
  { id: 'week',      label: 'This Week' },
  { id: 'month',     label: 'This Month' },
  { id: 'prevmonth', label: 'Prev Month' },
];

const STATUS_STYLE: Record<string, string> = {
  completed: 'bg-green-100 text-green-800',
  cancelled:  'bg-red-100 text-red-800',
  due:        'bg-yellow-100 text-yellow-800',
  paid:       'bg-green-100 text-green-800',
};

// ─────────────────────────────────────────────────
export default function Customers() {
  const { isAdmin, isStaff, businessId } = useAuth();
  const queryClient = useQueryClient();
  const { data: settings } = useBusinessSettings();
  const currencySymbol = settings?.currency_symbol || 'Rs.';
  const canEdit = isAdmin || isStaff;

  /* list state */
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [storeTypeFilter, setStoreTypeFilter] = useState('all');
  const [pincodeFilter, setPincodeFilter] = useState('all');

  /* bills panel state */
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [billPreset, setBillPreset] = useState<DatePreset>('all');
  const [viewingBill, setViewingBill] = useState<CustomerBill | null>(null);

  // ── queries ──
  const { data: customers = [], isLoading } = useQuery<Customer[]>({
    queryKey: ['customers'],
    queryFn: async () => {
      let q = supabase.from('customers').select('*');
      if (businessId) q = q.eq('business_id', businessId);
      const { data, error } = await q.order('name');
      if (error) throw error;
      return data as Customer[];
    },
    enabled: !!businessId,
  });

  const { data: customerBills = [], isLoading: loadingBills } = useQuery<CustomerBill[]>({
    queryKey: ['customerBills', selectedCustomer?.id],
    queryFn: async () => {
      if (!selectedCustomer) return [];
      const { data, error } = await supabase
        .from('bills')
        .select('id, bill_number, total_amount, subtotal, discount_amount, tax_amount, status, created_at, customer_id')
        .eq('customer_id', selectedCustomer.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map(b => ({ ...b, customers: { name: selectedCustomer.name } })) as CustomerBill[];
    },
    enabled: !!selectedCustomer,
  });

  // ── filtered bills (by preset) ──
  const filteredBills = useMemo(() => {
    const range = getPresetRange(billPreset);
    if (!range) return customerBills;
    return customerBills.filter(b => {
      const d = parseISO(b.created_at);
      return isWithinInterval(d, { start: startOfDay(range.from), end: endOfDay(range.to) });
    });
  }, [customerBills, billPreset]);

  const filteredTotal = useMemo(
    () => filteredBills.reduce((s, b) => s + Number(b.total_amount), 0),
    [filteredBills],
  );

  // ── customer list filter ──
  const filteredCustomers = useMemo(() =>
    customers.filter(c => {
      const q = searchQuery.toLowerCase();
      const matchSearch = (
        c.name.toLowerCase().includes(q) ||
        (c.email || '').toLowerCase().includes(q) ||
        (c.phone || '').includes(searchQuery) ||
        (c.store_type || '').toLowerCase().includes(q) ||
        (c.location_name || '').toLowerCase().includes(q) ||
        (c.pincode || '').includes(searchQuery) ||
        (c.address || '').toLowerCase().includes(q)
      );
      
      const matchStoreType = storeTypeFilter === 'all' || c.store_type === storeTypeFilter;
      const matchPincode = pincodeFilter === 'all' || c.pincode === pincodeFilter;

      return matchSearch && matchStoreType && matchPincode;
    }),
    [customers, searchQuery, storeTypeFilter, pincodeFilter],
  );

  const uniqueStoreTypes = useMemo(() => 
    Array.from(new Set(customers.map(c => c.store_type).filter(Boolean))) as string[], 
  [customers]);
  
  const uniquePincodes = useMemo(() => 
    Array.from(new Set(customers.map(c => c.pincode).filter(Boolean))) as string[], 
  [customers]);

  // ── mutations ──
  const saveMutation = useMutation({
    mutationFn: async (customer: Partial<Customer>) => {
      if (editingCustomer) {
        const { error } = await supabase.from('customers').update(customer).eq('id', editingCustomer.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('customers').insert([{ ...customer, business_id: businessId } as { name: string }]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setIsDialogOpen(false);
      setEditingCustomer(null);
      toast.success(editingCustomer ? 'Customer updated' : 'Customer created');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('customers').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success('Customer deleted');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    saveMutation.mutate({
      name: fd.get('name') as string,
      email: (fd.get('email') as string) || null,
      phone: (fd.get('phone') as string) || null,
      address: (fd.get('address') as string) || null,
      store_type: (fd.get('store_type') as string) || null,
      location_name: (fd.get('location_name') as string) || null,
      pincode: (fd.get('pincode') as string) || null,
      notes: (fd.get('notes') as string) || null,
    });
  };

  // ── print ──
  const handlePrintBill = async (bill: CustomerBill) => {
    try {
      const { data, error } = await supabase.from('bill_items').select('*').eq('bill_id', bill.id);
      if (error) throw error;
      printBillReceipt(bill as any, data, settings);
    } catch { toast.error('Error loading bill items'); }
  };

  // ── export Excel (filtered bills) ──
  const handleExportBills = async () => {
    if (filteredBills.length === 0) { toast.error('No bills to export'); return; }

    const billIds = filteredBills.map(b => b.id);
    const { data: allItems } = await supabase
      .from('bill_items')
      .select('bill_id, mrp_price, quantity')
      .in('bill_id', billIds);

    const mrpByBill: Record<string, number> = {};
    ((allItems as any[]) || []).forEach(item => {
      const mrp = Number(item.mrp_price || 0) * Number(item.quantity || 1);
      mrpByBill[item.bill_id] = (mrpByBill[item.bill_id] || 0) + mrp;
    });

    type ExportRow = CustomerBill & { total_mrp: number };
    const rows: ExportRow[] = filteredBills.map(b => ({
      ...b,
      total_mrp: mrpByBill[b.id] || Number(b.total_amount),
    }));

    const presetLabel = PRESET_LABELS.find(p => p.id === billPreset)?.label.replace(' ', '-') || 'all';
    
    // Calculate totals
    const totalMRP = rows.reduce((acc, b) => acc + b.total_mrp, 0);
    const totalSales = rows.reduce((acc, b) => acc + Number(b.total_amount), 0);
    const totalMargin = totalMRP - totalSales;
    
    exportStyledExcel(
      [
        {
          title: `${selectedCustomer.name} - Purchases`,
          titleColor: '2E86AB',
          data: rows,
          columns: [
            { key: 'bill_number', header: 'Bill #' },
            { key: 'created_at', header: 'Date', format: v => format(new Date(v as string), 'dd/MM/yyyy HH:mm') },
            { key: 'total_mrp', header: 'Total MRP', format: v => Number(v) },
            { key: 'total_amount', header: 'Total Purchase Price', format: v => Number(v) },
            { key: 'margin', header: 'Customer Margin', format: (_, __, item: any) => Number((item.total_mrp || 0) - Number(item.total_amount || 0)) },
            { key: 'status', header: 'Status' },
          ]
        }
      ],
      {
        title: `Purchase Summary - ${format(new Date(), 'dd MMM yyyy')}`,
        items: [
          { label: 'Total Bills', value: rows.length },
          { label: 'Total Purchase (Selling Price)', value: `${currencySymbol}${totalSales.toFixed(2)}` },
          { label: 'Total MRP Value', value: `${currencySymbol}${totalMRP.toFixed(2)}` },
          { label: 'Total Profit/Margin', value: `${currencySymbol}${totalMargin.toFixed(2)}` },
        ]
      },
      `${selectedCustomer?.name}-${presetLabel}-purchases-${format(new Date(), 'yyyy-MM-dd')}`,
    );
    toast.success('Exported successfully');
  };

  // ═══════════════════════════════════════════
  // RENDER — Bills Panel (full screen on mobile)
  // ═══════════════════════════════════════════
  if (selectedCustomer) {
    return (
      <div className="flex flex-col min-h-full">
        {/* Header */}
        <div className="flex items-center gap-3 py-3 mb-4 border-b border-border sticky top-0 bg-background z-10">
          <Button variant="ghost" size="icon" onClick={() => { setSelectedCustomer(null); setBillPreset('all'); }}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-base truncate">{selectedCustomer.name}</p>
            <p className="text-xs text-muted-foreground">{selectedCustomer.phone || selectedCustomer.email || 'No contact'}</p>
          </div>
          <Button size="sm" variant="outline" onClick={handleExportBills} className="shrink-0">
            <Download className="h-4 w-4 mr-1.5" />
            Export
          </Button>
        </div>

        {/* Date Filter Pills */}
        <div className="flex gap-2 overflow-x-auto pb-3 mb-4" style={{ scrollbarWidth: 'none' }}>
          {PRESET_LABELS.map(p => (
            <button
              key={p.id}
              onClick={() => setBillPreset(p.id)}
              className="shrink-0 px-3 py-1.5 rounded-full text-sm font-semibold transition-all"
              style={
                billPreset === p.id
                  ? { background: '#1a2e5a', color: '#fff' }
                  : { background: 'var(--spos-bg)', color: 'var(--spos-text-faint)', border: '1px solid var(--spos-border)' }
              }
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="rounded-xl p-4 bg-card border border-border">
            <div className="flex items-center gap-2 mb-1">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Bills</span>
            </div>
            <p className="text-2xl font-black" style={{ color: '#1a2e5a' }}>{filteredBills.length}</p>
          </div>
          <div className="rounded-xl p-4 bg-card border border-border">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Spent</span>
            </div>
            <p className="text-2xl font-black" style={{ color: '#2e7d32' }}>{currencySymbol}{filteredTotal.toFixed(0)}</p>
          </div>
        </div>

        {/* Bill Cards List */}
        {loadingBills ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
          </div>
        ) : filteredBills.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-muted-foreground gap-2">
            <ShoppingBag className="h-10 w-10 opacity-20" />
            <p className="text-sm">No bills for this period</p>
          </div>
        ) : (
          <div className="space-y-3 pb-24">
            {filteredBills.map(bill => (
              <div key={bill.id} className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <p className="font-bold text-sm">#{bill.bill_number}</p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(bill.created_at), 'dd MMM yyyy  HH:mm')}
                    </div>
                  </div>
                  <Badge
                    variant="secondary"
                    className={STATUS_STYLE[bill.status] || 'bg-gray-100 text-gray-700'}
                  >
                    {bill.status}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    {bill.discount_amount > 0 && <span>Disc: {currencySymbol}{Number(bill.discount_amount).toFixed(2)}</span>}
                    {bill.tax_amount > 0 && <span>Tax: {currencySymbol}{Number(bill.tax_amount).toFixed(2)}</span>}
                  </div>
                  <p className="text-base font-black" style={{ color: '#1a2e5a' }}>
                    {currencySymbol}{Number(bill.total_amount).toFixed(2)}
                  </p>
                </div>
                <div className="flex gap-2 mt-3 pt-3 border-t border-border">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => setViewingBill(bill)}>
                    <Eye className="h-3.5 w-3.5 mr-1.5" />View
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => handlePrintBill(bill)}>
                    <Printer className="h-3.5 w-3.5 mr-1.5" />Print
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Bill Details Dialog */}
        <BillDetailsDialog bill={viewingBill as any} open={!!viewingBill} onOpenChange={() => setViewingBill(null)} />
      </div>
    );
  }

  // ═══════════════════════════════════════════
  // RENDER — Customer List
  // ═══════════════════════════════════════════
  return (
    <div className="flex flex-col gap-4">
      {/* Page header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="spos-page-heading">Customers</h1>
          <p className="spos-page-subhead" style={{ marginBottom: 0 }}>Manage your customer database</p>
        </div>
        {canEdit && (
          <Dialog open={isDialogOpen} onOpenChange={open => { setIsDialogOpen(open); if (!open) setEditingCustomer(null); }}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1.5" />
                Add
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md mx-4">
              <DialogHeader>
                <DialogTitle>{editingCustomer ? 'Edit Customer' : 'Add Customer'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-2">
                <div className="space-y-1.5">
                  <Label htmlFor="name">Name *</Label>
                  <Input id="name" name="name" defaultValue={editingCustomer?.name} required />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" name="email" type="email" defaultValue={editingCustomer?.email || ''} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="phone">Phone</Label>
                    <Input id="phone" name="phone" type="tel" defaultValue={editingCustomer?.phone || ''} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="store_type">Store Type</Label>
                  <Input 
                    id="store_type" 
                    name="store_type" 
                    defaultValue={editingCustomer?.store_type || ''} 
                    placeholder="e.g. Wholesale, Kirana, Medical" 
                    list="store-types"
                  />
                  <datalist id="store-types">
                    <option value="Wholesale Store" />
                    <option value="General Store" />
                    <option value="Kirana Store" />
                    <option value="Medical Store" />
                    <option value="Retail Store" />
                  </datalist>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="address">Address (General)</Label>
                  <Textarea id="address" name="address" defaultValue={editingCustomer?.address || ''} rows={1} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="location_name">Location Name</Label>
                    <Input id="location_name" name="location_name" placeholder="e.g. Saket" defaultValue={editingCustomer?.location_name || ''} />
                  </div>
                   <div className="space-y-1.5 text-left">
                    <Label htmlFor="pincode" className="flex items-center justify-between">
                      Pincode
                      <span id="pincode_loader" className="text-[10px] text-muted-foreground hidden">Loading...</span>
                    </Label>
                    <Input id="pincode" name="pincode" placeholder="e.g. 110017" defaultValue={editingCustomer?.pincode || ''} 
                      onChange={async (e) => {
                        const pin = e.target.value;
                        if (pin.length === 6 && /^\d+$/.test(pin)) {
                          const loader = document.getElementById('pincode_loader');
                          if (loader) loader.classList.remove('hidden');
                          try {
                            const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
                            const data = await res.json();
                            if (data && data[0] && data[0].Status === 'Success') {
                              const po = data[0].PostOffice[0];
                              const locInput = document.getElementById('location_name') as HTMLInputElement;
                              if (locInput && !locInput.value) {
                                locInput.value = `${po.Name}, ${po.District}`;
                              }
                            }
                          } catch (err) {
                            console.error('Pincode fetch error', err);
                          } finally {
                            if (loader) loader.classList.add('hidden');
                          }
                        }
                      }}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea id="notes" name="notes" defaultValue={editingCustomer?.notes || ''} rows={2} />
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={saveMutation.isPending}>
                    {saveMutation.isPending ? 'Saving…' : 'Save'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search name, phone, location, pincode, store type…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-10"
          />
          {searchQuery && (
            <button className="absolute right-3 top-1/2 -translate-y-1/2" onClick={() => setSearchQuery('')}>
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </div>

        <div className="flex gap-2 shrink-0 overflow-x-auto pb-1 sm:pb-0 scrollbar-hide">
           <Select value={storeTypeFilter} onValueChange={setStoreTypeFilter}>
             <SelectTrigger className="w-[140px] h-10 shrink-0">
               <SelectValue placeholder="Store Type" />
             </SelectTrigger>
             <SelectContent>
               <SelectItem value="all">All Types</SelectItem>
               {uniqueStoreTypes.map(type => (
                 <SelectItem key={type} value={type}>{type}</SelectItem>
               ))}
             </SelectContent>
           </Select>

           <Select value={pincodeFilter} onValueChange={setPincodeFilter}>
             <SelectTrigger className="w-[120px] h-10 shrink-0">
               <SelectValue placeholder="Pincode" />
             </SelectTrigger>
             <SelectContent>
               <SelectItem value="all">All Pincodes</SelectItem>
               {uniquePincodes.map(pin => (
                 <SelectItem key={pin} value={pin}>{pin}</SelectItem>
               ))}
             </SelectContent>
           </Select>
        </div>
      </div>

      {/* Count */}
      <p className="text-xs text-muted-foreground -mt-1">
        {isLoading ? 'Loading…' : `${filteredCustomers.length} customer${filteredCustomers.length !== 1 ? 's' : ''}`}
      </p>

      {/* Customer Cards */}
      {isLoading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
        </div>
      ) : filteredCustomers.length === 0 ? (
        <EmptyState icon="customers" title="No customers found" description="Add your first customer to start tracking orders." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-24">
          {filteredCustomers.map(customer => (
            <div key={customer.id} className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-start gap-3">
                {/* Avatar */}
                <div
                  className="h-10 w-10 rounded-full flex items-center justify-center shrink-0 font-bold text-sm"
                  style={{ background: 'var(--spos-accent-lt)', color: 'var(--spos-accent)' }}
                >
                  {customer.name.charAt(0).toUpperCase()}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm truncate">{customer.name}</p>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                    {customer.phone && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Phone className="h-3 w-3" />{customer.phone}
                      </span>
                    )}
                    {customer.email && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Mail className="h-3 w-3" />{customer.email}
                      </span>
                    )}
                    {customer.store_type && (
                      <span className="flex items-center gap-1 text-xs font-medium text-[var(--spos-accent)]">
                        <ShoppingBag className="h-3 w-3" />{customer.store_type}
                      </span>
                    )}
                  </div>
                  {(customer.address || customer.location_name || customer.pincode) && (
                    <p className="text-xs text-muted-foreground mt-1.5 opacity-80 leading-snug line-clamp-2">
                       {[customer.address, customer.location_name, customer.pincode].filter(Boolean).join(', ')}
                    </p>
                  )}
                  {customer.notes && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{customer.notes}</p>
                  )}
                </div>

                {/* Actions */}
                {canEdit && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                      onClick={() => { setEditingCustomer(customer); setIsDialogOpen(true); }}
                    >
                      <Pencil className="h-4 w-4 text-muted-foreground" />
                    </button>
                    {isAdmin && (
                      <button
                        className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors"
                        onClick={() => { if (confirm('Delete this customer?')) deleteMutation.mutate(customer.id); }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* View Bills button */}
              <button
                className="mt-3 w-full flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-semibold transition-all active:scale-95"
                style={{ background: 'var(--spos-accent-lt)', color: 'var(--spos-accent)' }}
                onClick={() => { setSelectedCustomer(customer); setBillPreset('all'); }}
              >
                <ShoppingBag className="h-4 w-4" />
                View Bills
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
