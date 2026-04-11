// @ts-nocheck
/**
 * pages/PurchaseOrderDetail.tsx — Create / View / Receive a Purchase Order
 *
 * Route: /purchase-order/new  → create mode
 * Route: /purchase-order/:id  → view + receive mode
 *
 * Flow:
 *  1. Select supplier (optional)
 *  2. Add products + quantity + cost price
 *  3. Save as draft or mark as "Ordered"
 *  4. On "Mark Received" → calls receive_purchase_order RPC → stock increments
 */
import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useBusinessSettings } from '@/hooks/useBusinessSettings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import {
  ArrowLeft, Plus, Trash2, Search, Package, CheckCircle2,
  Truck, X, Save, ShoppingBag,
} from 'lucide-react';
import { format } from 'date-fns';

interface POItem {
  id?: string;
  product_id: string | null;
  product_name: string;
  quantity: number;
  cost_price: number;
  unit_type: 'pcs' | 'case';
  items_per_case: number;
}

interface Product {
  id: string;
  name: string;
  cost_price: number | null;
  selling_price: number | null;
  stock_quantity: number;
  sku: string | null;
  items_per_case: number | null;
}

const STATUS_CONFIG = {
  draft:     { label: 'Draft',     color: 'bg-yellow-100 text-yellow-800' },
  ordered:   { label: 'Ordered',   color: 'bg-blue-100 text-blue-800' },
  received:  { label: 'Received',  color: 'bg-green-100 text-green-800' },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-800' },
};

function generatePONumber() {
  const now = new Date();
  return `PO-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 9000) + 1000)}`;
}

