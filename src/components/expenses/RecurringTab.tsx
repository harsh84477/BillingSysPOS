import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CalendarClock, PlusCircle, Trash2, Edit2, Play, Pause } from 'lucide-react';
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

    return (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 animate-in fade-in duration-500">
            <Card className="md:col-span-4 shadow-sm border h-fit">
                <CardHeader className="bg-muted/30 border-b">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <CalendarClock className="text-blue-500 h-5 w-5" />
                        {editingId ? 'Edit Schedule' : 'New Schedule'}
                    </CardTitle>
                    <CardDescription>Automate repeated business expenses.</CardDescription>
                </CardHeader>
                <CardContent className="p-5 space-y-4">
                    <div className="space-y-1.5">
                        <Label className="text-xs uppercase font-bold text-muted-foreground tracking-wider">Amount</Label>
                        <Input type="number" value={formData.amount} onChange={e => setFormData({ ...formData, amount: e.target.value })} placeholder="0.00" className="h-11 rounded-xl border-2" />
                    </div>

                    <div className="space-y-1.5">
                        <Label className="text-xs uppercase font-bold text-muted-foreground tracking-wider">Category</Label>
                        <Select value={formData.category_id} onValueChange={v => setFormData({ ...formData, category_id: v })}>
                            <SelectTrigger className="h-11 border-2 rounded-xl"><SelectValue placeholder="Select Category" /></SelectTrigger>
                            <SelectContent>
                                {safeCategories.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label className="text-xs uppercase font-bold text-muted-foreground tracking-wider">Frequency</Label>
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
                            <Label className="text-xs uppercase font-bold text-muted-foreground tracking-wider">Method</Label>
                            <Select value={formData.payment_method} onValueChange={v => setFormData({ ...formData, payment_method: v })}>
                                <SelectTrigger className="h-11 border-2 rounded-xl"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="cash">Cash</SelectItem>
                                    <SelectItem value="upi">UPI / Online</SelectItem>
                                    <SelectItem value="card">Card</SelectItem>
                                    <SelectItem value="bank">Bank Transfer</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <Label className="text-xs uppercase font-bold text-muted-foreground tracking-wider">Next Due Date</Label>
                        <Input type="date" value={formData.next_due_date} onChange={e => setFormData({ ...formData, next_due_date: e.target.value })} className="h-11 border-2 rounded-xl" />
                    </div>

                    <div className="space-y-1.5">
                        <Label className="text-xs uppercase font-bold text-muted-foreground tracking-wider">Description</Label>
                        <Input value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder="e.g. Monthly shop rent" className="h-11 border-2 rounded-xl" />
                    </div>

                    <Button onClick={handleCreate} className="w-full h-11 uppercase font-bold tracking-wider rounded-xl mt-2 bg-blue-600 hover:bg-blue-700">
                        <PlusCircle className="mr-2 h-4 w-4" /> {editingId ? 'Update Schedule' : 'Start Auto-Payment'}
                    </Button>
                    {editingId && (
                        <Button variant="ghost" className="w-full text-xs" onClick={() => { setEditingId(null); setFormData({ amount: '', category_id: '', payment_method: 'cash', frequency: 'monthly', description: '', next_due_date: new Date().toISOString().split('T')[0] }); }}>
                            Cancel Edit
                        </Button>
                    )}
                </CardContent>
            </Card>

            <Card className="md:col-span-8 shadow-sm border">
                <CardHeader className="border-b bg-muted/20">
                    <CardTitle className="text-base font-bold">Active Auto-Payments</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-muted/30">
                            <TableRow>
                                <TableHead className="text-xs">Category</TableHead>
                                <TableHead className="text-xs">Amount</TableHead>
                                <TableHead className="text-xs">Frequency</TableHead>
                                <TableHead className="text-xs">Next Due</TableHead>
                                <TableHead className="text-xs">Status</TableHead>
                                <TableHead className="text-xs text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {safeRecurring.map((r: any) => {
                                const cat = safeCategories.find((c: any) => c.id === r.category_id);
                                return (
                                    <TableRow key={r.id} className="hover:bg-muted/20">
                                        <TableCell className="font-semibold text-sm">{cat?.name || 'Unknown'}</TableCell>
                                        <TableCell className="font-bold text-blue-600">₹{Number(r.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</TableCell>
                                        <TableCell className="uppercase text-[10px] font-bold tracking-wider text-muted-foreground">{r.frequency}</TableCell>
                                        <TableCell className="text-xs">{r.next_due_date ? new Date(r.next_due_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}</TableCell>
                                        <TableCell>
                                            <Badge variant={r.is_active ? "default" : "secondary"} className={r.is_active ? "bg-emerald-500 text-white" : ""}>
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
                                    <TableCell colSpan={6} className="h-32 text-center text-muted-foreground italic">
                                        No recurring expenses found. Automate fixed costs like rent and salaries!
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
