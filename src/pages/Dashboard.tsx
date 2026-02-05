import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DollarSign,
  ShoppingCart,
  Package,
  AlertTriangle,
  TrendingUp,
  Users,
} from 'lucide-react';
import { format } from 'date-fns';

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
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

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
        .gte('completed_at', startOfMonth.toISOString());

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

  // Fetch recent bills
  const { data: recentBills, isLoading: loadingRecent } = useQuery({
    queryKey: ['recentBills'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bills')
        .select(`
          id,
          bill_number,
          total_amount,
          status,
          created_at,
          customers (name)
        `)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      return data || [];
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

  const currencySymbol = settings?.currency_symbol || '$';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back! Here's what's happening with your business.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Today's Sales"
          value={`${currencySymbol}${todaySales?.toFixed(2) || '0.00'}`}
          icon={DollarSign}
          description="Total sales today"
          isLoading={loadingTodaySales}
        />
        <StatCard
          title="Monthly Revenue"
          value={`${currencySymbol}${monthlyRevenue?.toFixed(2) || '0.00'}`}
          icon={TrendingUp}
          description={format(today, 'MMMM yyyy')}
          isLoading={loadingMonthly}
        />
        <StatCard
          title="Pending Bills"
          value={pendingBills || 0}
          icon={ShoppingCart}
          description="Draft bills awaiting completion"
          isLoading={loadingPending}
        />
        <StatCard
          title="Customers"
          value={customerCount || 0}
          icon={Users}
          description="Total registered customers"
          isLoading={loadingCustomers}
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
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
                        className={`text-xs capitalize ${
                          bill.status === 'completed'
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
    </div>
  );
}
