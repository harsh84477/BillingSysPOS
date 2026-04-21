import React, { useState } from 'react';
import * as RechartsPrimitive from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChartContainer } from '@/components/ui/chart';

// Placeholder data for charts
const userGrowthData = Array.from({ length: 12 }, (_, i) => ({ month: `M${i + 1}`, users: 100 + i * 20 + Math.floor(Math.random() * 20) }));
const activeSubsData = Array.from({ length: 12 }, (_, i) => ({ month: `M${i + 1}`, active: 80 + i * 15 + Math.floor(Math.random() * 10) }));
const revenueData = Array.from({ length: 12 }, (_, i) => ({ month: `M${i + 1}`, revenue: 50000 + i * 8000 + Math.floor(Math.random() * 5000) }));
const churnData = Array.from({ length: 12 }, (_, i) => ({ month: `M${i + 1}`, churn: Math.random() * 5 + 2 }));
const planPieData = [
  { name: 'Pro', value: 134 },
  { name: 'Basic', value: 73 },
  { name: 'Trial', value: 31 },
  { name: 'Free', value: 10 },
];
const featureAdoptionData = [
  { feature: 'Invoices', users: 210 },
  { feature: 'Inventory', users: 180 },
  { feature: 'Reports', users: 150 },
  { feature: 'POS', users: 120 },
  { feature: 'GST Filing', users: 60 },
];

