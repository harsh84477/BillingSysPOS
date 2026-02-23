import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollText, ShieldCheck, UserX, CreditCard, Settings, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const ACTION_META: Record<string, { label: string; color: string; icon: React.ElementType }> = {
    assign_subscription: { label: 'Assign Plan', color: 'bg-green-100 text-green-700', icon: CreditCard },
    extend_subscription: { label: 'Extend Plan', color: 'bg-blue-100 text-blue-700', icon: CreditCard },
    cancel_subscription: { label: 'Cancel Sub', color: 'bg-red-100 text-red-700', icon: XIcon },
    block_user: { label: 'Block User', color: 'bg-red-100 text-red-700', icon: UserX },
    unblock_user: { label: 'Unblock User', color: 'bg-green-100 text-green-700', icon: ShieldCheck },
    create_plan: { label: 'Create Plan', color: 'bg-violet-100 text-violet-700', icon: Settings },
    edit_plan: { label: 'Edit Plan', color: 'bg-orange-100 text-orange-700', icon: Settings },
    delete_business: { label: 'Delete Biz', color: 'bg-red-100 text-red-700', icon: Trash2 },
};

function XIcon(props: any) { return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>; }

export default function LogsTab() {
    const { data: logs = [], isLoading } = useQuery({
        queryKey: ['admin-logs'],
        queryFn: async () => {
            const { data, error } = await (supabase.rpc as any)('get_admin_logs');
            if (error) throw error;
            return data as any[];
        },
        refetchInterval: 30000,
    });

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                        <ScrollText className="h-4 w-4 text-primary" />
                        Admin Action Logs
                        <Badge variant="outline" className="text-xs ml-1">{logs.length}</Badge>
                    </CardTitle>
                    <CardDescription>Audit trail of all super-admin operations. Auto-refreshes every 30s.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="py-12 text-center text-sm text-muted-foreground">Loading logs...</div>
                    ) : logs.length === 0 ? (
                        <div className="py-16 text-center space-y-2 text-muted-foreground">
                            <ScrollText className="h-10 w-10 mx-auto opacity-20" />
                            <p className="text-sm">No admin actions logged yet.</p>
                            <p className="text-xs">Actions like assigning plans, blocking users, and editing plans will appear here.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/40">
                                        <TableHead>Timestamp</TableHead>
                                        <TableHead>Action</TableHead>
                                        <TableHead>Target Type</TableHead>
                                        <TableHead>Target ID</TableHead>
                                        <TableHead>Details</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {logs.map((log) => {
                                        const meta = ACTION_META[log.action] || { label: log.action, color: 'bg-gray-100 text-gray-700', icon: ScrollText };
                                        const Icon = meta.icon;
                                        return (
                                            <TableRow key={log.id}>
                                                <TableCell className="text-xs text-muted-foreground font-mono whitespace-nowrap">
                                                    {format(new Date(log.created_at), 'MMM dd, HH:mm:ss')}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge className={cn('text-[10px] gap-1 font-semibold', meta.color)}>
                                                        <Icon className="h-3 w-3" />
                                                        {meta.label}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-xs capitalize text-muted-foreground">
                                                    {log.target_type || '—'}
                                                </TableCell>
                                                <TableCell className="text-xs font-mono text-muted-foreground">
                                                    {log.target_id ? `${log.target_id.slice(0, 12)}...` : '—'}
                                                </TableCell>
                                                <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                                                    {log.details && Object.keys(log.details).length > 0
                                                        ? JSON.stringify(log.details)
                                                        : '—'}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
