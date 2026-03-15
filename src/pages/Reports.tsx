// @ts-nocheck
import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useBusinessSettings } from '@/hooks/useBusinessSettings';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Area, AreaChart,
} from 'recharts';
import {
  TrendingUp, TrendingDown, DollarSign, Package, Users, ShoppingCart,
  Download, Calendar, BarChart2, PieChart as PieChartIcon, Activity, ArrowUpRight, ArrowDownRight,
} from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth, startOfDay, endOfDay, parseISO, isWithinInterval } from 'date-fns';
import { exportToExcel } from '@/lib/exportToExcel';
import { toast } from 'sonner';

// ════════════════════════════════════════════════════
// Color Palette
// ════════════════════════════════════════════════════
const COLORS = ['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#3b82f6'];

// ════════════════════════════════════════════════════
// Report Tabs
// ════════════════════════════════════════════════════
type ReportTab = 'sales' | 'purchase' | 'profit-loss' | 'items' | 'party' | 'stock';

const REPORT_TABS: { id: ReportTab; label: string; icon: React.ElementType }[] = [
  { id: 'sales', label: 'Sales', icon: TrendingUp },
  { id: 'profit-loss', label: 'Profit & Loss', icon: BarChart2 },
  { id: 'items', label: 'Item-wise', icon: Package },
  { id: 'stock', label: 'Stock', icon: Activity },
  { id: 'party', label: 'Party', icon: Users },
];

// ════════════════════════════════════════════════════
// Date Presets
// ════════════════════════════════════════════════════
type DatePreset = 'today' | '7d' | '30d' | 'this-month' | '90d' | 'all';

const DATE_PRESETS: { id: DatePreset; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: '7d', label: '7 Days' },
  { id: '30d', label: '30 Days' },
  { id: 'this-month', label: 'This Month' },
  { id: '90d', label: '90 Days' },
  { id: 'all', label: 'All Time' },
];

function getDateRange(preset: DatePreset): { from: Date | null; to: Date } {
  const now = new Date();
  switch (preset) {
    case 'today': return { from: startOfDay(now), to: endOfDay(now) };
    case '7d': return { from: subDays(now, 7), to: now };
    case '30d': return { from: subDays(now, 30), to: now };
    case 'this-month': return { from: startOfMonth(now), to: endOfMonth(now) };
    case '90d': return { from: subDays(now, 90), to: now };
    case 'all': return { from: null, to: now };
    default: return { from: subDays(now, 30), to: now };
  }
}

