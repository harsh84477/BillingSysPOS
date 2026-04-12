/**
 * pages/SalesmanDashboard.tsx — Dedicated salesman dashboard
 * Shows personal KPIs, target progress, assigned stores, recent orders
 * Does NOT expose full business data.
 */
import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import {
  ShoppingCart, Store, Target, TrendingUp, IndianRupee,
  FileText, MapPin, ArrowRight, Plus, Clock,
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfDay, endOfDay } from 'date-fns';
import { cn } from '@/lib/utils';

export default function SalesmanDashboard() {
  const { user, businessId } = useAuth();
  const navigate = useNavigate();
  const today = new Date();
  const salesmanName = user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Salesman';

  // ─── Fetch business settings for currency ───
  const { data: settings } = useQuery({
    queryKey: ['business-settings', businessId],
    queryFn: async () => {
      const { data } = await supabase
        .from('business_settings')
        .select('currency_symbol')
        .eq('business_id', businessId)
        .maybeSingle();
      return data;
    },
    enabled: !!businessId,
  });
  const cs = settings?.currency_symbol || '₹';

  // ─── My bills today ───
  const { data: todayBills = [], isLoading: loadingBills } = useQuery({
    queryKey: ['salesman-today-bills', user?.id, businessId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bills')
        .select('id, bill_number, total_amount, status, customer_id, created_at, customers(name)')
        .eq('business_id', businessId)
        .eq('created_by', user!.id)
        .gte('created_at', startOfDay(today).toISOString())
        .lte('created_at', endOfDay(today).toISOString())
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!businessId && !!user?.id,
  });

  // ─── My bills this month ───
  const { data: monthBills = [], isLoading: loadingMonth } = useQuery({
    queryKey: ['salesman-month-bills', user?.id, businessId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bills')
        .select('id, total_amount, status, created_at')
        .eq('business_id', businessId)
        .eq('created_by', user!.id)
        .gte('created_at', startOfMonth(today).toISOString())
        .lte('created_at', endOfMonth(today).toISOString());
      if (error) throw error;
      return data || [];
    },
    enabled: !!businessId && !!user?.id,
  });

  // ─── My assigned stores ───
  const { data: myStores = [], isLoading: loadingStores } = useQuery({
    queryKey: ['salesman-stores', user?.id, businessId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('salesman_stores')
        .select('id, customer_id, customers(id, name, phone, store_type, location_name, pincode)')
        .eq('business_id', businessId)
        .eq('salesman_id', user!.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!businessId && !!user?.id,
  });

  // ─── My current target ───
  const { data: currentTarget, isLoading: loadingTarget } = useQuery({
    queryKey: ['salesman-target', user?.id, businessId],
    queryFn: async () => {
      const todayStr = format(today, 'yyyy-MM-dd');
      const { data, error } = await (supabase as any)
        .from('salesman_targets')
        .select('*')
        .eq('business_id', businessId)
        .eq('salesman_id', user!.id)
        .lte('start_date', todayStr)
        .gte('end_date', todayStr)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!businessId && !!user?.id,
  });

  // ─── Recent orders (last 10) ───
  const { data: recentOrders = [] } = useQuery({
    queryKey: ['salesman-recent-orders', user?.id, businessId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bills')
        .select('id, bill_number, total_amount, status, created_at, customers(name)')
        .eq('business_id', businessId)
        .eq('created_by', user!.id)
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data || [];
    },
    enabled: !!businessId && !!user?.id,
  });

  // ─── Computed stats ───
  const todaySales = useMemo(() =>
    todayBills.filter((b: any) => b.status !== 'draft').reduce((s: number, b: any) => s + Number(b.total_amount || 0), 0),
    [todayBills]
  );
  const todayBillCount = todayBills.filter((b: any) => b.status !== 'draft').length;
  const todayDrafts = todayBills.filter((b: any) => b.status === 'draft').length;

  const monthSales = useMemo(() =>
    monthBills.filter((b: any) => b.status !== 'draft').reduce((s: number, b: any) => s + Number(b.total_amount || 0), 0),
    [monthBills]
  );
  const monthBillCount = monthBills.filter((b: any) => b.status !== 'draft').length;

  const targetAmount = Number(currentTarget?.target_amount || 0);
  const targetBills = Number(currentTarget?.target_bills || 0);
  const targetProgress = targetAmount > 0 ? Math.min(100, (monthSales / targetAmount) * 100) : 0;
  const billsProgress = targetBills > 0 ? Math.min(100, (monthBillCount / targetBills) * 100) : 0;

  const greeting = (() => {
    const h = today.getHours();
    if (h < 12) return 'Good Morning';
    if (h < 17) return 'Good Afternoon';
    return 'Good Evening';
  })();

  const isLoading = loadingBills || loadingMonth || loadingStores || loadingTarget;

  return (
    <div className="space-y-6 p-1">
      {/* ─── Header ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{greeting}, {salesmanName} 👋</h1>
          <p className="text-sm text-muted-foreground">{format(today, 'EEEE, dd MMMM yyyy')}</p>
        </div>
        <Button onClick={() => navigate('/salesman-billing')} className="gap-2">
          <Plus className="h-4 w-4" /> New Order
        </Button>
      </div>

      {/* ─── KPI Cards ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPICard
          icon={IndianRupee} label="Today's Sales" value={`${cs}${todaySales.toLocaleString('en-IN')}`}
          sub={`${todayBillCount} bill${todayBillCount !== 1 ? 's' : ''}`}
          color="emerald" loading={isLoading}
        />
        <KPICard
          icon={ShoppingCart} label="Bills Today" value={String(todayBillCount)}
          sub={todayDrafts > 0 ? `+${todayDrafts} drafts` : 'No drafts'}
          color="blue" loading={isLoading}
        />
        <KPICard
          icon={Store} label="My Stores" value={String(myStores.length)}
          sub="Assigned to you"
          color="violet" loading={isLoading}
          onClick={() => navigate('/salesman-stores')}
        />
        <KPICard
          icon={Target} label="Monthly Target" value={targetAmount > 0 ? `${Math.round(targetProgress)}%` : 'No target'}
          sub={targetAmount > 0 ? `${cs}${monthSales.toLocaleString('en-IN')} / ${cs}${targetAmount.toLocaleString('en-IN')}` : 'Ask your admin'}
          color="amber" loading={isLoading}
          onClick={() => navigate('/salesman-targets')}
        />
      </div>

      {/* ─── Target Progress ─── */}
      {currentTarget && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-4 w-4 text-amber-500" />
              {currentTarget.period === 'monthly' ? 'Monthly' : currentTarget.period === 'weekly' ? 'Weekly' : 'Daily'} Target Progress
              <span className="ml-auto text-xs text-muted-foreground">
                {format(new Date(currentTarget.start_date), 'dd MMM')} – {format(new Date(currentTarget.end_date), 'dd MMM')}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground">Sales Amount</span>
                <span className="font-semibold">{cs}{monthSales.toLocaleString('en-IN')} / {cs}{targetAmount.toLocaleString('en-IN')}</span>
              </div>
              <Progress value={targetProgress} className="h-3" />
            </div>
            {targetBills > 0 && (
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Bills Count</span>
                  <span className="font-semibold">{monthBillCount} / {targetBills}</span>
                </div>
                <Progress value={billsProgress} className="h-3" />
              </div>
            )}
            <div className="flex justify-between text-xs text-muted-foreground pt-1">
              <span>Remaining: {cs}{Math.max(0, targetAmount - monthSales).toLocaleString('en-IN')}</span>
              <span>{Math.round(targetProgress)}% achieved</span>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* ─── Recent Orders ─── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between">
              <span className="flex items-center gap-2"><Clock className="h-4 w-4" /> Recent Orders</span>
              <Button variant="ghost" size="sm" onClick={() => navigate('/bills-history')} className="text-xs gap-1">
                View All <ArrowRight className="h-3 w-3" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentOrders.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No orders yet. Start by creating a new order!</p>
            ) : (
              <div className="space-y-2">
                {recentOrders.slice(0, 6).map((bill: any) => (
                  <div key={bill.id} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{(bill as any).customers?.name || 'Walk-in'}</p>
                      <p className="text-xs text-muted-foreground">{bill.bill_number} · {format(new Date(bill.created_at), 'dd MMM, hh:mm a')}</p>
                    </div>
                    <div className="text-right flex-shrink-0 ml-3">
                      <p className="text-sm font-semibold">{cs}{Number(bill.total_amount).toLocaleString('en-IN')}</p>
                      <Badge variant={bill.status === 'draft' ? 'secondary' : bill.status === 'completed' ? 'default' : 'outline'} className="text-[10px]">
                        {bill.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ─── My Stores (quick view) ─── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between">
              <span className="flex items-center gap-2"><Store className="h-4 w-4" /> My Stores</span>
              <Button variant="ghost" size="sm" onClick={() => navigate('/salesman-stores')} className="text-xs gap-1">
                View All <ArrowRight className="h-3 w-3" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {myStores.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No stores assigned yet. Your admin will assign stores to you.</p>
            ) : (
              <div className="space-y-2">
                {myStores.slice(0, 6).map((s: any) => (
                  <div key={s.id} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/salesman-stores?store=${s.customer_id}`)}>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{s.customers?.name || 'Unknown Store'}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> {s.customers?.location_name || s.customers?.pincode || 'No location'}
                      </p>
                    </div>
                    {s.customers?.store_type && (
                      <Badge variant="outline" className="text-[10px] flex-shrink-0">{s.customers.store_type}</Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Simple KPI Card ───
function KPICard({ icon: Icon, label, value, sub, color, loading, onClick }: {
  icon: React.ElementType; label: string; value: string; sub?: string;
  color: 'emerald' | 'blue' | 'violet' | 'amber'; loading?: boolean; onClick?: () => void;
}) {
  const colorMap = {
    emerald: 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600',
    blue: 'bg-blue-50 dark:bg-blue-950/30 text-blue-600',
    violet: 'bg-violet-50 dark:bg-violet-950/30 text-violet-600',
    amber: 'bg-amber-50 dark:bg-amber-950/30 text-amber-600',
  };
  const iconBg = {
    emerald: 'bg-emerald-100 dark:bg-emerald-900/40',
    blue: 'bg-blue-100 dark:bg-blue-900/40',
    violet: 'bg-violet-100 dark:bg-violet-900/40',
    amber: 'bg-amber-100 dark:bg-amber-900/40',
  };

  return (
    <Card className={cn('cursor-default transition-shadow', onClick && 'cursor-pointer hover:shadow-md')} onClick={onClick}>
      <CardContent className="p-4">
        {loading ? (
          <div className="space-y-2"><Skeleton className="h-4 w-20" /><Skeleton className="h-7 w-24" /><Skeleton className="h-3 w-16" /></div>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-2">
              <div className={cn('p-1.5 rounded-lg', iconBg[color])}>
                <Icon className={cn('h-4 w-4', colorMap[color].split(' ').pop())} />
              </div>
              <span className="text-xs text-muted-foreground font-medium">{label}</span>
            </div>
            <p className="text-xl font-bold">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
          </>
        )}
      </CardContent>
    </Card>
  );
}
