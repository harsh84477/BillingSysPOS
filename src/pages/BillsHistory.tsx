import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useBusinessSettings } from '@/hooks/useBusinessSettings';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Search, FileText, Calendar, Eye, Trash2, Download, Filter, X, TrendingUp, Receipt, Clock, Printer } from 'lucide-react';
import { format, parseISO, isWithinInterval, startOfDay, endOfDay, subDays, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { toast } from '@/hooks/use-toast';
import { exportToExcel } from '@/lib/exportToExcel';
import { BillDetailsDialog } from '@/components/bills/BillDetailsDialog';
import { printBillReceipt } from '@/components/bills/BillReceiptPrint';

type DatePreset = 'today' | 'yesterday' | 'last7days' | 'last30days' | 'thisMonth' | 'lastMonth' | 'custom';

const DATE_PRESETS: { value: DatePreset; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'last7days', label: 'Last 7 Days' },
  { value: 'last30days', label: 'Last 30 Days' },
  { value: 'thisMonth', label: 'This Month' },
  { value: 'lastMonth', label: 'Last Month' },
  { value: 'custom', label: 'Custom Range' },
];

interface Bill {
  id: string;
  bill_number: string;
  status: 'draft' | 'completed' | 'cancelled';
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  total_amount: number;
  created_at: string;
  completed_at: string | null;
  customer_id: string | null;
  customers: { name: string } | null;
}

interface BillItem {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export default function BillsHistory() {
  const { data: settings } = useBusinessSettings();
  const { businessId } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [billToDelete, setBillToDelete] = useState<Bill | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [customerFilter, setCustomerFilter] = useState<string>('all');
  const [datePreset, setDatePreset] = useState<DatePreset>('today');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Apply date preset on mount
  React.useEffect(() => {
    applyDatePreset('today');
  }, []);

  const applyDatePreset = (preset: DatePreset) => {
    setDatePreset(preset);
    const today = new Date();

    switch (preset) {
      case 'today':
        setDateFrom(format(today, 'yyyy-MM-dd'));
        setDateTo(format(today, 'yyyy-MM-dd'));
        break;
      case 'yesterday':
        const yesterday = subDays(today, 1);
        setDateFrom(format(yesterday, 'yyyy-MM-dd'));
        setDateTo(format(yesterday, 'yyyy-MM-dd'));
        break;
      case 'last7days':
        setDateFrom(format(subDays(today, 6), 'yyyy-MM-dd'));
        setDateTo(format(today, 'yyyy-MM-dd'));
        break;
      case 'last30days':
        setDateFrom(format(subDays(today, 29), 'yyyy-MM-dd'));
        setDateTo(format(today, 'yyyy-MM-dd'));
        break;
      case 'thisMonth':
        setDateFrom(format(startOfMonth(today), 'yyyy-MM-dd'));
        setDateTo(format(endOfMonth(today), 'yyyy-MM-dd'));
        break;
      case 'lastMonth':
        const lastMonth = subMonths(today, 1);
        setDateFrom(format(startOfMonth(lastMonth), 'yyyy-MM-dd'));
        setDateTo(format(endOfMonth(lastMonth), 'yyyy-MM-dd'));
        break;
      case 'custom':
        // Keep existing values for custom
        break;
    }
  };

  const queryClient = useQueryClient();
  const currencySymbol = settings?.currency_symbol || '₹';

  const { data: bills = [], isLoading } = useQuery({
    queryKey: ['bills', businessId],
    queryFn: async () => {
      let query = supabase
        .from('bills')
        .select('*, customers(name)');
      if (businessId) query = query.eq('business_id', businessId);
      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      return data as Bill[];
    },
    enabled: !!businessId,
  });

  // Get unique customers for filter
  const uniqueCustomers = useMemo(() => {
    const customers = bills
      .filter(b => b.customers?.name)
      .map(b => ({ id: b.customer_id!, name: b.customers!.name }));
    return Array.from(new Map(customers.map(c => [c.id, c])).values());
  }, [bills]);

  // Fetch bill items for printing
  const fetchBillItems = async (billId: string) => {
    const { data, error } = await supabase
      .from('bill_items')
      .select('*')
      .eq('bill_id', billId);
    if (error) throw error;
    return data as BillItem[];
  };

  const handlePrintBill = async (bill: Bill) => {
    try {
      const items = await fetchBillItems(bill.id);
      printBillReceipt(bill, items, settings);
    } catch (error) {
      toast({ title: 'Error loading bill items', variant: 'destructive' });
    }
  };

