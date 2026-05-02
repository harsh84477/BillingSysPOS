import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import * as RechartsPrimitive from 'recharts';
import { ChartContainer } from '@/components/ui/chart';
import {
  Shield, Search, Crown, UserCheck, User, Users,
  ShieldCheck, Download, ChevronDown, Building2
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';

const ROLE_CONFIG: Record<string, { label: string; color: string; bgColor: string; icon: React.ElementType }> = {
  owner: { label: 'Owner', color: 'text-amber-700', bgColor: 'bg-amber-100', icon: Crown },
  admin: { label: 'Owner', color: 'text-amber-700', bgColor: 'bg-amber-100', icon: Crown },
  manager: { label: 'Manager', color: 'text-blue-700', bgColor: 'bg-blue-100', icon: UserCheck },
  cashier: { label: 'Cashier', color: 'text-slate-700', bgColor: 'bg-slate-100', icon: User },
  salesman: { label: 'Salesman', color: 'text-green-700', bgColor: 'bg-green-100', icon: User },
};

const PERMISSION_MATRIX = [
  { feature: 'Dashboard Access', owner: true, manager: true, cashier: false, salesman: false },
  { feature: 'Create Bills', owner: true, manager: true, cashier: true, salesman: true },
  { feature: 'View All Bills', owner: true, manager: true, cashier: false, salesman: false },
  { feature: 'Manage Products', owner: true, manager: true, cashier: false, salesman: false },
  { feature: 'Manage Categories', owner: true, manager: true, cashier: false, salesman: false },
  { feature: 'Manage Customers', owner: true, manager: true, cashier: false, salesman: false },
  { feature: 'View Reports', owner: true, manager: true, cashier: false, salesman: false },
  { feature: 'Manage Expenses', owner: true, manager: true, cashier: false, salesman: false },
  { feature: 'Business Settings', owner: true, manager: false, cashier: false, salesman: false },
  { feature: 'Manage Team', owner: true, manager: false, cashier: false, salesman: false },
  { feature: 'Subscription Management', owner: true, manager: false, cashier: false, salesman: false },
  { feature: 'Activity Logs', owner: true, manager: true, cashier: false, salesman: false },
  { feature: 'Purchases & Suppliers', owner: true, manager: true, cashier: false, salesman: false },
  { feature: 'Salesman Dashboard', owner: false, manager: false, cashier: false, salesman: true },
  { feature: 'Store Management', owner: false, manager: false, cashier: false, salesman: true },
];

const PIE_COLORS = ['#f59e0b', '#3b82f6', '#64748b', '#22c55e'];

export default function RolesTab() {
  const { customAdminId } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [activeView, setActiveView] = useState<'users' | 'matrix'>('users');

  const { data: usersData = [], isLoading } = useQuery({
    queryKey: ['roles-all-users'],
    queryFn: async () => {
      const [{ data: profiles }, { data: roles }, { data: businesses }] = await Promise.all([
        supabase.from('profiles').select('*'),
        supabase.from('user_roles').select('*'),
        supabase.from('business_settings').select('id, business_name, business_id'),
      ]);

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
          display_name: p.display_name || 'Unknown',
          role: r?.role || 'viewer',
          role_id: r?.id,
          business_name: biz?.business_name || '—',
          business_id: p.business_id,
          joined_at: p.created_at,
          manager_full_access: (r as any)?.manager_full_access || false,
        };
      });
    },
  });

  const changeRoleMutation = useMutation({
    mutationFn: async ({ userId, roleId, newRole }: { userId: string; roleId: string; newRole: string }) => {
      const { error } = await supabase
        .from('user_roles')
        .update({ role: newRole as any })
        .eq('id', roleId);
      if (error) throw error;
      await (supabase.rpc as any)('log_admin_action', {
        p_admin_id: customAdminId || 'unknown',
        p_action: 'change_user_role',
        p_target_id: userId,
        p_target_type: 'user',
        p_details: { new_role: newRole },
      });
    },
    onSuccess: () => {
      toast.success('Role updated successfully');
      queryClient.invalidateQueries({ queryKey: ['roles-all-users'] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const roleStats = useMemo(() => {
    const stats = { owner: 0, manager: 0, cashier: 0, salesman: 0, total: usersData.length };
    usersData.forEach(u => {
      if (u.role === 'owner' || u.role === 'admin') stats.owner++;
      else if (u.role === 'manager') stats.manager++;
      else if (u.role === 'cashier') stats.cashier++;
      else if (u.role === 'salesman') stats.salesman++;
    });
    return stats;
  }, [usersData]);

  const pieData = [
    { name: 'Owners', value: roleStats.owner, fill: PIE_COLORS[0] },
    { name: 'Managers', value: roleStats.manager, fill: PIE_COLORS[1] },
    { name: 'Cashiers', value: roleStats.cashier, fill: PIE_COLORS[2] },
    { name: 'Salesmen', value: roleStats.salesman, fill: PIE_COLORS[3] },
  ].filter(d => d.value > 0);

  const filtered = useMemo(() => {
    return usersData.filter(u => {
      const matchSearch = !search || u.display_name.toLowerCase().includes(search.toLowerCase()) || u.business_name?.toLowerCase().includes(search.toLowerCase());
      const matchRole = roleFilter === 'all' || u.role === roleFilter || (roleFilter === 'owner' && u.role === 'admin');
      return matchSearch && matchRole;
    });
  }, [usersData, search, roleFilter]);

  const handleExport = () => {
    const rows = filtered.map(u => ({
      'Name': u.display_name,
      'Role': u.role === 'admin' ? 'owner' : u.role,
      'Business': u.business_name,
      'Full Access': u.manager_full_access ? 'Yes' : 'No',
      'Joined': u.joined_at ? format(new Date(u.joined_at), 'yyyy-MM-dd') : '',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [{ wch: 25 }, { wch: 12 }, { wch: 25 }, { wch: 12 }, { wch: 12 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Roles');
    XLSX.writeFile(wb, `roles_permissions_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    toast.success('Exported');
  };

  const getRoleBadge = (role: string) => {
    const config = ROLE_CONFIG[role] || { label: role, color: 'text-slate-500', bgColor: 'bg-slate-100', icon: User };
    const Icon = config.icon;
    return (
      <Badge className={cn('text-[10px] gap-1 font-semibold', config.bgColor, config.color, `hover:${config.bgColor}`)}>
        <Icon className="h-3 w-3" />{config.label}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Roles & Permissions</h2>
          <p className="text-sm text-muted-foreground mt-1">Manage user roles and view permission assignments across the platform.</p>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5 self-start" onClick={handleExport}>
          <Download className="h-3.5 w-3.5" />Export
        </Button>
      </div>

      {/* Role Distribution */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className="xl:col-span-8 grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Owners', value: roleStats.owner, icon: Crown, color: 'text-amber-600 bg-amber-500/10', pct: ((roleStats.owner / Math.max(roleStats.total, 1)) * 100).toFixed(0) },
            { label: 'Managers', value: roleStats.manager, icon: UserCheck, color: 'text-blue-600 bg-blue-500/10', pct: ((roleStats.manager / Math.max(roleStats.total, 1)) * 100).toFixed(0) },
            { label: 'Cashiers', value: roleStats.cashier, icon: User, color: 'text-slate-600 bg-slate-500/10', pct: ((roleStats.cashier / Math.max(roleStats.total, 1)) * 100).toFixed(0) },
            { label: 'Salesmen', value: roleStats.salesman, icon: User, color: 'text-green-600 bg-green-500/10', pct: ((roleStats.salesman / Math.max(roleStats.total, 1)) * 100).toFixed(0) },
          ].map(item => (
            <Card key={item.label} className="border-slate-200/70 shadow-sm">
              <CardContent className="pt-5 pb-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">{item.label}</p>
                    <p className="text-2xl font-bold tracking-tight mt-1">{item.value}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">{item.pct}% of total</p>
                  </div>
                  <div className={cn('h-10 w-10 rounded-xl flex items-center justify-center', item.color)}>
                    <item.icon className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <Card className="xl:col-span-4 border-slate-200/70 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold">Role Mix</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-44">
              <ChartContainer config={Object.fromEntries(pieData.map(p => [p.name, { label: p.name, color: p.fill }]))}>
                <RechartsPrimitive.PieChart>
                  <RechartsPrimitive.Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={4} strokeWidth={0}>
                    {pieData.map((entry, i) => (
                      <RechartsPrimitive.Cell key={i} fill={entry.fill} />
                    ))}
                  </RechartsPrimitive.Pie>
                  <RechartsPrimitive.Tooltip formatter={(v: number, n: string) => [`${v} users`, n]} />
                </RechartsPrimitive.PieChart>
              </ChartContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tab Toggle */}
      <div className="flex gap-2 border-b border-border pb-1">
        <button onClick={() => setActiveView('users')} className={cn('px-4 py-2 text-sm font-medium rounded-t-lg transition-colors', activeView === 'users' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}>
          <Users className="h-4 w-4 inline mr-2" />User Roles
        </button>
        <button onClick={() => setActiveView('matrix')} className={cn('px-4 py-2 text-sm font-medium rounded-t-lg transition-colors', activeView === 'matrix' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}>
          <Shield className="h-4 w-4 inline mr-2" />Permission Matrix
        </button>
      </div>

      {activeView === 'users' ? (
        <>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by name or business..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="owner">Owner</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="cashier">Cashier</SelectItem>
                <SelectItem value="salesman">Salesman</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Users Table */}
          <Card className="border-slate-200/70 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                User Roles
                <Badge variant="outline" className="text-xs ml-1">{filtered.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-6 space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-14 w-full" />)}</div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto opacity-10 mb-4" />
                  <p className="font-semibold text-foreground">No users found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40">
                        <TableHead>User</TableHead>
                        <TableHead>Business</TableHead>
                        <TableHead>Current Role</TableHead>
                        <TableHead>Change Role</TableHead>
                        <TableHead>Joined</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map(u => (
                        <TableRow key={u.user_id} className="hover:bg-muted/30">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                                <User className="h-4 w-4 text-muted-foreground" />
                              </div>
                              <div>
                                <p className="font-semibold text-sm">{u.display_name}</p>
                                {u.manager_full_access && <Badge className="bg-violet-100 text-violet-700 hover:bg-violet-100 text-[9px] mt-0.5">Full Access</Badge>}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Building2 className="h-3 w-3" />{u.business_name}
                            </span>
                          </TableCell>
                          <TableCell>{getRoleBadge(u.role)}</TableCell>
                          <TableCell>
                            {u.role_id ? (
                              <Select
                                value={u.role === 'admin' ? 'owner' : u.role}
                                onValueChange={(val) => changeRoleMutation.mutate({ userId: u.user_id, roleId: u.role_id!, newRole: val })}
                              >
                                <SelectTrigger className="h-8 w-32 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="owner">Owner</SelectItem>
                                  <SelectItem value="manager">Manager</SelectItem>
                                  <SelectItem value="cashier">Cashier</SelectItem>
                                  <SelectItem value="salesman">Salesman</SelectItem>
                                </SelectContent>
                              </Select>
                            ) : (
                              <span className="text-xs text-muted-foreground">No role record</span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {u.joined_at ? format(new Date(u.joined_at), 'MMM dd, yyyy') : '—'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      ) : (
        /* Permission Matrix */
        <Card className="border-slate-200/70 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />Permission Matrix
            </CardTitle>
            <CardDescription>What each role can do in the platform</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="min-w-[200px]">Feature</TableHead>
                    <TableHead className="text-center">
                      <div className="flex flex-col items-center gap-1">
                        <Crown className="h-3.5 w-3.5 text-amber-600" />
                        <span className="text-[10px]">Owner</span>
                      </div>
                    </TableHead>
                    <TableHead className="text-center">
                      <div className="flex flex-col items-center gap-1">
                        <UserCheck className="h-3.5 w-3.5 text-blue-600" />
                        <span className="text-[10px]">Manager</span>
                      </div>
                    </TableHead>
                    <TableHead className="text-center">
                      <div className="flex flex-col items-center gap-1">
                        <User className="h-3.5 w-3.5 text-slate-600" />
                        <span className="text-[10px]">Cashier</span>
                      </div>
                    </TableHead>
                    <TableHead className="text-center">
                      <div className="flex flex-col items-center gap-1">
                        <User className="h-3.5 w-3.5 text-green-600" />
                        <span className="text-[10px]">Salesman</span>
                      </div>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {PERMISSION_MATRIX.map((perm, i) => (
                    <TableRow key={i} className="hover:bg-muted/30">
                      <TableCell className="font-medium text-sm">{perm.feature}</TableCell>
                      {(['owner', 'manager', 'cashier', 'salesman'] as const).map(role => (
                        <TableCell key={role} className="text-center">
                          {perm[role] ? (
                            <ShieldCheck className="h-4 w-4 text-emerald-500 mx-auto" />
                          ) : (
                            <span className="h-4 w-4 block mx-auto text-slate-300">—</span>
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
