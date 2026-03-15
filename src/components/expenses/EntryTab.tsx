import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusCircle, IndianRupee, Receipt, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export function EntryTab({ categories = [], subcategories = [], addExpense }: any) {
    const [amount, setAmount] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [subcategoryId, setSubcategoryId] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('cash');
    const [description, setDescription] = useState('');
    const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [receiptUrl, setReceiptUrl] = useState('');
    const [uploading, setUploading] = useState(false);

    const safeCategories = categories || [];
    const safeSubcategories = subcategories || [];

    const filteredSubcategories = useMemo(() => {
        if (!categoryId) return [];
        return safeSubcategories.filter((s: any) => s.category_id === categoryId);
    }, [categoryId, safeSubcategories]);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            setUploading(true);
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random().toString(36).substring(7)}.${fileExt}`;
            const filePath = `receipts/${fileName}`;
            const { error: uploadError } = await (supabase as any).storage.from('documents').upload(filePath, file);
            if (uploadError) throw uploadError;
            setReceiptUrl(filePath);
            toast.success('Receipt uploaded successfully');
        } catch (error: any) {
            toast.error('Failed to upload receipt: ' + error.message);
        } finally {
            setUploading(false);
        }
    };

    const handleCreate = async () => {
        if (!amount || Number(amount) <= 0) { toast.error('Please enter a valid amount'); return; }
        if (!categoryId && safeCategories.length > 0) { toast.error('Please select a category'); return; }

        setIsSubmitting(true);
        const success = await addExpense({
            amount: Number(amount),
            category_id: categoryId || null,
            subcategory_id: subcategoryId || null,
            payment_method: paymentMethod,
            description,
            expense_date: expenseDate,
            receipt_url: receiptUrl
        }, safeCategories.find((c: any) => c.id === categoryId)?.name || 'Uncategorized');

        if (success) {
            setAmount('');
            setDescription('');
            setReceiptUrl('');
            setCategoryId('');
            setSubcategoryId('');
            setExpenseDate(new Date().toISOString().split('T')[0]);
        }
        setIsSubmitting(false);
    };

    const addQuickAmount = (val: number) => setAmount(prev => String(Number(prev || 0) + val));
    const handleCategoryChange = (val: string) => { setCategoryId(val); setSubcategoryId(''); };

    return (
        <div className="animate-in fade-in duration-500 w-full">
            <Card className="shadow-sm border w-full">
                <CardHeader className="border-b bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 py-4 px-6">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-emerald-500 flex items-center justify-center shadow-md">
                            <PlusCircle className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <CardTitle className="text-lg font-bold">Record New Expense</CardTitle>
                            <CardDescription className="text-xs">Log a business expense to your financial ledger</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-6">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        {/* Left side — Amount section */}
                        <div className="lg:col-span-5 space-y-4">
                            <div className="space-y-2">
                                <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Amount (₹)</Label>
                                <div className="relative">
                                    <IndianRupee className="absolute left-4 top-1/2 -translate-y-1/2 h-7 w-7 text-emerald-400" />
                                    <Input
                                        type="number"
                                        className="h-20 text-4xl font-black pl-14 rounded-2xl bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/10 dark:to-green-950/10 border-2 border-emerald-200 dark:border-emerald-800 focus:border-emerald-500 focus:ring-emerald-500/20 shadow-inner"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        placeholder="0.00"
                                    />
                                </div>
                                <div className="flex gap-2 pt-1">
                                    {[500, 1000, 2000, 5000].map(val => (
                                        <Button key={val} variant="outline" type="button" size="sm"
                                            className="text-xs font-bold flex-1 h-9 rounded-lg hover:bg-emerald-50 hover:border-emerald-300 transition-colors"
                                            onClick={() => addQuickAmount(val)}>
                                            +₹{val.toLocaleString()}
                                        </Button>
                                    ))}
                                    {amount && (
                                        <Button variant="ghost" type="button" size="sm" className="text-xs text-muted-foreground h-9" onClick={() => setAmount('')}>
                                            Clear
                                        </Button>
                                    )}
                                </div>
                            </div>

                            {/* Description */}
                            <div className="space-y-2">
                                <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Expense Title / Description</Label>
                                <Input
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="e.g. Monthly office rent payment"
                                    className="h-12 border-2 rounded-xl text-sm"
                                />
                            </div>

                            {/* Receipt Upload */}
                            <div className="space-y-2">
                                <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">
                                    <Receipt className="inline h-3 w-3 mr-1" /> Receipt (optional)
                                </Label>
                                <div className="border-2 border-dashed rounded-xl p-4 text-center hover:border-emerald-300 transition-colors cursor-pointer">
                                    <Input
                                        type="file"
                                        accept="image/*,.pdf"
                                        onChange={handleFileUpload}
                                        disabled={uploading}
                                        className="border-0 shadow-none p-0 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-emerald-100 file:text-emerald-700 hover:file:bg-emerald-200"
                                    />
                                    {receiptUrl && (
                                        <p className="text-xs text-emerald-600 font-semibold mt-2">✓ Receipt attached successfully</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Right side — Details section */}
                        <div className="lg:col-span-7 space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {/* Category */}
                                <div className="space-y-2">
                                    <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Category</Label>
                                    <Select value={categoryId} onValueChange={handleCategoryChange}>
                                        <SelectTrigger className="h-12 border-2 rounded-xl text-sm">
                                            <SelectValue placeholder="Select Category" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {safeCategories.map((cat: any) => (
                                                <SelectItem key={cat.id} value={cat.id}>
                                                    <span className="flex items-center gap-2">
                                                        <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: cat.color || '#94a3b8' }} />
                                                        {cat.name}
                                                    </span>
                                                </SelectItem>
                                            ))}
                                            {safeCategories.length === 0 && (
                                                <div className="p-3 text-sm text-muted-foreground italic">No categories. Create one in Settings tab.</div>
                                            )}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Subcategory */}
                                <div className="space-y-2">
                                    <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Subcategory</Label>
                                    <Select value={subcategoryId} onValueChange={setSubcategoryId} disabled={!categoryId || filteredSubcategories.length === 0}>
                                        <SelectTrigger className="h-12 border-2 rounded-xl text-sm">
                                            <SelectValue placeholder={!categoryId ? "Select category first" : filteredSubcategories.length === 0 ? "No subcategories" : "Select Subcategory"} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {filteredSubcategories.map((sub: any) => (
                                                <SelectItem key={sub.id} value={sub.id}>{sub.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {/* Payment Method */}
                                <div className="space-y-2">
                                    <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Payment Method</Label>
                                    <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                                        <SelectTrigger className="h-12 border-2 rounded-xl text-sm">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="cash">💵 Cash</SelectItem>
                                            <SelectItem value="upi">📱 UPI</SelectItem>
                                            <SelectItem value="bank">🏦 Bank Transfer</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Date */}
                                <div className="space-y-2">
                                    <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Expense Date</Label>
                                    <Input
                                        type="date"
                                        value={expenseDate}
                                        onChange={(e) => setExpenseDate(e.target.value)}
                                        className="h-12 border-2 rounded-xl text-sm"
                                    />
                                </div>
                            </div>

                            {/* Summary + Submit */}
                            <div className="mt-4 p-4 rounded-xl bg-muted/30 border space-y-3">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground font-medium">Expense Summary</span>
                                    <span className="text-2xl font-black text-emerald-600">
                                        ₹{Number(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                    </span>
                                </div>
                                {categoryId && (
                                    <div className="flex gap-2 text-xs text-muted-foreground">
                                        <span>Category: <strong className="text-foreground">{safeCategories.find((c: any) => c.id === categoryId)?.name || '-'}</strong></span>
                                        {subcategoryId && (
                                            <span>• Sub: <strong className="text-foreground">{filteredSubcategories.find((s: any) => s.id === subcategoryId)?.name || '-'}</strong></span>
                                        )}
                                    </div>
                                )}
                                <Button
                                    onClick={handleCreate}
                                    disabled={isSubmitting || !amount}
                                    className="w-full h-12 uppercase font-black tracking-widest rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-200 dark:shadow-emerald-900/30 text-sm"
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
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
