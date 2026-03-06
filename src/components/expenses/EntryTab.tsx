import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save, PlusCircle, Paperclip } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export function EntryTab({ categories, addExpense }: any) {
    const [amount, setAmount] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('cash');
    const [description, setDescription] = useState('');
    const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [receiptUrl, setReceiptUrl] = useState('');
    const [uploading, setUploading] = useState(false);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setUploading(true);
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random()}.${fileExt}`;
            const filePath = `receipts/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('documents') // Assuming a generic 'documents' bucket exists or fallback
                .upload(filePath, file);

            if (uploadError) {
                throw uploadError;
            }

            setReceiptUrl(filePath);
            toast.success('Receipt uploaded successfully');
        } catch (error: any) {
            toast.error('Failed to upload receipt: ' + error.message);
        } finally {
            setUploading(false);
        }
    };

    const handleCreate = async () => {
        if (!amount || Number(amount) <= 0) {
            toast.error('Please enter a valid amount');
            return;
        }
        if (!categoryId && categories.length > 0) {
            toast.error('Please select a category');
            return;
        }

        setIsSubmitting(true);
        const success = await addExpense({
            amount: Number(amount),
            category_id: categoryId || null,
            payment_method: paymentMethod,
            description: description,
            expense_date: expenseDate,
            receipt_url: receiptUrl
        }, categories.find((c: any) => c.id === categoryId)?.name || 'Uncategorized');

        if (success) {
            setAmount('');
            setDescription('');
            setReceiptUrl('');
            setExpenseDate(new Date().toISOString().split('T')[0]);
        }
        setIsSubmitting(false);
    };

    const addQuickAmount = (val: number) => {
        setAmount(prev => String(Number(prev || 0) + val));
    };

    return (
        <Card className="max-w-2xl mx-auto shadow-lg animate-in fade-in zoom-in-95 duration-500">
            <CardHeader className="bg-muted/30 border-b">
                <CardTitle className="text-xl flex items-center gap-2">
                    <PlusCircle className="text-primary h-5 w-5" />
                    Record New Expense
                </CardTitle>
                <CardDescription>Instantly log a business expense to your ledger</CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label className="font-bold text-muted-foreground uppercase text-xs">Amount (₹)</Label>
                        <Input
                            type="number"
                            className="h-16 text-4xl font-black rounded-xl bg-muted/20 border-2"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="0.00"
                        />
                        <div className="flex gap-2 pt-2">
                            <Button variant="outline" type="button" onClick={() => addQuickAmount(500)}>+500</Button>
                            <Button variant="outline" type="button" onClick={() => addQuickAmount(1000)}>+1000</Button>
                            <Button variant="outline" type="button" onClick={() => addQuickAmount(5000)}>+5000</Button>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="font-bold text-muted-foreground uppercase text-xs">Category</Label>
                            <Select value={categoryId} onValueChange={setCategoryId}>
                                <SelectTrigger className="h-12 border-2 rounded-xl">
                                    <SelectValue placeholder="Select Category" />
                                </SelectTrigger>
                                <SelectContent>
                                    {categories.map((cat: any) => (
                                        <SelectItem key={cat.id} value={cat.id}>
                                            <span className="flex items-center gap-2">
                                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color || '#ccc' }} />
                                                {cat.name}
                                            </span>
                                        </SelectItem>
                                    ))}
                                    {categories.length === 0 && (
                                        <div className="p-2 text-sm text-muted-foreground italic">No categories found. Create one first!</div>
                                    )}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label className="font-bold text-muted-foreground uppercase text-xs">Payment Method</Label>
                            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                                <SelectTrigger className="h-12 border-2 rounded-xl">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="cash">Cash</SelectItem>
                                    <SelectItem value="upi">UPI / Online</SelectItem>
                                    <SelectItem value="card">Card</SelectItem>
                                    <SelectItem value="bank">Bank Transfer</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="font-bold text-muted-foreground uppercase text-xs">Date</Label>
                            <Input
                                type="date"
                                className="h-12 border-2 rounded-xl"
                                value={expenseDate}
                                onChange={(e) => setExpenseDate(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="font-bold text-muted-foreground uppercase text-xs">Receipt Attachment</Label>
                            <div className="relative">
                                <Input
                                    type="file"
                                    className="h-12 border-2 rounded-xl file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                                    onChange={handleFileUpload}
                                    disabled={uploading}
                                    accept="image/*,.pdf"
                                />
                                {uploading && <div className="absolute right-3 top-3 text-xs text-muted-foreground">Uploading...</div>}
                                {receiptUrl && !uploading && <div className="absolute right-3 top-3 text-xs text-emerald-600 font-bold flex items-center"><Paperclip className="h-3 w-3 mr-1" /> Attached</div>}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="font-bold text-muted-foreground uppercase text-xs">Description</Label>
                        <Input
                            type="text"
                            className="h-12 border-2 rounded-xl"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="What was this expense for?"
                        />
                    </div>

                    <Button
                        className="w-full h-14 text-lg font-black tracking-wider uppercase rounded-xl mt-4"
                        onClick={handleCreate}
                        disabled={isSubmitting || uploading}
                    >
                        <Save className="mr-2 h-5 w-5" />
                        {isSubmitting ? 'Saving...' : 'Save Expense'}
                    </Button>

                </div>
            </CardContent>
        </Card>
    );
}
