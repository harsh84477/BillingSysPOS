// @ts-nocheck
import React, { useState, useRef, useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  ArrowLeft, Save, Search, Filter, Loader2, Download, Image as ImageIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { exportStyledExcel } from '@/lib/exportToExcel';
import { CustomerImporter } from '@/components/CustomerImporter';

interface Customer {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  store_type: string | null;
  location_name: string | null;
  pincode: string | null;
  address: string | null;
  notes: string | null;
}

type EditableField = 'name' | 'phone' | 'email' | 'store_type' | 'location_name' | 'pincode' | 'address' | 'notes';

const COLUMNS: { key: EditableField; label: string; type: 'text' | 'store_type'; width: string }[] = [
  { key: 'name',           label: 'Customer Name',   type: 'text',       width: 'min-w-[150px]' },
  { key: 'phone',          label: 'Phone',           type: 'text',       width: 'min-w-[120px]' },
  { key: 'email',          label: 'Email',           type: 'text',       width: 'min-w-[150px]' },
  { key: 'store_type',     label: 'Store Type',      type: 'store_type', width: 'min-w-[140px]' },
  { key: 'location_name',  label: 'Location Name',   type: 'text',       width: 'min-w-[130px]' },
  { key: 'pincode',        label: 'Pincode',         type: 'text',       width: 'min-w-[100px]' },
  { key: 'address',        label: 'Address',         type: 'text',       width: 'min-w-[180px]' },
  { key: 'notes',          label: 'Notes',           type: 'text',       width: 'min-w-[180px]' },
];

const DEFAULT_STORE_TYPES = [
  "Wholesale Store",
  "General Store",
  "Kirana Store",
  "Medical Store",
  "Retail Store"
];

export default function ManageCustomers() {
  const { businessId } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [storeTypeFilter, setStoreTypeFilter] = useState<string>('all');
  const [changes, setChanges] = useState<Record<string, Partial<Record<EditableField, any>>>>({});
  const [activeCell, setActiveCell] = useState<{ row: number; col: number } | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const tableRef = useRef<HTMLTableElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch customers
  const { data: customers = [], isLoading } = useQuery({
    queryKey: ['customers', 'all'],
    queryFn: async () => {
      let query = supabase.from('customers').select('*');
      if (businessId) query = query.eq('business_id', businessId);
      const { data, error } = await query.order('name');
      if (error) throw error;
      return data as unknown as Customer[];
    },
    enabled: !!businessId,
  });

  const uniqueStoreTypes = useMemo(() => {
    const types = new Set(customers.map(c => c.store_type).filter(Boolean) as string[]);
    DEFAULT_STORE_TYPES.forEach(t => types.add(t));
    return Array.from(types);
  }, [customers]);

  // Filter customers
  const filtered = useMemo(() => {
    return customers.filter(c => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = !q ||
        c.name.toLowerCase().includes(q) ||
        (c.phone || '').toLowerCase().includes(q) ||
        (c.location_name || '').toLowerCase().includes(q) ||
        (c.pincode || '').toLowerCase().includes(q);
      const matchesCat = storeTypeFilter === 'all' || c.store_type === storeTypeFilter;
      return matchesSearch && matchesCat;
    });
  }, [customers, searchQuery, storeTypeFilter]);

  const changedCount = Object.keys(changes).length;

  // Get current cell value (with pending changes applied)
  const getCellValue = useCallback((customer: Customer, field: EditableField) => {
    if (changes[customer.id]?.[field] !== undefined) {
      return changes[customer.id][field];
    }
    return customer[field];
  }, [changes]);

  // Start editing a cell
  const startEdit = useCallback((row: number, col: number) => {
    const customer = filtered[row];
    if (!customer) return;
    const field = COLUMNS[col].key;
    const val = getCellValue(customer, field);
    setActiveCell({ row, col });
    setEditValue(val === null || val === undefined ? '' : String(val));
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [filtered, getCellValue]);

  // Commit the current edit
  const commitEdit = useCallback(() => {
    if (!activeCell) return;
    const customer = filtered[activeCell.row];
    if (!customer) return;
    const field = COLUMNS[activeCell.col].key;

    let newVal: any = editValue.trim() || null;

    const original = customer[field];
    // Only track if value actually changed from original
    if (newVal === original || (newVal === null && (original === null || original === undefined || original === ''))) {
      if (changes[customer.id]?.[field] !== undefined) {
        setChanges(prev => {
          const copy = { ...prev };
          const customerChanges = { ...copy[customer.id] };
          delete customerChanges[field];
          if (Object.keys(customerChanges).length === 0) {
            delete copy[customer.id];
          } else {
            copy[customer.id] = customerChanges;
          }
          return copy;
        });
      }
      return;
    }

    setChanges(prev => ({
      ...prev,
      [customer.id]: {
        ...prev[customer.id],
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
      if (e.key === 'Tab' && e.shiftKey) {
        const newCol = col > 0 ? col - 1 : COLUMNS.length - 1;
        const newRow = col > 0 ? row : Math.max(0, row - 1);
        startEdit(newRow, newCol);
      } else if (e.key === 'Tab') {
        const newCol = col < COLUMNS.length - 1 ? col + 1 : 0;
        const newRow = col < COLUMNS.length - 1 ? row : Math.min(filtered.length - 1, row + 1);
        startEdit(newRow, newCol);
      } else {
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
      for (const [customerId, fieldChanges] of entries) {
        if (Object.keys(fieldChanges).length === 0) continue;
        const { error } = await supabase
          .from('customers')
          .update(fieldChanges)
          .eq('id', customerId);
        if (error) throw error;
        successCount++;
      }
      toast.success(`${successCount} customer${successCount > 1 ? 's' : ''} updated`);
      setChanges({});
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    } catch (err: any) {
      toast.error('Failed to save: ' + (err.message || 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  // Auto-save on cell blur
  const handleCellBlur = useCallback(() => {
    commitEdit();
    setTimeout(() => {
      setActiveCell(prev => prev);
    }, 100);
  }, [commitEdit]);

  // Export raw data template for easy importing
  const handleExportData = () => {
    if (filtered.length === 0) { toast.error('No data to export'); return; }
    exportStyledExcel(
      [{
        title: `Customer Data Template (${filtered.length} items)`,
        titleColor: '1F4E79',
        data: filtered,
        columns: [
          { key: 'name', header: 'Name' },
          { key: 'phone', header: 'Phone', format: v => v || '' },
          { key: 'email', header: 'Email', format: v => v || '' },
          { key: 'store_type', header: 'Store Type', format: v => v || '' },
          { key: 'location_name', header: 'Location Name', format: v => v || '' },
          { key: 'pincode', header: 'Pincode', format: v => v || '' },
          { key: 'address', header: 'Address', format: v => v || '' },
          { key: 'notes', header: 'Notes', format: v => v || '' },
        ],
      }],
      null,
      `customer-upload-${format(new Date(), 'yyyy-MM-dd')}`
    );
    toast.success('Exported template successfully. You can safely import this file later.');
  };

  return (
    <div className="flex flex-col h-full" style={{ gap: 16 }}>
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/customers')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="spos-page-heading" style={{ marginBottom: 0 }}>Manage Customers</h1>
            <p className="spos-page-subhead" style={{ marginBottom: 0 }}>
              Edit customers inline — click any cell to edit
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {changedCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              {changedCount} unsaved change{changedCount > 1 ? 's' : ''}
            </Badge>
          )}
          <CustomerImporter />
          <Button onClick={handleExportData} variant="outline" size="sm" title="Download simple export template for re-uploading">
            <Download className="mr-1 sm:mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Export Template</span>
            <span className="sm:hidden">Template</span>
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
            placeholder="Search by name, phone, location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <Select value={storeTypeFilter} onValueChange={setStoreTypeFilter}>
          <SelectTrigger className="w-[160px] h-9">
            <Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
            <SelectValue placeholder="Store Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {uniqueStoreTypes.map((type: string) => (
              <SelectItem key={type} value={type}>{type}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground">
          {filtered.length} customer{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Spreadsheet Table */}
      <div className="flex-1 overflow-auto border rounded-lg bg-card pb-10">
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
            No customers found
          </div>
        ) : (
          <table ref={tableRef} className="w-full text-sm border-collapse">
            <thead className="sticky top-0 z-10 bg-muted/90 backdrop-blur-sm">
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
              {filtered.map((customer, rowIdx) => {
                const isChanged = !!changes[customer.id];
                return (
                  <tr
                    key={customer.id}
                    className={cn(
                      'border-b border-border/50 hover:bg-muted/30 transition-colors',
                      isChanged && 'bg-amber-50/50 dark:bg-amber-950/10'
                    )}
                  >
                    <td className="px-3 py-1.5 text-muted-foreground text-xs tabular-nums">{rowIdx + 1}</td>
                    {COLUMNS.map((col, colIdx) => {
                      const isActive = activeCell?.row === rowIdx && activeCell?.col === colIdx;
                      const value = getCellValue(customer, col.key);
                      const hasChange = changes[customer.id]?.[col.key] !== undefined;

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
                            col.type === 'store_type' ? (
                              <Select
                                value={editValue || 'none'}
                                onValueChange={(val) => {
                                  setEditValue(val === 'none' ? '' : val);
                                  const newVal = val === 'none' ? null : val;
                                  const original = customer[col.key];
                                  if (newVal !== original) {
                                    setChanges(prev => ({
                                      ...prev,
                                      [customer.id]: { ...prev[customer.id], [col.key]: newVal },
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
                                  {uniqueStoreTypes.map((type: string) => (
                                    <SelectItem key={type} value={type}>{type}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <input
                                ref={inputRef}
                                type="text"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onKeyDown={handleKeyDown}
                                onBlur={handleCellBlur}
                                className="w-full h-7 px-2 text-xs bg-transparent outline-none border-0 tabular-nums"
                              />
                            )
                          ) : (
                            <div className={cn(
                              'px-2 py-1 text-xs truncate',
                              !value && value !== 0 && 'text-muted-foreground'
                            )}>
                              {col.type === 'store_type' ? (
                                value ? (
                                  <Badge
                                    variant="secondary"
                                    className="text-[10px] bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                                  >
                                    {value as string}
                                  </Badge>
                                ) : '—'
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
