import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useBusinessSettings } from '@/hooks/useBusinessSettings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Pencil, Trash2, Users, Search, Phone, Mail, Download, Filter, X, ShoppingBag, Calendar, Eye, Printer } from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO, startOfDay, endOfDay, isWithinInterval } from 'date-fns';
import { exportToExcel } from '@/lib/exportToExcel';
import { BillDetailsDialog } from '@/components/bills/BillDetailsDialog';
import { printBillReceipt } from '@/components/bills/BillReceiptPrint';

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

export default function Customers() {
  const { isAdmin, isStaff, businessId } = useAuth();
  const queryClient = useQueryClient();
  const { data: settings } = useBusinessSettings();
  const currencySymbol = settings?.currency_symbol || '$';
  const canEdit = isAdmin || isStaff;

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCustomerOrders, setSelectedCustomerOrders] = useState<Customer | null>(null);
  const [viewingBill, setViewingBill] = useState<CustomerBill | null>(null);

  // Filters
  const [hasEmailFilter, setHasEmailFilter] = useState<string>('all');
  const [hasPhoneFilter, setHasPhoneFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Fetch customers
  const { data: customers, isLoading } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      let query = supabase
        .from('customers')
        .select('*');
      if (businessId) query = query.eq('business_id', businessId);
      const { data, error } = await query.order('name');
      if (error) throw error;
      return data as Customer[];
    },
    enabled: !!businessId,
  });

  // Fetch customer orders
  const { data: customerOrders = [], isLoading: loadingOrders } = useQuery({
    queryKey: ['customerOrders', selectedCustomerOrders?.id],
    queryFn: async () => {
      if (!selectedCustomerOrders) return [];
      const { data, error } = await supabase
        .from('bills')
        .select('id, bill_number, total_amount, subtotal, discount_amount, tax_amount, status, created_at, customer_id')
        .eq('customer_id', selectedCustomerOrders.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      // Add customer name to each bill
      return data.map(bill => ({
        ...bill,
        customers: { name: selectedCustomerOrders.name }
      })) as CustomerBill[];
    },
    enabled: !!selectedCustomerOrders,
  });

  // Create/Update customer
  const saveMutation = useMutation({
    mutationFn: async (customer: Partial<Customer>) => {
      if (editingCustomer) {
        const { error } = await supabase
          .from('customers')
          .update(customer)
          .eq('id', editingCustomer.id);
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
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Delete customer
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('customers').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success('Customer deleted');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    saveMutation.mutate({
      name: formData.get('name') as string,
      email: formData.get('email') as string || null,
      phone: formData.get('phone') as string || null,
      address: formData.get('address') as string || null,
      notes: formData.get('notes') as string || null,
    });
  };

  const filteredCustomers = useMemo(() => {
    return customers?.filter((c) => {
      // Search filter
      const matchesSearch =
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.phone?.includes(searchQuery);

      // Email filter
      const matchesEmail = hasEmailFilter === 'all' ||
        (hasEmailFilter === 'yes' && c.email) ||
        (hasEmailFilter === 'no' && !c.email);

      // Phone filter
      const matchesPhone = hasPhoneFilter === 'all' ||
        (hasPhoneFilter === 'yes' && c.phone) ||
        (hasPhoneFilter === 'no' && !c.phone);

      // Date range filter
      let matchesDate = true;
      if (dateFrom || dateTo) {
        const customerDate = parseISO(c.created_at);
        const from = dateFrom ? startOfDay(parseISO(dateFrom)) : new Date(0);
        const to = dateTo ? endOfDay(parseISO(dateTo)) : new Date();
        matchesDate = isWithinInterval(customerDate, { start: from, end: to });
      }

      return matchesSearch && matchesEmail && matchesPhone && matchesDate;
    }) || [];
  }, [customers, searchQuery, hasEmailFilter, hasPhoneFilter, dateFrom, dateTo]);

  const clearFilters = () => {
    setHasEmailFilter('all');
    setHasPhoneFilter('all');
    setDateFrom('');
    setDateTo('');
  };

  const hasActiveFilters = hasEmailFilter !== 'all' || hasPhoneFilter !== 'all' || dateFrom || dateTo;

  const handleExportExcel = () => {
    if (filteredCustomers.length === 0) {
      toast.error('No data to export');
      return;
    }

    exportToExcel(
      filteredCustomers,
      [
        { key: 'name', header: 'Name' },
        { key: 'email', header: 'Email', format: (v) => (v as string) || '' },
        { key: 'phone', header: 'Phone', format: (v) => (v as string) || '' },
        { key: 'address', header: 'Address', format: (v) => (v as string) || '' },
        { key: 'notes', header: 'Notes', format: (v) => (v as string) || '' },
        { key: 'created_at', header: 'Added On', format: (v) => format(new Date(v as string), 'dd/MM/yyyy') },
      ],
      `customers-${format(new Date(), 'yyyy-MM-dd')}`
    );
    toast.success('Exported successfully');
  };

  const handleExportCustomerOrders = () => {
    if (customerOrders.length === 0) {
      toast.error('No orders to export');
      return;
    }

    exportToExcel(
      customerOrders,
      [
        { key: 'bill_number', header: 'Bill #' },
        { key: 'created_at', header: 'Date', format: (v) => format(new Date(v as string), 'dd/MM/yyyy HH:mm') },
        { key: 'status', header: 'Status' },
        { key: 'total_amount', header: 'Amount', format: (v) => Number(v).toFixed(2) },
      ],
      `${selectedCustomerOrders?.name}-orders-${format(new Date(), 'yyyy-MM-dd')}`
    );
    toast.success('Exported successfully');
  };

  const totalSpent = customerOrders.reduce((sum, order) => sum + Number(order.total_amount), 0);

  // Fetch bill items for printing
  const fetchBillItems = async (billId: string) => {
    const { data, error } = await supabase
      .from('bill_items')
      .select('*')
      .eq('bill_id', billId);
    if (error) throw error;
    return data;
  };

  const handlePrintBill = async (bill: CustomerBill) => {
    try {
      const items = await fetchBillItems(bill.id);
      printBillReceipt(bill as any, items, settings);
    } catch (error) {
      toast.error('Error loading bill items');
    }
  };
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Customers</h1>
          <p className="text-muted-foreground">Manage your customer database</p>
        </div>

        <div className="flex gap-2">
          <Button onClick={handleExportExcel} variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export Excel
          </Button>

          {canEdit && (
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) setEditingCustomer(null);
            }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Customer
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>
                    {editingCustomer ? 'Edit Customer' : 'Add Customer'}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name *</Label>
                    <Input
                      id="name"
                      name="name"
                      defaultValue={editingCustomer?.name}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        defaultValue={editingCustomer?.email || ''}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        name="phone"
                        type="tel"
                        defaultValue={editingCustomer?.phone || ''}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Textarea
                      id="address"
                      name="address"
                      defaultValue={editingCustomer?.address || ''}
                      rows={2}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      name="notes"
                      defaultValue={editingCustomer?.notes || ''}
                      rows={2}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={saveMutation.isPending}>
                      {saveMutation.isPending ? 'Saving...' : 'Save'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search customers..."
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
                  <Label className="text-xs">Has Email</Label>
                  <Select value={hasEmailFilter} onValueChange={setHasEmailFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="yes">With Email</SelectItem>
                      <SelectItem value="no">Without Email</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Has Phone</Label>
                  <Select value={hasPhoneFilter} onValueChange={setHasPhoneFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="yes">With Phone</SelectItem>
                      <SelectItem value="no">Without Phone</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Added From</Label>
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Added To</Label>
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
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
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredCustomers && filteredCustomers.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead className="hidden md:table-cell">Address</TableHead>
                    <TableHead className="w-32">Orders</TableHead>
                    {canEdit && <TableHead className="w-24">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCustomers.map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                            <Users className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{customer.name}</p>
                            {customer.notes && (
                              <p className="text-xs text-muted-foreground line-clamp-1">
                                {customer.notes}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {customer.email && (
                            <div className="flex items-center gap-1 text-sm">
                              <Mail className="h-3 w-3 text-muted-foreground" />
                              {customer.email}
                            </div>
                          )}
                          {customer.phone && (
                            <div className="flex items-center gap-1 text-sm">
                              <Phone className="h-3 w-3 text-muted-foreground" />
                              {customer.phone}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <span className="text-sm text-muted-foreground line-clamp-2">
                          {customer.address || '—'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedCustomerOrders(customer)}
                        >
                          <ShoppingBag className="mr-1 h-4 w-4" />
                          View Orders
                        </Button>
                      </TableCell>
                      {canEdit && (
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setEditingCustomer(customer);
                                setIsDialogOpen(true);
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            {isAdmin && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive"
                                onClick={() => {
                                  if (confirm('Delete this customer?')) {
                                    deleteMutation.mutate(customer.id);
                                  }
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex h-40 items-center justify-center text-muted-foreground">
              <Users className="mr-2 h-5 w-5" />
              No customers found
            </div>
          )}
        </CardContent>
      </Card>

      {/* Customer Orders Dialog */}
      <Dialog open={!!selectedCustomerOrders} onOpenChange={() => setSelectedCustomerOrders(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>{selectedCustomerOrders?.name}'s Orders</span>
              <Button variant="outline" size="sm" onClick={handleExportCustomerOrders}>
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <Card>
              <CardContent className="pt-4">
                <p className="text-sm text-muted-foreground">Total Orders</p>
                <p className="text-2xl font-bold">{customerOrders.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-sm text-muted-foreground">Total Spent</p>
                <p className="text-2xl font-bold text-primary">{currencySymbol}{totalSpent.toFixed(2)}</p>
              </CardContent>
            </Card>
          </div>

          {loadingOrders ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : customerOrders.length > 0 ? (
            <ScrollArea className="h-[300px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bill #</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="w-[80px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customerOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">#{order.bill_number}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(order.created_at), 'dd/MM/yyyy HH:mm')}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={
                          order.status === 'completed' ? 'bg-green-100 text-green-800' :
                            order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                              'bg-yellow-100 text-yellow-800'
                        }>
                          {order.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {currencySymbol}{Number(order.total_amount).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setViewingBill(order)}
                            title="View Bill"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handlePrintBill(order)}
                            title="Print Bill"
                          >
                            <Printer className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          ) : (
            <div className="flex h-40 items-center justify-center text-muted-foreground">
              <ShoppingBag className="mr-2 h-5 w-5" />
              No orders yet
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Bill Details Dialog */}
      <BillDetailsDialog
        bill={viewingBill as any}
        open={!!viewingBill}
        onOpenChange={() => setViewingBill(null)}
      />
    </div>
  );
}
