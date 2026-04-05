// @ts-nocheck
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useBusinessSettings } from '@/hooks/useBusinessSettings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Plus, Pencil, Trash2, Package, Search, AlertTriangle, Download,
  Filter, X, ChevronDown, ChevronRight, Barcode, Hash, Tag, Scale, Calendar,
  Box, ScanLine, Upload, Link as LinkIcon, Image as ImageIcon,
  Apple, Beef, Beer, Coffee, Cookie, Cake, Flame, Droplet,
  Sandwich, Pizza, IceCream, Wine, Milk, ShoppingBag, Gift,
  Archive, type LucideIcon,
} from 'lucide-react';

// Safe icon map — avoids the broken `icons` bulk export from lucide-react
const ICON_MAP: Record<string, LucideIcon> = {
  Package, Apple, Beef, Beer, Coffee, Cookie, Cake, Flame, Droplet,
  Sandwich, Pizza, IceCream, Wine, Milk, ShoppingBag, Gift,
  Box, Archive, Barcode, Tag,
};
import { toast } from 'sonner';
import { format } from 'date-fns';
import { exportToExcel } from '@/lib/exportToExcel';
import { exportStyledExcel } from '@/lib/exportToExcel';
import { ProductImporter } from '@/components/ProductImporter';

// ────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────

interface Product {
  id: string;
  name: string;
  description: string | null;
  mrp_price: number;
  selling_price: number;
  cost_price: number;
  wholesale_price: number;
  stock_quantity: number;
  low_stock_threshold: number;
  items_per_case: number;
  category_id: string | null;
  icon: string | null;
  is_active: boolean;
  item_code: string | null;
  sku: string | null;
  hsn_code: string | null;
  discount_percent: number;
  tax_type: string;
  batch_number: string | null;
  expiry_date: string | null;
  manufacturing_date: string | null;
  serial_number: string | null;
  model_number: string | null;
  size: string | null;
  barcode: string | null;
  base_unit: string;
  secondary_unit: string | null;
  unit_conversion_ratio: number;
  categories?: { name: string; color: string | null } | null;
}

const PRODUCT_ICONS = Object.keys(ICON_MAP);

const DEFAULT_UNITS = [
  { value: 'PCS', label: 'PIECES (Pcs)' },
  { value: 'BOX', label: 'BOX (Box)' },
  { value: 'PACK', label: 'PACKS (Pac)' },
  { value: 'KG', label: 'KILOGRAMS (Kg)' },
  { value: 'G', label: 'GRAMMES (Gm)' },
  { value: 'L', label: 'LITRE (Ltr)' },
  { value: 'ML', label: 'MILLILITRE (Ml)' },
  { value: 'M', label: 'METERS (Mtr)' },
  { value: 'CM', label: 'CENTIMETERS (Cm)' },
  { value: 'DZN', label: 'DOZENS (Dzn)' },
  { value: 'PR', label: 'PAIRS (Prs)' },
  { value: 'CTN', label: 'CARTONS (Ctn)' },
  { value: 'BAG', label: 'BAGS (Bag)' },
  { value: 'BDL', label: 'BUNDLES (Bdl)' },
  { value: 'ROL', label: 'ROLLS (Rol)' },
  { value: 'TAB', label: 'TABLETS (Tab)' },
  { value: 'STRIP', label: 'STRIPS (Strip)' },
  { value: 'BTL', label: 'BOTTLES (Btl)' },
  { value: 'CAN', label: 'CANS (Can)' },
  { value: 'SET', label: 'SETS (Set)' },
  { value: 'NOS', label: 'NUMBERS (Nos)' },
  { value: 'QTL', label: 'QUINTAL (Qtl)' },
  { value: 'SQF', label: 'SQUARE FEET (Sqf)' },
];

// ────────────────────────────────────────────────────────────
// Component
// ────────────────────────────────────────────────────────────

