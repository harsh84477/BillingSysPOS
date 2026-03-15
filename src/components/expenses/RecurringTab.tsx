import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CalendarClock, PlusCircle, Trash2, Edit2, Play, Pause, Repeat, Clock } from 'lucide-react';
import { toast } from 'sonner';

export function RecurringTab({ recurringExpenses = [], categories = [], addRecurringExpense, updateRecurringExpense, deleteRecurringExpense }: any) {
    const [formData, setFormData] = useState({
        amount: '',
        category_id: '',
        payment_method: 'cash',
        frequency: 'monthly',
        description: '',
        next_due_date: new Date().toISOString().split('T')[0]
    });
    const [editingId, setEditingId] = useState<string | null>(null);

    const safeRecurring = recurringExpenses || [];
    const safeCategories = categories || [];

    const handleCreate = async () => {
        if (!formData.amount || !formData.category_id || !formData.next_due_date) {
            toast.error('Amount, Category, and Due Date are required.');
            return;
        }
        if (editingId) {
            await updateRecurringExpense?.(editingId, { ...formData, amount: Number(formData.amount) });
            setEditingId(null);
        } else {
            await addRecurringExpense?.({ ...formData, amount: Number(formData.amount), is_active: true });
        }
        setFormData({ amount: '', category_id: '', payment_method: 'cash', frequency: 'monthly', description: '', next_due_date: new Date().toISOString().split('T')[0] });
    };

    const handleEdit = (rec: any) => {
        setEditingId(rec.id);
        setFormData({
            amount: String(rec.amount),
            category_id: rec.category_id || '',
            payment_method: rec.payment_method || 'cash',
            frequency: rec.frequency || 'monthly',
            description: rec.description || '',
            next_due_date: rec.next_due_date || new Date().toISOString().split('T')[0]
        });
    };

    const toggleActive = async (rec: any) => {
        await updateRecurringExpense?.(rec.id, { is_active: !rec.is_active });
    };

    const activeCount = safeRecurring.filter((r: any) => r.is_active).length;
    const monthlyTotal = safeRecurring
        .filter((r: any) => r.is_active)
        .reduce((sum: number, r: any) => sum + Number(r.amount || 0), 0);

    return (
        <div className="space-y-4 animate-in fade-in duration-500 w-full">
            {/* Quick Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="rounded-xl border p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Active Schedules</p>
                    <p className="text-2xl font-black text-blue-600 mt-1">{activeCount}</p>
                </div>
                <div className="rounded-xl border p-4 bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/20 dark:to-purple-950/20">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Monthly Auto-Pay</p>
                    <p className="text-2xl font-black text-violet-600 mt-1">₹{monthlyTotal.toLocaleString('en-IN')}</p>
                </div>
                <div className="rounded-xl border p-4 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 hidden sm:block">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Total Schedules</p>
                    <p className="text-2xl font-black text-amber-600 mt-1">{safeRecurring.length}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                {/* Form */}
                <Card className="lg:col-span-4 shadow-sm border h-fit">
                    <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 py-3 px-5">
                        <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-xl bg-blue-500 flex items-center justify-center shadow-md">
                                <CalendarClock className="h-4 w-4 text-white" />
                            </div>
                            <div>
                                <CardTitle className="text-base font-bold">{editingId ? 'Edit Schedule' : 'New Schedule'}</CardTitle>
                                <CardDescription className="text-[10px]">Automate repeated business expenses</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-5 space-y-3.5">
                        <div className="space-y-1.5">
                            <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Amount (₹)</Label>
                            <Input type="number" value={formData.amount} onChange={e => setFormData({ ...formData, amount: e.target.value })} placeholder="0.00" className="h-12 rounded-xl border-2 text-lg font-bold" />
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Category</Label>
                            <Select value={formData.category_id} onValueChange={v => setFormData({ ...formData, category_id: v })}>
                                <SelectTrigger className="h-11 border-2 rounded-xl"><SelectValue placeholder="Select Category" /></SelectTrigger>
                                <SelectContent>
                                    {safeCategories.map((c: any) => (
                                        <SelectItem key={c.id} value={c.id}>
                                            <span className="flex items-center gap-2">
                                                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.color || '#94a3b8' }} />
                                                {c.name}
                                            </span>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Frequency</Label>
                                <Select value={formData.frequency} onValueChange={v => setFormData({ ...formData, frequency: v })}>
                                    <SelectTrigger className="h-11 border-2 rounded-xl"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="daily">Daily</SelectItem>
                                        <SelectItem value="weekly">Weekly</SelectItem>
                                        <SelectItem value="monthly">Monthly</SelectItem>
                                        <SelectItem value="yearly">Yearly</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Method</Label>
                                <Select value={formData.payment_method} onValueChange={v => setFormData({ ...formData, payment_method: v })}>
                                    <SelectTrigger className="h-11 border-2 rounded-xl"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="cash">Cash</SelectItem>
                                        <SelectItem value="upi">UPI</SelectItem>
                                        <SelectItem value="card">Card</SelectItem>
                                        <SelectItem value="bank">Bank</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Next Due Date</Label>
                            <Input type="date" value={formData.next_due_date} onChange={e => setFormData({ ...formData, next_due_date: e.target.value })} className="h-11 border-2 rounded-xl" />
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Description</Label>
                            <Input value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder="e.g. Monthly shop rent" className="h-11 border-2 rounded-xl" />
                        </div>

                        <Button onClick={handleCreate} className="w-full h-11 uppercase font-bold tracking-widest rounded-xl mt-2 bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200 dark:shadow-blue-900/30">
                            <PlusCircle className="mr-2 h-4 w-4" /> {editingId ? 'Update Schedule' : 'Start Auto-Payment'}
                        </Button>
                        {editingId && (
                            <Button variant="ghost" className="w-full text-xs" onClick={() => { setEditingId(null); setFormData({ amount: '', category_id: '', payment_method: 'cash', frequency: 'monthly', description: '', next_due_date: new Date().toISOString().split('T')[0] }); }}>
                                Cancel Edit
                            </Button>
                        )}
                    </CardContent>
                </Card>

                {/* Table */}
                <Card className="lg:col-span-8 shadow-sm border">
                    <CardHeader className="border-b bg-muted/20 py-3 px-5">
                        <CardTitle className="text-sm font-bold flex items-center gap-2">
                            <Repeat className="h-4 w-4 text-blue-500" /> Active Auto-Payments ({safeRecurring.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-muted/30">
                                    <TableRow>
                                        <TableHead className="text-[10px]">Category</TableHead>
                                        <TableHead className="text-[10px]">Description</TableHead>
                                        <TableHead className="text-[10px]">Amount</TableHead>
                                        <TableHead className="text-[10px]">Frequency</TableHead>
                                        <TableHead className="text-[10px]">Next Due</TableHead>
                                        <TableHead className="text-[10px]">Status</TableHead>
                                        <TableHead className="text-[10px] text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {safeRecurring.map((r: any) => {
                                        const cat = safeCategories.find((c: any) => c.id === r.category_id);
                                        const isOverdue = r.next_due_date && new Date(r.next_due_date) < new Date();
                                        return (
                                            <TableRow key={r.id} className="hover:bg-muted/20 transition-colors">
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat?.color || '#94a3b8' }} />
                                                        <span className="font-semibold text-xs">{cat?.name || 'Unknown'}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-xs text-muted-foreground max-w-[120px] truncate">{r.description || '-'}</TableCell>
                                                <TableCell className="font-black text-blue-600 text-xs">₹{Number(r.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className="text-[9px] font-bold uppercase tracking-wider">{r.frequency}</Badge>
                                                </TableCell>
                                                <TableCell className="text-xs whitespace-nowrap">
                                                    <span className={isOverdue && r.is_active ? 'text-rose-600 font-bold' : ''}>
                                                        {r.next_due_date ? new Date(r.next_due_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                                                    </span>
                                                    {isOverdue && r.is_active && <Clock className="inline h-3 w-3 ml-1 text-rose-500" />}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={r.is_active ? "default" : "secondary"} className={r.is_active ? "bg-emerald-500 text-white text-[9px]" : "text-[9px]"}>
                                                        {r.is_active ? 'Active' : 'Paused'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex items-center justify-end gap-0.5">
                                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toggleActive(r)} title={r.is_active ? 'Pause' : 'Resume'}>
                                                            {r.is_active ? <Pause className="h-3.5 w-3.5 text-amber-500" /> : <Play className="h-3.5 w-3.5 text-emerald-500" />}
                                                        </Button>
                                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(r)}>
                                                            <Edit2 className="h-3.5 w-3.5 text-blue-500" />
                                                        </Button>
                                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteRecurringExpense?.(r.id)}>
                                                            <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                    {safeRecurring.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={7} className="h-32 text-center text-muted-foreground italic text-sm">
                                                <Repeat className="h-8 w-8 mx-auto mb-2 opacity-20" />
                                                No recurring expenses yet. Automate fixed costs like rent, salaries, and subscriptions.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
