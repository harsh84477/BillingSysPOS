import React, { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  Activity, Database, Wifi, Server, Clock, RefreshCw,
  CheckCircle2, AlertCircle, HardDrive, Users, Building2,
  FileText, Package, CreditCard, ShoppingCart, Zap, Shield,
  Settings, ScrollText, Layers,
} from 'lucide-react';

interface TableStat {
  name: string;
  label: string;
  icon: React.ElementType;
  count: number; // -1 = failed, -2 = RLS blocked (estimated via RPC)
  color: string;
  status: 'ok' | 'blocked' | 'error';
}

interface HealthMetrics {
  apiLatency: number | null;     // ms, -1 = failed
  dbLatency: number | null;      // ms
  uptime: number;                // seconds since page load
}

const TABLE_CONFIG: { table: string; label: string; icon: React.ElementType; color: string }[] = [
  { table: 'businesses', label: 'Businesses', icon: Building2, color: 'text-blue-600 bg-blue-500/10' },
  { table: 'profiles', label: 'User Profiles', icon: Users, color: 'text-violet-600 bg-violet-500/10' },
  { table: 'user_roles', label: 'User Roles', icon: Users, color: 'text-indigo-600 bg-indigo-500/10' },
  { table: 'business_settings', label: 'Settings', icon: Settings, color: 'text-slate-600 bg-slate-500/10' },
  { table: 'bills', label: 'Bills', icon: FileText, color: 'text-emerald-600 bg-emerald-500/10' },
  { table: 'bill_items', label: 'Bill Items', icon: ShoppingCart, color: 'text-teal-600 bg-teal-500/10' },
  { table: 'products', label: 'Products', icon: Package, color: 'text-amber-600 bg-amber-500/10' },
  { table: 'categories', label: 'Categories', icon: Package, color: 'text-orange-600 bg-orange-500/10' },
  { table: 'customers', label: 'Customers', icon: Users, color: 'text-pink-600 bg-pink-500/10' },
  { table: 'subscriptions', label: 'Subscriptions', icon: CreditCard, color: 'text-cyan-600 bg-cyan-500/10' },
  { table: 'subscription_plans', label: 'Plans', icon: Zap, color: 'text-purple-600 bg-purple-500/10' },
  { table: 'admin_logs', label: 'Admin Logs', icon: ScrollText, color: 'text-rose-600 bg-rose-500/10' },
  { table: 'super_admins', label: 'Super Admins', icon: Shield, color: 'text-red-600 bg-red-500/10' },
  { table: 'inventory_logs', label: 'Inventory Logs', icon: Database, color: 'text-slate-600 bg-slate-500/10' },
];

