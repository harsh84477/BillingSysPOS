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
import { EmptyState } from '@/components/ui/EmptyState';
import { BillDetailsDialog } from '@/components/bills/BillDetailsDialog';
import { printBillReceipt } from '@/components/bills/BillReceiptPrint';
import { exportToExcel } from '@/lib/exportToExcel';
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
    customers.filter(c =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone?.includes(searchQuery)
    ),
    [customers, searchQuery],
  );

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

    // fetch bill items for all filtered bills in one query
    const billIds = filteredBills.map(b => b.id);
    const { data: allItems } = await supabase
      .from('bill_items')
      .select('bill_id, name, quantity, unit_price')
      .in('bill_id', billIds);

    const itemsByBill: Record<string, string> = {};
    (allItems || []).forEach(item => {
      const line = `${item.name} x${item.quantity}`;
      itemsByBill[item.bill_id] = itemsByBill[item.bill_id]
        ? itemsByBill[item.bill_id] + ' | ' + line : line;
    });

    type BillWithItems = CustomerBill & { items_detail: string };
    const rows: BillWithItems[] = filteredBills.map(b => ({
      ...b,
      items_detail: itemsByBill[b.id] || '',
    }));

    const presetLabel = PRESET_LABELS.find(p => p.id === billPreset)?.label.replace(' ', '-') || 'all';
    exportToExcel<BillWithItems>(
      rows,
      [
        { key: 'bill_number', header: 'Bill #' },
        { key: 'created_at', header: 'Date', format: v => format(new Date(v as string), 'dd/MM/yyyy HH:mm') },
        { key: 'items_detail', header: 'Items' },
        { key: 'subtotal', header: 'Subtotal', format: v => Number(v).toFixed(2) },
        { key: 'discount_amount', header: 'Discount', format: v => Number(v).toFixed(2) },
        { key: 'tax_amount', header: 'Tax', format: v => Number(v).toFixed(2) },
        { key: 'total_amount', header: 'Total', format: v => Number(v).toFixed(2) },
        { key: 'status', header: 'Status' },
      ],
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
                  <Label htmlFor="address">Address</Label>
                  <Textarea id="address" name="address" defaultValue={editingCustomer?.address || ''} rows={2} />
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

      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search name, email or phone…"
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
        <div className="space-y-3 pb-24">
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
                  </div>
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
