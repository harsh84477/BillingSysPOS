import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Building2, CreditCard, Users, Package, FileText, Calendar,
    DollarSign, AlertCircle, ChevronRight, Shield, ShieldAlert, Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Props {
    businessId: string;
    business: any;
    plans: any[];
    onBack: () => void;
}

export default function BusinessProfile({ businessId, business, plans, onBack }: Props) {
    const { user } = useAuth();
    const queryClient = useQueryClient();

    const { data: summary } = useQuery({
        queryKey: ['business-summary', businessId],
        queryFn: async () => {
            const { data, error } = await (supabase.rpc as any)('get_business_summary', { p_business_id: businessId });
            if (error) throw error;
            return data;
        },
    });

    const { data: bills = [], isLoading: loadingBills } = useQuery({
        queryKey: ['business-bills', businessId],
        queryFn: async () => {
            const { data, error } = await (supabase.rpc as any)('get_business_bills', { p_business_id: businessId });
            if (error) throw error;
            return data as any[];
        },
    });

    const { data: products = [], isLoading: loadingProducts } = useQuery({
        queryKey: ['business-products', businessId],
        queryFn: async () => {
            const { data, error } = await (supabase.rpc as any)('get_business_products', { p_business_id: businessId });
            if (error) throw error;
            return data as any[];
        },
    });

    const { data: bizUsers = [], isLoading: loadingUsers } = useQuery({
        queryKey: ['business-users', businessId],
        queryFn: async () => {
            const { data, error } = await (supabase.rpc as any)('get_business_users', { p_business_id: businessId });
            if (error) throw error;
            return data as any[];
        },
    });

    const manageSubMutation = useMutation({
        mutationFn: async (vars: { planId: string; status: string; periodEnd: string }) => {
            const { error } = await (supabase.rpc as any)('manage_business_subscription', {
                p_business_id: businessId,
                p_plan_id: vars.planId,
                p_status: vars.status,
                p_period_end: vars.periodEnd,
            });
            if (error) throw error;
            await (supabase.rpc as any)('log_admin_action', {
                p_admin_id: user?.id || 'super-admin',
                p_action: vars.status === 'expired' ? 'cancel_subscription' : 'assign_subscription',
                p_target_id: businessId,
                p_target_type: 'business',
                p_details: { plan_id: vars.planId, period_end: vars.periodEnd },
            });
        },
        onSuccess: () => {
            toast.success('Subscription updated');
            queryClient.invalidateQueries({ queryKey: ['super-admin-businesses'] });
            queryClient.invalidateQueries({ queryKey: ['all-subscriptions'] });
        },
        onError: (err: any) => toast.error(err.message),
    });

    const blockMutation = useMutation({
        mutationFn: async ({ userId, block }: { userId: string; block: boolean }) => {
            const fn = block ? 'block_user' : 'unblock_user';
            const { error } = await (supabase.rpc as any)(fn, { p_user_id: userId });
            if (error) throw error;
            await (supabase.rpc as any)('log_admin_action', {
                p_admin_id: user?.id || 'super-admin',
                p_action: block ? 'block_user' : 'unblock_user',
                p_target_id: userId,
                p_target_type: 'user',
                p_details: { business_id: businessId },
            });
        },
        onSuccess: (_, vars) => {
            toast.success(vars.block ? 'User blocked' : 'User unblocked');
            queryClient.invalidateQueries({ queryKey: ['business-users', businessId] });
        },
        onError: (err: any) => toast.error(err.message),
    });

    const sub = business?.subscriptions?.[0];
    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'active': return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Active</Badge>;
            case 'trialing': return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">Trial</Badge>;
            case 'expired': return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Expired</Badge>;
            default: return <Badge variant="outline">No Plan</Badge>;
        }
    };

    const computePeriodEnd = (billingPeriod: string) => {
        const d = new Date();
        if (billingPeriod === 'monthly') d.setMonth(d.getMonth() + 1);
        else if (billingPeriod === '6_months') d.setMonth(d.getMonth() + 6);
        else if (billingPeriod === 'yearly') d.setFullYear(d.getFullYear() + 1);
        return d.toISOString();
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            {/* Back + Header */}
            <div className="flex items-start justify-between gap-4">
                <div>
                    <button onClick={onBack} className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 mb-2">
                        ← All Businesses
                    </button>
                    <h2 className="text-2xl font-black tracking-tight">{business?.business_name}</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                        📞 {business?.mobile_number} · joined {format(new Date(business?.created_at), 'MMM dd, yyyy')}
                    </p>
                </div>
                {sub ? getStatusBadge(sub.status) : <Badge variant="outline">No Subscription</Badge>}
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                    { label: 'Total Bills', value: summary?.bill_count ?? '—', icon: FileText, color: 'text-blue-500' },
                    { label: 'Total Revenue', value: summary ? `₹${Number(summary.total_revenue).toLocaleString('en-IN')}` : '—', icon: DollarSign, color: 'text-emerald-500' },
                    { label: 'Team Members', value: summary?.user_count ?? '—', icon: Users, color: 'text-violet-500' },
                    { label: 'Products', value: summary?.product_count ?? '—', icon: Package, color: 'text-orange-500' },
                ].map(item => (
                    <Card key={item.label} className="text-center py-1">
                        <CardContent className="pt-4 pb-3">
                            <item.icon className={`h-5 w-5 mx-auto mb-1 ${item.color}`} />
                            <p className="text-xl font-black">{item.value}</p>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">{item.label}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Detail Tabs */}
            <Tabs defaultValue="subscription" className="space-y-4">
                <TabsList className="grid grid-cols-4 w-full sm:w-auto sm:inline-flex">
                    <TabsTrigger value="subscription" className="gap-2"><CreditCard className="h-3.5 w-3.5" />Plan</TabsTrigger>
                    <TabsTrigger value="bills" className="gap-2"><FileText className="h-3.5 w-3.5" />Bills</TabsTrigger>
                    <TabsTrigger value="inventory" className="gap-2"><Package className="h-3.5 w-3.5" />Inventory</TabsTrigger>
                    <TabsTrigger value="users" className="gap-2"><Users className="h-3.5 w-3.5" />Team</TabsTrigger>
                </TabsList>

                {/* Subscription Management */}
                <TabsContent value="subscription" className="animate-in fade-in">
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base">Subscription Controller</CardTitle>
                            <CardDescription>Manual override — all changes are logged</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Current plan banner */}
                            <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 flex justify-between items-start">
                                <div>
                                    <p className="text-[11px] font-bold uppercase text-primary tracking-widest">Current Plan</p>
                                    <h4 className="text-xl font-black mt-1">{sub?.plan?.name || 'None'}</h4>
                                    <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-1">
                                        <Calendar className="h-3.5 w-3.5" />
                                        {sub?.current_period_end
                                            ? `Expires: ${format(new Date(sub.current_period_end), 'MMM dd, yyyy HH:mm')}`
                                            : sub?.trial_end
                                                ? `Trial ends: ${format(new Date(sub.trial_end), 'MMM dd, yyyy HH:mm')}`
                                                : 'No active subscription'}
                                    </p>
                                </div>
                                {sub && getStatusBadge(sub.status)}
                            </div>

                            {/* Plan buttons */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {plans.map((plan: any) => (
                                    <Button
                                        key={plan.id}
                                        variant={sub?.plan?.id === plan.id ? 'secondary' : 'outline'}
                                        className="h-auto py-3 px-4 justify-between"
                                        disabled={manageSubMutation.isPending}
                                        onClick={() => manageSubMutation.mutate({
                                            planId: plan.id,
                                            status: 'active',
                                            periodEnd: computePeriodEnd(plan.billing_period),
                                        })}
                                    >
                                        <div className="text-left">
                                            <p className="font-bold text-xs">{plan.name}</p>
                                            <p className="text-[10px] opacity-70">₹{plan.price} / {plan.billing_period.replace('_', ' ')}</p>
                                        </div>
                                        <ChevronRight className="h-4 w-4 shrink-0" />
                                    </Button>
                                ))}
                            </div>

                            {sub && (
                                <div className="pt-3 border-t border-dashed">
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        className="w-full"
                                        disabled={manageSubMutation.isPending}
                                        onClick={() => manageSubMutation.mutate({
                                            planId: sub.plan?.id,
                                            status: 'expired',
                                            periodEnd: new Date().toISOString(),
                                        })}
                                    >
                                        <AlertCircle className="h-4 w-4 mr-2" />
                                        Force Expire Subscription
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Bills */}
                <TabsContent value="bills" className="animate-in fade-in">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base">Transaction History</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            {loadingBills ? (
                                <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin" /></div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-muted/40">
                                            <TableHead>Bill #</TableHead>
                                            <TableHead>Date</TableHead>
                                            <TableHead>Amount</TableHead>
                                            <TableHead>Status</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {bills.slice(0, 20).map((b: any) => (
                                            <TableRow key={b.id}>
                                                <TableCell className="font-bold text-sm">{b.bill_number}</TableCell>
                                                <TableCell className="text-xs text-muted-foreground">{format(new Date(b.created_at), 'MMM dd, HH:mm')}</TableCell>
                                                <TableCell className="font-bold">₹{b.total_amount}</TableCell>
                                                <TableCell>
                                                    <Badge variant={b.status === 'completed' ? 'secondary' : 'outline'} className="text-[10px] capitalize">{b.status}</Badge>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        {bills.length === 0 && (
                                            <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No bills found.</TableCell></TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                        {bills.length > 20 && (
                            <CardFooter className="justify-center py-2">
                                <p className="text-xs text-muted-foreground">Showing 20 of {bills.length} bills</p>
                            </CardFooter>
                        )}
                    </Card>
                </TabsContent>

                {/* Inventory */}
                <TabsContent value="inventory" className="animate-in fade-in">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base">Product Inventory</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            {loadingProducts ? (
                                <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin" /></div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-muted/40">
                                            <TableHead>Product</TableHead>
                                            <TableHead>Selling Price</TableHead>
                                            <TableHead>Cost</TableHead>
                                            <TableHead>Stock</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {products.map((p: any) => (
                                            <TableRow key={p.id}>
                                                <TableCell>
                                                    <p className="font-semibold text-sm">{p.name}</p>
                                                </TableCell>
                                                <TableCell className="font-bold text-primary">₹{p.selling_price}</TableCell>
                                                <TableCell className="text-sm text-muted-foreground">₹{p.cost_price}</TableCell>
                                                <TableCell>
                                                    <span className={cn('text-sm font-bold', p.stock_quantity <= p.low_stock_threshold ? 'text-destructive' : 'text-foreground')}>
                                                        {p.stock_quantity}
                                                    </span>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        {products.length === 0 && (
                                            <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No products.</TableCell></TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Team / Users */}
                <TabsContent value="users" className="animate-in fade-in">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base">Team Members</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            {loadingUsers ? (
                                <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin" /></div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-muted/40">
                                            <TableHead>Name</TableHead>
                                            <TableHead>Role</TableHead>
                                            <TableHead>Prefix</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead className="text-right">Action</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {bizUsers.map((u: any) => (
                                            <TableRow key={u.user_id} className={cn(u.is_blocked && 'opacity-50')}>
                                                <TableCell>
                                                    <p className="font-semibold text-sm">{u.display_name || 'Unknown'}</p>
                                                    <p className="text-[10px] font-mono text-muted-foreground">{u.user_id?.slice(0, 10)}...</p>
                                                </TableCell>
                                                <TableCell className="capitalize text-sm">{u.role}</TableCell>
                                                <TableCell className="font-mono text-sm">{u.bill_prefix || '—'}</TableCell>
                                                <TableCell>
                                                    {u.is_blocked
                                                        ? <Badge className="bg-red-100 text-red-700 hover:bg-red-100 gap-1 text-[10px]"><ShieldAlert className="h-3 w-3" />Blocked</Badge>
                                                        : <Badge className="bg-green-100 text-green-700 hover:bg-green-100 text-[10px]">Active</Badge>}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button
                                                        size="sm"
                                                        variant={u.is_blocked ? 'outline' : 'destructive'}
                                                        className="h-7 text-xs"
                                                        disabled={blockMutation.isPending}
                                                        onClick={() => blockMutation.mutate({ userId: u.user_id, block: !u.is_blocked })}
                                                    >
                                                        {u.is_blocked ? 'Unblock' : 'Block'}
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        {bizUsers.length === 0 && (
                                            <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No users found.</TableCell></TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
