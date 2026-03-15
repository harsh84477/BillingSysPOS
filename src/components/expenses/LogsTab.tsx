import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Trash2, Download, ReceiptText, FileSpreadsheet, FileText, X, Search, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import { getCategoryName, getCategoryColor, getSubcategoryName } from '@/hooks/useExpenseManagement';

type SortField = 'expense_date' | 'amount' | null;
type SortDir = 'asc' | 'desc';

const PAGE_SIZE = 10;

export function LogsTab({ expenses = [], categories = [], subcategories = [], deleteExpense }: any) {
    const [filterPeriod, setFilterPeriod] = useState('all');
    const [filterCategory, setFilterCategory] = useState('all');
    const [filterPayment, setFilterPayment] = useState('all');
    const [dateRange, setDateRange] = useState({ start: '', end: '' });
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [sortField, setSortField] = useState<SortField>(null);
    const [sortDir, setSortDir] = useState<SortDir>('desc');

    const safeExpenses = expenses || [];
    const safeCategories = categories || [];
    const safeSubcategories = subcategories || [];

    const filteredExpenses = useMemo(() => {
        let result = [...safeExpenses];

        // Search
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            result = result.filter((e: any) => {
                const desc = String(e?.description || '').toLowerCase();
                const cat = getCategoryName(e, safeCategories).toLowerCase();
                const sub = getSubcategoryName(e, safeSubcategories).toLowerCase();
                return desc.includes(q) || cat.includes(q) || sub.includes(q);
            });
        }

        // Category
        if (filterCategory !== 'all') {
            result = result.filter((e: any) => {
                const catName = getCategoryName(e, safeCategories);
                return e?.category_id === filterCategory || catName === filterCategory;
            });
        }

        // Payment Method
        if (filterPayment !== 'all') {
            result = result.filter((e: any) => e?.payment_method === filterPayment);
        }

        // Period
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

        // Sorting
        if (sortField) {
            result.sort((a: any, b: any) => {
                let valA: any, valB: any;
                if (sortField === 'amount') {
                    valA = Number(a?.amount || 0);
                    valB = Number(b?.amount || 0);
                } else {
                    valA = a?.expense_date || '';
                    valB = b?.expense_date || '';
                }
                if (valA < valB) return sortDir === 'asc' ? -1 : 1;
                if (valA > valB) return sortDir === 'asc' ? 1 : -1;
                return 0;
            });
        }

        return result;
    }, [safeExpenses, safeCategories, safeSubcategories, filterPeriod, filterCategory, filterPayment, dateRange, searchQuery, sortField, sortDir]);

    // Pagination
    const totalPages = Math.max(1, Math.ceil(filteredExpenses.length / PAGE_SIZE));
    const paginatedExpenses = useMemo(() => {
        const start = (currentPage - 1) * PAGE_SIZE;
        return filteredExpenses.slice(start, start + PAGE_SIZE);
    }, [filteredExpenses, currentPage]);

    // Reset page when filters change
    useMemo(() => { setCurrentPage(1); }, [filterPeriod, filterCategory, filterPayment, dateRange, searchQuery, sortField, sortDir]);

    const totalFiltered = filteredExpenses.reduce((sum: number, e: any) => sum + Number(e?.amount || 0), 0);

    const toggleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDir('desc');
        }
    };

    const SortIcon = ({ field }: { field: SortField }) => {
        if (sortField !== field) return <ArrowUpDown className="h-3 w-3 opacity-40" />;
        return sortDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />;
    };

    const exportData = (format: 'csv' | 'excel' | 'pdf') => {
        if (filteredExpenses.length === 0) {
            toast.error('No expenses found to export.');
            return;
        }

        const data = filteredExpenses.map((exp: any) => ({
            Date: exp?.expense_date ? new Date(exp.expense_date).toLocaleDateString() : 'N/A',
            Category: getCategoryName(exp, safeCategories),
            Subcategory: getSubcategoryName(exp, safeSubcategories) || '-',
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
        <thead><tr><th>Date</th><th>Category</th><th>Subcategory</th><th>Description</th><th>Payment</th><th class="text-right">Amount (₹)</th></tr></thead>
        <tbody>
      `;
            let total = 0;
            data.forEach((row: any) => {
                total += row.Amount;
                html += `<tr><td>${row.Date}</td><td>${row.Category}</td><td>${row.Subcategory}</td><td>${row.Description}</td><td style="text-transform: capitalize;">${row.Payment_Method}</td><td class="text-right">₹${row.Amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td></tr>`;
            });
            html += `<tr class="total-row"><td colspan="5" class="text-right">Total:</td><td class="text-right">₹${total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td></tr>`;
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

    const hasActiveFilters = filterCategory !== 'all' || filterPayment !== 'all' || filterPeriod !== 'all' || searchQuery.trim().length > 0;

    const resetFilters = () => {
        setFilterCategory('all');
        setFilterPayment('all');
        setFilterPeriod('all');
        setDateRange({ start: '', end: '' });
        setSearchQuery('');
        setSortField(null);
        setCurrentPage(1);
    };

    return (
        <div className="space-y-4 animate-in fade-in duration-500">
            <Card className="shadow-sm border overflow-hidden">
                <CardHeader className="bg-muted/30 border-b flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 pt-4">
                    <div>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <ReceiptText className="text-primary h-4 w-4" /> Expense Reports
                        </CardTitle>
                        <CardDescription className="mt-0.5 text-xs">
                            {filteredExpenses.length} record{filteredExpenses.length !== 1 ? 's' : ''} •
                            Total: <span className="font-bold text-rose-600">₹{totalFiltered.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                        </CardDescription>
                    </div>

                    <div className="flex gap-1.5 flex-wrap">
                        <Button variant="outline" size="sm" onClick={() => exportData('csv')} className="gap-1 text-[10px] h-7 px-2">
                            <FileText className="h-3 w-3" /> CSV
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => exportData('excel')} className="gap-1 text-[10px] h-7 px-2 bg-emerald-600 text-white hover:bg-emerald-700 border-emerald-600">
                            <FileSpreadsheet className="h-3 w-3" /> Excel
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => exportData('pdf')} className="gap-1 text-[10px] h-7 px-2 bg-rose-600 text-white hover:bg-rose-700 border-rose-600">
                            <Download className="h-3 w-3" /> PDF
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {/* Filters Row */}
                    <div className="p-3 border-b flex flex-col md:flex-row gap-2 bg-muted/5 items-end">
                        {/* Search */}
                        <div className="flex-1 space-y-1">
                            <Label className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider">Search</Label>
                            <div className="relative">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                                <Input
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    placeholder="Search expenses..."
                                    className="h-8 pl-8 text-xs bg-background"
                                />
                            </div>
                        </div>

                        <div className="flex-1 space-y-1">
                            <Label className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider">Category</Label>
                            <Select value={filterCategory} onValueChange={setFilterCategory}>
                                <SelectTrigger className="h-8 bg-background text-xs"><SelectValue placeholder="All" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Categories</SelectItem>
                                    {safeCategories.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex-1 space-y-1">
                            <Label className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider">Payment</Label>
                            <Select value={filterPayment} onValueChange={setFilterPayment}>
                                <SelectTrigger className="h-8 bg-background text-xs"><SelectValue placeholder="All" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Methods</SelectItem>
                                    <SelectItem value="cash">Cash</SelectItem>
                                    <SelectItem value="upi">UPI</SelectItem>
                                    <SelectItem value="bank">Bank</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex-1 space-y-1">
                            <Label className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider">Period</Label>
                            <Select value={filterPeriod} onValueChange={setFilterPeriod}>
                                <SelectTrigger className="h-8 bg-background text-xs"><SelectValue placeholder="All Time" /></SelectTrigger>
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
                            <div className="flex gap-1.5">
                                <div className="space-y-1">
                                    <Label className="text-[9px] uppercase tracking-wider">Start</Label>
                                    <Input type="date" value={dateRange.start} onChange={e => setDateRange({ ...dateRange, start: e.target.value })} className="h-8 text-xs w-28" />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-[9px] uppercase tracking-wider">End</Label>
                                    <Input type="date" value={dateRange.end} onChange={e => setDateRange({ ...dateRange, end: e.target.value })} className="h-8 text-xs w-28" />
                                </div>
                            </div>
                        )}

                        {hasActiveFilters && (
                            <Button variant="ghost" size="sm" className="h-8 text-[10px] gap-1 text-muted-foreground hover:text-foreground shrink-0" onClick={resetFilters}>
                                <X className="h-3 w-3" /> Clear
                            </Button>
                        )}
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-muted/30">
                                <TableRow>
                                    <TableHead className="text-[10px] cursor-pointer select-none" onClick={() => toggleSort('expense_date')}>
                                        <span className="flex items-center gap-1">Date <SortIcon field="expense_date" /></span>
                                    </TableHead>
                                    <TableHead className="text-[10px]">Category</TableHead>
                                    <TableHead className="text-[10px]">Subcategory</TableHead>
                                    <TableHead className="text-[10px]">Description</TableHead>
                                    <TableHead className="text-[10px]">Method</TableHead>
                                    <TableHead className="text-[10px] text-right cursor-pointer select-none" onClick={() => toggleSort('amount')}>
                                        <span className="flex items-center justify-end gap-1">Amount <SortIcon field="amount" /></span>
                                    </TableHead>
                                    <TableHead className="text-[10px] text-center">Receipt</TableHead>
                                    <TableHead className="text-[10px] text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {paginatedExpenses.map((exp: any, idx: number) => {
                                    const catName = getCategoryName(exp, safeCategories);
                                    const catColor = getCategoryColor(exp, safeCategories);
                                    const subName = getSubcategoryName(exp, safeSubcategories);

                                    return (
                                        <TableRow key={exp?.id || `exp-${idx}`} className="hover:bg-muted/20 transition-colors">
                                            <TableCell className="font-medium whitespace-nowrap text-[11px]">
                                                {exp?.expense_date ? new Date(exp.expense_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="text-[9px] font-semibold" style={{ backgroundColor: `${catColor}15`, color: catColor, borderColor: catColor }}>
                                                    {catName}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-[11px] text-muted-foreground">
                                                {subName || '-'}
                                            </TableCell>
                                            <TableCell className="max-w-[160px] truncate text-[11px]" title={String(exp?.description || '')}>
                                                {String(exp?.description || '-')}
                                            </TableCell>
                                            <TableCell className="uppercase text-[9px] font-bold tracking-wider text-muted-foreground">
                                                {String(exp?.payment_method || 'cash')}
                                            </TableCell>
                                            <TableCell className="text-right font-black text-rose-600 text-xs">
                                                ₹{Number(exp?.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {exp?.receipt_url ? (
                                                    <a
                                                        href={`${(import.meta as any).env?.VITE_SUPABASE_URL || ''}/storage/v1/object/public/documents/${exp.receipt_url}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-blue-500 text-[9px] hover:underline flex items-center justify-center gap-0.5"
                                                    >
                                                        <ReceiptText className="h-3 w-3" /> View
                                                    </a>
                                                ) : <span className="text-muted-foreground text-[10px]">-</span>}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => deleteExpense?.(exp?.id)}>
                                                    <Trash2 className="h-3 w-3 text-rose-500" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                                {paginatedExpenses.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={8} className="h-24 text-center text-muted-foreground italic text-sm">
                                            No matching expenses found.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between px-4 py-2.5 border-t bg-muted/5">
                            <span className="text-[10px] text-muted-foreground">
                                Page {currentPage} of {totalPages} ({filteredExpenses.length} records)
                            </span>
                            <div className="flex items-center gap-1">
                                <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-7 w-7"
                                    disabled={currentPage <= 1}
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                >
                                    <ChevronLeft className="h-3.5 w-3.5" />
                                </Button>
                                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                                    let page: number;
                                    if (totalPages <= 5) {
                                        page = i + 1;
                                    } else if (currentPage <= 3) {
                                        page = i + 1;
                                    } else if (currentPage >= totalPages - 2) {
                                        page = totalPages - 4 + i;
                                    } else {
                                        page = currentPage - 2 + i;
                                    }
                                    return (
                                        <Button
                                            key={page}
                                            variant={page === currentPage ? "default" : "outline"}
                                            size="icon"
                                            className="h-7 w-7 text-[10px]"
                                            onClick={() => setCurrentPage(page)}
                                        >
                                            {page}
                                        </Button>
                                    );
                                })}
                                <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-7 w-7"
                                    disabled={currentPage >= totalPages}
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                >
                                    <ChevronRight className="h-3.5 w-3.5" />
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
