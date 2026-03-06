import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, CartesianGrid, AreaChart, Area } from 'recharts';
import { Wallet, TrendingUp, TrendingDown, Activity, IndianRupee, Percent, CalendarDays, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { getCategoryName, getCategoryColor } from '@/hooks/useExpenseManagement';

const COLORS = ['#6366f1', '#06b6d4', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#10b981', '#f97316'];

export function DashboardTab({ profitSummary = {}, expenses = [], categories = [] }: any) {
    const summary = profitSummary || {};
    const totalEarnings = Number(summary.sales || 0);
    const totalDeductions = Number(summary.purchase_cost || 0) + Number(summary.expenses || 0);
    const netProfit = Number(summary.net_profit || 0);
    const profitMargin = totalEarnings > 0 ? ((netProfit / totalEarnings) * 100).toFixed(1) : '0.0';

    const barData = [
        { name: 'Income', value: totalEarnings },
        { name: 'Expenses', value: totalDeductions },
    ];

    const safeExpenses = expenses || [];

    // Today's expenses
    const today = new Date().toISOString().split('T')[0];
    const todayExpenses = useMemo(() => {
        return safeExpenses
            .filter((e: any) => e?.expense_date === today)
            .reduce((sum: number, e: any) => sum + Number(e?.amount || 0), 0);
    }, [safeExpenses, today]);

    // This month expenses
    const monthExpenses = useMemo(() => {
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        return safeExpenses
            .filter((e: any) => e?.expense_date >= monthStart && e?.expense_date <= today)
            .reduce((sum: number, e: any) => sum + Number(e?.amount || 0), 0);
    }, [safeExpenses, today]);

    // Average daily expense (last 30 days)
    const avgDailyExpense = useMemo(() => {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const recentExpenses = safeExpenses
            .filter((e: any) => e?.expense_date >= thirtyDaysAgo)
            .reduce((sum: number, e: any) => sum + Number(e?.amount || 0), 0);
        return recentExpenses / 30;
    }, [safeExpenses]);

    // Category pie data
    const pieData = useMemo(() => {
        const grouped = safeExpenses.reduce((acc: any, exp: any) => {
            const catName = getCategoryName(exp, categories);
            acc[catName] = (acc[catName] || 0) + Number(exp?.amount || 0);
            return acc;
        }, {});
        return Object.entries(grouped)
            .map(([name, value]) => ({ name, value: value as number }))
            .sort((a, b) => b.value - a.value);
    }, [safeExpenses, categories]);

    // Monthly trend data (last 6 months)
    const trendData = useMemo(() => {
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
            if (key in months) {
                months[key] += Number(exp?.amount || 0);
            }
        });
        return Object.entries(months).map(([month, amount]) => ({ month, amount }));
    }, [safeExpenses]);

    const summaryCards = [
        {
            title: 'Gross Income',
            value: totalEarnings,
            icon: TrendingUp,
            color: 'from-emerald-500 to-emerald-600',
            textColor: 'text-emerald-600',
            bgColor: 'bg-emerald-50',
            borderColor: 'border-emerald-200',
        },
        {
            title: 'Total Expenses',
            value: totalDeductions,
            icon: TrendingDown,
            color: 'from-rose-500 to-rose-600',
            textColor: 'text-rose-600',
            bgColor: 'bg-rose-50',
            borderColor: 'border-rose-200',
        },
        {
            title: 'Net Profit',
            value: netProfit,
            icon: Wallet,
            color: netProfit >= 0 ? 'from-blue-500 to-blue-600' : 'from-rose-500 to-rose-600',
            textColor: netProfit >= 0 ? 'text-blue-600' : 'text-rose-600',
            bgColor: netProfit >= 0 ? 'bg-blue-50' : 'bg-rose-50',
            borderColor: netProfit >= 0 ? 'border-blue-200' : 'border-rose-200',
        },
        {
            title: 'Profit Margin',
            value: profitMargin,
            icon: Percent,
            isPercentage: true,
            color: 'from-amber-500 to-amber-600',
            textColor: 'text-amber-600',
            bgColor: 'bg-amber-50',
            borderColor: 'border-amber-200',
        },
    ];

    const quickStats = [
        { title: "Today's Expenses", value: todayExpenses, icon: CalendarDays, color: 'text-violet-600', bg: 'bg-violet-50' },
        { title: "Monthly Expenses", value: monthExpenses, icon: IndianRupee, color: 'text-cyan-600', bg: 'bg-cyan-50' },
        { title: "Avg. Daily (30d)", value: avgDailyExpense, icon: Activity, color: 'text-orange-600', bg: 'bg-orange-50' },
    ];

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Financial Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {summaryCards.map((card) => (
                    <Card key={card.title} className={`relative overflow-hidden border ${card.borderColor} shadow-sm hover:shadow-md transition-shadow`}>
                        <div className={`absolute top-0 left-0 w-1 h-full bg-gradient-to-b ${card.color}`} />
                        <CardHeader className="pb-2 pl-5">
                            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                <card.icon className={`h-4 w-4 ${card.textColor}`} />
                                {card.title}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pl-5">
                            <div className={`text-2xl font-black ${card.textColor}`}>
                                {card.isPercentage ? `${card.value}%` : `₹${Number(card.value).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Quick Expense Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {quickStats.map((stat) => (
                    <Card key={stat.title} className="shadow-sm hover:shadow-md transition-shadow border">
                        <CardContent className="p-4 flex items-center gap-4">
                            <div className={`p-3 rounded-xl ${stat.bg}`}>
                                <stat.icon className={`h-5 w-5 ${stat.color}`} />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground font-medium uppercase">{stat.title}</p>
                                <p className={`text-xl font-black ${stat.color}`}>
                                    ₹{Number(stat.value).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Income vs Expense */}
                <Card className="shadow-sm border">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base font-bold">Income vs Expense</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[280px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={barData} barGap={8}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                                    <YAxis tick={{ fontSize: 11 }} />
                                    <Tooltip
                                        formatter={(val: number) => [`₹${val.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 'Amount']}
                                        contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                                    />
                                    <Bar dataKey="value" radius={[8, 8, 0, 0]} barSize={60}>
                                        {barData.map((_, index) => (
                                            <Cell key={`cell-${index}`} fill={index === 0 ? '#10b981' : '#f43f5e'} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* Category Distribution */}
                <Card className="shadow-sm border">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base font-bold">Expense by Category</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[280px] w-full flex items-center justify-center">
                            {pieData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={pieData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={55}
                                            outerRadius={95}
                                            paddingAngle={4}
                                            dataKey="value"
                                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                            labelLine={false}
                                        >
                                            {pieData.map((_, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            formatter={(val: number) => [`₹${val.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 'Amount']}
                                            contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0' }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="text-muted-foreground italic flex flex-col items-center gap-2">
                                    <Activity className="h-8 w-8 opacity-20" />
                                    No expense records found
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Monthly Trend */}
            <Card className="shadow-sm border">
                <CardHeader className="pb-2">
                    <CardTitle className="text-base font-bold">Monthly Expense Trend</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-[250px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={trendData}>
                                <defs>
                                    <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                                <YAxis tick={{ fontSize: 11 }} />
                                <Tooltip
                                    formatter={(val: number) => [`₹${val.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 'Expenses']}
                                    contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0' }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="amount"
                                    stroke="#6366f1"
                                    strokeWidth={2.5}
                                    fillOpacity={1}
                                    fill="url(#colorAmount)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