// ════════════════════════════════════════════════════
// Main Reports Component
// ════════════════════════════════════════════════════
export default function Reports() {
  const { businessId } = useAuth();
  const { data: settings } = useBusinessSettings();
  const currencySymbol = settings?.currency_symbol || '₹';
  const [activeTab, setActiveTab] = useState<ReportTab>('sales');
  const [datePreset, setDatePreset] = useState<DatePreset>('30d');

  const dateRange = useMemo(() => getDateRange(datePreset), [datePreset]);

  // ── Fetch Bills (completed only) ──
  const { data: bills = [], isLoading: billsLoading } = useQuery({
    queryKey: ['reports-bills', businessId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bills')
        .select('*, bill_items(*), customers(name, phone)')
        .eq('business_id', businessId)
        .eq('status', 'completed')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!businessId,
  });

  // ── Fetch Products ──
  const { data: products = [] } = useQuery({
    queryKey: ['reports-products', businessId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*, categories(name)')
        .eq('business_id', businessId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!businessId,
  });

  // ── Fetch Customers ──
  const { data: customers = [] } = useQuery({
    queryKey: ['reports-customers', businessId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('business_id', businessId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!businessId,
  });

  // ── Filter bills by date range ──
  const filteredBills = useMemo(() => {
    return bills.filter(bill => {
      if (!dateRange.from) return true;
      const billDate = new Date(bill.created_at);
      return billDate >= dateRange.from && billDate <= dateRange.to;
    });
  }, [bills, dateRange]);

  // ════════════════════════════════════════════════════
  // Sales Analytics
  // ════════════════════════════════════════════════════
  const salesData = useMemo(() => {
    const totalSales = filteredBills.reduce((s, b) => s + (b.total_amount || 0), 0);
    const totalTax = filteredBills.reduce((s, b) => s + (b.tax_amount || 0), 0);
    const totalDiscount = filteredBills.reduce((s, b) => s + (b.discount_amount || 0), 0);
    const avgBillValue = filteredBills.length > 0 ? totalSales / filteredBills.length : 0;

    // Daily breakdown
    const dailyMap = new Map<string, { date: string; sales: number; bills: number; tax: number }>();
    filteredBills.forEach(bill => {
      const day = format(new Date(bill.created_at), 'MMM dd');
      const existing = dailyMap.get(day) || { date: day, sales: 0, bills: 0, tax: 0 };
      existing.sales += bill.total_amount || 0;
      existing.bills += 1;
      existing.tax += bill.tax_amount || 0;
      dailyMap.set(day, existing);
    });
    const dailyTrend = Array.from(dailyMap.values());

    return { totalSales, totalTax, totalDiscount, avgBillValue, billCount: filteredBills.length, dailyTrend };
  }, [filteredBills]);

  // ════════════════════════════════════════════════════
  // Profit & Loss
  // ════════════════════════════════════════════════════
  const profitLossData = useMemo(() => {
    let totalRevenue = 0;
    let totalCost = 0;

    filteredBills.forEach(bill => {
      totalRevenue += bill.total_amount || 0;
      (bill.bill_items || []).forEach((item: any) => {
        totalCost += (item.cost_price || 0) * (item.quantity || 0);
      });
    });

    const grossProfit = totalRevenue - totalCost;
    const profitMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

    // Monthly P&L
    const monthlyMap = new Map<string, { month: string; revenue: number; cost: number; profit: number }>();
    filteredBills.forEach(bill => {
      const month = format(new Date(bill.created_at), 'MMM yyyy');
      const existing = monthlyMap.get(month) || { month, revenue: 0, cost: 0, profit: 0 };
      existing.revenue += bill.total_amount || 0;
      (bill.bill_items || []).forEach((item: any) => {
        existing.cost += (item.cost_price || 0) * (item.quantity || 0);
      });
      existing.profit = existing.revenue - existing.cost;
      monthlyMap.set(month, existing);
    });

    return { totalRevenue, totalCost, grossProfit, profitMargin, monthlyTrend: Array.from(monthlyMap.values()) };
  }, [filteredBills]);

  // ════════════════════════════════════════════════════
  // Item Report
  // ════════════════════════════════════════════════════
  const itemReportData = useMemo(() => {
    const itemMap = new Map<string, { name: string; qtySold: number; revenue: number; profit: number }>();
    filteredBills.forEach(bill => {
      (bill.bill_items || []).forEach((item: any) => {
        const existing = itemMap.get(item.product_name) || { name: item.product_name, qtySold: 0, revenue: 0, profit: 0 };
        existing.qtySold += item.quantity || 0;
        existing.revenue += item.total_price || 0;
        existing.profit += ((item.unit_price || 0) - (item.cost_price || 0)) * (item.quantity || 0);
        itemMap.set(item.product_name, existing);
      });
    });
    return Array.from(itemMap.values()).sort((a, b) => b.revenue - a.revenue);
  }, [filteredBills]);

  // ════════════════════════════════════════════════════
  // Party Report
  // ════════════════════════════════════════════════════
  const partyReportData = useMemo(() => {
    const partyMap = new Map<string, { name: string; bills: number; totalSpent: number; lastVisit: string }>();
    filteredBills.forEach(bill => {
      const name = bill.customers?.name || 'Walk-in';
      const existing = partyMap.get(name) || { name, bills: 0, totalSpent: 0, lastVisit: '' };
      existing.bills += 1;
      existing.totalSpent += bill.total_amount || 0;
      if (!existing.lastVisit || bill.created_at > existing.lastVisit) existing.lastVisit = bill.created_at;
      partyMap.set(name, existing);
    });
    return Array.from(partyMap.values()).sort((a, b) => b.totalSpent - a.totalSpent);
  }, [filteredBills]);

  // ════════════════════════════════════════════════════
  // Stock Report
  // ════════════════════════════════════════════════════
  const stockReportData = useMemo(() => {
    const totalItems = products.length;
    const lowStockItems = products.filter(p => p.stock_quantity <= p.low_stock_threshold);
    const outOfStock = products.filter(p => p.stock_quantity === 0);
    const totalStockValue = products.reduce((s, p) => s + ((p.cost_price || 0) * (p.stock_quantity || 0)), 0);
    const totalRetailValue = products.reduce((s, p) => s + ((p.selling_price || 0) * (p.stock_quantity || 0)), 0);

    // Category-wise stock distribution
    const categoryMap = new Map<string, { name: string; items: number; value: number }>();
    products.forEach(p => {
      const catName = p.categories?.name || 'Uncategorized';
      const existing = categoryMap.get(catName) || { name: catName, items: 0, value: 0 };
      existing.items += 1;
      existing.value += (p.cost_price || 0) * (p.stock_quantity || 0);
      categoryMap.set(catName, existing);
    });

    return {
      totalItems, lowStockCount: lowStockItems.length, outOfStockCount: outOfStock.length,
      totalStockValue, totalRetailValue, lowStockItems, outOfStock,
      categoryDistribution: Array.from(categoryMap.values()),
    };
  }, [products]);

  // ── Export handler ──
  const handleExport = () => {
    if (activeTab === 'items' && itemReportData.length > 0) {
      exportToExcel(itemReportData, [
        { key: 'name', header: 'Item Name' },
        { key: 'qtySold', header: 'Qty Sold' },
        { key: 'revenue', header: 'Revenue', format: (v) => Number(v).toFixed(2) },
        { key: 'profit', header: 'Profit', format: (v) => Number(v).toFixed(2) },
      ], `item-report-${format(new Date(), 'yyyy-MM-dd')}`);
    } else if (activeTab === 'party' && partyReportData.length > 0) {
      exportToExcel(partyReportData, [
        { key: 'name', header: 'Customer' },
        { key: 'bills', header: 'Bills' },
        { key: 'totalSpent', header: 'Total Spent', format: (v) => Number(v).toFixed(2) },
        { key: 'lastVisit', header: 'Last Visit', format: (v) => v ? format(new Date(v as string), 'dd MMM yyyy') : '—' },
      ], `party-report-${format(new Date(), 'yyyy-MM-dd')}`);
    } else if (activeTab === 'stock' && products.length > 0) {
      exportToExcel(products, [
        { key: 'name', header: 'Product' },
        { key: 'stock_quantity', header: 'Stock' },
        { key: 'selling_price', header: 'Sell Price', format: (v) => Number(v).toFixed(2) },
        { key: 'cost_price', header: 'Cost Price', format: (v) => Number(v).toFixed(2) },
        { key: 'low_stock_threshold', header: 'Low Threshold' },
      ], `stock-report-${format(new Date(), 'yyyy-MM-dd')}`);
    }
    toast.success('Report exported!');
  };

  // ════════════════════════════════════════════════════
  // KPI Card
  // ════════════════════════════════════════════════════
  const KpiCard = ({ title, value, subtitle, icon: Icon, color, trend }: {
    title: string; value: string; subtitle?: string; icon: React.ElementType; color: string; trend?: 'up' | 'down';
  }) => (
    <Card className="relative overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
          </div>
          <div className={`p-2.5 rounded-xl`} style={{ backgroundColor: color + '18' }}>
            <Icon className="h-5 w-5" style={{ color }} />
          </div>
        </div>
        {trend && (
          <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
            {trend === 'up' ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
          </div>
        )}
      </CardContent>
      <div className="absolute bottom-0 left-0 right-0 h-1" style={{ background: `linear-gradient(90deg, ${color}, transparent)` }} />
    </Card>
  );

  // ════════════════════════════════════════════════════
  // Render
  // ════════════════════════════════════════════════════
  return (
    <div className="w-full space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="spos-page-heading">Reports & Analytics</h1>
          <p className="spos-page-subhead" style={{ marginBottom: 0 }}>Business insights and performance metrics</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />Export
          </Button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-2 border-b pb-0 overflow-x-auto">
        {REPORT_TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30'
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Date Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        {DATE_PRESETS.map(preset => (
          <Button
            key={preset.id}
            variant={datePreset === preset.id ? 'default' : 'outline'}
            size="sm"
            onClick={() => setDatePreset(preset.id)}
            className="text-xs"
          >
            {preset.label}
          </Button>
        ))}
      </div>

      {/* ═══════════════════════════════════════════
          SALES TAB
          ═══════════════════════════════════════════ */}
      {activeTab === 'sales' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KpiCard title="Total Sales" value={`${currencySymbol}${salesData.totalSales.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`} subtitle={`${salesData.billCount} bills`} icon={TrendingUp} color="#6366f1" />
            <KpiCard title="Avg Bill Value" value={`${currencySymbol}${salesData.avgBillValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`} icon={DollarSign} color="#06b6d4" />
            <KpiCard title="Tax Collected" value={`${currencySymbol}${salesData.totalTax.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`} icon={BarChart2} color="#10b981" />
            <KpiCard title="Discounts Given" value={`${currencySymbol}${salesData.totalDiscount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`} icon={ShoppingCart} color="#f59e0b" />
          </div>
          {salesData.dailyTrend.length > 0 && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Sales Trend</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={salesData.dailyTrend}>
                    <defs>
                      <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v: number) => `${currencySymbol}${v.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`} />
                    <Area type="monotone" dataKey="sales" stroke="#6366f1" fill="url(#salesGrad)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════
          PROFIT & LOSS TAB
          ═══════════════════════════════════════════ */}
      {activeTab === 'profit-loss' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KpiCard title="Revenue" value={`${currencySymbol}${profitLossData.totalRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`} icon={TrendingUp} color="#6366f1" />
            <KpiCard title="Cost of Goods" value={`${currencySymbol}${profitLossData.totalCost.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`} icon={Package} color="#ef4444" />
            <KpiCard title="Gross Profit" value={`${currencySymbol}${profitLossData.grossProfit.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`} icon={DollarSign} color="#10b981" trend={profitLossData.grossProfit >= 0 ? 'up' : 'down'} />
            <KpiCard title="Profit Margin" value={`${profitLossData.profitMargin.toFixed(1)}%`} icon={BarChart2} color="#06b6d4" />
          </div>
          {profitLossData.monthlyTrend.length > 0 && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Revenue vs Cost vs Profit</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={profitLossData.monthlyTrend}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v: number) => `${currencySymbol}${v.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`} />
                    <Legend />
                    <Bar dataKey="revenue" fill="#6366f1" name="Revenue" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="cost" fill="#ef4444" name="Cost" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="profit" fill="#10b981" name="Profit" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════
          ITEM REPORT TAB
          ═══════════════════════════════════════════ */}
      {activeTab === 'items' && (
        <div className="space-y-4">
          {/* Top items pie chart */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Top Selling Items (by Revenue)</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={itemReportData.slice(0, 8)} dataKey="revenue" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${name.slice(0, 10)} (${(percent * 100).toFixed(0)}%)`}>
                      {itemReportData.slice(0, 8).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => `${currencySymbol}${v.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Top Items by Quantity</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={itemReportData.slice(0, 10)} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Bar dataKey="qtySold" fill="#6366f1" name="Qty Sold" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
          {/* Full item table */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">All Items ({itemReportData.length})</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Item Name</TableHead>
                      <TableHead className="text-right">Qty Sold</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                      <TableHead className="text-right">Profit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {itemReportData.map((item, i) => (
                      <TableRow key={item.name}>
                        <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell className="text-right">{item.qtySold}</TableCell>
                        <TableCell className="text-right">{currencySymbol}{item.revenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</TableCell>
                        <TableCell className={`text-right font-medium ${item.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {currencySymbol}{item.profit.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ═══════════════════════════════════════════
          STOCK REPORT TAB
          ═══════════════════════════════════════════ */}
      {activeTab === 'stock' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KpiCard title="Total Items" value={stockReportData.totalItems.toString()} icon={Package} color="#6366f1" />
            <KpiCard title="Low Stock" value={stockReportData.lowStockCount.toString()} icon={Activity} color="#f59e0b" />
            <KpiCard title="Out of Stock" value={stockReportData.outOfStockCount.toString()} icon={TrendingDown} color="#ef4444" />
            <KpiCard title="Stock Value" value={`${currencySymbol}${stockReportData.totalStockValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`} subtitle={`Retail: ${currencySymbol}${stockReportData.totalRetailValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`} icon={DollarSign} color="#10b981" />
          </div>
          {/* Category distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Stock by Category</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={stockReportData.categoryDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name }) => name.slice(0, 12)}>
                      {stockReportData.categoryDistribution.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => `${currencySymbol}${v.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Low Stock Items ({stockReportData.lowStockCount})</CardTitle></CardHeader>
              <CardContent>
                <div className="overflow-y-auto max-h-64 space-y-2">
                  {stockReportData.lowStockItems.map(item => (
                    <div key={item.id} className="flex items-center justify-between p-2 rounded-lg bg-red-50/50 dark:bg-red-950/10 border border-red-200/50 dark:border-red-800/20">
                      <div>
                        <p className="text-sm font-medium">{item.name}</p>
                        <p className="text-xs text-muted-foreground">Threshold: {item.low_stock_threshold}</p>
                      </div>
                      <Badge variant="destructive">{item.stock_quantity} left</Badge>
                    </div>
                  ))}
                  {stockReportData.lowStockItems.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">All items are well-stocked 🎉</p>}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════
          PARTY REPORT TAB
          ═══════════════════════════════════════════ */}
      {activeTab === 'party' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <KpiCard title="Total Customers" value={customers.length.toString()} icon={Users} color="#6366f1" />
            <KpiCard title="Active Buyers" value={partyReportData.length.toString()} subtitle="In selected period" icon={ShoppingCart} color="#06b6d4" />
            <KpiCard title="Top Customer Spend" value={partyReportData.length > 0 ? `${currencySymbol}${partyReportData[0]?.totalSpent.toLocaleString('en-IN', { maximumFractionDigits: 0 })}` : '—'} subtitle={partyReportData[0]?.name || ''} icon={TrendingUp} color="#10b981" />
          </div>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Customer Ranking</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead className="text-right">Bills</TableHead>
                      <TableHead className="text-right">Total Spent</TableHead>
                      <TableHead className="text-right">Last Visit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {partyReportData.map((party, i) => (
                      <TableRow key={party.name}>
                        <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                        <TableCell className="font-medium">{party.name}</TableCell>
                        <TableCell className="text-right">{party.bills}</TableCell>
                        <TableCell className="text-right">{currencySymbol}{party.totalSpent.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground">
                          {party.lastVisit ? format(new Date(party.lastVisit), 'dd MMM yyyy') : '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