  const deleteBillMutation = useMutation({
    mutationFn: async (billId: string) => {
      const { error: itemsError } = await supabase
        .from('bill_items')
        .delete()
        .eq('bill_id', billId);
      if (itemsError) throw itemsError;

      const { error: billError } = await supabase
        .from('bills')
        .delete()
        .eq('id', billId);
      if (billError) throw billError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bills'] });
      toast({
        title: 'Bill deleted',
        description: 'The bill has been permanently deleted.',
      });
      setBillToDelete(null);
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to delete bill. You may not have permission.',
        variant: 'destructive',
      });
      console.error('Delete error:', error);
    },
  });

  const filteredBills = useMemo(() => {
    return bills.filter((bill) => {
      // Search filter
      const matchesSearch =
        bill.bill_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        bill.customers?.name?.toLowerCase().includes(searchQuery.toLowerCase());

      // Status filter
      const matchesStatus = statusFilter === 'all' || bill.status === statusFilter;

      // Customer filter
      const matchesCustomer = customerFilter === 'all' ||
        (customerFilter === 'walk-in' && !bill.customer_id) ||
        bill.customer_id === customerFilter;

      // Date range filter
      let matchesDate = true;
      if (dateFrom || dateTo) {
        const billDate = parseISO(bill.created_at);
        const from = dateFrom ? startOfDay(parseISO(dateFrom)) : new Date(0);
        const to = dateTo ? endOfDay(parseISO(dateTo)) : new Date();
        matchesDate = isWithinInterval(billDate, { start: from, end: to });
      }

      return matchesSearch && matchesStatus && matchesCustomer && matchesDate;
    });
  }, [bills, searchQuery, statusFilter, customerFilter, dateFrom, dateTo]);

  const clearFilters = () => {
    setStatusFilter('all');
    setCustomerFilter('all');
    setDatePreset('today');
    applyDatePreset('today');
  };

  const hasActiveFilters = statusFilter !== 'all' || customerFilter !== 'all';

  // Summary stats
  const summaryStats = useMemo(() => {
    const completed = filteredBills.filter(b => b.status === 'completed');
    const totalRevenue = completed.reduce((sum, b) => sum + Number(b.total_amount), 0);
    const totalDiscount = completed.reduce((sum, b) => sum + Number(b.discount_amount), 0);
    return {
      totalBills: filteredBills.length,
      completedBills: completed.length,
      totalRevenue,
      totalDiscount,
      avgBillValue: completed.length > 0 ? totalRevenue / completed.length : 0,
    };
  }, [filteredBills]);

  const handleExportExcel = () => {
    if (filteredBills.length === 0) {
      toast({ title: 'No data to export', variant: 'destructive' });
      return;
    }

    exportToExcel(
      filteredBills,
      [
        { key: 'bill_number', header: 'Bill #' },
        { key: 'created_at', header: 'Date', format: (v) => format(new Date(v as string), 'dd/MM/yyyy HH:mm') },
        { key: 'customers', header: 'Customer', format: (v) => (v as { name: string } | null)?.name || 'Walk-in' },
        { key: 'status', header: 'Status' },
        { key: 'subtotal', header: 'Subtotal', format: (v) => Number(v).toFixed(2) },
        { key: 'discount_amount', header: 'Discount', format: (v) => Number(v).toFixed(2) },
        { key: 'tax_amount', header: 'Tax', format: (v) => Number(v).toFixed(2) },
        { key: 'total_amount', header: 'Total', format: (v) => Number(v).toFixed(2) },
      ],
      `bills-history-${format(new Date(), 'yyyy-MM-dd')}`
    );
    toast({ title: 'Exported successfully' });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'draft':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Bills History</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">View all your past bills and invoices</p>
        </div>
        <Button onClick={handleExportExcel} variant="outline" size="sm" className="shrink-0">
          <Download className="mr-1.5 h-3.5 w-3.5" />
          <span className="hidden sm:inline">Export Excel</span>
          <span className="sm:hidden">Export</span>
        </Button>
      </div>

      {/* Summary Stats - 2 cols on mobile */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        <Card className="p-3 sm:p-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 rounded-lg bg-primary/10 shrink-0">
              <Receipt className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Total Bills</p>
              <p className="text-base sm:text-lg font-bold">{summaryStats.totalBills}</p>
            </div>
          </div>
        </Card>
        <Card className="p-3 sm:p-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 rounded-lg bg-green-500/10 shrink-0">
              <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Revenue</p>
              <p className="text-base sm:text-lg font-bold truncate">{currencySymbol}{summaryStats.totalRevenue.toFixed(2)}</p>
            </div>
          </div>
        </Card>
        <Card className="p-3 sm:p-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 rounded-lg bg-orange-500/10 shrink-0">
              <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-orange-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Avg Bill</p>
              <p className="text-base sm:text-lg font-bold truncate">{currencySymbol}{summaryStats.avgBillValue.toFixed(2)}</p>
            </div>
          </div>
        </Card>
        <Card className="p-3 sm:p-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 rounded-lg bg-red-500/10 shrink-0">
              <X className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-red-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Discounts</p>
              <p className="text-base sm:text-lg font-bold truncate">{currencySymbol}{summaryStats.totalDiscount.toFixed(2)}</p>
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2 sm:pb-3">
          <div className="flex flex-col gap-3">
            {/* Quick Date Presets - horizontally scrollable on mobile */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
              {DATE_PRESETS.map((preset) => (
                <Button
                  key={preset.value}
                  variant={datePreset === preset.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => applyDatePreset(preset.value)}
                  className="text-xs shrink-0 h-8 px-2.5"
                >
                  {preset.label}
                </Button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by bill number or customer..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button
                variant={hasActiveFilters ? "default" : "outline"}
                size="icon"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-4 w-4" />
              </Button>
            </div>

            {showFilters && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-muted/50 rounded-lg">
                <div className="space-y-1">
                  <Label className="text-xs">Status</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Customer</Label>
                  <Select value={customerFilter} onValueChange={setCustomerFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Customers</SelectItem>
                      <SelectItem value="walk-in">Walk-in</SelectItem>
                      {uniqueCustomers.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">From Date</Label>
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => {
                      setDateFrom(e.target.value);
                      setDatePreset('custom');
                    }}
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">To Date</Label>
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) => {
                      setDateTo(e.target.value);
                      setDatePreset('custom');
                    }}
                  />
                </div>

                {hasActiveFilters && (
                  <div className="col-span-2 md:col-span-4">
                    <Button variant="ghost" size="sm" onClick={clearFilters}>
                      <X className="mr-1 h-3 w-3" />
                      Clear Filters
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex h-40 items-center justify-center text-muted-foreground">
              Loading bills...
            </div>
          ) : filteredBills.length === 0 ? (
            <div className="flex h-40 flex-col items-center justify-center text-muted-foreground">
              <FileText className="mb-2 h-8 w-8" />
              No bills found
            </div>
          ) : (
            <ScrollArea className="h-[calc(100vh-26rem)] sm:h-[calc(100vh-24rem)]">
              {/* Mobile Card View */}
              <div className="sm:hidden space-y-2">
                {filteredBills.map((bill) => (
                  <div
                    key={bill.id}
                    className="flex items-center justify-between rounded-lg border border-border p-3 bg-background"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm">#{bill.bill_number}</p>
                        <Badge className={`${getStatusColor(bill.status)} text-[10px] px-1.5 py-0`} variant="secondary">
                          {bill.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{bill.customers?.name || 'Walk-in'}</p>
                      <p className="text-xs text-muted-foreground">{format(new Date(bill.created_at), 'dd/MM/yy HH:mm')}</p>
                    </div>
                    <div className="flex items-center gap-1 ml-2 shrink-0">
                      <p className="font-bold text-sm mr-1">{currencySymbol}{Number(bill.total_amount).toFixed(2)}</p>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelectedBill(bill)}>
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handlePrintBill(bill)}>
                        <Printer className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setBillToDelete(bill)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              {/* Desktop / Tablet Table View */}
              <div className="hidden sm:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Bill #</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="w-[80px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBills.map((bill) => (
                      <TableRow key={bill.id}>
                        <TableCell className="font-medium">#{bill.bill_number}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(bill.created_at), 'dd/MM/yyyy HH:mm')}
                          </div>
                        </TableCell>
                        <TableCell>{bill.customers?.name || 'Walk-in'}</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(bill.status)} variant="secondary">
                            {bill.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {currencySymbol}{Number(bill.total_amount).toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" onClick={() => setSelectedBill(bill)} title="View Bill">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handlePrintBill(bill)} title="Print Bill">
                              <Printer className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost" size="icon"
                              onClick={() => setBillToDelete(bill)}
                              className="text-destructive hover:text-destructive"
                              title="Delete Bill"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Bill Details Dialog */}
      <BillDetailsDialog
        bill={selectedBill}
        open={!!selectedBill}
        onOpenChange={() => setSelectedBill(null)}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!billToDelete} onOpenChange={() => setBillToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Bill #{billToDelete?.bill_number}?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the bill and all its items.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => billToDelete && deleteBillMutation.mutate(billToDelete.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteBillMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
