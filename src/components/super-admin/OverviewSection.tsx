import React from "react";
import { useQuery } from "@tanstack/react-query";
import { format, subMonths, startOfMonth, endOfMonth, subDays, isWithinInterval } from "date-fns";
import { Link } from "react-router-dom";
import * as RechartsPrimitive from "recharts";
import {
  Building2, Users, CreditCard, IndianRupee, TrendingUp,
  ArrowUpRight, ArrowDownRight, RefreshCw, Clock, AlertTriangle,
  Activity, Crown, ScrollText, Zap,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ChartContainer } from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// ─── Helpers ───
function formatCurrency(v: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(v);
}

function parseNum(v: number | string | null | undefined): number {
  if (typeof v === "number") return v;
  if (typeof v === "string") { const n = Number(v); return Number.isFinite(n) ? n : 0; }
  return 0;
}

function normalizeMonthly(price: number, period?: string | null): number {
  const p = (period || "").toLowerCase();
  if (p.includes("year")) return price / 12;
  if (p.includes("6") || p.includes("semi")) return price / 6;
  return price;
}

const CHART_COLORS = { teal: "#0f766e", blue: "#2563eb", violet: "#8b5cf6", amber: "#f59e0b", red: "#ef4444", slate: "#64748b" };
const PLAN_COLORS = [CHART_COLORS.blue, CHART_COLORS.teal, CHART_COLORS.amber, CHART_COLORS.red, CHART_COLORS.violet, CHART_COLORS.slate];