export default function Products() {
  const { isAdmin, businessId } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { data: settings } = useBusinessSettings();
  const currencySymbol = settings?.currency_symbol || '₹';

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('Package');
  const [showFilters, setShowFilters] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'low-stock' | 'expired'>('all');
  const [iconMode, setIconMode] = useState<'icon' | 'upload' | 'url'>('icon');
  const [imageUrl, setImageUrl] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Stock auto-calc state
  const [stockQty, setStockQty] = useState(0);
  const [pcsPerCase, setPcsPerCase] = useState(0);
  const [stockCases, setStockCases] = useState(0);

  // Collapsible sections in form
  const [showCodes, setShowCodes] = useState(false);
  const [showUnits, setShowUnits] = useState(false);
  const [showBatch, setShowBatch] = useState(false);

  // Filters
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [stockFilter, setStockFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // ── Fetch categories ──
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      let query = supabase.from('categories').select('*');
      if (businessId) query = query.eq('business_id', businessId);
      const { data, error } = await query.order('sort_order');
      if (error) throw error;
      return data;
    },
    enabled: !!businessId,
  });

  // ── Fetch products ──
  const { data: products, isLoading } = useQuery({
    queryKey: ['products', 'all'],
    queryFn: async () => {
      let query = supabase.from('products').select('*, categories(name, color)');
      if (businessId) query = query.eq('business_id', businessId);
      const { data, error } = await query.order('name');
      if (error) throw error;
      return data as unknown as Product[];
    },
    enabled: !!businessId,
  });

  const renderIcon = (iconName: string | null) => {
    const name = iconName || 'Package';
    const LucideIcon = ICON_MAP[name];
    return LucideIcon ? <LucideIcon className="h-5 w-5 text-muted-foreground" /> : <Package className="h-5 w-5 text-muted-foreground" />;
  };

  // ── Save product ──
  const saveMutation = useMutation({
    mutationFn: async (product: Partial<Product>) => {
      if (editingProduct) {
        const { error } = await supabase.from('products').update(product).eq('id', editingProduct.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('products').insert([{ ...product, business_id: businessId } as { name: string }]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setIsDialogOpen(false);
      setEditingProduct(null);
      toast.success(editingProduct ? 'Product updated' : 'Product created');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  // ── Delete product ──
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Product deleted');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  // ── Form submit ──
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);

    // Handle image upload if needed
    let resolvedImageUrl: string | null = editingProduct?.image_url || null;
    if (iconMode === 'upload' && imageFile) {
      const ext = imageFile.name.split('.').pop();
      const filePath = `product-images/${businessId}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('product-images').upload(filePath, imageFile, { upsert: true });
      if (uploadError) {
        toast.error('Image upload failed: ' + uploadError.message);
        return;
      }
      const { data: urlData } = supabase.storage.from('product-images').getPublicUrl(filePath);
      resolvedImageUrl = urlData.publicUrl;
    } else if (iconMode === 'url' && imageUrl.trim()) {
      resolvedImageUrl = imageUrl.trim();
    } else if (iconMode === 'icon') {
      resolvedImageUrl = null;
    }

    saveMutation.mutate({
      name: fd.get('name') as string,
      description: (fd.get('description') as string) || null,
      mrp_price: Number(fd.get('mrp_price')) || Number(fd.get('selling_price')),
      selling_price: Number(fd.get('selling_price')),
      cost_price: Number(fd.get('cost_price')),
      wholesale_price: Number(fd.get('wholesale_price')) || 0,
      stock_quantity: Number(fd.get('stock_quantity')),
      low_stock_threshold: Number(fd.get('low_stock_threshold')),
      items_per_case: Number(fd.get('items_per_case')) || 0,
      category_id: (fd.get('category_id') as string) || null,
      icon: selectedIcon,
      image_url: resolvedImageUrl,
      item_code: (fd.get('item_code') as string) || null,
      sku: (fd.get('sku') as string) || null,
      hsn_code: (fd.get('hsn_code') as string) || null,
      barcode: (fd.get('barcode') as string) || null,
      discount_percent: Number(fd.get('discount_percent')) || 0,
      base_unit: (fd.get('base_unit') as string) || 'PCS',
      secondary_unit: ((fd.get('secondary_unit') as string) || 'none') === 'none' ? null : (fd.get('secondary_unit') as string),
      unit_conversion_ratio: Number(fd.get('unit_conversion_ratio')) || 1,
      batch_number: (fd.get('batch_number') as string) || null,
      expiry_date: (fd.get('expiry_date') as string) || null,
      manufacturing_date: (fd.get('manufacturing_date') as string) || null,
    });
  };

  const openDialog = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setSelectedIcon(product.icon || 'Package');
      if (product.image_url) {
        setIconMode('url');
        setImageUrl(product.image_url);
        setImagePreview(product.image_url);
      } else {
        setIconMode('icon');
        setImageUrl('');
        setImagePreview(null);
      }
      setImageFile(null);
      // Stock auto-calc
      const qty = product.stock_quantity || 0;
      const ppc = product.items_per_case || 0;
      setStockQty(qty);
      setPcsPerCase(ppc);
      setStockCases(ppc > 0 ? Math.round((qty / ppc) * 100) / 100 : 0);
      // Auto-open sections if product has data
      setShowCodes(!!(product.item_code || product.sku || product.hsn_code || product.barcode));
      setShowUnits(!!(product.secondary_unit));
      setShowBatch(!!(product.batch_number || product.expiry_date));
    } else {
      setEditingProduct(null);
      setSelectedIcon('Package');
      setIconMode('icon');
      setImageUrl('');
      setImageFile(null);
      setImagePreview(null);
      setStockQty(0);
      setPcsPerCase(0);
      setStockCases(0);
      setShowCodes(false);
      setShowUnits(false);
      setShowBatch(false);
    }
    setIsDialogOpen(true);
  };

  // ── Filtering ──
  const filteredProducts = useMemo(() => {
    return products?.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.item_code?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (p.sku?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (p.barcode?.toLowerCase() || '').includes(searchQuery.toLowerCase());

      const matchesCategory = categoryFilter === 'all' ||
        (categoryFilter === 'none' && !p.category_id) ||
        p.category_id === categoryFilter;

      let matchesStock = true;
      if (stockFilter === 'low') matchesStock = p.stock_quantity <= p.low_stock_threshold;
      else if (stockFilter === 'out') matchesStock = p.stock_quantity === 0;
      else if (stockFilter === 'in-stock') matchesStock = p.stock_quantity > p.low_stock_threshold;

      const matchesStatus = statusFilter === 'all' ||
        (statusFilter === 'active' && p.is_active) ||
        (statusFilter === 'inactive' && !p.is_active);

      // Tab-based filtering
      if (activeTab === 'low-stock') {
        if (p.stock_quantity > p.low_stock_threshold) return false;
      }
      if (activeTab === 'expired') {
        if (!p.expiry_date || new Date(p.expiry_date) > new Date()) return false;
      }

      return matchesSearch && matchesCategory && matchesStock && matchesStatus;
    }) || [];
  }, [products, searchQuery, categoryFilter, stockFilter, statusFilter, activeTab]);

  const clearFilters = () => {
    setCategoryFilter('all');
    setStockFilter('all');
    setStatusFilter('all');
  };

  const hasActiveFilters = categoryFilter !== 'all' || stockFilter !== 'all' || statusFilter !== 'all';

  // ── Stats ──
  const stats = useMemo(() => {
    if (!products) return { total: 0, lowStock: 0, expired: 0, totalValue: 0 };
    const lowStock = products.filter(p => p.stock_quantity <= p.low_stock_threshold).length;
    const expired = products.filter(p => p.expiry_date && new Date(p.expiry_date) < new Date()).length;
    const totalValue = products.reduce((s, p) => s + (p.cost_price * p.stock_quantity), 0);
    return { total: products.length, lowStock, expired, totalValue };
  }, [products]);

  // ── Export ──
  const handleExportExcel = () => {
    if (filteredProducts.length === 0) { toast.error('No data to export'); return; }

    const lowStockCount = filteredProducts.filter(p => p.stock_quantity <= p.low_stock_threshold).length;
    const totalStockValue = filteredProducts.reduce((s, p) => s + (p.cost_price * p.stock_quantity), 0);
    const totalRetailValue = filteredProducts.reduce((s, p) => s + (p.selling_price * p.stock_quantity), 0);

    exportStyledExcel(
      [{
        title: `Product Inventory (${filteredProducts.length} items)`,
        titleColor: '1F4E79',
        data: filteredProducts,
        columns: [
          { key: 'name', header: 'Product Name' },
          { key: 'item_code', header: 'Item Code', format: (v) => v || '' },
          { key: 'sku', header: 'SKU', format: (v) => v || '' },
          { key: 'hsn_code', header: 'HSN Code', format: (v) => v || '' },
          { key: 'barcode', header: 'Barcode', format: (v) => v || '' },
          { key: 'categories', header: 'Category', format: (v) => (v as { name: string } | null)?.name || '' },
          { key: 'mrp_price', header: 'MRP', format: (v) => Number(v || 0).toFixed(2) },
          { key: 'selling_price', header: 'Selling Price', format: (v) => Number(v).toFixed(2) },
          { key: 'cost_price', header: 'Cost Price', format: (v) => Number(v).toFixed(2) },
          { key: 'wholesale_price', header: 'Wholesale Price', format: (v) => Number(v || 0).toFixed(2) },
          { key: 'stock_quantity', header: 'Stock (PCS)', format: (v) => Number(v) },
          { key: 'items_per_case', header: 'PCS/Case', format: (v) => Number(v) || '' },
          { key: '_cases', header: 'Cases', format: (_v, _k, item: any) => {
            const ppc = Number(item?.items_per_case);
            const qty = Number(item?.stock_quantity);
            return ppc > 0 ? Math.round((qty / ppc) * 100) / 100 : '';
          }},
          { key: 'base_unit', header: 'Unit' },
          { key: 'low_stock_threshold', header: 'Low Stock Alert', format: (v) => Number(v) },
          { key: 'batch_number', header: 'Batch No.', format: (v) => v || '' },
          { key: 'expiry_date', header: 'Expiry Date', format: (v) => v || '' },
          { key: 'is_active', header: 'Status', format: (v) => v ? 'Active' : 'Inactive' },
        ],
      }],
      {
        title: 'Inventory Summary',
        items: [
          { label: 'Total Products', value: filteredProducts.length },
          { label: 'Low Stock Items', value: lowStockCount },
          { label: 'Stock Value (Cost)', value: `${currencySymbol}${totalStockValue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}` },
          { label: 'Stock Value (Retail)', value: `${currencySymbol}${totalRetailValue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}` },
        ],
      },
      `products-${format(new Date(), 'yyyy-MM-dd')}`
    );
    toast.success('Exported successfully');
  };

  // ── Bulk selection ──
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());

  const toggleSelectAll = () => {
    if (selectedProductIds.size === filteredProducts.length && filteredProducts.length > 0) {
      setSelectedProductIds(new Set());
    } else {
      setSelectedProductIds(new Set(filteredProducts.map(p => p.id)));
    }
  };
  const toggleSelectProduct = (id: string) => {
    const newSelected = new Set(selectedProductIds);
    if (newSelected.has(id)) newSelected.delete(id); else newSelected.add(id);
    setSelectedProductIds(newSelected);
  };

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase.from('products').delete().in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setSelectedProductIds(new Set());
      toast.success('Products deleted successfully');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const handleBulkDelete = () => {
    if (!confirm(`Are you sure you want to delete ${selectedProductIds.size} products?`)) return;
    bulkDeleteMutation.mutate(Array.from(selectedProductIds));
  };

  // ────────────────────────────────────────────────────────────
  // Render
  // ────────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* ── Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="spos-page-heading">Products</h1>
          <p className="spos-page-subhead" style={{ marginBottom: 0 }}>Manage your product inventory</p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          {isAdmin && selectedProductIds.size > 0 && (
            <Button variant="destructive" size="sm" onClick={handleBulkDelete}>
              <Trash2 className="mr-2 h-4 w-4" />Delete ({selectedProductIds.size})
            </Button>
          )}
          <Button onClick={() => navigate('/manage-products')} variant="outline" size="sm">
            <Pencil className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Manage All</span>
            <span className="sm:hidden">Edit All</span>
          </Button>
          {isAdmin && <ProductImporter />}
          <Button onClick={handleExportExcel} variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Export Excel</span>
            <span className="sm:hidden">Export</span>
          </Button>
          {isAdmin && (
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) { setEditingProduct(null); setSelectedIcon('Package'); }
            }}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="mr-1 sm:mr-2 h-4 w-4" /><span className="hidden sm:inline">Add Product</span><span className="sm:hidden">Add</span></Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg w-[95vw] max-h-[90vh] flex flex-col p-4 sm:p-6 overflow-hidden">
                <DialogHeader>
                  <DialogTitle>{editingProduct ? 'Edit Product' : 'Add Product'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="flex flex-col gap-3 flex-1 overflow-hidden mt-2">
                  <div className="overflow-y-auto pr-1 space-y-4 flex-1 custom-scrollbar">

                    {/* ── Basic Info ── */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2 space-y-1">
                        <Label htmlFor="name">Product Name *</Label>
                        <Input id="name" name="name" defaultValue={editingProduct?.name} required placeholder="e.g. Coca Cola 500ml" />
                      </div>
                      <div className="col-span-2 space-y-1">
                        <Label htmlFor="description">Description</Label>
                        <Textarea id="description" name="description" defaultValue={editingProduct?.description || ''} rows={2} placeholder="Optional description..." />
                      </div>
                    </div>

                    {/* ── Pricing ── */}
                    <div className="p-3 rounded-lg border bg-muted/30">
                      <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Pricing</p>
                      <div className="grid grid-cols-4 gap-3">
                        <div className="space-y-1">
                          <Label htmlFor="mrp_price" className="text-xs">MRP</Label>
                          <Input id="mrp_price" name="mrp_price" type="number" step="0.01" min="0" defaultValue={editingProduct?.mrp_price || 0} />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="selling_price" className="text-xs">Sell Price *</Label>
                          <Input id="selling_price" name="selling_price" type="number" step="0.01" min="0" defaultValue={editingProduct?.selling_price || 0} required />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="cost_price" className="text-xs">Cost Price</Label>
                          <Input id="cost_price" name="cost_price" type="number" step="0.01" min="0" defaultValue={editingProduct?.cost_price || 0} />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="wholesale_price" className="text-xs">Wholesale</Label>
                          <Input id="wholesale_price" name="wholesale_price" type="number" step="0.01" min="0" defaultValue={editingProduct?.wholesale_price || 0} />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3 mt-2">
                        <div className="space-y-1">
                          <Label htmlFor="discount_percent" className="text-xs">Discount %</Label>
                          <Input id="discount_percent" name="discount_percent" type="number" step="0.01" min="0" max="100" defaultValue={editingProduct?.discount_percent || 0} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Tax Type</Label>
                          <Select name="tax_type" defaultValue={editingProduct?.tax_type || 'exclusive'}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="exclusive">Exclusive</SelectItem>
                              <SelectItem value="inclusive">Inclusive</SelectItem>
                              <SelectItem value="none">No Tax</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    {/* ── Stock ── */}
                    <div className="p-3 rounded-lg border bg-muted/30">
                      <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Stock</p>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label htmlFor="items_per_case" className="text-xs">PCS/Case</Label>
                          <Input id="items_per_case" name="items_per_case" type="number" min="0" step="0.01" value={pcsPerCase} onChange={(e) => {
                            const ppc = Number(e.target.value) || 0;
                            setPcsPerCase(ppc);
                            if (ppc > 0 && stockCases > 0) {
                              setStockQty(Math.round(stockCases * ppc));
                            }
                          }} />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="stock_cases" className="text-xs">Cases</Label>
                          <Input id="stock_cases" type="number" min="0" step="0.01" value={stockCases} onChange={(e) => {
                            const cases = Number(e.target.value) || 0;
                            setStockCases(cases);
                            if (pcsPerCase > 0) {
                              setStockQty(Math.round(cases * pcsPerCase));
                            }
                          }} />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="stock_quantity" className="text-xs">Stock Qty (Total PCS)</Label>
                          <Input id="stock_quantity" name="stock_quantity" type="number" min="0" value={stockQty} onChange={(e) => {
                            const qty = Number(e.target.value) || 0;
                            setStockQty(qty);
                            if (pcsPerCase > 0) {
                              setStockCases(Math.round((qty / pcsPerCase) * 100) / 100);
                            }
                          }} />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="low_stock_threshold" className="text-xs">Low Stock Alert</Label>
                          <Input id="low_stock_threshold" name="low_stock_threshold" type="number" min="0" defaultValue={editingProduct?.low_stock_threshold || 10} />
                        </div>
                      </div>
                      {pcsPerCase > 0 && (
                        <p className="text-xs text-muted-foreground mt-2">
                          {stockCases} case{stockCases !== 1 ? 's' : ''} × {pcsPerCase} pcs = <span className="font-semibold">{stockQty} pcs total</span>
                        </p>
                      )}
                    </div>

                    {/* ── Category + Icon ── */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Category</Label>
                        <Select name="category_id" defaultValue={editingProduct?.category_id || ''}>
                          <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                          <SelectContent>
                            {categories.map((cat) => <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Product Image</Label>
                        <div className="flex gap-1 mb-2">
                          <Button type="button" variant={iconMode === 'icon' ? 'default' : 'outline'} size="sm" className="text-[10px] h-7 gap-1 flex-1" onClick={() => setIconMode('icon')}>
                            <Package className="h-3 w-3" /> Icon
                          </Button>
                          <Button type="button" variant={iconMode === 'upload' ? 'default' : 'outline'} size="sm" className="text-[10px] h-7 gap-1 flex-1" onClick={() => setIconMode('upload')}>
                            <Upload className="h-3 w-3" /> Upload
                          </Button>
                          <Button type="button" variant={iconMode === 'url' ? 'default' : 'outline'} size="sm" className="text-[10px] h-7 gap-1 flex-1" onClick={() => setIconMode('url')}>
                            <LinkIcon className="h-3 w-3" /> URL
                          </Button>
                        </div>
                        {iconMode === 'icon' && (
                          <div className="grid grid-cols-5 gap-1 max-h-20 overflow-y-auto p-1 border rounded-md">
                            {PRODUCT_ICONS.map((iconName) => {
                              const IconComp = ICON_MAP[iconName];
                              return IconComp ? (
                                <button key={iconName} type="button" onClick={() => setSelectedIcon(iconName)} className={`p-1.5 rounded flex items-center justify-center text-xs transition-colors ${selectedIcon === iconName ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'}`}>
                                  <IconComp className="h-4 w-4" />
                                </button>
                              ) : null;
                            })}
                          </div>
                        )}
                        {iconMode === 'upload' && (
                          <div className="space-y-2">
                            <Input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                if (file.size > 2 * 1024 * 1024) { toast.error('Max file size is 2MB'); return; }
                                setImageFile(file);
                                setImagePreview(URL.createObjectURL(file));
                              }
                            }} />
                            {imagePreview && <img src={imagePreview} alt="" className="h-16 w-16 rounded-lg object-cover border" />}
                          </div>
                        )}
                        {iconMode === 'url' && (
                          <div className="space-y-2">
                            <Input placeholder="https://example.com/product.jpg" value={imageUrl} onChange={(e) => { setImageUrl(e.target.value); setImagePreview(e.target.value); }} />
                            {imagePreview && <img src={imagePreview} alt="" className="h-16 w-16 rounded-lg object-cover border" onError={() => setImagePreview(null)} />}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* ── Codes & Identifiers (Collapsible) ── */}
                    <Collapsible open={showCodes} onOpenChange={setShowCodes}>
                      <CollapsibleTrigger className="flex items-center gap-2 w-full text-left text-sm font-medium p-2 rounded-md hover:bg-muted/50 transition-colors">
                        {showCodes ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        <Hash className="h-4 w-4 text-blue-500" />
                        <span>Codes & Identifiers</span>
                        <span className="text-xs text-muted-foreground ml-auto">Item Code, SKU, HSN, Barcode</span>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="pt-2 space-y-3">
                        <div className="grid grid-cols-2 gap-3 p-3 border rounded-lg bg-blue-50/30 dark:bg-blue-950/10">
                          <div className="space-y-1">
                            <Label htmlFor="item_code" className="text-xs">Item Code</Label>
                            <Input id="item_code" name="item_code" defaultValue={editingProduct?.item_code || ''} placeholder="e.g. ITEM-001" />
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor="sku" className="text-xs">SKU</Label>
                            <Input id="sku" name="sku" defaultValue={editingProduct?.sku || ''} placeholder="e.g. SKU-CC-500" />
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor="hsn_code" className="text-xs">HSN Code</Label>
                            <Input id="hsn_code" name="hsn_code" defaultValue={editingProduct?.hsn_code || ''} placeholder="e.g. 22021010" />
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor="barcode" className="text-xs">Barcode</Label>
                            <Input id="barcode" name="barcode" defaultValue={editingProduct?.barcode || ''} placeholder="Scan or enter barcode" />
                          </div>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>

                    {/* ── Units & Conversion (Collapsible) ── */}
                    <Collapsible open={showUnits} onOpenChange={setShowUnits}>
                      <CollapsibleTrigger className="flex items-center gap-2 w-full text-left text-sm font-medium p-2 rounded-md hover:bg-muted/50 transition-colors">
                        {showUnits ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        <Scale className="h-4 w-4 text-green-500" />
                        <span>Units & Conversion</span>
                        <span className="text-xs text-muted-foreground ml-auto">Base unit, Secondary unit</span>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="pt-2 space-y-3">
                        <div className="grid grid-cols-3 gap-3 p-3 border rounded-lg bg-green-50/30 dark:bg-green-950/10">
                          <div className="space-y-1">
                            <Label className="text-xs">Base Unit</Label>
                            <Select name="base_unit" defaultValue={editingProduct?.base_unit || 'PCS'}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {DEFAULT_UNITS.map(u => <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Secondary Unit</Label>
                            <Select name="secondary_unit" defaultValue={editingProduct?.secondary_unit || 'none'}>
                              <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">None</SelectItem>
                                {DEFAULT_UNITS.map(u => <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor="unit_conversion_ratio" className="text-xs">Conversion Ratio</Label>
                            <Input id="unit_conversion_ratio" name="unit_conversion_ratio" type="number" step="0.01" min="0" defaultValue={editingProduct?.unit_conversion_ratio || 1} placeholder="e.g. 200" />
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground px-1">Example: If 1 BOX = 200 PACKS, set Base=BOX, Secondary=PACK, Ratio=200</p>
                      </CollapsibleContent>
                    </Collapsible>

                    {/* ── Batch & Tracking (Collapsible) ── */}
                    <Collapsible open={showBatch} onOpenChange={setShowBatch}>
                      <CollapsibleTrigger className="flex items-center gap-2 w-full text-left text-sm font-medium p-2 rounded-md hover:bg-muted/50 transition-colors">
                        {showBatch ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        <Calendar className="h-4 w-4 text-orange-500" />
                        <span>Batch & Tracking</span>
                        <span className="text-xs text-muted-foreground ml-auto">Batch, Mfg Date, Expiry</span>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="pt-2 space-y-3">
                        <div className="grid grid-cols-2 gap-3 p-3 border rounded-lg bg-orange-50/30 dark:bg-orange-950/10">
                          <div className="space-y-1 col-span-2">
                            <Label htmlFor="batch_number" className="text-xs">Batch Number</Label>
                            <Input id="batch_number" name="batch_number" defaultValue={editingProduct?.batch_number || ''} placeholder="e.g. BATCH-2026-001" />
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor="manufacturing_date" className="text-xs">Mfg Date</Label>
                            <Input id="manufacturing_date" name="manufacturing_date" type="date" defaultValue={editingProduct?.manufacturing_date || ''} />
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor="expiry_date" className="text-xs">Expiry Date</Label>
                            <Input id="expiry_date" name="expiry_date" type="date" defaultValue={editingProduct?.expiry_date || ''} />
                          </div>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>

                  </div>

                  {/* ── Form Actions ── */}
                  <div className="flex justify-end gap-2 pt-3 border-t shrink-0 mt-auto">
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                    <Button type="submit" disabled={saveMutation.isPending}>{saveMutation.isPending ? 'Saving...' : 'Save'}</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* ── Stats Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab('all')}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
                <Package className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Items</p>
                <p className="text-xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab('low-stock')}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Low Stock</p>
                <p className="text-xl font-bold">{stats.lowStock}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab('expired')}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-100 text-orange-600 dark:bg-orange-950 dark:text-orange-400">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Expired</p>
                <p className="text-xl font-bold">{stats.expired}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 text-green-600 dark:bg-green-950 dark:text-green-400">
                <Tag className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Stock Value</p>
                <p className="text-xl font-bold">{currencySymbol}{stats.totalValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Product List ── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3">
            {/* Tabs */}
            <div className="flex items-center gap-2 border-b pb-2">
              {(['all', 'low-stock', 'expired'] as const).map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${activeTab === tab ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}>
                  {tab === 'all' ? 'All Products' : tab === 'low-stock' ? `Low Stock (${stats.lowStock})` : `Expired (${stats.expired})`}
                </button>
              ))}
            </div>
            {/* Search + Filter */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Search name, code, SKU, barcode..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
              </div>
              <Button variant={hasActiveFilters ? 'default' : 'outline'} size="icon" onClick={() => setShowFilters(!showFilters)}>
                <Filter className="h-4 w-4" />
              </Button>
            </div>
            {showFilters && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-3 bg-muted/50 rounded-lg">
                <div className="space-y-1">
                  <Label className="text-xs">Category</Label>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      <SelectItem value="none">No Category</SelectItem>
                      {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Stock Status</Label>
                  <Select value={stockFilter} onValueChange={setStockFilter}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Stock</SelectItem>
                      <SelectItem value="in-stock">In Stock</SelectItem>
                      <SelectItem value="low">Low Stock</SelectItem>
                      <SelectItem value="out">Out of Stock</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Status</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {hasActiveFilters && (
                  <div className="col-span-2 md:col-span-3">
                    <Button variant="ghost" size="sm" onClick={clearFilters}><X className="mr-1 h-3 w-3" />Clear Filters</Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
          ) : filteredProducts.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {isAdmin && (
                      <TableHead className="w-12">
                        <Checkbox checked={filteredProducts.length > 0 && selectedProductIds.size === filteredProducts.length} onCheckedChange={toggleSelectAll} aria-label="Select all" />
                      </TableHead>
                    )}
                    <TableHead>Product</TableHead>
                    <TableHead className="hidden md:table-cell">Code/SKU</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Stock</TableHead>
                    <TableHead className="text-right hidden sm:table-cell">Cases</TableHead>
                    <TableHead className="hidden lg:table-cell">Unit</TableHead>
                    {isAdmin && <TableHead className="w-24">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.map((product) => {
                    const isExpired = product.expiry_date && new Date(product.expiry_date) < new Date();
                    const isLowStock = product.stock_quantity <= product.low_stock_threshold;
                    return (
                      <TableRow key={product.id} className={isExpired ? 'bg-red-50/50 dark:bg-red-950/10' : isLowStock ? 'bg-amber-50/50 dark:bg-amber-950/10' : ''}>
                        {isAdmin && (
                          <TableCell><Checkbox checked={selectedProductIds.has(product.id)} onCheckedChange={() => toggleSelectProduct(product.id)} /></TableCell>
                        )}
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted shrink-0 overflow-hidden">
                              {product.image_url ? (
                                <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                              ) : renderIcon(product.icon)}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium truncate">{product.name}</p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                {product.barcode && <Badge variant="outline" className="text-[10px] px-1 py-0"><Barcode className="h-2.5 w-2.5 mr-0.5" />{product.barcode}</Badge>}
                                {product.hsn_code && <Badge variant="outline" className="text-[10px] px-1 py-0">HSN:{product.hsn_code}</Badge>}
                                {isExpired && <Badge variant="destructive" className="text-[10px] px-1 py-0">EXPIRED</Badge>}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <div className="text-xs space-y-0.5">
                            {product.item_code && <div className="text-muted-foreground">{product.item_code}</div>}
                            {product.sku && <div className="text-muted-foreground">{product.sku}</div>}
                          </div>
                        </TableCell>
                        <TableCell>
                          {product.categories ? (
                            <Badge variant="secondary" style={{ backgroundColor: product.categories.color + '20', color: product.categories.color || undefined }}>
                              {product.categories.name}
                            </Badge>
                          ) : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell className="text-right">
                          <div>
                            <span className="font-medium">{currencySymbol}{Number(product.selling_price).toFixed(2)}</span>
                            {product.wholesale_price > 0 && product.wholesale_price !== product.selling_price && (
                              <div className="text-[10px] text-muted-foreground">W: {currencySymbol}{Number(product.wholesale_price).toFixed(2)}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {product.stock_quantity <= product.low_stock_threshold && <AlertTriangle className="h-4 w-4 text-destructive" />}
                            <span className={product.stock_quantity <= product.low_stock_threshold ? 'text-destructive font-medium' : ''}>
                              {product.stock_quantity}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right hidden sm:table-cell">
                          <span className="text-muted-foreground">
                            {product.items_per_case > 0
                              ? (Math.round((product.stock_quantity / product.items_per_case) * 100) / 100)
                              : '—'}
                          </span>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <span className="text-xs text-muted-foreground">{product.base_unit || 'PCS'}</span>
                          {product.secondary_unit && (
                            <div className="text-[10px] text-muted-foreground">
                              1 {product.base_unit} = {product.unit_conversion_ratio} {product.secondary_unit}
                            </div>
                          )}
                        </TableCell>
                        {isAdmin && (
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" onClick={() => openDialog(product)}><Pencil className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="icon" className="text-destructive" onClick={() => { if (confirm('Delete this product?')) deleteMutation.mutate(product.id); }}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <EmptyState icon="products" title="No products found" description="Add your first product to start managing inventory." />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
