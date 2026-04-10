// @ts-nocheck
/**
 * components/reports/GSTFilingTab.tsx
 *
 * GSTR-1 / GSTR-3B summary based on bills in the selected date range.
 *
 * Data sources:
 *  - bills (for totals, customer_id, tax_amount)
 *  - customers (for gstin — separates B2B vs B2C)
 *  - bill_items + products (for HSN summary)
 *  - business_settings (for tax_rate, gst_number)
 *
 * Sections shown:
 *  GSTR-1:
 *    • B2B  — bills to customers with GSTIN
 *    • B2C  — bills to customers without GSTIN
 *    • HSN Summary — per HSN code
 *    • Nil / Exempt — zero-tax bills
 *
 *  GSTR-3B:
 *    • Outward supply summary (taxable + exempt)
 *    • Tax payable (IGST / CGST+SGST)
 *
 *  Export to Excel button — multi-sheet workbook
 */
import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useBusinessSettings } from '@/hooks/useBusinessSettings';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Download, FileSpreadsheet, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';

// ──────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────
interface GSTBill {
  id: string;
  bill_number: string;
  completed_at: string | null;
  created_at: string;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  customer_id: string | null;
  customers: {
    name: string;
    gstin?: string | null;
    state?: string | null;
  } | null;
}

interface GSTFilingTabProps {
  dateFrom: Date | null;
  dateTo: Date;
}

// ──────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────
function twoDecimals(n: number) {
  return Math.round(n * 100) / 100;
}

function halfOf(n: number) {
  return twoDecimals(n / 2);
}