// ─── Data Hook ───
function useOverviewData() {
  return useQuery({
    queryKey: ["super-admin-overview-v2"],
    staleTime: 60_000,
    refetchInterval: 120_000,
    queryFn: async () => {
      const now = new Date();
      const rpc = async (name: string) => {
        try { const { data } = await (supabase.rpc as any)(name); return data; } catch { return null; }
      };

      const [subsRaw, logsRaw, statsRaw] = await Promise.all([
        rpc("get_all_subscriptions"),
        rpc("get_admin_logs"),
        rpc("get_platform_stats_v2"),
      ]);

      // Also fetch direct counts as fallback
      const [{ count: bizCount }, { count: userCount }] = await Promise.all([
        supabase.from("businesses").select("*", { count: "exact", head: true }),
        supabase.from("profiles").select("*", { count: "exact", head: true }),
      ]);

      const subs: any[] = subsRaw || [];
      const logs: any[] = (logsRaw || []).slice(0, 10);

      const activeSubs = subs.filter((s: any) => s.status === "active");
      const trialSubs = subs.filter((s: any) => s.status === "trialing");
      const expiredSubs = subs.filter((s: any) => s.status === "expired");

      const totalBiz = statsRaw?.total_businesses ?? bizCount ?? 0;
      const totalUsers = statsRaw?.total_users ?? userCount ?? 0;

      // MRR
      const mrr = activeSubs.reduce((sum: number, s: any) => sum + normalizeMonthly(parseNum(s.plan_price), s.billing_period), 0);

      // Last month MRR for growth calc
      const lastMonthStart = startOfMonth(subMonths(now, 1));
      const lastMonthEnd = endOfMonth(subMonths(now, 1));
      const lastMonthActive = subs.filter((s: any) => {
        const created = new Date(s.created_at || now);
        if (created > lastMonthEnd) return false;
        const endDate = s.current_period_end || s.trial_end;
        if (endDate) {
          const ended = new Date(endDate);
          if (!isNaN(ended.getTime()) && ended < lastMonthStart) return false;
        } else if (s.status === 'expired') return false;
        return true;
      });
      const lastMrr = lastMonthActive.reduce((sum: number, s: any) => sum + normalizeMonthly(parseNum(s.plan_price), s.billing_period), 0);
      const mrrGrowth = lastMrr > 0 ? ((mrr - lastMrr) / lastMrr) * 100 : 0;

      // New biz in last 30 days
      const newBiz30d = statsRaw?.new_businesses_30d ?? 0;

      // Renewals due in 14 days
      const renewalsDue = subs.filter((s: any) => {
        const d = s.current_period_end ?? s.trial_end;
        if (!d) return false;
        const parsed = new Date(d);
        if (isNaN(parsed.getTime())) return false;
        return isWithinInterval(parsed, { start: subDays(now, 1), end: new Date(now.getTime() + 14 * 86400000) });
      }).length;

      // Revenue by month (last 12)
      const revenueByMonth: { month: string; revenue: number }[] = [];
      for (let i = 11; i >= 0; i--) {
        const d = subMonths(now, i);
        const label = format(d, "MMM yy");
        const mStart = startOfMonth(d);
        const mEnd = endOfMonth(d);
        const monthActive = subs.filter((s: any) => {
          const created = new Date(s.created_at || now);
          if (created > mEnd) return false;
          const endDate = s.current_period_end || s.trial_end;
          if (endDate) {
            const ended = new Date(endDate);
            if (!isNaN(ended.getTime()) && ended < mStart) return false;
          } else if (s.status === 'expired') return false;
          return true;
        });
        const rev = monthActive.reduce((sum: number, s: any) => sum + normalizeMonthly(parseNum(s.plan_price), s.billing_period), 0);
        revenueByMonth.push({ month: label, revenue: Math.round(rev) });
      }

      // Plan distribution
      const planMap = new Map<string, { count: number; revenue: number }>();
      activeSubs.forEach((s: any) => {
        const name = s.plan_name || "Unknown";
        const e = planMap.get(name) || { count: 0, revenue: 0 };
        e.count += 1;
        e.revenue += parseNum(s.plan_price);
        planMap.set(name, e);
      });
      const planMix = [...planMap.entries()]
        .sort((a, b) => b[1].count - a[1].count)
        .map(([name, d], i) => ({ name, value: d.count, revenue: d.revenue, color: PLAN_COLORS[i % PLAN_COLORS.length] }));

      // Top businesses
      const bizRevMap = new Map<string, { name: string; revenue: number; plan: string }>();
      activeSubs.forEach((s: any) => {
        const existing = bizRevMap.get(s.business_id);
        if (!existing || parseNum(s.plan_price) > existing.revenue) {
          bizRevMap.set(s.business_id, { name: s.business_name || "Unknown", revenue: parseNum(s.plan_price), plan: s.plan_name || "Unknown" });
        }
      });
      const topBusinesses = [...bizRevMap.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 5);

      // Collection rate
      const collectionRate = subs.length > 0 ? (activeSubs.length / subs.length) * 100 : 0;

      return {
        totalBiz, totalUsers, mrr, mrrGrowth, newBiz30d,
        activeSubs: activeSubs.length, trialSubs: trialSubs.length, expiredSubs: expiredSubs.length,
        renewalsDue, collectionRate,
        revenueByMonth, planMix, topBusinesses, logs,
      };
    },
  });
}

