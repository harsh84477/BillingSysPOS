import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend
} from 'recharts';
import {
    DollarSign, Building2, Users, CreditCard, TrendingUp, Clock, AlertTriangle, Activity
} from 'lucide-react';
import { Loader2 } from 'lucide-react';

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

    const statCards = [
        {
            title: 'Total Revenue (All Businesses)',
            value: stats ? `₹${Number(stats.total_revenue).toLocaleString('en-IN')}` : '—',
            sub: `₹${Number(stats?.monthly_revenue || 0).toLocaleString('en-IN')} this month · platform-wide`,
            icon: DollarSign,
            gradient: 'from-emerald-500/10 to-emerald-500/5',
            iconColor: 'text-emerald-500',
            border: 'border-emerald-500/20',
        },
        {
            title: 'Businesses',
            value: stats?.total_businesses ?? '—',
            sub: `+${stats?.new_businesses_30d ?? 0} last 30 days`,
            icon: Building2,
            gradient: 'from-blue-500/10 to-blue-500/5',
            iconColor: 'text-blue-500',
            border: 'border-blue-500/20',
        },
        {
            title: 'Active Subscriptions',
            value: stats?.active_subscriptions ?? '—',
            sub: `${stats?.trial_subscriptions ?? 0} trialing`,
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
            title: 'Trial Businesses',
            value: stats?.trial_subscriptions ?? '—',
            sub: 'Free trial active',
            icon: Clock,
            gradient: 'from-cyan-500/10 to-cyan-500/5',
            iconColor: 'text-cyan-500',
            border: 'border-cyan-500/20',
        },
        {
            title: 'Expired',
            value: stats?.expired_subscriptions ?? '—',
            sub: 'Need renewal',
            icon: AlertTriangle,
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

                {/* Subscription Breakdown Donut */}
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

            {/* Recent Businesses */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base">Platform Health</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                        {[
                            { label: 'Active', value: subOverview?.active ?? 0, color: 'text-green-500' },
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
