import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CreditCard, DollarSign, PlusCircle, XCircle } from 'lucide-react';
import { format, addMonths, addYears } from 'date-fns';
import { toast } from 'sonner';

export default function SubscriptionTab() {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [statusFilter, setStatusFilter] = useState('all');

    const { data: subscriptions = [], isLoading } = useQuery({
        queryKey: ['all-subscriptions'],
        queryFn: async () => {
            const { data, error } = await (supabase.rpc as any)('get_all_subscriptions');
            if (error) throw error;
            return data as any[];
        },
    });

    const manageSubMutation = useMutation({
        mutationFn: async (vars: { bizId: string; planId: string; status: string; periodEnd: string }) => {
            const { error } = await (supabase.rpc as any)('manage_business_subscription', {
                p_business_id: vars.bizId,
                p_plan_id: vars.planId,
                p_status: vars.status,
                p_period_end: vars.periodEnd,
            });
            if (error) throw error;
            await (supabase.rpc as any)('log_admin_action', {
                p_admin_id: user?.id || 'super-admin',
                p_action: vars.status === 'expired' ? 'cancel_subscription' : 'extend_subscription',
                p_target_id: vars.bizId,
                p_target_type: 'business',
                p_details: { plan_id: vars.planId, period_end: vars.periodEnd },
            });
        },
        onSuccess: () => {
            toast.success('Subscription updated');
            queryClient.invalidateQueries({ queryKey: ['all-subscriptions'] });
            queryClient.invalidateQueries({ queryKey: ['super-admin-businesses'] });
        },
        onError: (err: any) => toast.error(err.message),
    });

    const filtered = subscriptions.filter(s => {
        if (statusFilter === 'all') return true;
        return s.status === statusFilter;
    });

    const getStatusBadge = (s: any) => {
        const now = new Date();
        const isExpired =
            s.status === 'expired' ||
            (s.status === 'active' && s.current_period_end && new Date(s.current_period_end) < now) ||
            (s.status === 'trialing' && s.trial_end && new Date(s.trial_end) < now);

        if (isExpired) return <Badge className="bg-red-100 text-red-700 hover:bg-red-100 text-[10px]">Expired</Badge>;
        if (s.status === 'active') return <Badge className="bg-green-100 text-green-700 hover:bg-green-100 text-[10px]">Active</Badge>;
        if (s.status === 'trialing') return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 text-[10px]">Trial</Badge>;
        return <Badge variant="secondary" className="text-[10px]">{s.status}</Badge>;
    };

    const totalRevenue = subscriptions.reduce((acc, s) => acc + Number(s.plan_price || 0), 0);

    return (
        <div className="space-y-4">
            {/* Revenue summary banner */}
            <Card className="bg-gradient-to-r from-emerald-500/10 to-transparent border-emerald-500/20">
                <CardContent className="pt-4 pb-4 flex items-center gap-4">
                    <DollarSign className="h-6 w-6 text-emerald-500" />
                    <div>
                        <p className="text-sm font-bold">Total MRR Estimate</p>
                        <p className="text-2xl font-extrabold">
                            ₹{totalRevenue.toLocaleString('en-IN')}
                        </p>
                    </div>
                    <div className="ml-auto text-right">
                        <p className="text-sm text-muted-foreground">{subscriptions.length} subscriptions</p>
                    </div>
                </CardContent>
            </Card>

            {/* Filter */}
            <div className="flex justify-end">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-48">
                        <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="trialing">Trialing</SelectItem>
                        <SelectItem value="expired">Expired</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                        <CreditCard className="h-4 w-4 text-primary" />
                        Subscriptions
                        <Badge variant="outline" className="text-xs ml-1">{filtered.length}</Badge>
                    </CardTitle>
                    <CardDescription>All subscriptions with inline extend & cancel controls</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="py-12 text-center text-sm text-muted-foreground">Loading...</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/40">
                                        <TableHead>Business</TableHead>
                                        <TableHead>Plan</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Expiry</TableHead>
                                        <TableHead>Price</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filtered.map((s) => (
                                        <TableRow key={s.subscription_id}>
                                            <TableCell>
                                                <p className="font-semibold text-sm">{s.business_name}</p>
                                            </TableCell>
                                            <TableCell className="text-sm">{s.plan_name}</TableCell>
                                            <TableCell>{getStatusBadge(s)}</TableCell>
                                            <TableCell className="text-xs text-muted-foreground">
                                                {s.current_period_end
                                                    ? format(new Date(s.current_period_end), 'MMM dd, yyyy HH:mm')
                                                    : s.trial_end
                                                        ? format(new Date(s.trial_end), 'MMM dd, yyyy HH:mm') + ' (trial)'
                                                        : '—'}
                                            </TableCell>
                                            <TableCell className="font-semibold text-sm">₹{s.plan_price}</TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex gap-1.5 justify-end flex-wrap">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="h-7 text-xs px-2"
                                                        disabled={manageSubMutation.isPending}
                                                        onClick={() => manageSubMutation.mutate({
                                                            bizId: s.business_id,
                                                            planId: s.plan_id || s.subscription_id,
                                                            status: 'active',
                                                            periodEnd: addMonths(new Date(s.current_period_end || new Date()), 1).toISOString(),
                                                        })}
                                                        title="Extend by 1 month"
                                                    >
                                                        <PlusCircle className="h-3 w-3 mr-1" />+1M
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="h-7 text-xs px-2"
                                                        disabled={manageSubMutation.isPending}
                                                        onClick={() => manageSubMutation.mutate({
                                                            bizId: s.business_id,
                                                            planId: s.plan_id || s.subscription_id,
                                                            status: 'active',
                                                            periodEnd: addYears(new Date(s.current_period_end || new Date()), 1).toISOString(),
                                                        })}
                                                        title="Extend by 1 year"
                                                    >
                                                        <PlusCircle className="h-3 w-3 mr-1" />+1Y
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="destructive"
                                                        className="h-7 text-xs px-2"
                                                        disabled={manageSubMutation.isPending}
                                                        onClick={() => manageSubMutation.mutate({
                                                            bizId: s.business_id,
                                                            planId: s.plan_id || s.subscription_id,
                                                            status: 'expired',
                                                            periodEnd: new Date().toISOString(),
                                                        })}
                                                    >
                                                        <XCircle className="h-3 w-3 mr-1" />Cancel
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {filtered.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                                                No subscriptions found.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
