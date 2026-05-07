import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import * as RechartsPrimitive from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Skeleton } from '@/components/ui/skeleton';
import {
  TrendingUp, Users, CreditCard, IndianRupee, BarChart3, PieChart,
  Download, Activity, ArrowUpRight, ArrowDownRight, Minus
} from 'lucide-react';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';

function formatCurrency(v: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v);
}
function formatCompact(v: number) {
  return new Intl.NumberFormat('en-IN', { notation: 'compact', maximumFractionDigits: 1 }).format(v);
}

const PLAN_COLORS = ['#2563eb', '#0f766e', '#d97706', '#e11d48', '#64748b', '#8b5cf6'];

export default function AnalyticsTab() {
  const [datePreset, setDatePreset] = useState('this-year');

  // Fetch all data
  const { data: profiles = [], isLoading: loadingProfiles } = useQuery({
    queryKey: ['analytics-profiles'],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('created_at, business_id');
      return data || [];
    },
  });

  const { data: subscriptions = [], isLoading: loadingSubs } = useQuery({
    queryKey: ['analytics-subscriptions'],
    queryFn: async () => {
      const { data } = await (supabase.rpc as any)('get_all_subscriptions');
      return (data || []) as any[];
    },
  });

  const { data: businesses = [], isLoading: loadingBiz } = useQuery({
    queryKey: ['analytics-businesses'],
    queryFn: async () => {
      const { data } = await supabase.from('businesses').select('id, created_at');
      return data || [];
    },
  });

  const { data: billsCount = 0 } = useQuery({
    queryKey: ['analytics-bills-count'],
    queryFn: async () => {
      const { count } = await supabase.from('bills').select('*', { count: 'exact', head: true });
      return count || 0;
    },
  });

  const { data: productsCount = 0 } = useQuery({
    queryKey: ['analytics-products-count'],
    queryFn: async () => {
      const { count } = await supabase.from('products').select('*', { count: 'exact', head: true });
      return count || 0;
    },
  });

  const { data: customersCount = 0 } = useQuery({
    queryKey: ['analytics-customers-count'],
    queryFn: async () => {
      const { count } = await supabase.from('customers').select('*', { count: 'exact', head: true });
      return count || 0;
    },
  });

  const isLoading = loadingProfiles || loadingSubs || loadingBiz;

  // Compute metrics
  const analytics = useMemo(() => {
    const now = new Date();
    const months = datePreset === 'this-month' ? 1 : 12;

    // User growth by month
    const userGrowth: { month: string; users: number }[] = [];
    for (let i = months - 1; i >= 0; i--) {
      const d = subMonths(now, i);
      const label = format(d, 'MMM yy');
      const start = startOfMonth(d);
      const end = endOfMonth(d);
      const count = profiles.filter(p => {
        const cd = new Date(p.created_at);
        return cd >= start && cd <= end;
      }).length;
      userGrowth.push({ month: label, users: count });
    }

    // Cumulative user growth
    let cumulative = 0;
    const cumulativeGrowth = userGrowth.map(ug => {
      cumulative += ug.users;
      return { month: ug.month, users: cumulative, newUsers: ug.users };
    });

    // Active subscriptions by month
    const activeSubs = subscriptions.filter((s: any) => s.status === 'active');
    const trialSubs = subscriptions.filter((s: any) => s.status === 'trialing');
    const expiredSubs = subscriptions.filter((s: any) => s.status === 'expired');

    // Revenue (MRR from active subs)
    const mrr = activeSubs.reduce((sum: number, s: any) => sum + Number(s.plan_price || 0), 0);
    const arr = mrr * 12;
    const arpu = businesses.length > 0 ? mrr / Math.max(activeSubs.length, 1) : 0;

    // Churn rate
    const totalSubs = subscriptions.length || 1;
    const churnRate = ((expiredSubs.length / totalSubs) * 100);
    const conversionRate = totalSubs > 0 ? ((activeSubs.length / totalSubs) * 100) : 0;

    // Plan distribution
    const planMap = new Map<string, number>();
    subscriptions.forEach((s: any) => {
      const name = s.plan_name || (s.status === 'trialing' ? 'Trial' : 'Unknown');
      planMap.set(name, (planMap.get(name) || 0) + 1);
    });
    const planPieData = [...planMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([name, value], i) => ({ name, value, color: PLAN_COLORS[i % PLAN_COLORS.length] }));

    // Revenue by month (simulated from subscription data)
    const revenueByMonth: { month: string; revenue: number }[] = [];
    for (let i = months - 1; i >= 0; i--) {
      const d = subMonths(now, i);
      const label = format(d, 'MMM yy');
      const mStart = startOfMonth(d);
      const mEnd = endOfMonth(d);
      // A sub was active during this month if:
      // 1. It was created before the month ended
      // 2. It hadn't ended before the month started (use current_period_end or trial_end as proxy)
      const monthActiveSubs = subscriptions.filter((s: any) => {
        const created = new Date(s.created_at || now);
        if (created > mEnd) return false;
        // If subscription has an end date, check it hasn't ended before this month
        const endDate = s.current_period_end || s.trial_end;
        if (endDate) {
          const ended = new Date(endDate);
          if (!isNaN(ended.getTime()) && ended < mStart) return false;
        } else if (s.status === 'expired') {
          return false; // expired with no end date, skip for past months
        }
        return true;
      });
      const monthRevenue = monthActiveSubs.reduce((sum: number, s: any) => sum + Number(s.plan_price || 0), 0);
      revenueByMonth.push({ month: label, revenue: monthRevenue });
    }

    // Business growth
    const bizGrowth: { month: string; businesses: number }[] = [];
    for (let i = months - 1; i >= 0; i--) {
      const d = subMonths(now, i);
      const label = format(d, 'MMM yy');
      const start = startOfMonth(d);
      const end = endOfMonth(d);
      const count = businesses.filter(b => {
        const cd = new Date(b.created_at);
        return cd >= start && cd <= end;
      }).length;
      bizGrowth.push({ month: label, businesses: count });
    }

    // Feature adoption
    const featureAdoption = [
      { feature: 'Billing', count: billsCount },
      { feature: 'Products', count: productsCount },
      { feature: 'Customers', count: customersCount },
      { feature: 'Subscriptions', count: subscriptions.length },
      { feature: 'Businesses', count: businesses.length },
    ].sort((a, b) => b.count - a.count);

    // Previous month comparison
    const prevMonthStart = startOfMonth(subMonths(now, 1));
    const prevMonthEnd = endOfMonth(subMonths(now, 1));
    const thisMonthStart = startOfMonth(now);
    const thisMonthEnd = endOfMonth(now);

    const newUsersThisMonth = profiles.filter(p => {
      const d = new Date(p.created_at);
      return d >= thisMonthStart && d <= thisMonthEnd;
    }).length;
    const newUsersLastMonth = profiles.filter(p => {
      const d = new Date(p.created_at);
      return d >= prevMonthStart && d <= prevMonthEnd;
    }).length;
    const userGrowthPct = newUsersLastMonth > 0 ? ((newUsersThisMonth - newUsersLastMonth) / newUsersLastMonth * 100) : 0;

    return {
      totalUsers: profiles.length,
      totalBusinesses: businesses.length,
      activeSubs: activeSubs.length,
      trialSubs: trialSubs.length,
      expiredSubs: expiredSubs.length,
      mrr, arr, arpu,
      churnRate,
      conversionRate,
      userGrowth: cumulativeGrowth,
      revenueByMonth,
      bizGrowth,
      planPieData,
      featureAdoption,
      userGrowthPct,
      newUsersThisMonth,
    };
  }, [profiles, subscriptions, businesses, billsCount, productsCount, customersCount, datePreset]);

  const handleExportCSV = () => {
    const rows = [
      { Metric: 'Total Users', Value: analytics.totalUsers },
      { Metric: 'Total Businesses', Value: analytics.totalBusinesses },
      { Metric: 'Active Subscriptions', Value: analytics.activeSubs },
      { Metric: 'Trial Subscriptions', Value: analytics.trialSubs },
      { Metric: 'Expired Subscriptions', Value: analytics.expiredSubs },
      { Metric: 'MRR', Value: analytics.mrr },
      { Metric: 'ARR', Value: analytics.arr },
      { Metric: 'ARPU', Value: analytics.arpu.toFixed(2) },
      { Metric: 'Churn Rate %', Value: analytics.churnRate.toFixed(1) },
      { Metric: 'Conversion Rate %', Value: analytics.conversionRate.toFixed(1) },
    ];
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [{ wch: 25 }, { wch: 15 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Analytics');

    // Revenue sheet
    const revWs = XLSX.utils.json_to_sheet(analytics.revenueByMonth.map(r => ({ Month: r.month, 'Revenue (₹)': r.revenue })));
    XLSX.utils.book_append_sheet(wb, revWs, 'Revenue');

    XLSX.writeFile(wb, `platform_analytics_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    toast.success('Analytics exported');
  };

  const TrendBadge = ({ value, suffix = '%' }: { value: number; suffix?: string }) => {
    if (value > 0) return <span className="inline-flex items-center gap-0.5 text-emerald-600 text-xs font-semibold"><ArrowUpRight className="h-3 w-3" />+{value.toFixed(1)}{suffix}</span>;
    if (value < 0) return <span className="inline-flex items-center gap-0.5 text-red-500 text-xs font-semibold"><ArrowDownRight className="h-3 w-3" />{value.toFixed(1)}{suffix}</span>;
    return <span className="inline-flex items-center gap-0.5 text-slate-400 text-xs font-semibold"><Minus className="h-3 w-3" />0{suffix}</span>;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-72 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Platform Analytics</h2>
          <p className="text-sm text-muted-foreground mt-1">Growth, revenue, and engagement metrics across the platform.</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={datePreset} onValueChange={setDatePreset}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="this-month">This Month</SelectItem>
              <SelectItem value="this-year">This Year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={handleExportCSV}>
            <Download className="h-3.5 w-3.5" />Export
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-200/70 shadow-sm">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">Total Users</p>
                <p className="text-3xl font-bold tracking-tight mt-1">{analytics.totalUsers.toLocaleString('en-IN')}</p>
                <div className="mt-1.5">
                  <TrendBadge value={analytics.userGrowthPct} />
                  <span className="text-[10px] text-muted-foreground ml-1">vs last month</span>
                </div>
              </div>
              <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/70 shadow-sm">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">MRR</p>
                <p className="text-3xl font-bold tracking-tight mt-1">{formatCurrency(analytics.mrr)}</p>
                <p className="text-[10px] text-muted-foreground mt-1.5">ARR: {formatCurrency(analytics.arr)}</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <IndianRupee className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/70 shadow-sm">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">Conversion Rate</p>
                <p className="text-3xl font-bold tracking-tight mt-1">{analytics.conversionRate.toFixed(1)}%</p>
                <p className="text-[10px] text-muted-foreground mt-1.5">{analytics.activeSubs} active / {analytics.activeSubs + analytics.trialSubs + analytics.expiredSubs} total</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/70 shadow-sm">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">Churn Rate</p>
                <p className="text-3xl font-bold tracking-tight mt-1">{analytics.churnRate.toFixed(1)}%</p>
                <p className="text-[10px] text-muted-foreground mt-1.5">{analytics.expiredSubs} expired accounts</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-rose-500/10 flex items-center justify-center">
                <Activity className="h-5 w-5 text-rose-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* User Growth */}
        <Card className="xl:col-span-8 border-slate-200/70 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold">User Growth</CardTitle>
                <CardDescription className="text-xs">Cumulative platform users over time</CardDescription>
              </div>
              <Badge variant="secondary" className="text-[10px]">{analytics.newUsersThisMonth} new this month</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ChartContainer config={{ users: { label: 'Total Users', color: '#2563eb' }, newUsers: { label: 'New Users', color: '#22c55e' } }}>
                <RechartsPrimitive.ComposedChart data={analytics.userGrowth} margin={{ top: 10, right: 16, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="analyticsUserFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <RechartsPrimitive.CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <RechartsPrimitive.XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <RechartsPrimitive.YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <RechartsPrimitive.Tooltip />
                  <RechartsPrimitive.Area type="monotone" dataKey="users" stroke="#2563eb" strokeWidth={2} fill="url(#analyticsUserFill)" />
                  <RechartsPrimitive.Bar dataKey="newUsers" fill="#22c55e" radius={[3, 3, 0, 0]} barSize={16} opacity={0.7} />
                </RechartsPrimitive.ComposedChart>
              </ChartContainer>
            </div>
          </CardContent>
        </Card>

        {/* Plan Distribution */}
        <Card className="xl:col-span-4 border-slate-200/70 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold">Plan Distribution</CardTitle>
            <CardDescription className="text-xs">Active subscription breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-48 mb-4">
              <ChartContainer config={Object.fromEntries(analytics.planPieData.map(p => [p.name, { label: p.name, color: p.color }]))}>
                <RechartsPrimitive.PieChart>
                  <RechartsPrimitive.Pie data={analytics.planPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} strokeWidth={0}>
                    {analytics.planPieData.map((entry, i) => (
                      <RechartsPrimitive.Cell key={i} fill={entry.color} />
                    ))}
                  </RechartsPrimitive.Pie>
                  <RechartsPrimitive.Tooltip formatter={(value: number, name: string) => [`${value} accounts`, name]} />
                </RechartsPrimitive.PieChart>
              </ChartContainer>
            </div>
            <div className="space-y-2">
              {analytics.planPieData.map(p => (
                <div key={p.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                    <span className="text-slate-700 font-medium">{p.name}</span>
                  </div>
                  <span className="font-bold text-slate-900">{p.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Revenue Trend */}
        <Card className="xl:col-span-6 border-slate-200/70 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold">Revenue Trend</CardTitle>
                <CardDescription className="text-xs">Monthly subscription revenue</CardDescription>
              </div>
              <Badge variant="secondary" className="text-[10px]">ARPU: {formatCurrency(analytics.arpu)}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-56">
              <ChartContainer config={{ revenue: { label: 'Revenue', color: '#0f766e' } }}>
                <RechartsPrimitive.AreaChart data={analytics.revenueByMonth} margin={{ top: 10, right: 16, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="analyticsRevFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0f766e" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#0f766e" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <RechartsPrimitive.CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <RechartsPrimitive.XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <RechartsPrimitive.YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={v => formatCompact(Number(v))} />
                  <RechartsPrimitive.Tooltip formatter={(v: number) => [formatCurrency(v), 'Revenue']} />
                  <RechartsPrimitive.Area type="monotone" dataKey="revenue" stroke="#0f766e" strokeWidth={2} fill="url(#analyticsRevFill)" />
                </RechartsPrimitive.AreaChart>
              </ChartContainer>
            </div>
          </CardContent>
        </Card>

        {/* Business Growth */}
        <Card className="xl:col-span-6 border-slate-200/70 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold">Business Registrations</CardTitle>
            <CardDescription className="text-xs">New businesses registered per month</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-56">
              <ChartContainer config={{ businesses: { label: 'Businesses', color: '#8b5cf6' } }}>
                <RechartsPrimitive.BarChart data={analytics.bizGrowth} margin={{ top: 10, right: 16, left: -10, bottom: 0 }}>
                  <RechartsPrimitive.CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <RechartsPrimitive.XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <RechartsPrimitive.YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <RechartsPrimitive.Tooltip />
                  <RechartsPrimitive.Bar dataKey="businesses" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </RechartsPrimitive.BarChart>
              </ChartContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Feature Adoption */}
      <Card className="border-slate-200/70 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-bold">Platform Usage Metrics</CardTitle>
          <CardDescription className="text-xs">Total records across key platform features</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            {analytics.featureAdoption.map(f => (
              <div key={f.feature} className="rounded-xl border border-slate-200/70 bg-slate-50/80 p-4 text-center">
                <p className="text-2xl font-bold tracking-tight">{f.count.toLocaleString('en-IN')}</p>
                <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider mt-1">{f.feature}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
