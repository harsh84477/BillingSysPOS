import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Search, Users, Shield, User, ChevronDown, ChevronRight, Building2, UserCheck } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

export default function UsersTab() {
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');
    const [expandedBiz, setExpandedBiz] = useState<Set<string>>(new Set());

    const { data: users = [], isLoading } = useQuery({
        queryKey: ['all-platform-users'],
        queryFn: async () => {
            const [{ data: profiles, error: pErr }, { data: roles, error: rErr }, { data: businesses, error: bErr }] = await Promise.all([
                supabase.from('profiles').select('*'),
                supabase.from('user_roles').select('*'),
                supabase.from('business_settings').select('id, business_name'),
            ]);

            if (pErr || rErr || bErr) throw pErr || rErr || bErr;

            return (profiles || []).map((p: any) => {
                const r = (roles || []).find((rr: any) => rr.user_id === p.user_id);
                const biz = (businesses || []).find((b: any) => b.id === p.business_id) || null;
                return {
                    user_id: p.user_id,
                    display_name: p.display_name,
                    role: r?.role || 'viewer',
                    joined_at: p.created_at,
                    business_name: biz?.business_name || '—',
                    business_id: biz?.id || 'unknown',
                };
            });
        },
    });

    const filtered = users.filter(u => {
        const matchSearch =
            u.display_name?.toLowerCase().includes(search.toLowerCase()) ||
            u.business_name?.toLowerCase().includes(search.toLowerCase());
        const matchRole = roleFilter === 'all' || u.role === roleFilter;
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

    const getRoleBadge = (role: string) => {
        switch (role) {
            case 'owner':
            case 'admin':
                return <Badge className="bg-violet-100 text-violet-700 hover:bg-violet-100 gap-1 text-[10px]"><Shield className="h-3 w-3" />Admin</Badge>;
            case 'manager':
            case 'staff':
                return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 gap-1 text-[10px]"><UserCheck className="h-3 w-3" />Staff</Badge>;
            case 'cashier':
            case 'viewer':
                return <Badge className="bg-slate-100 text-slate-700 hover:bg-slate-100 gap-1 text-[10px]"><User className="h-3 w-3" />Viewer</Badge>;
            default: return <Badge variant="secondary" className="text-[10px]">{role}</Badge>;
        }
    };

    const getRoleCount = (users: typeof filtered, role: string) => users.filter(u => u.role === role).length;

    return (
        <div className="space-y-4">
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
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                    <SelectTrigger className="w-full sm:w-40">
                        <SelectValue placeholder="All Roles" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Roles</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="staff">Staff</SelectItem>
                        <SelectItem value="viewer">Viewer</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                        <Users className="h-4 w-4 text-primary" />
                        Users by Business
                        <Badge variant="outline" className="ml-1 text-xs">{filtered.length} users</Badge>
                    </CardTitle>
                    <CardDescription>Click a business to expand and see its team members</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="p-6 space-y-3">
                            {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
                        </div>
                    ) : grouped.length === 0 ? (
                        <div className="text-center py-16 text-muted-foreground">
                            <Users className="h-12 w-12 mx-auto opacity-10 mb-4" />
                            <p className="font-semibold text-foreground">No users found</p>
                            <p className="text-sm mt-1">Try adjusting your search or filters.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-border">
                            {grouped.map((biz) => {
                                const isOpen = expandedBiz.has(biz.id);
                                const adminCount = getRoleCount(biz.users, 'admin');
                                const staffCount = getRoleCount(biz.users, 'staff');
                                const viewerCount = getRoleCount(biz.users, 'viewer');

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
                                                                {adminCount > 0 && (
                                                                    <span className="text-[10px] text-violet-600">{adminCount} admin{adminCount > 1 ? 's' : ''}</span>
                                                                )}
                                                                {staffCount > 0 && (
                                                                    <span className="text-[10px] text-blue-600">{staffCount} staff</span>
                                                                )}
                                                                {viewerCount > 0 && (
                                                                    <span className="text-[10px] text-slate-500">{viewerCount} viewer{viewerCount > 1 ? 's' : ''}</span>
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
                                                            idx < biz.users.length - 1 && 'border-b border-border/50'
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
