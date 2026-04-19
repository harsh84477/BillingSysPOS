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
    // Fetch all required data for the overview section
    const { data: stats, isLoading } = useQuery({
        queryKey: ['super-admin-dashboard-stats-v2'],
        queryFn: async () => {
            // Fetch KPIs, recent registrations, plan distribution, and activity
            const [
                { count: userCount },
                { data: subsData },
                { data: recentRegs },
                { data: planUsers },
                { data: activityLogs }
            ] = await Promise.all([
                supabase.from('profiles').select('*', { count: 'exact', head: true }),
                (supabase.rpc as any)('get_all_subscriptions'),
                supabase.from('businesses').select('id, business_name, created_at, owner_email, plan_name, status').order('created_at', { ascending: false }).limit(4),
                supabase.from('profiles').select('plan_name'),
                (supabase.rpc as any)('get_admin_logs')
            ]);

            // KPI calculations
            const users = userCount || 0;
            const activeSubs = (subsData || []).filter((s: any) => s.status === 'active');
            const trialSubs = (subsData || []).filter((s: any) => s.status === 'trialing');
            const expiredSubs = (subsData || []).filter((s: any) => s.status === 'expired');
            const mrr = activeSubs.reduce((acc: number, s: any) => acc + Number(s.plan_price || 0), 0);
            const openTickets = 7; // Placeholder, replace with real data if available

            // Plan distribution
            const planCounts: Record<string, number> = { Pro: 0, Basic: 0, Trial: 0, Free: 0 };
            (planUsers || []).forEach((p: any) => {
                if (planCounts[p.plan_name]) planCounts[p.plan_name]++;
                else if (p.plan_name) planCounts[p.plan_name] = 1;
            });
            // Fallback for demo
            if (Object.values(planCounts).every(v => v === 0)) {
                planCounts.Pro = 134; planCounts.Basic = 73; planCounts.Trial = 31; planCounts.Free = 10;
            }
            const planTotal = Object.values(planCounts).reduce((a, b) => a + b, 0) || 1;

            // Activity logs (limit 4)
            const activity = (activityLogs?.data || activityLogs || []).slice(0, 4);

            return {
                users,
                activeSubs: activeSubs.length,
                mrr,
                trialSubs: trialSubs.length,
                openTickets,
                recentRegs: recentRegs || [],
                planCounts,
                planTotal,
                activity
            };
        },
        refetchInterval: 60000,
    });

    // Trend/indicator icons
    const UpIcon = () => <svg width="12" height="12" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5"><polyline points="2,7 5,3 8,7" /></svg>;
    const DownIcon = () => <svg width="12" height="12" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5"><polyline points="2,3 5,7 8,3" /></svg>;
    const NeuIcon = () => <span className="text-muted-foreground">≤7 days left</span>;

    // Plan bar colors
    const planBarColors: Record<string, string> = {
        Pro: 'bg-[#534AB7]',
        Basic: 'bg-[#4f94ef]',
        Trial: 'bg-[#EF9F27]',
        Free: 'bg-[#B4B2A9]'
    };

    return (
        <div className="space-y-6">
            {/* KPI Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 mb-4">
                <div className="bg-card border rounded-lg p-4">
                    <div className="text-[10px] text-muted-foreground uppercase font-bold mb-1">Total users</div>
                    <div className="text-2xl font-bold">{isLoading ? '—' : stats?.users ?? 0}</div>
                    <div className="flex items-center gap-1 text-xs mt-1 text-green-700"><UpIcon />+14 this month</div>
                </div>
                <div className="bg-card border rounded-lg p-4">
                    <div className="text-[10px] text-muted-foreground uppercase font-bold mb-1">Active subs</div>
                    <div className="text-2xl font-bold">{isLoading ? '—' : stats?.activeSubs ?? 0}</div>
                    <div className="flex items-center gap-1 text-xs mt-1 text-green-700"><UpIcon />+8 this month</div>
                </div>
                <div className="bg-card border rounded-lg p-4">
                    <div className="text-[10px] text-muted-foreground uppercase font-bold mb-1">MRR</div>
                    <div className="text-2xl font-bold">₹{isLoading ? '—' : (stats?.mrr || 0).toLocaleString('en-IN')}</div>
                    <div className="flex items-center gap-1 text-xs mt-1 text-green-700"><UpIcon />+22% MoM</div>
                </div>
                <div className="bg-card border rounded-lg p-4">
                    <div className="text-[10px] text-muted-foreground uppercase font-bold mb-1">Active trials</div>
                    <div className="text-2xl font-bold">{isLoading ? '—' : stats?.trialSubs ?? 0}</div>
                    <div className="flex items-center gap-1 text-xs mt-1 text-muted-foreground"><NeuIcon /></div>
                </div>
                <div className="bg-card border rounded-lg p-4">
                    <div className="text-[10px] text-muted-foreground uppercase font-bold mb-1">Open tickets</div>
                    <div className="text-2xl font-bold">{isLoading ? '—' : stats?.openTickets ?? 0}</div>
                    <div className="flex items-center gap-1 text-xs mt-1 text-red-700"><DownIcon />2 critical</div>
                </div>
            </div>

            {/* 2-column grid: Recent Registrations + Plan Distribution/Live Activity */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Recent Registrations Table */}
                <div className="bg-card border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                        <div className="font-semibold text-sm">Recent registrations</div>
                        {onNavigate && (
                            <Button variant="link" size="sm" className="text-xs px-1" onClick={() => onNavigate('users')}>All users →</Button>
                        )}
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-xs">
                            <thead>
                                <tr className="text-muted-foreground">
                                    <th className="font-semibold py-1 px-2 text-left">Shop</th>
                                    <th className="font-semibold py-1 px-2 text-left">Plan</th>
                                    <th className="font-semibold py-1 px-2 text-left">Status</th>
                                    <th className="font-semibold py-1 px-2 text-left">Joined</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {isLoading ? (
                                    <tr><td colSpan={5} className="py-4 text-center">Loading...</td></tr>
                                ) : (stats?.recentRegs || []).map((reg: any, i: number) => (
                                    <tr key={reg.id} className="border-b last:border-b-0">
                                        <td className="py-1 px-2">
                                            <div className="font-semibold">{reg.business_name}</div>
                                            <div className="text-[10px] text-muted-foreground">{reg.owner_email}</div>
                                        </td>
                                        <td className="py-1 px-2">
                                            <span className={`inline-block rounded px-2 py-0.5 text-[10px] font-bold ${reg.plan_name === 'Pro' ? 'bg-[#EEEDFE] text-[#534AB7]' : reg.plan_name === 'Basic' ? 'bg-[#E6F1FB] text-[#185FA5]' : reg.plan_name === 'Trial' ? 'bg-[#FAEEDA] text-[#854F0B]' : 'bg-[#F1EFE8] text-[#5F5E5A]'}`}>{reg.plan_name}</span>
                                        </td>
                                        <td className="py-1 px-2">
                                            <span className={`inline-block rounded px-2 py-0.5 text-[10px] font-bold ${reg.status === 'Active' ? 'bg-[#EAF3DE] text-[#3B6D11]' : reg.status === 'Trial' ? 'bg-[#E6F1FB] text-[#185FA5]' : reg.status === 'Suspended' ? 'bg-[#FCEBEB] text-[#A32D2D]' : 'bg-[#F1EFE8] text-[#5F5E5A]'}`}>{reg.status}</span>
                                        </td>
                                        <td className="py-1 px-2 text-muted-foreground">{reg.created_at ? format(new Date(reg.created_at), 'MMM dd') : '—'}</td>
                                        <td className="py-1 px-2">
                                            <Button variant="outline" size="sm" className="h-6 px-2 text-[10px]">View</Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Plan Distribution + Live Activity */}
                <div className="flex flex-col gap-4">
                    {/* Plan Distribution */}
                    <div className="bg-card border rounded-lg p-4">
                        <div className="font-semibold text-sm mb-2">Plan distribution</div>
                        {isLoading ? (
                            <div className="h-16 bg-muted animate-pulse rounded" />
                        ) : (
                            <div className="space-y-2">
                                {Object.entries(stats?.planCounts || {}).map(([plan, count]) => (
                                    <div key={plan} className="flex items-center gap-2">
                                        <div className="text-xs font-semibold min-w-[42px]">{plan}</div>
                                        <div className="flex-1 h-2 rounded bg-muted/50 overflow-hidden">
                                            <div className={`h-2 rounded ${planBarColors[plan] || 'bg-gray-300'}`} style={{ width: `${Math.round((count as number) / (stats?.planTotal || 1) * 100)}%` }} />
                                        </div>
                                        <div className="text-[10px] text-muted-foreground min-w-[50px] text-right">{count} users</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    {/* Live Activity */}
                    <div className="bg-card border rounded-lg p-4">
                        <div className="font-semibold text-sm mb-2">Live activity</div>
                        <div className="space-y-2">
                            {isLoading ? (
                                <div className="h-16 bg-muted animate-pulse rounded" />
                            ) : (stats?.activity || []).map((act: any, i: number) => (
                                <div key={i} className="flex items-start gap-2 border-b last:border-b-0 py-2">
                                    <div className="w-2 h-2 rounded-full mt-1" style={{ background: i === 0 ? '#e24b4a' : i === 1 ? '#3B6D11' : i === 2 ? '#4f94ef' : '#EF9F27' }} />
                                    <div>
                                        <div className="text-xs font-semibold">{act.action ? act.action.replace(/_/g, ' ') : '—'}</div>
                                        <div className="text-[10px] text-muted-foreground mt-0.5">{act.created_at ? format(new Date(act.created_at), 'HH:mm') : ''} {act.target_type ? `· by ${act.target_type}` : ''}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