// ─── Component ───
export default function OverviewSection() {
  const { customAdminName } = useAuth();
  const { data, isLoading, refetch, dataUpdatedAt } = useOverviewData();

  if (isLoading || !data) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{[1,2,3,4].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}</div>
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          <Skeleton className="xl:col-span-8 h-72 rounded-xl" />
          <Skeleton className="xl:col-span-4 h-72 rounded-xl" />
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  const lastSync = dataUpdatedAt ? format(new Date(dataUpdatedAt), "hh:mm a") : "—";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Platform Overview</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Welcome back, <span className="font-semibold text-foreground">{customAdminName || "Admin"}</span> · Last synced {lastSync}
          </p>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5 self-start" onClick={() => refetch()}>
          <RefreshCw className="h-3.5 w-3.5" />Refresh
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total Businesses" value={data.totalBiz.toLocaleString("en-IN")} sub={`${data.newBiz30d} new in 30 days`} icon={Building2} color="blue" />
        <KpiCard label="Platform Users" value={data.totalUsers.toLocaleString("en-IN")} sub={`${data.activeSubs + data.trialSubs} with subscriptions`} icon={Users} color="violet" />
        <KpiCard label="Monthly Revenue" value={formatCurrency(data.mrr)} sub={<MrrGrowth value={data.mrrGrowth} />} icon={IndianRupee} color="emerald" />
        <KpiCard label="Active Subscriptions" value={data.activeSubs.toLocaleString("en-IN")} sub={`${data.trialSubs} trialing · ${data.expiredSubs} expired`} icon={CreditCard} color="amber" />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Revenue Trend */}
        <Card className="xl:col-span-8 border-slate-200/70 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold">Revenue Trend</CardTitle>
            <CardDescription className="text-xs">Monthly subscription revenue over the past 12 months</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ChartContainer config={{ revenue: { label: "Revenue", color: CHART_COLORS.teal } }}>
                <RechartsPrimitive.AreaChart data={data.revenueByMonth} margin={{ top: 10, right: 16, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="overviewRevFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={CHART_COLORS.teal} stopOpacity={0.15} />
                      <stop offset="95%" stopColor={CHART_COLORS.teal} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <RechartsPrimitive.CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <RechartsPrimitive.XAxis dataKey="month" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                  <RechartsPrimitive.YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `₹${(v/1000).toFixed(0)}k`} />
                  <RechartsPrimitive.Tooltip formatter={(v: number) => [formatCurrency(v), "Revenue"]} />
                  <RechartsPrimitive.Area type="monotone" dataKey="revenue" stroke={CHART_COLORS.teal} strokeWidth={2} fill="url(#overviewRevFill)" />
                </RechartsPrimitive.AreaChart>
              </ChartContainer>
            </div>
          </CardContent>
        </Card>

        {/* Plan Distribution */}
        <Card className="xl:col-span-4 border-slate-200/70 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold">Plan Distribution</CardTitle>
            <CardDescription className="text-xs">Active subscriptions by plan tier</CardDescription>
          </CardHeader>
          <CardContent>
            {data.planMix.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground text-sm">No active plans</div>
            ) : (
              <>
                <div className="h-44">
                  <ChartContainer config={Object.fromEntries(data.planMix.map(p => [p.name, { label: p.name, color: p.color }]))}>
                    <RechartsPrimitive.PieChart>
                      <RechartsPrimitive.Pie data={data.planMix} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={42} outerRadius={68} paddingAngle={3} strokeWidth={0}>
                        {data.planMix.map((entry, i) => <RechartsPrimitive.Cell key={i} fill={entry.color} />)}
                      </RechartsPrimitive.Pie>
                      <RechartsPrimitive.Tooltip formatter={(v: number, n: string) => [`${v} subs`, n]} />
                    </RechartsPrimitive.PieChart>
                  </ChartContainer>
                </div>
                <div className="space-y-2 mt-2">
                  {data.planMix.map(p => (
                    <div key={p.name} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                        <span className="text-slate-700 font-medium">{p.name}</span>
                        <Badge variant="outline" className="text-[9px]">{p.value}</Badge>
                      </div>
                      <span className="font-bold text-slate-900 text-xs">{formatCurrency(p.revenue)}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row: Activity + Quick Stats */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Recent Activity */}
        <Card className="xl:col-span-6 border-slate-200/70 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <ScrollText className="h-4 w-4 text-primary" />Recent Activity
              </CardTitle>
              <Link to="/super-admin/logs" className="text-xs text-primary hover:underline font-medium">View all</Link>
            </div>
          </CardHeader>
          <CardContent>
            {data.logs.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground text-sm">No recent activity</div>
            ) : (
              <div className="space-y-3">
                {data.logs.map((log: any) => (
                  <div key={log.id} className="flex gap-3 items-start">
                    <div className="h-2 w-2 rounded-full bg-primary mt-2 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{(log.action || "event").replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {log.target_type && <span className="capitalize">{log.target_type}</span>}
                        {log.target_id && <span className="font-mono ml-1">· {log.target_id.slice(0, 8)}…</span>}
                      </p>
                    </div>
                    <span className="text-[10px] text-muted-foreground font-mono whitespace-nowrap shrink-0">
                      {log.created_at ? format(new Date(log.created_at), "MMM dd, HH:mm") : "—"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card className="xl:col-span-6 border-slate-200/70 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />Quick Stats
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <QuickStat icon={AlertTriangle} label="Renewals Due" value={data.renewalsDue} sub="Next 14 days" color="text-amber-600 bg-amber-500/10" to="/super-admin/subscriptions" />
              <QuickStat icon={TrendingUp} label="Collection Rate" value={`${data.collectionRate.toFixed(0)}%`} sub={`${data.activeSubs}/${data.activeSubs + data.trialSubs + data.expiredSubs} paying`} color="text-emerald-600 bg-emerald-500/10" to="/super-admin/revenue" />
              <QuickStat icon={Clock} label="Trialing" value={data.trialSubs} sub="Active trials" color="text-blue-600 bg-blue-500/10" to="/super-admin/analytics" />
              <QuickStat icon={Activity} label="New (30d)" value={data.newBiz30d} sub="Businesses joined" color="text-violet-600 bg-violet-500/10" to="/super-admin/tenants" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Businesses */}
      {data.topBusinesses.length > 0 && (
        <Card className="border-slate-200/70 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Crown className="h-4 w-4 text-amber-500" />Top Earning Businesses
                <Badge variant="outline" className="text-xs ml-1">{data.topBusinesses.length}</Badge>
              </CardTitle>
              <Link to="/super-admin/revenue" className="text-xs text-primary hover:underline font-medium">Full report</Link>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/40 text-xs text-muted-foreground">
                    <th className="text-left font-semibold px-6 py-3 w-12">#</th>
                    <th className="text-left font-semibold px-6 py-3">Business</th>
                    <th className="text-left font-semibold px-6 py-3">Plan</th>
                    <th className="text-right font-semibold px-6 py-3">Revenue/mo</th>
                  </tr>
                </thead>
                <tbody>
                  {data.topBusinesses.map((b, i) => (
                    <tr key={i} className="border-t border-border hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-3">
                        {i < 3 ? (
                          <span className={cn("inline-flex items-center justify-center h-6 w-6 rounded-full text-[10px] font-bold",
                            i === 0 ? "bg-amber-100 text-amber-700" : i === 1 ? "bg-slate-200 text-slate-700" : "bg-orange-100 text-orange-700"
                          )}>{i + 1}</span>
                        ) : <span className="text-xs text-muted-foreground ml-1.5">{i + 1}</span>}
                      </td>
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            <Building2 className="h-4 w-4 text-primary" />
                          </div>
                          <span className="font-semibold">{b.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-3"><Badge variant="outline" className="text-[10px]">{b.plan}</Badge></td>
                      <td className="px-6 py-3 text-right font-bold text-emerald-700">{formatCurrency(b.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Sub-components ───
function KpiCard({ label, value, sub, icon: Icon, color }: {
  label: string; value: string; sub: React.ReactNode; icon: React.ElementType;
  color: "blue" | "emerald" | "amber" | "violet";
}) {
  const colors = {
    blue: "text-blue-600 bg-blue-500/10",
    emerald: "text-emerald-600 bg-emerald-500/10",
    amber: "text-amber-600 bg-amber-500/10",
    violet: "text-violet-600 bg-violet-500/10",
  };
  return (
    <Card className="border-slate-200/70 shadow-sm">
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">{label}</p>
            <p className="text-3xl font-bold tracking-tight mt-1">{value}</p>
            <div className="text-[10px] text-muted-foreground mt-1.5">{sub}</div>
          </div>
          <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center", colors[color])}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function MrrGrowth({ value }: { value: number }) {
  if (value === 0) return <span>No change vs last month</span>;
  const isUp = value > 0;
  const Icon = isUp ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={cn("flex items-center gap-0.5 font-semibold", isUp ? "text-emerald-600" : "text-red-500")}>
      <Icon className="h-3 w-3" />{isUp ? "+" : ""}{value.toFixed(1)}%
      <span className="text-muted-foreground font-normal ml-1">vs last month</span>
    </span>
  );
}

function QuickStat({ icon: Icon, label, value, sub, color, to }: {
  icon: React.ElementType; label: string; value: string | number; sub: string; color: string; to: string;
}) {
  return (
    <Link to={to} className="rounded-xl border border-slate-200/70 bg-slate-50/80 p-4 hover:shadow-md transition-all group">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">{label}</p>
          <p className="text-2xl font-bold tracking-tight mt-1">{value}</p>
          <p className="text-[10px] text-muted-foreground mt-1">{sub}</p>
        </div>
        <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center", color)}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </Link>
  );
}
