import React from "react";
import { useQuery } from "@tanstack/react-query";
import { format, isWithinInterval, subDays } from "date-fns";
import { Link } from "react-router-dom";
import * as RechartsPrimitive from "recharts";
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  BellRing,
  Building2,
  CreditCard,
  IndianRupee,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { cn } from "@/lib/utils";

type Tone = "sky" | "emerald" | "amber" | "rose";

type RevenuePoint = {
  label: string;
  revenue: number;
  billCount: number;
};

type PlanSlice = {
  name: string;
  value: number;
  color: string;
  description: string;
};

type WatchItem = {
  title: string;
  description: string;
  count: number;
  progress: number;
  tone: Tone;
  to: string;
  cta: string;
};

type RecentBusiness = {
  id: string;
  name: string;
  createdAt: string;
  plan: string;
  status: string;
  phone: string;
  address: string;
};

type ActivityItem = {
  id: string;
  title: string;
  detail: string;
  createdAt: string;
  tone: Tone;
};

type OverviewData = {
  isLive: boolean;
  syncedAt: string;
  summary: {
    totalBusinesses: number;
    totalUsers: number;
    activeSubscriptions: number;
    trialSubscriptions: number;
    monthlyRecurringRevenue: number;
    renewalsDue: number;
    attentionRequired: number;
    newBusinesses30d: number;
    coverageRate: number;
    totalBills: number;
  };
  revenueTrend: RevenuePoint[];
  planMix: PlanSlice[];
  recentBusinesses: RecentBusiness[];
  watchlist: WatchItem[];
  activity: ActivityItem[];
};

type RpcPlatformStats = {
  total_businesses?: number;
  total_users?: number;
  active_subscriptions?: number;
  trial_subscriptions?: number;
  new_businesses_30d?: number;
};

type RpcSubscription = {
  subscription_id?: string;
  business_id?: string;
  business_name?: string;
  plan_id?: string | null;
  plan_name?: string | null;
  plan_price?: number | string | null;
  billing_period?: string | null;
  status?: string | null;
  trial_end?: string | null;
  current_period_end?: string | null;
  created_at?: string | null;
};

type RpcBusiness = {
  id?: string;
  business_name?: string | null;
  mobile_number?: string | null;
  join_code?: string | null;
  address?: string | null;
  created_at?: string | null;
  sub_status?: string | null;
  plan_name?: string | null;
  plan_price?: number | string | null;
};

type RpcRevenue = {
  month?: string | null;
  revenue?: number | string | null;
  bill_count?: number | string | null;
};

type RpcLog = {
  id?: string;
  admin_id?: string | null;
  action?: string | null;
  target_id?: string | null;
  target_type?: string | null;
  details?: Record<string, unknown> | null;
  created_at?: string | null;
};

const planDescriptions: Record<string, string> = {
  "Monthly Pro": "Fast-moving operators on short billing cycles",
  "Semi-Annual Pro": "Retained businesses on medium-term commitments",
  "Yearly Pro": "High-confidence accounts with long retention windows",
  Trialing: "Fresh conversions still inside the activation window",
  Expired: "Accounts that need win-back or support outreach",
  Custom: "Legacy or manually provisioned contracts",
};

const planColors = ["#2563eb", "#0f766e", "#d97706", "#e11d48", "#64748b"];

const toneStyles: Record<
  Tone,
  {
    soft: string;
    text: string;
    border: string;
    fill: string;
  }
> = {
  sky: {
    soft: "bg-sky-500/10",
    text: "text-sky-700",
    border: "border-sky-500/20",
    fill: "bg-sky-500",
  },
  emerald: {
    soft: "bg-emerald-500/10",
    text: "text-emerald-700",
    border: "border-emerald-500/20",
    fill: "bg-emerald-500",
  },
  amber: {
    soft: "bg-amber-500/10",
    text: "text-amber-700",
    border: "border-amber-500/20",
    fill: "bg-amber-500",
  },
  rose: {
    soft: "bg-rose-500/10",
    text: "text-rose-700",
    border: "border-rose-500/20",
    fill: "bg-rose-500",
  },
};

