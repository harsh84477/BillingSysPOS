// @ts-nocheck
import React, { useState, useEffect, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useBusinessSettings } from '@/hooks/useBusinessSettings';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
    Trash2,
    Plus,
    Minus,
    CheckCircle2,
    XCircle,
    Search,
    Package,
    ShoppingCart,
    User,
    FileText,
    Clock,
    AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface DraftBillModalProps {
    billId: string | null;
    open: boolean;
    onClose: () => void;
}

interface DraftItem {
    id?: string;
    product_id: string;
    product_name: string;
    quantity: number;
    unit_price: number;
    cost_price: number;
    total_price: number;
}

export default function DraftBillModal({ billId, open, onClose }: DraftBillModalProps) {
    const { user, isAdmin, isManager, isSalesman, businessId } = useAuth();
    const { data: settings } = useBusinessSettings();
    const queryClient = useQueryClient();
    const currencySymbol = settings?.currency_symbol || '₹';
    const canFinalize = isAdmin || isManager;

    const [items, setItems] = useState<DraftItem[]>([]);
    const [customerId, setCustomerId] = useState<string | null>(null);
    const [discountValue, setDiscountValue] = useState(0);
    const [taxAmount, setTaxAmount] = useState(0);
    const [searchQuery, setSearchQuery] = useState('');
    const [showAddProduct, setShowAddProduct] = useState(false);
    const [confirmCancel, setConfirmCancel] = useState(false);
    const [confirmFinalize, setConfirmFinalize] = useState(false);

    // Payment fields for finalization
    const [paymentType, setPaymentType] = useState<'cash' | 'due'>('cash');
    const [paidAmount, setPaidAmount] = useState<number | ''>('');
    const [dueDate, setDueDate] = useState('');

    // Fetch bill details
    const { data: billData, isLoading: billLoading } = useQuery({
        queryKey: ['draftBill', billId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('bills')
                .select('*, customers(id, name, phone)')
                .eq('id', billId!)
                .single();
            if (error) throw error;
            return data;
        },
        enabled: !!billId && open,
    });

    // Fetch bill items
    const { data: billItems = [], isLoading: itemsLoading } = useQuery({
        queryKey: ['draftBillItems', billId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('bill_items')
                .select('*')
                .eq('bill_id', billId!);
            if (error) throw error;
            return data;
        },
        enabled: !!billId && open,
    });

    // Fetch products for "add product" search
    const { data: products = [] } = useQuery({
        queryKey: ['products', businessId],
        queryFn: async () => {
            let query = supabase
                .from('products')
                .select('*')
                .eq('is_active', true);
            if (businessId) query = query.eq('business_id', businessId);
            const { data, error } = await query.order('name');
            if (error) throw error;
            return data;
        },
        enabled: !!businessId && open && showAddProduct,
    });

    // Fetch customers
    const { data: customers = [] } = useQuery({
        queryKey: ['customers', businessId],
        queryFn: async () => {
            let query = supabase.from('customers').select('*');
            if (businessId) query = query.eq('business_id', businessId);
            const { data, error } = await query.order('name');
            if (error) throw error;
            return data;
        },
        enabled: !!businessId && open,
    });

    // Populate state from bill data
    useEffect(() => {
        if (billData && billItems.length > 0) {
            setItems(billItems.map(item => ({
                id: item.id,
                product_id: item.product_id,
                product_name: item.product_name,
                quantity: item.quantity,
                unit_price: Number(item.unit_price),
                cost_price: Number(item.cost_price),
                total_price: Number(item.total_price),
            })));
            setCustomerId(billData.customer_id || null);
            setDiscountValue(Number(billData.discount_value) || 0);
            setTaxAmount(Number(billData.tax_amount) || 0);
        }
    }, [billData, billItems]);

    // Calculations
    const calculations = useMemo(() => {
        const subtotal = items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
        const discountAmount = discountValue;
        const afterDiscount = Math.max(0, subtotal - discountAmount);

        // Only calculate tax if enabled in settings
        const showGst = settings?.show_gst_in_billing ?? true;
        const taxRate = showGst ? (settings?.tax_rate || 0) : 0;

        const computedTax = (afterDiscount * taxRate) / 100;
        const total = afterDiscount + computedTax;
        return { subtotal, discountAmount, tax: computedTax, total, showGst };
    }, [items, discountValue, settings?.tax_rate, settings?.show_gst_in_billing]);

    // Update item quantity
    const updateQuantity = (index: number, delta: number) => {
        setItems(prev => prev.map((item, i) => {
            if (i !== index) return item;

            // Stock check: we can only take what's on shelf (stock - total_reserved)
            // PLUS what we already have for this specific item in this draft.
            const product = products.find(p => p.id === item.product_id);
            if (product && delta > 0) {
                const onShelf = product.stock_quantity - (product.reserved_quantity || 0);
                const maxPossible = onShelf + item.quantity;
                if (item.quantity + delta > maxPossible) {
                    toast.error(`Stock limit reached for ${item.product_name}. Only ${maxPossible} units total available.`);
                    return item;
                }
            }

            const newQty = Math.max(1, item.quantity + delta);
            return { ...item, quantity: newQty, total_price: item.unit_price * newQty };
        }));
    };

    // Set exact quantity
    const setExactQuantity = (index: number, qty: number) => {
        if (qty < 1) return;

        setItems(prev => prev.map((item, i) => {
            if (i !== index) return item;

            const product = products.find(p => p.id === item.product_id);
            if (product) {
                const onShelf = product.stock_quantity - (product.reserved_quantity || 0);
                const maxPossible = onShelf + item.quantity;
                if (qty > maxPossible) {
                    toast.error(`Only ${maxPossible} units available for ${item.product_name}.`);
                    return item;
                }
            }

            return { ...item, quantity: qty, total_price: item.unit_price * qty };
        }));
    };

    // Remove item
    const removeItem = (index: number) => {
        setItems(prev => prev.filter((_, i) => i !== index));
    };

    // Add product
    const addProduct = (product: any) => {
        const existingIndex = items.findIndex(i => i.product_id === product.id);
        const availOnShelf = product.stock_quantity - (product.reserved_quantity || 0);

        if (existingIndex >= 0) {
            // Check if we can add one more
            const currentItem = items[existingIndex];
            const maxPossible = availOnShelf + currentItem.quantity;
            if (currentItem.quantity + 1 > maxPossible) {
                toast.error(`Out of stock for ${product.name}!`);
                return;
            }
            updateQuantity(existingIndex, 1);
        } else {
            // Check if we can add at least one
            if (availOnShelf < 1) {
                toast.error(`Out of stock for ${product.name}!`);
                return;
            }
            setItems(prev => [...prev, {
                product_id: product.id,
                product_name: product.name,
                quantity: 1,
                unit_price: Number(product.selling_price),
                cost_price: Number(product.cost_price),
                total_price: Number(product.selling_price),
            }]);
        }
        setShowAddProduct(false);
        setSearchQuery('');
    };

    // Filter products for search
    const filteredProducts = useMemo(() => {
        if (!searchQuery.trim()) return products.slice(0, 20);
        const q = searchQuery.toLowerCase();
        return products.filter(p =>
            p.name.toLowerCase().includes(q) ||
            (p.sku && p.sku.toLowerCase().includes(q))
        ).slice(0, 20);
    }, [products, searchQuery]);

    // ─── Update Draft Mutation ───
    const updateDraftMutation = useMutation({
        mutationFn: async () => {
            const itemsPayload = items.map(item => ({
                product_id: item.product_id,
                product_name: item.product_name,
                quantity: item.quantity,
                unit_price: item.unit_price,
                cost_price: item.cost_price,
                total_price: item.unit_price * item.quantity,
            }));

            const { data, error } = await supabase.rpc('update_draft_bill', {
                _bill_id: billId,
                _customer_id: customerId,
                _subtotal: calculations.subtotal,
                _discount_type: 'flat',
                _discount_value: discountValue,
                _discount_amount: calculations.discountAmount,
                _tax_amount: calculations.tax,
                _total_amount: calculations.total,
                _items: itemsPayload,
            } as any);

            if (error) throw error;
            const result = data as any;
            if (!result.success) throw new Error(result.error || 'Failed to update draft');
            return result;
        },
        onSuccess: () => {
            toast.success('Draft updated successfully!');
            invalidateAll();
            onClose();
        },
        onError: (error: Error) => {
            toast.error(`Update failed: ${error.message}`);
        },
    });

    // ─── Finalize Draft Mutation ───
    const finalizeDraftMutation = useMutation({
        mutationFn: async () => {
            // First update the draft with latest items
            const itemsPayload = items.map(item => ({
                product_id: item.product_id,
                product_name: item.product_name,
                quantity: item.quantity,
                unit_price: item.unit_price,
                cost_price: item.cost_price,
                total_price: item.unit_price * item.quantity,
            }));

            const { data: updateData, error: updateError } = await supabase.rpc('update_draft_bill', {
                _bill_id: billId,
                _customer_id: customerId,
                _subtotal: calculations.subtotal,
                _discount_type: 'flat',
                _discount_value: discountValue,
                _discount_amount: calculations.discountAmount,
                _tax_amount: calculations.tax,
                _total_amount: calculations.total,
                _items: itemsPayload,
            } as any);

            if (updateError) throw updateError;
            const updateResult = updateData as any;
            if (!updateResult.success) throw new Error(updateResult.error || 'Failed to update draft before finalization');

            // Then finalize
            const resolvedPaidAmount = paymentType === 'cash'
                ? calculations.total
                : (typeof paidAmount === 'number' ? paidAmount : 0);
            const resolvedDueAmount = Math.max(0, calculations.total - resolvedPaidAmount);
            const resolvedPaymentStatus = paymentType === 'cash' ? 'paid'
                : resolvedDueAmount <= 0 ? 'paid'
                    : resolvedPaidAmount > 0 ? 'partial'
                        : 'unpaid';

            const { data, error } = await supabase.rpc('finalize_draft_bill', {
                _bill_id: billId,
                _payment_type: paymentType,
                _payment_status: resolvedPaymentStatus,
                _paid_amount: resolvedPaidAmount,
                _due_amount: resolvedDueAmount,
                _due_date: (paymentType === 'due' && dueDate) ? dueDate : null,
            } as any);

            if (error) throw error;
            const result = data as any;
            if (!result.success) throw new Error(result.error || 'Failed to finalize draft');
            return result;
        },
        onSuccess: () => {
            toast.success('Bill finalized successfully! Stock updated.');
            invalidateAll();
            onClose();
        },
        onError: (error: Error) => {
            toast.error(`Finalize failed: ${error.message}`);
        },
    });

    // ─── Cancel Draft Mutation ───
    const cancelDraftMutation = useMutation({
        mutationFn: async () => {
            const { data, error } = await supabase.rpc('cancel_draft_bill', {
                _bill_id: billId,
            } as any);
            if (error) throw error;
            const result = data as any;
            if (!result.success) throw new Error(result.error || 'Failed to cancel draft');
            return result;
        },
        onSuccess: () => {
            toast.success('Draft cancelled. Reserved stock has been restored.');
            invalidateAll();
            onClose();
        },
        onError: (error: Error) => {
            toast.error(`Cancel failed: ${error.message}`);
        },
    });

    const invalidateAll = () => {
        queryClient.invalidateQueries({ queryKey: ['bills'] });
        queryClient.invalidateQueries({ queryKey: ['draftBills'] });
        queryClient.invalidateQueries({ queryKey: ['draftBill'] });
        queryClient.invalidateQueries({ queryKey: ['draftBillItems'] });
        queryClient.invalidateQueries({ queryKey: ['products'] });
        queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
    };

    const isLoading = billLoading || itemsLoading;
    const isBusy = updateDraftMutation.isPending || finalizeDraftMutation.isPending || cancelDraftMutation.isPending;
    const isDraft = billData?.status === 'draft';

    if (!open) return null;

    return (
        <>
            <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
                <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
                    {/* Header */}
                    <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 border-b space-y-1.5">
                        <DialogTitle className="flex items-center gap-2 text-lg">
                            <FileText className="h-5 w-5 text-primary" />
                            Draft Order
                            {billData?.bill_number && (
                                <Badge variant="outline" className="ml-2 font-mono text-xs">
                                    {billData.bill_number}
                                </Badge>
                            )}
                            {isDraft && (
                                <Badge className="ml-1 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-[10px]">
                                    DRAFT
                                </Badge>
                            )}
                        </DialogTitle>
                        {billData && (
                            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                                {billData.salesman_name && (
                                    <span className="flex items-center gap-1">
                                        <User className="h-3 w-3" /> {billData.salesman_name}
                                    </span>
                                )}
                                <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" /> {format(new Date(billData.created_at), 'dd/MM/yyyy HH:mm')}
                                </span>
                                {billData.customers?.name && (
                                    <span className="flex items-center gap-1">
                                        <User className="h-3 w-3" /> Customer: {billData.customers.name}
                                    </span>
                                )}
                            </div>
                        )}
                    </DialogHeader>

                    {isLoading ? (
                        <div className="flex-1 flex items-center justify-center py-16">
                            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary" />
                        </div>
                    ) : (
                        <>
                            {/* Items List */}
                            <ScrollArea className="flex-1 min-h-0 px-4 sm:px-6">
                                <div className="py-4 space-y-2">
                                    {/* Customer selector */}
                                    {canFinalize && (
                                        <div className="mb-4">
                                            <Label className="text-xs text-muted-foreground mb-1 block">Customer</Label>
                                            <Select
                                                value={customerId || 'walk-in'}
                                                onValueChange={(val) => setCustomerId(val === 'walk-in' ? null : val)}
                                            >
                                                <SelectTrigger className="h-9">
                                                    <SelectValue placeholder="Walk-in Customer" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="walk-in">Walk-in Customer</SelectItem>
                                                    {customers.map(c => (
                                                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    )}

                                    {/* Items */}
                                    {items.length === 0 ? (
                                        <div className="text-center py-12 text-muted-foreground">
                                            <ShoppingCart className="mx-auto h-10 w-10 mb-3 opacity-40" />
                                            <p>No items in this draft</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-1">
                                            {/* Table header */}
                                            <div className="grid grid-cols-12 gap-2 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold px-2 py-1">
                                                <div className="col-span-5">Product</div>
                                                <div className="col-span-2 text-right">Price</div>
                                                <div className="col-span-3 text-center">Qty</div>
                                                <div className="col-span-2 text-right">Total</div>
                                            </div>

                                            {items.map((item, index) => (
                                                <div
                                                    key={item.product_id + index}
                                                    className="grid grid-cols-12 gap-2 items-center px-2 py-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors group"
                                                >
                                                    <div className="col-span-5 flex items-center gap-2 min-w-0">
                                                        <Package className="h-4 w-4 text-primary shrink-0" />
                                                        <span className="text-sm font-medium truncate">{item.product_name}</span>
                                                    </div>

                                                    <div className="col-span-2 text-right text-sm text-muted-foreground">
                                                        {currencySymbol}{item.unit_price.toFixed(2)}
                                                    </div>

                                                    <div className="col-span-3 flex items-center justify-center gap-1">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-6 w-6"
                                                            onClick={() => updateQuantity(index, -1)}
                                                            disabled={item.quantity <= 1 || isBusy}
                                                        >
                                                            <Minus className="h-3 w-3" />
                                                        </Button>
                                                        <Input
                                                            type="number"
                                                            value={item.quantity}
                                                            onChange={(e) => setExactQuantity(index, parseInt(e.target.value) || 1)}
                                                            className="h-7 w-12 text-center text-sm font-bold px-1 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                                            disabled={isBusy}
                                                        />
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-6 w-6"
                                                            onClick={() => updateQuantity(index, 1)}
                                                            disabled={isBusy}
                                                        >
                                                            <Plus className="h-3 w-3" />
                                                        </Button>
                                                    </div>

                                                    <div className="col-span-2 flex items-center justify-end gap-1">
                                                        <span className="text-sm font-semibold">
                                                            {currencySymbol}{(item.unit_price * item.quantity).toFixed(2)}
                                                        </span>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-6 w-6 opacity-0 group-hover:opacity-100 text-destructive"
                                                            onClick={() => removeItem(index)}
                                                            disabled={isBusy}
                                                        >
                                                            <Trash2 className="h-3 w-3" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Add product button */}
                                    {!showAddProduct ? (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="w-full mt-3 text-xs border-dashed"
                                            onClick={() => setShowAddProduct(true)}
                                            disabled={isBusy}
                                        >
                                            <Plus className="h-3 w-3 mr-1" /> Add Product
                                        </Button>
                                    ) : (
                                        <div className="mt-3 border rounded-lg p-3 space-y-2 bg-muted/20">
                                            <div className="relative">
                                                <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
                                                <Input
                                                    placeholder="Search products..."
                                                    value={searchQuery}
                                                    onChange={(e) => setSearchQuery(e.target.value)}
                                                    className="pl-8 h-8 text-sm"
                                                    autoFocus
                                                />
                                            </div>
                                            <div className="max-h-[400px] overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                                                {filteredProducts.map(product => {
                                                    const avail = product.stock_quantity - (product.reserved_quantity || 0);
                                                    return (
                                                        <button
                                                            key={product.id}
                                                            onClick={() => addProduct(product)}
                                                            disabled={avail <= 0}
                                                            className={cn(
                                                                'w-full flex items-center justify-between px-3 py-2.5 rounded-md text-left text-sm transition-colors border border-transparent hover:border-primary/20',
                                                                avail <= 0 ? 'opacity-40 cursor-not-allowed' : 'hover:bg-accent'
                                                            )}
                                                        >
                                                            <div className="flex flex-col min-w-0">
                                                                <span className="truncate font-semibold">{product.name}</span>
                                                                {product.sku && (
                                                                    <span className="text-[10px] text-muted-foreground font-mono">SKU: {product.sku}</span>
                                                                )}
                                                            </div>
                                                            <div className="flex items-center gap-3 shrink-0 ml-2">
                                                                <div className="text-right">
                                                                    <div className="text-xs font-bold">{currencySymbol}{Number(product.selling_price).toFixed(2)}</div>
                                                                    <div className={cn(
                                                                        'text-[10px] font-medium',
                                                                        avail <= product.low_stock_threshold ? 'text-destructive' : 'text-green-600'
                                                                    )}>
                                                                        {avail} in stock
                                                                    </div>
                                                                </div>
                                                                <Plus className="h-4 w-4 text-primary" />
                                                            </div>
                                                        </button>
                                                    );
                                                })}
                                                {filteredProducts.length === 0 && (
                                                    <div className="py-8 text-center text-muted-foreground text-xs italic">
                                                        No products found matching "{searchQuery}"
                                                    </div>
                                                )}
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="w-full text-xs"
                                                onClick={() => { setShowAddProduct(false); setSearchQuery(''); }}
                                            >
                                                Cancel
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </ScrollArea>

                            {/* Footer: Totals + Actions */}
                            <div className="border-t bg-card px-4 sm:px-6 py-3 space-y-3">
                                {/* Totals */}
                                <div className="space-y-1 text-sm">
                                    <div className="flex justify-between text-muted-foreground">
                                        <span>Subtotal ({items.reduce((s, i) => s + i.quantity, 0)} items)</span>
                                        <span>{currencySymbol}{calculations.subtotal.toFixed(2)}</span>
                                    </div>
                                    {discountValue > 0 && (
                                        <div className="flex justify-between text-orange-600">
                                            <span>Discount</span>
                                            <span>-{currencySymbol}{calculations.discountAmount.toFixed(2)}</span>
                                        </div>
                                    )}
                                    {calculations.showGst && calculations.tax > 0 && (
                                        <div className="flex justify-between text-muted-foreground">
                                            <span>Tax ({settings?.tax_rate || 0}%)</span>
                                            <span>+{currencySymbol}{calculations.tax.toFixed(2)}</span>
                                        </div>
                                    )}
                                    <Separator />
                                    <div className="flex justify-between font-bold text-base">
                                        <span>Total</span>
                                        <span className="text-primary">{currencySymbol}{calculations.total.toFixed(2)}</span>
                                    </div>
                                </div>

                                {/* Discount input (admin/manager only) */}
                                {canFinalize && (
                                    <div className="flex items-center gap-2">
                                        <Label className="text-xs whitespace-nowrap">Discount:</Label>
                                        <Input
                                            type="number"
                                            value={discountValue || ''}
                                            onChange={(e) => setDiscountValue(Number(e.target.value) || 0)}
                                            className="h-8 w-24 text-sm"
                                            placeholder="0"
                                            disabled={isBusy}
                                        />
                                    </div>
                                )}

                                {/* Payment fields (shown only when finalizing) */}
                                {canFinalize && confirmFinalize && (
                                    <div className="space-y-2 p-3 border rounded-lg bg-muted/20">
                                        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Payment Details</Label>
                                        <div className="flex gap-2">
                                            <Button
                                                variant={paymentType === 'cash' ? 'default' : 'outline'}
                                                size="sm"
                                                className="flex-1"
                                                onClick={() => setPaymentType('cash')}
                                            >
                                                💵 Cash
                                            </Button>
                                            <Button
                                                variant={paymentType === 'due' ? 'default' : 'outline'}
                                                size="sm"
                                                className="flex-1"
                                                onClick={() => setPaymentType('due')}
                                            >
                                                📋 Due
                                            </Button>
                                        </div>
                                        {paymentType === 'due' && (
                                            <div className="grid grid-cols-2 gap-2">
                                                <div>
                                                    <Label className="text-xs">Paid Now</Label>
                                                    <Input
                                                        type="number"
                                                        value={paidAmount}
                                                        onChange={(e) => setPaidAmount(Number(e.target.value) || '')}
                                                        className="h-8 text-sm"
                                                        placeholder="0"
                                                    />
                                                </div>
                                                <div>
                                                    <Label className="text-xs">Due Date</Label>
                                                    <Input
                                                        type="date"
                                                        value={dueDate}
                                                        onChange={(e) => setDueDate(e.target.value)}
                                                        className="h-8 text-sm"
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Action buttons */}
                                <div className="flex flex-wrap gap-2">
                                    {/* Cancel Draft */}
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="text-destructive border-destructive/30 hover:bg-destructive/10"
                                        onClick={() => setConfirmCancel(true)}
                                        disabled={isBusy}
                                    >
                                        <XCircle className="h-3.5 w-3.5 mr-1" />
                                        Cancel Draft
                                    </Button>

                                    <div className="flex-1" />

                                    {/* Save Changes */}
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => updateDraftMutation.mutate()}
                                        disabled={isBusy || items.length === 0}
                                    >
                                        Save Changes
                                    </Button>

                                    {/* Finalize (admin/manager only) */}
                                    {canFinalize && !confirmFinalize && (
                                        <Button
                                            size="sm"
                                            className="bg-green-600 hover:bg-green-700 text-white"
                                            onClick={() => setConfirmFinalize(true)}
                                            disabled={isBusy || items.length === 0}
                                        >
                                            <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                                            Finalize Bill
                                        </Button>
                                    )}

                                    {canFinalize && confirmFinalize && (
                                        <>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setConfirmFinalize(false)}
                                                disabled={isBusy}
                                            >
                                                Back
                                            </Button>
                                            <Button
                                                size="sm"
                                                className="bg-green-600 hover:bg-green-700 text-white"
                                                onClick={() => finalizeDraftMutation.mutate()}
                                                disabled={isBusy || items.length === 0}
                                            >
                                                <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                                                {finalizeDraftMutation.isPending ? 'Finalizing...' : 'Confirm & Finalize'}
                                            </Button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>

            {/* Cancel confirmation */}
            <AlertDialog open={confirmCancel} onOpenChange={setConfirmCancel}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                            <AlertCircle className="h-5 w-5 text-destructive" />
                            Cancel Draft Order?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            This will cancel the draft and restore all reserved stock. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isBusy}>Keep Draft</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => cancelDraftMutation.mutate()}
                            disabled={isBusy}
                        >
                            {cancelDraftMutation.isPending ? 'Cancelling...' : 'Yes, Cancel Draft'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
