// @ts-nocheck
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useBusinessSettings } from '@/hooks/useBusinessSettings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  ArrowLeft, Save, Search, Filter, Check, X, Loader2, Download, FileSpreadsheet,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { exportStyledExcel } from '@/lib/exportToExcel';
import { ProductImporter } from '@/components/ProductImporter';

interface Product {
  id: string;
  name: string;
  item_code: string | null;
  sku: string | null;
  category_id: string | null;
  mrp_price: number;
  selling_price: number;
  cost_price: number;
  wholesale_price: number;
  stock_quantity: number;
  items_per_case: number;
  categories?: { name: string; color: string | null } | null;
}

type EditableField = 'name' | 'item_code' | 'sku' | 'category_id' | 'mrp_price' | 'selling_price' | 'cost_price' | 'wholesale_price' | 'stock_quantity' | 'items_per_case' | 'cases';

const COLUMNS: { key: EditableField; label: string; type: 'text' | 'number' | 'category'; width: string }[] = [
  { key: 'name',            label: 'Product Name',   type: 'text',     width: 'min-w-[180px]' },
  { key: 'item_code',       label: 'Item Code',      type: 'text',     width: 'min-w-[100px]' },
  { key: 'sku',             label: 'SKU',             type: 'text',     width: 'min-w-[100px]' },
  { key: 'category_id',     label: 'Category',        type: 'category', width: 'min-w-[130px]' },
  { key: 'mrp_price',       label: 'MRP',             type: 'number',   width: 'min-w-[90px]' },
  { key: 'selling_price',   label: 'Selling Price',   type: 'number',   width: 'min-w-[100px]' },
  { key: 'cost_price',      label: 'Cost Price',      type: 'number',   width: 'min-w-[90px]' },
  { key: 'wholesale_price', label: 'Wholesale',       type: 'number',   width: 'min-w-[90px]' },
  { key: 'items_per_case',  label: 'PCS/Case',         type: 'number',   width: 'min-w-[80px]' },
  { key: 'cases',           label: 'Cases',            type: 'number',   width: 'min-w-[80px]' },
  { key: 'stock_quantity',  label: 'Stock',            type: 'number',   width: 'min-w-[80px]' },
];

