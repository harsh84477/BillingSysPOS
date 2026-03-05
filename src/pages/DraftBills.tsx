import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Eye, ShoppingCart, User, Clock, Search } from 'lucide-react';
import { format } from 'date-fns';
import { Input } from '@/components/ui/input';
import DraftBillModal from '@/components/bills/DraftBillModal';

export default function DraftBills() {
    const { businessId, user, userRole } = useAuth();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedBillId, setSelectedBillId] = useState<string | null>(null);

    const { data: draftBills = [], isLoading } = useQuery({
        queryKey: ['draftBills', businessId, user?.id, userRole],
        queryFn: async () => {
            let query = supabase
                .from('bills')
                .select('*, customers(name, phone, address)')
                .eq('business_id', businessId)
                .eq('status', 'draft')
                .order('created_at', { ascending: false });

            if (userRole === 'salesman') {
                query = query.eq('created_by', user?.id);
            }

            const { data, error } = await query;
            if (error) throw error;
            return data;
        },
        enabled: !!businessId,
    });

    const filteredBills = draftBills.filter(bill =>
        bill.bill_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (bill.customers?.name || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Draft Bills</h1>
                    <p className="text-muted-foreground">Manage and finalize your pending orders.</p>
                </div>
            </div>

            {/* Filters Section */}
            <div className="flex flex-col sm:flex-row gap-4 sm:items-center justify-between">
                <div className="relative w-full sm:max-w-sm">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search draft number or customer..."
                        className="pl-8"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <Card>
                <CardHeader className="pb-3">
                    <div className="flex flex-col gap-1">
                        <CardTitle>Draft Orders</CardTitle>
                        <CardDescription>
                            You have {draftBills.length} pending draft bills.
                        </CardDescription>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Bill No.</TableHead>
                                    <TableHead>Customer</TableHead>
                                    <TableHead>Amount</TableHead>
                                    <TableHead className="hidden md:table-cell">Created At</TableHead>
                                    <TableHead className="hidden sm:table-cell">Salesman</TableHead>
                                    <TableHead className="text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-24 text-center">
                                            Loading draft bills...
                                        </TableCell>
                                    </TableRow>
                                ) : filteredBills.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                                            No draft bills found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredBills.map((bill) => (
                                        <TableRow key={bill.id}>
                                            <TableCell className="font-medium text-xs sm:text-sm">
                                                <div className="flex items-center gap-2">
                                                    <ShoppingCart className="h-4 w-4 text-amber-500 hidden sm:block" />
                                                    {bill.bill_number}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-xs sm:text-sm truncate max-w-[80px] sm:max-w-none">
                                                <div className="flex flex-col">
                                                    <span className="font-medium">{bill.customers?.name || 'Walk-in'}</span>
                                                    <span className="text-[10px] text-muted-foreground">{bill.customers?.phone || ''}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="font-semibold text-primary text-xs sm:text-sm">
                                                ₹{bill.total_amount.toFixed(2)}
                                            </TableCell>
                                            <TableCell className="hidden md:table-cell text-muted-foreground text-xs sm:text-sm">
                                                <div className="flex items-center gap-1">
                                                    <Clock className="h-3 w-3" />
                                                    {format(new Date(bill.created_at), 'dd MMM, hh:mm a')}
                                                </div>
                                            </TableCell>
                                            <TableCell className="hidden sm:table-cell text-xs sm:text-sm">
                                                <Badge variant="outline" className="font-normal text-[10px] bg-primary/5">
                                                    <User className="mr-1 h-3 w-3" />
                                                    {(bill as any).salesman_name || 'System'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setSelectedBillId(bill.id)}
                                                >
                                                    <Eye className="h-4 w-4 sm:mr-1" />
                                                    <span className="hidden sm:inline">Open</span>
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            {selectedBillId && (
                <DraftBillModal
                    billId={selectedBillId}
                    open={!!selectedBillId}
                    onClose={() => setSelectedBillId(null)}
                />
            )
            }
        </div >
    );
}
