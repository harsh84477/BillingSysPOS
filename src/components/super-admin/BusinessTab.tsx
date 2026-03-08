import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Building2, Globe, Eye, MapPin, Phone, Mail } from 'lucide-react';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import BusinessProfile from './BusinessProfile';

interface Props {
    plans: any[];
}

export default function BusinessTab({ plans }: Props) {
    const [search, setSearch] = useState('');
    const [selectedBiz, setSelectedBiz] = useState<any>(null);

    const { data: businesses = [], isLoading } = useQuery({
        queryKey: ['super-admin-all-businesses'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('business_settings')
                .select('*')
                .order('created_at', { ascending: false });
            if (error) throw error;
            return data || [];
        },
    });

    const filtered = businesses.filter(b =>
        b.business_name?.toLowerCase().includes(search.toLowerCase()) ||
        b.email?.toLowerCase().includes(search.toLowerCase()) ||
        b.phone?.includes(search)
    );

    if (selectedBiz) {
        return (
            <BusinessProfile
                businessId={selectedBiz.id}
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
                                            <TableHead>Currency</TableHead>
                                            <TableHead>Registered</TableHead>
                                            <TableHead className="text-right">Action</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filtered.map((biz) => (
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
                                                <TableCell>
                                                    <Badge variant="outline" className="text-[10px]">
                                                        {biz.currency_symbol} {biz.currency}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-xs text-muted-foreground">
                                                    {format(new Date(biz.created_at), 'MMM dd, yyyy')}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="h-7 text-xs gap-1"
                                                        onClick={() => setSelectedBiz(biz)}
                                                    >
                                                        <Eye className="h-3 w-3" />View
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>

                            {/* Mobile Card List */}
                            <div className="sm:hidden divide-y divide-border">
                                {filtered.map((biz) => (
                                    <button
                                        key={biz.id}
                                        onClick={() => setSelectedBiz(biz)}
                                        className="w-full text-left px-4 py-3 hover:bg-muted/30 transition-colors"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="min-w-0 flex-1">
                                                <p className="font-semibold text-sm truncate">{biz.business_name}</p>
                                                <div className="flex items-center gap-2 mt-1">
                                                    {biz.phone && <span className="text-[10px] text-muted-foreground">{biz.phone}</span>}
                                                    <Badge variant="outline" className="text-[9px] h-4">{biz.currency_symbol}</Badge>
                                                </div>
                                                <p className="text-[10px] text-muted-foreground mt-0.5">
                                                    {format(new Date(biz.created_at), 'MMM dd, yyyy')}
                                                </p>
                                            </div>
                                            <Eye className="h-4 w-4 text-muted-foreground shrink-0 ml-2" />
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
