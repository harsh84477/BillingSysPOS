import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, PieChart, Pie, Cell,
    CartesianGrid, Legend, AreaChart, Area
} from 'recharts';
import {
    Wallet, TrendingUp, TrendingDown, Activity, IndianRupee, Percent,
    CalendarDays, ShoppingCart, Package, BarChart3, ArrowUp, ArrowDown
} from 'lucide-react';
import { getCategoryName, getCategoryColor } from '@/hooks/useExpenseManagement';

const CATEGORY_COLORS = ['#6366f1', '#06b6d4', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#10b981', '#f97316', '#14b8a6', '#a855f7'];

function formatINR(val: number): string {
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(1)}Cr`;
    if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
    if (val >= 1000) return `₹${(val / 1000).toFixed(1)}K`;
    return `₹${Math.abs(val).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

function formatINRFull(val: number): string {
    return `₹${Number(val).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
}

interface DashboardTabProps {
    profitSummary?: any;
    expenses?: any[];
    categories?: any[];
    monthlyTrends?: any[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="rounded-xl border shadow-xl p-3 bg-background text-xs min-w-[160px]">
                <p className="font-bold mb-2 text-foreground text-[11px]">{label}</p>
                {payload.map((entry: any, i: number) => (
                    <div key={i} className="flex items-center justify-between gap-4 mb-0.5">
                        <span className="flex items-center gap-1.5" style={{ color: entry.color }}>
                            <span className="inline-block w-2 h-2 rounded-full" style={{ background: entry.color }} />
                            {entry.name}
                        </span>
                        <span className="font-bold text-foreground">{formatINRFull(entry.value)}</span>
                    </div>
                ))}
            </div>
        );
    }
    return null;
};

export function DashboardTab({ profitSummary = {}, expenses = [], categories = [], monthlyTrends = [] }: DashboardTabProps) {
    const summary = profitSummary || {};
    const totalSales = Number(summary.sales || 0);
    const inventoryCost = Number(summary.purchase_cost || 0);
    const totalExpenses = Number(summary.expenses || 0);
    const netProfit = Number(summary.net_profit || 0);
    const profitMargin = totalSales > 0 ? ((netProfit / totalSales) * 100) : 0;
    const inventoryPct = totalSales > 0 ? ((inventoryCost / totalSales) * 100) : 0;
    const expensesPct = totalSales > 0 ? ((totalExpenses / totalSales) * 100) : 0;
    const profitPct = totalSales > 0 ? ((netProfit / totalSales) * 100) : 0;

    const safeExpenses = expenses || [];
    const today = new Date().toISOString().split('T')[0];

    const todayExpenses = useMemo(() => {
        return safeExpenses
            .filter((e: any) => e?.expense_date === today)
            .reduce((sum: number, e: any) => sum + Number(e?.amount || 0), 0);
    }, [safeExpenses, today]);

    const monthExpenses = useMemo(() => {
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        return safeExpenses
            .filter((e: any) => e?.expense_date >= monthStart && e?.expense_date <= today)
            .reduce((sum: number, e: any) => sum + Number(e?.amount || 0), 0);
    }, [safeExpenses, today]);

    // Previous month comparison (rough)
    const prevMonthExpenses = useMemo(() => {
        const now = new Date();
        const prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
        const prevEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];
        return safeExpenses
            .filter((e: any) => e?.expense_date >= prevStart && e?.expense_date <= prevEnd)
            .reduce((sum: number, e: any) => sum + Number(e?.amount || 0), 0);
    }, [safeExpenses]);

    const expenseChange = prevMonthExpenses > 0
        ? (((monthExpenses - prevMonthExpenses) / prevMonthExpenses) * 100)
        : 0;

    const pieData = useMemo(() => {
        const grouped = safeExpenses.reduce((acc: any, exp: any) => {
            const catName = getCategoryName(exp, categories);
            acc[catName] = (acc[catName] || 0) + Number(exp?.amount || 0);
            return acc;
        }, {});
        return Object.entries(grouped)
            .map(([name, value]) => ({ name, value: value as number }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 8);
    }, [safeExpenses, categories]);

    const costDonutData = useMemo(() => {
        const items = [];
        if (inventoryCost > 0) items.push({ name: 'Inventory Cost', value: inventoryCost, color: '#3b82f6' });
        if (totalExpenses > 0) items.push({ name: 'Operational', value: totalExpenses, color: '#f43f5e' });
        if (netProfit > 0) items.push({ name: 'Net Profit', value: netProfit, color: '#10b981' });
        return items;
    }, [inventoryCost, totalExpenses, netProfit]);

    const trendData = useMemo(() => {
        if (monthlyTrends && monthlyTrends.length > 0) return monthlyTrends;
        const months: { [key: string]: number } = {};
        const now = new Date();
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const key = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
            months[key] = 0;
        }
        safeExpenses.forEach((exp: any) => {
            if (!exp?.expense_date) return;
            const d = new Date(exp.expense_date);
            const key = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
            if (key in months) months[key] += Number(exp?.amount || 0);
        });
        return Object.entries(months).map(([month, amount]) => ({
            month, sales: 0, inventory_cost: 0, expenses: amount, profit: -amount
        }));
    }, [monthlyTrends, safeExpenses]);

    // Stat cards config
    const statsCards = [
        {
            title: 'Monthly Expenses',
            value: monthExpenses,
            icon: TrendingDown,
            bg: 'from-rose-500 to-pink-600',
            lightBg: 'bg-rose-50 dark:bg-rose-950/20',
            textColor: 'text-rose-600',
            change: expenseChange,
            changeLabel: 'vs last month',
        },
        {
            title: "Today's Expenses",
            value: todayExpenses,
            icon: CalendarDays,
            bg: 'from-violet-500 to-purple-600',
            lightBg: 'bg-violet-50 dark:bg-violet-950/20',
            textColor: 'text-violet-600',
            change: null,
            changeLabel: 'today only',
        },
        {
            title: 'Net Profit',
            value: netProfit,
            icon: Wallet,
            bg: netProfit >= 0 ? 'from-emerald-500 to-green-600' : 'from-rose-500 to-red-600',
            lightBg: netProfit >= 0 ? 'bg-emerald-50 dark:bg-emerald-950/20' : 'bg-rose-50 dark:bg-rose-950/20',
            textColor: netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600',
            change: null,
            changeLabel: 'this month',
        },
        {
            title: 'Profit Margin',
            value: profitMargin,
            isPercentage: true,
            icon: Percent,
            bg: 'from-amber-500 to-orange-500',
            lightBg: 'bg-amber-50 dark:bg-amber-950/20',
            textColor: 'text-amber-600',
            change: null,
            changeLabel: 'of total sales',
        },
    ];

    const renderCustomLegend = (props: any) => {
        const { payload } = props;
        return (
            <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-1">
                {payload?.map((entry: any, i: number) => (
                    <span key={i} className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground">
                        <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: entry.color }} />
                        {entry.value}
                    </span>
                ))}
            </div>
        );
    };

    return (
        <div className="space-y-4 w-full animate-in fade-in duration-500">

            {/* ══════════════════════ STATS CARDS ══════════════════════ */}
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
                {statsCards.map((card) => (
                    <div key={card.title} className={`rounded-2xl border p-5 ${card.lightBg} relative overflow-hidden group hover:shadow-md transition-all duration-300`}>
                        {/* Decorative gradient circle */}
                        <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full bg-gradient-to-br ${card.bg} opacity-10 group-hover:opacity-20 transition-opacity`} />

                        <div className="relative">
                            <div className="flex items-center justify-between mb-3">
                                <p className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-muted-foreground">
                                    {card.title}
                                </p>
                                <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${card.bg} flex items-center justify-center shadow-md`}>
                                    <card.icon className="h-4 w-4 text-white" />
                                </div>
                            </div>

                            <p className={`text-2xl sm:text-3xl font-black ${card.textColor} leading-none`}>
                                {card.isPercentage
                                    ? `${profitMargin.toFixed(1)}%`
                                    : formatINR(Number(card.value))
                                }
                            </p>

                            <div className="mt-2 flex items-center gap-1.5">
                                {card.change !== null ? (
                                    <>
                                        {card.change > 0
                                            ? <ArrowUp className="h-3 w-3 text-rose-500" />
                                            : <ArrowDown className="h-3 w-3 text-emerald-500" />
                                        }
                                        <span className={`text-[11px] font-bold ${card.change > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                                            {Math.abs(card.change).toFixed(1)}%
                                        </span>
                                    </>
                                ) : null}
                                <span className="text-[10px] text-muted-foreground">{card.changeLabel}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* ══════════════════════ CHARTS ROW ══════════════════════ */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
                {/* Revenue vs Cost Trend — 7 cols */}
                <Card className="xl:col-span-7 shadow-sm border">
                    <CardHeader className="pb-2 pt-4 px-5 flex flex-row items-center justify-between space-y-0">
                        <div>
                            <CardTitle className="text-sm font-bold flex items-center gap-2">
                                <BarChart3 className="h-4 w-4 text-indigo-500" />
                                Revenue vs Cost Trend
                            </CardTitle>
                            <p className="text-[10px] text-muted-foreground mt-0.5">6-month sales, COGS & expense breakdown</p>
                        </div>
                        <div className="flex gap-3 text-[10px] text-muted-foreground">
                            <span className="flex items-center gap-1"><span className="w-2.5 h-1 rounded-full bg-emerald-500 inline-block" /> Sales</span>
                            <span className="flex items-center gap-1"><span className="w-2.5 h-1 rounded-full bg-blue-500 inline-block" /> COGS</span>
                            <span className="flex items-center gap-1"><span className="w-2.5 h-1 rounded-full bg-rose-500 inline-block" /> Expenses</span>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0 pb-4 px-2">
                        <div className="h-[240px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={trendData} margin={{ top: 10, right: 16, left: -10, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.25} />
                                            <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="invGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" strokeOpacity={0.6} />
                                    <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v) => formatINR(v)} axisLine={false} tickLine={false} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Area type="monotone" dataKey="sales" name="Sales" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#salesGrad)" dot={false} />
                                    <Area type="monotone" dataKey="inventory_cost" name="COGS" stroke="#3b82f6" strokeWidth={1.5} fillOpacity={1} fill="url(#invGrad)" strokeDasharray="5 3" dot={false} />
                                    <Area type="monotone" dataKey="expenses" name="Expenses" stroke="#f43f5e" strokeWidth={2} fillOpacity={1} fill="url(#expGrad)" dot={false} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* Category Donut — 5 cols */}
                <Card className="xl:col-span-5 shadow-sm border">
                    <CardHeader className="pb-2 pt-4 px-5">
                        <CardTitle className="text-sm font-bold flex items-center gap-2">
                            <Activity className="h-4 w-4 text-purple-500" />
                            Expense by Category
                        </CardTitle>
                        <p className="text-[10px] text-muted-foreground mt-0.5">Distribution across all expense categories</p>
                    </CardHeader>
                    <CardContent className="px-4 pb-4">
                        {pieData.length > 0 ? (
                            <>
                                <div className="h-[190px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={pieData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={55}
                                                outerRadius={85}
                                                paddingAngle={3}
                                                dataKey="value"
                                                stroke="none"
                                            >
                                                {pieData.map((_, index) => (
                                                    <Cell key={index} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip
                                                formatter={(val: number) => [formatINRFull(val), 'Amount']}
                                                contentStyle={{ borderRadius: 12, border: '1px solid hsl(var(--border))', fontSize: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                                {/* Legend */}
                                <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2">
                                    {pieData.slice(0, 6).map((entry, index) => (
                                        <div key={entry.name} className="flex items-center gap-1.5">
                                            <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: CATEGORY_COLORS[index % CATEGORY_COLORS.length] }} />
                                            <span className="text-[10px] font-medium text-muted-foreground truncate">{entry.name}</span>
                                            <span className="text-[10px] font-bold text-foreground ml-auto">{formatINR(entry.value)}</span>
                                        </div>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <div className="h-[240px] flex flex-col items-center justify-center text-muted-foreground">
                                <Activity className="h-12 w-12 opacity-10 mb-3" />
                                <p className="text-sm italic">No expense data yet</p>
                                <p className="text-xs opacity-60">Add expenses to see category breakdown</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* ══════════════════════ COST ANALYSIS ══════════════════════ */}
            <Card className="shadow-sm border w-full">
                <CardHeader className="pb-2 pt-4 px-5 border-b">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-sm font-bold flex items-center gap-2">
                                <ShoppingCart className="h-4 w-4 text-blue-500" />
                                Cost Analysis — This Month's Breakdown
                            </CardTitle>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                                Net Profit = Sales − Inventory Cost − Operational Expenses
                            </p>
                        </div>
                        {totalSales > 0 && (
                            <div className="hidden sm:flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">
                                <TrendingUp className="h-3 w-3" />
                                {profitPct.toFixed(1)}% profit rate
                            </div>
                        )}
                    </div>
                </CardHeader>
                <CardContent className="p-5">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        {/* Donut left */}
                        <div className="lg:col-span-3 flex flex-col items-center justify-center">
                            {costDonutData.length > 0 ? (
                                <>
                                    <div className="h-[180px] w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={costDonutData}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={50}
                                                    outerRadius={75}
                                                    paddingAngle={4}
                                                    dataKey="value"
                                                    stroke="none"
                                                >
                                                    {costDonutData.map((entry, index) => (
                                                        <Cell key={index} fill={entry.color} />
                                                    ))}
                                                </Pie>
                                                <Tooltip
                                                    formatter={(val: number) => [formatINRFull(val), 'Amount']}
                                                    contentStyle={{ borderRadius: 12, border: '1px solid hsl(var(--border))', fontSize: 12 }}
                                                />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <div className="flex flex-wrap justify-center gap-3 mt-1">
                                        {costDonutData.map((item) => (
                                            <div key={item.name} className="flex items-center gap-1.5">
                                                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                                                <span className="text-[10px] font-semibold text-muted-foreground">{item.name}</span>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            ) : (
                                <div className="h-[180px] flex items-center justify-center text-muted-foreground text-xs italic">
                                    No sales data yet
                                </div>
                            )}
                        </div>

                        {/* Divider */}
                        <div className="lg:col-span-1 flex lg:justify-center">
                            <div className="w-full h-px lg:w-px lg:h-full bg-border my-2 lg:my-0" />
                        </div>

                        {/* Metrics right */}
                        <div className="lg:col-span-8 space-y-5">
                            {/* 4 metric mini cards */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                {[
                                    { label: 'Total Sales', value: totalSales, color: '#10b981', borderColor: 'border-emerald-400', icon: TrendingUp },
                                    { label: 'Inventory Cost', value: inventoryCost, color: '#3b82f6', borderColor: 'border-blue-400', icon: Package },
                                    { label: 'Op. Expenses', value: totalExpenses, color: '#f43f5e', borderColor: 'border-rose-400', icon: TrendingDown },
                                    { label: 'Net Profit', value: netProfit, color: netProfit >= 0 ? '#10b981' : '#ef4444', borderColor: netProfit >= 0 ? 'border-emerald-400' : 'border-red-400', icon: Wallet },
                                ].map((m) => (
                                    <div key={m.label} className={`rounded-xl border-l-4 ${m.borderColor} bg-muted/20 p-3 space-y-1`}>
                                        <div className="flex items-center gap-1.5">
                                            <m.icon className="h-3 w-3 shrink-0" style={{ color: m.color }} />
                                            <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-muted-foreground truncate">{m.label}</span>
                                        </div>
                                        <span className="text-sm sm:text-lg font-black block leading-none" style={{ color: m.color }}>
                                            {formatINR(m.value)}
                                        </span>
                                        <span className="text-[9px] text-muted-foreground">{formatINRFull(m.value)}</span>
                                    </div>
                                ))}
                            </div>

                            {/* % breakdown progress bars */}
                            <div className="space-y-3">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Revenue Allocation (% of sales)</p>
                                {[
                                    { label: 'Inventory / COGS', pct: inventoryPct, color: '#3b82f6', bg: 'bg-blue-500' },
                                    { label: 'Operational Expenses', pct: expensesPct, color: '#f43f5e', bg: 'bg-rose-500' },
                                    { label: 'Net Profit Retained', pct: Math.max(profitPct, 0), color: '#10b981', bg: 'bg-emerald-500' },
                                ].map((bar) => (
                                    <div key={bar.label} className="flex items-center gap-3">
                                        <span className="text-[10px] font-semibold text-muted-foreground w-36 shrink-0 truncate">{bar.label}</span>
                                        <div className="flex-1 h-3 rounded-full bg-muted/50 overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all duration-1000 ease-out ${bar.bg}`}
                                                style={{ width: `${Math.min(Math.max(bar.pct, 0), 100)}%` }}
                                            />
                                        </div>
                                        <span className="text-[11px] font-black w-10 text-right" style={{ color: bar.color }}>
                                            {bar.pct.toFixed(1)}%
                                        </span>
                                        <span className="text-[10px] text-muted-foreground w-16 text-right hidden sm:block">
                                            {formatINR(bar.label === 'Inventory / COGS' ? inventoryCost : bar.label === 'Operational Expenses' ? totalExpenses : Math.max(netProfit, 0))}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
