import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Users, ShieldAlert, Shield, User } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function UsersTab() {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');

    const { data: users = [], isLoading } = useQuery({
        queryKey: ['all-platform-users'],
        queryFn: async () => {
            const { data, error } = await (supabase.rpc as any)('get_all_platform_users');
            if (error) throw error;
            return data as any[];
        },
    });

    const blockMutation = useMutation({
        mutationFn: async ({ userId, block }: { userId: string; block: boolean }) => {
            const fn = block ? 'block_user' : 'unblock_user';
            const { error } = await (supabase.rpc as any)(fn, { p_user_id: userId });
            if (error) throw error;
            // Log the action
            await (supabase.rpc as any)('log_admin_action', {
                p_admin_id: user?.id || 'super-admin',
                p_action: block ? 'block_user' : 'unblock_user',
                p_target_id: userId,
                p_target_type: 'user',
                p_details: {},
            });
        },
        onSuccess: (_, vars) => {
            toast.success(vars.block ? 'User blocked' : 'User unblocked');
            queryClient.invalidateQueries({ queryKey: ['all-platform-users'] });
        },
        onError: (err: any) => toast.error(err.message),
    });

    const filtered = users.filter(u => {
        const matchSearch =
            u.display_name?.toLowerCase().includes(search.toLowerCase()) ||
            u.business_name?.toLowerCase().includes(search.toLowerCase());
        const matchRole = roleFilter === 'all' || u.role === roleFilter;
        return matchSearch && matchRole;
    });

    const getRoleBadge = (role: string) => {
        switch (role) {
            case 'admin': return <Badge className="bg-violet-100 text-violet-700 hover:bg-violet-100 gap-1"><Shield className="h-3 w-3" />Admin</Badge>;
            case 'manager': return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 gap-1"><Users className="h-3 w-3" />Manager</Badge>;
            case 'cashier': return <Badge className="bg-slate-100 text-slate-700 hover:bg-slate-100 gap-1"><User className="h-3 w-3" />Cashier</Badge>;
            default: return <Badge variant="secondary">{role}</Badge>;
        }
    };

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
                        <SelectItem value="manager">Manager</SelectItem>
                        <SelectItem value="cashier">Cashier</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base">
                        Platform Users
                        <Badge variant="outline" className="ml-2 text-xs">{filtered.length}</Badge>
                    </CardTitle>
                    <CardDescription>Manage users across all registered businesses</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="flex justify-center py-12 text-muted-foreground text-sm">Loading users...</div>
                    ) : (
                        <div className="rounded-b-lg overflow-hidden">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/40">
                                        <TableHead>User</TableHead>
                                        <TableHead>Business</TableHead>
                                        <TableHead>Role</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Joined</TableHead>
                                        <TableHead className="text-right">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filtered.map((u) => (
                                        <TableRow key={`${u.user_id}-${u.business_id}`} className={cn(u.is_blocked && 'opacity-50')}>
                                            <TableCell>
                                                <div>
                                                    <p className="font-semibold text-sm">{u.display_name || 'Unknown'}</p>
                                                    <p className="text-[10px] text-muted-foreground font-mono">{u.user_id?.slice(0, 12)}...</p>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-sm">{u.business_name}</TableCell>
                                            <TableCell>{getRoleBadge(u.role)}</TableCell>
                                            <TableCell>
                                                {u.is_blocked ? (
                                                    <Badge className="bg-red-100 text-red-700 hover:bg-red-100 gap-1">
                                                        <ShieldAlert className="h-3 w-3" />Blocked
                                                    </Badge>
                                                ) : (
                                                    <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Active</Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-xs text-muted-foreground">
                                                {u.joined_at ? format(new Date(u.joined_at), 'MMM dd, yyyy') : '—'}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    size="sm"
                                                    variant={u.is_blocked ? 'outline' : 'destructive'}
                                                    className="h-7 text-xs"
                                                    disabled={blockMutation.isPending}
                                                    onClick={() => blockMutation.mutate({ userId: u.user_id, block: !u.is_blocked })}
                                                >
                                                    {u.is_blocked ? 'Unblock' : 'Block'}
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {filtered.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                                                No users found.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
