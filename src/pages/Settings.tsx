import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme, ThemeName, themes } from '@/contexts/ThemeContext';
import { useBusinessSettings, useUpdateBusinessSettings } from '@/hooks/useBusinessSettings';
import { toast } from 'sonner';
import { RandomSeeder } from '@/components/RandomSeeder';
import SubscriptionManagement from '@/components/settings/SubscriptionManagement';
import InvoicesTab from '@/components/settings/InvoicesTab';
import {
  SettingsCard, Toggle, Counter, SettingRow, SectionLabel, TextInput, TextArea,
  FieldLabel, ButtonGroup, SelectInput, SaveBtn, InfoBox, TabBar, TwoColGrid,
  ColStack, ComingSoon, T, op,
} from '@/components/settings/SettingsUI';

/* ─── shadcn that we still need for dialogs/tables ─── */
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, RefreshCw, Copy, Check, Trash } from 'lucide-react';
import { cn } from '@/lib/utils';

const themeOptions: { name: string; value: ThemeName; description: string; color: string; bg: string; border: string; isDark?: boolean }[] = [
  { name: 'Mint Pro', value: 'mint-pro', description: 'Fresh green tones for a modern look', color: '#10b981', bg: '#ecfdf5', border: '#6ee7b7' },
  { name: 'Sunset Orange', value: 'sunset-orange', description: 'Warm orange for energetic vibes', color: '#f97316', bg: '#fff7ed', border: '#fdba74' },
  { name: 'Royal Purple', value: 'royal-purple', description: 'Elegant purple for premium feel', color: '#8b5cf6', bg: '#f5f3ff', border: '#c4b5fd' },
  { name: 'Ocean Blue', value: 'ocean-blue', description: 'Calm blue for professional use', color: '#3b82f6', bg: '#eff6ff', border: '#93c5fd' },
  { name: 'Rose Gold', value: 'rose-gold', description: 'Warm pink tones for a luxurious feel', color: '#e11d48', bg: '#fff1f2', border: '#fda4af' },
  { name: 'Slate Modern', value: 'slate-modern', description: 'Minimal neutral tones for clean design', color: '#475569', bg: '#f1f5f9', border: '#94a3b8' },
  { name: 'Forest Deep', value: 'forest-deep', description: 'Rich deep greens for natural vibes', color: '#16a34a', bg: '#f0fdf4', border: '#86efac' },
  { name: 'Dark Pro', value: 'dark-pro', description: 'Sleek dark mode for low-light', color: '#3b82f6', bg: '#0f172a', border: '#334155', isDark: true },
  { name: 'Cyber Neon', value: 'cyber-neon', description: 'Neon green on dark for tech vibes', color: '#00e69d', bg: '#0a0f1a', border: '#1e3a3a', isDark: true },
  { name: 'Midnight Blue', value: 'midnight-blue', description: 'Deep blue dark mode for night use', color: '#60a5fa', bg: '#0c1222', border: '#1e3050', isDark: true },
];

const TABS = [
  { id: 'business', label: 'Business', icon: '🏢' },
  { id: 'billing', label: 'Billing', icon: '💳' },
  { id: 'categories', label: 'Categories', icon: '📁' },
  { id: 'staff', label: 'Staff', icon: '👥' },
  { id: 'invoices', label: 'Invoices', icon: '🧾' },
  { id: 'pos', label: 'POS', icon: '🖥️' },
  { id: 'appearance', label: 'Appearance', icon: '🎨' },
];