export default function SystemHealthTab() {
  const qc = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [metrics, setMetrics] = useState<HealthMetrics>({ apiLatency: null, dbLatency: null, uptime: 0 });
  const [lastChecked, setLastChecked] = useState<Date>(new Date());
  const [pageLoadTime] = useState<number>(Date.now());

  // Uptime counter
  useEffect(() => {
    const timer = setInterval(() => {
      setMetrics(m => ({ ...m, uptime: Math.round((Date.now() - pageLoadTime) / 1000) }));
    }, 1000);
    return () => clearInterval(timer);
  }, [pageLoadTime]);

  // Table counts — uses direct queries with proper error handling
  const { data: tableStats = [], isLoading, refetch } = useQuery({
    queryKey: ['system-health-tables'],
    queryFn: async () => {
      const results: TableStat[] = [];

      for (const t of TABLE_CONFIG) {
        try {
          const { count, error } = await supabase.from(t.table as any).select('*', { count: 'exact', head: true });
          if (error) {
            // RLS blocked or permission denied — table exists but can't be queried directly
            results.push({ name: t.table, label: t.label, icon: t.icon, count: -2, color: t.color, status: 'blocked' });
          } else {
            results.push({ name: t.table, label: t.label, icon: t.icon, count: count ?? 0, color: t.color, status: 'ok' });
          }
        } catch {
          results.push({ name: t.table, label: t.label, icon: t.icon, count: -1, color: t.color, status: 'error' });
        }
      }

      // For RLS-blocked tables, try to get counts via existing RPCs
      const blockedTables = results.filter(r => r.status === 'blocked');
      if (blockedTables.length > 0) {
        try {
          // Use platform stats RPC which counts businesses, profiles, subscriptions
          const { data: stats } = await (supabase.rpc as any)('get_platform_stats_v2');
          if (stats) {
            const rpcCounts: Record<string, number> = {
              businesses: stats.total_businesses,
              profiles: stats.total_users,
            };
            for (const r of results) {
              if (r.status === 'blocked' && rpcCounts[r.name] !== undefined) {
                r.count = rpcCounts[r.name];
                r.status = 'ok';
              }
            }
          }
        } catch { /* ignore */ }

        try {
          // Use get_admin_logs to get admin_logs count
          const { data: logs } = await (supabase.rpc as any)('get_admin_logs');
          if (logs) {
            const logEntry = results.find(r => r.name === 'admin_logs');
            if (logEntry && logEntry.status === 'blocked') {
              logEntry.count = logs.length;
              logEntry.status = 'ok';
            }
          }
        } catch { /* ignore */ }
      }

      return results;
    },
    refetchInterval: 60000,
  });

  // Latency measurement
  const measureLatency = useCallback(async () => {
    const start = performance.now();
    try {
      await supabase.from('subscription_plans').select('id', { count: 'exact', head: true });
      const apiLatency = Math.round(performance.now() - start);

      // Second call for DB round-trip
      const dbStart = performance.now();
      await (supabase.rpc as any)('get_platform_stats_v2');
      const dbLatency = Math.round(performance.now() - dbStart);

      setMetrics(m => ({ ...m, apiLatency, dbLatency }));
      return apiLatency;
    } catch {
      setMetrics(m => ({ ...m, apiLatency: -1, dbLatency: -1 }));
      return -1;
    }
  }, []);

  useEffect(() => { measureLatency(); }, [measureLatency]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([refetch(), measureLatency()]);
    setLastChecked(new Date());
    setIsRefreshing(false);
    toast.success('Health check completed');
  };

  // Computed
  const okTables = tableStats.filter(t => t.status === 'ok');
  const blockedTables = tableStats.filter(t => t.status === 'blocked');
  const errorTables = tableStats.filter(t => t.status === 'error');
  const totalRecords = okTables.reduce((s, t) => s + Math.max(t.count, 0), 0);
  const hasIssues = errorTables.length > 0;
  const systemStatus = hasIssues ? 'degraded' : metrics.apiLatency && metrics.apiLatency > 2000 ? 'slow' : 'operational';

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

  const formatUptime = (secs: number) => {
    if (secs < 60) return `${secs}s`;
    if (secs < 3600) return `${Math.floor(secs / 60)}m ${secs % 60}s`;
    return `${Math.floor(secs / 3600)}h ${Math.floor((secs % 3600) / 60)}m`;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-72" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
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

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* System Status */}
        <Card className={cn('border-slate-200/70 shadow-sm border-l-4',
          systemStatus === 'operational' ? 'border-l-emerald-500' :
          systemStatus === 'slow' ? 'border-l-amber-500' : 'border-l-red-500'
        )}>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Status</p>
                <p className={cn('text-lg font-bold tracking-tight mt-1',
                  systemStatus === 'operational' ? 'text-emerald-600' :
                  systemStatus === 'slow' ? 'text-amber-600' : 'text-red-600'
                )}>
                  {systemStatus === 'operational' ? 'Operational' :
                   systemStatus === 'slow' ? 'Slow' : 'Degraded'}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {errorTables.length === 0 ? `${okTables.length}/${tableStats.length} tables ok` : `${errorTables.length} table(s) down`}
                </p>
              </div>
              <div className={cn('h-10 w-10 rounded-xl flex items-center justify-center',
                systemStatus === 'operational' ? 'bg-emerald-500/10' : systemStatus === 'slow' ? 'bg-amber-500/10' : 'bg-red-500/10'
              )}>
                {systemStatus === 'operational' ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> :
                 systemStatus === 'slow' ? <Clock className="h-5 w-5 text-amber-600" /> :
                 <AlertCircle className="h-5 w-5 text-red-600" />}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* API Latency */}
        <Card className="border-slate-200/70 shadow-sm">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">API Latency</p>
                {metrics.apiLatency !== null && metrics.apiLatency >= 0 ? (
                  <>
                    <p className={cn('text-lg font-bold tracking-tight mt-1', getLatencyColor(metrics.apiLatency))}>{metrics.apiLatency}ms</p>
                    <p className={cn('text-[10px] font-semibold mt-0.5', getLatencyColor(metrics.apiLatency))}>{getLatencyLabel(metrics.apiLatency)}</p>
                  </>
                ) : metrics.apiLatency === -1 ? (
                  <p className="text-lg font-bold tracking-tight mt-1 text-red-600">Failed</p>
                ) : (
                  <Skeleton className="h-7 w-16 mt-1" />
                )}
              </div>
              <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <Wifi className="h-5 w-5 text-blue-600" />
              </div>
            </div>
            {metrics.apiLatency !== null && metrics.apiLatency >= 0 && (
              <Progress value={Math.min(100, Math.max(5, 100 - (metrics.apiLatency / 10)))} className="h-1 mt-3" />
            )}
          </CardContent>
        </Card>

        {/* Total Records */}
        <Card className="border-slate-200/70 shadow-sm">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Total Records</p>
                <p className="text-lg font-bold tracking-tight mt-1">{totalRecords.toLocaleString('en-IN')}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Across {okTables.length} tables</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
                <Database className="h-5 w-5 text-violet-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Session Uptime */}
        <Card className="border-slate-200/70 shadow-sm">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Session Uptime</p>
                <p className="text-lg font-bold tracking-tight mt-1">{formatUptime(metrics.uptime)}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Auto-refresh: 60s</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <Activity className="h-5 w-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Database Tables Grid */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <h3 className="text-lg font-bold">Database Tables</h3>
          <Badge variant="outline" className="text-xs">{tableStats.length} tables</Badge>
          {blockedTables.length > 0 && (
            <Badge className="text-[9px] bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100">{blockedTables.length} RLS restricted</Badge>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {tableStats.map(t => {
            const Icon = t.icon;
            return (
              <Card key={t.name} className={cn(
                'border-slate-200/70 shadow-sm transition-all hover:shadow-md',
                t.status === 'error' && 'border-red-200 bg-red-50/30',
                t.status === 'blocked' && 'border-amber-200/50 bg-amber-50/20',
              )}>
                <CardContent className="pt-4 pb-3">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 truncate">{t.label}</p>
                      {t.status === 'error' ? (
                        <Badge variant="destructive" className="text-[9px] mt-1">Unreachable</Badge>
                      ) : t.status === 'blocked' ? (
                        <div className="mt-1">
                          <Badge className="text-[9px] bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100">RLS Blocked</Badge>
                        </div>
                      ) : (
                        <p className="text-xl font-bold tracking-tight mt-0.5">{t.count.toLocaleString('en-IN')}</p>
                      )}
                    </div>
                    <div className={cn(
                      'h-8 w-8 rounded-lg flex items-center justify-center shrink-0',
                      t.status === 'error' ? 'bg-red-500/10' :
                      t.status === 'blocked' ? 'bg-amber-500/10' : t.color
                    )}>
                      <Icon className="h-4 w-4" />
                    </div>
                  </div>
                  <p className="text-[9px] font-mono text-muted-foreground mt-2 truncate">{t.name}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Connection Info + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Connection Info */}
        <Card className="border-slate-200/70 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Server className="h-4 w-4 text-primary" />Connection Info
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <InfoChip label="Provider" value="Supabase" />
              <InfoChip label="Cache" value="React Query" />
              <InfoChip label="DB Latency" value={metrics.dbLatency !== null && metrics.dbLatency >= 0 ? `${metrics.dbLatency}ms` : '—'} />
              <InfoChip label="API Latency" value={metrics.apiLatency !== null && metrics.apiLatency >= 0 ? `${metrics.apiLatency}ms` : '—'} />
              <InfoChip label="Tables" value={`${okTables.length} accessible`} />
              <InfoChip label="Auto Refresh" value="Every 60s" />
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
                qc.clear();
                toast.success('All query cache cleared. Data will re-fetch.');
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
              <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => {
                window.location.reload();
              }}>
                <Layers className="h-3.5 w-3.5" />Hard Reload
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Sub-component ───

function InfoChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200/70 bg-slate-50/80 px-3 py-2.5">
      <p className="text-[9px] font-semibold uppercase tracking-widest text-slate-500 mb-0.5">{label}</p>
      <p className="text-sm font-bold truncate">{value}</p>
    </div>
  );
}
