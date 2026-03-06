import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Trash2, Download, Filter, ReceiptText, FileSpreadsheet, FileText, X } from 'lucide-react';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import { getCategoryName, getCategoryColor } from '@/hooks/useExpenseManagement';

export function LogsTab({ expenses = [], categories = [], deleteExpense }: any) {
    const [filterPeriod, setFilterPeriod] = useState('all');
    const [filterCategory, setFilterCategory] = useState('all');
    const [filterPayment, setFilterPayment] = useState('all');
    const [dateRange, setDateRange] = useState({ start: '', end: '' });

    const safeExpenses = expenses || [];
    const safeCategories = categories || [];

    const filteredExpenses = useMemo(() => {
        let result = [...safeExpenses];

        // Filter by Category
        if (filterCategory !== 'all') {
            result = result.filter((e: any) => {
                const catName = getCategoryName(e, safeCategories);
                return e?.category_id === filterCategory || catName === filterCategory;
            });
        }
        // Filter by Payment Method
        if (filterPayment !== 'all') {
            result = result.filter((e: any) => e?.payment_method === filterPayment);
        }

        // Filter by Period
        const now = new Date();
        const today = now.toISOString().split('T')[0];
        if (filterPeriod === 'today') {
            result = result.filter((e: any) => e?.expense_date === today);
        } else if (filterPeriod === 'week') {
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            result = result.filter((e: any) => e?.expense_date >= weekAgo && e?.expense_date <= today);
        } else if (filterPeriod === 'month') {
            const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
            result = result.filter((e: any) => e?.expense_date >= monthStart && e?.expense_date <= today);
        } else if (filterPeriod === 'custom' && dateRange.start && dateRange.end) {
            result = result.filter((e: any) => e?.expense_date >= dateRange.start && e?.expense_date <= dateRange.end);
        }

        return result;
    }, [safeExpenses, safeCategories, filterPeriod, filterCategory, filterPayment, dateRange]);

    // Summary stats
    const totalFiltered = filteredExpenses.reduce((sum: number, e: any) => sum + Number(e?.amount || 0), 0);

    const exportData = (format: 'csv' | 'excel' | 'pdf') => {
        if (filteredExpenses.length === 0) {
            toast.error('No expenses found to export.');
            return;
        }

        const data = filteredExpenses.map((exp: any) => ({
            Date: exp?.expense_date ? new Date(exp.expense_date).toLocaleDateString() : 'N/A',
            Category: getCategoryName(exp, safeCategories),
            Description: String(exp?.description || 'N/A'),
            Payment_Method: String(exp?.payment_method || 'cash'),
            Amount: Number(exp?.amount || 0)
        }));

        if (format === 'csv') {
            const header = Object.keys(data[0]).join(',');
            const rows = data.map((obj: any) => Object.values(obj).map((val: any) => `"${val}"`).join(','));
            const csv = [header, ...rows].join('\n');
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Expenses_${new Date().toISOString().split('T')[0]}.csv`;
            a.click();
            URL.revokeObjectURL(url);
            toast.success('CSV Exported');
        } else if (format === 'excel') {
            const worksheet = XLSX.utils.json_to_sheet(data);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Expenses');
            XLSX.writeFile(workbook, `Expenses_${new Date().toISOString().split('T')[0]}.xlsx`);
            toast.success('Excel Exported');
        } else if (format === 'pdf') {
            const printWindow = window.open('', '', 'width=800,height=600');
            if (!printWindow) return;

            let html = `<html><head><title>Expense Report</title><style>
        body { font-family: 'Segoe UI', sans-serif; padding: 30px; color: #1e293b; }
        h2 { color: #6366f1; margin-bottom: 4px; }
        .date { color: #64748b; font-size: 13px; margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; margin-top: 16px; }
        th { background: #f1f5f9; color: #475569; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; padding: 10px 12px; text-align: left; border-bottom: 2px solid #e2e8f0; }
        td { padding: 10px 12px; border-bottom: 1px solid #f1f5f9; font-size: 13px; }
        tr:hover { background: #fafafa; }
        .text-right { text-align: right; }
        .total-row { font-weight: 700; background: #f8fafc; border-top: 2px solid #e2e8f0; }
      </style></head><body>
      <h2>Expense Report</h2>
      <p class="date">Generated on: ${new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      <table>
        <thead><tr><th>Date</th><th>Category</th><th>Description</th><th>Payment Method</th><th class="text-right">Amount (₹)</th></tr></thead>
        <tbody>
      `;
            let total = 0;
            data.forEach((row: any) => {
                total += row.Amount;
                html += `<tr><td>${row.Date}</td><td>${row.Category}</td><td>${row.Description}</td><td style="text-transform: capitalize;">${row.Payment_Method}</td><td class="text-right">₹${row.Amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td></tr>`;
            });
            html += `<tr class="total-row"><td colspan="4" class="text-right">Total:</td><td class="text-right">₹${total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td></tr>`;
            html += `</tbody></table></body></html>`;

            printWindow.document.write(html);
            printWindow.document.close();
            printWindow.focus();
            setTimeout(() => {
                printWindow.print();
                printWindow.close();
            }, 300);
            toast.success('PDF Print Dialog Opened');
        }
    };

    const hasActiveFilters = filterCategory !== 'all' || filterPayment !== 'all' || filterPeriod !== 'all';

    const resetFilters = () => {
        setFilterCategory('all');
        setFilterPayment('all');
        setFilterPeriod('all');
        setDateRange({ start: '', end: '' });
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <Card className="shadow-sm border overflow-hidden">
                <CardHeader className="bg-muted/30 border-b flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4">
                    <div>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <ReceiptText className="text-primary h-5 w-5" /> Expense Reports
                        </CardTitle>
                        <CardDescription className="mt-1">
                            {filteredExpenses.length} record{filteredExpenses.length !== 1 ? 's' : ''} •
                            Total: <span className="font-bold text-rose-600">₹{totalFiltered.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                        </CardDescription>
                    </div>

                    <div className="flex gap-2 flex-wrap">
                        <Button variant="outline" size="sm" onClick={() => exportData('csv')} className="gap-1.5 text-xs">
                            <FileText className="h-3.5 w-3.5" /> CSV
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => exportData('excel')} className="gap-1.5 text-xs bg-emerald-600 text-white hover:bg-emerald-700 border-emerald-600">
                            <FileSpreadsheet className="h-3.5 w-3.5" /> Excel
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => exportData('pdf')} className="gap-1.5 text-xs bg-rose-600 text-white hover:bg-rose-700 border-rose-600">
                            <Download className="h-3.5 w-3.5" /> PDF
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {/* Filters */}
                    <div className="p-4 border-b flex flex-col md:flex-row gap-3 bg-muted/5 items-end">
                        <div className="flex-1 space-y-1.5">
                            <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Category</Label>
                            <Select value={filterCategory} onValueChange={setFilterCategory}>
                                <SelectTrigger className="h-9 bg-background text-xs"><SelectValue placeholder="All Categories" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Categories</SelectItem>
                                    {safeCategories.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex-1 space-y-1.5">
                            <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Payment Method</Label>
                            <Select value={filterPayment} onValueChange={setFilterPayment}>
                                <SelectTrigger className="h-9 bg-background text-xs"><SelectValue placeholder="All Methods" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Methods</SelectItem>
                                    <SelectItem value="cash">Cash</SelectItem>
                                    <SelectItem value="upi">UPI / Online</SelectItem>
                                    <SelectItem value="card">Card</SelectItem>
                                    <SelectItem value="bank">Bank Transfer</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex-1 space-y-1.5">
                            <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Time Period</Label>
                            <Select value={filterPeriod} onValueChange={setFilterPeriod}>
                                <SelectTrigger className="h-9 bg-background text-xs"><SelectValue placeholder="All Time" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Time</SelectItem>
                                    <SelectItem value="today">Today</SelectItem>
                                    <SelectItem value="week">This Week</SelectItem>
                                    <SelectItem value="month">This Month</SelectItem>
                                    <SelectItem value="custom">Custom Range</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {filterPeriod === 'custom' && (
                            <div className="flex gap-2">
                                <div className="space-y-1">
                                    <Label className="text-[10px] uppercase tracking-wider">Start</Label>
                                    <Input type="date" value={dateRange.start} onChange={e => setDateRange({ ...dateRange, start: e.target.value })} className="h-9 text-xs w-32" />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-[10px] uppercase tracking-wider">End</Label>
                                    <Input type="date" value={dateRange.end} onChange={e => setDateRange({ ...dateRange, end: e.target.value })} className="h-9 text-xs w-32" />
                                </div>
                            </div>
                        )}

                        {hasActiveFilters && (
                            <Button variant="ghost" size="sm" className="h-9 text-xs gap-1 text-muted-foreground hover:text-foreground" onClick={resetFilters}>
                                <X className="h-3.5 w-3.5" /> Clear
                            </Button>
                        )}
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-muted/30">
                                <TableRow>
                                    <TableHead className="text-xs">Date</TableHead>
                                    <TableHead className="text-xs">Category</TableHead>
                                    <TableHead className="text-xs">Description</TableHead>
                                    <TableHead className="text-xs">Method</TableHead>
                                    <TableHead className="text-xs text-right">Amount</TableHead>
                                    <TableHead className="text-xs text-center">Receipt</TableHead>
                                    <TableHead className="text-xs text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredExpenses.map((exp: any, idx: number) => {
                                    const catName = getCategoryName(exp, safeCategories);
                                    const catColor = getCategoryColor(exp, safeCategories);

                                    return (
                                        <TableRow key={exp?.id || `exp-${idx}`} className="hover:bg-muted/20 transition-colors">
                                            <TableCell className="font-medium whitespace-nowrap text-xs">
                                                {exp?.expense_date ? new Date(exp.expense_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="text-[10px] font-semibold" style={{ backgroundColor: `${catColor}15`, color: catColor, borderColor: catColor }}>
                                                    {catName}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="max-w-[200px] truncate text-xs" title={String(exp?.description || '')}>
                                                {String(exp?.description || '-')}
                                            </TableCell>
                                            <TableCell className="uppercase text-[10px] font-bold tracking-wider text-muted-foreground">
                                                {String(exp?.payment_method || 'cash')}
                                            </TableCell>
                                            <TableCell className="text-right font-black text-rose-600 text-sm">
                                                ₹{Number(exp?.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {exp?.receipt_url ? (
                                                    <a
                                                        href={`${(import.meta as any).env?.VITE_SUPABASE_URL || ''}/storage/v1/object/public/documents/${exp.receipt_url}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-blue-500 text-[10px] hover:underline flex items-center justify-center gap-1"
                                                    >
                                                        <ReceiptText className="h-3 w-3" /> View
                                                    </a>
                                                ) : <span className="text-muted-foreground text-xs">-</span>}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteExpense?.(exp?.id)}>
                                                    <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                                {filteredExpenses.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-32 text-center text-muted-foreground italic">
                                            No matching expenses found for the selected filters.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
