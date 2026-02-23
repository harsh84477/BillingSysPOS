// @ts-nocheck
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
    AlertCircle, CreditCard, Eye, Search, IndianRupee, Calendar,
    CheckCircle2, Clock, AlertTriangle,
} from 'lucide-react';
import { format, isPast, parseISO } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function DueBills() {
    const { businessId } = useAuth();
    const queryClient = useQueryClient();
    const [search, setSearch] = useState('');
    const [payDialog, setPayDialog] = useState<{ bill: any; amount: string } | null>(null);

    // Fetch unpaid/partial bills
    const { data: dueBills = [], isLoading } = useQuery({
        queryKey: ['due-bills', businessId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('bills')
                .select('*, customers(name)')
                .eq('business_id', businessId)
                .in('payment_status', ['unpaid', 'partial'])
                .eq('status', 'completed')
                .order('due_date', { ascending: true, nullsFirst: false });
            if (error) throw error;
            return data || [];
        },
        enabled: !!businessId,
    });

    // Pay mutation
    const payMutation = useMutation({
        mutationFn: async ({ bill, amount }: { bill: any; amount: number }) => {
            const newPaid = (bill.paid_amount || 0) + amount;
            const newDue = Math.max(0, bill.total_amount - newPaid);
            const newStatus = newDue <= 0 ? 'paid' : newPaid > 0 ? 'partial' : 'unpaid';

            const { error } = await supabase
                .from('bills')
                .update({
                    paid_amount: newPaid,
                    due_amount: newDue,
                    payment_status: newStatus,
                })
                .eq('id', bill.id);
            if (error) throw error;

            // Update customer current_due
            if (bill.customer_id) {
                await supabase.rpc('update_customer_due', {
                    _customer_id: bill.customer_id,
                    _delta: -amount,
                }).catch(() => { }); // non-critical
            }
        },
        onSuccess: () => {
            toast.success('Payment recorded!');
            queryClient.invalidateQueries({ queryKey: ['due-bills', businessId] });
            queryClient.invalidateQueries({ queryKey: ['dashboard-stats', businessId] });
            setPayDialog(null);
        },
        onError: (e: any) => toast.error(e.message),
    });

    const handlePay = () => {
        if (!payDialog) return;
        const amount = parseFloat(payDialog.amount);
        if (isNaN(amount) || amount <= 0) {
            toast.error('Enter a valid payment amount');
            return;
        }
        payMutation.mutate({ bill: payDialog.bill, amount });
    };

    const filtered = dueBills.filter((b: any) =>
        (b.bill_number?.toLowerCase() || '').includes(search.toLowerCase()) ||
        (b.customers?.name?.toLowerCase() || '').includes(search.toLowerCase())
    );

    const currencySymbol = '₹';

    const getStatusBadge = (bill: any) => {
        const overdue = bill.due_date && isPast(parseISO(bill.due_date));
        if (overdue && bill.payment_status !== 'paid') {
            return <Badge className="bg-red-100 text-red-700 border-red-200">⚠ Overdue</Badge>;
        }
        if (bill.payment_status === 'partial') {
            return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">Partial</Badge>;
        }
        return <Badge className="bg-orange-100 text-orange-700 border-orange-200">Unpaid</Badge>;
    };

    const totalDue = dueBills.reduce((s: number, b: any) => s + (b.due_amount || 0), 0);
    const overdueCount = dueBills.filter((b: any) => b.due_date && isPast(parseISO(b.due_date))).length;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
                    <AlertCircle className="h-6 w-6 text-destructive" />
                    Due Bills
                </h1>
                <p className="text-muted-foreground text-sm mt-0.5">Manage unpaid & partially paid bills</p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <Card>
                    <CardHeader className="pb-1">
                        <CardTitle className="text-xs text-muted-foreground uppercase tracking-wide">Total Due</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-black text-destructive">{currencySymbol}{totalDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-1">
                        <CardTitle className="text-xs text-muted-foreground uppercase tracking-wide">Unpaid Bills</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-black">{dueBills.length}</p>
                    </CardContent>
                </Card>
                <Card className={cn(overdueCount > 0 && 'border-red-400 bg-red-50 dark:bg-red-950/20')}>
                    <CardHeader className="pb-1">
                        <CardTitle className="text-xs text-muted-foreground uppercase tracking-wide">Overdue</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className={cn('text-2xl font-black', overdueCount > 0 ? 'text-red-600' : '')}>{overdueCount}</p>
                    </CardContent>
                </Card>
            </div>

            {/* Search */}
            <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search bill or customer..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                />
            </div>

            {/* Table */}
            <Card>
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">Loading...</div>
                    ) : filtered.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-40 text-muted-foreground gap-2">
                            <CheckCircle2 className="h-10 w-10 opacity-20" />
                            <p className="text-sm font-medium">No due bills{search && ' matching search'}!</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Bill #</TableHead>
                                        <TableHead>Customer</TableHead>
                                        <TableHead>Date</TableHead>
                                        <TableHead className="text-right">Total</TableHead>
                                        <TableHead className="text-right">Paid</TableHead>
                                        <TableHead className="text-right">Due</TableHead>
                                        <TableHead>Due Date</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filtered.map((bill: any) => {
                                        const isOverdue = bill.due_date && isPast(parseISO(bill.due_date));
                                        return (
                                            <TableRow
                                                key={bill.id}
                                                className={cn(isOverdue && 'bg-red-50 dark:bg-red-950/20 border-l-4 border-l-red-500')}
                                            >
                                                <TableCell className="font-mono text-sm font-semibold">{bill.bill_number}</TableCell>
                                                <TableCell className="font-medium">{bill.customers?.name || 'Walk-in'}</TableCell>
                                                <TableCell className="text-muted-foreground text-sm">
                                                    {format(new Date(bill.created_at), 'dd MMM yy')}
                                                </TableCell>
                                                <TableCell className="text-right font-medium">
                                                    {currencySymbol}{Number(bill.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                                </TableCell>
                                                <TableCell className="text-right text-green-600 font-medium">
                                                    {currencySymbol}{Number(bill.paid_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                                </TableCell>
                                                <TableCell className="text-right font-bold text-destructive">
                                                    {currencySymbol}{Number(bill.due_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                                </TableCell>
                                                <TableCell>
                                                    {bill.due_date ? (
                                                        <span className={cn('text-sm flex items-center gap-1', isOverdue ? 'text-red-600 font-semibold' : 'text-muted-foreground')}>
                                                            {isOverdue && <AlertTriangle className="h-3 w-3" />}
                                                            {format(parseISO(bill.due_date), 'dd MMM yy')}
                                                        </span>
                                                    ) : (
                                                        <span className="text-muted-foreground text-xs">—</span>
                                                    )}
                                                </TableCell>
                                                <TableCell>{getStatusBadge(bill)}</TableCell>
                                                <TableCell className="text-right">
                                                    <Button
                                                        size="sm"
                                                        className="h-7 text-xs"
                                                        onClick={() => setPayDialog({ bill, amount: String(bill.due_amount || '') })}
                                                    >
                                                        <CreditCard className="h-3 w-3 mr-1" />
                                                        Pay Now
                                                    </Button>
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

            {/* Pay Now Dialog */}
            <Dialog open={!!payDialog} onOpenChange={() => setPayDialog(null)}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <CreditCard className="h-5 w-5 text-primary" />
                            Record Payment
                        </DialogTitle>
                    </DialogHeader>
                    {payDialog && (
                        <div className="space-y-4 py-2">
                            <div className="bg-muted/40 rounded-lg p-3 space-y-1 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Bill</span>
                                    <span className="font-mono font-semibold">{payDialog.bill.bill_number}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Total Due</span>
                                    <span className="font-bold text-destructive">
                                        {currencySymbol}{Number(payDialog.bill.due_amount).toFixed(2)}
                                    </span>
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <Label>Payment Amount</Label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">₹</span>
                                    <Input
                                        type="number"
                                        className="pl-7"
                                        value={payDialog.amount}
                                        onChange={(e) => setPayDialog(d => d ? { ...d, amount: e.target.value } : null)}
                                        min={0.01}
                                        max={payDialog.bill.due_amount}
                                        autoFocus
                                    />
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Remaining after payment: {currencySymbol}
                                    {Math.max(0, (payDialog.bill.due_amount || 0) - parseFloat(payDialog.amount || '0')).toFixed(2)}
                                </p>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setPayDialog(null)}>Cancel</Button>
                        <Button onClick={handlePay} disabled={payMutation.isPending}>
                            {payMutation.isPending ? 'Saving...' : 'Confirm Payment'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
