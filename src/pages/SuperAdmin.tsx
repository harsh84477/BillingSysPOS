import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Building2,
    Users,
    CreditCard,
    ShieldCheck,
    Activity,
    Search,
    ExternalLink,
    Package,
    FileText,
    Calendar,
    AlertCircle,
    TrendingUp,
    DollarSign,
    Loader2,
    ChevronRight,
    UserCheck,
    Globe
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function SuperAdmin() {
    const { isSuperAdmin } = useAuth();
    const queryClient = useQueryClient();
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null);

    // 1. Fetch Platform Stats
    const { data: stats, isLoading: loadingStats } = useQuery({
        queryKey: ['platform-stats'],
        queryFn: async () => {
            const { data, error } = await (supabase.rpc as any)('get_platform_stats');
            if (error) throw error;
            return data;
        },
    });

    // 2. Fetch Businesses
    const { data: businesses = [], isLoading: loadingBiz } = useQuery({
        queryKey: ['super-admin-businesses'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('businesses')
                .select(`
          *,
          subscriptions (
            id,
            status,
            trial_end,
            current_period_end,
            plan:subscription_plans (id, name, price)
          )
        `);
            if (error) throw error;
            return data;
        },
    });

    // 3. Fetch selected business data
    const { data: bizBills = [], isLoading: loadingBills } = useQuery({
        queryKey: ['business-bills', selectedBusinessId],
        queryFn: async () => {
            if (!selectedBusinessId) return [];
            const { data, error } = await (supabase.rpc as any)('get_business_bills', { p_business_id: selectedBusinessId });
            if (error) throw error;
            return data;
        },
        enabled: !!selectedBusinessId,
    });

    const { data: bizProducts = [], isLoading: loadingProducts } = useQuery({
        queryKey: ['business-products', selectedBusinessId],
        queryFn: async () => {
            if (!selectedBusinessId) return [];
            const { data, error } = await (supabase.rpc as any)('get_business_products', { p_business_id: selectedBusinessId });
            if (error) throw error;
            return data;
        },
        enabled: !!selectedBusinessId,
    });

    // Fetch all plans for management
    const { data: plans = [] } = useQuery({
        queryKey: ['subscription-plans'],
        queryFn: async () => {
            const { data, error } = await supabase.from('subscription_plans').select('*');
            if (error) throw error;
            return data;
        },
    });

    // Manage Subscription Mutation
    const manageSubMutation = useMutation({
        mutationFn: async (vars: { bizId: string, planId: string, status: string, periodEnd: string }) => {
            const { error } = await (supabase.rpc as any)('manage_business_subscription', {
                p_business_id: vars.bizId,
                p_plan_id: vars.planId,
                p_status: vars.status,
                p_period_end: vars.periodEnd
            });
            if (error) throw error;
        },
        onSuccess: () => {
            toast.success('Subscription updated');
            queryClient.invalidateQueries({ queryKey: ['super-admin-businesses'] });
        },
        onError: (err: any) => toast.error(err.message),
    });

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'active': return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Active</Badge>;
            case 'trialing': return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">Trial</Badge>;
            case 'expired': return <Badge variant="destructive">Expired</Badge>;
            default: return <Badge variant="secondary">{status}</Badge>;
        }
    };

    const filteredBiz = businesses.filter(b =>
        b.business_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.mobile_number.includes(searchQuery)
    );

    const selectedBiz = businesses.find(b => b.id === selectedBusinessId);

    return (
        <div className="space-y-8 pb-10">
            {/* 1. Header & Stats Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-gradient-to-br from-primary/10 to-transparent border-primary/20">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Total Revenue</CardTitle>
                        <DollarSign className="h-5 w-5 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-extrabold tracking-tight">
                            {loadingStats ? <Loader2 className="h-6 w-6 animate-spin" /> : `₹${stats?.total_revenue?.toLocaleString() || '0'}`}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 font-medium italic">Combined platform earnings</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Businesses</CardTitle>
                        <Building2 className="h-5 w-5 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-extrabold tracking-tight">
                            {loadingStats ? <Loader2 className="h-6 w-6 animate-spin" /> : stats?.total_businesses || 0}
                        </div>
                        <p className="text-xs text-primary font-bold mt-1 flex items-center gap-1">
                            <TrendingUp className="h-3 w-3" />
                            Growth monitored
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Active Subs</CardTitle>
                        <UserCheck className="h-5 w-5 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-extrabold tracking-tight">
                            {loadingStats ? <Loader2 className="h-6 w-6 animate-spin" /> : stats?.active_subscriptions || 0}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Paid platform users</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Total Users</CardTitle>
                        <Users className="h-5 w-5 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-extrabold tracking-tight">
                            {loadingStats ? <Loader2 className="h-6 w-6 animate-spin" /> : stats?.total_users || 0}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Cross-business accounts</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* 2. Business Sidebar List */}
                <div className="lg:col-span-4 space-y-4">
                    <Card className="h-[calc(100vh-280px)] overflow-hidden flex flex-col">
                        <CardHeader className="pb-4">
                            <CardTitle className="text-lg">Businesses</CardTitle>
                            <div className="relative mt-2">
                                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    placeholder="Search stores..."
                                    className="pl-9 h-9"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                        </CardHeader>
                        <ScrollArea className="flex-1 overflow-y-auto">
                            <div className="px-4 pb-4 space-y-2">
                                {filteredBiz.map((biz) => {
                                    const sub = biz.subscriptions?.[0];
                                    return (
                                        <div
                                            key={biz.id}
                                            onClick={() => setSelectedBusinessId(biz.id)}
                                            className={cn(
                                                "group p-3 rounded-lg border transition-all cursor-pointer hover:border-primary/50",
                                                selectedBusinessId === biz.id
                                                    ? "bg-primary/5 border-primary ring-1 ring-primary/20"
                                                    : "border-transparent bg-muted/30"
                                            )}
                                        >
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="font-bold text-sm truncate max-w-[150px]">{biz.business_name}</span>
                                                {sub ? getStatusBadge(sub.status) : <Badge variant="outline" className="text-[10px]">No Sub</Badge>}
                                            </div>
                                            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                                                <span>{biz.mobile_number}</span>
                                                <span className="font-mono">{biz.join_code}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </ScrollArea>
                    </Card>
                </div>

                {/* 3. Detail View */}
                <div className="lg:col-span-8 space-y-6">
                    {!selectedBusinessId ? (
                        <Card className="h-[calc(100vh-280px)] flex flex-col items-center justify-center border-dashed text-muted-foreground space-y-4 bg-muted/10">
                            <Globe className="h-12 w-12 opacity-20" />
                            <div className="text-center">
                                <h3 className="font-bold text-lg text-foreground">No Business Selected</h3>
                                <p className="text-sm">Select a store from the sidebar to view full data.</p>
                            </div>
                        </Card>
                    ) : (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div>
                                    <h2 className="text-2xl font-black tracking-tight">{selectedBiz?.business_name}</h2>
                                    <p className="text-muted-foreground text-sm flex items-center gap-2 mt-1">
                                        <Building2 className="h-4 w-4" />
                                        {selectedBiz?.business_address || 'No address provided'}
                                    </p>
                                </div>
                                <div className="bg-muted px-4 py-2 rounded-lg border flex gap-6 items-center">
                                    <div className="text-center">
                                        <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Bills</p>
                                        <p className="font-bold">{bizBills.length}</p>
                                    </div>
                                    <div className="h-8 w-px bg-border" />
                                    <div className="text-center">
                                        <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Inventory</p>
                                        <p className="font-bold">{bizProducts.length}</p>
                                    </div>
                                </div>
                            </div>

                            <Tabs defaultValue="bills" className="space-y-4">
                                <TabsList className="grid grid-cols-3 w-full sm:w-[400px]">
                                    <TabsTrigger value="bills" className="gap-2">
                                        <FileText className="h-4 w-4" />
                                        History
                                    </TabsTrigger>
                                    <TabsTrigger value="products" className="gap-2">
                                        <Package className="h-4 w-4" />
                                        Stock
                                    </TabsTrigger>
                                    <TabsTrigger value="subscription" className="gap-2">
                                        <CreditCard className="h-4 w-4" />
                                        Billing
                                    </TabsTrigger>
                                </TabsList>

                                {/* Bills View */}
                                <TabsContent value="bills" className="animate-in fade-in duration-300">
                                    <Card>
                                        <CardHeader className="pb-0">
                                            <CardTitle className="text-base">Recent Transactions</CardTitle>
                                            <CardDescription>Bypassing RLS: Viewing all business bills.</CardDescription>
                                        </CardHeader>
                                        <CardContent className="pt-4">
                                            {loadingBills ? (
                                                <div className="flex justify-center p-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
                                            ) : (
                                                <div className="rounded-md border">
                                                    <Table>
                                                        <TableHeader>
                                                            <TableRow>
                                                                <TableHead>Bill #</TableHead>
                                                                <TableHead>Date</TableHead>
                                                                <TableHead>Amount</TableHead>
                                                                <TableHead>Status</TableHead>
                                                            </TableRow>
                                                        </TableHeader>
                                                        <TableBody>
                                                            {bizBills.slice(0, 10).map((bill: any) => (
                                                                <TableRow key={bill.id}>
                                                                    <TableCell className="font-bold">{bill.bill_number}</TableCell>
                                                                    <TableCell className="text-xs">{format(new Date(bill.created_at), 'MMM dd, HH:mm')}</TableCell>
                                                                    <TableCell className="font-bold">₹{bill.total_amount}</TableCell>
                                                                    <TableCell>
                                                                        <Badge variant={bill.status === 'completed' ? 'secondary' : 'outline'} className="text-[10px] capitalize">
                                                                            {bill.status}
                                                                        </Badge>
                                                                    </TableCell>
                                                                </TableRow>
                                                            ))}
                                                            {bizBills.length === 0 && (
                                                                <TableRow><TableCell colSpan={4} className="text-center py-6 text-muted-foreground">No bills found.</TableCell></TableRow>
                                                            )}
                                                        </TableBody>
                                                    </Table>
                                                </div>
                                            )}
                                        </CardContent>
                                        {bizBills.length > 10 && (
                                            <CardFooter className="pt-0 justify-center">
                                                <p className="text-xs text-muted-foreground">Showing 10 of {bizBills.length} total bills</p>
                                            </CardFooter>
                                        )}
                                    </Card>
                                </TabsContent>

                                {/* Stock View */}
                                <TabsContent value="products" className="animate-in fade-in duration-300">
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="text-base">Inventory Overview</CardTitle>
                                            <CardDescription>Product catalog for this business.</CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            {loadingProducts ? (
                                                <div className="flex justify-center p-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
                                            ) : (
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                    {bizProducts.map((p: any) => (
                                                        <div key={p.id} className="p-3 border rounded-lg bg-muted/20 flex justify-between items-center">
                                                            <div>
                                                                <p className="font-bold text-sm">{p.name}</p>
                                                                <p className="text-[10px] text-muted-foreground">ID: {p.id.slice(0, 8)}...</p>
                                                            </div>
                                                            <div className="text-right">
                                                                <p className="font-black text-primary">₹{p.price}</p>
                                                                <p className={cn("text-[11px] font-bold", p.stock_quantity <= p.low_stock_threshold ? "text-destructive" : "text-muted-foreground")}>
                                                                    Stock: {p.stock_quantity}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                    {bizProducts.length === 0 && (
                                                        <div className="col-span-2 text-center py-10 text-muted-foreground">No products listed.</div>
                                                    )}
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                </TabsContent>

                                {/* Subscription Management */}
                                <TabsContent value="subscription" className="animate-in fade-in duration-300">
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="text-base">Subscription Controller</CardTitle>
                                            <CardDescription>Manual override for business accessibility.</CardDescription>
                                        </CardHeader>
                                        <CardContent className="space-y-6">
                                            <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                                <div>
                                                    <p className="text-xs font-bold text-primary uppercase tracking-widest mb-1">Current Plan</p>
                                                    <h4 className="text-xl font-black">{selectedBiz?.subscriptions?.[0]?.plan?.name || 'Manual Admin Push'}</h4>
                                                    <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-1">
                                                        <Calendar className="h-3.5 w-3.5" />
                                                        Expires: {selectedBiz?.subscriptions?.[0]?.current_period_end ? format(new Date(selectedBiz.subscriptions[0].current_period_end), 'MMM dd, yyyy') : 'Infinity'}
                                                    </p>
                                                </div>
                                                {selectedBiz?.subscriptions?.[0] && getStatusBadge(selectedBiz.subscriptions[0].status)}
                                            </div>

                                            <div className="space-y-4">
                                                <h5 className="text-sm font-bold flex items-center gap-2">
                                                    <ShieldCheck className="h-4 w-4 text-primary" />
                                                    Manual Plan Upgrade/Switch
                                                </h5>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                    {plans.map((plan: any) => (
                                                        <Button
                                                            key={plan.id}
                                                            variant={selectedBiz?.subscriptions?.[0]?.plan?.id === plan.id ? "secondary" : "outline"}
                                                            className="h-auto py-3 px-4 justify-between"
                                                            disabled={manageSubMutation.isPending}
                                                            onClick={() => {
                                                                const nextMonth = new Date();
                                                                nextMonth.setMonth(nextMonth.getMonth() + 1);
                                                                manageSubMutation.mutate({
                                                                    bizId: selectedBusinessId,
                                                                    planId: plan.id,
                                                                    status: 'active',
                                                                    periodEnd: nextMonth.toISOString()
                                                                });
                                                            }}
                                                        >
                                                            <div className="text-left">
                                                                <p className="font-bold text-xs">{plan.name}</p>
                                                                <p className="text-[10px] opacity-70">₹{plan.price} / {plan.billing_period}</p>
                                                            </div>
                                                            <ChevronRight className="h-4 w-4" />
                                                        </Button>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="pt-4 border-t border-dashed">
                                                <Button
                                                    variant="destructive"
                                                    className="w-full"
                                                    size="sm"
                                                    disabled={manageSubMutation.isPending || !selectedBiz?.subscriptions?.[0]}
                                                    onClick={() => {
                                                        manageSubMutation.mutate({
                                                            bizId: selectedBusinessId,
                                                            planId: selectedBiz?.subscriptions?.[0]?.plan?.id,
                                                            status: 'expired',
                                                            periodEnd: new Date().toISOString()
                                                        });
                                                    }}
                                                >
                                                    <AlertCircle className="h-4 w-4 mr-2" />
                                                    Mark as Expired (Force Stop)
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </TabsContent>
                            </Tabs>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
