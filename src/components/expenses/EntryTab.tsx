import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusCircle, IndianRupee } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export function EntryTab({ categories = [], addExpense }: any) {
    const [amount, setAmount] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('cash');
    const [description, setDescription] = useState('');
    const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [receiptUrl, setReceiptUrl] = useState('');
    const [uploading, setUploading] = useState(false);

    const safeCategories = categories || [];

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setUploading(true);
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random().toString(36).substring(7)}.${fileExt}`;
            const filePath = `receipts/${fileName}`;

            const { error: uploadError } = await (supabase as any).storage
                .from('documents')
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
        if (!categoryId && safeCategories.length > 0) {
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
        }, safeCategories.find((c: any) => c.id === categoryId)?.name || 'Uncategorized');

        if (success) {
            setAmount('');
            setDescription('');
            setReceiptUrl('');
            setCategoryId('');
            setExpenseDate(new Date().toISOString().split('T')[0]);
        }
        setIsSubmitting(false);
    };

    const addQuickAmount = (val: number) => {
        setAmount(prev => String(Number(prev || 0) + val));
    };

    return (
        <Card className="max-w-2xl mx-auto shadow-sm border animate-in fade-in zoom-in-95 duration-500">
            <CardHeader className="bg-muted/30 border-b">
                <CardTitle className="text-lg flex items-center gap-2">
                    <PlusCircle className="text-emerald-500 h-5 w-5" />
                    Record New Expense
                </CardTitle>
                <CardDescription>Log a business expense to your ledger</CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-5">
                {/* Amount */}
                <div className="space-y-2">
                    <Label className="text-xs uppercase font-bold text-muted-foreground tracking-wider">Amount (₹)</Label>
                    <div className="relative">
                        <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-6 w-6 text-muted-foreground/50" />
                        <Input
                            type="number"
                            className="h-16 text-3xl font-black pl-12 rounded-xl bg-muted/10 border-2 focus:border-emerald-500"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="0.00"
                        />
                    </div>
                    <div className="flex gap-2 pt-1">
                        {[500, 1000, 2000, 5000].map(val => (
                            <Button key={val} variant="outline" type="button" size="sm" className="text-xs font-bold" onClick={() => addQuickAmount(val)}>
                                +{val.toLocaleString()}
                            </Button>
                        ))}
                        {amount && (
                            <Button variant="ghost" type="button" size="sm" className="text-xs text-muted-foreground" onClick={() => setAmount('')}>
                                Clear
                            </Button>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Category */}
                    <div className="space-y-2">
                        <Label className="text-xs uppercase font-bold text-muted-foreground tracking-wider">Category</Label>
                        <Select value={categoryId} onValueChange={setCategoryId}>
                            <SelectTrigger className="h-11 border-2 rounded-xl">
                                <SelectValue placeholder="Select Category" />
                            </SelectTrigger>
                            <SelectContent>
                                {safeCategories.map((cat: any) => (
                                    <SelectItem key={cat.id} value={cat.id}>
                                        <span className="flex items-center gap-2">
                                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color || '#94a3b8' }} />
                                            {cat.name}
                                        </span>
                                    </SelectItem>
                                ))}
                                {safeCategories.length === 0 && (
                                    <div className="p-2 text-sm text-muted-foreground italic">No categories found. Create one in Settings.</div>
                                )}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Payment Method */}
                    <div className="space-y-2">
                        <Label className="text-xs uppercase font-bold text-muted-foreground tracking-wider">Payment Method</Label>
                        <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                            <SelectTrigger className="h-11 border-2 rounded-xl">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="cash">💵 Cash</SelectItem>
                                <SelectItem value="upi">📱 UPI / Online</SelectItem>
                                <SelectItem value="card">💳 Card</SelectItem>
                                <SelectItem value="bank">🏦 Bank Transfer</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Date */}
                <div className="space-y-2">
                    <Label className="text-xs uppercase font-bold text-muted-foreground tracking-wider">Expense Date</Label>
                    <Input
                        type="date"
                        value={expenseDate}
                        onChange={(e) => setExpenseDate(e.target.value)}
                        className="h-11 border-2 rounded-xl"
                    />
                </div>

                {/* Description */}
                <div className="space-y-2">
                    <Label className="text-xs uppercase font-bold text-muted-foreground tracking-wider">Description</Label>
                    <Input
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="e.g. Monthly office rent payment"
                        className="h-11 border-2 rounded-xl"
                    />
                </div>

                {/* Receipt Upload */}
                <div className="space-y-2">
                    <Label className="text-xs uppercase font-bold text-muted-foreground tracking-wider">
                        Receipt (optional)
                    </Label>
                    <Input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={handleFileUpload}
                        disabled={uploading}
                        className="h-11 border-2 rounded-xl file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary"
                    />
                    {receiptUrl && (
                        <p className="text-xs text-emerald-600 font-medium">✓ Receipt attached</p>
                    )}
                </div>

                {/* Submit Button */}
                <Button
                    onClick={handleCreate}
                    disabled={isSubmitting || !amount}
                    className="w-full h-12 uppercase font-black tracking-wider rounded-xl mt-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                    {isSubmitting ? (
                        <div className="flex items-center gap-2">
                            <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Recording...
                        </div>
                    ) : (
                        <>
                            <PlusCircle className="mr-2 h-4 w-4" /> Record Expense
                        </>
                    )}
                </Button>
            </CardContent>
        </Card>
    );
}
