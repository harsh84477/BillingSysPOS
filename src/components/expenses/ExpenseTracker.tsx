// ============================================================
// PROFESSIONAL EXPENSE TRACKING COMPONENT
// ============================================================
// Location: src/components/expenses/ExpenseTracker.tsx

import React, { useState, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useExpenseTracking } from '@/hooks/useBillingSystem';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import {
  Trash2,
  TrendingUp,
  Calculator,
  Receipt,
  Lightbulb,
  Building2,
  UserCircle,
  PlusCircle,
  Undo2,
  Delete,
  Wallet,
  ArrowRightCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const EXPENSE_CATEGORIES = [
  { id: 'Rent', icon: Building2, color: '#ff6b6b' },
  { id: 'Electricity bill', icon: Lightbulb, color: '#ffd93d' },
  { id: 'Salary', icon: UserCircle, color: '#6bc1ff' },
  { id: 'Other exp', icon: PlusCircle, color: '#a29bfe' },
];

const CATEGORY_COLORS: Record<string, string> = {
  'Rent': '#ff6b6b',
  'Electricity bill': '#ffd93d',
  'Salary': '#6bc1ff',
  'Other exp': '#a29bfe',
};

interface ExpenseTrackerProps {
  businessId: string;
}

export function ExpenseTracker({ businessId }: ExpenseTrackerProps) {
  const {
    profitSummary,
    createExpense,
    isCreating,
    deleteExpense,
    isDeleting,
    expenses,
    isExpensesLoading
  } = useExpenseTracking(businessId);
  const [category, setCategory] = useState('Other exp');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);

  const handleCreateExpense = () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    createExpense({
      category,
      amount: parseFloat(amount),
      description: description || `Payment for ${category}`,
      expense_date: expenseDate,
    });

    setAmount('');
    setDescription('');
    setExpenseDate(new Date().toISOString().split('T')[0]);
  };

  const handleCalcPress = (val: string) => {
    if (val === 'C') {
      setAmount('');
      return;
    }
    if (val === 'back') {
      setAmount(prev => prev.slice(0, -1));
      return;
    }
    if (val === '.' && amount.includes('.')) return;
    setAmount(prev => prev + val);
  };

  const exportExpensesCSV = () => {
    if (!expenses || expenses.length === 0) {
      toast.error('No expenses to export');
      return;
    }

    const csvContent = [
      ['Date', 'Category', 'Description', 'Amount'].join(','),
      ...expenses.map((exp: any) => [
        exp.expense_date,
        exp.category,
        `"${exp.description}"`,
        exp.amount
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', `expenses_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  if (!profitSummary) {
    return <div className="flex items-center justify-center py-12">Loading...</div>;
  }

  const summary = profitSummary as any;

  const chartData = [
    { name: 'Income', value: summary.sales },
    { name: 'Expenses', value: (summary.purchase_cost + summary.expenses) },
  ];

  const totalEarnings = summary.sales;
  const totalDeductions = summary.purchase_cost + summary.expenses;
  const netProfit = summary.net_profit;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* ── HEADER: Bill Style Summary ── */}
      <Card className="overflow-hidden border-2 border-primary/20 shadow-xl bg-card">
        <div className="bg-primary/5 p-4 border-b border-primary/10">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="space-y-1">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Wallet className="h-5 w-5 text-primary" />
                Financial Statement
              </h2>
            </div>
            <Badge variant="outline" className="text-base py-0.5 px-3 border-primary/30 text-primary animate-pulse whitespace-nowrap">
              Net: ₹{netProfit.toFixed(2)}
            </Badge>
          </div>
        </div>
        <CardContent className="p-0">
          <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x border-b border-border">
            <div className="p-4 space-y-1">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Gross Income</p>
              <p className="text-2xl font-black text-emerald-600">₹{totalEarnings.toFixed(2)}</p>
            </div>
            <div className="p-4 space-y-1">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Total Expenses</p>
              <p className="text-2xl font-black text-rose-500">₹{totalDeductions.toFixed(2)}</p>
            </div>
            <div className="p-4 space-y-1 bg-primary/5">
              <p className="text-[10px] font-medium text-primary uppercase tracking-wider">Net Profit</p>
              <p className={cn("text-2xl font-black", netProfit >= 0 ? "text-primary" : "text-rose-600")}>
                ₹{netProfit.toFixed(2)}
              </p>
            </div>
          </div>

          {/* Collection Breakdown */}
          <div className="flex flex-wrap items-center bg-muted/20 px-4 py-2 gap-4 text-[10px] font-bold uppercase tracking-wider border-b border-border">
            <div className="flex items-center gap-1.5 text-emerald-600">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Cash: ₹{(summary.cash_collection || 0).toFixed(2)}
            </div>
            <div className="flex items-center gap-1.5 text-blue-600">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              Online: ₹{(summary.online_collection || 0).toFixed(2)}
            </div>
            <div className="flex items-center gap-1.5 text-amber-600">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              Credit (Due): ₹{(summary.credit_collection || 0).toFixed(2)}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ── LEFT: Calculator Entry ── */}
        <Card className="lg:col-span-5 border-2 shadow-lg h-fit sticky top-20">
          <CardHeader className="bg-muted/30 pb-4">
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-primary" />
              Quick Expense Entry
            </CardTitle>
            <CardDescription>Enter amount and select category</CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            {/* Amount Display */}
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <span className="text-3xl font-bold text-muted-foreground/50">₹</span>
              </div>
              <Input
                readOnly
                className="pl-12 h-20 text-4xl font-black text-right bg-muted/20 border-2 border-muted hover:border-primary/30 focus-visible:ring-primary rounded-xl transition-all"
                value={amount || '0'}
              />
            </div>

            {/* Category Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {EXPENSE_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setCategory(cat.id)}
                  className={cn(
                    "flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all gap-1.5",
                    category === cat.id
                      ? "border-primary bg-primary/5 text-primary scale-105 shadow-md"
                      : "border-muted hover:border-primary/20 hover:bg-muted/50 text-muted-foreground"
                  )}
                >
                  <cat.icon className={cn("h-6 w-6", category === cat.id ? "text-primary" : "text-muted-foreground")} />
                  <span className="text-[10px] font-bold uppercase truncate w-full text-center">{cat.id}</span>
                </button>
              ))}
            </div>

            {/* Calculator Buttons */}
            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, '.', 0].map((num) => (
                <Button
                  key={num}
                  variant="outline"
                  className="h-14 text-xl font-bold hover:bg-primary hover:text-white border-2 rounded-xl"
                  onClick={() => handleCalcPress(num.toString())}
                >
                  {num}
                </Button>
              ))}
              <Button
                variant="outline"
                className="h-14 text-xl font-bold hover:bg-destructive hover:text-white border-2 rounded-xl"
                onClick={() => handleCalcPress('back')}
              >
                <Delete className="h-6 w-6" />
              </Button>
            </div>

            <div className="space-y-2 pt-2">
              <Label className="text-xs font-bold text-muted-foreground uppercase px-1">Description (Optional)</Label>
              <Input
                placeholder="e.g. Monthly Rent Payment"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="h-10 border-2 rounded-lg"
              />
            </div>

            <Button
              size="lg"
              className="w-full h-16 text-lg font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all group"
              onClick={handleCreateExpense}
              disabled={isCreating}
            >
              {isCreating ? 'Processing...' : (
                <span className="flex items-center gap-2">
                  Record Expense
                  <ArrowRightCircle className="h-6 w-6 group-hover:translate-x-1 transition-transform" />
                </span>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* ── RIGHT: Insight & Stats ── */}
        <div className="lg:col-span-12 xl:col-span-7 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Income vs Outcome</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={chartData}>
                    <XAxis dataKey="name" fontSize={12} />
                    <YAxis fontSize={12} tickFormatter={(val) => `₹${val / 1000}k`} />
                    <Tooltip formatter={(val: any) => `₹${val.toFixed(2)}`} />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index === 0 ? '#10b981' : '#f43f5e'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border-2 text-center flex flex-col items-center justify-center p-6 bg-muted/10">
              <div className="h-24 w-24 rounded-full border-8 border-primary/20 flex items-center justify-center">
                <Receipt className="h-10 w-10 text-primary" />
              </div>
              <h4 className="mt-4 font-black text-xl">Tax Ready Logs</h4>
              <p className="text-sm text-muted-foreground mt-2 max-w-[200px]">
                All expenses recorded here are encrypted and ready for tax reporting.
              </p>
              <Button
                variant="link"
                className="mt-4 text-primary font-bold"
                onClick={exportExpensesCSV}
              >
                Download Full Report
              </Button>
            </Card>
          </div>

          {/* Recent History */}
          <Card className="border-2">
            <CardHeader className="bg-muted/30 border-b">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg">Recent Expense Logs</CardTitle>
                <div className="space-x-2">
                  <Input type="date" value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} className="h-8 w-fit inline-block" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-[120px]">Date</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-center">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isExpensesLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-12 text-center text-muted-foreground h-32 italic">
                        Fetching real-time logs from Supabase...
                      </TableCell>
                    </TableRow>
                  ) : expenses?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-12 text-center text-muted-foreground h-32 italic">
                        No expenses recorded yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    expenses?.map((exp: any) => (
                      <TableRow key={exp.id}>
                        <TableCell className="font-medium text-xs">
                          {new Date(exp.expense_date).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            style={{
                              backgroundColor: `${CATEGORY_COLORS[exp.category]}33`,
                              color: CATEGORY_COLORS[exp.category],
                              borderColor: CATEGORY_COLORS[exp.category]
                            }}
                            className="text-[10px] font-bold"
                          >
                            {exp.category}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs truncate max-w-[200px]">{exp.description}</TableCell>
                        <TableCell className="text-right font-bold">₹{exp.amount.toFixed(2)}</TableCell>
                        <TableCell className="text-center">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                            onClick={() => deleteExpense(exp.id)}
                            disabled={isDeleting}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