// ──────────────────────────────────────────────────────────
// Main Component
// ──────────────────────────────────────────────────────────
export function GSTFilingTab({ dateFrom, dateTo }: GSTFilingTabProps) {
  const { businessId } = useAuth();
  const { data: settings } = useBusinessSettings();
  const currencySymbol = settings?.currency_symbol || '₹';
  const taxRate = Number(settings?.tax_rate || 0);
  const gstNumber = settings?.gst_number || '';
  const businessName = settings?.business_name || 'My Business';
  const [gstSection, setGstSection] = useState<'gstr1' | 'gstr3b'>('gstr1');

  // ── Fetch taxable bills in date range ────────────────────
  const { data: bills = [], isLoading } = useQuery({
    queryKey: ['gst-bills', businessId, dateFrom?.toISOString(), dateTo.toISOString()],
    queryFn: async () => {
      let query = supabase
        .from('bills')
        .select(`
          id, bill_number, completed_at, created_at,
          subtotal, tax_amount, discount_amount, total_amount,
          customer_id,
          customers ( name, gstin, state )
        `)
        .eq('business_id', businessId)
        .eq('status', 'completed')
        .order('completed_at', { ascending: true });

      if (dateFrom) query = query.gte('completed_at', dateFrom.toISOString());
      query = query.lte('completed_at', dateTo.toISOString());

      const { data, error } = await query;
      if (error) throw error;
      return data as GSTBill[];
    },
    enabled: !!businessId,
  });

  // ── Fetch bill items with HSN codes via products ─────────
  const { data: hsnRows = [] } = useQuery({
    queryKey: ['gst-hsn', businessId, dateFrom?.toISOString(), dateTo.toISOString()],
    queryFn: async () => {
      // Get all bill_items for completed bills in range, with product HSN
      const billIds = bills.filter(b => b.tax_amount > 0).map(b => b.id);
      if (billIds.length === 0) return [];

      const { data, error } = await supabase
        .from('bill_items')
        .select(`
          product_name, quantity, unit_price, total_price,
          products ( hsn_code, gst_rate )
        `)
        .in('bill_id', billIds);
      if (error) throw error;
      return data;
    },
    enabled: bills.length > 0,
  });

  // ── Compute derived data ─────────────────────────────────
  const { b2b, b2c, nilBills, totalTaxable, totalTax, totalExempt } = useMemo(() => {
    const b2b: GSTBill[] = [];
    const b2c: GSTBill[] = [];
    const nilBills: GSTBill[] = [];
    let totalTaxable = 0;
    let totalTax = 0;
    let totalExempt = 0;

    for (const bill of bills) {
      if (bill.tax_amount > 0) {
        totalTaxable += Number(bill.subtotal);
        totalTax += Number(bill.tax_amount);
        if (bill.customers?.gstin) {
          b2b.push(bill);
        } else {
          b2c.push(bill);
        }
      } else {
        nilBills.push(bill);
        totalExempt += Number(bill.total_amount);
      }
    }

    return { b2b, b2c, nilBills, totalTaxable: twoDecimals(totalTaxable), totalTax: twoDecimals(totalTax), totalExempt: twoDecimals(totalExempt) };
  }, [bills]);

  // HSN Summary
  const hsnSummary = useMemo(() => {
    const map: Record<string, { hsn: string; qty: number; taxable: number; tax: number; effectiveRate: number }> = {};
    for (const row of hsnRows) {
      const hsn = (row.products as any)?.hsn_code || 'OTHER';
      const rate = Number((row.products as any)?.gst_rate ?? taxRate);
      const taxable = Number(row.total_price) / (1 + rate / 100);
      const tax = Number(row.total_price) - taxable;
      if (!map[hsn]) map[hsn] = { hsn, qty: 0, taxable: 0, tax: 0, effectiveRate: rate };
      map[hsn].qty += Number(row.quantity);
      map[hsn].taxable += taxable;
      map[hsn].tax += tax;
    }
    return Object.values(map).map(r => ({
      ...r,
      taxable: twoDecimals(r.taxable),
      tax: twoDecimals(r.tax),
    }));
  }, [hsnRows, taxRate]);

  // GSTR-3B summary
  const gstr3b = useMemo(() => {
    return {
      taxableSupply: totalTaxable,
      exemptSupply: totalExempt,
      taxPayable: totalTax,
      cgst: halfOf(totalTax),
      sgst: halfOf(totalTax),
      igst: 0,  // Simplified: no inter-state detection
    };
  }, [totalTaxable, totalTax, totalExempt]);

  // ── Export to Excel ──────────────────────────────────────
  const handleExportGST = () => {
    const wb = XLSX.utils.book_new();
    const period = `${format(dateFrom || new Date(), 'MMM yyyy')} to ${format(dateTo, 'MMM yyyy')}`;

    // B2B sheet
    if (b2b.length > 0) {
      const b2bData = b2b.map(bill => ({
        'GSTIN of Recipient': bill.customers?.gstin || '',
        'Receiver Name': bill.customers?.name || '',
        'Invoice Number': bill.bill_number,
        'Invoice Date': format(new Date(bill.completed_at || bill.created_at), 'dd/MM/yyyy'),
        'Invoice Value': twoDecimals(Number(bill.total_amount)),
        'Taxable Value': twoDecimals(Number(bill.subtotal) - Number(bill.discount_amount)),
        'IGST': 0,
        'CGST': halfOf(Number(bill.tax_amount)),
        'SGST': halfOf(Number(bill.tax_amount)),
        'Tax Rate (%)': taxRate,
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(b2bData), 'B2B');
    }

    // B2C sheet
    if (b2c.length > 0) {
      const b2cData = b2c.map(bill => ({
        'Invoice Number': bill.bill_number,
        'Invoice Date': format(new Date(bill.completed_at || bill.created_at), 'dd/MM/yyyy'),
        'Customer': bill.customers?.name || 'Walk-in',
        'Invoice Value': twoDecimals(Number(bill.total_amount)),
        'Taxable Value': twoDecimals(Number(bill.subtotal) - Number(bill.discount_amount)),
        'IGST': 0,
        'CGST': halfOf(Number(bill.tax_amount)),
        'SGST': halfOf(Number(bill.tax_amount)),
        'Tax Rate (%)': taxRate,
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(b2cData), 'B2C');
    }

    // HSN sheet
    if (hsnSummary.length > 0) {
      const hsnData = hsnSummary.map(h => ({
        'HSN/SAC Code': h.hsn,
        'Total Quantity': h.qty,
        'Taxable Value': h.taxable,
        'Integrated Tax': 0,
        'Central Tax (CGST)': halfOf(h.tax),
        'State Tax (SGST)': halfOf(h.tax),
        'Tax Rate (%)': h.effectiveRate,
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(hsnData), 'HSN Summary');
    }

    // GSTR-3B sheet
    const g3bData = [
      { 'Section': '3.1(a) Outward Taxable Supplies', 'Taxable Value': gstr3b.taxableSupply, 'IGST': gstr3b.igst, 'CGST': gstr3b.cgst, 'SGST': gstr3b.sgst },
      { 'Section': '3.1(c) Nil Rated/Exempt', 'Taxable Value': gstr3b.exemptSupply, 'IGST': 0, 'CGST': 0, 'SGST': 0 },
      { 'Section': 'Total Tax Payable', 'Taxable Value': gstr3b.taxableSupply + gstr3b.exemptSupply, 'IGST': gstr3b.igst, 'CGST': gstr3b.cgst, 'SGST': gstr3b.sgst },
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(g3bData), 'GSTR-3B');

    // Summary sheet
    const summaryData = [
      { 'Field': 'Business Name', 'Value': businessName },
      { 'Field': 'GSTIN', 'Value': gstNumber || 'Not set' },
      { 'Field': 'Period', 'Value': period },
      { 'Field': 'Total Invoices', 'Value': bills.length },
      { 'Field': 'B2B Invoices', 'Value': b2b.length },
      { 'Field': 'B2C Invoices', 'Value': b2c.length },
      { 'Field': 'Nil/Exempt Invoices', 'Value': nilBills.length },
      { 'Field': 'Total Taxable Value', 'Value': `${currencySymbol}${totalTaxable}` },
      { 'Field': 'Total Tax Collected', 'Value': `${currencySymbol}${totalTax}` },
      { 'Field': 'CGST', 'Value': `${currencySymbol}${gstr3b.cgst}` },
      { 'Field': 'SGST', 'Value': `${currencySymbol}${gstr3b.sgst}` },
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryData), 'Summary');

    XLSX.writeFile(wb, `GSTR_${format(dateFrom || new Date(), 'MMMyyyy')}_${format(dateTo, 'MMMyyyy')}.xlsx`);
  };

  const periodLabel = dateFrom
    ? `${format(dateFrom, 'dd MMM yyyy')} – ${format(dateTo, 'dd MMM yyyy')}`
    : `Up to ${format(dateTo, 'dd MMM yyyy')}`;

  if (isLoading) {
    return <div className="py-16 text-center text-sm text-muted-foreground">Loading GST data...</div>;
  }

  return (
    <div className="space-y-5">
      {/* Info bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">Period: <strong>{periodLabel}</strong></p>
          {gstNumber && <p className="text-xs text-muted-foreground">GSTIN: {gstNumber}</p>}
          {!gstNumber && (
            <Alert className="mt-2 py-2">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                GSTIN not configured. Add it in Settings → Business Profile to include in exports.
              </AlertDescription>
            </Alert>
          )}
        </div>
        <Button onClick={handleExportGST} disabled={bills.length === 0} size="sm" className="gap-2">
          <FileSpreadsheet className="h-4 w-4" />
          Export GSTR Excel
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Invoices', value: bills.length, sub: `${b2b.length} B2B · ${b2c.length} B2C` },
          { label: 'Taxable Value', value: `${currencySymbol}${totalTaxable.toLocaleString('en-IN')}`, sub: `${bills.filter(b => b.tax_amount > 0).length} taxable bills` },
          { label: 'Tax Collected', value: `${currencySymbol}${totalTax.toLocaleString('en-IN')}`, sub: `CGST+SGST` },
          { label: 'Nil/Exempt', value: `${currencySymbol}${totalExempt.toLocaleString('en-IN')}`, sub: `${nilBills.length} bills` },
        ].map(k => (
          <Card key={k.label} className="p-4">
            <p className="text-xs text-muted-foreground">{k.label}</p>
            <p className="text-lg font-black text-primary mt-0.5">{k.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{k.sub}</p>
          </Card>
        ))}
      </div>

      {/* Tabs: GSTR-1 / GSTR-3B */}
      <Tabs value={gstSection} onValueChange={(v: any) => setGstSection(v)}>
        <TabsList className="mb-4">
          <TabsTrigger value="gstr1">GSTR-1</TabsTrigger>
          <TabsTrigger value="gstr3b">GSTR-3B Summary</TabsTrigger>
        </TabsList>

        {/* ── GSTR-1 ──────────────────────────────────────── */}
        <TabsContent value="gstr1" className="space-y-5 mt-0">

          {/* B2B */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                B2B Invoices
                <Badge variant="secondary">{b2b.length}</Badge>
              </CardTitle>
              <p className="text-xs text-muted-foreground">Invoices to registered businesses (with GSTIN)</p>
            </CardHeader>
            <CardContent className="p-0">
              {b2b.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">No B2B invoices in this period.</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Invoice #</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>GSTIN</TableHead>
                        <TableHead className="text-right">Taxable</TableHead>
                        <TableHead className="text-right">CGST</TableHead>
                        <TableHead className="text-right">SGST</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {b2b.map(bill => (
                        <TableRow key={bill.id}>
                          <TableCell className="font-mono text-xs">#{bill.bill_number}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {format(new Date(bill.completed_at || bill.created_at), 'dd/MM/yyyy')}
                          </TableCell>
                          <TableCell className="text-sm">{bill.customers?.name || '—'}</TableCell>
                          <TableCell className="font-mono text-xs">{bill.customers?.gstin}</TableCell>
                          <TableCell className="text-right text-sm">{currencySymbol}{twoDecimals(Number(bill.subtotal) - Number(bill.discount_amount)).toFixed(2)}</TableCell>
                          <TableCell className="text-right text-sm">{currencySymbol}{halfOf(Number(bill.tax_amount)).toFixed(2)}</TableCell>
                          <TableCell className="text-right text-sm">{currencySymbol}{halfOf(Number(bill.tax_amount)).toFixed(2)}</TableCell>
                          <TableCell className="text-right font-semibold text-sm">{currencySymbol}{twoDecimals(Number(bill.total_amount)).toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* B2C */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                B2C Invoices
                <Badge variant="secondary">{b2c.length}</Badge>
              </CardTitle>
              <p className="text-xs text-muted-foreground">Invoices to unregistered customers (no GSTIN)</p>
            </CardHeader>
            <CardContent className="p-0">
              {b2c.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">No B2C invoices in this period.</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Invoice #</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead className="text-right">Taxable</TableHead>
                        <TableHead className="text-right">CGST</TableHead>
                        <TableHead className="text-right">SGST</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {b2c.map(bill => (
                        <TableRow key={bill.id}>
                          <TableCell className="font-mono text-xs">#{bill.bill_number}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {format(new Date(bill.completed_at || bill.created_at), 'dd/MM/yyyy')}
                          </TableCell>
                          <TableCell className="text-sm">{bill.customers?.name || 'Walk-in'}</TableCell>
                          <TableCell className="text-right text-sm">{currencySymbol}{twoDecimals(Number(bill.subtotal) - Number(bill.discount_amount)).toFixed(2)}</TableCell>
                          <TableCell className="text-right text-sm">{currencySymbol}{halfOf(Number(bill.tax_amount)).toFixed(2)}</TableCell>
                          <TableCell className="text-right text-sm">{currencySymbol}{halfOf(Number(bill.tax_amount)).toFixed(2)}</TableCell>
                          <TableCell className="text-right font-semibold text-sm">{currencySymbol}{twoDecimals(Number(bill.total_amount)).toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* HSN Summary */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                HSN-wise Summary
                <Badge variant="secondary">{hsnSummary.length}</Badge>
              </CardTitle>
              <p className="text-xs text-muted-foreground">Set HSN codes on Products to enrich this report</p>
            </CardHeader>
            <CardContent className="p-0">
              {hsnSummary.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">No HSN data available for this period.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>HSN / SAC</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Taxable Value</TableHead>
                      <TableHead className="text-right">CGST</TableHead>
                      <TableHead className="text-right">SGST</TableHead>
                      <TableHead className="text-right">Rate</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {hsnSummary.map(h => (
                      <TableRow key={h.hsn}>
                        <TableCell className="font-mono font-medium">{h.hsn}</TableCell>
                        <TableCell className="text-right">{h.qty}</TableCell>
                        <TableCell className="text-right">{currencySymbol}{h.taxable.toFixed(2)}</TableCell>
                        <TableCell className="text-right">{currencySymbol}{halfOf(h.tax).toFixed(2)}</TableCell>
                        <TableCell className="text-right">{currencySymbol}{halfOf(h.tax).toFixed(2)}</TableCell>
                        <TableCell className="text-right">{h.effectiveRate}%</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Nil / Exempt */}
          {nilBills.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  Nil Rated / Exempt
                  <Badge variant="secondary">{nilBills.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead className="text-right">Value</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {nilBills.map(bill => (
                      <TableRow key={bill.id}>
                        <TableCell className="font-mono text-xs">#{bill.bill_number}</TableCell>
                        <TableCell className="text-xs">{format(new Date(bill.completed_at || bill.created_at), 'dd/MM/yyyy')}</TableCell>
                        <TableCell>{bill.customers?.name || 'Walk-in'}</TableCell>
                        <TableCell className="text-right">{currencySymbol}{twoDecimals(Number(bill.total_amount)).toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── GSTR-3B ─────────────────────────────────────── */}
        <TabsContent value="gstr3b" className="space-y-4 mt-0">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">3.1 — Outward Supplies</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nature of Supply</TableHead>
                    <TableHead className="text-right">Total Taxable Value</TableHead>
                    <TableHead className="text-right">IGST</TableHead>
                    <TableHead className="text-right">CGST</TableHead>
                    <TableHead className="text-right">SGST</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">3.1(a) Outward Taxable Supplies</TableCell>
                    <TableCell className="text-right">{currencySymbol}{gstr3b.taxableSupply.toFixed(2)}</TableCell>
                    <TableCell className="text-right">{currencySymbol}{gstr3b.igst.toFixed(2)}</TableCell>
                    <TableCell className="text-right">{currencySymbol}{gstr3b.cgst.toFixed(2)}</TableCell>
                    <TableCell className="text-right">{currencySymbol}{gstr3b.sgst.toFixed(2)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">3.1(c) Nil Rated / Exempt Supplies</TableCell>
                    <TableCell className="text-right">{currencySymbol}{gstr3b.exemptSupply.toFixed(2)}</TableCell>
                    <TableCell className="text-right">—</TableCell>
                    <TableCell className="text-right">—</TableCell>
                    <TableCell className="text-right">—</TableCell>
                  </TableRow>
                  <TableRow className="font-bold bg-muted/30">
                    <TableCell>Total</TableCell>
                    <TableCell className="text-right">{currencySymbol}{(gstr3b.taxableSupply + gstr3b.exemptSupply).toFixed(2)}</TableCell>
                    <TableCell className="text-right">{currencySymbol}{gstr3b.igst.toFixed(2)}</TableCell>
                    <TableCell className="text-right">{currencySymbol}{gstr3b.cgst.toFixed(2)}</TableCell>
                    <TableCell className="text-right">{currencySymbol}{gstr3b.sgst.toFixed(2)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">6.1 — Tax Payable</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Amount Payable</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>Integrated Tax (IGST)</TableCell>
                    <TableCell className="text-right">{currencySymbol}{gstr3b.igst.toFixed(2)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Central Tax (CGST)</TableCell>
                    <TableCell className="text-right">{currencySymbol}{gstr3b.cgst.toFixed(2)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>State/UT Tax (SGST/UTGST)</TableCell>
                    <TableCell className="text-right">{currencySymbol}{gstr3b.sgst.toFixed(2)}</TableCell>
                  </TableRow>
                  <TableRow className="font-bold bg-muted/30">
                    <TableCell>Total Tax Payable</TableCell>
                    <TableCell className="text-right text-destructive">{currencySymbol}{(gstr3b.igst + gstr3b.cgst + gstr3b.sgst).toFixed(2)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <p className="text-xs text-muted-foreground px-1">
            * This is a simplified GSTR-3B estimate. Please verify with your CA before filing.
            IGST is shown as ₹0 (intra-state only). For inter-state sales, update the tax type on each invoice.
          </p>
        </TabsContent>
      </Tabs>
    </div>
  );
}