export default function Settings() {
  const { isAdmin, isManager, user, businessInfo, refreshBusinessInfo, businessId } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const { theme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'business');

  useEffect(() => { const tab = searchParams.get('tab'); if (tab && tab !== activeTab) setActiveTab(tab); }, [searchParams]);
  const handleTabChange = (value: string) => { setActiveTab(value); setSearchParams({ tab: value }); };

  const { data: settings, isLoading } = useBusinessSettings();
  const updateSettings = useUpdateBusinessSettings();
  const queryClient = useQueryClient();
  const u = (v: any) => isAdmin && updateSettings.mutate(v);

  /* ─── Prefix mutation ─── */
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

  /* ─── Categories ─── */
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const { data: categories = [] } = useQuery({
    queryKey: ['categories', businessId],
    queryFn: async () => {
      let query = supabase.from('categories').select('*');
      if (businessId) query = query.eq('business_id', businessId);
      const { data, error } = await query.order('sort_order');
      if (error) throw error; return data;
    },
    enabled: !!businessId,
  });

  /* ─── User Roles ─── */
  const { data: userRoles = [] } = useQuery({
    queryKey: ['allUserRoles', businessId],
    queryFn: async () => {
      const { data: roles, error } = await supabase.from('user_roles').select('id, user_id, role, business_id, bill_prefix, created_at').eq('business_id', businessId!);
      if (error) throw error;
      if (!roles || roles.length === 0) return [];
      const userIds = (roles as any[]).map(r => r.user_id);
      const { data: profiles } = await supabase.from('profiles').select('user_id, display_name').in('user_id', userIds);
      return (roles as any[]).map(role => ({ ...role, profiles: (profiles as any[])?.find(p => p.user_id === role.user_id) || null }));
    },
    enabled: isAdmin && !!businessId,
  });

  /* ─── Mutations ─── */
  const saveCategoryMutation = useMutation({
    mutationFn: async (category: { name: string; color: string; icon: string }) => {
      if (editingCategory) { const { error } = await supabase.from('categories').update(category).eq('id', editingCategory.id); if (error) throw error; }
      else { const { error } = await supabase.from('categories').insert({ ...category, business_id: businessId }); if (error) throw error; }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['categories'] }); setCategoryDialogOpen(false); setEditingCategory(null); toast.success(editingCategory ? 'Category updated' : 'Category created'); },
    onError: (error: Error) => toast.error(error.message),
  });
  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from('categories').delete().eq('id', id); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['categories'] }); toast.success('Category deleted'); },
    onError: (error: Error) => toast.error(error.message),
  });

  const handleBusinessSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); const fd = new FormData(e.currentTarget);
    updateSettings.mutate({ business_name: fd.get('business_name') as string, address: fd.get('address') as string, phone: fd.get('phone') as string, email: fd.get('email') as string });
  };
  const handleBillingSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); const fd = new FormData(e.currentTarget);
    updateSettings.mutate({ bill_prefix: fd.get('bill_prefix') as string, currency: fd.get('currency') as string, currency_symbol: fd.get('currency_symbol') as string });
  };
  const handleTaxSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); const fd = new FormData(e.currentTarget);
    updateSettings.mutate({ tax_rate: Number(fd.get('tax_rate')) });
  };
  const handleCategorySubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); const fd = new FormData(e.currentTarget);
    saveCategoryMutation.mutate({ name: fd.get('name') as string, color: fd.get('color') as string, icon: fd.get('icon') as string || 'Package' });
  };

  if (isLoading) return <div style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>Loading settings...</div>;

  const visibleTabs = isAdmin ? TABS : TABS.filter(t => t.id !== 'staff');

  return (
    <div className="space-y-6 font-sans">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">Manage your business configuration</p>
        </div>
      </div>

      <div className="w-full pb-2 -mx-2 px-2 sm:mx-0 sm:px-0 scrollbar-hide">
        <TabBar tabs={visibleTabs} active={activeTab} onSelect={handleTabChange} />
      </div>

      {/* Content */}
      <div className="pb-10">
        <div className="max-w-[1100px] mx-auto">

          {/* ═══ BUSINESS ═══ */}
          {activeTab === 'business' && (
            <ColStack>
              <SettingsCard title="Business Information" subtitle="Your business details that appear on invoices" icon="🏢" accent="#10b981">
                <form onSubmit={handleBusinessSubmit}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                    <div><FieldLabel htmlFor="business_name">Business Name</FieldLabel><TextInput id="business_name" name="business_name" defaultValue={settings?.business_name} disabled={!isAdmin} /></div>
                    <div><FieldLabel htmlFor="email">Email</FieldLabel><TextInput id="email" name="email" type="email" defaultValue={settings?.email || ''} disabled={!isAdmin} /></div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                    <div><FieldLabel htmlFor="phone">Phone</FieldLabel><TextInput id="phone" name="phone" defaultValue={settings?.phone || ''} disabled={!isAdmin} /></div>
                    <div><FieldLabel htmlFor="gst_number">GST Number</FieldLabel><TextInput id="gst_number" placeholder="e.g. 22AAAAA0000A1Z5" defaultValue={settings?.gst_number || ''} onBlur={(e) => u({ gst_number: e.target.value })} disabled={!isAdmin} /></div>
                  </div>
                  <div style={{ marginBottom: '14px' }}>
                    <FieldLabel htmlFor="address">Address</FieldLabel>
                    <TextArea id="address" name="address" defaultValue={settings?.address || ''} disabled={!isAdmin} rows={2} />
                  </div>
                  {isAdmin && <SaveBtn label="Save Changes" />}
                </form>
              </SettingsCard>

              {isAdmin && businessInfo && (
                <SettingsCard title="Team Join Code" subtitle="Share this code with your team to let them join" icon="🔑" accent="#8b5cf6">
                  <div style={{ border: `2px dashed ${op('#8b5cf6', 40)}`, borderRadius: '12px', background: op('#8b5cf6', 8), padding: '28px', textAlign: 'center', marginBottom: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '32px', fontFamily: 'monospace', fontWeight: 800, letterSpacing: '0.3em', color: '#8b5cf6' }}>{businessInfo.join_code}</span>
                      <button onClick={async () => { await navigator.clipboard.writeText(businessInfo.join_code); setCopied(true); toast.success('Code copied!'); setTimeout(() => setCopied(false), 2000); }}
                        style={{ width: '36px', height: '36px', border: `1px solid ${T.color.border}`, borderRadius: '8px', background: T.color.cardBg, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4 text-muted-foreground" />}
                      </button>
                    </div>
                    <p style={{ fontSize: '11px', color: '#9ca3af', marginTop: '8px' }}>Max 8 members per business</p>
                  </div>
                  <button onClick={async () => {
                    if (!confirm('Regenerating the code will make the old code invalid. Continue?')) return;
                    setRegenerating(true);
                    try { const { data, error } = await supabase.rpc('regenerate_join_code', { _user_id: user!.id }); if (error) throw error; const result = data as any; if (result.success) { toast.success('Join code regenerated!'); await refreshBusinessInfo(); } else toast.error(result.error); } catch (err: any) { toast.error(err.message); } finally { setRegenerating(false); }
                  }} disabled={regenerating}
                    style={{ width: '100%', padding: '10px', border: `1px solid ${T.color.border}`, borderRadius: '8px', background: T.color.cardBg, color: T.color.textPri, cursor: 'pointer', fontFamily: T.font, fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <RefreshCw className={`h-4 w-4 ${regenerating ? 'animate-spin' : ''}`} /> Regenerate Code
                  </button>
                </SettingsCard>
              )}
            </ColStack>
          )}

          {/* ═══ BILLING ═══ */}
          {activeTab === 'billing' && (
            <ColStack>
              <TwoColGrid>
                <SettingsCard title="Billing Rules" subtitle="Configure your business billing defaults" icon="📋" accent="#10b981">
                  <form onSubmit={handleBillingSubmit}>
                    <div style={{ marginBottom: '14px' }}><FieldLabel htmlFor="bill_prefix">Business Bill Prefix</FieldLabel><TextInput id="bill_prefix" name="bill_prefix" defaultValue={settings?.bill_prefix} hint="This prefix identifies your business on all bills." disabled={!isAdmin} /></div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                      <div><FieldLabel htmlFor="currency">Currency Code</FieldLabel><TextInput id="currency" name="currency" defaultValue={settings?.currency} disabled={!isAdmin} /></div>
                      <div><FieldLabel htmlFor="currency_symbol">Symbol</FieldLabel><TextInput id="currency_symbol" name="currency_symbol" defaultValue={settings?.currency_symbol} disabled={!isAdmin} /></div>
                    </div>
                    {isAdmin && <SaveBtn label="Save Changes" />}
                  </form>
                </SettingsCard>
                <SettingsCard title="Personal Settings" subtitle="Settings specific to your account" icon="👤" accent="#8b5cf6">
                  <div style={{ marginBottom: '14px' }}><FieldLabel htmlFor="my_bill_prefix">Personal Collector Code</FieldLabel>
                    <TextInput id="my_bill_prefix" defaultValue={userRoles.find((r: any) => r.user_id === user?.id)?.bill_prefix || ''} placeholder="e.g. UK" hint="Identifies you as the collector on bills."
                      style={{ width: '80px', textTransform: 'uppercase', textAlign: 'center', fontFamily: 'monospace', fontWeight: 700 }}
                      onBlur={async (e) => { const val = (e.target as HTMLInputElement).value.toUpperCase(); try { const { error } = await supabase.rpc('update_my_bill_prefix', { _prefix: val }); if (error) throw error; toast.success('Your personal code updated!'); await refreshBusinessInfo(); queryClient.invalidateQueries({ queryKey: ['allUserRoles'] }); } catch (err: any) { toast.error('Failed: ' + err.message); } }} /></div>
                  <InfoBox bg={op('#8b5cf6', 10)} border={`1px solid ${op('#8b5cf6', 30)}`} icon="📌" title="Bill Format Preview" titleColor="#8b5cf6" value={`${settings?.bill_prefix || 'INV'} — CODE — 2024-01 — 001`} valueColor={T.color.textPri} />
                </SettingsCard>
              </TwoColGrid>

              <SettingsCard title="GST Configuration" subtitle="Tax settings for your business" icon="🧾" accent="#f97316">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <div>
                    <form onSubmit={handleTaxSubmit}>
                      <SettingRow label="GST Percentage (%)" desc="Default tax rate for new items"
                        right={<TextInput id="tax_rate" name="tax_rate" type="number" defaultValue={String(settings?.tax_rate ?? 0)} disabled={!isAdmin} style={{ width: '80px', textAlign: 'right', fontWeight: 700 }} />} />
                      {isAdmin && <SaveBtn label="Update GST Rate" color="#f97316" />}
                    </form>
                  </div>
                  <div>
                    <SettingRow label="Show GST in Billing" desc="Display GST toggle and calculation in billing screen" noBorder
                      right={<Toggle on={settings?.show_gst_in_billing ?? true} onChange={(v) => u({ show_gst_in_billing: v })} disabled={!isAdmin} />} />
                  </div>
                </div>
              </SettingsCard>

              <TwoColGrid>
                <SettingsCard title="Billing Display Options" subtitle="Control which fields are visible" icon="👁️" accent="#3b82f6">
                  <SettingRow label="Show Discount in Billing" desc="Display discount input field" noBorder
                    right={<Toggle on={settings?.show_discount_in_billing ?? true} onChange={(v) => u({ show_discount_in_billing: v })} disabled={!isAdmin} />} />
                </SettingsCard>
                <SettingsCard title="Product Display Settings" subtitle="Control how products appear on billing screen" icon="🖥️" accent="#10b981">
                  <SettingRow label="Product Button Size" desc="Card height and padding"
                    right={<SelectInput options={[{ value: 'small', label: 'Small' }, { value: 'medium', label: 'Medium' }, { value: 'large', label: 'Large' }, { value: 'xlarge', label: 'Extra Large' }]} value={settings?.product_button_size ?? 'medium'} onChange={(v) => u({ product_button_size: v })} disabled={!isAdmin} />} />
                  <SettingRow label="Number of Columns" desc="Desktop grid columns (2–8)"
                    right={<Counter value={settings?.product_columns ?? 5} min={2} max={8} onChange={(v) => u({ product_columns: v })} disabled={!isAdmin} />} />
                  <SettingRow label="Grid Gap" desc={`Spacing between cards (${settings?.grid_gap ?? 8}px)`}
                    right={<Counter value={settings?.grid_gap ?? 8} min={4} max={30} onChange={(v) => u({ grid_gap: v })} disabled={!isAdmin} />} />
                  <SectionLabel text="Visibility Toggles" />
                  <SettingRow label="Show Stock Badge" desc="Display quantity badge" right={<Toggle on={settings?.show_stock_badge ?? true} onChange={(v) => u({ show_stock_badge: v })} disabled={!isAdmin} />} />
                  <SettingRow label="Show Product Code" desc="Show product SKU/code" right={<Toggle on={settings?.show_product_code ?? false} onChange={(v) => u({ show_product_code: v })} disabled={!isAdmin} />} />
                  {isAdmin && <SettingRow label="Show Cost Price (Admin)" desc="Display cost price on cards" right={<Toggle on={settings?.show_cost_price ?? false} onChange={(v) => u({ show_cost_price: v })} disabled={!isAdmin} />} />}
                  <SettingRow label="Auto Fit to Screen Height" desc="Adjust card size to fill grid height" noBorder right={<Toggle on={settings?.auto_fit_enabled ?? false} onChange={(v) => u({ auto_fit_enabled: v })} disabled={!isAdmin} />} />
                </SettingsCard>
              </TwoColGrid>
            </ColStack>
          )}

          {/* ═══ INVOICES ═══ */}
          {activeTab === 'invoices' && <InvoicesTab />}

          {/* ═══ CATEGORIES ═══ */}
          {activeTab === 'categories' && (
            <ColStack>
              {isAdmin && <RandomSeeder />}
              <SettingsCard title="Product Categories" subtitle="Organize your products into categories" icon="📁" accent="#10b981"
                footer={isAdmin ? (
                  <Dialog open={categoryDialogOpen} onOpenChange={(open) => { setCategoryDialogOpen(open); if (!open) setEditingCategory(null); }}>
                    <DialogTrigger asChild><Button size="sm"><Plus className="mr-2 h-4 w-4" /> Add Category</Button></DialogTrigger>
                    <DialogContent>
                      <DialogHeader><DialogTitle>{editingCategory ? 'Edit Category' : 'Add Category'}</DialogTitle></DialogHeader>
                      <form onSubmit={handleCategorySubmit} className="space-y-4">
                        <div className="space-y-2"><Label htmlFor="cat_name">Name</Label><Input id="cat_name" name="name" defaultValue={editingCategory?.name} required /></div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2"><Label htmlFor="cat_color">Color</Label><Input id="cat_color" name="color" type="color" defaultValue={editingCategory?.color || '#3B82F6'} /></div>
                          <div className="space-y-2"><Label htmlFor="cat_icon">Icon</Label><Input id="cat_icon" name="icon" defaultValue={editingCategory?.icon || 'Package'} placeholder="Lucide icon name" /></div>
                        </div>
                        <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setCategoryDialogOpen(false)}>Cancel</Button><Button type="submit" disabled={saveCategoryMutation.isPending}>Save</Button></div>
                      </form>
                    </DialogContent>
                  </Dialog>
                ) : undefined}>
                {categories.length > 0 ? (
                  <Table><TableHeader><TableRow><TableHead>Category</TableHead><TableHead>Color</TableHead>{isAdmin && <TableHead className="w-24">Actions</TableHead>}</TableRow></TableHeader>
                    <TableBody>{categories.map((cat) => (<TableRow key={cat.id}><TableCell className="font-medium">{cat.name}</TableCell><TableCell><div className="flex items-center gap-2"><span className="h-4 w-4 rounded-full" style={{ backgroundColor: cat.color || '#3B82F6' }} />{cat.color}</div></TableCell>
                      {isAdmin && (<TableCell><div className="flex gap-1"><Button variant="ghost" size="icon" onClick={() => { setEditingCategory(cat); setCategoryDialogOpen(true); }}><Pencil className="h-4 w-4" /></Button><Button variant="ghost" size="icon" className="text-destructive" onClick={() => { if (confirm('Delete this category?')) deleteCategoryMutation.mutate(cat.id); }}><Trash2 className="h-4 w-4" /></Button></div></TableCell>)}
                    </TableRow>))}</TableBody></Table>
                ) : <p style={{ color: '#9ca3af', padding: '20px 0' }}>No categories yet</p>}
              </SettingsCard>
            </ColStack>
          )}

          {/* ═══ STAFF ═══ */}
          {activeTab === 'staff' && isAdmin && (
            <ColStack>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '14px' }}>
                {[{ label: 'Total Users', count: userRoles.length, color: '#10b981' }, { label: 'Owners', count: userRoles.filter((ur: any) => ur.role === 'owner').length, color: '#f59e0b' },
                { label: 'Managers', count: userRoles.filter((ur: any) => ur.role === 'manager').length, color: '#8b5cf6' }, { label: 'Salesmen', count: userRoles.filter((ur: any) => ur.role === 'salesman').length, color: '#3b82f6' }].map(({ label, count, color }) => (
                  <div key={label} style={{ background: T.color.cardBg, borderRadius: '12px', padding: '16px 20px', border: `1px solid ${T.color.border}`, borderLeft: `4px solid ${color}` }}>
                    <div style={{ fontSize: '12px', color: T.color.textMuted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
                    <div style={{ fontSize: '28px', fontWeight: 800, marginTop: '4px', color: T.color.textPri }}>{count}</div>
                  </div>
                ))}
              </div>
              <SettingsCard title="Team Members" subtitle="Manage user access and permissions" icon="👥" accent="#3b82f6">
                {userRoles.length > 0 ? (
                  <Table><TableHeader><TableRow><TableHead>User</TableHead><TableHead>Role</TableHead><TableHead>Bill Prefix</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                    <TableBody>{userRoles.map((ur: any) => (
                      <TableRow key={ur.id}><TableCell className="font-medium">{ur.profiles?.display_name || 'Unknown'}{ur.user_id === user?.id && <span className="ml-2 text-xs text-muted-foreground">(You)</span>}</TableCell>
                        <TableCell><Badge variant={ur.role === 'owner' ? 'default' : 'secondary'}>{ur.role === 'owner' ? '👑 Owner' : ur.role === 'manager' ? '🔧 Manager' : ur.role === 'salesman' ? '💼 Salesman' : '💵 Cashier'}</Badge></TableCell>
                        <TableCell><Input className="w-16 h-8 text-center uppercase" placeholder="-" maxLength={2} defaultValue={ur.bill_prefix || ''} onBlur={(e) => { const v = (e.target as HTMLInputElement).value.toUpperCase(); if (v !== (ur.bill_prefix || '')) updatePrefixMutation.mutate({ roleId: ur.id, prefix: v }); }} onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }} /></TableCell>
                        <TableCell className="text-right">{ur.role !== 'owner' && ur.user_id !== user?.id && <Button variant="ghost" size="sm" className="text-destructive" onClick={async () => { if (!confirm(`Remove ${ur.profiles?.display_name || 'this user'}?`)) return; const { error } = await supabase.from('user_roles').delete().eq('id', ur.id); if (error) toast.error('Failed: ' + error.message); else { toast.success('User removed'); queryClient.invalidateQueries({ queryKey: ['allUserRoles'] }); } }}><Trash className="h-4 w-4" /></Button>}</TableCell>
                      </TableRow>))}</TableBody></Table>
                ) : <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>
                  <div style={{ fontSize: '48px', marginBottom: '12px' }}>👥</div>
                  <p>No team members yet. Share your business code to invite people.</p>
                  {businessInfo?.join_code && <p style={{ marginTop: '8px', fontFamily: 'monospace', background: T.color.inputBg, border: `1px solid ${T.color.border}`, padding: '4px 12px', borderRadius: '6px', display: 'inline-block', color: T.color.textPri }}>{businessInfo.join_code}</p>}
                </div>}
              </SettingsCard>
            </ColStack>
          )}

          {/* ═══ POS ═══ */}
          {activeTab === 'pos' && <ComingSoon icon="🖥️" label="POS Settings" />}

          {/* ═══ APPEARANCE ═══ */}
          {activeTab === 'appearance' && (
            <ColStack gap="20px">
              {/* Light Themes */}
              <SettingsCard title="Light Themes" subtitle="Clean and bright themes for daytime use" icon="☀️" accent="#f59e0b">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
                  {themeOptions.filter(o => !o.isDark).map(opt => {
                    const active = theme === opt.value;
                    return (
                      <button key={opt.value} onClick={() => setTheme(opt.value)}
                        style={{
                          padding: '20px 18px', borderRadius: '14px', textAlign: 'left' as const, cursor: 'pointer',
                          position: 'relative' as const, fontFamily: T.font,
                          border: `2.5px solid ${active ? opt.color : '#e2e8f0'}`,
                          background: active ? opt.bg : '#ffffff',
                          boxShadow: active ? `0 0 0 4px ${opt.color}15, 0 4px 12px ${opt.color}10` : '0 1px 3px rgba(0,0,0,0.04)',
                          transition: 'all 0.25s cubic-bezier(.4,0,.2,1)',
                        }}
                        onMouseEnter={e => { if (!active) e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                        onMouseLeave={e => { if (!active) e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)'; e.currentTarget.style.transform = 'none'; }}
                      >
                        {active && (
                          <div style={{
                            position: 'absolute', top: '12px', right: '12px',
                            width: '22px', height: '22px', borderRadius: '50%', background: opt.color,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#fff', fontSize: '12px', fontWeight: 700,
                            boxShadow: `0 2px 6px ${opt.color}40`,
                          }}>✓</div>
                        )}
                        <div style={{
                          width: '100%', height: '6px', borderRadius: '3px', marginBottom: '14px',
                          background: `linear-gradient(90deg, ${opt.color}, ${opt.color}60)`,
                        }} />
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                          <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: opt.color, display: 'inline-block', boxShadow: `0 0 6px ${opt.color}40` }} />
                          <span style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', letterSpacing: '-0.01em' }}>{opt.name}</span>
                        </div>
                        <p style={{ fontSize: '11.5px', color: '#94a3b8', margin: 0, lineHeight: 1.4 }}>{opt.description}</p>
                      </button>
                    );
                  })}
                </div>
              </SettingsCard>

              {/* Dark Themes */}
              <SettingsCard title="Dark Themes" subtitle="Easy on the eyes in low-light environments" icon="🌙" accent="#6366f1">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
                  {themeOptions.filter(o => o.isDark).map(opt => {
                    const active = theme === opt.value;
                    return (
                      <button key={opt.value} onClick={() => setTheme(opt.value)}
                        style={{
                          padding: '20px 18px', borderRadius: '14px', textAlign: 'left' as const, cursor: 'pointer',
                          position: 'relative' as const, fontFamily: T.font,
                          border: `2.5px solid ${active ? opt.color : '#334155'}`,
                          background: active ? opt.bg : '#1e293b',
                          boxShadow: active ? `0 0 0 4px ${opt.color}20, 0 4px 16px ${opt.color}15` : '0 1px 3px rgba(0,0,0,0.2)',
                          transition: 'all 0.25s cubic-bezier(.4,0,.2,1)',
                        }}
                        onMouseEnter={e => { if (!active) e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.3)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                        onMouseLeave={e => { if (!active) e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.2)'; e.currentTarget.style.transform = 'none'; }}
                      >
                        {active && (
                          <div style={{
                            position: 'absolute', top: '12px', right: '12px',
                            width: '22px', height: '22px', borderRadius: '50%', background: opt.color,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#fff', fontSize: '12px', fontWeight: 700,
                            boxShadow: `0 2px 8px ${opt.color}50`,
                          }}>✓</div>
                        )}
                        <div style={{
                          width: '100%', height: '6px', borderRadius: '3px', marginBottom: '14px',
                          background: `linear-gradient(90deg, ${opt.color}, ${opt.color}40)`,
                          boxShadow: `0 0 8px ${opt.color}30`,
                        }} />
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                          <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: opt.color, display: 'inline-block', boxShadow: `0 0 8px ${opt.color}50` }} />
                          <span style={{ fontSize: '14px', fontWeight: 700, color: '#e2e8f0', letterSpacing: '-0.01em' }}>{opt.name}</span>
                        </div>
                        <p style={{ fontSize: '11.5px', color: '#64748b', margin: 0, lineHeight: 1.4 }}>{opt.description}</p>
                      </button>
                    );
                  })}
                </div>
              </SettingsCard>
            </ColStack>
          )}
        </div>
      </div>
    </div>
  );
}
