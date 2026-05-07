import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import {
  Activity, Database, Wifi, Server, Clock, RefreshCw,
  CheckCircle2, AlertCircle, HardDrive, Users, Building2,
  FileText, Package, CreditCard, ShoppingCart, Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface TableStat {
  name: string;
  label: string;
  icon: React.ElementType;
  count: number;
  color: string;
}

export default function SystemHealthTab() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [apiLatency, setApiLatency] = useState<number | null>(null);
  const [lastChecked, setLastChecked] = useState<Date>(new Date());

  // Table counts
  const { data: tableStats = [], isLoading, refetch } = useQuery({
    queryKey: ['system-health-tables'],
    queryFn: async () => {
      const tables: { table: string; label: string; icon: React.ElementType; color: string }[] = [
        { table: 'businesses', label: 'Businesses', icon: Building2, color: 'text-blue-600 bg-blue-500/10' },
        { table: 'profiles', label: 'User Profiles', icon: Users, color: 'text-violet-600 bg-violet-500/10' },
        { table: 'user_roles', label: 'User Roles', icon: Users, color: 'text-indigo-600 bg-indigo-500/10' },
        { table: 'business_settings', label: 'Settings', icon: Server, color: 'text-slate-600 bg-slate-500/10' },
        { table: 'bills', label: 'Bills', icon: FileText, color: 'text-emerald-600 bg-emerald-500/10' },
        { table: 'bill_items', label: 'Bill Items', icon: ShoppingCart, color: 'text-teal-600 bg-teal-500/10' },
        { table: 'products', label: 'Products', icon: Package, color: 'text-amber-600 bg-amber-500/10' },
        { table: 'categories', label: 'Categories', icon: Package, color: 'text-orange-600 bg-orange-500/10' },
        { table: 'customers', label: 'Customers', icon: Users, color: 'text-pink-600 bg-pink-500/10' },
        { table: 'subscriptions', label: 'Subscriptions', icon: CreditCard, color: 'text-cyan-600 bg-cyan-500/10' },
        { table: 'subscription_plans', label: 'Plans', icon: Zap, color: 'text-purple-600 bg-purple-500/10' },
        { table: 'admin_logs', label: 'Admin Logs', icon: FileText, color: 'text-rose-600 bg-rose-500/10' },
        { table: 'super_admins', label: 'Super Admins', icon: Users, color: 'text-red-600 bg-red-500/10' },
        { table: 'inventory_logs', label: 'Inventory Logs', icon: Database, color: 'text-slate-600 bg-slate-500/10' },
      ];

      const results: TableStat[] = [];
      for (const t of tables) {
        try {
          const { count, error } = await supabase.from(t.table as any).select('*', { count: 'exact', head: true });
          results.push({ name: t.table, label: t.label, icon: t.icon, count: count || 0, color: t.color });
        } catch {
          results.push({ name: t.table, label: t.label, icon: t.icon, count: -1, color: t.color });
        }
      }
      return results;
    },
    refetchInterval: 60000,
  });

  // API latency test
  const measureLatency = async () => {
    const start = performance.now();
    try {
      await supabase.from('super_admins').select('id', { count: 'exact', head: true });
      const latency = Math.round(performance.now() - start);
      setApiLatency(latency);
      return latency;
    } catch {
      setApiLatency(-1);
      return -1;
    }
  };

  useEffect(() => {
    measureLatency();
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([refetch(), measureLatency()]);
    setLastChecked(new Date());
    setIsRefreshing(false);
    toast.success('Health check completed');
  };

  // Compute overall status
  const totalRecords = tableStats.reduce((s, t) => s + Math.max(t.count, 0), 0);
  const failedTables = tableStats.filter(t => t.count === -1).length;
  const systemStatus = failedTables > 0 ? 'degraded' : apiLatency && apiLatency > 2000 ? 'slow' : 'operational';

  const getLatencyColor = (ms: number) => {
    if (ms < 200) return 'text-emerald-600';
    if (ms < 500) return 'text-amber-600';
    if (ms < 1000) return 'text-orange-600';
    return 'text-red-600';
  };

  const getLatencyLabel = (ms: number) => {
    if (ms < 200) return 'Excellent';
    if (ms < 500) return 'Good';
    if (ms < 1000) return 'Moderate';
    return 'Slow';
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {[1,2,3].map(i => <Skeleton key={i} className="h-40 rounded-xl" />)}
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4,5,6,7,8].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">System Health</h2>
          <p className="text-sm text-muted-foreground mt-1">Monitor database, API, and platform health metrics in real-time.</p>
        </div>
        <div className="flex items-center gap-3 self-start">
          <span className="text-[10px] text-muted-foreground">Last checked: {lastChecked.toLocaleTimeString()}</span>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw className={cn('h-3.5 w-3.5', isRefreshing && 'animate-spin')} />Refresh
          </Button>
        </div>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* System Status */}
        <Card className={cn('border-slate-200/70 shadow-sm border-l-4',
          systemStatus === 'operational' ? 'border-l-emerald-500' :
          systemStatus === 'slow' ? 'border-l-amber-500' : 'border-l-red-500'
        )}>
          <CardContent className="pt-6 pb-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">System Status</p>
                <p className={cn('text-2xl font-bold tracking-tight mt-2 capitalize',
                  systemStatus === 'operational' ? 'text-emerald-600' :
                  systemStatus === 'slow' ? 'text-amber-600' : 'text-red-600'
                )}>
                  {systemStatus === 'operational' ? '✅ Operational' :
                   systemStatus === 'slow' ? '⚠️ Slow' : '❌ Degraded'}
                </p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {failedTables === 0 ? 'All services running normally' : `${failedTables} table(s) unreachable`}
                </p>
              </div>
              <div className={cn('h-12 w-12 rounded-xl flex items-center justify-center',
                systemStatus === 'operational' ? 'bg-emerald-500/10' : systemStatus === 'slow' ? 'bg-amber-500/10' : 'bg-red-500/10'
              )}>
                {systemStatus === 'operational' ? <CheckCircle2 className="h-6 w-6 text-emerald-600" /> :
                 systemStatus === 'slow' ? <Clock className="h-6 w-6 text-amber-600" /> :
                 <AlertCircle className="h-6 w-6 text-red-600" />}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* API Latency */}
        <Card className="border-slate-200/70 shadow-sm">
          <CardContent className="pt-6 pb-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">API Latency</p>
                {apiLatency !== null && apiLatency >= 0 ? (
                  <>
                    <p className={cn('text-2xl font-bold tracking-tight mt-2', getLatencyColor(apiLatency))}>{apiLatency}ms</p>
                    <p className={cn('text-[10px] font-semibold mt-1', getLatencyColor(apiLatency))}>{getLatencyLabel(apiLatency)}</p>
                  </>
                ) : apiLatency === -1 ? (
                  <p className="text-2xl font-bold tracking-tight mt-2 text-red-600">Failed</p>
                ) : (
                  <Skeleton className="h-8 w-20 mt-2" />
                )}
              </div>
              <div className="h-12 w-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <Wifi className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            {apiLatency !== null && apiLatency >= 0 && (
              <div className="mt-4">
                <Progress value={Math.min(100, Math.max(5, 100 - (apiLatency / 10)))} className="h-1.5" />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Total Records */}
        <Card className="border-slate-200/70 shadow-sm">
          <CardContent className="pt-6 pb-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">Total Records</p>
                <p className="text-2xl font-bold tracking-tight mt-2">{totalRecords.toLocaleString('en-IN')}</p>
                <p className="text-[10px] text-muted-foreground mt-1">Across {tableStats.length} tables</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-violet-500/10 flex items-center justify-center">
                <Database className="h-6 w-6 text-violet-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Database Tables */}
      <div>
        <h3 className="text-lg font-bold mb-4">Database Tables</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {tableStats.map(t => {
            const Icon = t.icon;
            const isFailed = t.count === -1;
            return (
              <Card key={t.name} className={cn('border-slate-200/70 shadow-sm transition-all hover:shadow-md', isFailed && 'border-red-200 bg-red-50/30')}>
                <CardContent className="pt-5 pb-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-1">{t.label}</p>
                      {isFailed ? (
                        <Badge variant="destructive" className="text-[10px]">Unreachable</Badge>
                      ) : (
                        <p className="text-xl font-bold tracking-tight">{t.count.toLocaleString('en-IN')}</p>
                      )}
                    </div>
                    <div className={cn('h-8 w-8 rounded-lg flex items-center justify-center', isFailed ? 'bg-red-500/10' : t.color)}>
                      <Icon className="h-4 w-4" />
                    </div>
                  </div>
                  <p className="text-[9px] font-mono text-muted-foreground mt-2">{t.name}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Supabase Connection Info */}
      <Card className="border-slate-200/70 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Server className="h-4 w-4 text-primary" />Connection Info
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-xl border border-slate-200/70 bg-slate-50/80 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-1">Provider</p>
              <p className="text-sm font-bold">Supabase</p>
            </div>
            <div className="rounded-xl border border-slate-200/70 bg-slate-50/80 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-1">Cache</p>
              <p className="text-sm font-bold">React Query + localStorage</p>
            </div>
            <div className="rounded-xl border border-slate-200/70 bg-slate-50/80 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-1">Auto Refresh</p>
              <p className="text-sm font-bold">Every 60 seconds</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card className="border-slate-200/70 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={handleRefresh} disabled={isRefreshing}>
              <RefreshCw className={cn('h-3.5 w-3.5', isRefreshing && 'animate-spin')} />Re-run Health Check
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => {
              localStorage.removeItem('smartpos_query_cache');
              toast.success('Query cache cleared. Refresh to see fresh data.');
            }}>
              <HardDrive className="h-3.5 w-3.5" />Clear Query Cache
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={async () => {
              const latency = await measureLatency();
              if (latency >= 0) toast.success(`API ping: ${latency}ms`);
              else toast.error('API ping failed');
            }}>
              <Wifi className="h-3.5 w-3.5" />Ping API
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
