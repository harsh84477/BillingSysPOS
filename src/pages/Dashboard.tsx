import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  DollarSign,
  ShoppingCart,
  Package,
  AlertTriangle,
  TrendingUp,
  Users,
  Download,
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { toast } from 'sonner';
import { exportToExcel } from '@/lib/exportToExcel';
import { cn } from '@/lib/utils';
import DraftBillModal from '@/components/bills/DraftBillModal';

function StatCard({
  title,
  value,
  icon: Icon,
  description,
  isLoading,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  description?: string;
  isLoading?: boolean;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-8 w-24" />
        ) : (
          <>
            <div className="text-2xl font-bold">{value}</div>
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { user, isSuperAdmin, isSalesman, userRole, isAdmin, isManager } = useAuth();
  const navigate = useNavigate();
  const [selectedDraftBillId, setSelectedDraftBillId] = useState<string | null>(null);

  React.useEffect(() => {
    if (!user && isSuperAdmin) {
      navigate('/super-admin');
    }
  }, [user, isSuperAdmin, navigate]);

  const today = useMemo(() => new Date(), []);
  const startOfToday = useMemo(
    () => new Date(today.getFullYear(), today.getMonth(), today.getDate()),
    [today]
  );
  const startOfThisMonth = useMemo(
    () => new Date(today.getFullYear(), today.getMonth(), 1),
    [today]
  );

  // Month selector for expense report
  const [selectedMonth, setSelectedMonth] = useState(() => format(today, 'yyyy-MM'));

  // Generate last 12 months for dropdown
  const monthOptions = Array.from({ length: 12 }, (_, i) => {
    const date = subMonths(today, i);
    return {
      value: format(date, 'yyyy-MM'),
      label: format(date, 'MMMM yyyy'),
    };
  });

  // Fetch today's sales
  const { data: todaySales, isLoading: loadingTodaySales } = useQuery({
    queryKey: ['todaySales'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bills')
        .select('total_amount')
        .eq('status', 'completed')
        .gte('completed_at', startOfToday.toISOString());

      if (error) throw error;
      return data?.reduce((sum, bill) => sum + Number(bill.total_amount), 0) || 0;
    },
  });

  // Fetch monthly revenue
  const { data: monthlyRevenue, isLoading: loadingMonthly } = useQuery({
    queryKey: ['monthlyRevenue'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bills')
        .select('total_amount')
        .eq('status', 'completed')
        .gte('completed_at', startOfThisMonth.toISOString());

      if (error) throw error;
      return data?.reduce((sum, bill) => sum + Number(bill.total_amount), 0) || 0;
    },
  });

  // Fetch pending bills
  const { data: pendingBills, isLoading: loadingPending } = useQuery({
    queryKey: ['pendingBills'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('bills')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'draft');

      if (error) throw error;
      return count || 0;
    },
  });

  // Fetch draft bills (visible to all, but salesman sees own only)
  const { data: draftBills = [], isLoading: loadingDrafts } = useQuery({
    queryKey: ['draftBills', user?.id, userRole],
    queryFn: async () => {
      let query = supabase
        .from('bills')
        .select('id, bill_number, total_amount, salesman_name, created_by, created_at, customers(name)')
        .eq('status', 'draft')
        .order('created_at', { ascending: false })
        .limit(20);

      // Salesman can only see their own drafts
      if (isSalesman && user?.id) {
        query = query.eq('created_by', user.id);
      }

      const { data, error } = await query as any;
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  // Fetch low stock products
  const { data: lowStockProducts, isLoading: loadingLowStock } = useQuery({
    queryKey: ['lowStockProducts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, stock_quantity, low_stock_threshold')
        .eq('is_active', true);

      if (error) throw error;
      return data?.filter(p => p.stock_quantity <= p.low_stock_threshold) || [];
    },
  });

  // Fetch total reserved units
  const { data: totalReserved = 0, isLoading: loadingReserved } = useQuery({
    queryKey: ['reservedStockUnits'],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from('products')
        .select('reserved_quantity')
        .gt('reserved_quantity', 0) as any);
      if (error) throw error;
      return (data || []).reduce((sum: number, p: any) => sum + (p.reserved_quantity || 0), 0) || 0;
    },
  });

  // Fetch recent bills
  const { data: recentBills, isLoading: loadingRecent } = useQuery({
    queryKey: ['recentBills'],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from('bills')
        .select(`
          id,
          bill_number,
          total_amount,
          status,
          created_at,
          payment_status,
          customers (name)
        `)
        .order('created_at', { ascending: false })
        .limit(10) as any);

      if (error) throw error;
      return (data || []) as any[];
    },
  });

  // Fetch due stats
  const { data: dueStats, isLoading: loadingDue } = useQuery({
    queryKey: ['dueStats'],
    queryFn: async () => {
      const { data, error } = await ((supabase
        .from('bills') as any)
        .select('due_amount, due_date, payment_status')
        .in('payment_status', ['unpaid', 'partial'])
        .eq('status', 'completed') as any);
      if (error) throw error;
      const bills = (data || []) as any[];
      const today = new Date();
      return {
        totalDue: bills.reduce((s: number, b: any) => s + Number(b.due_amount || 0), 0),
        unpaidCount: bills.length,
        overdueCount: bills.filter((b: any) => b.due_date && new Date(b.due_date) < today).length,
      };
    },
  });

  // Fetch today's profit
  const { data: todayProfit, isLoading: loadingTodayProfit } = useQuery({
    queryKey: ['todayProfit'],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from('bills')
        .select('profit')
        .eq('status', 'completed')
        .gte('completed_at', startOfToday.toISOString()) as any);
      if (error) throw error;
      return ((data || []) as any[]).reduce((s: number, b: any) => s + Number(b.profit || 0), 0);
    },
  });

  // Fetch customer count
  const { data: customerCount, isLoading: loadingCustomers } = useQuery({
    queryKey: ['customerCount'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true });

      if (error) throw error;
      return count || 0;
    },
  });

  // Fetch business settings for currency
  const { data: settings } = useQuery({
    queryKey: ['businessSettings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('business_settings')
        .select('currency_symbol')
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });

  // Fetch monthly expense report data
  const { data: monthlyExpenseData, isLoading: loadingExpense } = useQuery({
    queryKey: ['monthlyExpense', selectedMonth],
    queryFn: async () => {
      const [year, month] = selectedMonth.split('-').map(Number);
      const monthStart = startOfMonth(new Date(year, month - 1));
      const monthEnd = endOfMonth(new Date(year, month - 1));

      const { data, error } = await supabase
        .from('bills')
        .select(`
          id,
          bill_number,
          total_amount,
          subtotal,
          discount_amount,
          tax_amount,
          status,
          created_at,
          completed_at,
          customers (name)
        `)
        .eq('status', 'completed')
        .gte('completed_at', monthStart.toISOString())
        .lte('completed_at', monthEnd.toISOString())
        .order('completed_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  // Fetch cost data for profit calculation
  const { data: monthlyCostData } = useQuery({
    queryKey: ['monthlyCost', selectedMonth],
    queryFn: async () => {
      const [year, month] = selectedMonth.split('-').map(Number);
      const monthStart = startOfMonth(new Date(year, month - 1));
      const monthEnd = endOfMonth(new Date(year, month - 1));

      // Get all bill items with cost for completed bills in this month
      const { data: bills, error: billsError } = await supabase
        .from('bills')
        .select('id')
        .eq('status', 'completed')
        .gte('completed_at', monthStart.toISOString())
        .lte('completed_at', monthEnd.toISOString());

      if (billsError) throw billsError;

      if (!bills || bills.length === 0) return 0;

      const billIds = bills.map(b => b.id);
      const { data: items, error } = await supabase
        .from('bill_items')
        .select('cost_price, quantity')
        .in('bill_id', billIds);

      if (error) throw error;
      return items?.reduce((sum, item) => sum + (Number(item.cost_price) * item.quantity), 0) || 0;
    },
  });

  const currencySymbol = settings?.currency_symbol || '$';

  const monthlyTotals = {
    revenue: monthlyExpenseData?.reduce((sum, b) => sum + Number(b.total_amount), 0) || 0,
    subtotal: monthlyExpenseData?.reduce((sum, b) => sum + Number(b.subtotal), 0) || 0,
    discounts: monthlyExpenseData?.reduce((sum, b) => sum + Number(b.discount_amount), 0) || 0,
    tax: monthlyExpenseData?.reduce((sum, b) => sum + Number(b.tax_amount), 0) || 0,
    cost: monthlyCostData || 0,
    profit: (monthlyExpenseData?.reduce((sum, b) => sum + Number(b.total_amount), 0) || 0) - (monthlyCostData || 0),
    orderCount: monthlyExpenseData?.length || 0,
  };

  const handleExportMonthlyReport = () => {
    if (!monthlyExpenseData || monthlyExpenseData.length === 0) {
      toast.error('No data to export for this month');
      return;
    }

    // Export detailed bill data
    exportToExcel(
      monthlyExpenseData,
      [
        { key: 'bill_number', header: 'Bill #' },
        { key: 'completed_at', header: 'Date', format: (v) => format(new Date(v as string), 'dd/MM/yyyy HH:mm') },
        { key: 'customers', header: 'Customer', format: (v) => (v as { name: string } | null)?.name || 'Walk-in' },
        { key: 'subtotal', header: 'Subtotal', format: (v) => Number(v).toFixed(2) },
        { key: 'discount_amount', header: 'Discount', format: (v) => Number(v).toFixed(2) },
        { key: 'tax_amount', header: 'Tax', format: (v) => Number(v).toFixed(2) },
        { key: 'total_amount', header: 'Total', format: (v) => Number(v).toFixed(2) },
      ],
      `monthly-report-${selectedMonth}`
    );
    toast.success('Monthly report exported');
  };

  return (
    <div className="space-y-4 -mt-4 sm:-mt-6">

      {/* Stats Grid */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Today's Sales"
          value={`${currencySymbol}${todaySales?.toFixed(2) || '0.00'}`}
          icon={DollarSign}
          description="Total sales today"
          isLoading={loadingTodaySales}
        />
        <StatCard
          title="Monthly Sales"
          value={`${currencySymbol}${monthlyRevenue?.toFixed(2) || '0.00'}`}
          icon={TrendingUp}
          description={format(today, 'MMMM yyyy')}
          isLoading={loadingMonthly}
        />
        <StatCard
          title="Profit Today"
          value={`${currencySymbol}${(todayProfit || 0).toFixed(2)}`}
          icon={TrendingUp}
          description="Revenue minus cost"
          isLoading={loadingTodayProfit}
        />
        <StatCard
          title="Draft Bills"
          value={pendingBills}
          icon={ShoppingCart}
          description="Total pending drafts"
          isLoading={loadingPending}
        />
        <StatCard
          title="Reserved Units"
          value={totalReserved}
          icon={Package}
          description="Locked in drafts"
          isLoading={loadingReserved}
        />
        <StatCard
          title="Total Due Amount"
          value={`${currencySymbol}${(dueStats?.totalDue || 0).toFixed(2)}`}
          icon={AlertTriangle}
          description="Outstanding balance"
          isLoading={loadingDue}
        />
        <StatCard
          title="Unpaid Bills"
          value={dueStats?.unpaidCount || 0}
          icon={ShoppingCart}
          description="Pending payment"
          isLoading={loadingDue}
        />
        <StatCard
          title="Overdue Bills"
          value={dueStats?.overdueCount || 0}
          icon={AlertTriangle}
          description="Past due date"
          isLoading={loadingDue}
        />
        <StatCard
          title="Low Stock Items"
          value={lowStockProducts?.length || 0}
          icon={Package}
          description="Products to restock"
          isLoading={loadingLowStock}
        />
        <StatCard
          title="Draft Orders"
          value={draftBills.length}
          icon={ShoppingCart}
          description={isSalesman ? 'Your draft orders' : 'Pending salesman orders'}
          isLoading={loadingDrafts}
        />

      </div>

      {/* Monthly Expense Report */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5" />
                Monthly Report
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">Revenue, costs, and profit summary</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 sm:w-44">
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {monthOptions.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button variant="outline" size="sm" onClick={handleExportMonthlyReport} className="shrink-0">
                <Download className="mr-1.5 h-3.5 w-3.5" />
                <span className="hidden sm:inline">Export Excel</span>
                <span className="sm:hidden">Export</span>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loadingExpense ? (
            <div className="grid grid-cols-2 gap-3">
              {[1, 2, 3, 4].map(i => (
                <Skeleton key={i} className="h-16 sm:h-20 w-full" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 sm:p-4 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground">Total Revenue</p>
                <p className="text-lg sm:text-2xl font-bold text-green-600">
                  {currencySymbol}{monthlyTotals.revenue.toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground">{monthlyTotals.orderCount} orders</p>
              </div>
              <div className="p-3 sm:p-4 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground">Total Cost</p>
                <p className="text-lg sm:text-2xl font-bold text-orange-600">
                  {currencySymbol}{monthlyTotals.cost.toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground">Product costs</p>
              </div>
              <div className="p-3 sm:p-4 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground">Discounts Given</p>
                <p className="text-lg sm:text-2xl font-bold text-red-600">
                  {currencySymbol}{monthlyTotals.discounts.toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground">Total discounts</p>
              </div>
              <div className="p-3 sm:p-4 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground">Net Profit</p>
                <p className={`text-lg sm:text-2xl font-bold ${monthlyTotals.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {currencySymbol}{monthlyTotals.profit.toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {monthlyTotals.revenue > 0
                    ? `${((monthlyTotals.profit / monthlyTotals.revenue) * 100).toFixed(1)}% margin`
                    : 'No sales'}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Draft Bills Section */}
      {draftBills.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5 text-teal-600" />
                  Draft Orders
                </CardTitle>
                <CardDescription>
                  {isSalesman ? 'Your pending draft orders' : 'Draft orders from salesmen awaiting finalization'}
                </CardDescription>
              </div>
              <Badge variant="secondary" className="bg-teal-100 text-teal-700">
                {draftBills.length} Pending
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {loadingDrafts ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground font-medium">
                      <th className="text-left py-2 px-1">Bill #</th>
                      <th className="text-left py-2 px-1">Salesman</th>
                      <th className="text-left py-2 px-1">Customer</th>
                      <th className="text-left py-2 px-1 hidden sm:table-cell">Last Updated</th>
                      <th className="text-right py-2 px-1">Total</th>
                      <th className="text-right py-2 px-1">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {draftBills.map((draft: any) => (
                      <tr
                        key={draft.id}
                        className="hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => setSelectedDraftBillId(draft.id)}
                      >
                        <td className="py-3 px-1 font-medium">{draft.bill_number}</td>
                        <td className="py-3 px-1">{draft.salesman_name || 'N/A'}</td>
                        <td className="py-3 px-1">{draft.customers?.name || 'Walk-in'}</td>
                        <td className="py-3 px-1 hidden sm:table-cell text-xs text-muted-foreground">
                          {format(new Date(draft.created_at), 'dd/MM HH:mm')}
                        </td>
                        <td className="py-3 px-1 text-right font-bold">
                          {currencySymbol}{Number(draft.total_amount).toFixed(2)}
                        </td>
                        <td className="py-3 px-1 text-right">
                          <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-none text-[10px]">
                            DRAFT
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Low Stock Alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Low Stock Alerts
            </CardTitle>
            <CardDescription>Products that need restocking</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingLowStock ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : lowStockProducts && lowStockProducts.length > 0 ? (
              <div className="space-y-3">
                {lowStockProducts.slice(0, 5).map((product) => (
                  <div
                    key={product.id}
                    className="flex items-center justify-between rounded-lg border border-border p-3"
                  >
                    <div className="flex items-center gap-3">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{product.name}</span>
                    </div>
                    <span className="text-sm text-destructive font-medium">
                      {product.stock_quantity} left
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                All products are well stocked!
              </p>
            )}
          </CardContent>
        </Card>

        {/* Recent Bills */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Recent Bills
            </CardTitle>
            <CardDescription>Latest billing activity</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingRecent ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : recentBills && recentBills.length > 0 ? (
              <div className="space-y-3">
                {recentBills.map((bill) => (
                  <div
                    key={bill.id}
                    className="flex items-center justify-between rounded-lg border border-border p-3"
                  >
                    <div>
                      <p className="font-medium">{bill.bill_number}</p>
                      <p className="text-xs text-muted-foreground">
                        {bill.customers?.name || 'Walk-in Customer'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">
                        {currencySymbol}{Number(bill.total_amount).toFixed(2)}
                      </p>
                      <span
                        className={`text-xs capitalize ${bill.status === 'completed'
                          ? 'text-green-600'
                          : bill.status === 'draft'
                            ? 'text-yellow-600'
                            : 'text-red-600'
                          }`}
                      >
                        {bill.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No bills yet</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Draft Bill Popup Modal */}
      <DraftBillModal
        billId={selectedDraftBillId}
        open={!!selectedDraftBillId}
        onClose={() => setSelectedDraftBillId(null)}
      />
    </div >
  );
}
