// @ts-nocheck
/**
 * pages/SalesReturns.tsx — Sales Returns & Credit Notes
 *
 * Lists all processed sales returns for the business.
 * Shows return number, original bill, customer, items returned, amount.
 * Expandable row → shows return items detail.
 */
import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useBusinessSettings } from '@/hooks/useBusinessSettings';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  RotateCcw, Search, ChevronDown, ChevronRight, FileText, Package,
} from 'lucide-react';
import { format } from 'date-fns';
import { exportStyledExcel } from '@/lib/exportToExcel';
import { Download } from 'lucide-react';

interface SalesReturn {
  id: string;
  return_number: string;
  return_date: string;
  reason: string | null;
  total_amount: number;
  status: string;
  created_at: string;
  original_bill_id: string | null;
  bills: { bill_number: string; customers: { name: string } | null } | null;
  return_items: ReturnLineItem[];
  credit_notes: { credit_note_number: string; amount: number }[];
}

interface ReturnLineItem {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export default function SalesReturns() {
  const { businessId } = useAuth();
  const { data: settings } = useBusinessSettings();
  const currencySymbol = settings?.currency_symbol || '₹';
  const [search, setSearch] = useState('');
  const [openRows, setOpenRows] = useState<Set<string>>(new Set());

  const { data: returns = [], isLoading } = useQuery({
    queryKey: ['sales-returns', businessId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sales_returns')
        .select(`
          *,
          bills:original_bill_id (
            bill_number,
            customers ( name )
          ),
          return_items ( id, product_name, quantity, unit_price, total ),
          credit_notes ( credit_note_number, amount )
        `)
        .eq('business_id', businessId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as SalesReturn[];
    },
    enabled: !!businessId,
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return q
      ? returns.filter(r =>
          r.return_number.toLowerCase().includes(q) ||
          (r.bills?.bill_number || '').toLowerCase().includes(q) ||
          (r.bills?.customers?.name || '').toLowerCase().includes(q)
        )
      : returns;
  }, [returns, search]);

  const totalReturned = useMemo(() =>
    returns.reduce((s, r) => s + Number(r.total_amount), 0), [returns]);

  const toggleRow = (id: string) => {
    setOpenRows(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleExport = () => {
    const rows = filtered.map(r => ({
      'Return #': r.return_number,
      'Date': format(new Date(r.created_at), 'dd/MM/yyyy'),
      'Original Bill': r.bills?.bill_number || '—',
      'Customer': r.bills?.customers?.name || 'Walk-in',
      'Reason': r.reason || '—',
      'Amount': Number(r.total_amount).toFixed(2),
      'Credit Note': r.credit_notes?.[0]?.credit_note_number || '—',
    }));
    exportStyledExcel([{ sheetName: 'Sales Returns', rows, columns: Object.keys(rows[0] || {}).map(k => ({ key: k, header: k, format: v => v })) }], 'sales-returns.xlsx');
  };

  return (
    <div className="space-y-5 p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="spos-page-heading">Sales Returns</h1>
          <p className="spos-page-subhead" style={{ marginBottom: 0 }}>
            {returns.length} return{returns.length !== 1 ? 's' : ''} · Total refunded: {currencySymbol}{totalReturned.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExport} disabled={filtered.length === 0}>
          <Download className="mr-2 h-3.5 w-3.5" />Export
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          { label: 'Total Returns', value: returns.length },
          { label: 'Total Refunded', value: `${currencySymbol}${totalReturned.toFixed(2)}` },
          { label: 'Credit Notes Issued', value: returns.filter(r => r.credit_notes?.length > 0).length },
        ].map(stat => (
          <Card key={stat.label} className="p-4">
            <p className="text-xs text-muted-foreground">{stat.label}</p>
            <p className="text-xl font-black text-primary mt-1">{stat.value}</p>
          </Card>
        ))}
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search return #, bill #, customer..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Loading returns...</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <RotateCcw className="h-12 w-12 mx-auto text-muted-foreground/20" />
              <p className="text-sm text-muted-foreground">
                {search ? 'No matching returns' : 'No returns processed yet'}
              </p>
              <p className="text-xs text-muted-foreground">
                Use "Return Items" from Bills History to process a return
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8" />
                  <TableHead>Return #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Original Bill</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Credit Note</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(ret => (
                  <React.Fragment key={ret.id}>
                    <TableRow className="cursor-pointer hover:bg-muted/40" onClick={() => toggleRow(ret.id)}>
                      <TableCell>
                        {openRows.has(ret.id)
                          ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                      </TableCell>
                      <TableCell className="font-medium font-mono text-sm">{ret.return_number}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(ret.created_at), 'dd MMM yyyy')}
                      </TableCell>
                      <TableCell>
                        {ret.bills ? (
                          <Badge variant="outline" className="font-mono text-xs">#{ret.bills.bill_number}</Badge>
                        ) : '—'}
                      </TableCell>
                      <TableCell>{ret.bills?.customers?.name || 'Walk-in'}</TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[180px] truncate">{ret.reason || '—'}</TableCell>
                      <TableCell className="text-right font-bold text-destructive">
                        {currencySymbol}{Number(ret.total_amount).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        {ret.credit_notes?.[0] ? (
                          <Badge variant="secondary" className="font-mono text-xs">
                            {ret.credit_notes[0].credit_note_number}
                          </Badge>
                        ) : '—'}
                      </TableCell>
                    </TableRow>
                    {openRows.has(ret.id) && (
                      <TableRow>
                        <TableCell colSpan={8} className="p-0 bg-muted/20">
                          <div className="px-6 py-3 space-y-1">
                            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Returned Items</p>
                            {(ret.return_items || []).map(item => (
                              <div key={item.id} className="flex items-center justify-between text-sm border-b border-border/50 pb-1.5 last:border-0">
                                <div className="flex items-center gap-2">
                                  <Package className="h-3.5 w-3.5 text-muted-foreground" />
                                  <span>{item.product_name}</span>
                                </div>
                                <div className="flex items-center gap-4 text-muted-foreground">
                                  <span>{item.quantity} × {currencySymbol}{Number(item.unit_price).toFixed(2)}</span>
                                  <span className="font-semibold text-foreground">{currencySymbol}{Number(item.total).toFixed(2)}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
