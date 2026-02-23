import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Globe, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import BusinessProfile from './BusinessProfile';

interface Props {
    plans: any[];
}

export default function BusinessTab({ plans }: Props) {
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null);

    const { data: businesses = [], isLoading } = useQuery({
        queryKey: ['super-admin-businesses'],
        queryFn: async () => {
            const { data, error } = await (supabase.rpc as any)('get_all_businesses_admin');
            if (error) throw error;

            // Map flat RPC rows → nested shape that BusinessProfile expects
            return (data as any[]).map((row) => ({
                id: row.id,
                business_name: row.business_name,
                mobile_number: row.mobile_number,
                join_code: row.join_code,
                created_at: row.created_at,
                business_settings: [{ address: row.address }],
                subscriptions: row.sub_id
                    ? [{
                        id: row.sub_id,
                        status: row.sub_status,
                        trial_end: row.sub_trial_end,
                        current_period_end: row.sub_period_end,
                        plan: row.plan_id
                            ? { id: row.plan_id, name: row.plan_name, price: row.plan_price }
                            : null,
                    }]
                    : [],
            }));
        },
    });

    const getSubStatus = (biz: any) => {
        const sub = biz.subscriptions?.[0];
        if (!sub) return 'none';
        const now = new Date();
        if (sub.status === 'active' && sub.current_period_end && new Date(sub.current_period_end) < now) return 'expired';
        if (sub.status === 'trialing' && sub.trial_end && new Date(sub.trial_end) < now) return 'expired';
        return sub.status;
    };

    const filtered = businesses.filter((b: any) => {
        const matchSearch =
            b.business_name?.toLowerCase().includes(search.toLowerCase()) ||
            b.mobile_number?.includes(search) ||
            b.join_code?.toLowerCase().includes(search.toLowerCase());
        const status = getSubStatus(b);
        const matchStatus = statusFilter === 'all' || status === statusFilter;
        return matchSearch && matchStatus;
    });

    const getStatusBadge = (biz: any) => {
        const status = getSubStatus(biz);
        switch (status) {
            case 'active': return <Badge className="bg-green-100 text-green-700 hover:bg-green-100 text-[10px]">Active</Badge>;
            case 'trialing': return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 text-[10px]">Trial</Badge>;
            case 'expired': return <Badge className="bg-red-100 text-red-700 hover:bg-red-100 text-[10px]">Expired</Badge>;
            default: return <Badge variant="outline" className="text-[10px]">No Sub</Badge>;
        }
    };

    const selectedBiz = businesses.find((b: any) => b.id === selectedBusinessId);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[600px]">
            {/* Business List Sidebar */}
            <div className="lg:col-span-4">
                <Card className="flex flex-col" style={{ height: 'calc(100vh - 280px)', minHeight: '500px' }}>
                    <CardHeader className="pb-3 shrink-0">
                        <CardTitle className="text-base flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-primary" />
                            All Businesses
                            <Badge variant="outline" className="text-xs ml-auto">{filtered.length}</Badge>
                        </CardTitle>
                        <div className="relative mt-2">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                placeholder="Name, phone, join code..."
                                className="pl-9 h-9"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="h-8 text-xs mt-1">
                                <SelectValue placeholder="All Statuses" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Statuses</SelectItem>
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="trialing">Trialing</SelectItem>
                                <SelectItem value="expired">Expired</SelectItem>
                                <SelectItem value="none">No Subscription</SelectItem>
                            </SelectContent>
                        </Select>
                    </CardHeader>
                    <ScrollArea className="flex-1 overflow-y-auto">
                        <div className="px-4 pb-4 space-y-2">
                            {isLoading ? (
                                <div className="text-center py-8 text-sm text-muted-foreground">Loading businesses...</div>
                            ) : (
                                filtered.map((biz: any) => (
                                    <button
                                        key={biz.id}
                                        onClick={() => setSelectedBusinessId(biz.id)}
                                        className={cn(
                                            'w-full text-left p-3 rounded-lg border transition-all hover:border-primary/50',
                                            selectedBusinessId === biz.id
                                                ? 'bg-primary/5 border-primary ring-1 ring-primary/20'
                                                : 'border-transparent bg-muted/30 hover:bg-muted/50'
                                        )}
                                    >
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="font-bold text-sm truncate max-w-[150px]">{biz.business_name}</span>
                                            {getStatusBadge(biz)}
                                        </div>
                                        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                                            <span>{biz.mobile_number}</span>
                                            <span className="font-mono">{biz.join_code}</span>
                                        </div>
                                        {biz.subscriptions?.[0]?.plan && (
                                            <p className="text-[10px] text-primary font-medium mt-1">{biz.subscriptions[0].plan.name}</p>
                                        )}
                                    </button>
                                ))
                            )}
                            {!isLoading && filtered.length === 0 && (
                                <div className="text-center py-12 text-muted-foreground">
                                    <Building2 className="h-8 w-8 mx-auto opacity-20 mb-2" />
                                    <p className="text-sm">No businesses found</p>
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                </Card>
            </div>

            {/* Detail Panel */}
            <div className="lg:col-span-8">
                {!selectedBusinessId ? (
                    <Card className="flex flex-col items-center justify-center border-dashed text-muted-foreground bg-muted/10"
                        style={{ height: 'calc(100vh - 280px)', minHeight: '500px' }}>
                        <Globe className="h-14 w-14 opacity-10 mb-4" />
                        <h3 className="font-bold text-lg text-foreground">Select a Business</h3>
                        <p className="text-sm mt-1">Click a business on the left to view its full profile.</p>
                    </Card>
                ) : selectedBiz ? (
                    <BusinessProfile
                        businessId={selectedBusinessId}
                        business={selectedBiz}
                        plans={plans}
                        onBack={() => setSelectedBusinessId(null)}
                    />
                ) : null}
            </div>
        </div>
    );
}
