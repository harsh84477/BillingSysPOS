import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend
} from 'recharts';
import {
    Building2, Users, CreditCard, Clock, AlertTriangle, Activity,
    TrendingUp, Zap, Bell, ShieldAlert, UserCheck
} from 'lucide-react';
import { Loader2 } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';

export default function DashboardTab() {
    const { data: stats, isLoading } = useQuery({
        queryKey: ['platform-stats-v2'],
        queryFn: async () => {
            const { data, error } = await (supabase.rpc as any)('get_platform_stats_v2');
            if (error) throw error;
            return data;
        },
        refetchInterval: 60000,
    });

    const { data: revenueChart = [] } = useQuery({
        queryKey: ['revenue-by-month'],
        queryFn: async () => {
            const { data, error } = await (supabase.rpc as any)('get_revenue_by_month');
            if (error) throw error;
            return data;
        },
    });

    const { data: subOverview } = useQuery({
        queryKey: ['subscription-overview'],
        queryFn: async () => {
            const { data, error } = await (supabase.rpc as any)('get_subscription_overview');
            if (error) throw error;
            return data;
        },
    });

    // Fetch recent businesses + their sub statuses for alerts/recent list
    const { data: allBusinesses = [] } = useQuery({
        queryKey: ['super-admin-businesses'],
        retry: 1,
        queryFn: async () => {
            try {
                const { data, error } = await (supabase.rpc as any)('get_all_businesses_admin');
                if (!error && data) return data as any[];
            } catch (_) { }
            const { data, error } = await supabase.from('businesses').select('*, subscriptions(status, trial_end, current_period_end)');
            if (error) throw error;
            return data || [];
        },
    });

    // Computed: expiring soon (trial_end or period_end within 7 days)
    const now = new Date();
    const in7 = new Date(now.getTime() + 7 * 86400000);

    const expiringSoon = allBusinesses.filter((b: any) => {
        const end = b.sub_trial_end || b.sub_period_end;
        if (!end) return false;
        const d = new Date(end);
        return d > now && d <= in7 && (b.sub_status === 'trialing' || b.sub_status === 'active');
    });

    const noSub = allBusinesses.filter((b: any) => !b.sub_id);

    const recent = [...allBusinesses]
        .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 5);

    const needsAttention = allBusinesses.filter((b: any) => {
        if (!b.sub_id) return true; // no subscription
        const end = b.sub_trial_end || b.sub_period_end;
        if (b.sub_status === 'expired') return true;
        if (end && new Date(end) < now) return true; // past expiry
        return false;
    }).slice(0, 6);

    const statCards = [
        {
            title: 'Total Businesses',
            value: stats?.total_businesses ?? '—',
            sub: `+${stats?.new_businesses_30d ?? 0} this month`,
            icon: Building2,
            gradient: 'from-blue-500/10 to-blue-500/5',
            iconColor: 'text-blue-500',
            border: 'border-blue-500/20',
        },
        {
            title: 'Active Plans',
            value: stats?.active_subscriptions ?? '—',
            sub: `${stats?.trial_subscriptions ?? 0} on free trial`,
            icon: CreditCard,
            gradient: 'from-violet-500/10 to-violet-500/5',
            iconColor: 'text-violet-500',
            border: 'border-violet-500/20',
        },
        {
            title: 'Platform Users',
            value: stats?.total_users ?? '—',
            sub: 'Across all businesses',
            icon: Users,
            gradient: 'from-orange-500/10 to-orange-500/5',
            iconColor: 'text-orange-500',
            border: 'border-orange-500/20',
        },
        {
            title: 'Trialing',
            value: stats?.trial_subscriptions ?? '—',
            sub: 'Free trial active',
            icon: Clock,
            gradient: 'from-cyan-500/10 to-cyan-500/5',
            iconColor: 'text-cyan-500',
            border: 'border-cyan-500/20',
        },
        {
            title: '⚠ Expiring in 7 Days',
            value: stats?.expiring_soon_7d ?? expiringSoon.length,
            sub: 'Need attention now',
            icon: Bell,
            gradient: 'from-yellow-500/10 to-yellow-500/5',
            iconColor: 'text-yellow-500',
            border: stats?.expiring_soon_7d > 0 ? 'border-yellow-500/50' : 'border-yellow-500/20',
        },
        {
            title: 'No Subscription',
            value: stats?.no_subscription_count ?? noSub.length,
            sub: 'Not assigned any plan',
            icon: ShieldAlert,
            gradient: 'from-red-500/10 to-red-500/5',
            iconColor: 'text-red-500',
            border: 'border-red-500/20',
        },
    ];

    const pieData = subOverview ? [
        { name: 'Active', value: subOverview.active, color: '#22c55e' },
        { name: 'Trial', value: subOverview.trialing, color: '#3b82f6' },
        { name: 'Expired', value: subOverview.expired, color: '#ef4444' },
        { name: 'No Sub', value: subOverview.no_sub, color: '#94a3b8' },
    ].filter(d => d.value > 0) : [];

    const getSubBadge = (b: any) => {
        const status = b.sub_status;
        if (!b.sub_id || !status) return <Badge variant="outline" className="text-[10px]">No Sub</Badge>;
        const end = b.sub_trial_end || b.sub_period_end;
        if ((status === 'trialing' || status === 'active') && end && new Date(end) < now)
            return <Badge className="bg-red-100 text-red-700 text-[10px]">Expired</Badge>;
        if (status === 'trialing') return <Badge className="bg-blue-100 text-blue-700 text-[10px]">Trial</Badge>;
        if (status === 'active') return <Badge className="bg-green-100 text-green-700 text-[10px]">Active</Badge>;
        return <Badge className="bg-red-100 text-red-700 text-[10px]">Expired</Badge>;
    };

    return (
        <div className="space-y-8">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                {statCards.map((card) => (
                    <Card key={card.title} className={`bg-gradient-to-br ${card.gradient} ${card.border} border`}>
                        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                            <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                {card.title}
                            </CardTitle>
                            <card.icon className={`h-4 w-4 ${card.iconColor}`} />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl lg:text-3xl font-extrabold tracking-tight">
                                {isLoading ? <Loader2 className="h-6 w-6 animate-spin opacity-40" /> : card.value}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">{card.sub}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Revenue Bar Chart */}
                <Card className="lg:col-span-2">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-primary" />
                            Monthly Revenue (Last 6 Months)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {revenueChart.length === 0 ? (
                            <div className="h-44 flex items-center justify-center text-sm text-muted-foreground">
                                No revenue data yet.
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height={180}>
                                <BarChart data={revenueChart} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`} />
                                    <Tooltip formatter={(v: any) => [`₹${Number(v).toLocaleString('en-IN')}`, 'Revenue']} />
                                    <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
                                        {revenueChart.map((_: any, i: number) => (
                                            <Cell key={i} fill={`hsl(var(--primary) / ${0.5 + (i / revenueChart.length) * 0.5})`} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>

                {/* Subscription Split Donut */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center gap-2">
                            <Activity className="h-4 w-4 text-primary" />
                            Subscription Split
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {pieData.length === 0 ? (
                            <div className="h-44 flex items-center justify-center text-sm text-muted-foreground">
                                No subscription data.
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height={180}>
                                <PieChart>
                                    <Pie
                                        data={pieData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={45}
                                        outerRadius={72}
                                        paddingAngle={3}
                                        dataKey="value"
                                    >
                                        {pieData.map((entry, i) => (
                                            <Cell key={i} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px' }} />
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Bottom Row: Recent Businesses + Needs Attention */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Businesses */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                            <UserCheck className="h-4 w-4 text-primary" />
                            Recent Sign-ups
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {recent.length === 0 ? (
                            <div className="text-sm text-muted-foreground text-center py-6">No businesses yet.</div>
                        ) : (
                            <div className="space-y-3">
                                {recent.map((b: any) => (
                                    <div key={b.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/30 border">
                                        <div>
                                            <p className="text-sm font-semibold">{b.business_name}</p>
                                            <p className="text-[11px] text-muted-foreground">
                                                {b.mobile_number} · Joined {formatDistanceToNow(new Date(b.created_at), { addSuffix: true })}
                                            </p>
                                        </div>
                                        <div className="flex flex-col items-end gap-1">
                                            {getSubBadge(b)}
                                            {(b.sub_trial_end || b.sub_period_end) && (
                                                <span className="text-[10px] text-muted-foreground">
                                                    ends {format(new Date(b.sub_trial_end || b.sub_period_end), 'dd MMM')}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Needs Attention */}
                <Card className="border-red-500/20 bg-red-500/5">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-red-500" />
                            Needs Attention
                            {needsAttention.length > 0 && (
                                <Badge className="bg-red-500 text-white text-[10px] ml-auto">{needsAttention.length}</Badge>
                            )}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {needsAttention.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-6 text-muted-foreground gap-2">
                                <Zap className="h-8 w-8 opacity-20" />
                                <p className="text-sm">All businesses are healthy!</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {needsAttention.map((b: any) => {
                                    const reason = !b.sub_id ? 'No subscription' :
                                        b.sub_status === 'expired' ? 'Subscription expired' :
                                            'Plan ended';
                                    return (
                                        <div key={b.id} className="flex items-center justify-between p-2 rounded-lg bg-background border border-red-500/20">
                                            <div>
                                                <p className="text-sm font-semibold">{b.business_name}</p>
                                                <p className="text-[11px] text-red-500">{reason}</p>
                                            </div>
                                            <Badge variant="outline" className="text-[10px] border-red-400 text-red-500">
                                                {b.plan_name || 'Unassigned'}
                                            </Badge>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Platform Health mini stats */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base">Platform Health</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                        {[
                            { label: 'Active Plans', value: subOverview?.active ?? 0, color: 'text-green-500' },
                            { label: 'Trialing', value: subOverview?.trialing ?? 0, color: 'text-blue-500' },
                            { label: 'Expired', value: subOverview?.expired ?? 0, color: 'text-red-500' },
                            { label: 'No Subscription', value: subOverview?.no_sub ?? 0, color: 'text-muted-foreground' },
                        ].map((item) => (
                            <div key={item.label} className="p-4 rounded-xl bg-muted/30 border">
                                <p className={`text-2xl font-black ${item.color}`}>{item.value}</p>
                                <p className="text-xs text-muted-foreground mt-1">{item.label}</p>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
