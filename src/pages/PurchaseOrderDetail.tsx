// @ts-nocheck
/**
 * pages/PurchaseOrderDetail.tsx — Create / View / Receive a Purchase Order
 *
 * Google Sheets-style inline editing with AI bill scanning.
 */
import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
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
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  ArrowLeft, Plus, Trash2, Search, Package, CheckCircle2,
  Truck, X, Save, Camera, Sparkles, Loader2, Upload, PlusCircle,
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface POItem {
  id?: string;
  product_id: string | null;
  product_name: string;
  mrp_price: number;
  selling_price: number;
  cost_price: number;
  wholesale_price: number;
  items_per_case: number;
  cases: number;
  stock: number;
}

interface Product {
  id: string;
  name: string;
  mrp_price: number | null;
  cost_price: number | null;
  selling_price: number | null;
  wholesale_price: number | null;
  stock_quantity: number;
  sku: string | null;
  items_per_case: number | null;
}

type POField = 'product_name' | 'mrp_price' | 'selling_price' | 'cost_price' | 'wholesale_price' | 'items_per_case' | 'cases' | 'stock';

const PO_COLUMNS: { key: POField; label: string; type: 'text' | 'number'; width: string; align: string }[] = [
  { key: 'product_name',  label: 'Product Name',   type: 'text',   width: 'min-w-[180px]', align: 'text-left' },
  { key: 'mrp_price',     label: 'MRP',             type: 'number', width: 'min-w-[90px]',  align: 'text-right' },
  { key: 'selling_price', label: 'Selling Price',   type: 'number', width: 'min-w-[100px]', align: 'text-right' },
  { key: 'cost_price',    label: 'Cost Price',      type: 'number', width: 'min-w-[90px]',  align: 'text-right' },
  { key: 'wholesale_price', label: 'Wholesale',     type: 'number', width: 'min-w-[90px]',  align: 'text-right' },
  { key: 'items_per_case', label: 'PCS/Case',       type: 'number', width: 'min-w-[80px]',  align: 'text-center' },
  { key: 'cases',         label: 'Cases',            type: 'number', width: 'min-w-[80px]',  align: 'text-center' },
  { key: 'stock',         label: 'Stock',            type: 'number', width: 'min-w-[80px]',  align: 'text-center' },
];

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

  // ── Spreadsheet state ─────────────────────────────────
  const [activeCell, setActiveCell] = useState<{ row: number; col: number } | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null);
  const tableRef = useRef<HTMLTableElement>(null);

  // ── New product dialog state ──────────────────────────
  const [showNewProduct, setShowNewProduct] = useState(false);
  const [newProductSaving, setNewProductSaving] = useState(false);

  // ── AI Scan state ─────────────────────────────────────
  const [showAIScan, setShowAIScan] = useState(false);
  const [aiScanning, setAiScanning] = useState(false);
  const [scanPreview, setScanPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      setItems((order.purchase_order_items || []).map(i => {
        const ppc = Number(i.items_per_case || 0);
        const qty = Number(i.quantity);
        return {
          id: i.id,
          product_id: i.product_id,
          product_name: i.product_name,
          mrp_price: Number(i.mrp_price || 0),
          selling_price: Number(i.selling_price || 0),
          cost_price: Number(i.cost_price),
          wholesale_price: Number(i.wholesale_price || 0),
          items_per_case: ppc,
          cases: ppc > 0 ? Math.round((qty / ppc) * 100) / 100 : 0,
          stock: qty,
        };
      }));
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
        .select('id, name, mrp_price, cost_price, selling_price, wholesale_price, stock_quantity, sku, items_per_case')
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

  const totalAmount = useMemo(() =>
    items.reduce((s, i) => s + i.stock * i.cost_price, 0),
  [items]);

  // ── Add a product row ─────────────────────────────────
  const addProduct = (p: Product) => {
    const exists = items.findIndex(i => i.product_id === p.id);
    if (exists >= 0) {
      setItems(prev => prev.map((item, idx) =>
        idx === exists ? { ...item, stock: item.stock + 1, cases: item.items_per_case > 0 ? Math.round(((item.stock + 1) / item.items_per_case) * 100) / 100 : 0 } : item
      ));
    } else {
      const ppc = Number(p.items_per_case || 0);
      setItems(prev => [...prev, {
        product_id: p.id,
        product_name: p.name,
        mrp_price: Number(p.mrp_price || 0),
        selling_price: Number(p.selling_price || 0),
        cost_price: Number(p.cost_price || p.selling_price || 0),
        wholesale_price: Number(p.wholesale_price || 0),
        items_per_case: ppc,
        cases: ppc > 0 ? Math.round((1 / ppc) * 100) / 100 : 0,
        stock: 1,
      }]);
    }
    setProductSearch('');
    setShowProductSearch(false);
  };

  const addBlankRow = () => {
    setItems(prev => [...prev, {
      product_id: null,
      product_name: '',
      mrp_price: 0,
      selling_price: 0,
      cost_price: 0,
      wholesale_price: 0,
      items_per_case: 0,
      cases: 0,
      stock: 0,
    }]);
    // Focus on the product name cell of new row
    setTimeout(() => startEdit(items.length, 0), 50);
  };

  const removeItem = (idx: number) => {
    setItems(prev => prev.filter((_, i) => i !== idx));
    setActiveCell(null);
  };

  // ── Spreadsheet cell editing ──────────────────────────
  const getCellValue = useCallback((item: POItem, field: POField) => {
    return item[field];
  }, []);

  const startEdit = useCallback((row: number, col: number) => {
    const item = items[row];
    if (!item) return;
    const field = PO_COLUMNS[col].key;
    const val = getCellValue(item, field);
    setActiveCell({ row, col });
    setEditValue(val === null || val === undefined ? '' : String(val));
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [items, getCellValue]);

  const commitEdit = useCallback(() => {
    if (!activeCell) return;
    const { row, col } = activeCell;
    const field = PO_COLUMNS[col].key;
    const colDef = PO_COLUMNS[col];

    setItems(prev => prev.map((item, i) => {
      if (i !== row) return item;
      const updated = { ...item };

      if (colDef.type === 'number') {
        let num = editValue === '' ? 0 : Number(editValue);
        if (isNaN(num)) num = 0;
        (updated as any)[field] = Math.max(0, num);
      } else {
        (updated as any)[field] = editValue.trim();
      }

      // Sync cases <-> stock
      if (field === 'cases' && updated.items_per_case > 0) {
        updated.stock = Math.round((updated.cases * updated.items_per_case) * 100) / 100;
      } else if (field === 'stock' && updated.items_per_case > 0) {
        updated.cases = Math.round((updated.stock / updated.items_per_case) * 100) / 100;
      } else if (field === 'items_per_case' && updated.items_per_case > 0) {
        updated.cases = Math.round((updated.stock / updated.items_per_case) * 100) / 100;
      }

      return updated;
    }));
  }, [activeCell, editValue]);

  const cancelEdit = useCallback(() => {
    setActiveCell(null);
    setEditValue('');
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!activeCell) return;
    const { row, col } = activeCell;

    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      commitEdit();
      if (e.key === 'Tab' && e.shiftKey) {
        const newCol = col > 0 ? col - 1 : PO_COLUMNS.length - 1;
        const newRow = col > 0 ? row : Math.max(0, row - 1);
        startEdit(newRow, newCol);
      } else if (e.key === 'Tab') {
        const newCol = col < PO_COLUMNS.length - 1 ? col + 1 : 0;
        const newRow = col < PO_COLUMNS.length - 1 ? row : Math.min(items.length - 1, row + 1);
        startEdit(newRow, newCol);
      } else {
        if (row < items.length - 1) startEdit(row + 1, col);
        else cancelEdit();
      }
    } else if (e.key === 'Escape') {
      cancelEdit();
    } else if (e.key === 'ArrowUp' && e.altKey) {
      e.preventDefault();
      commitEdit();
      if (row > 0) startEdit(row - 1, col);
    } else if (e.key === 'ArrowDown' && e.altKey) {
      e.preventDefault();
      commitEdit();
      if (row < items.length - 1) startEdit(row + 1, col);
    } else if (e.key === 'Delete' && e.ctrlKey) {
      e.preventDefault();
      removeItem(row);
    }
  }, [activeCell, commitEdit, cancelEdit, startEdit, items.length, removeItem]);

  const handleCellBlur = useCallback(() => {
    commitEdit();
    setTimeout(() => {
      setActiveCell(prev => prev);
    }, 100);
  }, [commitEdit]);

  // ── New product creation ──────────────────────────────
  const handleCreateProduct = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setNewProductSaving(true);
    try {
      const fd = new FormData(e.currentTarget);
      const payload = {
        business_id: businessId,
        name: String(fd.get('name')).trim(),
        mrp_price: Number(fd.get('mrp_price')) || 0,
        selling_price: Number(fd.get('selling_price')) || 0,
        cost_price: Number(fd.get('cost_price')) || 0,
        wholesale_price: Number(fd.get('wholesale_price')) || 0,
        items_per_case: Number(fd.get('items_per_case')) || 0,
        stock_quantity: Number(fd.get('stock_quantity')) || 0,
      };
      if (!payload.name) { toast.error('Product name is required'); return; }

      const { data, error } = await supabase
        .from('products')
        .insert(payload)
        .select('id, name, mrp_price, cost_price, selling_price, wholesale_price, stock_quantity, sku, items_per_case')
        .single();
      if (error) throw error;

      qc.invalidateQueries({ queryKey: ['products-for-po', businessId] });
      qc.invalidateQueries({ queryKey: ['products', businessId] });

      // Auto-add to PO
      addProduct(data as Product);
      setShowNewProduct(false);
      toast.success(`"${payload.name}" created & added to order`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setNewProductSaving(false);
    }
  };

  // ── AI Bill Scan ──────────────────────────────────────
  const validateFile = (file: File): string | null => {
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) return 'File is too large. Max 10MB.';
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];
    if (!allowed.includes(file.type)) return 'Unsupported file type. Use JPG, PNG, WebP or PDF.';
    return null;
  };

  const handleAIScan = async (file: File) => {
    const validationErr = validateFile(file);
    if (validationErr) { toast.error(validationErr); return; }

    setAiScanning(true);
    // Show preview for images, placeholder for PDF
    if (file.type === 'application/pdf') {
      setScanPreview('pdf');
    } else {
      setScanPreview(URL.createObjectURL(file));
    }

    try {
      // Convert to base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
      });

      // Call Supabase Edge Function for AI processing
      const { data, error } = await supabase.functions.invoke('scan-purchase-bill', {
        body: { image: base64, business_id: businessId },
      });

      if (error) {
        // If edge function doesn't exist or network issue, give helpful message
        if (error.message?.includes('Failed to send') || error.message?.includes('FunctionsFetchError')) {
          throw new Error(
            'Edge Function not deployed yet. Run:\n' +
            '1. supabase secrets set GEMINI_API_KEY=your_key\n' +
            '2. supabase functions deploy scan-purchase-bill'
          );
        }
        throw error;
      }

      // Handle error returned from the function itself
      if (data?.error) {
        throw new Error(data.error);
      }

      if (data?.items && Array.isArray(data.items) && data.items.length > 0) {
        const newItems: POItem[] = data.items.map((scanned: any) => {
          // Try to match with existing products
          const scannedName = String(scanned.name || '').toLowerCase().trim();
          const match = products.find(p => {
            const pName = p.name.toLowerCase().trim();
            return pName === scannedName ||
              pName.includes(scannedName) ||
              scannedName.includes(pName);
          });
          const ppc = Number(scanned.items_per_case || match?.items_per_case || 0);
          const stock = Number(scanned.quantity || scanned.stock || 1);
          return {
            product_id: match?.id || null,
            product_name: scanned.name || match?.name || 'Unknown Product',
            mrp_price: Number(scanned.mrp_price || scanned.mrp || match?.mrp_price || 0),
            selling_price: Number(scanned.selling_price || match?.selling_price || 0),
            cost_price: Number(scanned.cost_price || scanned.price || match?.cost_price || 0),
            wholesale_price: Number(scanned.wholesale_price || match?.wholesale_price || 0),
            items_per_case: ppc,
            cases: ppc > 0 ? Math.round((stock / ppc) * 100) / 100 : 0,
            stock,
          };
        });
        setItems(prev => [...prev, ...newItems]);
        const matched = newItems.filter(i => i.product_id).length;
        toast.success(
          `AI detected ${newItems.length} product(s)` +
          (matched > 0 ? ` (${matched} matched existing)` : '') +
          ' — please review & adjust'
        );
      } else {
        toast.info(data?.message || 'No products detected. Try a clearer photo or different angle.');
      }
    } catch (err: any) {
      console.error('AI Scan error:', err);
      toast.error(err.message || 'AI scan failed. Please try again.');
    } finally {
      setAiScanning(false);
      setShowAIScan(false);
      setScanPreview(null);
    }
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
        quantity: i.stock,
        cost_price: i.cost_price,
        mrp_price: i.mrp_price,
        selling_price: i.selling_price,
        wholesale_price: i.wholesale_price,
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
    <div className="flex flex-col h-full p-4 md:p-6 lg:p-8" style={{ gap: 16 }}>
      {/* ── Header ─────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => navigate('/purchases')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="spos-page-heading" style={{ marginBottom: 0 }}>
                {isNew ? 'New Purchase Order' : `PO #${poNumber}`}
              </h1>
              {order?.status && (
                <Badge className={`${STATUS_CONFIG[order.status]?.color} text-xs`} variant="outline">
                  {STATUS_CONFIG[order.status]?.label}
                </Badge>
              )}
            </div>
            <p className="spos-page-subhead" style={{ marginBottom: 0 }}>
              {isNew ? 'Click any cell to edit — like a spreadsheet' : order?.received_at
                ? `Received on ${format(new Date(order.received_at), 'dd MMM yyyy HH:mm')}`
                : 'Click any cell to edit'}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canReceive && (
            <Button className="bg-green-600 hover:bg-green-700 text-white gap-2" size="sm"
              onClick={() => setConfirmReceive(true)}>
              <CheckCircle2 className="h-3.5 w-3.5" /> Mark Received
            </Button>
          )}
          {!isReadOnly && (
            <>
              <Button variant="outline" size="sm" onClick={() => saveOrder('draft')}
                disabled={saving || items.length === 0}>
                <Save className="mr-1.5 h-3.5 w-3.5" /> Save Draft
              </Button>
              <Button size="sm" onClick={() => saveOrder('ordered')}
                disabled={saving || items.length === 0} className="gap-1.5">
                <Truck className="h-3.5 w-3.5" />
                {saving ? 'Saving...' : 'Place Order'}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* ── Order Details Row ──────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div>
          <Label className="text-[10px] font-semibold uppercase text-muted-foreground">PO Number</Label>
          <Input value={poNumber} onChange={e => setPoNumber(e.target.value)}
            className="mt-1 h-8 text-sm font-mono" readOnly={isReadOnly} />
        </div>
        <div>
          <Label className="text-[10px] font-semibold uppercase text-muted-foreground">Supplier</Label>
          <Select value={supplierId} onValueChange={setSupplierId} disabled={isReadOnly}>
            <SelectTrigger className="mt-1 h-8 text-sm">
              <SelectValue placeholder="Select supplier" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No supplier</SelectItem>
              {suppliers.map(s => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {!isReadOnly && (
            <button className="text-[10px] text-primary mt-0.5 hover:underline" type="button"
              onClick={() => navigate('/suppliers')}>+ Add new supplier</button>
          )}
        </div>
        <div className="sm:col-span-2">
          <Label className="text-[10px] font-semibold uppercase text-muted-foreground">Notes</Label>
          <Textarea value={notes} onChange={e => setNotes(e.target.value)}
            placeholder="Any special instructions..." rows={1}
            className="mt-1 text-sm min-h-[32px] resize-none" readOnly={isReadOnly} />
        </div>
      </div>

      {/* ── Toolbar ────────────────────────────────────── */}
      {!isReadOnly && (
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search & add products..."
              value={productSearch}
              onChange={e => { setProductSearch(e.target.value); setShowProductSearch(true); }}
              onFocus={() => setShowProductSearch(true)}
              className="pl-9 h-8 text-sm" />
            {showProductSearch && productSearch && (
              <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border rounded-lg shadow-lg max-h-64 overflow-y-auto">
                {filteredProducts.length === 0 ? (
                  <p className="text-xs text-muted-foreground p-3 text-center">No products found</p>
                ) : filteredProducts.map(p => (
                  <button key={p.id}
                    className="w-full text-left px-3 py-2 hover:bg-muted flex items-center justify-between text-sm border-b last:border-0"
                    onClick={() => addProduct(p)}>
                    <div className="flex items-center gap-2">
                      <Package className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="font-medium">{p.name}</span>
                      {p.sku && <span className="text-[10px] text-muted-foreground">{p.sku}</span>}
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <span className="text-xs text-muted-foreground">Stock: {p.stock_quantity}</span>
                      <span className="text-xs font-medium ml-2">{currencySymbol}{p.cost_price || 0}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
          <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs"
            onClick={() => setShowNewProduct(true)}>
            <PlusCircle className="h-3.5 w-3.5" /> New Product
          </Button>
          <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs"
            onClick={addBlankRow}>
            <Plus className="h-3.5 w-3.5" /> Add Row
          </Button>
          <Button variant="outline" size="sm"
            className="h-8 gap-1.5 text-xs bg-gradient-to-r from-violet-50 to-blue-50 border-violet-200 text-violet-700 hover:from-violet-100 hover:to-blue-100 dark:from-violet-950/30 dark:to-blue-950/30 dark:text-violet-300 dark:border-violet-800"
            onClick={() => setShowAIScan(true)}>
            <Sparkles className="h-3.5 w-3.5" /> Scan Bill with AI
          </Button>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{items.length} item{items.length !== 1 ? 's' : ''}</span>
            <div className="rounded-lg border bg-muted/40 px-3 py-1">
              <span className="text-[10px] text-muted-foreground mr-1">Total:</span>
              <span className="text-sm font-bold text-primary">
                {currencySymbol}{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ── Spreadsheet Table ──────────────────────────── */}
      <div className="flex-1 overflow-auto border rounded-lg bg-card">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3">
            <Package className="h-12 w-12 text-muted-foreground/20" />
            <p className="text-sm text-muted-foreground">No products added yet</p>
            {!isReadOnly && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => { setShowProductSearch(true); }}
                  className="gap-1.5">
                  <Search className="h-3.5 w-3.5" /> Search Products
                </Button>
                <Button variant="outline" size="sm" onClick={() => setShowAIScan(true)}
                  className="gap-1.5 text-violet-600">
                  <Sparkles className="h-3.5 w-3.5" /> Scan Bill
                </Button>
              </div>
            )}
          </div>
        ) : (
          <table ref={tableRef} className="w-full text-sm border-collapse">
            <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm">
              <tr>
                <th className="px-2 py-2 text-left text-[10px] font-bold uppercase text-muted-foreground border-b w-8">#</th>
                {PO_COLUMNS.map(col => (
                  <th key={col.key} className={cn(
                    'px-2 py-2 text-[10px] font-bold uppercase text-muted-foreground border-b',
                    col.width, col.align
                  )}>
                    {col.label}
                  </th>
                ))}
                <th className="px-2 py-2 text-[10px] font-bold uppercase text-muted-foreground border-b text-right min-w-[90px]">Total</th>
                {!isReadOnly && <th className="px-1 py-2 border-b w-8" />}
              </tr>
            </thead>
            <tbody>
              {items.map((item, rowIdx) => (
                <tr key={rowIdx}
                  className="border-b border-border/50 hover:bg-muted/30 transition-colors group">
                  <td className="px-2 py-1 text-muted-foreground text-xs tabular-nums">{rowIdx + 1}</td>
                  {PO_COLUMNS.map((col, colIdx) => {
                    const isActive = activeCell?.row === rowIdx && activeCell?.col === colIdx;
                    const value = getCellValue(item, col.key);
                    const isCasesDisabled = col.key === 'cases' && item.items_per_case <= 0;

                    return (
                      <td key={col.key}
                        className={cn(
                          'px-1 py-0.5 transition-colors',
                          !isReadOnly && !isCasesDisabled && 'cursor-pointer',
                          isActive && 'ring-2 ring-primary ring-inset bg-primary/5',
                          col.width
                        )}
                        onClick={() => {
                          if (isReadOnly || isCasesDisabled) return;
                          if (!isActive) {
                            if (activeCell) commitEdit();
                            startEdit(rowIdx, colIdx);
                          }
                        }}>
                        {isActive && !isReadOnly ? (
                          <input ref={inputRef}
                            type={col.type === 'number' ? 'number' : 'text'}
                            value={editValue}
                            onChange={e => setEditValue(e.target.value)}
                            onKeyDown={handleKeyDown}
                            onBlur={handleCellBlur}
                            className={cn(
                              'w-full h-7 px-2 text-xs bg-transparent outline-none border-0 tabular-nums',
                              col.align === 'text-right' && 'text-right',
                              col.align === 'text-center' && 'text-center'
                            )}
                            step={col.type === 'number' ? 'any' : undefined}
                            min={col.type === 'number' ? 0 : undefined} />
                        ) : (
                          <div className={cn(
                            'px-2 py-1 text-xs truncate',
                            col.type === 'number' && 'tabular-nums',
                            col.align,
                            isCasesDisabled && 'text-muted-foreground',
                            !value && value !== 0 && 'text-muted-foreground'
                          )}>
                            {isCasesDisabled ? '—' :
                              col.key === 'product_name' ? (
                                <div className="flex items-center gap-1.5">
                                  <div className="h-5 w-5 rounded bg-primary/10 flex items-center justify-center shrink-0">
                                    <Package className="h-3 w-3 text-primary" />
                                  </div>
                                  <span className="font-medium truncate">{value || '(empty)'}</span>
                                </div>
                              ) : col.type === 'number' && (col.key === 'mrp_price' || col.key === 'selling_price' || col.key === 'cost_price' || col.key === 'wholesale_price')
                                ? `${currencySymbol}${Number(value ?? 0).toFixed(2)}`
                                : (value ?? 0)
                            }
                          </div>
                        )}
                      </td>
                    );
                  })}
                  {/* Total column */}
                  <td className="px-2 py-1 text-right">
                    <span className="text-xs font-semibold tabular-nums">
                      {currencySymbol}{(item.stock * item.cost_price).toFixed(2)}
                    </span>
                  </td>
                  {/* Delete */}
                  {!isReadOnly && (
                    <td className="px-1 py-0.5">
                      <button
                        className="h-6 w-6 flex items-center justify-center rounded text-destructive/50 hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all"
                        onClick={() => removeItem(rowIdx)}>
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Keyboard shortcuts ─────────────────────────── */}
      {!isReadOnly && items.length > 0 && (
        <div className="text-[10px] text-muted-foreground flex items-center gap-4">
          <span><kbd className="px-1 py-0.5 bg-muted rounded text-[9px]">Enter</kbd> move down</span>
          <span><kbd className="px-1 py-0.5 bg-muted rounded text-[9px]">Tab</kbd> move right</span>
          <span><kbd className="px-1 py-0.5 bg-muted rounded text-[9px]">Esc</kbd> cancel</span>
          <span><kbd className="px-1 py-0.5 bg-muted rounded text-[9px]">Ctrl+Del</kbd> delete row</span>
        </div>
      )}

      {/* ── New Product Dialog ─────────────────────────── */}
      <Dialog open={showNewProduct} onOpenChange={setShowNewProduct}>
        <DialogContent className="max-w-lg w-[95vw]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PlusCircle className="h-5 w-5 text-primary" /> Create New Product
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateProduct} className="space-y-4 mt-2">
            <div className="space-y-1">
              <Label htmlFor="np-name" className="text-xs font-medium">Product Name *</Label>
              <Input id="np-name" name="name" required placeholder="e.g. Coca Cola 500ml" className="h-9" />
            </div>
            <div className="p-3 rounded-lg border bg-muted/30">
              <p className="text-[10px] font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Pricing</p>
              <div className="grid grid-cols-4 gap-2">
                <div className="space-y-1">
                  <Label className="text-[10px]">MRP</Label>
                  <Input name="mrp_price" type="number" step="0.01" min="0" defaultValue={0} className="h-8 text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px]">Selling *</Label>
                  <Input name="selling_price" type="number" step="0.01" min="0" defaultValue={0} required className="h-8 text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px]">Cost</Label>
                  <Input name="cost_price" type="number" step="0.01" min="0" defaultValue={0} className="h-8 text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px]">Wholesale</Label>
                  <Input name="wholesale_price" type="number" step="0.01" min="0" defaultValue={0} className="h-8 text-sm" />
                </div>
              </div>
            </div>
            <div className="p-3 rounded-lg border bg-muted/30">
              <p className="text-[10px] font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Stock</p>
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <Label className="text-[10px]">PCS/Case</Label>
                  <Input name="items_per_case" type="number" min="0" defaultValue={0} className="h-8 text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px]">Stock (PCS)</Label>
                  <Input name="stock_quantity" type="number" min="0" defaultValue={0} className="h-8 text-sm" />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowNewProduct(false)}>Cancel</Button>
              <Button type="submit" disabled={newProductSaving}>
                {newProductSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                Create & Add
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── AI Scan Dialog ─────────────────────────────── */}
      <Dialog open={showAIScan} onOpenChange={(open) => { if (!aiScanning) { setShowAIScan(open); if (!open) setScanPreview(null); } }}>
        <DialogContent className="max-w-md w-[95vw]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-violet-500" /> Scan Supplier Bill with AI
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <p className="text-sm text-muted-foreground">
              Upload a photo or PDF of your supplier bill. AI will automatically detect products, quantities, and prices.
            </p>

            {scanPreview ? (
              <div className="relative rounded-lg border overflow-hidden">
                {scanPreview === 'pdf' ? (
                  <div className="w-full h-48 bg-muted/30 flex flex-col items-center justify-center gap-2">
                    <div className="h-14 w-14 rounded-lg bg-red-100 flex items-center justify-center">
                      <span className="text-red-600 font-bold text-sm">PDF</span>
                    </div>
                    <p className="text-sm text-muted-foreground">PDF uploaded</p>
                  </div>
                ) : (
                  <img src={scanPreview} alt="Bill preview" className="w-full max-h-64 object-contain bg-muted/30" />
                )}
                {aiScanning && (
                  <div className="absolute inset-0 bg-background/80 flex flex-col items-center justify-center gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
                    <p className="text-sm font-medium text-violet-600">AI is reading your bill...</p>
                    <p className="text-xs text-muted-foreground">This may take a few seconds</p>
                  </div>
                )}
              </div>
            ) : (
              <div
                className="border-2 border-dashed rounded-xl p-8 text-center hover:border-violet-300 hover:bg-violet-50/30 dark:hover:bg-violet-950/10 transition-colors cursor-pointer"
                onClick={() => fileInputRef.current?.click()}>
                <Camera className="h-10 w-10 mx-auto text-violet-300 mb-3" />
                <p className="text-sm font-medium">Click to upload bill image or PDF</p>
                <p className="text-xs text-muted-foreground mt-1">JPG, PNG, WebP or PDF — Max 10MB</p>
              </div>
            )}

            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif,application/pdf" className="hidden"
              onChange={e => {
                const file = e.target.files?.[0];
                if (file) handleAIScan(file);
                e.target.value = '';
              }} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" disabled={aiScanning}
              onClick={() => { setShowAIScan(false); setScanPreview(null); }}>
              Cancel
            </Button>
            {!scanPreview && !aiScanning && (
              <Button type="button" onClick={() => fileInputRef.current?.click()}
                className="gap-1.5 bg-violet-600 hover:bg-violet-700">
                <Upload className="h-3.5 w-3.5" /> Upload Photo / PDF
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Confirm Receive Dialog ─────────────────────── */}
      <AlertDialog open={confirmReceive} onOpenChange={setConfirmReceive}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Stock Receipt</AlertDialogTitle>
            <AlertDialogDescription>
              This will add stock quantities to all products in this order and mark it as received.
              This action <strong>cannot be undone</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="my-2 rounded-lg border bg-muted/40 p-3 space-y-1.5 max-h-48 overflow-y-auto">
            {items.map((item, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="font-medium">{item.product_name}</span>
                <Badge variant="secondary">+{item.stock} units</Badge>
              </div>
            ))}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-green-600 hover:bg-green-700"
              onClick={() => receiveMutation.mutate()}>
              <CheckCircle2 className="mr-2 h-4 w-4" /> Confirm Receipt
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