export default function AnalyticsTab() {
  const [datePreset, setDatePreset] = useState('this-year');

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center mb-2">
        <Select value={datePreset} onValueChange={setDatePreset}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Date Range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="this-month">This Month</SelectItem>
            <SelectItem value="this-year">This Year</SelectItem>
            <SelectItem value="custom">Custom Range</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" className="ml-auto">Export CSV</Button>
        <Button variant="outline">Export Excel</Button>
        <Button variant="outline">Export PDF</Button>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Left: Main Charts */}
        <div className="xl:col-span-8 space-y-6">
          {/* User Growth */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-bold">User Growth</CardTitle></CardHeader>
            <CardContent>
              <div className="h-56">
                <ChartContainer config={{ users: { label: 'Users', color: '#22c55e' } }}>
                  <RechartsPrimitive.LineChart data={userGrowthData} margin={{ top: 10, right: 16, left: -10, bottom: 0 }}>
                    <RechartsPrimitive.CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#222" strokeOpacity={0.1} />
                    <RechartsPrimitive.XAxis dataKey="month" tick={{ fontSize: 10, fill: '#888' }} axisLine={false} tickLine={false} />
                    <RechartsPrimitive.YAxis tick={{ fontSize: 10, fill: '#888' }} axisLine={false} tickLine={false} />
                    <RechartsPrimitive.Tooltip />
                    <RechartsPrimitive.Line type="monotone" dataKey="users" stroke="#22c55e" strokeWidth={2} dot={false} />
                  </RechartsPrimitive.LineChart>
                </ChartContainer>
              </div>
            </CardContent>
          </Card>
          {/* Active Subscriptions */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-bold">Active Subscriptions</CardTitle></CardHeader>
            <CardContent>
              <div className="h-56">
                <ChartContainer config={{ active: { label: 'Active Subs', color: '#4f94ef' } }}>
                  <RechartsPrimitive.BarChart data={activeSubsData} margin={{ top: 10, right: 16, left: -10, bottom: 0 }}>
                    <RechartsPrimitive.CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#222" strokeOpacity={0.1} />
                    <RechartsPrimitive.XAxis dataKey="month" tick={{ fontSize: 10, fill: '#888' }} axisLine={false} tickLine={false} />
                    <RechartsPrimitive.YAxis tick={{ fontSize: 10, fill: '#888' }} axisLine={false} tickLine={false} />
                    <RechartsPrimitive.Tooltip />
                    <RechartsPrimitive.Bar dataKey="active" fill="#4f94ef" radius={[4, 4, 0, 0]} />
                  </RechartsPrimitive.BarChart>
                </ChartContainer>
              </div>
            </CardContent>
          </Card>
          {/* Revenue Trend */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-bold">Revenue Trend</CardTitle></CardHeader>
            <CardContent>
              <div className="h-56">
                <ChartContainer config={{ revenue: { label: 'Revenue', color: '#22c55e' } }}>
                  <RechartsPrimitive.LineChart data={revenueData} margin={{ top: 10, right: 16, left: -10, bottom: 0 }}>
                    <RechartsPrimitive.CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#222" strokeOpacity={0.1} />
                    <RechartsPrimitive.XAxis dataKey="month" tick={{ fontSize: 10, fill: '#888' }} axisLine={false} tickLine={false} />
                    <RechartsPrimitive.YAxis tick={{ fontSize: 10, fill: '#888' }} axisLine={false} tickLine={false} />
                    <RechartsPrimitive.Tooltip />
                    <RechartsPrimitive.Line type="monotone" dataKey="revenue" stroke="#22c55e" strokeWidth={2} dot={false} />
                  </RechartsPrimitive.LineChart>
                </ChartContainer>
              </div>
            </CardContent>
          </Card>
          {/* Churn Rate */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-bold">Churn Rate (%)</CardTitle></CardHeader>
            <CardContent>
              <div className="h-56">
                <ChartContainer config={{ churn: { label: 'Churn', color: '#ef4444' } }}>
                  <RechartsPrimitive.AreaChart data={churnData} margin={{ top: 10, right: 16, left: -10, bottom: 0 }}>
                    <RechartsPrimitive.CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#222" strokeOpacity={0.1} />
                    <RechartsPrimitive.XAxis dataKey="month" tick={{ fontSize: 10, fill: '#888' }} axisLine={false} tickLine={false} />
                    <RechartsPrimitive.YAxis tick={{ fontSize: 10, fill: '#888' }} axisLine={false} tickLine={false} />
                    <RechartsPrimitive.Tooltip />
                    <RechartsPrimitive.Area type="monotone" dataKey="churn" stroke="#ef4444" fill="#ef4444" fillOpacity={0.15} strokeWidth={2} />
                  </RechartsPrimitive.AreaChart>
                </ChartContainer>
              </div>
            </CardContent>
          </Card>
        </div>
        {/* Right: Pie, Feature Adoption */}
        <div className="xl:col-span-4 space-y-6">
          {/* Plan Distribution Pie */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-bold">Plan Distribution</CardTitle></CardHeader>
            <CardContent>
              <div className="h-56">
                <ChartContainer config={{ Pro: { color: '#534AB7' }, Basic: { color: '#4f94ef' }, Trial: { color: '#EF9F27' }, Free: { color: '#B4B2A9' } }}>
                  <RechartsPrimitive.PieChart>
                    <RechartsPrimitive.Pie data={planPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name }) => name}>
                      {planPieData.map((entry, i) => (
                        <RechartsPrimitive.Cell key={i} fill={['#534AB7', '#4f94ef', '#EF9F27', '#B4B2A9'][i]} />
                      ))}
                    </RechartsPrimitive.Pie>
                    <RechartsPrimitive.Tooltip />
                  </RechartsPrimitive.PieChart>
                </ChartContainer>
              </div>
            </CardContent>
          </Card>
          {/* Feature Adoption Bar */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-bold">Feature Adoption</CardTitle></CardHeader>
            <CardContent>
              <div className="h-56">
                <ChartContainer config={{ users: { label: 'Users', color: '#22c55e' } }}>
                  <RechartsPrimitive.BarChart data={featureAdoptionData} margin={{ top: 10, right: 16, left: -10, bottom: 0 }}>
                    <RechartsPrimitive.CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#222" strokeOpacity={0.1} />
                    <RechartsPrimitive.XAxis dataKey="feature" tick={{ fontSize: 10, fill: '#888' }} axisLine={false} tickLine={false} />
                    <RechartsPrimitive.YAxis tick={{ fontSize: 10, fill: '#888' }} axisLine={false} tickLine={false} />
                    <RechartsPrimitive.Tooltip />
                    <RechartsPrimitive.Bar dataKey="users" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  </RechartsPrimitive.BarChart>
                </ChartContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
