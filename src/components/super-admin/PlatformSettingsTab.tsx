import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Settings, Globe, Shield, Bell, Palette, Flag,
  Wrench, Database, Users, Save, RotateCcw,
  Mail, Phone, IndianRupee, Clock, Lock, Eye
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const SETTINGS_KEY = 'pos_platform_settings';

interface PlatformSettings {
  // General
  platformName: string;
  supportEmail: string;
  supportPhone: string;
  defaultCurrency: string;
  timezone: string;
  // Subscriptions
  defaultPlanId: string;
  trialDurationDays: number;
  autoExpireEnabled: boolean;
  // Security
  maxLoginAttempts: number;
  sessionTimeoutMinutes: number;
  // Notifications
  emailNotifications: boolean;
  adminAlerts: boolean;
  // Appearance
  adminTheme: 'light' | 'dark' | 'system';
  accentColor: string;
  // Feature Flags
  enableSalesmanModule: boolean;
  enableExpenseTracker: boolean;
  enablePurchaseOrders: boolean;
  enableSalesReturns: boolean;
  enableGST: boolean;
  enableMultiUnit: boolean;
  // Maintenance
  maintenanceMode: boolean;
  maintenanceMessage: string;
}

const DEFAULT_SETTINGS: PlatformSettings = {
  platformName: 'Invoice Adda',
  supportEmail: 'support@invoiceadda.com',
  supportPhone: '+91 9876543210',
  defaultCurrency: 'INR',
  timezone: 'Asia/Kolkata',
  defaultPlanId: '',
  trialDurationDays: 14,
  autoExpireEnabled: true,
  maxLoginAttempts: 5,
  sessionTimeoutMinutes: 60,
  emailNotifications: true,
  adminAlerts: true,
  adminTheme: 'system',
  accentColor: '#2563eb',
  enableSalesmanModule: true,
  enableExpenseTracker: true,
  enablePurchaseOrders: true,
  enableSalesReturns: true,
  enableGST: true,
  enableMultiUnit: true,
  maintenanceMode: false,
  maintenanceMessage: 'We are currently performing scheduled maintenance. Please try again later.',
};

function loadSettings(): PlatformSettings {
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') };
  } catch { return DEFAULT_SETTINGS; }
}

