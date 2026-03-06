import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Trash2, Download, Filter, ReceiptText } from 'lucide-react';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';

export function LogsTab({ expenses = [], categories = [], deleteExpense }: any) {
    const [filterPeriod, setFilterPeriod] = useState('all');
    const [filterCategory, setFilterCategory] = useState('all');
    const [filterPayment, setFilterPayment] = useState('all');
    const [dateRange, setDateRange] = useState({ start: '', end: '' });

    const filteredExpenses = useMemo(() => {
        let result = [...(expenses || [])];

        // Filter by Category
        if (filterCategory !== 'all') {
            result = result.filter(e => e.category_id === filterCategory || e.category === filterCategory);
        }
        // Filter by Payment Method
        if (filterPayment !== 'all') {
            result = result.filter(e => e.payment_method === filterPayment);
        }

        // Filter by Period
        const now = new Date();
        const today = now.toISOString().split('T')[0];
        if (filterPeriod === 'today') {
            result = result.filter(e => e?.expense_date === today);
        } else if (filterPeriod === 'week') {
            const weekAgo = new Date(now.setDate(now.getDate() - 7)).toISOString().split('T')[0];
            result = result.filter(e => e?.expense_date >= weekAgo && e?.expense_date <= today);
        } else if (filterPeriod === 'month') {
            const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
            result = result.filter(e => e?.expense_date >= monthStart && e?.expense_date <= today);
        } else if (filterPeriod === 'custom' && dateRange.start && dateRange.end) {
            result = result.filter(e => e?.expense_date >= dateRange.start && e?.expense_date <= dateRange.end);
        }

        return result;
    }, [expenses, filterPeriod, filterCategory, filterPayment, dateRange]);

    const exportData = (format: 'csv' | 'excel' | 'pdf') => {
        if (filteredExpenses.length === 0) {
            toast.error('No expenses found to export.');
            return;
        }

        const data = filteredExpenses.map(exp => ({
            Date: exp.expense_date ? new Date(exp.expense_date).toLocaleDateString() : 'N/A',
            Category: exp.category?.name || exp.category || 'Uncategorized',
            Description: exp.description || 'N/A',
            Payment_Method: exp.payment_method || 'cash',
            Amount: Number(exp.amount || 0)
        }));

        if (format === 'csv') {
            const header = Object.keys(data[0]).join(',');
            const rows = data.map(obj => Object.values(obj).map(val => `"${val}"`).join(','));
            const csv = [header, ...rows].join('\n');
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Expenses_${new Date().toISOString().split('T')[0]}.csv`;
            a.click();
            toast.success('CSV Exported');
        } else if (format === 'excel') {
            const worksheet = XLSX.utils.json_to_sheet(data);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Expenses');
            XLSX.writeFile(workbook, `Expenses_${new Date().toISOString().split('T')[0]}.xlsx`);
            toast.success('Excel Exported');
        } else if (format === 'pdf') {
            // Create a hidden print window for PDF native support
            const printWindow = window.open('', '', 'width=800,height=600');
            if (!printWindow) return;

            let html = `<html><head><title>Expense Report</title><style>
        body { font-family: sans-serif; padding: 20px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f4f4f4; }
        .text-right { text-align: right; }
      </style></head><body>
      <h2>Expense Report</h2>
      <p>Generated on: ${new Date().toLocaleDateString()}</p>
      <table>
        <thead><tr><th>Date</th><th>Category</th><th>Description</th><th>Payment Method</th><th class="text-right">Amount (₹)</th></tr></thead>
        <tbody>
      `;
            let total = 0;
            data.forEach(row => {
                total += row.Amount;
                html += `<tr><td>${row.Date}</td><td>${row.Category}</td><td>${row.Description}</td><td style="text-transform: capitalize;">${row.Payment_Method}</td><td class="text-right">${row.Amount.toFixed(2)}</td></tr>`;
            });
            html += `<tr><th colspan="4" class="text-right">Total:</th><th class="text-right">${total.toFixed(2)}</th></tr>`;
            html += `</tbody></table></body></html>`;

            printWindow.document.write(html);
            printWindow.document.close();
            printWindow.focus();
            setTimeout(() => {
                printWindow.print();
                printWindow.close();
            }, 250);
            toast.success('PDF Print Dialog Opened');
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <Card className="border-2 shadow-lg">
                <CardHeader className="bg-muted/30 border-b flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <ReceiptText className="text-primary h-5 w-5" /> Detailed Logs
                        </CardTitle>
                        <CardDescription>Filter, view, and export business expenses.</CardDescription>
                    </div>

                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => exportData('csv')} className="bg-[#107c41] text-white hover:bg-[#185c37] min-w-16">CSV</Button>
                        <Button variant="outline" size="sm" onClick={() => exportData('excel')} className="bg-[#107c41] text-white hover:bg-[#185c37] min-w-16">Excel</Button>
                        <Button variant="outline" size="sm" onClick={() => exportData('pdf')} className="bg-rose-600 text-white hover:bg-rose-700 min-w-16">PDF</Button>
                    </div>
                </CardHeader>
                <CardContent className="p-0">

                    {/* Filters */}
                    <div className="p-4 border-b flex flex-col md:flex-row gap-4 bg-muted/10 items-end">
                        <div className="flex-1 space-y-2">
                            <Label className="text-xs uppercase font-bold text-muted-foreground">Category</Label>
                            <Select value={filterCategory} onValueChange={setFilterCategory}>
                                <SelectTrigger className="h-10 bg-background"><SelectValue placeholder="All Categories" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Categories</SelectItem>
                                    {(categories || []).map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex-1 space-y-2">
                            <Label className="text-xs uppercase font-bold text-muted-foreground">Payment Method</Label>
                            <Select value={filterPayment} onValueChange={setFilterPayment}>
                                <SelectTrigger className="h-10 bg-background"><SelectValue placeholder="All Methods" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Methods</SelectItem>
                                    <SelectItem value="cash">Cash</SelectItem>
                                    <SelectItem value="upi">UPI / Online</SelectItem>
                                    <SelectItem value="card">Card</SelectItem>
                                    <SelectItem value="bank">Bank Transfer</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex-1 space-y-2">
                            <Label className="text-xs uppercase font-bold text-muted-foreground">Time Period</Label>
                            <Select value={filterPeriod} onValueChange={setFilterPeriod}>
                                <SelectTrigger className="h-10 bg-background"><SelectValue placeholder="All Time" /></SelectTrigger>
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
                                <div className="space-y-2">
                                    <Label className="text-[10px] uppercase">Start</Label>
                                    <Input type="date" value={dateRange.start} onChange={e => setDateRange({ ...dateRange, start: e.target.value })} className="h-10 text-xs w-32" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] uppercase">End</Label>
                                    <Input type="date" value={dateRange.end} onChange={e => setDateRange({ ...dateRange, end: e.target.value })} className="h-10 text-xs w-32" />
                                </div>
                            </div>
                        )}

                        <Button variant="secondary" size="icon" className="h-10 w-10 shrink-0" onClick={() => { setFilterCategory('all'); setFilterPayment('all'); setFilterPeriod('all'); }}>
                            <Filter className="h-4 w-4" />
                        </Button>
                    </div>

                    <Table>
                        <TableHeader className="bg-muted/30">
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Category</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead>Method</TableHead>
                                <TableHead className="text-right">Amount</TableHead>
                                <TableHead className="text-center">Receipt</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {(filteredExpenses || []).map((exp: any) => {
                                const catObj = exp?.category?.name ? exp.category : (categories || []).find((c: any) => c.id === exp?.category_id || c.name === exp?.category);
                                const catName = catObj?.name || exp?.category || 'Uncategorized';
                                const catColor = catObj?.color || '#ccc';

                                return (
                                    <TableRow key={exp?.id || Math.random()}>
                                        <TableCell className="font-medium whitespace-nowrap text-xs">
                                            {exp?.expense_date ? new Date(exp.expense_date).toLocaleDateString() : '-'}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" style={{ backgroundColor: `${catColor}15`, color: catColor, borderColor: catColor }}>
                                                {catName}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="max-w-[200px] truncate text-xs" title={exp?.description}>{exp?.description || '-'}</TableCell>
                                        <TableCell className="uppercase text-[10px] font-bold tracking-wider">{exp?.payment_method || 'cash'}</TableCell>
                                        <TableCell className="text-right font-black text-rose-600">₹{Number(exp?.amount || 0).toFixed(2)}</TableCell>
                                        <TableCell className="text-center">
                                            {exp?.receipt_url ? (
                                                <a
                                                    href={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/documents/${exp.receipt_url}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-blue-500 text-xs hover:underline flex items-center justify-center gap-1"
                                                >
                                                    <ReceiptText className="h-3 w-3" /> View
                                                </a>
                                            ) : '-'}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="icon" onClick={() => deleteExpense(exp.id)}>
                                                <Trash2 className="h-4 w-4 text-rose-500" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                )
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
                </CardContent>
            </Card>
        </div>
    );
}