const statusStyles: Record<string, string> = {
  active:
    "border border-emerald-500/20 bg-emerald-500/10 text-emerald-700",
  trialing: "border border-sky-500/20 bg-sky-500/10 text-sky-700",
  expired: "border border-rose-500/20 bg-rose-500/10 text-rose-700",
  none: "border border-amber-500/20 bg-amber-500/10 text-amber-700",
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatCompact(value: number) {
  return new Intl.NumberFormat("en-IN", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function formatCount(value: number) {
  return new Intl.NumberFormat("en-IN").format(value);
}

function parseNumber(value: number | string | null | undefined) {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function humanizeLabel(value: string | null | undefined) {
  if (!value) return "Platform event";
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function normalizeMonthlyRevenue(price: number, billingPeriod?: string | null) {
  const normalizedPeriod = billingPeriod?.toLowerCase() ?? "";

  if (normalizedPeriod.includes("year")) return price / 12;
  if (normalizedPeriod.includes("6") || normalizedPeriod.includes("semi")) return price / 6;

  return price;
}

function formatTimestamp(value: string | null | undefined) {
  if (!value) return "Pending sync";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Pending sync";

  return format(date, "dd MMM yyyy, hh:mm a");
}

function createFallbackOverview(): OverviewData {
  return {
    isLive: false,
    syncedAt: new Date().toISOString(),
    summary: {
      totalBusinesses: 128,
      totalUsers: 864,
      activeSubscriptions: 92,
      trialSubscriptions: 18,
      monthlyRecurringRevenue: 286000,
      renewalsDue: 14,
      attentionRequired: 9,
      newBusinesses30d: 26,
      coverageRate: 72,
      totalBills: 4826,
    },
    revenueTrend: [
      { label: "Nov", revenue: 142000, billCount: 612 },
      { label: "Dec", revenue: 164000, billCount: 670 },
      { label: "Jan", revenue: 191000, billCount: 742 },
      { label: "Feb", revenue: 214000, billCount: 801 },
      { label: "Mar", revenue: 238000, billCount: 884 },
      { label: "Apr", revenue: 281000, billCount: 1034 },
    ],
    planMix: [
      {
        name: "Monthly Pro",
        value: 44,
        color: "#2563eb",
        description: planDescriptions["Monthly Pro"],
      },
      {
        name: "Semi-Annual Pro",
        value: 24,
        color: "#0f766e",
        description: planDescriptions["Semi-Annual Pro"],
      },
      {
        name: "Yearly Pro",
        value: 18,
        color: "#d97706",
        description: planDescriptions["Yearly Pro"],
      },
      {
        name: "Trialing",
        value: 18,
        color: "#64748b",
        description: planDescriptions.Trialing,
      },
    ],
    recentBusinesses: [
      {
        id: "preview-1",
        name: "Rivertown Market",
        createdAt: "24 Apr 2026",
        plan: "Monthly Pro",
        status: "active",
        phone: "+91 93120 11847",
        address: "Lucknow, Uttar Pradesh",
      },
      {
        id: "preview-2",
        name: "Urban Dairy Hub",
        createdAt: "22 Apr 2026",
        plan: "Trialing",
        status: "trialing",
        phone: "+91 88993 28410",
        address: "Jaipur, Rajasthan",
      },
      {
        id: "preview-3",
        name: "Shree Wholesale Point",
        createdAt: "20 Apr 2026",
        plan: "Semi-Annual Pro",
        status: "active",
        phone: "+91 98112 44271",
        address: "Bhopal, Madhya Pradesh",
      },
      {
        id: "preview-4",
        name: "Metro General Store",
        createdAt: "18 Apr 2026",
        plan: "Expired",
        status: "expired",
        phone: "+91 90282 18740",
        address: "Nagpur, Maharashtra",
      },
    ],
    watchlist: [
      {
        title: "Renewals due in 14 days",
        description: "Accounts approaching their renewal window with revenue at stake.",
        count: 14,
        progress: 41,
        tone: "amber",
        to: "/super-admin/subscriptions",
        cta: "Review renewals",
      },
      {
        title: "Trials ending in 7 days",
        description: "Fresh signups that need conversion follow-up from the platform team.",
        count: 6,
        progress: 22,
        tone: "sky",
        to: "/super-admin/analytics",
        cta: "Open funnel",
      },
      {
        title: "Rescue accounts",
        description: "Expired or idle businesses that merit a win-back or support touchpoint.",
        count: 9,
        progress: 31,
        tone: "rose",
        to: "/super-admin/support-tickets",
        cta: "Triage support",
      },
      {
        title: "Healthy new businesses",
        description: "New tenants added in the last 30 days, keeping the platform pipeline active.",
        count: 26,
        progress: 78,
        tone: "emerald",
        to: "/super-admin/tenants",
        cta: "View tenants",
      },
    ],
    activity: [
      {
        id: "activity-1",
        title: "Plan upgraded",
        detail: "Rivertown Market moved into Monthly Pro after the trial window.",
        createdAt: "24 Apr 2026, 09:45 AM",
        tone: "emerald",
      },
      {
        id: "activity-2",
        title: "New tenant created",
        detail: "Urban Dairy Hub completed business onboarding and team provisioning.",
        createdAt: "24 Apr 2026, 08:20 AM",
        tone: "sky",
      },
      {
        id: "activity-3",
        title: "Renewal flagged",
        detail: "A cluster of expiring accounts is approaching the billing threshold.",
        createdAt: "23 Apr 2026, 06:10 PM",
        tone: "amber",
      },
      {
        id: "activity-4",
        title: "Support escalation",
        detail: "Metro General Store requires intervention after subscription expiry.",
        createdAt: "23 Apr 2026, 03:55 PM",
        tone: "rose",
      },
    ],
  };
}

function buildOverviewData({
  stats,
  subscriptions,
  businesses,
  revenueRows,
  logs,
}: {
  stats: RpcPlatformStats | null;
  subscriptions: RpcSubscription[];
  businesses: RpcBusiness[];
  revenueRows: RpcRevenue[];
  logs: RpcLog[];
}): OverviewData {
  const fallback = createFallbackOverview();
  const now = new Date();

  const activeSubscriptions = subscriptions.filter((item) => item.status === "active");
  const trialSubscriptions = subscriptions.filter((item) => item.status === "trialing");
  const expiredSubscriptions = subscriptions.filter((item) => item.status === "expired");
  const renewalsDue = subscriptions.filter((item) => {
    const renewalDate = item.current_period_end ?? item.trial_end;
    if (!renewalDate) return false;

    const parsed = new Date(renewalDate);
    if (Number.isNaN(parsed.getTime())) return false;

    return isWithinInterval(parsed, {
      start: subDays(now, 1),
      end: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
    });
  });

  const monthlyRecurringRevenue = activeSubscriptions.reduce((total, item) => {
    return total + normalizeMonthlyRevenue(parseNumber(item.plan_price), item.billing_period);
  }, 0);

  const totalBusinesses = stats?.total_businesses ?? businesses.length;
  const totalUsers = stats?.total_users ?? fallback.summary.totalUsers;
  const activeCount = stats?.active_subscriptions ?? activeSubscriptions.length;
  const trialCount = stats?.trial_subscriptions ?? trialSubscriptions.length;
  const newBusinesses30d =
    stats?.new_businesses_30d ??
    businesses.filter((item) => {
      if (!item.created_at) return false;
      const parsed = new Date(item.created_at);
      if (Number.isNaN(parsed.getTime())) return false;
      return parsed >= subDays(now, 30);
    }).length;

  const criticalEvents = logs.filter((item) => {
    const action = item.action?.toLowerCase() ?? "";
    return /(critical|block|suspend|expire|delete|fail)/.test(action);
  }).length;

  const attentionRequired = Math.max(
    expiredSubscriptions.length + renewalsDue.length + criticalEvents,
    0,
  );

  const coverageRate =
    totalBusinesses > 0 ? Math.round((activeCount / totalBusinesses) * 100) : 0;

  const revenueTrend =
    revenueRows.length > 0
      ? revenueRows.map((row, index) => ({
          label: row.month || `M${index + 1}`,
          revenue: parseNumber(row.revenue),
          billCount: parseNumber(row.bill_count),
        }))
      : fallback.revenueTrend;

  const totalBills = revenueTrend.reduce((total, point) => total + point.billCount, 0);

  const planMixMap = new Map<string, number>();
  subscriptions.forEach((item) => {
    const label =
      item.plan_name ||
      (item.status === "trialing" ? "Trialing" : item.status === "expired" ? "Expired" : "Custom");
    planMixMap.set(label, (planMixMap.get(label) || 0) + 1);
  });

  const planMix =
    planMixMap.size > 0
      ? [...planMixMap.entries()]
          .sort((left, right) => right[1] - left[1])
          .slice(0, 5)
          .map(([name, value], index) => ({
            name,
            value,
            color: planColors[index % planColors.length],
            description: planDescriptions[name] ?? planDescriptions.Custom,
          }))
      : fallback.planMix;

  const recentBusinesses =
    businesses.length > 0
      ? businesses.slice(0, 5).map((item) => ({
          id: item.id ?? `${item.business_name ?? "business"}-${item.created_at ?? "preview"}`,
          name: item.business_name || "Untitled business",
          createdAt: formatTimestamp(item.created_at),
          plan:
            item.plan_name ||
            (item.sub_status === "trialing" ? "Trialing" : item.sub_status === "expired" ? "Expired" : "Unassigned"),
          status: item.sub_status || "none",
          phone: item.mobile_number || "No phone on record",
          address: item.address || "Address pending",
        }))
      : fallback.recentBusinesses;

  const watchlist: WatchItem[] = [
    {
      title: "Renewals due in 14 days",
      description: "Accounts approaching their billing threshold and needing proactive follow-up.",
      count: renewalsDue.length,
      progress: Math.min(Math.max(Math.round((renewalsDue.length / Math.max(activeCount, 1)) * 100), 12), 100),
      tone: renewalsDue.length > 10 ? "rose" : "amber",
      to: "/super-admin/subscriptions",
      cta: "Review renewals",
    },
    {
      title: "Trials ending in 7 days",
      description: "Businesses still in the conversion lane and worth a founder or sales touchpoint.",
      count: trialSubscriptions.filter((item) => {
        if (!item.trial_end) return false;
        const trialEnd = new Date(item.trial_end);
        if (Number.isNaN(trialEnd.getTime())) return false;
        return isWithinInterval(trialEnd, {
          start: subDays(now, 1),
          end: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
        });
      }).length,
      progress: Math.min(Math.max(Math.round((trialCount / Math.max(totalBusinesses, 1)) * 100), 10), 100),
      tone: "sky",
      to: "/super-admin/analytics",
      cta: "Open funnel",
    },
    {
      title: "Rescue accounts",
      description: "Expired subscriptions or accounts drifting out of the healthy operating window.",
      count: expiredSubscriptions.length,
      progress: Math.min(Math.max(Math.round((expiredSubscriptions.length / Math.max(totalBusinesses, 1)) * 100), 8), 100),
      tone: expiredSubscriptions.length > 0 ? "rose" : "emerald",
      to: "/super-admin/support-tickets",
      cta: "Triage support",
    },
    {
      title: "Healthy new businesses",
      description: "Net new business creation in the last 30 days keeping the platform pipeline moving.",
      count: newBusinesses30d,
      progress: Math.min(Math.max(Math.round((newBusinesses30d / Math.max(totalBusinesses, 1)) * 100), 16), 100),
      tone: "emerald",
      to: "/super-admin/tenants",
      cta: "View tenants",
    },
  ];

  const activity =
    logs.length > 0
      ? logs.slice(0, 6).map((item, index) => {
          const action = item.action?.toLowerCase() ?? "";
          const tone: Tone = /(critical|block|suspend|expire|delete|fail)/.test(action)
            ? "rose"
            : /(renew|trial|warning|due)/.test(action)
              ? "amber"
              : /(create|signup|add|upgrade|launch)/.test(action)
                ? "sky"
                : "emerald";

          return {
            id: item.id ?? `log-${index}`,
            title: humanizeLabel(item.action),
            detail:
              item.target_type && item.target_id
                ? `${humanizeLabel(item.target_type)} • ${item.target_id.slice(0, 8)}`
                : item.target_type
                  ? `Platform event affecting ${humanizeLabel(item.target_type)}`
                  : item.admin_id
                    ? `Triggered by ${item.admin_id}`
                    : "Platform event recorded by the admin layer",
            createdAt: formatTimestamp(item.created_at),
            tone,
          };
        })
      : fallback.activity;

  const isLive =
    !!stats ||
    subscriptions.length > 0 ||
    businesses.length > 0 ||
    revenueRows.length > 0 ||
    logs.length > 0;

  return {
    isLive,
    syncedAt: new Date().toISOString(),
    summary: {
      totalBusinesses: totalBusinesses || fallback.summary.totalBusinesses,
      totalUsers: totalUsers || fallback.summary.totalUsers,
      activeSubscriptions: activeCount || fallback.summary.activeSubscriptions,
      trialSubscriptions: trialCount || fallback.summary.trialSubscriptions,
      monthlyRecurringRevenue:
        monthlyRecurringRevenue > 0 ? monthlyRecurringRevenue : fallback.summary.monthlyRecurringRevenue,
      renewalsDue: renewalsDue.length || fallback.summary.renewalsDue,
      attentionRequired:
        attentionRequired > 0 ? attentionRequired : fallback.summary.attentionRequired,
      newBusinesses30d: newBusinesses30d || fallback.summary.newBusinesses30d,
      coverageRate: coverageRate || fallback.summary.coverageRate,
      totalBills: totalBills || fallback.summary.totalBills,
    },
    revenueTrend,
    planMix,
    recentBusinesses,
    watchlist,
    activity,
  };
}

async function safeRpc<T>(name: string) {
  try {
    const { data, error } = await (supabase.rpc as any)(name);
    if (error) return null;
    return (data as T) ?? null;
  } catch {
    return null;
  }
}

function KpiCard({
  icon: Icon,
  label,
  value,
  detail,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  detail: string;
  tone: Tone;
}) {
  const styles = toneStyles[tone];

  return (
    <Card className="border-slate-200/70 bg-white/90 shadow-[0_20px_40px_-34px_rgba(15,23,42,0.45)] backdrop-blur motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
              {label}
            </p>
            <div className="text-3xl font-semibold tracking-tight text-slate-950">
              {value}
            </div>
            <p className="text-sm text-slate-500">{detail}</p>
          </div>
          <div
            className={cn(
              "flex h-11 w-11 items-center justify-center rounded-2xl border",
              styles.soft,
              styles.border,
              styles.text,
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function OverviewSection() {
  const { customAdminName, user } = useAuth();
  const adminName =
    customAdminName ||
    user?.user_metadata?.display_name ||
    user?.email ||
    "System Administrator";

  const overviewQuery = useQuery({
    queryKey: ["super-admin-overview-section"],
    placeholderData: createFallbackOverview,
    staleTime: 60_000,
    refetchInterval: 120_000,
    queryFn: async () => {
      const [stats, subscriptions, businesses, revenueRows, logs] = await Promise.all([
        safeRpc<RpcPlatformStats>("get_platform_stats_v2"),
        safeRpc<RpcSubscription[]>("get_all_subscriptions"),
        safeRpc<RpcBusiness[]>("get_all_businesses_admin"),
        safeRpc<RpcRevenue[]>("get_revenue_by_month"),
        safeRpc<RpcLog[]>("get_admin_logs"),
      ]);

      return buildOverviewData({
        stats,
        subscriptions: subscriptions ?? [],
        businesses: businesses ?? [],
        revenueRows: revenueRows ?? [],
        logs: logs ?? [],
      });
    },
  });

  const overview = overviewQuery.data ?? createFallbackOverview();
  const totalPlans = overview.planMix.reduce((total, item) => total + item.value, 0);

  const kpis = [
    {
      icon: Building2,
      label: "Platform Tenants",
      value: formatCompact(overview.summary.totalBusinesses),
      detail: `${formatCount(overview.summary.newBusinesses30d)} new businesses in the last 30 days`,
      tone: "sky" as const,
    },
    {
      icon: Users,
      label: "Platform Users",
      value: formatCompact(overview.summary.totalUsers),
      detail: `${overview.summary.coverageRate}% subscription coverage across all businesses`,
      tone: "emerald" as const,
    },
    {
      icon: CreditCard,
      label: "Healthy Subscriptions",
      value: formatCount(overview.summary.activeSubscriptions),
      detail: `${formatCount(overview.summary.trialSubscriptions)} accounts still in trial pipeline`,
      tone: "amber" as const,
    },
    {
      icon: IndianRupee,
      label: "Projected MRR",
      value: formatCurrency(overview.summary.monthlyRecurringRevenue),
      detail: `${formatCount(overview.summary.renewalsDue)} renewal decisions landing in the next 14 days`,
      tone: "rose" as const,
    },
  ];

  return (
    <div className="space-y-6">
      <Card className="relative overflow-hidden border-0 bg-slate-950 text-white shadow-[0_35px_80px_-45px_rgba(15,23,42,0.9)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.35),_transparent_38%),radial-gradient(circle_at_bottom_right,_rgba(16,185,129,0.22),_transparent_32%)]" />
        <div className="absolute inset-y-0 right-0 w-[38%] bg-[linear-gradient(135deg,rgba(148,163,184,0.08),transparent)]" />

        <CardContent className="relative p-6 sm:p-8">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
            <div className="max-w-3xl space-y-5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-white hover:bg-white/10">
                  Section 01 / 13
                </Badge>
                <Badge className="rounded-full border border-sky-400/30 bg-sky-400/10 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-sky-100 hover:bg-sky-400/10">
                  Overview Command View
                </Badge>
              </div>

              <div className="space-y-3">
                <p className="text-sm uppercase tracking-[0.22em] text-slate-400">
                  Super admin control surface
                </p>
                <div className="space-y-3">
                  <h1 className="max-w-2xl text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
                    A premium overview section for the full super admin suite.
                  </h1>
                  <p className="max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
                    {adminName} now gets a true command center: commercial health, renewal pressure,
                    onboarding flow, and operational signals in one professional surface that can
                    scale into the remaining admin sections.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button
                  asChild
                  className="h-11 rounded-xl bg-white px-5 text-slate-950 hover:bg-slate-100"
                >
                  <Link to="/super-admin/subscriptions">
                    Review renewals
                    <ArrowUpRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="h-11 rounded-xl border-white/15 bg-white/5 px-5 text-white hover:bg-white/10 hover:text-white"
                >
                  <Link to="/super-admin/tenants">
                    Inspect tenants
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 xl:w-[420px] xl:grid-cols-1">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-[0.2em] text-slate-400">
                    Live status
                  </span>
                  <div
                    className={cn(
                      "h-2.5 w-2.5 rounded-full",
                      overview.isLive ? "bg-emerald-400" : "bg-amber-400",
                      overviewQuery.isFetching && "animate-pulse",
                    )}
                  />
                </div>
                <p className="mt-3 text-2xl font-semibold">
                  {overview.isLive ? "Connected" : "Preview"}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  {overview.isLive
                    ? "Platform signals are being refreshed from the admin data layer."
                    : "Graceful fallback keeps the command center polished while live access is unavailable."}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                <span className="text-xs uppercase tracking-[0.2em] text-slate-400">
                  Attention needed
                </span>
                <p className="mt-3 text-2xl font-semibold">
                  {formatCount(overview.summary.attentionRequired)}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  Combined signals from expiries, renewal windows, and critical admin events.
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                <span className="text-xs uppercase tracking-[0.2em] text-slate-400">
                  Last sync
                </span>
                <p className="mt-3 text-lg font-semibold">
                  {formatTimestamp(overview.syncedAt)}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  Overview stays focused on exact timestamps so the platform state feels audit-ready.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {kpis.map((item) => (
          <KpiCard
            key={item.label}
            icon={item.icon}
            label={item.label}
            value={item.value}
            detail={item.detail}
            tone={item.tone}
          />
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-12">
        <Card className="border-slate-200/70 bg-white/95 shadow-[0_20px_40px_-34px_rgba(15,23,42,0.45)] xl:col-span-8">
          <CardHeader className="flex flex-col gap-4 border-b border-slate-200/80 pb-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-2">
              <Badge
                variant="secondary"
                className="w-fit rounded-full bg-slate-100 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-slate-600"
              >
                Revenue Pulse
              </Badge>
              <div>
                <CardTitle className="text-xl font-semibold text-slate-950">
                  Commercial momentum over the last six cycles
                </CardTitle>
                <CardDescription className="mt-1 text-sm text-slate-500">
                  Monthly platform revenue and bill volume, surfaced in one executive chart.
                </CardDescription>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50 px-4 py-3">
                <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                  6-month revenue
                </div>
                <div className="mt-2 text-lg font-semibold text-slate-950">
                  {formatCurrency(
                    overview.revenueTrend.reduce((total, point) => total + point.revenue, 0),
                  )}
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50 px-4 py-3">
                <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                  Bill volume
                </div>
                <div className="mt-2 text-lg font-semibold text-slate-950">
                  {formatCount(overview.summary.totalBills)}
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-6">
            <div className="h-[340px]">
              <ChartContainer
                className="h-full w-full"
                config={{
                  revenue: { label: "Revenue", color: "#2563eb" },
                  billCount: { label: "Bills", color: "#0f766e" },
                }}
              >
                <RechartsPrimitive.ComposedChart data={overview.revenueTrend}>
                  <defs>
                    <linearGradient id="overviewRevenueFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.28} />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <RechartsPrimitive.CartesianGrid
                    vertical={false}
                    strokeDasharray="3 3"
                    stroke="#cbd5e1"
                    strokeOpacity={0.55}
                  />
                  <RechartsPrimitive.XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: "#64748b", fontSize: 12 }}
                  />
                  <RechartsPrimitive.YAxis
                    yAxisId="revenue"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: "#64748b", fontSize: 12 }}
                    tickFormatter={(value) => formatCompact(Number(value))}
                  />
                  <RechartsPrimitive.YAxis
                    yAxisId="bills"
                    orientation="right"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: "#64748b", fontSize: 12 }}
                  />
                  <ChartTooltip
                    cursor={false}
                    content={
                      <ChartTooltipContent
                        formatter={(value, name) => (
                          <div className="flex min-w-[180px] items-center justify-between gap-6">
                            <span className="text-muted-foreground">
                              {name === "revenue" ? "Revenue" : "Bills"}
                            </span>
                            <span className="font-mono font-semibold text-foreground">
                              {name === "revenue"
                                ? formatCurrency(Number(value))
                                : formatCount(Number(value))}
                            </span>
                          </div>
                        )}
                      />
                    }
                  />
                  <RechartsPrimitive.Area
                    yAxisId="revenue"
                    type="monotone"
                    dataKey="revenue"
                    stroke="#2563eb"
                    strokeWidth={2.5}
                    fill="url(#overviewRevenueFill)"
                  />
                  <RechartsPrimitive.Line
                    yAxisId="bills"
                    type="monotone"
                    dataKey="billCount"
                    stroke="#0f766e"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: "#0f766e", strokeWidth: 0 }}
                    activeDot={{ r: 4 }}
                  />
                </RechartsPrimitive.ComposedChart>
              </ChartContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/70 bg-white/95 shadow-[0_20px_40px_-34px_rgba(15,23,42,0.45)] xl:col-span-4">
          <CardHeader className="border-b border-slate-200/80 pb-5">
            <Badge
              variant="secondary"
              className="mb-3 w-fit rounded-full bg-slate-100 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-slate-600"
            >
              Plan Mix
            </Badge>
            <CardTitle className="text-xl font-semibold text-slate-950">
              Subscription composition at a glance
            </CardTitle>
            <CardDescription className="text-sm text-slate-500">
              The subscription base split that drives recurring platform stability.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6 p-6">
            <div className="relative mx-auto flex h-[240px] w-full max-w-[260px] items-center justify-center">
              <ChartContainer
                className="h-full w-full"
                config={Object.fromEntries(
                  overview.planMix.map((item) => [item.name, { label: item.name, color: item.color }]),
                )}
              >
                <RechartsPrimitive.PieChart>
                  <RechartsPrimitive.Pie
                    data={overview.planMix}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={65}
                    outerRadius={96}
                    paddingAngle={3}
                    strokeWidth={0}
                  >
                    {overview.planMix.map((item) => (
                      <RechartsPrimitive.Cell key={item.name} fill={item.color} />
                    ))}
                  </RechartsPrimitive.Pie>
                  <RechartsPrimitive.Tooltip
                    formatter={(value: number, name: string) => [
                      `${formatCount(Number(value))} accounts`,
                      name,
                    ]}
                  />
                </RechartsPrimitive.PieChart>
              </ChartContainer>

              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
                  Active mix
                </span>
                <span className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">
                  {formatCount(totalPlans)}
                </span>
                <span className="mt-1 text-xs text-slate-500">
                  plans in view
                </span>
              </div>
            </div>

            <div className="space-y-3">
              {overview.planMix.map((item) => (
                <div
                  key={item.name}
                  className="rounded-2xl border border-slate-200/80 bg-slate-50 px-4 py-3"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <div>
                        <div className="font-medium text-slate-900">{item.name}</div>
                        <div className="text-xs text-slate-500">{item.description}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-slate-950">
                        {formatCount(item.value)}
                      </div>
                      <div className="text-xs text-slate-500">
                        {Math.round((item.value / Math.max(totalPlans, 1)) * 100)}%
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-12">
        <Card className="border-slate-200/70 bg-white/95 shadow-[0_20px_40px_-34px_rgba(15,23,42,0.45)] xl:col-span-7">
          <CardHeader className="flex flex-col gap-3 border-b border-slate-200/80 pb-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <Badge
                variant="secondary"
                className="mb-3 w-fit rounded-full bg-slate-100 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-slate-600"
              >
                Onboarding Queue
              </Badge>
              <CardTitle className="text-xl font-semibold text-slate-950">
                Latest business registrations
              </CardTitle>
              <CardDescription className="text-sm text-slate-500">
                See who entered the platform recently and which accounts need attention next.
              </CardDescription>
            </div>

            <Button asChild variant="outline" className="rounded-xl">
              <Link to="/super-admin/tenants">
                All tenants
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>

          <CardContent className="space-y-3 p-6">
            {overview.recentBusinesses.map((business) => (
              <div
                key={business.id}
                className="flex flex-col gap-4 rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-sm font-semibold text-white">
                    {business.name
                      .split(" ")
                      .slice(0, 2)
                      .map((word) => word[0])
                      .join("")}
                  </div>

                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-base font-semibold text-slate-950">
                        {business.name}
                      </p>
                      <span
                        className={cn(
                          "inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize",
                          statusStyles[business.status] ?? statusStyles.none,
                        )}
                      >
                        {business.status === "none" ? "unassigned" : business.status}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500">
                      {business.phone} • {business.address}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 sm:justify-end">
                  <div className="rounded-2xl border border-slate-200/80 bg-white px-4 py-2 text-right">
                    <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                      Plan
                    </div>
                    <div className="text-sm font-semibold text-slate-950">
                      {business.plan}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-200/80 bg-white px-4 py-2 text-right">
                    <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                      Joined
                    </div>
                    <div className="text-sm font-semibold text-slate-950">
                      {business.createdAt}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-slate-200/70 bg-white/95 shadow-[0_20px_40px_-34px_rgba(15,23,42,0.45)] xl:col-span-5">
          <CardHeader className="border-b border-slate-200/80 pb-5">
            <Badge
              variant="secondary"
              className="mb-3 w-fit rounded-full bg-slate-100 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-slate-600"
            >
              Watchlist
            </Badge>
            <CardTitle className="text-xl font-semibold text-slate-950">
              Operational priorities
            </CardTitle>
            <CardDescription className="text-sm text-slate-500">
              The fastest route to protect revenue, reduce churn, and keep onboarding clean.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 p-6">
            {overview.watchlist.map((item) => {
              const styles = toneStyles[item.tone];

              return (
                <div
                  key={item.title}
                  className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-slate-950">{item.title}</p>
                        <span
                          className={cn(
                            "inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold",
                            styles.soft,
                            styles.text,
                            styles.border,
                          )}
                        >
                          {formatCount(item.count)}
                        </span>
                      </div>
                      <p className="text-sm leading-6 text-slate-500">{item.description}</p>
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="mb-2 flex items-center justify-between text-xs text-slate-500">
                      <span>Signal intensity</span>
                      <span>{item.progress}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-200">
                      <div
                        className={cn("h-2 rounded-full", styles.fill)}
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
                  </div>

                  <Button asChild variant="ghost" className="mt-3 h-auto px-0 text-slate-900">
                    <Link to={item.to}>
                      {item.cta}
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-12">
        <Card className="border-slate-200/70 bg-white/95 shadow-[0_20px_40px_-34px_rgba(15,23,42,0.45)] xl:col-span-7">
          <CardHeader className="border-b border-slate-200/80 pb-5">
            <Badge
              variant="secondary"
              className="mb-3 w-fit rounded-full bg-slate-100 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-slate-600"
            >
              Activity Feed
            </Badge>
            <CardTitle className="text-xl font-semibold text-slate-950">
              Admin-side platform activity
            </CardTitle>
            <CardDescription className="text-sm text-slate-500">
              The latest actions and state changes that matter to an operating super admin.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 p-6">
            {overview.activity.map((item) => {
              const styles = toneStyles[item.tone];

              return (
                <div
                  key={item.id}
                  className="flex gap-4 rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4"
                >
                  <div
                    className={cn(
                      "mt-1 flex h-10 w-10 items-center justify-center rounded-2xl border",
                      styles.soft,
                      styles.border,
                      styles.text,
                    )}
                  >
                    <Activity className="h-4 w-4" />
                  </div>

                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold text-slate-950">{item.title}</p>
                      <span className="text-xs text-slate-500">{item.createdAt}</span>
                    </div>
                    <p className="text-sm leading-6 text-slate-500">{item.detail}</p>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card className="border-slate-200/70 bg-white/95 shadow-[0_20px_40px_-34px_rgba(15,23,42,0.45)] xl:col-span-5">
          <CardHeader className="border-b border-slate-200/80 pb-5">
            <Badge
              variant="secondary"
              className="mb-3 w-fit rounded-full bg-slate-100 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-slate-600"
            >
              Quick Actions
            </Badge>
            <CardTitle className="text-xl font-semibold text-slate-950">
              Move from insight to action
            </CardTitle>
            <CardDescription className="text-sm text-slate-500">
              The overview should not just report platform health. It should help run it.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 p-6">
            <div className="grid gap-3">
              <Button
                asChild
                className="h-auto justify-between rounded-2xl bg-slate-950 px-4 py-4 text-left hover:bg-slate-800"
              >
                <Link to="/super-admin/subscriptions">
                  <span className="flex items-center gap-3">
                    <CreditCard className="h-4 w-4" />
                    <span>
                      <span className="block font-semibold">Review renewal queue</span>
                      <span className="block text-xs text-slate-300">
                        Focus on {formatCount(overview.summary.renewalsDue)} upcoming billing decisions.
                      </span>
                    </span>
                  </span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>

              <Button
                asChild
                variant="outline"
                className="h-auto justify-between rounded-2xl px-4 py-4 text-left"
              >
                <Link to="/super-admin/analytics">
                  <span className="flex items-center gap-3">
                    <TrendingUp className="h-4 w-4" />
                    <span>
                      <span className="block font-semibold">Open growth analytics</span>
                      <span className="block text-xs text-slate-500">
                        Track conversion flow and evaluate expansion momentum.
                      </span>
                    </span>
                  </span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>

              <Button
                asChild
                variant="outline"
                className="h-auto justify-between rounded-2xl px-4 py-4 text-left"
              >
                <Link to="/super-admin/support-tickets">
                  <span className="flex items-center gap-3">
                    <BellRing className="h-4 w-4" />
                    <span>
                      <span className="block font-semibold">Triage platform issues</span>
                      <span className="block text-xs text-slate-500">
                        Resolve support pressure before it becomes churn.
                      </span>
                    </span>
                  </span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>

            <div className="rounded-3xl border border-slate-200/80 bg-[linear-gradient(135deg,rgba(30,41,59,0.04),rgba(37,99,235,0.08))] p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-white">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold text-slate-950">Overview foundation complete</p>
                  <p className="text-sm text-slate-500">
                    This section now sets the tone, structure, and perception for the rest of
                    the admin suite.
                  </p>
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/70 bg-white/70 p-4">
                  <div className="flex items-center gap-2 text-slate-900">
                    <ShieldCheck className="h-4 w-4" />
                    <span className="text-sm font-semibold">Executive-ready</span>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    Premium hierarchy, responsive structure, and action-first content.
                  </p>
                </div>
                <div className="rounded-2xl border border-white/70 bg-white/70 p-4">
                  <div className="flex items-center gap-2 text-slate-900">
                    <CreditCard className="h-4 w-4" />
                    <span className="text-sm font-semibold">Data-aware</span>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    Live RPC-backed signals where available, with graceful fallback continuity.
                  </p>
                </div>
                <div className="rounded-2xl border border-white/70 bg-white/70 p-4">
                  <div className="flex items-center gap-2 text-slate-900">
                    <Sparkles className="h-4 w-4" />
                    <span className="text-sm font-semibold">Scalable pattern</span>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    A strong visual and structural template for the remaining sections.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
