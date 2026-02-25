// ============================================================
// EXPENSE TRACKING COMPONENT
// ============================================================
// Location: src/components/expenses/ExpenseTracker.tsx

import React, { useState } from 'react';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useExpenseTracking } from '@/hooks/useBillingSystem';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { Trash2, TrendingUp } from 'lucide-react';

const EXPENSE_CATEGORIES = [
  'rent',
  'salary',
  'electricity',
  'transport',
  'maintenance',
  'internet',
  'miscellaneous',
];

const CATEGORY_COLORS = {
  rent: '#ff6b6b',
  salary: '#4ecdc4',
  electricity: '#ffe66d',
  transport: '#95e1d3',
  maintenance: '#c7b3e5',
  internet: '#ffa502',
  miscellaneous: '#b8a1d6',
};

interface ExpenseTrackerProps {
  businessId: string;
}

export function ExpenseTracker({ businessId }: ExpenseTrackerProps) {
  const { profitSummary, createExpense, isCreating, deleteExpense, isDeleting } =
    useExpenseTracking(businessId);
  const [category, setCategory] = useState('miscellaneous');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);

  const handleCreateExpense = () => {
    if (!amount || !category) return;

    createExpense({
      category,
      amount: parseFloat(amount),
      description,
      expense_date: expenseDate,
    });

    setAmount('');
    setDescription('');
    setExpenseDate(new Date().toISOString().split('T')[0]);
  };

  if (!profitSummary) {
    return <div>Loading...</div>;
  }

  // Prepare data for charts
  const chartData = [
    { name: 'Sales', value: profitSummary.sales },
    { name: 'Cost', value: profitSummary.purchase_cost },
    { name: 'Expenses', value: profitSummary.expenses },
  ];

  const expenseBreakdown = EXPENSE_CATEGORIES.map((cat) => ({
    name: cat,
    value: Math.floor(Math.random() * 5000), // Replace with real data from query
  }));

  return (
    <div className="space-y-6">
      {/* Profit Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">₹{profitSummary.sales.toFixed(2)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Purchase Cost</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">
              ₹{profitSummary.purchase_cost.toFixed(2)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-orange-600">
              ₹{profitSummary.expenses.toFixed(2)}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Net Profit
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-700">
              ₹{profitSummary.net_profit.toFixed(2)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Chart Section */}
      <Card>
        <CardHeader>
          <CardTitle>Profit & Loss Overview</CardTitle>
          <CardDescription>Sales, Costs, and Expenses breakdown</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(value) => `₹${value}`} />
              <Bar dataKey="value" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Add Expense Form */}
      <Card>
        <CardHeader>
          <CardTitle>Record Expense</CardTitle>
          <CardDescription>Add a new business expense</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      <span className="capitalize">{cat}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Amount (₹)</Label>
              <Input
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                step="0.01"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Input
              placeholder="Enter expense details"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Date</Label>
            <Input
              type="date"
              value={expenseDate}
              onChange={(e) => setExpenseDate(e.target.value)}
            />
          </div>

          <Button onClick={handleCreateExpense} disabled={!amount || !category || isCreating} className="w-full">
            {isCreating ? 'Recording...' : 'Record Expense'}
          </Button>
        </CardContent>
      </Card>

      {/* Expense Breakdown Pie Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Expense Breakdown by Category</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={expenseBreakdown}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ₹${value}`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {expenseBreakdown.map((entry) => (
                  <Cell
                    key={`cell-${entry.name}`}
                    fill={CATEGORY_COLORS[entry.name as keyof typeof CATEGORY_COLORS]}
                  />
                ))}
              </Pie>
              <Tooltip formatter={(value) => `₹${value}`} />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Recent Expenses List */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Expenses</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* Sample data - replace with real data */}
              {[].length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-gray-500 py-8">
                    No expenses recorded yet
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