export default function PurchaseOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const isNew = id === 'new';
  const navigate = useNavigate();
  const { businessId, user } = useAuth();
  const { data: settings } = useBusinessSettings();
  const qc = useQueryClient();
  const currencySymbol = settings?.currency_symbol || '₹';

  // ── Form state ────────────────────────────────────────
  const [supplierId, setSupplierId] = useState<string>('none');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<POItem[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmReceive, setConfirmReceive] = useState(false);
  const [poNumber, setPoNumber] = useState(generatePONumber());

  // ── Load existing order ───────────────────────────────
  const { data: order, isLoading: orderLoading } = useQuery({
    queryKey: ['purchase-order', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('purchase_orders')
        .select('*, suppliers(id, name), purchase_order_items(*)')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !isNew && !!id,
  });

  useEffect(() => {
    if (order) {
      setSupplierId(order.supplier_id || 'none');
      setNotes(order.notes || '');
      setPoNumber(order.order_number);
      setItems((order.purchase_order_items || []).map(i => ({
        id: i.id,
        product_id: i.product_id,
        product_name: i.product_name,
        quantity: Number(i.quantity),
        cost_price: Number(i.cost_price),
        unit_type: (i.unit_type as 'pcs' | 'case') || 'pcs',
        items_per_case: Number(i.items_per_case || 0),
      })));
    }
  }, [order]);

  // ── Suppliers list ────────────────────────────────────
  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers', businessId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('suppliers')
        .select('id, name')
        .eq('business_id', businessId)
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: !!businessId,
  });

  // ── Products list ─────────────────────────────────────
  const { data: products = [] } = useQuery({
    queryKey: ['products-for-po', businessId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, cost_price, selling_price, stock_quantity, sku, items_per_case')
        .eq('business_id', businessId)
        .order('name');
      if (error) throw error;
      return data as Product[];
    },
    enabled: !!businessId,
  });

  const filteredProducts = useMemo(() => {
    const q = productSearch.toLowerCase();
    return products.filter(p =>
      p.name.toLowerCase().includes(q) ||
      (p.sku || '').toLowerCase().includes(q)
    ).slice(0, 20);
  }, [products, productSearch]);

  const getEffectiveQty = (item: POItem) => {
    if (item.unit_type === 'case' && item.items_per_case > 0) {
      return item.quantity * item.items_per_case;
    }
    return item.quantity;
  };

  const totalAmount = useMemo(() =>
    items.reduce((s, i) => s + getEffectiveQty(i) * i.cost_price, 0),
  [items]);

  // ── Add a product row ─────────────────────────────────
  const addProduct = (p: Product) => {
    const exists = items.findIndex(i => i.product_id === p.id);
    if (exists >= 0) {
      setItems(prev => prev.map((item, idx) =>
        idx === exists ? { ...item, quantity: item.quantity + 1 } : item
      ));
    } else {
      setItems(prev => [...prev, {
        product_id: p.id,
        product_name: p.name,
        quantity: 1,
        cost_price: Number(p.cost_price || p.selling_price || 0),
        unit_type: 'pcs' as const,
        items_per_case: Number(p.items_per_case || 0),
      }]);
    }
    setProductSearch('');
    setShowProductSearch(false);
  };

  const removeItem = (idx: number) => setItems(prev => prev.filter((_, i) => i !== idx));

  const updateItem = (idx: number, field: 'quantity' | 'cost_price', value: number) => {
    setItems(prev => prev.map((item, i) =>
      i === idx ? { ...item, [field]: Math.max(0, value) } : item
    ));
  };

  const updateUnitType = (idx: number, unitType: 'pcs' | 'case') => {
    setItems(prev => prev.map((item, i) =>
      i === idx ? { ...item, unit_type: unitType } : item
    ));
  };

  // ── Save order ────────────────────────────────────────
  const saveOrder = async (newStatus: 'draft' | 'ordered') => {
    if (items.length === 0) { toast.error('Add at least one product'); return; }
    setSaving(true);
    try {
      const payload = {
        business_id: businessId,
        supplier_id: supplierId === 'none' ? null : supplierId,
        order_number: poNumber,
        status: newStatus,
        notes: notes || null,
        total_amount: totalAmount,
        ordered_at: newStatus === 'ordered' ? new Date().toISOString() : null,
        created_by: user?.id,
      };

      let orderId = id;

      if (isNew) {
        const { data, error } = await supabase
          .from('purchase_orders')
          .insert(payload)
          .select('id')
          .single();
        if (error) throw error;
        orderId = data.id;
      } else {
        const { error } = await supabase
          .from('purchase_orders')
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq('id', id);
        if (error) throw error;

        // Delete old items and re-insert
        await supabase.from('purchase_order_items').delete().eq('purchase_order_id', id);
      }

      // Insert items
      const itemPayload = items.map(i => ({
        purchase_order_id: orderId,
        product_id: i.product_id,
        product_name: i.product_name,
        quantity: i.unit_type === 'case' && i.items_per_case > 0 ? i.quantity * i.items_per_case : i.quantity,
        cost_price: i.cost_price,
        unit_type: i.unit_type || 'pcs',
        items_per_case: i.items_per_case || 0,
      }));
      const { error: itemErr } = await supabase.from('purchase_order_items').insert(itemPayload);
      if (itemErr) throw itemErr;

      qc.invalidateQueries({ queryKey: ['purchase-orders', businessId] });
      toast.success(newStatus === 'ordered' ? 'Order placed!' : 'Draft saved');
      navigate(`/purchase-order/${orderId}`);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  // ── Receive order ─────────────────────────────────────
  const receiveMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('receive_purchase_order', {
        p_purchase_order_id: id,
        p_user_id: user?.id,
      });
      if (error) throw error;
      const result = data as any;
      if (!result.success) throw new Error(result.error);
      return result;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['purchase-order', id] });
      qc.invalidateQueries({ queryKey: ['purchase-orders', businessId] });
      qc.invalidateQueries({ queryKey: ['products', businessId] });
      qc.invalidateQueries({ queryKey: ['reports-products', businessId] });
      toast.success('Stock updated! All items marked as received.');
      setConfirmReceive(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const isReadOnly = !isNew && order && (order.status === 'received' || order.status === 'cancelled');
  const canReceive = !isNew && order && (order.status === 'draft' || order.status === 'ordered');

  if (!isNew && orderLoading) {
    return <div className="p-8 text-center text-muted-foreground">Loading purchase order...</div>;
  }

  return (
    <div className="space-y-5 p-4 md:p-6 lg:p-8 max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate('/purchases')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="spos-page-heading">{isNew ? 'New Purchase Order' : `PO #${poNumber}`}</h1>
            {order?.status && (
              <Badge className={`${STATUS_CONFIG[order.status]?.color} text-xs`} variant="outline">
                {STATUS_CONFIG[order.status]?.label}
              </Badge>
            )}
          </div>
          {!isNew && order?.received_at && (
            <p className="spos-page-subhead" style={{ marginBottom: 0 }}>
              Received on {format(new Date(order.received_at), 'dd MMM yyyy HH:mm')}
            </p>
          )}
        </div>
        {canReceive && (
          <Button
            className="bg-green-600 hover:bg-green-700 text-white gap-2 shrink-0"
            onClick={() => setConfirmReceive(true)}
          >
            <CheckCircle2 className="h-4 w-4" />
            Mark Received
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: Supplier + Notes */}
        <Card className="lg:col-span-1 h-fit">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Order Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-xs font-medium">PO Number</Label>
              <Input
                value={poNumber}
                onChange={e => setPoNumber(e.target.value)}
                className="mt-1 font-mono"
                readOnly={isReadOnly}
              />
            </div>
            <div>
              <Label className="text-xs font-medium">Supplier</Label>
              <Select value={supplierId} onValueChange={setSupplierId} disabled={isReadOnly}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select supplier (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No supplier</SelectItem>
                  {suppliers.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!isReadOnly && (
                <button
                  className="text-xs text-primary mt-1 hover:underline"
                  onClick={() => navigate('/suppliers')}
                  type="button"
                >
                  + Add new supplier
                </button>
              )}
            </div>
            <div>
              <Label className="text-xs font-medium">Notes</Label>
              <Textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Any special instructions..."
                rows={3}
                className="mt-1 text-sm"
                readOnly={isReadOnly}
              />
            </div>
          </CardContent>
        </Card>

        {/* Right: Items */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Products ({items.length})
                </CardTitle>
                {!isReadOnly && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs gap-1"
                    onClick={() => setShowProductSearch(true)}
                  >
                    <Plus className="h-3.5 w-3.5" />Add Product
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {/* Product search dropdown */}
              {showProductSearch && (
                <div className="p-3 border-b bg-muted/30">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search products to add..."
                      value={productSearch}
                      onChange={e => setProductSearch(e.target.value)}
                      className="pl-9 h-9"
                      autoFocus
                    />
                    <button
                      onClick={() => { setShowProductSearch(false); setProductSearch(''); }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  {productSearch && (
                    <div className="mt-2 border rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                      {filteredProducts.length === 0 ? (
                        <p className="text-xs text-muted-foreground p-3 text-center">No products found</p>
                      ) : filteredProducts.map(p => (
                        <button
                          key={p.id}
                          className="w-full text-left px-3 py-2 hover:bg-muted flex items-center justify-between group text-sm border-b last:border-0"
                          onClick={() => addProduct(p)}
                        >
                          <div>
                            <span className="font-medium">{p.name}</span>
                            {p.sku && <span className="text-xs text-muted-foreground ml-2">{p.sku}</span>}
                          </div>
                          <div className="text-right shrink-0 ml-2">
                            <p className="text-xs text-muted-foreground">Stock: {p.stock_quantity}</p>
                            <p className="text-xs font-medium">{currencySymbol}{p.cost_price || 0}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {items.length === 0 ? (
                <div className="p-8 text-center space-y-2">
                  <Package className="h-10 w-10 mx-auto text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">No products added yet</p>
                  {!isReadOnly && (
                    <Button variant="outline" size="sm" onClick={() => setShowProductSearch(true)}>
                      <Plus className="mr-2 h-3.5 w-3.5" />Add Products
                    </Button>
                  )}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead className="w-28 text-center">Qty</TableHead>
                      <TableHead className="w-28 text-center">Unit</TableHead>
                      <TableHead className="w-32 text-right">Cost Price</TableHead>
                      <TableHead className="w-28 text-right">Total</TableHead>
                      {!isReadOnly && <TableHead className="w-10" />}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                              <Package className="h-3.5 w-3.5 text-primary" />
                            </div>
                            <span className="text-sm font-medium">{item.product_name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          {isReadOnly ? (
                            <span className="font-medium">{item.quantity}</span>
                          ) : (
                            <Input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={e => updateItem(idx, 'quantity', Number(e.target.value))}
                              className="h-7 w-20 text-center text-sm mx-auto"
                            />
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {isReadOnly ? (
                            <span className="text-xs font-medium uppercase">{item.unit_type || 'pcs'}</span>
                          ) : item.items_per_case > 0 ? (
                            <Select
                              value={item.unit_type || 'pcs'}
                              onValueChange={(v) => updateUnitType(idx, v as 'pcs' | 'case')}
                            >
                              <SelectTrigger className="h-7 w-24 text-xs mx-auto">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pcs">PCS</SelectItem>
                                <SelectItem value="case">Case ({item.items_per_case})</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <span className="text-xs text-muted-foreground">PCS</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {isReadOnly ? (
                            <span>{currencySymbol}{item.cost_price.toFixed(2)}</span>
                          ) : (
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.cost_price}
                              onChange={e => updateItem(idx, 'cost_price', Number(e.target.value))}
                              className="h-7 w-28 text-right text-sm ml-auto"
                            />
                          )}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-sm">
                          {currencySymbol}{(getEffectiveQty(item) * item.cost_price).toFixed(2)}
                          {item.unit_type === 'case' && item.items_per_case > 0 && (
                            <p className="text-[10px] font-normal text-muted-foreground">
                              {getEffectiveQty(item)} pcs
                            </p>
                          )}
                        </TableCell>
                        {!isReadOnly && (
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => removeItem(idx)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Total + Action buttons */}
          <div className="flex flex-col sm:flex-row items-end justify-between gap-3">
            <div className="w-full sm:w-auto rounded-xl border bg-muted/40 px-5 py-3 space-y-1">
              <p className="text-xs text-muted-foreground">Order Total</p>
              <p className="text-2xl font-black text-primary">
                {currencySymbol}{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            {!isReadOnly && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => saveOrder('draft')}
                  disabled={saving || items.length === 0}
                  size="sm"
                >
                  <Save className="mr-2 h-3.5 w-3.5" />
                  Save Draft
                </Button>
                <Button
                  onClick={() => saveOrder('ordered')}
                  disabled={saving || items.length === 0}
                  size="sm"
                  className="gap-2"
                >
                  <Truck className="h-3.5 w-3.5" />
                  {saving ? 'Saving...' : 'Place Order'}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirm Receive Dialog */}
      <AlertDialog open={confirmReceive} onOpenChange={setConfirmReceive}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Stock Receipt</AlertDialogTitle>
            <AlertDialogDescription>
              This will add stock quantities to all products in this order and mark it as received.
              This action <strong>cannot be undone</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="my-2 rounded-lg border bg-muted/40 p-3 space-y-1.5">
            {items.map((item, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="font-medium">{item.product_name}</span>
                <Badge variant="secondary">+{getEffectiveQty(item)} units</Badge>
              </div>
            ))}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-green-600 hover:bg-green-700"
              onClick={() => receiveMutation.mutate()}
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Confirm Receipt
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
