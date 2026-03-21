import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Trash } from 'lucide-react';
import { 
  SettingsCard, ColStack, Toggle, SelectInput, T 
} from '../SettingsUI';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';

export default function StaffTab() {
  const { businessId, isAdmin, user, refreshBusinessInfo } = useAuth();
  const queryClient = useQueryClient();

  const { data: userRoles = [] } = useQuery({
    queryKey: ['allUserRoles', businessId],
    queryFn: async () => {
      let data, error;
      const res = await supabase.from('user_roles')
        .select('id, user_id, role, business_id, bill_prefix, created_at, manager_full_access')
        .eq('business_id', businessId!);

      if (res.error && res.error.code === '42703') {
        const fallbackRes = await supabase.from('user_roles')
          .select('id, user_id, role, business_id, bill_prefix, created_at')
          .eq('business_id', businessId!);
        data = fallbackRes.data;
        error = fallbackRes.error;
      } else {
        data = res.data;
        error = res.error;
      }

      if (error) throw error;
      const roles = data as any[];
      if (!roles || roles.length === 0) return [];
      const userIds = roles.map(r => r.user_id);
      const { data: profiles } = await supabase.from('profiles').select('user_id, display_name').in('user_id', userIds);
      return roles.map(role => ({ ...role, profiles: (profiles as any[])?.find(p => p.user_id === role.user_id) || null }));
    },
    enabled: isAdmin && !!businessId,
  });

  const updateManagerAccessMutation = useMutation({
    mutationFn: async ({ roleId, fullAccess }: { roleId: string; fullAccess: boolean }) => {
      const { error } = await supabase.from('user_roles').update({ manager_full_access: fullAccess } as any).eq('id', roleId);
      if (error) throw error;
    },
    onSuccess: async (_, variables) => {
      toast.success(variables.fullAccess ? 'Manager granted full access' : 'Manager full access revoked');
      queryClient.invalidateQueries({ queryKey: ['allUserRoles'] });
      if (userRoles.find((r: any) => r.id === variables.roleId)?.user_id === user?.id) await refreshBusinessInfo();
    },
    onError: (error) => toast.error('Failed to update access: ' + error.message),
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ roleId, newRole }: { roleId: string; newRole: string }) => {
      const { error } = await supabase.from('user_roles').update({ role: newRole } as any).eq('id', roleId);
      if (error) throw error;
    },
    onSuccess: async (_, variables) => {
      toast.success('Role updated successfully');
      queryClient.invalidateQueries({ queryKey: ['allUserRoles'] });
      if (userRoles.find((r: any) => r.id === variables.roleId)?.user_id === user?.id) await refreshBusinessInfo();
    },
    onError: (error) => toast.error('Failed to update role: ' + error.message),
  });

  const updatePrefixMutation = useMutation({
    mutationFn: async ({ roleId, prefix }: { roleId: string; prefix: string }) => {
      const { error } = await supabase.from('user_roles').update({ bill_prefix: prefix || null }).eq('id', roleId);
      if (error) throw error;
    },
    onSuccess: async (_, variables) => {
      toast.success('Bill prefix updated');
      queryClient.invalidateQueries({ queryKey: ['allUserRoles'] });
      if (userRoles.find((r: any) => r.id === variables.roleId)?.user_id === user?.id) await refreshBusinessInfo();
    },
    onError: (error) => toast.error('Failed to update prefix: ' + error.message),
  });

  if (!isAdmin) return <div style={{ padding: '40px', textAlign: 'center' }}>Permission Denied</div>;

  return (
    <ColStack>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        {[{ label: 'Total Users', count: userRoles.length, color: '#10b981' }, 
          { label: 'Owners', count: userRoles.filter((ur: any) => ur.role === 'owner').length, color: '#f59e0b' },
          { label: 'Managers', count: userRoles.filter((ur: any) => ur.role === 'manager').length, color: '#8b5cf6' }, 
          { label: 'Salesmen', count: userRoles.filter((ur: any) => ur.role === 'salesman').length, color: '#3b82f6' }].map(({ label, count, color }) => (
          <div key={label} style={{ background: T.color.cardBg, borderRadius: '12px', padding: '16px 20px', border: `1px solid ${T.color.border}`, borderLeft: `4px solid ${color}` }}>
            <div style={{ fontSize: '12px', color: T.color.textMuted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
            <div style={{ fontSize: '28px', fontWeight: 800, marginTop: '4px', color: T.color.textPri }}>{count}</div>
          </div>
        ))}
      </div>
      <SettingsCard title="Team Members" subtitle="Manage user access and permissions" icon="👥" accent="#3b82f6">
        {userRoles.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead><TableHead>Role & Permissions</TableHead><TableHead>Bill Prefix</TableHead><TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {userRoles.map((ur: any) => (
                <TableRow key={ur.id}>
                  <TableCell className="font-medium">{ur.profiles?.display_name || 'Unknown'}{ur.user_id === user?.id && <span className="ml-2 text-xs text-muted-foreground">(You)</span>}</TableCell>
                  <TableCell>
                    {ur.role === 'owner' ? <Badge variant="default">👑 Owner</Badge> : (
                      <div className="flex flex-col gap-2">
                        <SelectInput value={ur.role} onChange={(v) => updateRoleMutation.mutate({ roleId: ur.id, newRole: v })} options={[{ value: 'manager', label: '🔧 Manager' }, { value: 'cashier', label: '💵 Cashier' }, { value: 'salesman', label: '💼 Salesman' }]} />
                        {ur.role === 'manager' && (
                          <div className="flex items-center gap-2 mt-1">
                            <Toggle on={ur.manager_full_access || false} onChange={(v) => updateManagerAccessMutation.mutate({ roleId: ur.id, fullAccess: v })} />
                            <span className="text-xs font-semibold text-muted-foreground">Full Access</span>
                            {ur.manager_full_access && <Badge className="bg-indigo-600 text-[10px] py-0 px-1.5 ml-1">Full Permission</Badge>}
                          </div>
                        )}
                      </div>
                    )}
                  </TableCell>
                  <TableCell><Input className="w-16 h-8 text-center uppercase" placeholder="-" maxLength={2} defaultValue={ur.bill_prefix || ''} onBlur={(e) => { const v = (e.target as HTMLInputElement).value.toUpperCase(); if (v !== (ur.bill_prefix || '')) updatePrefixMutation.mutate({ roleId: ur.id, prefix: v }); }} onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }} /></TableCell>
                  <TableCell className="text-right">{ur.role !== 'owner' && ur.user_id !== user?.id && <Button variant="ghost" size="sm" className="text-destructive" onClick={async () => { if (!confirm(`Remove ${ur.profiles?.display_name || 'this user'}?`)) return; const { error } = await supabase.from('user_roles').delete().eq('id', ur.id); if (error) toast.error('Failed: ' + error.message); else { toast.success('User removed'); queryClient.invalidateQueries({ queryKey: ['allUserRoles'] }); } }}><Trash className="h-4 w-4" /></Button>}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : <p style={{ color: '#9ca3af', textAlign: 'center', padding: '20px' }}>No team members found</p>}
      </SettingsCard>
    </ColStack>
  );
}