function saveSettings(settings: PlatformSettings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export default function PlatformSettingsTab() {
  const { customAdminName } = useAuth();
  const [settings, setSettings] = useState<PlatformSettings>(loadSettings);
  const [activeSection, setActiveSection] = useState('general');
  const [hasChanges, setHasChanges] = useState(false);

  const { data: plans = [] } = useQuery({
    queryKey: ['settings-plans'],
    queryFn: async () => {
      const { data } = await supabase.from('subscription_plans').select('id, name, price').eq('is_active', true).order('price');
      return data || [];
    },
  });

  const { data: superAdmins = [] } = useQuery({
    queryKey: ['settings-super-admins'],
    queryFn: async () => {
      const { data } = await supabase.from('super_admins').select('*').order('created_at');
      return data || [];
    },
  });

  const update = (key: keyof PlatformSettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = () => {
    saveSettings(settings);
    setHasChanges(false);
    toast.success('Settings saved successfully');
  };

  const handleReset = () => {
    setSettings(DEFAULT_SETTINGS);
    setHasChanges(true);
    toast.info('Settings reset to defaults. Click Save to apply.');
  };

  const sections = [
    { id: 'general', label: 'General', icon: Globe },
    { id: 'subscriptions', label: 'Subscriptions', icon: IndianRupee },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'features', label: 'Feature Flags', icon: Flag },
    { id: 'maintenance', label: 'Maintenance', icon: Wrench },
    { id: 'admins', label: 'Admin Accounts', icon: Users },
  ];

  const SettingRow = ({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) => (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-4">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold">{label}</p>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <div className="sm:w-72 shrink-0">{children}</div>
    </div>
  );

  const ToggleRow = ({ label, description, checked, onChange }: { label: string; description?: string; checked: boolean; onChange: (v: boolean) => void }) => (
    <div className="flex items-center justify-between gap-3 py-4">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold">{label}</p>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Platform Settings</h2>
          <p className="text-sm text-muted-foreground mt-1">Configure platform-wide settings and preferences.</p>
        </div>
        <div className="flex gap-2 self-start">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={handleReset}>
            <RotateCcw className="h-3.5 w-3.5" />Reset
          </Button>
          <Button size="sm" className="gap-1.5" onClick={handleSave} disabled={!hasChanges}>
            <Save className="h-3.5 w-3.5" />{hasChanges ? 'Save Changes' : 'Saved'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Section Nav */}
        <div className="xl:col-span-3">
          <Card className="border-slate-200/70 shadow-sm sticky top-6">
            <CardContent className="p-2">
              <nav className="space-y-0.5">
                {sections.map(s => (
                  <button
                    key={s.id}
                    onClick={() => setActiveSection(s.id)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                      activeSection === s.id
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                    )}
                  >
                    <s.icon className="h-4 w-4 shrink-0" />
                    {s.label}
                  </button>
                ))}
              </nav>
            </CardContent>
          </Card>
        </div>

        {/* Settings Content */}
        <div className="xl:col-span-9">
          <Card className="border-slate-200/70 shadow-sm">
            <CardContent className="pt-6 divide-y divide-border">
              {activeSection === 'general' && (
                <>
                  <SettingRow label="Platform Name" description="Name displayed in the admin panel">
                    <Input value={settings.platformName} onChange={e => update('platformName', e.target.value)} />
                  </SettingRow>
                  <SettingRow label="Support Email" description="Email shown to users for support">
                    <Input type="email" value={settings.supportEmail} onChange={e => update('supportEmail', e.target.value)} />
                  </SettingRow>
                  <SettingRow label="Support Phone" description="Phone number for support">
                    <Input value={settings.supportPhone} onChange={e => update('supportPhone', e.target.value)} />
                  </SettingRow>
                  <SettingRow label="Default Currency" description="Currency for new businesses">
                    <Select value={settings.defaultCurrency} onValueChange={v => update('defaultCurrency', v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="INR">₹ INR</SelectItem>
                        <SelectItem value="USD">$ USD</SelectItem>
                        <SelectItem value="EUR">€ EUR</SelectItem>
                        <SelectItem value="GBP">£ GBP</SelectItem>
                      </SelectContent>
                    </Select>
                  </SettingRow>
                  <SettingRow label="Timezone" description="Server timezone">
                    <Select value={settings.timezone} onValueChange={v => update('timezone', v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Asia/Kolkata">Asia/Kolkata (IST)</SelectItem>
                        <SelectItem value="UTC">UTC</SelectItem>
                        <SelectItem value="America/New_York">America/New York (EST)</SelectItem>
                        <SelectItem value="Europe/London">Europe/London (GMT)</SelectItem>
                      </SelectContent>
                    </Select>
                  </SettingRow>
                </>
              )}

              {activeSection === 'subscriptions' && (
                <>
                  <SettingRow label="Default Plan" description="Plan auto-assigned to new businesses">
                    <Select value={settings.defaultPlanId} onValueChange={v => update('defaultPlanId', v)}>
                      <SelectTrigger><SelectValue placeholder="Select plan" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">None</SelectItem>
                        {plans.map((p: any) => (
                          <SelectItem key={p.id} value={p.id}>{p.name} (₹{p.price})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </SettingRow>
                  <SettingRow label="Trial Duration (Days)" description="Default trial period for new subscriptions">
                    <Input type="number" min={0} max={365} value={settings.trialDurationDays} onChange={e => update('trialDurationDays', parseInt(e.target.value) || 0)} />
                  </SettingRow>
                  <ToggleRow label="Auto-Expire Subscriptions" description="Automatically expire subscriptions past their end date" checked={settings.autoExpireEnabled} onChange={v => update('autoExpireEnabled', v)} />
                </>
              )}

              {activeSection === 'security' && (
                <>
                  <SettingRow label="Max Login Attempts" description="Lockout after this many failed attempts">
                    <Input type="number" min={1} max={20} value={settings.maxLoginAttempts} onChange={e => update('maxLoginAttempts', parseInt(e.target.value) || 5)} />
                  </SettingRow>
                  <SettingRow label="Session Timeout (Minutes)" description="Auto-logout after inactivity">
                    <Input type="number" min={5} max={1440} value={settings.sessionTimeoutMinutes} onChange={e => update('sessionTimeoutMinutes', parseInt(e.target.value) || 60)} />
                  </SettingRow>
                  <div className="py-4">
                    <p className="text-sm font-semibold mb-2">Password Policy</p>
                    <div className="rounded-xl border border-slate-200/70 bg-slate-50/80 p-4 space-y-2 text-xs text-muted-foreground">
                      <div className="flex items-center gap-2"><Lock className="h-3 w-3 text-emerald-500" /> Minimum 6 characters (managed by Supabase Auth)</div>
                      <div className="flex items-center gap-2"><Shield className="h-3 w-3 text-emerald-500" /> PKCE flow for OAuth</div>
                      <div className="flex items-center gap-2"><Eye className="h-3 w-3 text-emerald-500" /> Row Level Security (RLS) enabled on all tables</div>
                    </div>
                  </div>
                </>
              )}

              {activeSection === 'notifications' && (
                <>
                  <ToggleRow label="Email Notifications" description="Send email notifications for critical events" checked={settings.emailNotifications} onChange={v => update('emailNotifications', v)} />
                  <ToggleRow label="Admin Alerts" description="Show in-app alerts for admin actions" checked={settings.adminAlerts} onChange={v => update('adminAlerts', v)} />
                </>
              )}

              {activeSection === 'appearance' && (
                <>
                  <SettingRow label="Admin Theme" description="Theme for the admin panel">
                    <Select value={settings.adminTheme} onValueChange={v => update('adminTheme', v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="light">☀️ Light</SelectItem>
                        <SelectItem value="dark">🌙 Dark</SelectItem>
                        <SelectItem value="system">💻 System</SelectItem>
                      </SelectContent>
                    </Select>
                  </SettingRow>
                  <SettingRow label="Accent Color" description="Primary color for buttons and active elements">
                    <div className="flex items-center gap-3">
                      <input type="color" value={settings.accentColor} onChange={e => update('accentColor', e.target.value)} className="h-9 w-12 rounded border border-border cursor-pointer" />
                      <Input value={settings.accentColor} onChange={e => update('accentColor', e.target.value)} className="flex-1 font-mono text-sm" />
                    </div>
                  </SettingRow>
                </>
              )}

              {activeSection === 'features' && (
                <>
                  <ToggleRow label="Salesman Module" description="Enable salesman dashboard, store management, and order tracking" checked={settings.enableSalesmanModule} onChange={v => update('enableSalesmanModule', v)} />
                  <ToggleRow label="Expense Tracker" description="Allow businesses to track expenses" checked={settings.enableExpenseTracker} onChange={v => update('enableExpenseTracker', v)} />
                  <ToggleRow label="Purchase Orders" description="Enable supplier management and purchase orders" checked={settings.enablePurchaseOrders} onChange={v => update('enablePurchaseOrders', v)} />
                  <ToggleRow label="Sales Returns" description="Allow processing of sales returns" checked={settings.enableSalesReturns} onChange={v => update('enableSalesReturns', v)} />
                  <ToggleRow label="GST Support" description="Enable GST/tax calculations in billing" checked={settings.enableGST} onChange={v => update('enableGST', v)} />
                  <ToggleRow label="Multi-Unit Products" description="Support multiple units per product (e.g., kg, pieces)" checked={settings.enableMultiUnit} onChange={v => update('enableMultiUnit', v)} />
                </>
              )}

              {activeSection === 'maintenance' && (
                <>
                  <ToggleRow label="Maintenance Mode" description="Show maintenance page to all non-admin users" checked={settings.maintenanceMode} onChange={v => update('maintenanceMode', v)} />
                  {settings.maintenanceMode && (
                    <div className="py-4">
                      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 mb-4">
                        <p className="text-sm font-semibold text-amber-800">⚠️ Maintenance mode is ON</p>
                        <p className="text-xs text-amber-700 mt-1">Users will see the maintenance message below when trying to access the platform.</p>
                      </div>
                    </div>
                  )}
                  <SettingRow label="Maintenance Message" description="Message shown to users during maintenance">
                    <Textarea value={settings.maintenanceMessage} onChange={e => update('maintenanceMessage', e.target.value)} className="min-h-[80px]" />
                  </SettingRow>
                </>
              )}

              {activeSection === 'admins' && (
                <>
                  <div className="py-4">
                    <p className="text-sm font-semibold mb-3">Super Admin Accounts</p>
                    <p className="text-xs text-muted-foreground mb-4">These accounts have full platform access. Managed via the Supabase `super_admins` table.</p>
                    {superAdmins.length === 0 ? (
                      <div className="rounded-xl border border-slate-200/70 bg-slate-50/80 p-6 text-center text-sm text-muted-foreground">
                        No super admin accounts found.
                      </div>
                    ) : (
                      <div className="rounded-xl border border-slate-200/70 overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-muted/40">
                              <TableHead>Display Name</TableHead>
                              <TableHead>User ID</TableHead>
                              <TableHead>Created</TableHead>
                              <TableHead>Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {superAdmins.map((admin: any) => (
                              <TableRow key={admin.id}>
                                <TableCell className="font-semibold text-sm">{admin.display_name || 'Admin'}</TableCell>
                                <TableCell className="font-mono text-xs text-muted-foreground">{admin.user_id?.slice(0, 12)}...</TableCell>
                                <TableCell className="text-xs text-muted-foreground">
                                  {admin.created_at ? format(new Date(admin.created_at), 'MMM dd, yyyy') : '—'}
                                </TableCell>
                                <TableCell>
                                  <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 text-[10px]">Active</Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </div>
                  <div className="py-4">
                    <p className="text-sm font-semibold mb-2">Current Session</p>
                    <div className="rounded-xl border border-slate-200/70 bg-slate-50/80 p-4 text-sm">
                      <p className="text-muted-foreground">Logged in as: <span className="font-bold text-foreground">{customAdminName || 'System Administrator'}</span></p>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
