import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
    Search, Users, Shield, User, ChevronDown, ChevronRight, Building2,
    UserCheck, Crown, LayoutList, LayoutGrid, Download
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import * as XLSX from 'xlsx';

export default function UsersTab() {
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');
    const [expandedBiz, setExpandedBiz] = useState<Set<string>>(new Set());
    const [viewMode, setViewMode] = useState<'grouped' | 'flat'>('grouped');

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
            (businesses || []).forEach((b: any) => {
                if (b.business_id) bizMap[b.business_id] = b;
                bizMap[b.id] = b;
            });

            return (profiles || []).map((p: any) => {
                const r = (roles || []).find((rr: any) => rr.user_id === p.user_id);
                const biz = bizMap[p.business_id] || null;
                return {
                    user_id: p.user_id,
                    display_name: p.display_name,
                    role: r?.role || 'viewer',
                    joined_at: p.created_at,
                    business_name: biz?.business_name || '—',
                    business_id: p.business_id || 'unknown',
                    is_blocked: p.is_blocked || false,
                };
            });
        },
    });

    // Role stats
    const roleStats = useMemo(() => {
        const stats = { all: users.length, owner: 0, manager: 0, cashier: 0, salesman: 0, viewer: 0 };
        users.forEach(u => {
            if (u.role === 'owner' || u.role === 'admin') stats.owner++;
            else if (u.role === 'manager') stats.manager++;
            else if (u.role === 'cashier') stats.cashier++;
            else if (u.role === 'salesman') stats.salesman++;
            else stats.viewer++;
        });
        return stats;
    }, [users]);

    const filtered = users.filter(u => {
        const matchSearch =
            u.display_name?.toLowerCase().includes(search.toLowerCase()) ||
            u.business_name?.toLowerCase().includes(search.toLowerCase());
        const matchRole =
            roleFilter === 'all' ||
            u.role === roleFilter ||
            (roleFilter === 'owner' && (u.role === 'admin' || u.role === 'owner'));
        return matchSearch && matchRole;
    });

    // Group by business
    const grouped = useMemo(() => {
        const map = new Map<string, { name: string; id: string; users: typeof filtered }>();
        filtered.forEach(u => {
            const key = u.business_id || 'unknown';
            if (!map.has(key)) {
                map.set(key, { name: u.business_name || '—', id: key, users: [] });
            }
            map.get(key)!.users.push(u);
        });
        return Array.from(map.values()).sort((a, b) => b.users.length - a.users.length);
    }, [filtered]);

    const toggleBiz = (id: string) => {
        setExpandedBiz(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const expandAll = () => {
        setExpandedBiz(new Set(grouped.map(g => g.id)));
    };

    const collapseAll = () => {
        setExpandedBiz(new Set());
    };

    const getRoleBadge = (role: string) => {
        switch (role) {
            case 'owner':
            case 'admin':
                return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 gap-1 text-[10px]"><Crown className="h-3 w-3" />Owner</Badge>;
            case 'manager':
                return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 gap-1 text-[10px]"><UserCheck className="h-3 w-3" />Manager</Badge>;
            case 'cashier':
                return <Badge className="bg-slate-100 text-slate-700 hover:bg-slate-100 gap-1 text-[10px]"><User className="h-3 w-3" />Cashier</Badge>;
            case 'salesman':
                return <Badge className="bg-green-100 text-green-700 hover:bg-green-100 gap-1 text-[10px]"><User className="h-3 w-3" />Salesman</Badge>;
            default: return <Badge variant="secondary" className="text-[10px]">{role}</Badge>;
        }
    };

    const handleDownloadUsers = () => {
        const rows = filtered.map(u => ({
            'Name': u.display_name || 'Unknown',
            'Role': u.role === 'admin' ? 'owner' : u.role,
            'Business': u.business_name,
            'Status': u.is_blocked ? 'Blocked' : 'Active',
            'Joined': u.joined_at ? format(new Date(u.joined_at), 'yyyy-MM-dd') : '—',
        }));
        const ws = XLSX.utils.json_to_sheet(rows);
        ws['!cols'] = [{ wch: 25 }, { wch: 12 }, { wch: 25 }, { wch: 10 }, { wch: 12 }];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Users');
        XLSX.writeFile(wb, `platform_users_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    };

    const roleFilterButtons = [
        { value: 'all', label: 'All', count: roleStats.all, color: 'bg-primary/10 text-primary' },
        { value: 'owner', label: 'Owners', count: roleStats.owner, color: 'bg-amber-100 text-amber-700' },
        { value: 'manager', label: 'Managers', count: roleStats.manager, color: 'bg-blue-100 text-blue-700' },
        { value: 'cashier', label: 'Cashiers', count: roleStats.cashier, color: 'bg-slate-100 text-slate-700' },
        { value: 'salesman', label: 'Salesmen', count: roleStats.salesman, color: 'bg-green-100 text-green-700' },
    ];

    return (
        <div className="space-y-4">
            {/* Role Stats Chips */}
            <div className="flex flex-wrap gap-2">
                {roleFilterButtons.map(btn => (
                    <button
                        key={btn.value}
                        onClick={() => setRoleFilter(btn.value)}
                        className={cn(
                            'inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border',
                            roleFilter === btn.value
                                ? `${btn.color} border-current shadow-sm`
                                : 'bg-card text-muted-foreground border-border hover:bg-muted/50'
                        )}
                    >
                        {btn.label}
                        <span className={cn(
                            'inline-flex items-center justify-center h-5 min-w-[20px] px-1 rounded-full text-[10px] font-bold',
                            roleFilter === btn.value ? 'bg-background/50' : 'bg-muted'
                        )}>
                            {btn.count}
                        </span>
                    </button>
                ))}
            </div>

            {/* Search + Controls */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by name or business..."
                        className="pl-9"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex rounded-lg border border-border overflow-hidden">
                        <button
                            onClick={() => setViewMode('grouped')}
                            className={cn('p-2 transition-colors', viewMode === 'grouped' ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:bg-muted')}
                            title="Grouped by business"
                        >
                            <LayoutGrid className="h-4 w-4" />
                        </button>
                        <button
                            onClick={() => setViewMode('flat')}
                            className={cn('p-2 transition-colors', viewMode === 'flat' ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:bg-muted')}
                            title="Flat list"
                        >
                            <LayoutList className="h-4 w-4" />
                        </button>
                    </div>
                    <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs" onClick={handleDownloadUsers}>
                        <Download className="h-3.5 w-3.5" />
                        Excel
                    </Button>
                </div>
            </div>

            <Card>
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-base flex items-center gap-2">
                                <Users className="h-4 w-4 text-primary" />
                                {viewMode === 'grouped' ? 'Users by Business' : 'All Users'}
                                <Badge variant="outline" className="ml-1 text-xs">{filtered.length} users</Badge>
                            </CardTitle>
                            <CardDescription>
                                {viewMode === 'grouped' ? 'Click a business to expand and see its team' : 'All platform users in a flat list'}
                            </CardDescription>
                        </div>
                        {viewMode === 'grouped' && grouped.length > 0 && (
                            <div className="flex gap-1">
                                <Button variant="ghost" size="sm" className="h-7 text-[10px]" onClick={expandAll}>Expand All</Button>
                                <Button variant="ghost" size="sm" className="h-7 text-[10px]" onClick={collapseAll}>Collapse</Button>
                            </div>
                        )}
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="p-6 space-y-3">
                            {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="text-center py-16 text-muted-foreground">
                            <Users className="h-12 w-12 mx-auto opacity-10 mb-4" />
                            <p className="font-semibold text-foreground">No users found</p>
                            <p className="text-sm mt-1">Try adjusting your search or filters.</p>
                        </div>
                    ) : viewMode === 'flat' ? (
                        /* Flat Table View */
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/40">
                                        <TableHead>Name</TableHead>
                                        <TableHead>Role</TableHead>
                                        <TableHead>Business</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Joined</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filtered.map(u => (
                                        <TableRow key={u.user_id} className={cn(u.is_blocked && 'opacity-50')}>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center shrink-0">
                                                        <User className="h-3.5 w-3.5 text-muted-foreground" />
                                                    </div>
                                                    <span className="font-semibold text-sm">{u.display_name || 'Unknown'}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>{getRoleBadge(u.role)}</TableCell>
                                            <TableCell>
                                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                    <Building2 className="h-3 w-3" />{u.business_name}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                {u.is_blocked
                                                    ? <Badge variant="destructive" className="text-[10px]">Blocked</Badge>
                                                    : <Badge className="bg-green-100 text-green-700 hover:bg-green-100 text-[10px]">Active</Badge>
                                                }
                                            </TableCell>
                                            <TableCell className="text-xs text-muted-foreground">
                                                {u.joined_at ? format(new Date(u.joined_at), 'MMM dd, yyyy') : '—'}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    ) : (
                        /* Grouped View */
                        <div className="divide-y divide-border">
                            {grouped.map((biz) => {
                                const isOpen = expandedBiz.has(biz.id);
                                const ownerCount = biz.users.filter(u => u.role === 'admin' || u.role === 'owner').length;
                                const managerCount = biz.users.filter(u => u.role === 'manager').length;
                                const cashierCount = biz.users.filter(u => u.role === 'cashier').length;
                                const salesmanCount = biz.users.filter(u => u.role === 'salesman').length;

                                return (
                                    <Collapsible key={biz.id} open={isOpen} onOpenChange={() => toggleBiz(biz.id)}>
                                        <CollapsibleTrigger asChild>
                                            <button className="w-full text-left px-4 sm:px-6 py-4 hover:bg-muted/30 transition-colors">
                                                <div className="flex items-center justify-between gap-3">
                                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                                            <Building2 className="h-5 w-5 text-primary" />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="font-bold text-sm truncate">{biz.name}</p>
                                                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                                                                <Badge variant="outline" className="text-[10px] h-5">
                                                                    {biz.users.length} user{biz.users.length !== 1 ? 's' : ''}
                                                                </Badge>
                                                                {ownerCount > 0 && (
                                                                    <span className="text-[10px] text-amber-600 font-medium">{ownerCount} owner{ownerCount > 1 ? 's' : ''}</span>
                                                                )}
                                                                {managerCount > 0 && (
                                                                    <span className="text-[10px] text-blue-600 font-medium">{managerCount} manager{managerCount > 1 ? 's' : ''}</span>
                                                                )}
                                                                {cashierCount > 0 && (
                                                                    <span className="text-[10px] text-slate-600 font-medium">{cashierCount} cashier{cashierCount > 1 ? 's' : ''}</span>
                                                                )}
                                                                {salesmanCount > 0 && (
                                                                    <span className="text-[10px] text-green-600 font-medium">{salesmanCount} salesman</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    {isOpen ? (
                                                        <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                                                    ) : (
                                                        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                                                    )}
                                                </div>
                                            </button>
                                        </CollapsibleTrigger>
                                        <CollapsibleContent>
                                            <div className="bg-muted/20 border-t border-border">
                                                {biz.users.map((u, idx) => (
                                                    <div
                                                        key={u.user_id}
                                                        className={cn(
                                                            'px-4 sm:px-6 py-3 flex items-center justify-between gap-3',
                                                            idx < biz.users.length - 1 && 'border-b border-border/50',
                                                            u.is_blocked && 'opacity-50'
                                                        )}
                                                    >
                                                        <div className="flex items-center gap-3 min-w-0 flex-1">
                                                            <div className="h-8 w-8 rounded-full bg-background border border-border flex items-center justify-center shrink-0">
                                                                <User className="h-4 w-4 text-muted-foreground" />
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="font-semibold text-sm truncate">{u.display_name || 'Unknown'}</p>
                                                                <p className="text-[10px] text-muted-foreground">
                                                                    Joined {u.joined_at ? format(new Date(u.joined_at), 'MMM dd, yyyy') : '—'}
                                                                    {u.is_blocked && <span className="text-red-500 ml-2 font-bold">BLOCKED</span>}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        {getRoleBadge(u.role)}
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
