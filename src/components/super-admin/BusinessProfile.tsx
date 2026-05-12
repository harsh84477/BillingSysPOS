import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Building2, CreditCard, Users, Package, FileText, Calendar,
    DollarSign, AlertCircle, ChevronRight, Shield, ShieldAlert, Loader2, Trash2,
    Download, Search, ArrowLeft, CalendarDays, Filter, Activity, ShoppingCart, Boxes
} from 'lucide-react';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths, isWithinInterval } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import * as XLSX from 'xlsx';
import BusinessInfoCard from './businesses/BusinessInfoCard';

interface Props {
    businessId: string;
    business: any;
    plans: any[];
    onBack: () => void;
}

export default function BusinessProfile({ businessId, business, plans, onBack }: Props) {
    const { customAdminId } = useAuth();
    const queryClient = useQueryClient();
    const [deleting, setDeleting] = useState(false);
    const [billDateFilter, setBillDateFilter] = useState('all');
    const [customMonth, setCustomMonth] = useState('');
    const [inventorySearch, setInventorySearch] = useState('');

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
        mutationFn: async (vars: { planId?: string; status: string; periodEnd: string }) => {
            // Always pass null for planId if undefined (for trial/lifetime)
            const planId = vars.planId ?? null;
            const { error } = await (supabase.rpc as any)('manage_business_subscription', {
                p_business_id: businessId,
                p_plan_id: planId,
                p_status: vars.status,
                p_period_end: vars.periodEnd,
            });
            if (error) throw error;
            await (supabase.rpc as any)('log_admin_action', {
                p_admin_id: customAdminId || 'unknown',
                p_action: vars.status === 'expired' ? 'cancel_subscription' : 'assign_subscription',
                p_target_id: businessId,
                p_target_type: 'business',
                p_details: { plan_id: planId, period_end: vars.periodEnd },
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
                p_admin_id: customAdminId || 'unknown',
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

    const { data: allSubs } = useQuery({
        queryKey: ['super-admin-subs-map'],
        queryFn: async () => {
            const { data, error } = await (supabase.rpc as any)('get_all_subscriptions');
            if (error) throw error;
            return data as any[];
        },
    });

    const sub = allSubs?.find((s: any) => s.business_id === businessId) || null;

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'active':
                if (sub?.current_period_end && new Date(sub.current_period_end).getFullYear() >= 2099) {
                    return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Lifetime</Badge>;
                }
                return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Active</Badge>;
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

    const handleDeleteBusiness = async () => {
        setDeleting(true);
        try {
            const { error } = await (supabase.rpc as any)('delete_business_cascade', { p_business_id: businessId });
            if (error) throw error;
            await (supabase.rpc as any)('log_admin_action', {
                p_admin_id: customAdminId || 'unknown',
                p_action: 'delete_business',
                p_target_id: businessId,
                p_target_type: 'business',
                p_details: { business_name: business?.business_name },
            });
            toast.success(`Deleted "${business?.business_name}"`);
            queryClient.invalidateQueries({ queryKey: ['super-admin-all-businesses'] });
            queryClient.invalidateQueries({ queryKey: ['super-admin-dashboard-stats'] });
            onBack();
        } catch (err: any) {
            toast.error(err.message || 'Failed to delete');
        } finally {
            setDeleting(false);
        }
    };

    // Computed metrics
    const inventoryValue = useMemo(() =>
        products.reduce((sum: number, p: any) => sum + (Number(p.selling_price || 0) * Number(p.stock_quantity || 0)), 0),
    [products]);
    const customerCount = useMemo(() => {
        const ids = new Set<string>();
        bills.forEach((b: any) => { if (b.customer_id) ids.add(b.customer_id); });
        return ids.size;
    }, [bills]);

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            {/* Hero Header */}
            <div className="flex items-start justify-between gap-4">
                <div>
                    <Button variant="ghost" size="sm" onClick={onBack} className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground mb-2 -ml-2">
                        <ArrowLeft className="h-3.5 w-3.5" /> All Businesses
                    </Button>
                    <div className="flex items-center gap-4">
                        <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                            <span className="text-xl font-black text-primary">{(business?.business_name || '?')[0].toUpperCase()}</span>
                        </div>
                        <div>
                            <h2 className="text-2xl font-black tracking-tight">{business?.business_name}</h2>
                            <p className="text-sm text-muted-foreground mt-0.5">
                                {business?.mobile_number && <span>📞 {business.mobile_number} · </span>}
                                joined {business?.created_at ? format(new Date(business.created_at), 'MMM dd, yyyy') : '—'}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    {sub ? getStatusBadge(sub.status) : <Badge variant="outline">No Subscription</Badge>}
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm" className="h-8 text-xs gap-1 text-red-600 border-red-200 hover:bg-red-50">
                                <Trash2 className="h-3.5 w-3.5" /> Delete
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Delete "{business?.business_name}"?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This will permanently delete the business and ALL its data. This cannot be undone.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction className="bg-red-600 hover:bg-red-700" disabled={deleting} onClick={handleDeleteBusiness}>
                                    {deleting ? 'Deleting...' : 'Delete Everything'}
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            </div>

            {/* Summary Cards (6 KPIs) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {[
                    { label: 'Total Bills', value: summary?.bill_count ?? '—', icon: FileText, color: 'text-blue-500', bg: 'bg-blue-50' },
                    { label: 'Total Revenue', value: summary ? `₹${Number(summary.total_revenue).toLocaleString('en-IN')}` : '—', icon: DollarSign, color: 'text-emerald-500', bg: 'bg-emerald-50' },
                    { label: 'Team Members', value: summary?.user_count ?? '—', icon: Users, color: 'text-violet-500', bg: 'bg-violet-50' },
                    { label: 'Products', value: summary?.product_count ?? '—', icon: Package, color: 'text-orange-500', bg: 'bg-orange-50' },
                    { label: 'Customers', value: customerCount, icon: ShoppingCart, color: 'text-pink-500', bg: 'bg-pink-50' },
                    { label: 'Stock Value', value: `₹${inventoryValue.toLocaleString('en-IN')}`, icon: Boxes, color: 'text-cyan-500', bg: 'bg-cyan-50' },
                ].map(item => (
                    <Card key={item.label} className="group hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
                        <CardContent className="pt-4 pb-3 text-center">
                            <div className={cn('h-8 w-8 rounded-lg mx-auto mb-1.5 flex items-center justify-center transition-transform group-hover:scale-110', item.bg)}>
                                <item.icon className={cn('h-4 w-4', item.color)} />
                            </div>
                            <p className="text-lg font-black">{item.value}</p>
                            <p className="text-[9px] text-muted-foreground uppercase tracking-widest mt-0.5">{item.label}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Detail Tabs */}
            <Tabs defaultValue="overview" className="space-y-4">
                <TabsList className="grid grid-cols-3 sm:grid-cols-6 w-full sm:w-auto sm:inline-flex">
                    <TabsTrigger value="overview" className="gap-1.5 text-xs"><Building2 className="h-3.5 w-3.5" />Overview</TabsTrigger>
                    <TabsTrigger value="subscription" className="gap-1.5 text-xs"><CreditCard className="h-3.5 w-3.5" />Plan</TabsTrigger>
                    <TabsTrigger value="bills" className="gap-1.5 text-xs"><FileText className="h-3.5 w-3.5" />Bills</TabsTrigger>
                    <TabsTrigger value="inventory" className="gap-1.5 text-xs"><Package className="h-3.5 w-3.5" />Inventory</TabsTrigger>
                    <TabsTrigger value="users" className="gap-1.5 text-xs"><Users className="h-3.5 w-3.5" />Team</TabsTrigger>
                    <TabsTrigger value="activity" className="gap-1.5 text-xs"><Activity className="h-3.5 w-3.5" />Activity</TabsTrigger>
                </TabsList>

                {/* Overview Tab */}
                <TabsContent value="overview" className="animate-in fade-in space-y-4">
                    <BusinessInfoCard business={business} settings={business} />
                </TabsContent>

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
                                    <h4 className="text-xl font-black mt-1">
                                        {sub?.plan_name
                                            || (sub?.status === 'active' && sub?.current_period_end && new Date(sub.current_period_end).getFullYear() >= 2099 ? 'Lifetime'
                                            : (sub?.status === 'active' && sub?.current_period_end ? 'Active Plan' : 'None'))}
                                    </h4>
                                    <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-1">
                                        <Calendar className="h-3.5 w-3.5" />
                                        {sub?.status === 'trialing' && sub?.trial_end ? (
                                            `Trial ends: ${format(new Date(sub.trial_end), 'MMM dd, yyyy HH:mm')}`
                                        ) : sub?.status === 'active' && sub?.current_period_end && new Date(sub.current_period_end).getFullYear() >= 2099 ? (
                                            'Lifetime Subscription'
                                        ) : sub?.current_period_end ? (
                                            `Expires: ${format(new Date(sub.current_period_end), 'MMM dd, yyyy HH:mm')}`
                                        ) : 'No active subscription'}
                                    </p>
                                </div>
                                {sub && getStatusBadge(sub.status)}
                            </div>

                            {/* Plan buttons */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {plans.map((plan: any) => (
                                    <Button
                                        key={plan.id}
                                        variant={sub?.plan_id === plan.id ? 'secondary' : 'outline'}
                                        className={cn("h-auto py-3 px-4 justify-between", sub?.plan_id === plan.id ? 'border-primary bg-primary/5' : '')}
                                        disabled={manageSubMutation.isPending}
                                        onClick={() => manageSubMutation.mutate({
                                            planId: plan.id,
                                            status: 'active',
                                            periodEnd: computePeriodEnd(plan.billing_period),
                                        })}
                                    >
                                        <div className="text-left">
                                            <p className="font-bold text-xs">{plan.name}</p>
                                            <p className="text-[10px] opacity-70">
                                                {plan.price === 0 || plan.name.toLowerCase() === 'freemium' 
                                                    ? 'Free forever'
                                                    : `₹${plan.price} / ${plan.billing_period?.replace('_', ' ') || 'billed'}`}
                                            </p>
                                        </div>
                                        {sub?.plan_id === plan.id ? <Badge variant="default" className="text-[10px]">Current</Badge> : <ChevronRight className="h-4 w-4 shrink-0" />}
                                    </Button>
                                ))}
                                {/* Lifetime Subscription Button */}
                                <Button
                                    variant="outline"
                                    className="h-auto py-3 px-4 justify-between border-emerald-300 text-emerald-700"
                                    disabled={manageSubMutation.isPending || (sub && sub.status === 'active' && sub.current_period_end && new Date(sub.current_period_end).getFullYear() >= 2099)}
                                    onClick={() => {
                                        manageSubMutation.mutate({
                                            planId: undefined,
                                            status: 'active',
                                            periodEnd: '2099-12-31T23:59:59.000Z',
                                        });
                                    }}
                                >
                                    <div className="text-left">
                                        <p className="font-bold text-xs">Lifetime Subscription</p>
                                        <p className="text-[10px] opacity-70">Never expires</p>
                                    </div>
                                    <ChevronRight className="h-4 w-4 shrink-0" />
                                </Button>
                            </div>

                            {sub && (
                                <div className="pt-3 border-t border-dashed">
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        className="w-full"
                                        disabled={manageSubMutation.isPending}
                                        onClick={() => manageSubMutation.mutate({
                                            planId: undefined,
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
                    <BillsSection
                        bills={bills}
                        loadingBills={loadingBills}
                        billDateFilter={billDateFilter}
                        setBillDateFilter={setBillDateFilter}
                        customMonth={customMonth}
                        setCustomMonth={setCustomMonth}
                        businessName={business?.business_name}
                    />
                </TabsContent>

                {/* Inventory */}
                <TabsContent value="inventory" className="animate-in fade-in">
                    <InventorySection
                        products={products}
                        loadingProducts={loadingProducts}
                        inventorySearch={inventorySearch}
                        setInventorySearch={setInventorySearch}
                        businessName={business?.business_name}
                    />
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

                {/* Activity Tab */}
                <TabsContent value="activity" className="animate-in fade-in">
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center gap-2">
                                <Activity className="h-4 w-4 text-primary" />Business Activity
                            </CardTitle>
                            <CardDescription>Recent actions and events for this business</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {sub && (
                                    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                                        <div className="h-2 w-2 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                                        <div>
                                            <p className="text-sm font-semibold">Subscription: {sub.status === 'active' ? 'Active' : sub.status}</p>
                                            <p className="text-xs text-muted-foreground mt-0.5">Plan: {sub.plan_name || 'None'}</p>
                                            {sub.current_period_end && (
                                                <p className="text-[10px] text-muted-foreground">Expires: {format(new Date(sub.current_period_end), 'MMM dd, yyyy')}</p>
                                            )}
                                        </div>
                                    </div>
                                )}
                                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                                    <div className="h-2 w-2 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                                    <div>
                                        <p className="text-sm font-semibold">Business Registered</p>
                                        <p className="text-xs text-muted-foreground mt-0.5">{business?.created_at ? format(new Date(business.created_at), 'MMM dd, yyyy HH:mm') : '—'}</p>
                                    </div>
                                </div>
                                {bills.length > 0 && (
                                    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                                        <div className="h-2 w-2 rounded-full bg-violet-500 mt-1.5 shrink-0" />
                                        <div>
                                            <p className="text-sm font-semibold">Latest Bill: #{bills[0]?.bill_number}</p>
                                            <p className="text-xs text-muted-foreground mt-0.5">
                                                ₹{Number(bills[0]?.total_amount || 0).toLocaleString('en-IN')} · {bills[0]?.created_at ? format(new Date(bills[0].created_at), 'MMM dd, yyyy HH:mm') : ''}
                                            </p>
                                        </div>
                                    </div>
                                )}
                                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                                    <div className="h-2 w-2 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                                    <div>
                                        <p className="text-sm font-semibold">Team Size: {bizUsers.length} members</p>
                                        <p className="text-xs text-muted-foreground mt-0.5">
                                            {bizUsers.filter((u: any) => u.role === 'owner').length} owner, {bizUsers.filter((u: any) => u.role === 'manager').length} managers, {bizUsers.filter((u: any) => u.role === 'cashier').length} cashiers
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}

/* ── Bills Section with Date Filters & Download ── */
function BillsSection({ bills, loadingBills, billDateFilter, setBillDateFilter, customMonth, setCustomMonth, businessName }: {
    bills: any[];
    loadingBills: boolean;
    billDateFilter: string;
    setBillDateFilter: (v: string) => void;
    customMonth: string;
    setCustomMonth: (v: string) => void;
    businessName: string;
}) {
    const filteredBills = useMemo(() => {
        if (billDateFilter === 'all') return bills;

        const now = new Date();
        let start: Date, end: Date;

        switch (billDateFilter) {
            case 'today':
                start = startOfDay(now);
                end = endOfDay(now);
                break;
            case 'this-week':
                start = startOfWeek(now, { weekStartsOn: 1 });
                end = endOfWeek(now, { weekStartsOn: 1 });
                break;
            case 'this-month':
                start = startOfMonth(now);
                end = endOfMonth(now);
                break;
            case 'last-month':
                start = startOfMonth(subMonths(now, 1));
                end = endOfMonth(subMonths(now, 1));
                break;
            case 'custom':
                if (!customMonth) return bills;
                const [year, month] = customMonth.split('-').map(Number);
                start = new Date(year, month - 1, 1);
                end = endOfMonth(start);
                break;
            default:
                return bills;
        }

        return bills.filter(b => {
            const d = new Date(b.created_at);
            return isWithinInterval(d, { start, end });
        });
    }, [bills, billDateFilter, customMonth]);

    const totalRevenue = filteredBills.reduce((sum: number, b: any) => sum + Number(b.total_amount || 0), 0);
    const completedCount = filteredBills.filter((b: any) => b.status === 'completed').length;

    const handleDownloadBills = () => {
        if (filteredBills.length === 0) { toast.error('No bills to download'); return; }
        const rows = filteredBills.map((b: any) => ({
            'Bill #': b.bill_number,
            'Date': b.created_at ? format(new Date(b.created_at), 'yyyy-MM-dd HH:mm') : '',
            'Amount (₹)': Number(b.total_amount || 0),
            'Status': b.status,
            'Payment': b.payment_type || '',
            'Customer': b.customer_name || 'Walk-in',
        }));
        const ws = XLSX.utils.json_to_sheet(rows);
        ws['!cols'] = [{ wch: 18 }, { wch: 18 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 20 }];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Bills');
        const filterLabel = billDateFilter === 'all' ? 'all' : billDateFilter === 'custom' ? customMonth : billDateFilter;
        XLSX.writeFile(wb, `${businessName || 'business'}_bills_${filterLabel}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
        toast.success(`Downloaded ${filteredBills.length} bills`);
    };

    const dateButtons = [
        { value: 'all', label: 'All Time' },
        { value: 'today', label: 'Today' },
        { value: 'this-week', label: 'This Week' },
        { value: 'this-month', label: 'This Month' },
        { value: 'last-month', label: 'Last Month' },
        { value: 'custom', label: 'Select Month' },
    ];

    return (
        <Card>
            <CardHeader className="pb-3">
                <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-base flex items-center gap-2">
                            <FileText className="h-4 w-4 text-primary" />
                            Transaction History
                        </CardTitle>
                        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={handleDownloadBills}>
                            <Download className="h-3.5 w-3.5" />
                            Download Excel
                        </Button>
                    </div>

                    {/* Date Filter Buttons */}
                    <div className="flex flex-wrap gap-1.5">
                        {dateButtons.map(btn => (
                            <button
                                key={btn.value}
                                onClick={() => setBillDateFilter(btn.value)}
                                className={cn(
                                    'px-3 py-1.5 rounded-lg text-xs font-medium transition-all border',
                                    billDateFilter === btn.value
                                        ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                                        : 'bg-card text-muted-foreground border-border hover:bg-muted/50'
                                )}
                            >
                                {btn.label}
                            </button>
                        ))}
                    </div>

                    {/* Custom Month Picker */}
                    {billDateFilter === 'custom' && (
                        <Input
                            type="month"
                            value={customMonth}
                            onChange={(e) => setCustomMonth(e.target.value)}
                            className="w-full sm:w-48"
                        />
                    )}

                    {/* Summary Stats */}
                    <div className="flex items-center gap-4 text-xs">
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted/50">
                            <FileText className="h-3 w-3 text-muted-foreground" />
                            <span className="text-muted-foreground">Bills:</span>
                            <span className="font-bold">{filteredBills.length}</span>
                        </div>
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50">
                            <DollarSign className="h-3 w-3 text-emerald-600" />
                            <span className="text-emerald-600">Revenue:</span>
                            <span className="font-bold text-emerald-700">₹{totalRevenue.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50">
                            <span className="text-blue-600">Completed:</span>
                            <span className="font-bold text-blue-700">{completedCount}</span>
                        </div>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                {loadingBills ? (
                    <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin" /></div>
                ) : filteredBills.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                        <FileText className="h-10 w-10 opacity-10 mb-3" />
                        <p className="font-semibold text-foreground text-sm">No bills found</p>
                        <p className="text-xs mt-1">Try selecting a different date range.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/40">
                                    <TableHead>Bill #</TableHead>
                                    <TableHead>Date & Time</TableHead>
                                    <TableHead>Customer</TableHead>
                                    <TableHead>Amount</TableHead>
                                    <TableHead>Payment</TableHead>
                                    <TableHead>Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredBills.map((b: any) => (
                                    <TableRow key={b.id} className="hover:bg-muted/30">
                                        <TableCell className="font-bold text-sm">{b.bill_number}</TableCell>
                                        <TableCell className="text-xs text-muted-foreground">
                                            {format(new Date(b.created_at), 'MMM dd, yyyy')}<br/>
                                            <span className="text-[10px]">{format(new Date(b.created_at), 'hh:mm a')}</span>
                                        </TableCell>
                                        <TableCell className="text-xs">{b.customer_name || 'Walk-in'}</TableCell>
                                        <TableCell className="font-bold">₹{Number(b.total_amount).toLocaleString('en-IN')}</TableCell>
                                        <TableCell>
                                            {b.payment_type && (
                                                <Badge variant="outline" className="text-[10px] capitalize">{b.payment_type}</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                className={cn('text-[10px] capitalize',
                                                    b.status === 'completed' ? 'bg-green-100 text-green-700 hover:bg-green-100' :
                                                    b.status === 'draft' ? 'bg-amber-100 text-amber-700 hover:bg-amber-100' :
                                                    'bg-muted text-muted-foreground'
                                                )}
                                            >
                                                {b.status}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

/* ── Inventory Section with Search & Download ── */
function InventorySection({ products, loadingProducts, inventorySearch, setInventorySearch, businessName }: {
    products: any[];
    loadingProducts: boolean;
    inventorySearch: string;
    setInventorySearch: (v: string) => void;
    businessName: string;
}) {
    const filteredProducts = useMemo(() => {
        if (!inventorySearch) return products;
        return products.filter((p: any) =>
            p.name?.toLowerCase().includes(inventorySearch.toLowerCase())
        );
    }, [products, inventorySearch]);

    const totalValue = filteredProducts.reduce((sum: number, p: any) => sum + (Number(p.selling_price || 0) * Number(p.stock_quantity || 0)), 0);
    const lowStockCount = filteredProducts.filter((p: any) => p.stock_quantity <= (p.low_stock_threshold || 0)).length;

    const handleDownloadInventory = () => {
        if (filteredProducts.length === 0) { toast.error('No products to download'); return; }
        const rows = filteredProducts.map((p: any) => ({
            'Product Name': p.name,
            'Category': p.category || '',
            'Selling Price (₹)': Number(p.selling_price || 0),
            'Cost Price (₹)': Number(p.cost_price || 0),
            'MRP (₹)': Number(p.mrp_price || 0),
            'Stock': Number(p.stock_quantity || 0),
            'Low Stock Threshold': Number(p.low_stock_threshold || 0),
            'Stock Value (₹)': Number(p.selling_price || 0) * Number(p.stock_quantity || 0),
        }));
        const ws = XLSX.utils.json_to_sheet(rows);
        ws['!cols'] = [{ wch: 30 }, { wch: 15 }, { wch: 14 }, { wch: 14 }, { wch: 10 }, { wch: 8 }, { wch: 16 }, { wch: 14 }];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Inventory');
        XLSX.writeFile(wb, `${businessName || 'business'}_inventory_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
        toast.success(`Downloaded ${filteredProducts.length} products`);
    };

    return (
        <Card>
            <CardHeader className="pb-3">
                <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-base flex items-center gap-2">
                            <Package className="h-4 w-4 text-primary" />
                            Product Inventory
                        </CardTitle>
                        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={handleDownloadInventory}>
                            <Download className="h-3.5 w-3.5" />
                            Download Excel
                        </Button>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search products..."
                                className="pl-9"
                                value={inventorySearch}
                                onChange={(e) => setInventorySearch(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Summary Stats */}
                    <div className="flex items-center gap-4 text-xs">
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted/50">
                            <Package className="h-3 w-3 text-muted-foreground" />
                            <span className="text-muted-foreground">Products:</span>
                            <span className="font-bold">{filteredProducts.length}</span>
                        </div>
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50">
                            <DollarSign className="h-3 w-3 text-emerald-600" />
                            <span className="text-emerald-600">Stock Value:</span>
                            <span className="font-bold text-emerald-700">₹{totalValue.toLocaleString('en-IN')}</span>
                        </div>
                        {lowStockCount > 0 && (
                            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50">
                                <AlertCircle className="h-3 w-3 text-red-600" />
                                <span className="text-red-600">Low Stock:</span>
                                <span className="font-bold text-red-700">{lowStockCount}</span>
                            </div>
                        )}
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                {loadingProducts ? (
                    <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin" /></div>
                ) : filteredProducts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                        <Package className="h-10 w-10 opacity-10 mb-3" />
                        <p className="font-semibold text-foreground text-sm">No products found</p>
                        <p className="text-xs mt-1">{inventorySearch ? 'Try a different search.' : 'No products added yet.'}</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/40">
                                    <TableHead>Product</TableHead>
                                    <TableHead>Selling Price</TableHead>
                                    <TableHead>Cost Price</TableHead>
                                    <TableHead>Stock</TableHead>
                                    <TableHead>Stock Value</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredProducts.map((p: any) => {
                                    const isLow = p.stock_quantity <= (p.low_stock_threshold || 0);
                                    return (
                                        <TableRow key={p.id} className="hover:bg-muted/30">
                                            <TableCell>
                                                <p className="font-semibold text-sm">{p.name}</p>
                                                {p.category && <p className="text-[10px] text-muted-foreground">{p.category}</p>}
                                            </TableCell>
                                            <TableCell className="font-bold text-primary">₹{Number(p.selling_price).toLocaleString('en-IN')}</TableCell>
                                            <TableCell className="text-sm text-muted-foreground">₹{Number(p.cost_price).toLocaleString('en-IN')}</TableCell>
                                            <TableCell>
                                                <span className={cn('text-sm font-bold', isLow ? 'text-destructive' : 'text-foreground')}>
                                                    {p.stock_quantity}
                                                </span>
                                                {isLow && <Badge variant="destructive" className="ml-2 text-[9px]">LOW</Badge>}
                                            </TableCell>
                                            <TableCell className="font-medium text-sm">
                                                ₹{(Number(p.selling_price || 0) * Number(p.stock_quantity || 0)).toLocaleString('en-IN')}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