export default function ManageProducts() {
  const { businessId } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { data: settings } = useBusinessSettings();
  const currencySymbol = settings?.currency_symbol || '₹';

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [changes, setChanges] = useState<Record<string, Partial<Record<EditableField, any>>>>({});
  const [activeCell, setActiveCell] = useState<{ row: number; col: number } | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const tableRef = useRef<HTMLTableElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch categories
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

  // Fetch products
  const { data: products = [], isLoading } = useQuery({
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

  // Filter products
  const filtered = useMemo(() => {
    return products.filter(p => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = !q ||
        p.name.toLowerCase().includes(q) ||
        (p.item_code || '').toLowerCase().includes(q) ||
        (p.sku || '').toLowerCase().includes(q);
      const matchesCat = categoryFilter === 'all' || p.category_id === categoryFilter;
      return matchesSearch && matchesCat;
    });
  }, [products, searchQuery, categoryFilter]);

  const changedCount = Object.keys(changes).length;

  // Get current cell value (with pending changes applied)
  const getCellValue = useCallback((product: Product, field: EditableField) => {
    if (field === 'cases') {
      // Computed: stock_quantity / items_per_case
      const qty = changes[product.id]?.stock_quantity !== undefined
        ? Number(changes[product.id].stock_quantity)
        : product.stock_quantity;
      const ppc = changes[product.id]?.items_per_case !== undefined
        ? Number(changes[product.id].items_per_case)
        : product.items_per_case;
      return ppc > 0 ? Math.round((qty / ppc) * 100) / 100 : 0;
    }
    if (changes[product.id]?.[field] !== undefined) {
      return changes[product.id][field];
    }
    return product[field];
  }, [changes]);

  // Start editing a cell
  const startEdit = useCallback((row: number, col: number) => {
    const product = filtered[row];
    if (!product) return;
    const field = COLUMNS[col].key;
    const val = getCellValue(product, field);
    setActiveCell({ row, col });
    setEditValue(val === null || val === undefined ? '' : String(val));
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [filtered, getCellValue]);

  // Commit the current edit
  const commitEdit = useCallback(() => {
    if (!activeCell) return;
    const product = filtered[activeCell.row];
    if (!product) return;
    const field = COLUMNS[activeCell.col].key;
    const col = COLUMNS[activeCell.col];

    let newVal: any = editValue;
    if (col.type === 'number') {
      newVal = editValue === '' ? 0 : Number(editValue);
      if (isNaN(newVal)) newVal = 0;
    } else {
      newVal = editValue.trim() || null;
    }

    // Handle virtual 'cases' field: update stock_quantity = cases * items_per_case
    if (field === 'cases') {
      const ppc = changes[product.id]?.items_per_case !== undefined
        ? Number(changes[product.id].items_per_case)
        : product.items_per_case;
      if (ppc > 0) {
        const newStock = Math.round(newVal * ppc * 100) / 100;
        setChanges(prev => ({
          ...prev,
          [product.id]: {
            ...prev[product.id],
            stock_quantity: newStock,
          },
        }));
      }
      return;
    }

    // If items_per_case changed, also update stock if there were cases set
    if (field === 'items_per_case') {
      const currentStock = changes[product.id]?.stock_quantity !== undefined
        ? Number(changes[product.id].stock_quantity)
        : product.stock_quantity;
      // Just save the new items_per_case, cases column will recompute automatically
    }

    // If stock_quantity changed, cases column will recompute automatically via getCellValue

    const original = product[field];
    // Only track if value actually changed from original
    if (newVal === original || (newVal === null && (original === null || original === undefined || original === ''))) {
      // Check if there was a previous change that should be removed
      if (changes[product.id]?.[field] !== undefined) {
        setChanges(prev => {
          const copy = { ...prev };
          const productChanges = { ...copy[product.id] };
          delete productChanges[field];
          if (Object.keys(productChanges).length === 0) {
            delete copy[product.id];
          } else {
            copy[product.id] = productChanges;
          }
          return copy;
        });
      }
      return;
    }

    setChanges(prev => ({
      ...prev,
      [product.id]: {
        ...prev[product.id],
        [field]: newVal,
      },
    }));
  }, [activeCell, filtered, editValue, changes]);

  // Cancel editing
  const cancelEdit = useCallback(() => {
    setActiveCell(null);
    setEditValue('');
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!activeCell) return;
    const { row, col } = activeCell;

    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      commitEdit();
      // Move to next cell
      if (e.key === 'Tab' && e.shiftKey) {
        const newCol = col > 0 ? col - 1 : COLUMNS.length - 1;
        const newRow = col > 0 ? row : Math.max(0, row - 1);
        startEdit(newRow, newCol);
      } else if (e.key === 'Tab') {
        const newCol = col < COLUMNS.length - 1 ? col + 1 : 0;
        const newRow = col < COLUMNS.length - 1 ? row : Math.min(filtered.length - 1, row + 1);
        startEdit(newRow, newCol);
      } else {
        // Enter moves down
        if (row < filtered.length - 1) startEdit(row + 1, col);
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
      if (row < filtered.length - 1) startEdit(row + 1, col);
    }
  }, [activeCell, commitEdit, cancelEdit, startEdit, filtered.length]);

  // Save all changes
  const handleSaveAll = async () => {
    if (changedCount === 0) return;
    setSaving(true);
    try {
      const entries = Object.entries(changes);
      let successCount = 0;
      for (const [productId, fieldChanges] of entries) {
        // Strip virtual fields before saving
        const { cases, ...dbFields } = fieldChanges as any;
        if (Object.keys(dbFields).length === 0) continue;
        const { error } = await supabase
          .from('products')
          .update(dbFields)
          .eq('id', productId);
        if (error) throw error;
        successCount++;
      }
      toast.success(`${successCount} product${successCount > 1 ? 's' : ''} updated`);
      setChanges({});
      queryClient.invalidateQueries({ queryKey: ['products'] });
    } catch (err: any) {
      toast.error('Failed to save: ' + (err.message || 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  // Auto-save on cell blur
  const handleCellBlur = useCallback(() => {
    commitEdit();
    // Defer clearing to avoid race with click on another cell
    setTimeout(() => {
      setActiveCell(prev => {
        // Only clear if hasn't been set to a new cell
        return prev;
      });
    }, 100);
  }, [commitEdit]);

  // Category name lookup
  const getCategoryName = (catId: string | null) => {
    if (!catId) return '—';
    const cat = categories.find((c: any) => c.id === catId);
    return cat ? cat.name : '—';
  };

  const getCategoryColor = (catId: string | null) => {
    if (!catId) return undefined;
    const cat = categories.find((c: any) => c.id === catId);
    return cat?.color || undefined;
  };

  // Export products
  const handleExportExcel = () => {
    if (filtered.length === 0) { toast.error('No data to export'); return; }
    exportStyledExcel(
      [{
        title: `Product Inventory (${filtered.length} items)`,
        titleColor: '1F4E79',
        data: filtered,
        columns: [
          { key: 'name', header: 'Product Name' },
          { key: 'item_code', header: 'Item Code', format: (v) => v || '' },
          { key: 'sku', header: 'SKU', format: (v) => v || '' },
          { key: 'categories', header: 'Category', format: (v) => (v as { name: string } | null)?.name || '' },
          { key: 'mrp_price', header: 'MRP', format: (v) => Number(v || 0).toFixed(2) },
          { key: 'selling_price', header: 'Selling Price', format: (v) => Number(v).toFixed(2) },
          { key: 'cost_price', header: 'Cost Price', format: (v) => Number(v).toFixed(2) },
          { key: 'wholesale_price', header: 'Wholesale Price', format: (v) => Number(v || 0).toFixed(2) },
          { key: 'items_per_case', header: 'PCS/Case', format: (v) => Number(v) || '' },
          { key: '_cases', header: 'Cases', format: (_v, _k, item: any) => {
            const ppc = Number(item?.items_per_case);
            const qty = Number(item?.stock_quantity);
            return ppc > 0 ? Math.round((qty / ppc) * 100) / 100 : '';
          }},
          { key: 'stock_quantity', header: 'Stock (PCS)', format: (v) => Number(v) },
        ],
      }],
      null,
      `products-${format(new Date(), 'yyyy-MM-dd')}`
    );
    toast.success('Exported successfully');
  };

  return (
    <div className="flex flex-col h-full" style={{ gap: 16 }}>
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/products')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="spos-page-heading" style={{ marginBottom: 0 }}>Manage Products</h1>
            <p className="spos-page-subhead" style={{ marginBottom: 0 }}>
              Edit products inline — click any cell to edit
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {changedCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              {changedCount} unsaved change{changedCount > 1 ? 's' : ''}
            </Badge>
          )}
          <ProductImporter />
          <Button onClick={handleExportExcel} variant="outline" size="sm">
            <Download className="mr-1 sm:mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Export Excel</span>
            <span className="sm:hidden">Export</span>
          </Button>
          <Button
            onClick={handleSaveAll}
            disabled={changedCount === 0 || saving}
            size="sm"
          >
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save All Changes
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, code, SKU..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[160px] h-9">
            <Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((cat: any) => (
              <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground">
          {filtered.length} product{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Spreadsheet Table */}
      <div className="flex-1 overflow-auto border rounded-lg bg-card">
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
            No products found
          </div>
        ) : (
          <table ref={tableRef} className="w-full text-sm border-collapse">
            <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm">
              <tr>
                <th className="px-3 py-2 text-left text-[10px] font-bold uppercase text-muted-foreground border-b w-10">#</th>
                {COLUMNS.map(col => (
                  <th key={col.key} className={cn('px-3 py-2 text-left text-[10px] font-bold uppercase text-muted-foreground border-b', col.width)}>
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((product, rowIdx) => {
                const isChanged = !!changes[product.id];
                return (
                  <tr
                    key={product.id}
                    className={cn(
                      'border-b border-border/50 hover:bg-muted/30 transition-colors',
                      isChanged && 'bg-amber-50/50 dark:bg-amber-950/10'
                    )}
                  >
                    <td className="px-3 py-1.5 text-muted-foreground text-xs tabular-nums">{rowIdx + 1}</td>
                    {COLUMNS.map((col, colIdx) => {
                      const isActive = activeCell?.row === rowIdx && activeCell?.col === colIdx;
                      const value = getCellValue(product, col.key);
                      const hasChange = changes[product.id]?.[col.key] !== undefined;

                      return (
                        <td
                          key={col.key}
                          className={cn(
                            'px-1 py-0.5 cursor-pointer transition-colors',
                            isActive && 'ring-2 ring-primary ring-inset bg-primary/5',
                            !isActive && hasChange && 'bg-amber-100/50 dark:bg-amber-900/20',
                            col.width
                          )}
                          onClick={() => {
                            if (!isActive) {
                              if (activeCell) commitEdit();
                              startEdit(rowIdx, colIdx);
                            }
                          }}
                        >
                          {isActive ? (
                            col.type === 'category' ? (
                              <Select
                                value={editValue || 'none'}
                                onValueChange={(val) => {
                                  setEditValue(val === 'none' ? '' : val);
                                  // Auto-commit category changes
                                  const newVal = val === 'none' ? null : val;
                                  const original = product[col.key];
                                  if (newVal !== original) {
                                    setChanges(prev => ({
                                      ...prev,
                                      [product.id]: { ...prev[product.id], [col.key]: newVal },
                                    }));
                                  }
                                  setActiveCell(null);
                                }}
                              >
                                <SelectTrigger className="h-7 text-xs border-0 shadow-none focus:ring-0">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">None</SelectItem>
                                  {categories.map((cat: any) => (
                                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <input
                                ref={inputRef}
                                type={col.type === 'number' ? 'number' : 'text'}
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onKeyDown={handleKeyDown}
                                onBlur={handleCellBlur}
                                className="w-full h-7 px-2 text-xs bg-transparent outline-none border-0 tabular-nums"
                                step={col.type === 'number' ? 'any' : undefined}
                                min={col.type === 'number' ? 0 : undefined}
                              />
                            )
                          ) : (
                            <div className={cn(
                              'px-2 py-1 text-xs truncate',
                              col.type === 'number' && 'tabular-nums text-right',
                              !value && value !== 0 && 'text-muted-foreground'
                            )}>
                              {col.type === 'category' ? (
                                value ? (
                                  <Badge
                                    variant="secondary"
                                    className="text-[10px]"
                                    style={{
                                      backgroundColor: (getCategoryColor(value as string) || '#888') + '20',
                                      color: getCategoryColor(value as string) || undefined,
                                    }}
                                  >
                                    {getCategoryName(value as string)}
                                  </Badge>
                                ) : '—'
                              ) : col.type === 'number' ? (
                                col.key === 'stock_quantity' || col.key === 'cases' || col.key === 'items_per_case'
                                  ? (value ?? 0)
                                  : `${currencySymbol}${Number(value ?? 0).toFixed(2)}`
                              ) : (
                                value || '—'
                              )}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Keyboard shortcuts hint */}
      <div className="text-[10px] text-muted-foreground flex items-center gap-4 pb-2">
        <span><kbd className="px-1 py-0.5 bg-muted rounded text-[9px]">Enter</kbd> move down</span>
        <span><kbd className="px-1 py-0.5 bg-muted rounded text-[9px]">Tab</kbd> move right</span>
        <span><kbd className="px-1 py-0.5 bg-muted rounded text-[9px]">Esc</kbd> cancel</span>
        <span><kbd className="px-1 py-0.5 bg-muted rounded text-[9px]">Alt+↑↓</kbd> navigate rows</span>
      </div>
    </div>
  );
}
