// @ts-nocheck
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState, TableSkeleton } from '@/components/ui/EmptyState';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function DueBills() {
    const { businessId } = useAuth();
    const queryClient = useQueryClient();
    const [search, setSearch] = useState('');
    const [payDialog, setPayDialog] = useState<{ bill: any; method: 'cash' | 'upi' | 'split' | 'due'; cashAmount: string | number; onlineAmount: string | number } | null>(null);

    // Fetch unpaid/partial bills
    const { data: dueBills = [], isLoading } = useQuery({
        queryKey: ['due-bills', businessId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('bills')
                .select('*, customers(name, phone, address)')
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
        mutationFn: async ({ bill, amount, payments }: { bill: any; amount: number; payments: { method: string, amount: number }[] }) => {
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

            // Record the payment mode in bill_payments
            if (payments && payments.length > 0) {
                const inserts = payments.map(p => ({
                    bill_id: bill.id,
                    business_id: bill.business_id,
                    amount: p.amount,
                    payment_mode: p.method,
                    notes: 'due_bill',
                    created_at: new Date().toISOString()
                }));
                const { error: paymentError } = await supabase
                    .from('bill_payments' as any)
                    .insert(inserts as any);
                if (paymentError) console.error('Failed to log payment method', paymentError);
            }

            // Update customer current_due
            if (bill.customer_id) {
                try {
                    await supabase.rpc('update_customer_due', {
                        _customer_id: bill.customer_id,
                        _delta: -amount,
                    });
                } catch (e) {
                    // non-critical
                }
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

        let payments: { method: string, amount: number }[] = [];

        if (payDialog.method === 'cash' || payDialog.method === 'upi') {
            const amt = Number(payDialog.cashAmount || 0);
            if (amt <= 0) {
                toast.error('Enter a valid payment amount');
                return;
            }
            payments.push({ method: payDialog.method, amount: amt });
        } else if (payDialog.method === 'split') {
            const cAmt = Number(payDialog.cashAmount || 0);
            const oAmt = Number(payDialog.onlineAmount || 0);
            const total = cAmt + oAmt;
            if (total <= 0 || total > payDialog.bill.due_amount) {
                toast.error('Invalid split amount calculation');
                return;
            }
            if (cAmt > 0) payments.push({ method: 'cash', amount: cAmt });
            if (oAmt > 0) payments.push({ method: 'upi', amount: oAmt });
        } else if (payDialog.method === 'due') {
            setPayDialog(null);
            return;
        }

        const totalAmt = payments.reduce((sum, p) => sum + p.amount, 0);
        payMutation.mutate({ bill: payDialog.bill, amount: totalAmt, payments });
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
        <div className="max-w-4xl mx-auto w-full" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Header */}
            <div>
                <h1 className="spos-page-heading" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    Due Bills
                </h1>
                <p className="spos-page-subhead">Manage unpaid & partially paid bills</p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-3">
                {[
                    { label: 'Total Due',    value: `${currencySymbol}${totalDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, icon: IndianRupee,   bg: 'bg-rose-50 dark:bg-rose-950/20',    grad: 'from-rose-500 to-pink-600',    text: 'text-rose-600' },
                    { label: 'Unpaid Bills', value: dueBills.length,                                                                         icon: AlertCircle,   bg: 'bg-amber-50 dark:bg-amber-950/20',  grad: 'from-amber-500 to-orange-500',  text: 'text-amber-600' },
                    { label: 'Overdue',      value: overdueCount,                                                                             icon: AlertTriangle, bg: 'bg-rose-50 dark:bg-rose-950/20',    grad: 'from-rose-500 to-pink-600',    text: 'text-rose-600' },
                ].map(card => {
                    const Icon = card.icon;
                    return (
                        <div key={card.label} className={cn('rounded-2xl border p-3 sm:p-4 relative overflow-hidden', card.bg)}>
                            <div className={cn('absolute -right-4 -top-4 w-16 h-16 rounded-full bg-gradient-to-br opacity-10', card.grad)} />
                            <div className="relative">
                                <div className="flex items-start justify-between gap-1 mb-1">
                                    <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-muted-foreground leading-tight">{card.label}</p>
                                    <div className={cn('w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-gradient-to-br flex items-center justify-center shadow-md shrink-0', card.grad)}>
                                        <Icon className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-white" />
                                    </div>
                                </div>
                                <p className={cn('text-base sm:text-xl font-black leading-none', card.text)}>{card.value}</p>
                            </div>
                        </div>
                    );
                })}
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

            {/* Bill Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-24">
                    {isLoading ? (
                        <TableSkeleton columns={3} rows={4} />
                    ) : filtered.length === 0 ? (
                        <EmptyState
                            icon="alert"
                            title={search ? 'No due bills matching search' : 'No due bills!'}
                            description="All bills are paid. Great job!"
                        />
                    ) : filtered.map((bill: any) => {
                        const isOverdue = bill.due_date && isPast(parseISO(bill.due_date));
                        return (
                            <div
                                key={bill.id}
                                className={cn(
                                    'bg-card border rounded-2xl p-4',
                                    isOverdue && 'border-l-4 border-l-red-500 bg-red-50 dark:bg-red-950/20'
                                )}
                                style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
                            >
                                {/* Top row */}
                                <div className="flex items-start justify-between gap-2 mb-3">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-sm">#{bill.bill_number}</span>
                                            {getStatusBadge(bill)}
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-0.5">{bill.customers?.name || 'Walk-in'}</p>
                                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                                            <Calendar className="h-3 w-3" />
                                            {format(new Date(bill.created_at), 'dd MMM yyyy')}
                                            {bill.due_date && (
                                                <span className={cn('ml-2 flex items-center gap-1', isOverdue ? 'text-red-600 font-semibold' : '')}>
                                                    {isOverdue && <AlertTriangle className="h-3 w-3" />}
                                                    Due: {format(parseISO(bill.due_date), 'dd MMM yy')}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className="text-[10px] text-muted-foreground uppercase font-semibold">Due Amount</p>
                                        <p className="text-lg font-black text-rose-600">{currencySymbol}{Number(bill.due_amount || 0).toFixed(2)}</p>
                                    </div>
                                </div>
                                {/* Amount row */}
                                <div className="flex items-center gap-3 text-xs mb-3">
                                    <span className="text-muted-foreground">Total: <strong className="text-foreground">{currencySymbol}{Number(bill.total_amount).toFixed(2)}</strong></span>
                                    <span className="text-muted-foreground">Paid: <strong className="text-emerald-600">{currencySymbol}{Number(bill.paid_amount || 0).toFixed(2)}</strong></span>
                                </div>
                                {/* Actions row */}
                                <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                                        {bill.customers?.phone && <span>{bill.customers.phone}</span>}
                                    </div>
                                    <Button
                                        size="sm"
                                        className="h-8 px-4 font-semibold text-xs"
                                        onClick={() => setPayDialog({ bill, cashAmount: String(bill.due_amount || ''), onlineAmount: '', method: 'cash' })}
                                    >
                                        <CreditCard className="h-3.5 w-3.5 mr-1.5" />
                                        Pay Now
                                    </Button>
                                </div>
                            </div>
                        );
                    })}
            </div>

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
                                <Label className="text-[10px] uppercase text-muted-foreground">Payment Method</Label>
                                <div className="grid grid-cols-4 gap-1 p-0.5 bg-muted/50 rounded-lg border border-border">
                                    {(['cash', 'upi', 'split', 'due'] as const).map((type) => (
                                        <button
                                            key={type}
                                            onClick={() => {
                                                setPayDialog(d => {
                                                    if (!d) return null;
                                                    if (type === 'due' || type === 'split') {
                                                        return { ...d, method: type, cashAmount: '', onlineAmount: '' };
                                                    }
                                                    return { ...d, method: type, cashAmount: String(d.bill.due_amount), onlineAmount: '' };
                                                });
                                            }}
                                            className={cn(
                                                'py-1.5 rounded-md text-[10px] font-bold transition-all uppercase',
                                                payDialog.method === type
                                                    ? 'bg-primary text-primary-foreground shadow-md'
                                                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                            )}
                                        >
                                            {type}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {payDialog.method === 'split' ? (
                                <div className="mt-3 space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="space-y-1 text-left">
                                            <Label className="text-[10px] uppercase text-muted-foreground">Cash Amount</Label>
                                            <div className="relative">
                                                <span className="absolute left-2 top-1.5 text-xs text-muted-foreground">₹</span>
                                                <Input
                                                    type="number"
                                                    value={payDialog.cashAmount}
                                                    onChange={(e) => {
                                                        const val = e.target.value === '' ? '' : Number(e.target.value);
                                                        const rem = val === '' ? '' : Math.max(0, payDialog.bill.due_amount - Number(val));
                                                        setPayDialog(d => d ? { ...d, cashAmount: val, onlineAmount: rem } : null);
                                                    }}
                                                    className="h-8 pl-5 text-sm font-bold bg-emerald-50/30 border-emerald-100 focus-visible:ring-emerald-500"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-1 text-left">
                                            <Label className="text-[10px] uppercase text-muted-foreground">Online Amount</Label>
                                            <div className="relative">
                                                <span className="absolute left-2 top-1.5 text-xs text-muted-foreground">₹</span>
                                                <Input
                                                    type="number"
                                                    value={payDialog.onlineAmount}
                                                    onChange={(e) => {
                                                        const val = e.target.value === '' ? '' : Number(e.target.value);
                                                        const rem = val === '' ? '' : Math.max(0, payDialog.bill.due_amount - Number(val));
                                                        setPayDialog(d => d ? { ...d, onlineAmount: val, cashAmount: rem } : null);
                                                    }}
                                                    className="h-8 pl-5 text-sm font-bold bg-blue-50/30 border-blue-100 focus-visible:ring-blue-500"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center justify-between p-2 rounded-lg bg-primary/5 border border-primary/10">
                                            <span className="text-[10px] uppercase font-bold text-muted-foreground">Total Entered</span>
                                            <span className={cn(
                                                "text-sm font-black",
                                                (Number(payDialog.cashAmount || 0) + Number(payDialog.onlineAmount || 0)) === payDialog.bill.due_amount ? "text-emerald-600" : "text-amber-600"
                                            )}>
                                                {currencySymbol}{(Number(payDialog.cashAmount || 0) + Number(payDialog.onlineAmount || 0)).toFixed(2)} / {payDialog.bill.due_amount.toFixed(2)}
                                            </span>
                                        </div>
                                        {payDialog.bill.due_amount - (Number(payDialog.cashAmount || 0) + Number(payDialog.onlineAmount || 0)) > 0 && (
                                            <div className="flex items-center justify-between p-2 rounded-lg bg-destructive/5 border border-destructive/10 animate-in fade-in zoom-in duration-200">
                                                <span className="text-[10px] uppercase font-bold text-destructive">Remaining Due</span>
                                                <span className="text-sm font-black text-destructive">
                                                    {currencySymbol}{(payDialog.bill.due_amount - (Number(payDialog.cashAmount || 0) + Number(payDialog.onlineAmount || 0))).toFixed(2)}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : payDialog.method !== 'due' ? (
                                <div className="space-y-1.5 mt-3">
                                    <Label className="text-[10px] uppercase text-muted-foreground">Payment Amount</Label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">₹</span>
                                        <Input
                                            type="number"
                                            className="pl-7 bg-muted/50 h-10 font-bold"
                                            value={payDialog.cashAmount}
                                            onChange={(e) => setPayDialog(d => d ? { ...d, cashAmount: e.target.value === '' ? '' : Number(e.target.value) } : null)}
                                            min={0}
                                            max={payDialog.bill.due_amount}
                                            autoFocus
                                        />
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        Remaining after payment: {currencySymbol}
                                        {Math.max(0, (payDialog.bill.due_amount || 0) - Number(payDialog.cashAmount || 0)).toFixed(2)}
                                    </p>
                                </div>
                            ) : (
                                <div className="mt-3 p-3 rounded-lg bg-amber-50/50 border border-amber-100 flex items-center gap-3">
                                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                                    <p className="text-xs text-amber-700">Remaining balance will be marked as Due.</p>
                                </div>
                            )}
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
