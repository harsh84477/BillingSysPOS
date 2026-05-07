import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  ScrollText, ShieldCheck, UserX, CreditCard, Settings, Trash2,
  Search, RefreshCw, Filter, Clock, TriangleAlert, Download,
  Building2, CircleX,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';


const ACTION_META: Record<string, { label: string; color: string; bgColor: string; icon: React.ElementType }> = {
  assign_subscription: { label: 'Assign Plan', color: 'text-emerald-700', bgColor: 'bg-emerald-100 border-emerald-200', icon: CreditCard },
  extend_subscription: { label: 'Extend Plan', color: 'text-blue-700', bgColor: 'bg-blue-100 border-blue-200', icon: CreditCard },
  cancel_subscription: { label: 'Cancel Sub', color: 'text-red-700', bgColor: 'bg-red-100 border-red-200', icon: CircleX },
  block_user: { label: 'Block User', color: 'text-red-700', bgColor: 'bg-red-100 border-red-200', icon: UserX },
  unblock_user: { label: 'Unblock User', color: 'text-emerald-700', bgColor: 'bg-emerald-100 border-emerald-200', icon: ShieldCheck },
  create_plan: { label: 'Create Plan', color: 'text-violet-700', bgColor: 'bg-violet-100 border-violet-200', icon: Settings },
  edit_plan: { label: 'Edit Plan', color: 'text-amber-700', bgColor: 'bg-amber-100 border-amber-200', icon: Settings },
  delete_business: { label: 'Delete Biz', color: 'text-red-700', bgColor: 'bg-red-100 border-red-200', icon: Trash2 },
  create_business: { label: 'Create Biz', color: 'text-emerald-700', bgColor: 'bg-emerald-100 border-emerald-200', icon: Building2 },
};

