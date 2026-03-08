import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, Users, TrendingUp, Activity, ShieldCheck, UserCheck, UserX, Crown } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function DashboardTab() {
    const { data: stats, isLoading } = useQuery({
        queryKey: ['super-admin-dashboard-stats'],
        queryFn: async () => {
            const [
                { count: businessCount },
                { count: userCount },
                { data: rolesData },
                { data: billsData },
            ] = await Promise.all([
                supabase.from('business_settings').select('*', { count: 'exact', head: true }),
                supabase.from('profiles').select('*', { count: 'exact', head: true }),
                supabase.from('user_roles').select('role'),
                supabase.from('bills').select('total_amount').eq('status', 'completed'),
            ]);

            const totalRevenue = (billsData || []).reduce((acc, b) => acc + Number(b.total_amount || 0), 0);

            const roles = rolesData || [];
            const admins = roles.filter(r => r.role === 'admin').length;
            const staff = roles.filter(r => r.role === 'staff').length;
            const viewers = roles.filter(r => r.role === 'viewer').length;

            return {
                businesses: businessCount || 0,
                users: userCount || 0,
                admins,
                staff,
                viewers,
                revenue: totalRevenue,
            };
        },
        refetchInterval: 60000,
    });

    const statCards = [
        { title: 'Total Businesses', value: stats?.businesses, icon: Building2, color: 'text-blue-500', bg: 'bg-blue-500/10', desc: 'Registered on platform' },
        { title: 'Total Users', value: stats?.users, icon: Users, color: 'text-violet-500', bg: 'bg-violet-500/10', desc: 'Across all businesses' },
        { title: 'Business Owners', value: stats?.admins, icon: Crown, color: 'text-amber-500', bg: 'bg-amber-500/10', desc: 'Admin role users' },
        { title: 'Staff Members', value: stats?.staff, icon: UserCheck, color: 'text-emerald-500', bg: 'bg-emerald-500/10', desc: 'Cashiers & managers' },
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
                                <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">SUPER ADMIN</Badge>
                            </div>
                            <h2 className="text-xl sm:text-2xl font-black tracking-tight">Welcome back, Administrator</h2>
                            <p className="text-sm text-muted-foreground mt-1">Here's your platform overview at a glance.</p>
                        </div>
                        <div className="hidden sm:flex items-center gap-1.5">
                            <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
                            <span className="text-xs text-muted-foreground font-mono">All systems operational</span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {statCards.map((card) => (
                    <Card key={card.title} className="hover:shadow-md transition-shadow">
                        <CardContent className="pt-4 pb-4 sm:pt-5 sm:pb-5">
                            <div className="flex items-center justify-between mb-3">
                                <div className={`h-9 w-9 rounded-lg ${card.bg} flex items-center justify-center`}>
                                    <card.icon className={`h-4 w-4 ${card.color}`} />
                                </div>
                            </div>
                            {isLoading ? (
                                <Skeleton className="h-8 w-16 mb-1" />
                            ) : (
                                <p className="text-2xl sm:text-3xl font-black tracking-tight">{card.value ?? 0}</p>
                            )}
                            <p className="text-[10px] sm:text-xs text-muted-foreground font-medium uppercase tracking-wider mt-1">{card.title}</p>
                            <p className="text-[9px] text-muted-foreground/70 mt-0.5 hidden sm:block">{card.desc}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Revenue Card */}
            <Card>
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-base flex items-center gap-2">
                                <TrendingUp className="h-4 w-4 text-emerald-500" />
                                Total Platform Revenue
                            </CardTitle>
                            <CardDescription>Revenue from all completed bills across businesses</CardDescription>
                        </div>
                        <Badge variant="outline" className="text-xs">
                            <Activity className="h-3 w-3 mr-1" />Live
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <Skeleton className="h-10 w-40" />
                    ) : (
                        <div className="flex items-baseline gap-2">
                            <p className="text-3xl sm:text-4xl font-black text-primary">
                                ₹{(stats?.revenue || 0).toLocaleString('en-IN')}
                            </p>
                            <span className="text-sm text-muted-foreground">total</span>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Role Breakdown */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card>
                    <CardContent className="pt-4 pb-4 flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                            <Crown className="h-5 w-5 text-amber-500" />
                        </div>
                        <div>
                            <p className="text-xl font-black">{isLoading ? '—' : stats?.admins ?? 0}</p>
                            <p className="text-xs text-muted-foreground">Admins / Owners</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-4 pb-4 flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                            <UserCheck className="h-5 w-5 text-blue-500" />
                        </div>
                        <div>
                            <p className="text-xl font-black">{isLoading ? '—' : stats?.staff ?? 0}</p>
                            <p className="text-xs text-muted-foreground">Staff Members</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-4 pb-4 flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-slate-500/10 flex items-center justify-center">
                            <UserX className="h-5 w-5 text-slate-500" />
                        </div>
                        <div>
                            <p className="text-xl font-black">{isLoading ? '—' : stats?.viewers ?? 0}</p>
                            <p className="text-xs text-muted-foreground">Viewers</p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
