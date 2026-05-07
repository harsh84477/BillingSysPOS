import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import * as RechartsPrimitive from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChartContainer } from '@/components/ui/chart';
import { Skeleton } from '@/components/ui/skeleton';
import {
  IndianRupee, TrendingUp, Crown, BarChart3,
  Download, ArrowUpRight, PieChart, Building2
} from 'lucide-react';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { cn } from '@/lib/utils';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';

function formatCurrency(v: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v);
}

const PLAN_COLORS = ['#2563eb', '#0f766e', '#d97706', '#e11d48', '#8b5cf6', '#64748b'];

export default function RevenueTab() {
  const { data: subscriptions = [], isLoading } = useQuery({
    queryKey: ['revenue-subscriptions'],
    queryFn: async () => {
      const { data } = await (supabase.rpc as any)('get_all_subscriptions');
      return (data || []) as any[];
    },
  });

  const { data: plans = [] } = useQuery({
    queryKey: ['revenue-plans'],
    queryFn: async () => {
      const { data } = await supabase.from('subscription_plans').select('*').eq('is_active', true).order('price');
      return data || [];
    },
  });

  const revenue = useMemo(() => {
    const now = new Date();
    const activeSubs = subscriptions.filter((s: any) => s.status === 'active');
    const allSubs = subscriptions;

    // MRR
    const mrr = activeSubs.reduce((sum: number, s: any) => sum + Number(s.plan_price || 0), 0);
    const arr = mrr * 12;
    const arpu = activeSubs.length > 0 ? mrr / activeSubs.length : 0;

    // LTV estimate (avg lifetime in months * ARPU)
    const avgLifetimeMonths = 12; // placeholder assumption
    const ltv = arpu * avgLifetimeMonths;

    // Revenue by plan
    const planRevenueMap = new Map<string, { name: string; revenue: number; count: number; color: string }>();
    activeSubs.forEach((s: any) => {
      const name = s.plan_name || 'Unknown';
      const existing = planRevenueMap.get(name) || { name, revenue: 0, count: 0, color: '#64748b' };
      existing.revenue += Number(s.plan_price || 0);
      existing.count += 1;
      planRevenueMap.set(name, existing);
    });
    const revenueByPlan = [...planRevenueMap.values()]
      .sort((a, b) => b.revenue - a.revenue)
      .map((p, i) => ({ ...p, color: PLAN_COLORS[i % PLAN_COLORS.length] }));

    // Revenue by month (last 12 months)
    const revenueByMonth: { month: string; revenue: number; subs: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = subMonths(now, i);
      const label = format(d, 'MMM yy');
      const mStart = startOfMonth(d);
      const mEnd = endOfMonth(d);
      // A sub was active during this month if:
      // 1. It was created before the month ended
      // 2. It hadn't ended before the month started
      const monthActiveSubs = allSubs.filter((s: any) => {
        const created = new Date(s.created_at || now);
        if (created > mEnd) return false;
        const endDate = s.current_period_end || s.trial_end;
        if (endDate) {
          const ended = new Date(endDate);
          if (!isNaN(ended.getTime()) && ended < mStart) return false;
        } else if (s.status === 'expired') {
          return false;
        }
        return true;
      });
      const monthRevenue = monthActiveSubs.reduce((sum: number, s: any) => sum + Number(s.plan_price || 0), 0);
      revenueByMonth.push({ month: label, revenue: monthRevenue, subs: monthActiveSubs.length });
    }

    // Top earning businesses
    const bizRevenueMap = new Map<string, { name: string; revenue: number; plan: string; status: string }>();
    activeSubs.forEach((s: any) => {
      const key = s.business_id;
      const existing = bizRevenueMap.get(key);
      if (!existing || Number(s.plan_price || 0) > existing.revenue) {
        bizRevenueMap.set(key, {
          name: s.business_name || 'Unknown',
          revenue: Number(s.plan_price || 0),
          plan: s.plan_name || 'Unknown',
          status: s.status,
        });
      }
    });
    const topBusinesses = [...bizRevenueMap.values()]
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 15);

    // Collection rate
    const totalPaid = activeSubs.length;
    const totalExpired = allSubs.filter((s: any) => s.status === 'expired').length;
    const collectionRate = allSubs.length > 0 ? ((totalPaid / allSubs.length) * 100) : 0;

    // MRR growth (vs last month)
    const lastMonthStart = startOfMonth(subMonths(now, 1));
    const lastMonthEnd = endOfMonth(subMonths(now, 1));
    const lastMonthActiveSubs = allSubs.filter((s: any) => {
      const created = new Date(s.created_at || now);
      if (created > lastMonthEnd) return false;
      const endDate = s.current_period_end || s.trial_end;
      if (endDate) {
        const ended = new Date(endDate);
        if (!isNaN(ended.getTime()) && ended < lastMonthStart) return false;
      } else if (s.status === 'expired') {
        return false;
      }
      return true;
    });
    const lastMonthMRR = lastMonthActiveSubs.reduce((sum: number, s: any) => sum + Number(s.plan_price || 0), 0);
    const mrrGrowth = lastMonthMRR > 0 ? ((mrr - lastMonthMRR) / lastMonthMRR * 100) : 0;

    return {
      mrr, arr, arpu, ltv,
      revenueByPlan,
      revenueByMonth,
      topBusinesses,
      collectionRate,
      mrrGrowth,
      activeSubs: activeSubs.length,
      totalSubs: allSubs.length,
    };
  }, [subscriptions]);

  const handleExport = () => {
    const wb = XLSX.utils.book_new();

    // Summary
    const summaryRows = [
      { Metric: 'MRR', Value: revenue.mrr },
      { Metric: 'ARR', Value: revenue.arr },
      { Metric: 'ARPU', Value: Math.round(revenue.arpu) },
      { Metric: 'LTV (est)', Value: Math.round(revenue.ltv) },
      { Metric: 'Collection Rate %', Value: Math.round(revenue.collectionRate) },
      { Metric: 'Active Subscriptions', Value: revenue.activeSubs },
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryRows), 'Summary');

    // Monthly
    const monthRows = revenue.revenueByMonth.map(r => ({ Month: r.month, 'Revenue (₹)': r.revenue, Subscribers: r.subs }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(monthRows), 'Monthly');

    // Top businesses
    const bizRows = revenue.topBusinesses.map((b, i) => ({ Rank: i + 1, Business: b.name, Plan: b.plan, 'Revenue (₹)': b.revenue }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(bizRows), 'Top Businesses');

    XLSX.writeFile(wb, `revenue_report_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    toast.success('Revenue report exported');
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{[1,2,3,4].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}</div>
        <Skeleton className="h-72 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Revenue Dashboard</h2>
          <p className="text-sm text-muted-foreground mt-1">Track recurring revenue, plan performance, and business contributions.</p>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5 self-start" onClick={handleExport}>
          <Download className="h-3.5 w-3.5" />Export Report
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-200/70 shadow-sm">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">Monthly Revenue</p>
                <p className="text-3xl font-bold tracking-tight mt-1">{formatCurrency(revenue.mrr)}</p>
                <div className="mt-1.5 flex items-center gap-1">
                  {revenue.mrrGrowth >= 0 ? (
                    <span className="text-emerald-600 text-xs font-semibold flex items-center gap-0.5"><ArrowUpRight className="h-3 w-3" />+{revenue.mrrGrowth.toFixed(1)}%</span>
                  ) : (
                    <span className="text-red-500 text-xs font-semibold">{revenue.mrrGrowth.toFixed(1)}%</span>
                  )}
                  <span className="text-[10px] text-muted-foreground">vs last month</span>
                </div>
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
                <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">Annual Run Rate</p>
                <p className="text-3xl font-bold tracking-tight mt-1">{formatCurrency(revenue.arr)}</p>
                <p className="text-[10px] text-muted-foreground mt-1.5">{revenue.activeSubs} active subscribers</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/70 shadow-sm">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">ARPU</p>
                <p className="text-3xl font-bold tracking-tight mt-1">{formatCurrency(revenue.arpu)}</p>
                <p className="text-[10px] text-muted-foreground mt-1.5">LTV est: {formatCurrency(revenue.ltv)}</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
                <Crown className="h-5 w-5 text-violet-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/70 shadow-sm">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">Collection Rate</p>
                <p className="text-3xl font-bold tracking-tight mt-1">{revenue.collectionRate.toFixed(1)}%</p>
                <p className="text-[10px] text-muted-foreground mt-1.5">{revenue.activeSubs} / {revenue.totalSubs} paying</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <BarChart3 className="h-5 w-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Revenue Trend */}
        <Card className="xl:col-span-8 border-slate-200/70 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold">Revenue Trend</CardTitle>
            <CardDescription className="text-xs">Monthly subscription revenue over the past year</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ChartContainer config={{ revenue: { label: 'Revenue', color: '#0f766e' }, subs: { label: 'Subscribers', color: '#8b5cf6' } }}>
                <RechartsPrimitive.ComposedChart data={revenue.revenueByMonth} margin={{ top: 10, right: 16, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0f766e" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#0f766e" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <RechartsPrimitive.CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <RechartsPrimitive.XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <RechartsPrimitive.YAxis yAxisId="revenue" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <RechartsPrimitive.YAxis yAxisId="subs" orientation="right" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <RechartsPrimitive.Tooltip />
                  <RechartsPrimitive.Area yAxisId="revenue" type="monotone" dataKey="revenue" stroke="#0f766e" strokeWidth={2} fill="url(#revenueFill)" />
                  <RechartsPrimitive.Line yAxisId="subs" type="monotone" dataKey="subs" stroke="#8b5cf6" strokeWidth={2} dot={false} strokeDasharray="5 5" />
                </RechartsPrimitive.ComposedChart>
              </ChartContainer>
            </div>
          </CardContent>
        </Card>

        {/* Revenue by Plan */}
        <Card className="xl:col-span-4 border-slate-200/70 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold">Revenue by Plan</CardTitle>
            <CardDescription className="text-xs">Monthly contribution per plan tier</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-48 mb-4">
              <ChartContainer config={Object.fromEntries(revenue.revenueByPlan.map(p => [p.name, { label: p.name, color: p.color }]))}>
                <RechartsPrimitive.PieChart>
                  <RechartsPrimitive.Pie data={revenue.revenueByPlan} dataKey="revenue" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} strokeWidth={0}>
                    {revenue.revenueByPlan.map((entry, i) => (
                      <RechartsPrimitive.Cell key={i} fill={entry.color} />
                    ))}
                  </RechartsPrimitive.Pie>
                  <RechartsPrimitive.Tooltip formatter={(v: number) => [formatCurrency(v), 'Revenue']} />
                </RechartsPrimitive.PieChart>
              </ChartContainer>
            </div>
            <div className="space-y-2">
              {revenue.revenueByPlan.map(p => (
                <div key={p.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                    <span className="text-slate-700 font-medium">{p.name}</span>
                    <Badge variant="outline" className="text-[9px]">{p.count}</Badge>
                  </div>
                  <span className="font-bold text-slate-900">{formatCurrency(p.revenue)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Earning Businesses */}
      <Card className="border-slate-200/70 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Crown className="h-4 w-4 text-amber-500" />Top Earning Businesses
            <Badge variant="outline" className="text-xs ml-1">{revenue.topBusinesses.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {revenue.topBusinesses.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Building2 className="h-12 w-12 mx-auto opacity-10 mb-4" />
              <p className="text-sm">No revenue data available.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="w-12 text-center">#</TableHead>
                    <TableHead>Business</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead className="text-right">Revenue/Month</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {revenue.topBusinesses.map((b, i) => (
                    <TableRow key={i} className="hover:bg-muted/30">
                      <TableCell className="text-center">
                        {i < 3 ? (
                          <span className={cn('inline-flex items-center justify-center h-6 w-6 rounded-full text-[10px] font-bold',
                            i === 0 ? 'bg-amber-100 text-amber-700' : i === 1 ? 'bg-slate-200 text-slate-700' : 'bg-orange-100 text-orange-700'
                          )}>{i + 1}</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">{i + 1}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            <Building2 className="h-4 w-4 text-primary" />
                          </div>
                          <p className="font-semibold text-sm">{b.name}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">{b.plan}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-bold text-emerald-700">{formatCurrency(b.revenue)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