export default function LogsTab() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('all');

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['admin-logs'],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)('get_admin_logs');
      if (error) throw error;
      return data as any[];
    },
    refetchInterval: 30000,
  });

  // Unique action types for filter
  const actionTypes = useMemo(() => {
    const types = new Set<string>();
    logs.forEach(l => types.add(l.action));
    return [...types].sort();
  }, [logs]);

  // Filtered logs
  const filtered = useMemo(() => {
    let list = logs;
    if (actionFilter !== 'all') list = list.filter(l => l.action === actionFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(l =>
        l.action?.toLowerCase().includes(q) ||
        l.target_type?.toLowerCase().includes(q) ||
        l.target_id?.toLowerCase().includes(q) ||
        JSON.stringify(l.details || {}).toLowerCase().includes(q)
      );
    }
    return list;
  }, [logs, actionFilter, search]);

  // KPI counts
  const todayLogs = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return logs.filter(l => new Date(l.created_at) >= today).length;
  }, [logs]);

  const handleExport = () => {
    const header = 'Timestamp,Action,Target Type,Target ID,Details';
    const csvRows = filtered.map(l => {
      const ts = format(new Date(l.created_at), 'yyyy-MM-dd HH:mm:ss');
      const details = JSON.stringify(l.details || {}).replace(/"/g, '""');
      return `"${ts}","${l.action}","${l.target_type || ''}","${l.target_id || ''}","${details}"`;
    });
    const csv = [header, ...csvRows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `admin_logs_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Logs exported as CSV');
  };

  const getMeta = (action: string) =>
    ACTION_META[action] || { label: action.replace(/_/g, ' '), color: 'text-slate-700', bgColor: 'bg-slate-100 border-slate-200', icon: ScrollText };

  const formatDetails = (details: any) => {
    if (!details || Object.keys(details).length === 0) return null;
    return Object.entries(details).map(([k, v]) => {
      const val = typeof v === 'string' && v.length > 20 ? v.slice(0, 20) + '…' : String(v);
      return `${k}: ${val}`;
    }).join(' · ');
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-72" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{[1,2,3,4].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Audit Log</h2>
          <p className="text-sm text-muted-foreground mt-1">Complete trail of all super-admin operations. Auto-refreshes every 30s.</p>
        </div>
        <div className="flex items-center gap-2 self-start">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => qc.invalidateQueries({ queryKey: ['admin-logs'] })}>
            <RefreshCw className="h-3.5 w-3.5" />Refresh
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={handleExport} disabled={filtered.length === 0}>
            <Download className="h-3.5 w-3.5" />Export
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total Logs" value={logs.length} icon={ScrollText} color="violet" />
        <KpiCard label="Today" value={todayLogs} icon={Clock} color="blue" />
        <KpiCard label="Action Types" value={actionTypes.length} icon={Filter} color="amber" />
        <KpiCard label="Showing" value={filtered.length} icon={Search} color="emerald" />
      </div>

      {/* Logs Table */}
      <Card className="border-slate-200/70 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row justify-between gap-3">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <ScrollText className="h-4 w-4 text-primary" />Admin Action Logs
                <Badge variant="outline" className="text-xs ml-1">{filtered.length}</Badge>
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">Every administrative action is recorded for accountability</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input placeholder="Search logs..." className="pl-8 h-8 w-44 text-xs" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger className="w-40 h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  {actionTypes.map(a => {
                    const m = getMeta(a);
                    return <SelectItem key={a} value={a}>{m.label}</SelectItem>;
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {/* Desktop */}
          <div className="hidden sm:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="w-40">Timestamp</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(log => {
                  const meta = getMeta(log.action);
                  const Icon = meta.icon;
                  const details = formatDetails(log.details);
                  return (
                    <TableRow key={log.id} className="group">
                      <TableCell className="whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="text-xs font-medium">{format(new Date(log.created_at), 'MMM dd, yyyy')}</span>
                          <span className="text-[10px] text-muted-foreground font-mono">{format(new Date(log.created_at), 'HH:mm:ss')}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={cn('text-[10px] gap-1 font-semibold border', meta.bgColor, meta.color)}>
                          <Icon className="h-3 w-3" />{meta.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-xs">
                          {log.target_type && <span className="capitalize text-muted-foreground">{log.target_type}</span>}
                          {log.target_id && <span className="font-mono text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{log.target_id.slice(0, 12)}…</span>}
                          {!log.target_type && !log.target_id && <span className="text-muted-foreground">—</span>}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[280px]">
                        {details ? (
                          <span className="text-[11px] text-muted-foreground truncate block">{details}</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-16 text-muted-foreground">
                      <ScrollText className="h-8 w-8 mx-auto mb-2 opacity-20" />
                      <p className="text-sm font-medium">No logs found</p>
                      <p className="text-xs mt-1">{logs.length === 0 ? 'Admin actions will appear here as they occur.' : 'Try changing the filter or search term.'}</p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile */}
          <div className="sm:hidden divide-y divide-border">
            {filtered.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">No logs found.</div>
            ) : (
              filtered.map(log => {
                const meta = getMeta(log.action);
                const Icon = meta.icon;
                const details = formatDetails(log.details);
                return (
                  <div key={log.id} className="px-4 py-3 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Badge className={cn('text-[10px] gap-1 font-semibold border', meta.bgColor, meta.color)}>
                        <Icon className="h-3 w-3" />{meta.label}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      <span className="capitalize">{log.target_type || '—'}</span>
                      {log.target_id && <span className="font-mono ml-1">· {log.target_id.slice(0, 8)}…</span>}
                    </div>
                    {details && <p className="text-[10px] text-muted-foreground/70 truncate">{details}</p>}
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Sub-components ───

function KpiCard({ label, value, icon: Icon, color }: {
  label: string; value: number; icon: React.ElementType;
  color: 'violet' | 'blue' | 'amber' | 'emerald';
}) {
  const colors = {
    violet: 'text-violet-600 bg-violet-500/10',
    blue: 'text-blue-600 bg-blue-500/10',
    amber: 'text-amber-600 bg-amber-500/10',
    emerald: 'text-emerald-600 bg-emerald-500/10',
  };
  return (
    <Card className="border-slate-200/70 shadow-sm">
      <CardContent className="pt-4 pb-3">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">{label}</p>
            <p className="text-3xl font-bold tracking-tight mt-1">{value}</p>
          </div>
          <div className={cn("h-9 w-9 rounded-xl flex items-center justify-center", colors[color])}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
