import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, LineChart, Line, CartesianGrid } from 'recharts';
import { Wallet, TrendingUp, TrendingDown, Activity } from 'lucide-react';

export function DashboardTab({ profitSummary = {}, expenses = [], categories = [] }: any) {
    const summary = profitSummary || {};
    const totalEarnings = Number(summary.sales || 0);
    const totalDeductions = Number(summary.purchase_cost || 0) + Number(summary.expenses || 0);
    const netProfit = Number(summary.net_profit || 0);
    const profitMargin = totalEarnings > 0 ? ((netProfit / totalEarnings) * 100).toFixed(2) : 0;

    const barData = [
        { name: 'Income', value: totalEarnings },
        { name: 'Expenses', value: totalDeductions },
    ];

    const pieData = useMemo(() => {
        const grouped = (expenses || []).reduce((acc: any, exp: any) => {
            let catName = 'Uncategorized';
            if (typeof exp?.category === 'string') {
                catName = exp.category;
            } else if (exp?.category && typeof exp.category === 'object' && !Array.isArray(exp.category)) {
                catName = exp.category.name || 'Uncategorized';
            } else if (Array.isArray(exp?.category) && exp.category.length > 0) {
                catName = exp.category[0]?.name || 'Uncategorized';
            }

            acc[catName] = (acc[catName] || 0) + Number(exp?.amount || 0);
            return acc;
        }, {});
        return Object.entries(grouped).map(([name, value]) => ({ name, value }));
    }, [expenses]);

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF', '#FF19A3'];

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="border-l-4 border-l-emerald-500 shadow-md">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground uppercase">Gross Income</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-emerald-600">₹{totalEarnings.toFixed(2)}</div>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-rose-500 shadow-md">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground uppercase">Total Expenses</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-rose-500">₹{totalDeductions.toFixed(2)}</div>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-blue-500 shadow-md">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground uppercase">Net Profit</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${netProfit >= 0 ? 'text-primary' : 'text-rose-600'}`}>
                            ₹{netProfit.toFixed(2)}
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-amber-500 shadow-md">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground uppercase">Profit Margin</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-amber-500">{profitMargin}%</div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="shadow-md border-0 ring-1 ring-border/50">
                    <CardHeader>
                        <CardTitle className="text-lg">Income vs Expense</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={barData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="name" />
                                    <YAxis />
                                    <Tooltip formatter={(val: number) => `₹${val.toFixed(2)}`} />
                                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                        {barData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={index === 0 ? '#10b981' : '#f43f5e'} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                <Card className="shadow-md border-0 ring-1 ring-border/50">
                    <CardHeader>
                        <CardTitle className="text-lg">Expense Distribution</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px] w-full flex items-center justify-center">
                            {pieData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={pieData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={100}
                                            paddingAngle={5}
                                            dataKey="value"
                                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                        >
                                            {pieData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip formatter={(val: number) => `₹${val.toFixed(2)}`} />
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
        </div>
    );
}
