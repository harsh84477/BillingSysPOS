import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Building2, Users, TrendingUp, Activity, ShieldCheck,
    Crown, UserCheck, CreditCard, Clock, AlertTriangle,
    IndianRupee, ArrowRight, Zap, BarChart3
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';

interface Props {
    onNavigate?: (tab: string) => void;
}

export default function DashboardTab({ onNavigate }: Props) {
    const { data: stats, isLoading } = useQuery({
        queryKey: ['super-admin-dashboard-stats'],
        queryFn: async () => {
            const [
                { count: businessCount },
                { count: userCount },
                { data: rolesData },
                subsResult,
                { data: recentBizData },
            ] = await Promise.all([
                supabase.from('businesses').select('*', { count: 'exact', head: true }),
                supabase.from('profiles').select('*', { count: 'exact', head: true }),
                supabase.from('user_roles').select('role'),
                (supabase.rpc as any)('get_all_subscriptions'),
                supabase.from('businesses').select('id, business_name, created_at').order('created_at', { ascending: false }).limit(5),
            ]);

            const subs = (subsResult?.data || subsResult || []) as any[];
            const roles = (rolesData || []) as any[];

            const activeSubs = subs.filter((s: any) => s.status === 'active');
            const trialSubs = subs.filter((s: any) => s.status === 'trialing');
            const expiredSubs = subs.filter((s: any) => s.status === 'expired');
            const appRevenue = activeSubs.reduce((acc: number, s: any) => acc + Number(s.plan_price || 0), 0);

            return {
                businesses: businessCount || 0,
                users: userCount || 0,
                owners: roles.filter((r: any) => r.role === 'owner' || r.role === 'admin').length,
                managers: roles.filter((r: any) => r.role === 'manager').length,
                cashiers: roles.filter((r: any) => r.role === 'cashier').length,
                salesmen: roles.filter((r: any) => r.role === 'salesman').length,
                totalSubs: subs.length,
                activeSubs: activeSubs.length,
                trialSubs: trialSubs.length,
                expiredSubs: expiredSubs.length,
                appRevenue,
                recentBusinesses: (recentBizData || []) as any[],
            };
        },
        refetchInterval: 60000,
    });

    const { data: recentLogs = [] } = useQuery({
        queryKey: ['super-admin-recent-logs'],
        queryFn: async () => {
            const { data, error } = await (supabase.rpc as any)('get_admin_logs');
            if (error) throw error;
            return ((data || []) as any[]).slice(0, 5);
        },
        refetchInterval: 30000,
    });

    const actionColor = (action: string) => {
        if (action.includes('assign') || action.includes('unblock') || action.includes('create')) return 'text-green-600 bg-green-50';
        if (action.includes('cancel') || action.includes('block') || action.includes('delete')) return 'text-red-600 bg-red-50';
        if (action.includes('extend') || action.includes('edit')) return 'text-blue-600 bg-blue-50';
        return 'text-muted-foreground bg-muted';
    };

    const kpiRow1 = [
        { title: 'Active Businesses', value: stats?.businesses, icon: Building2, color: 'text-blue-600', bg: 'bg-blue-500/10' },
        { title: 'Total Users', value: stats?.users, icon: Users, color: 'text-violet-600', bg: 'bg-violet-500/10' },
        { title: 'Trial Users', value: stats?.trialSubs, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-500/10' },
        { title: 'Paid Subscribers', value: stats?.activeSubs, icon: CreditCard, color: 'text-green-600', bg: 'bg-green-500/10' },
    ];

    const kpiRow2 = [
        { title: 'Expired', value: stats?.expiredSubs, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-500/10' },
        { title: 'Business Owners', value: stats?.owners, icon: Crown, color: 'text-amber-600', bg: 'bg-amber-500/10' },
        { title: 'Staff (Mgr+Cashier)', value: (stats?.managers ?? 0) + (stats?.cashiers ?? 0), icon: UserCheck, color: 'text-blue-600', bg: 'bg-blue-500/10' },
        { title: 'Salesmen', value: stats?.salesmen, icon: BarChart3, color: 'text-teal-600', bg: 'bg-teal-500/10' },
    ];

    return (
        <div className="space-y-6">
            {/* Welcome Banner */}
            <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-primary/20">
                <CardContent className="pt-6 pb-6">
                    <div className="flex items-start justify-between">
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <ShieldCheck className="h-5 w-5 text-primary" />
                                <Badge variant="outline" className="text-[10px] border-primary/30 text-primary font-bold">SUPER ADMIN</Badge>
                            </div>
                            <h2 className="text-xl sm:text-2xl font-black tracking-tight">Platform Overview</h2>
                            <p className="text-sm text-muted-foreground mt-1">Monitor all businesses, subscriptions, and revenue.</p>
                        </div>
                        <div className="hidden sm:flex items-center gap-1.5">
                            <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
                            <span className="text-xs text-muted-foreground font-mono">All systems operational</span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* App Revenue Hero */}
            <Card className="border-emerald-200/50 bg-gradient-to-r from-emerald-500/5 via-emerald-500/[0.02] to-transparent">
                <CardContent className="pt-5 pb-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                                <IndianRupee className="h-6 w-6 text-emerald-600" />
                            </div>
                            <div>
                                <p className="text-xs font-bold uppercase tracking-widest text-emerald-600/80">App Revenue (Active Subscriptions)</p>
                                {isLoading ? (
                                    <Skeleton className="h-9 w-40 mt-1" />
                                ) : (
                                    <p className="text-3xl sm:text-4xl font-black text-emerald-600 tracking-tight">
                                        ₹{(stats?.appRevenue || 0).toLocaleString('en-IN')}
                                    </p>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center gap-6 text-sm">
                            <div className="text-center">
                                <p className="text-xl font-black">{isLoading ? '—' : stats?.totalSubs ?? 0}</p>
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total Subs</p>
                            </div>
                            <div className="text-center">
                                <p className="text-xl font-black text-green-600">{isLoading ? '—' : stats?.activeSubs ?? 0}</p>
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Active</p>
                            </div>
                            <div className="text-center">
                                <p className="text-xl font-black text-amber-600">{isLoading ? '—' : stats?.trialSubs ?? 0}</p>
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Trial</p>
                            </div>
                            <div className="text-center">
                                <p className="text-xl font-black text-red-500">{isLoading ? '—' : stats?.expiredSubs ?? 0}</p>
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Expired</p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* KPI Row 1 */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {kpiRow1.map((card) => (
                    <Card key={card.title} className="hover:shadow-md transition-shadow">
                        <CardContent className="pt-4 pb-4">
                            <div className={`h-9 w-9 rounded-lg ${card.bg} flex items-center justify-center mb-3`}>
                                <card.icon className={`h-4 w-4 ${card.color}`} />
                            </div>
                            {isLoading ? <Skeleton className="h-8 w-16 mb-1" /> : (
                                <p className="text-2xl sm:text-3xl font-black tracking-tight">{card.value ?? 0}</p>
                            )}
                            <p className="text-[10px] sm:text-xs text-muted-foreground font-medium uppercase tracking-wider mt-1">{card.title}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* KPI Row 2 */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {kpiRow2.map((card) => (
                    <Card key={card.title} className="hover:shadow-md transition-shadow">
                        <CardContent className="pt-4 pb-4">
                            <div className={`h-9 w-9 rounded-lg ${card.bg} flex items-center justify-center mb-3`}>
                                <card.icon className={`h-4 w-4 ${card.color}`} />
                            </div>
                            {isLoading ? <Skeleton className="h-8 w-16 mb-1" /> : (
                                <p className="text-2xl sm:text-3xl font-black tracking-tight">{card.value ?? 0}</p>
                            )}
                            <p className="text-[10px] sm:text-xs text-muted-foreground font-medium uppercase tracking-wider mt-1">{card.title}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Bottom: Recent Activity + Quick Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <Card className="lg:col-span-2">
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm flex items-center gap-2">
                                <Activity className="h-4 w-4 text-primary" /> Recent Admin Activity
                            </CardTitle>
                            {onNavigate && (
                                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => onNavigate('logs')}>
                                    View All <ArrowRight className="h-3 w-3" />
                                </Button>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {recentLogs.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-6">No recent activity</p>
                        ) : recentLogs.map((log: any) => (
                            <div key={log.id} className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-muted/40 transition-colors">
                                <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${actionColor(log.action)}`}>
                                    <Zap className="h-3.5 w-3.5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-semibold truncate">{log.action.replace(/_/g, ' ')}</p>
                                    <p className="text-[10px] text-muted-foreground">
                                        {log.target_type && <span className="capitalize">{log.target_type}</span>}
                                        {log.created_at && <span> · {format(new Date(log.created_at), 'MMM dd, HH:mm')}</span>}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>

                <div className="space-y-4">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm">Quick Actions</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            {onNavigate && (<>
                                <Button variant="outline" className="w-full justify-start h-9 text-xs gap-2" onClick={() => onNavigate('businesses')}>
                                    <Building2 className="h-3.5 w-3.5 text-blue-500" /> Manage Businesses
                                </Button>
                                <Button variant="outline" className="w-full justify-start h-9 text-xs gap-2" onClick={() => onNavigate('subscriptions')}>
                                    <CreditCard className="h-3.5 w-3.5 text-green-500" /> Manage Subscriptions
                                </Button>
                                <Button variant="outline" className="w-full justify-start h-9 text-xs gap-2" onClick={() => onNavigate('users')}>
                                    <Users className="h-3.5 w-3.5 text-violet-500" /> View All Users
                                </Button>
                                <Button variant="outline" className="w-full justify-start h-9 text-xs gap-2" onClick={() => onNavigate('plans')}>
                                    <TrendingUp className="h-3.5 w-3.5 text-amber-500" /> Manage Plans
                                </Button>
                            </>)}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-sm">Recent Businesses</CardTitle>
                                {onNavigate && (
                                    <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1" onClick={() => onNavigate('businesses')}>
                                        All <ArrowRight className="h-3 w-3" />
                                    </Button>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-1.5">
                            {isLoading ? [1, 2, 3].map(i => <Skeleton key={i} className="h-8 w-full" />) : stats?.recentBusinesses?.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-4">No businesses yet</p>
                            ) : stats?.recentBusinesses?.map((biz: any) => (
                                <div key={biz.id} className="flex items-center gap-2.5 py-1.5 px-2 rounded-md hover:bg-muted/40 transition-colors">
                                    <div className="h-7 w-7 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                                        <Building2 className="h-3.5 w-3.5 text-primary" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-semibold truncate">{biz.business_name}</p>
                                        <p className="text-[10px] text-muted-foreground">{biz.created_at ? format(new Date(biz.created_at), 'MMM dd, yyyy') : '—'}</p>
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
