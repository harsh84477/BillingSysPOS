import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Search, Users, Shield, User, ChevronDown, ChevronRight, Building2,
    UserCheck, Crown, LayoutList, LayoutGrid, Download, ShieldAlert,
    ShieldCheck, Ban, ChevronLeft, RefreshCw,
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { useAuth } from '@/contexts/AuthContext';

const PAGE_SIZE = 25;

export default function UsersTab() {
    const qc = useQueryClient();
    const { customAdminId } = useAuth();
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [expandedBiz, setExpandedBiz] = useState<Set<string>>(new Set());
    const [viewMode, setViewMode] = useState<'grouped' | 'flat'>('grouped');
    const [page, setPage] = useState(0);
    const [selected, setSelected] = useState<Set<string>>(new Set());

    const { data: users = [], isLoading } = useQuery({
        queryKey: ['all-platform-users'],
        queryFn: async () => {
            const [{ data: profiles, error: pErr }, { data: roles, error: rErr }, { data: businesses, error: bErr }] = await Promise.all([
                supabase.from('profiles').select('*'),
                supabase.from('user_roles').select('*'),
                supabase.from('business_settings').select('id, business_name, business_id'),
            ]);
            if (pErr || rErr || bErr) throw pErr || rErr || bErr;
            const bizMap: Record<string, any> = {};
            (businesses || []).forEach((b: any) => { if (b.business_id) bizMap[b.business_id] = b; bizMap[b.id] = b; });
            return (profiles || []).map((p: any) => {
                const r = (roles || []).find((rr: any) => rr.user_id === p.user_id);
                const biz = bizMap[p.business_id] || null;
                return {
                    user_id: p.user_id, display_name: p.display_name, role: r?.role || 'viewer',
                    joined_at: p.created_at, business_name: biz?.business_name || '—',
                    business_id: p.business_id || 'unknown', is_blocked: p.is_blocked || false,
                };
            });
        },
    });

    const blockMutation = useMutation({
        mutationFn: async ({ userId, block }: { userId: string; block: boolean }) => {
            const fn = block ? 'block_user' : 'unblock_user';
            const { error } = await (supabase.rpc as any)(fn, { p_user_id: userId });
            if (error) throw error;
            await (supabase.rpc as any)('log_admin_action', {
                p_admin_id: customAdminId || 'unknown', p_action: block ? 'block_user' : 'unblock_user',
                p_target_id: userId, p_target_type: 'user', p_details: {},
            });
        },
        onSuccess: (_, vars) => { toast.success(vars.block ? 'User blocked' : 'User unblocked'); qc.invalidateQueries({ queryKey: ['all-platform-users'] }); },
        onError: (err: any) => toast.error(err.message),
    });

    // Stats
    const roleStats = useMemo(() => {
        const s = { all: users.length, owner: 0, manager: 0, cashier: 0, salesman: 0, viewer: 0, blocked: 0 };
        users.forEach(u => {
            if (u.role === 'owner' || u.role === 'admin') s.owner++;
            else if (u.role === 'manager') s.manager++;
            else if (u.role === 'cashier') s.cashier++;
            else if (u.role === 'salesman') s.salesman++;
            else s.viewer++;
            if (u.is_blocked) s.blocked++;
        });
        return s;
    }, [users]);

    const businessCount = useMemo(() => new Set(users.map(u => u.business_id).filter(id => id !== 'unknown')).size, [users]);

    const filtered = useMemo(() => {
        return users.filter(u => {
            const q = search.toLowerCase();
            const matchSearch = !q || u.display_name?.toLowerCase().includes(q) || u.business_name?.toLowerCase().includes(q);
            const matchRole = roleFilter === 'all' || u.role === roleFilter || (roleFilter === 'owner' && (u.role === 'admin' || u.role === 'owner'));
            const matchStatus = statusFilter === 'all' || (statusFilter === 'blocked' && u.is_blocked) || (statusFilter === 'active' && !u.is_blocked);
            return matchSearch && matchRole && matchStatus;
        });
    }, [users, search, roleFilter, statusFilter]);

    React.useEffect(() => { setPage(0); }, [search, roleFilter, statusFilter]);

    const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
    const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

    // Group by business
    const grouped = useMemo(() => {
        const map = new Map<string, { name: string; id: string; users: typeof filtered }>();
        filtered.forEach(u => {
            const key = u.business_id || 'unknown';
            if (!map.has(key)) map.set(key, { name: u.business_name || '—', id: key, users: [] });
            map.get(key)!.users.push(u);
        });
        return Array.from(map.values()).sort((a, b) => b.users.length - a.users.length);
    }, [filtered]);

    const toggleBiz = (id: string) => { setExpandedBiz(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; }); };

    const getRoleBadge = (role: string) => {
        switch (role) {
            case 'owner': case 'admin': return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 gap-1 text-[10px]"><Crown className="h-3 w-3" />Owner</Badge>;
            case 'manager': return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 gap-1 text-[10px]"><UserCheck className="h-3 w-3" />Manager</Badge>;
            case 'cashier': return <Badge className="bg-slate-100 text-slate-700 hover:bg-slate-100 gap-1 text-[10px]"><User className="h-3 w-3" />Cashier</Badge>;
            case 'salesman': return <Badge className="bg-green-100 text-green-700 hover:bg-green-100 gap-1 text-[10px]"><User className="h-3 w-3" />Salesman</Badge>;
            default: return <Badge variant="secondary" className="text-[10px]">{role}</Badge>;
        }
    };

    const handleExport = () => {
        const rows = filtered.map(u => ({
            'Name': u.display_name || 'Unknown', 'Role': u.role === 'admin' ? 'owner' : u.role,
            'Business': u.business_name, 'Status': u.is_blocked ? 'Blocked' : 'Active',
            'Joined': u.joined_at ? format(new Date(u.joined_at), 'yyyy-MM-dd') : '—',
        }));
        if (!rows.length) return;
        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Users');
        XLSX.writeFile(wb, `platform_users_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
        toast.success(`Exported ${rows.length} users`);
    };

    const KPI_CARDS = [
        { label: 'Total Users', value: roleStats.all, icon: Users, color: 'text-slate-600', bg: 'bg-slate-100' },
        { label: 'Owners', value: roleStats.owner, icon: Crown, color: 'text-amber-600', bg: 'bg-amber-50' },
        { label: 'Managers', value: roleStats.manager, icon: UserCheck, color: 'text-blue-600', bg: 'bg-blue-50' },
        { label: 'Cashiers', value: roleStats.cashier, icon: User, color: 'text-violet-600', bg: 'bg-violet-50' },
        { label: 'Businesses', value: businessCount, icon: Building2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
        { label: 'Blocked', value: roleStats.blocked, icon: Ban, color: 'text-red-600', bg: 'bg-red-50' },
    ];

    if (isLoading) {
        return (<div className="space-y-6"><div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">{Array.from({length:6}).map((_,i)=><Skeleton key={i} className="h-24 rounded-xl"/>)}</div><Skeleton className="h-10"/><Skeleton className="h-96 rounded-xl"/></div>);
    }

    return (
        <div className="space-y-5">
            <div><h2 className="text-2xl font-bold tracking-tight">User Management</h2><p className="text-sm text-muted-foreground mt-1">All platform users across businesses.</p></div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {KPI_CARDS.map(card => (
                    <Card key={card.label} className="group hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 border-slate-200/60">
                        <CardContent className="p-3 flex flex-col items-center text-center gap-1.5">
                            <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110", card.bg)}>
                                <card.icon className={cn("h-4 w-4", card.color)} />
                            </div>
                            <p className="text-lg font-black tracking-tight leading-none">{card.value}</p>
                            <p className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground leading-none">{card.label}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search by name or business..." className="pl-9 h-9" value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                    <SelectTrigger className="w-full sm:w-36 h-9"><SelectValue placeholder="All Roles" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Roles ({roleStats.all})</SelectItem>
                        <SelectItem value="owner">Owners ({roleStats.owner})</SelectItem>
                        <SelectItem value="manager">Managers ({roleStats.manager})</SelectItem>
                        <SelectItem value="cashier">Cashiers ({roleStats.cashier})</SelectItem>
                        <SelectItem value="salesman">Salesmen ({roleStats.salesman})</SelectItem>
                    </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full sm:w-36 h-9"><SelectValue placeholder="All Status" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="blocked">Blocked</SelectItem>
                    </SelectContent>
                </Select>
                <div className="flex items-center gap-1.5">
                    <div className="flex rounded-lg border overflow-hidden">
                        <button onClick={() => setViewMode('grouped')} className={cn('p-2 transition-colors', viewMode === 'grouped' ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:bg-muted')} title="Grouped">
                            <LayoutGrid className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => setViewMode('flat')} className={cn('p-2 transition-colors', viewMode === 'flat' ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:bg-muted')} title="Flat">
                            <LayoutList className="h-3.5 w-3.5" />
                        </button>
                    </div>
                    <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs" onClick={handleExport}><Download className="h-3.5 w-3.5" />Export</Button>
                    <Button variant="ghost" size="sm" className="h-9 w-9 p-0" onClick={() => qc.invalidateQueries({ queryKey: ['all-platform-users'] })}><RefreshCw className="h-3.5 w-3.5" /></Button>
                </div>
            </div>

            <Badge variant="outline" className="text-[10px]">{filtered.length} of {users.length} users</Badge>

            {/* Content */}
            <Card className="border-slate-200/60 shadow-sm">
                <CardContent className="p-0">
                    {filtered.length === 0 ? (
                        <div className="text-center py-16 text-muted-foreground"><Users className="h-12 w-12 mx-auto opacity-10 mb-4" /><p className="font-semibold text-foreground">No users found</p><p className="text-sm mt-1">Try adjusting your filters.</p></div>
                    ) : viewMode === 'flat' ? (
                        <>
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-muted/40">
                                            <TableHead>User</TableHead>
                                            <TableHead>Role</TableHead>
                                            <TableHead>Business</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Joined</TableHead>
                                            <TableHead className="text-right">Action</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {paged.map(u => (
                                            <TableRow key={u.user_id} className={cn("group hover:bg-muted/30", u.is_blocked && 'opacity-50')}>
                                                <TableCell>
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                                            <span className="text-xs font-bold text-primary">{(u.display_name || '?')[0].toUpperCase()}</span>
                                                        </div>
                                                        <span className="font-semibold text-sm">{u.display_name || 'Unknown'}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>{getRoleBadge(u.role)}</TableCell>
                                                <TableCell><span className="text-xs text-muted-foreground flex items-center gap-1"><Building2 className="h-3 w-3" />{u.business_name}</span></TableCell>
                                                <TableCell>
                                                    {u.is_blocked
                                                        ? <Badge className="bg-red-100 text-red-700 hover:bg-red-100 gap-1 text-[10px]"><ShieldAlert className="h-3 w-3" />Blocked</Badge>
                                                        : <Badge className="bg-green-100 text-green-700 hover:bg-green-100 text-[10px]">Active</Badge>}
                                                </TableCell>
                                                <TableCell className="text-xs text-muted-foreground">{u.joined_at ? format(new Date(u.joined_at), 'MMM dd, yyyy') : '—'}</TableCell>
                                                <TableCell className="text-right">
                                                    <Button size="sm" variant={u.is_blocked ? 'outline' : 'destructive'} className="h-7 text-xs gap-1 opacity-60 group-hover:opacity-100"
                                                        disabled={blockMutation.isPending} onClick={() => blockMutation.mutate({ userId: u.user_id, block: !u.is_blocked })}>
                                                        {u.is_blocked ? <><ShieldCheck className="h-3 w-3" />Unblock</> : <><Ban className="h-3 w-3" />Block</>}
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                            {totalPages > 1 && (
                                <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/20">
                                    <p className="text-xs text-muted-foreground">Page {page + 1} of {totalPages}</p>
                                    <div className="flex gap-1.5">
                                        <Button variant="outline" size="sm" className="h-7 w-7 p-0" disabled={page === 0} onClick={() => setPage(p => p - 1)}><ChevronLeft className="h-3.5 w-3.5" /></Button>
                                        <Button variant="outline" size="sm" className="h-7 w-7 p-0" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}><ChevronRight className="h-3.5 w-3.5" /></Button>
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="divide-y divide-border">
                            <div className="flex justify-end gap-1 px-4 py-2 bg-muted/20 border-b">
                                <Button variant="ghost" size="sm" className="h-7 text-[10px]" onClick={() => setExpandedBiz(new Set(grouped.map(g => g.id)))}>Expand All</Button>
                                <Button variant="ghost" size="sm" className="h-7 text-[10px]" onClick={() => setExpandedBiz(new Set())}>Collapse</Button>
                            </div>
                            {grouped.map(biz => {
                                const isOpen = expandedBiz.has(biz.id);
                                const oc = biz.users.filter(u => u.role === 'admin' || u.role === 'owner').length;
                                const mc = biz.users.filter(u => u.role === 'manager').length;
                                return (
                                    <Collapsible key={biz.id} open={isOpen} onOpenChange={() => toggleBiz(biz.id)}>
                                        <CollapsibleTrigger asChild>
                                            <button className="w-full text-left px-4 sm:px-6 py-4 hover:bg-muted/30 transition-colors">
                                                <div className="flex items-center justify-between gap-3">
                                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0"><Building2 className="h-5 w-5 text-primary" /></div>
                                                        <div className="min-w-0">
                                                            <p className="font-bold text-sm truncate">{biz.name}</p>
                                                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                                                                <Badge variant="outline" className="text-[10px] h-5">{biz.users.length} user{biz.users.length !== 1 ? 's' : ''}</Badge>
                                                                {oc > 0 && <span className="text-[10px] text-amber-600 font-medium">{oc} owner{oc > 1 ? 's' : ''}</span>}
                                                                {mc > 0 && <span className="text-[10px] text-blue-600 font-medium">{mc} manager{mc > 1 ? 's' : ''}</span>}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    {isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
                                                </div>
                                            </button>
                                        </CollapsibleTrigger>
                                        <CollapsibleContent>
                                            <div className="bg-muted/20 border-t border-border">
                                                {biz.users.map((u, idx) => (
                                                    <div key={u.user_id} className={cn('px-4 sm:px-6 py-3 flex items-center justify-between gap-3', idx < biz.users.length - 1 && 'border-b border-border/50', u.is_blocked && 'opacity-50')}>
                                                        <div className="flex items-center gap-3 min-w-0 flex-1">
                                                            <div className="h-8 w-8 rounded-full bg-background border flex items-center justify-center shrink-0">
                                                                <span className="text-xs font-bold">{(u.display_name || '?')[0].toUpperCase()}</span>
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="font-semibold text-sm truncate">{u.display_name || 'Unknown'}</p>
                                                                <p className="text-[10px] text-muted-foreground">
                                                                    Joined {u.joined_at ? format(new Date(u.joined_at), 'MMM dd, yyyy') : '—'}
                                                                    {u.is_blocked && <span className="text-red-500 ml-2 font-bold">BLOCKED</span>}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            {getRoleBadge(u.role)}
                                                            <Button size="sm" variant={u.is_blocked ? 'outline' : 'destructive'} className="h-7 text-[10px] px-2"
                                                                disabled={blockMutation.isPending} onClick={() => blockMutation.mutate({ userId: u.user_id, block: !u.is_blocked })}>
                                                                {u.is_blocked ? 'Unblock' : 'Block'}
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </CollapsibleContent>
                                    </Collapsible>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
