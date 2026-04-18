import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Search, Building2, Globe, Eye, MapPin, Phone, Mail, Trash2, CreditCard, Filter } from 'lucide-react';
import { format, addMonths } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import BusinessProfile from './BusinessProfile';
import { useAuth } from '@/contexts/AuthContext';

interface Props {
    plans: any[];
}

export default function BusinessTab({ plans }: Props) {
    const [search, setSearch] = useState('');
    const [selectedBiz, setSelectedBiz] = useState<any>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [subscribingId, setSubscribingId] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState('all');
    const queryClient = useQueryClient();
    const { customAdminId } = useAuth();

    // Fetch ALL businesses from the main businesses table
    const { data: businesses = [], isLoading } = useQuery({
        queryKey: ['super-admin-all-businesses'],
        queryFn: async () => {
            const [{ data: bizData, error: bizErr }, { data: settingsData, error: setErr }] = await Promise.all([
                supabase.from('businesses').select('*').order('created_at', { ascending: false }),
                supabase.from('business_settings').select('*'),
            ]);
            if (bizErr) throw bizErr;

            // Merge settings into businesses
            const settingsMap: Record<string, any> = {};
            (settingsData || []).forEach((s: any) => { settingsMap[s.business_id] = s; });

            return (bizData || []).map((b: any) => {
                const s = settingsMap[b.id] || {};
                return {
                    ...b,
                    business_name: s.business_name || b.business_name,
                    address: s.address || '',
                    phone: s.phone || b.mobile_number || '',
                    email: s.email || '',
                    business_id: b.id,
                };
            });
        },
    });

    // Fetch all subscriptions for status badges
    const { data: subsMap = {} } = useQuery({
        queryKey: ['super-admin-subs-map'],
        queryFn: async () => {
            const { data } = await (supabase.rpc as any)('get_all_subscriptions');
            const subs = (data || []) as any[];
            const map: Record<string, any> = {};
            for (const s of subs) {
                map[s.business_id] = s;
            }
            return map;
        },
    });

    const filtered = businesses.filter(b => {
        const matchSearch =
            b.business_name?.toLowerCase().includes(search.toLowerCase()) ||
            b.email?.toLowerCase().includes(search.toLowerCase()) ||
            b.phone?.includes(search);
        const bizId = b.business_id || b.id;
        const sub = (subsMap as Record<string, any>)[bizId];
        const matchStatus =
            statusFilter === 'all' ||
            (statusFilter === 'active' && sub?.status === 'active') ||
            (statusFilter === 'trialing' && sub?.status === 'trialing') ||
            (statusFilter === 'expired' && sub?.status === 'expired') ||
            (statusFilter === 'no-plan' && !sub);
        return matchSearch && matchStatus;
    });

    const handleDelete = async (bizId: string, bizName: string) => {
        setDeletingId(bizId);
        try {
            const { error } = await (supabase.rpc as any)('delete_business_cascade', { p_business_id: bizId });
            if (error) throw error;
            await (supabase.rpc as any)('log_admin_action', {
                p_admin_id: customAdminId || 'unknown',
                p_action: 'delete_business',
                p_target_id: bizId,
                p_target_type: 'business',
                p_details: { business_name: bizName },
            });
            toast.success(`Deleted "${bizName}" and all associated data`);
            queryClient.invalidateQueries({ queryKey: ['super-admin-all-businesses'] });
            queryClient.invalidateQueries({ queryKey: ['super-admin-dashboard-stats'] });
        } catch (err: any) {
            toast.error(err.message || 'Failed to delete business');
        } finally {
            setDeletingId(null);
        }
    };

    const handleQuickSubscribe = async (bizId: string, bizName: string) => {
        if (!plans.length) { toast.error('No active plans available'); return; }
        setSubscribingId(bizId);
        try {
            const defaultPlan = plans[0]; // cheapest plan
            const periodEnd = addMonths(new Date(), 1).toISOString();
            const { error } = await (supabase.rpc as any)('manage_business_subscription', {
                p_business_id: bizId,
                p_plan_id: defaultPlan.id,
                p_status: 'active',
                p_period_end: periodEnd,
            });
            if (error) throw error;
            await (supabase.rpc as any)('log_admin_action', {
                p_admin_id: customAdminId || 'unknown',
                p_action: 'assign_subscription',
                p_target_id: bizId,
                p_target_type: 'business',
                p_details: { plan: defaultPlan.name, business_name: bizName },
            });
            toast.success(`Assigned "${defaultPlan.name}" plan to "${bizName}"`);
            queryClient.invalidateQueries({ queryKey: ['super-admin-subs-map'] });
            queryClient.invalidateQueries({ queryKey: ['super-admin-dashboard-stats'] });
        } catch (err: any) {
            toast.error(err.message || 'Failed to assign subscription');
        } finally {
            setSubscribingId(null);
        }
    };

    const getSubBadge = (bizId: string) => {
        const sub = (subsMap as Record<string, any>)[bizId];
        if (!sub) return <Badge variant="outline" className="text-[9px] bg-muted/50">No Plan</Badge>;
        if (sub.status === 'active') return <Badge className="text-[9px] bg-green-600 hover:bg-green-600">Active</Badge>;
        if (sub.status === 'trialing') return <Badge className="text-[9px] bg-amber-500 hover:bg-amber-500">Trial</Badge>;
        return <Badge variant="destructive" className="text-[9px]">Expired</Badge>;
    };

    if (selectedBiz) {
        return (
            <BusinessProfile
                businessId={selectedBiz.business_id || selectedBiz.id}
                business={selectedBiz}
                plans={plans}
                onBack={() => setSelectedBiz(null)}
            />
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder="Search by name, email, or phone..."
                        className="pl-9"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full sm:w-40">
                        <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="trialing">Trial</SelectItem>
                        <SelectItem value="expired">Expired</SelectItem>
                        <SelectItem value="no-plan">No Plan</SelectItem>
                    </SelectContent>
                </Select>
                <Badge variant="outline" className="self-center text-xs shrink-0">
                    {filtered.length} business{filtered.length !== 1 ? 'es' : ''}
                </Badge>
            </div>

            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-primary" />
                        All Businesses
                    </CardTitle>
                    <CardDescription>Registered businesses on the platform</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="p-6 space-y-3">
                            {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                            <Globe className="h-12 w-12 opacity-10 mb-4" />
                            <p className="font-semibold text-foreground">No Businesses Found</p>
                            <p className="text-sm mt-1">
                                {search ? 'Try a different search term.' : 'No businesses registered yet.'}
                            </p>
                        </div>
                    ) : (
                        <>
                            {/* Desktop Table */}
                            <div className="hidden sm:block overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-muted/40">
                                            <TableHead>Business</TableHead>
                                            <TableHead>Contact</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Registered</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filtered.map((biz) => {
                                            const bizId = biz.business_id || biz.id;
                                            return (
                                            <TableRow key={biz.id} className="hover:bg-muted/30">
                                                <TableCell>
                                                    <div>
                                                        <p className="font-semibold text-sm">{biz.business_name}</p>
                                                        {biz.address && (
                                                            <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                                                                <MapPin className="h-2.5 w-2.5" />{biz.address}
                                                            </p>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="space-y-0.5">
                                                        {biz.phone && <p className="text-xs flex items-center gap-1"><Phone className="h-3 w-3 text-muted-foreground" />{biz.phone}</p>}
                                                        {biz.email && <p className="text-xs flex items-center gap-1"><Mail className="h-3 w-3 text-muted-foreground" />{biz.email}</p>}
                                                    </div>
                                                </TableCell>
                                                <TableCell>{getSubBadge(bizId)}</TableCell>
                                                <TableCell className="text-xs text-muted-foreground">
                                                    {format(new Date(biz.created_at), 'MMM dd, yyyy')}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => setSelectedBiz(biz)}>
                                                            <Eye className="h-3 w-3" />View
                                                        </Button>
                                                        {!(subsMap as Record<string, any>)[bizId] && (
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                className="h-7 text-xs gap-1 text-green-600 border-green-200 hover:bg-green-50"
                                                                disabled={subscribingId === bizId}
                                                                onClick={() => handleQuickSubscribe(bizId, biz.business_name)}
                                                            >
                                                                <CreditCard className="h-3 w-3" />Subscribe
                                                            </Button>
                                                        )}
                                                        <AlertDialog>
                                                            <AlertDialogTrigger asChild>
                                                                <Button variant="outline" size="sm" className="h-7 text-xs gap-1 text-red-600 border-red-200 hover:bg-red-50">
                                                                    <Trash2 className="h-3 w-3" />
                                                                </Button>
                                                            </AlertDialogTrigger>
                                                            <AlertDialogContent>
                                                                <AlertDialogHeader>
                                                                    <AlertDialogTitle>Delete "{biz.business_name}"?</AlertDialogTitle>
                                                                    <AlertDialogDescription>
                                                                        This will permanently delete the business and ALL its data including bills, products, customers, and subscriptions. This action cannot be undone.
                                                                    </AlertDialogDescription>
                                                                </AlertDialogHeader>
                                                                <AlertDialogFooter>
                                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                    <AlertDialogAction
                                                                        className="bg-red-600 hover:bg-red-700"
                                                                        disabled={deletingId === bizId}
                                                                        onClick={() => handleDelete(bizId, biz.business_name)}
                                                                    >
                                                                        {deletingId === bizId ? 'Deleting...' : 'Delete Everything'}
                                                                    </AlertDialogAction>
                                                                </AlertDialogFooter>
                                                            </AlertDialogContent>
                                                        </AlertDialog>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>

                            {/* Mobile Card List */}
                            <div className="sm:hidden divide-y divide-border">
                                {filtered.map((biz) => {
                                    const bizId = biz.business_id || biz.id;
                                    return (
                                    <div key={biz.id} className="px-4 py-3">
                                        <button
                                            onClick={() => setSelectedBiz(biz)}
                                            className="w-full text-left"
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <p className="font-semibold text-sm truncate">{biz.business_name}</p>
                                                        {getSubBadge(bizId)}
                                                    </div>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        {biz.phone && <span className="text-[10px] text-muted-foreground">{biz.phone}</span>}
                                                    </div>
                                                    <p className="text-[10px] text-muted-foreground mt-0.5">
                                                        {format(new Date(biz.created_at), 'MMM dd, yyyy')}
                                                    </p>
                                                </div>
                                                <Eye className="h-4 w-4 text-muted-foreground shrink-0 ml-2" />
                                            </div>
                                        </button>
                                        <div className="flex gap-2 mt-2">
                                            {!(subsMap as Record<string, any>)[bizId] && (
                                                <Button variant="outline" size="sm" className="h-7 text-xs gap-1 text-green-600" disabled={subscribingId === bizId} onClick={() => handleQuickSubscribe(bizId, biz.business_name)}>
                                                    <CreditCard className="h-3 w-3" />Subscribe
                                                </Button>
                                            )}
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="outline" size="sm" className="h-7 text-xs gap-1 text-red-600">
                                                        <Trash2 className="h-3 w-3" />Delete
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Delete "{biz.business_name}"?</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            This will permanently delete the business and ALL its data. This cannot be undone.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                        <AlertDialogAction className="bg-red-600 hover:bg-red-700" disabled={deletingId === bizId} onClick={() => handleDelete(bizId, biz.business_name)}>
                                                            {deletingId === bizId ? 'Deleting...' : 'Delete Everything'}
                                                        </AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </div>
                                    </div>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
