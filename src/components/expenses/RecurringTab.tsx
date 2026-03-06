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

export function RecurringTab({ recurringExpenses, categories, addRecurringExpense, updateRecurringExpense, deleteRecurringExpense }: any) {
    const [formData, setFormData] = useState({
        amount: '',
        category_id: '',
        payment_method: 'cash',
        frequency: 'monthly',
        description: '',
        next_due_date: new Date().toISOString().split('T')[0]
    });
    const [editingId, setEditingId] = useState<string | null>(null);

    const handleCreate = async () => {
        if (!formData.amount || !formData.category_id || !formData.next_due_date) {
            toast.error('Amount, Category, and Due Date are required.');
            return;
        }

        if (editingId) {
            await updateRecurringExpense(editingId, { ...formData, amount: Number(formData.amount) });
            setEditingId(null);
        } else {
            await addRecurringExpense({ ...formData, amount: Number(formData.amount), is_active: true });
        }
        setFormData({ amount: '', category_id: '', payment_method: 'cash', frequency: 'monthly', description: '', next_due_date: new Date().toISOString().split('T')[0] });
    };

    const handleEdit = (rec: any) => {
        setEditingId(rec.id);
        setFormData({
            amount: String(rec.amount),
            category_id: rec.category_id,
            payment_method: rec.payment_method || 'cash',
            frequency: rec.frequency,
            description: rec.description || '',
            next_due_date: rec.next_due_date || new Date().toISOString().split('T')[0]
        });
    };

    const toggleActive = async (rec: any) => {
        await updateRecurringExpense(rec.id, { is_active: !rec.is_active });
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 animate-in fade-in duration-500">
            <Card className="md:col-span-4 border-2 shadow-lg h-fit">
                <CardHeader className="bg-muted/30 border-b">
                    <CardTitle className="text-xl flex items-center gap-2">
                        <CalendarClock className="text-emerald-500 h-5 w-5" />
                        {editingId ? 'Edit Schedule' : 'New Schedule'}
                    </CardTitle>
                    <CardDescription>Automate repeated business expenses.</CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                    <div className="space-y-2">
                        <Label className="font-bold text-muted-foreground uppercase text-xs">Amount</Label>
                        <Input type="number" value={formData.amount} onChange={e => setFormData({ ...formData, amount: e.target.value })} placeholder="0.00" className="h-12 rounded-xl border-2" />
                    </div>

                    <div className="space-y-2">
                        <Label className="font-bold text-muted-foreground uppercase text-xs">Category</Label>
                        <Select value={formData.category_id} onValueChange={v => setFormData({ ...formData, category_id: v })}>
                            <SelectTrigger className="h-12 border-2 rounded-xl"><SelectValue placeholder="Select Category" /></SelectTrigger>
                            <SelectContent>
                                {categories.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="font-bold text-muted-foreground uppercase text-xs">Frequency</Label>
                            <Select value={formData.frequency} onValueChange={v => setFormData({ ...formData, frequency: v })}>
                                <SelectTrigger className="h-12 border-2 rounded-xl"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="daily">Daily</SelectItem>
                                    <SelectItem value="weekly">Weekly</SelectItem>
                                    <SelectItem value="monthly">Monthly</SelectItem>
                                    <SelectItem value="yearly">Yearly</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label className="font-bold text-muted-foreground uppercase text-xs">Method</Label>
                            <Select value={formData.payment_method} onValueChange={v => setFormData({ ...formData, payment_method: v })}>
                                <SelectTrigger className="h-12 border-2 rounded-xl"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="cash">Cash</SelectItem>
                                    <SelectItem value="upi">UPI / Online</SelectItem>
                                    <SelectItem value="card">Card</SelectItem>
                                    <SelectItem value="bank">Bank Transfer</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="font-bold text-muted-foreground uppercase text-xs">Next Due Date</Label>
                        <Input type="date" value={formData.next_due_date} onChange={e => setFormData({ ...formData, next_due_date: e.target.value })} className="h-12 border-2 rounded-xl" />
                    </div>

                    <div className="space-y-2">
                        <Label className="font-bold text-muted-foreground uppercase text-xs">Description</Label>
                        <Input value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="h-12 border-2 rounded-xl" />
                    </div>

                    <Button onClick={handleCreate} className="w-full h-12 uppercase font-black tracking-wider rounded-xl mt-4">
                        <PlusCircle className="mr-2 h-4 w-4" /> {editingId ? 'Update Schedule' : 'Start Auto-Payment'}
                    </Button>
                    {editingId && (
                        <Button variant="ghost" className="w-full text-xs" onClick={() => { setEditingId(null); setFormData({ amount: '', category_id: '', payment_method: 'cash', frequency: 'monthly', description: '', next_due_date: new Date().toISOString().split('T')[0] }); }}>
                            Cancel Edit
                        </Button>
                    )}
                </CardContent>
            </Card>

            <Card className="md:col-span-8 shadow-md border-0 ring-1 ring-border/50">
                <CardHeader>
                    <CardTitle className="text-lg shadow-sm p-4 bg-muted/20 rounded-xl">Active Auto-Payments</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-muted/50">
                            <TableRow>
                                <TableHead>Category</TableHead>
                                <TableHead>Amount</TableHead>
                                <TableHead>Frequency</TableHead>
                                <TableHead>Next Due</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {recurringExpenses.map((r: any) => {
                                const cat = categories.find((c: any) => c.id === r.category_id);
                                return (
                                    <TableRow key={r.id}>
                                        <TableCell className="font-semibold">{cat ? cat.name : 'Unknown'}</TableCell>
                                        <TableCell className="font-bold text-emerald-600">₹{r.amount.toFixed(2)}</TableCell>
                                        <TableCell className="uppercase text-xs">{r.frequency}</TableCell>
                                        <TableCell className="text-xs text-muted-foreground">{new Date(r.next_due_date).toLocaleDateString()}</TableCell>
                                        <TableCell>
                                            <Badge variant={r.is_active ? "default" : "secondary"} className={r.is_active ? "bg-emerald-500" : ""}>
                                                {r.is_active ? 'Active' : 'Paused'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="icon" onClick={() => toggleActive(r)} title={r.is_active ? 'Pause' : 'Resume'}>
                                                {r.is_active ? <Pause className="h-4 w-4 text-amber-500" /> : <Play className="h-4 w-4 text-emerald-500" />}
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => handleEdit(r)}>
                                                <Edit2 className="h-4 w-4 text-blue-500" />
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => deleteRecurringExpense(r.id)}>
                                                <Trash2 className="h-4 w-4 text-rose-500" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                            {recurringExpenses.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-32 text-center text-muted-foreground italic">
                                        No recurring expenses found. Save time by automating fixed costs!
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
