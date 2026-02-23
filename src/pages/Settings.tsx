import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast as sonnerToast } from 'sonner';
import { useTheme, ThemeName, themes } from '@/contexts/ThemeContext';
import { useBusinessSettings, useUpdateBusinessSettings } from '@/hooks/useBusinessSettings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Building2,
  Palette,
  Receipt,
  Calculator,
  Users,
  CreditCard,
  Plus,
  Minus,
  Pencil,
  Trash2,
  FolderOpen,
  Copy,
  Check,
  RefreshCw,
  KeyRound,
  Trash,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Monitor,
  Smartphone,
  Type,
  Maximize2,
  FileText,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { RandomSeeder } from '@/components/RandomSeeder';
import SubscriptionManagement from '@/components/settings/SubscriptionManagement';

const themeOptions: { name: string; value: ThemeName; description: string }[] = [
  { name: 'Mint Pro', value: 'mint-pro', description: 'Fresh green tones for a modern look' },
  { name: 'Sunset Orange', value: 'sunset-orange', description: 'Warm orange for energetic vibes' },
  { name: 'Royal Purple', value: 'royal-purple', description: 'Elegant purple for premium feel' },
  { name: 'Ocean Blue', value: 'ocean-blue', description: 'Calm blue for professional use' },
  { name: 'Dark Pro', value: 'dark-pro', description: 'Sleek dark mode for low-light' },
];

export default function Settings() {
  const { isAdmin, isManager, user, businessInfo, refreshBusinessInfo, businessId } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const { theme, setTheme } = useTheme();

  // Tab management
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'business');

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && tab !== activeTab) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setSearchParams({ tab: value });
  };
  const { data: settings, isLoading } = useBusinessSettings();
  const updateSettings = useUpdateBusinessSettings();
  const queryClient = useQueryClient();

  // Prefix mutation
  const updatePrefixMutation = useMutation({
    mutationFn: async ({ roleId, prefix }: { roleId: string; prefix: string }) => {
      const { error } = await supabase
        .from('user_roles')
        .update({ bill_prefix: prefix || null })
        .eq('id', roleId);
      if (error) throw error;
    },
    onSuccess: async (_, variables) => {
      toast.success('Bill prefix updated');
      queryClient.invalidateQueries({ queryKey: ['allUserRoles'] });
      // If admin updated their own role, refresh context
      if (userRoles.find((r: any) => r.id === variables.roleId)?.user_id === user?.id) {
        await refreshBusinessInfo();
      }
    },
    onError: (error) => {
      toast.error('Failed to update prefix: ' + error.message);
    },
  });

  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);

  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ['categories', businessId],
    queryFn: async () => {
      let query = supabase
        .from('categories')
        .select('*');
      if (businessId) query = query.eq('business_id', businessId);
      const { data, error } = await query.order('sort_order');
      if (error) throw error;
      return data;
    },
    enabled: !!businessId,
  });

  // Fetch user roles with profiles
  const { data: userRoles = [] } = useQuery({
    queryKey: ['allUserRoles', businessId],
    queryFn: async () => {
      // Fetch roles for this business
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('id, user_id, role, business_id, bill_prefix, created_at')
        .eq('business_id', businessId!);

      if (rolesError) {
        console.error('Error fetching user roles:', rolesError);
        throw rolesError;
      }
      if (!roles || roles.length === 0) return [];

      const rolesAny = roles as any[];

      // Fetch profiles for those users
      const userIds = rolesAny.map(r => r.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name')
        .in('user_id', userIds);

      const profilesAny = profiles as any[];

      // Merge roles with profile names
      return rolesAny.map(role => ({
        ...role,
        profiles: profilesAny?.find(p => p.user_id === role.user_id) || null,
      }));
    },
    enabled: isAdmin && !!businessId,
  });

  // Category mutations
  const saveCategoryMutation = useMutation({
    mutationFn: async (category: { name: string; color: string; icon: string }) => {
      if (editingCategory) {
        const { error } = await supabase
          .from('categories')
          .update(category)
          .eq('id', editingCategory.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('categories').insert({ ...category, business_id: businessId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setCategoryDialogOpen(false);
      setEditingCategory(null);
      toast.success(editingCategory ? 'Category updated' : 'Category created');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('categories').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Category deleted');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const handleBusinessSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    updateSettings.mutate({
      business_name: formData.get('business_name') as string,
      address: formData.get('address') as string,
      phone: formData.get('phone') as string,
      email: formData.get('email') as string,
    });
  };

  const handleBillingSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    updateSettings.mutate({
      bill_prefix: formData.get('bill_prefix') as string,
      currency: formData.get('currency') as string,
      currency_symbol: formData.get('currency_symbol') as string,
    });
  };

  const handleTaxSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    updateSettings.mutate({
      tax_rate: Number(formData.get('tax_rate')),
    });
  };

  const handleCategorySubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    saveCategoryMutation.mutate({
      name: formData.get('name') as string,
      color: formData.get('color') as string,
      icon: formData.get('icon') as string || 'Package',
    });
  };

  if (isLoading) {
    return <div className="animate-pulse">Loading settings...</div>;
  }

  return (
    <div className="space-y-4 sm:space-y-6 px-2 sm:px-0">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm sm:text-base text-muted-foreground">Manage your business configuration</p>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
        <TabsList className={cn(
          "grid w-full gap-1",
          isAdmin ? "grid-cols-7" : "grid-cols-6"
        )}>
          <TabsTrigger value="business" className="gap-1.5 px-2 py-2 text-[10px] sm:text-xs md:text-sm whitespace-nowrap">
            <Building2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden xs:inline">Business</span>
          </TabsTrigger>
          <TabsTrigger value="subscription" className="gap-1.5 px-2 py-2 text-[10px] sm:text-xs md:text-sm whitespace-nowrap border-b-2 border-transparent data-[state=active]:border-primary">
            <CreditCard className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden xs:inline">Plan</span>
          </TabsTrigger>
          <TabsTrigger value="categories" className="gap-1.5 px-2 py-2 text-[10px] sm:text-xs md:text-sm whitespace-nowrap">
            <FolderOpen className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden xs:inline">Categories</span>
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="users" className="gap-1.5 px-2 py-2 text-[10px] sm:text-xs md:text-sm whitespace-nowrap">
              <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden xs:inline">Users</span>
            </TabsTrigger>
          )}
          <TabsTrigger value="invoices" className="gap-1.5 px-2 py-2 text-[10px] sm:text-xs md:text-sm whitespace-nowrap">
            <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden xs:inline">Invoices</span>
          </TabsTrigger>
          <TabsTrigger value="billing" className="gap-1.5 px-2 py-2 text-[10px] sm:text-xs md:text-sm whitespace-nowrap">
            <Receipt className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden xs:inline">Billing</span>
          </TabsTrigger>
          <TabsTrigger value="appearance" className="gap-1.5 px-2 py-2 text-[10px] sm:text-xs md:text-sm whitespace-nowrap">
            <Palette className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden xs:inline">Theme</span>
          </TabsTrigger>
        </TabsList>

        {/* Business Info */}
        <TabsContent value="business">
          <Card>
            <CardHeader>
              <CardTitle>Business Information</CardTitle>
              <CardDescription>
                Your business details that appear on invoices
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleBusinessSubmit} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="business_name">Business Name</Label>
                    <Input
                      id="business_name"
                      name="business_name"
                      defaultValue={settings?.business_name}
                      disabled={!isAdmin}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      defaultValue={settings?.email || ''}
                      disabled={!isAdmin}
                    />
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      name="phone"
                      defaultValue={settings?.phone || ''}
                      disabled={!isAdmin}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gst_number">GST Number</Label>
                    <Input
                      id="gst_number"
                      placeholder="e.g. 22AAAAA0000A1Z5"
                      defaultValue={settings?.gst_number || ''}
                      onBlur={(e) => isAdmin && updateSettings.mutate({ gst_number: e.target.value })}
                      disabled={!isAdmin}
                    />
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="address">Address</Label>
                    <Textarea
                      id="address"
                      name="address"
                      defaultValue={settings?.address || ''}
                      rows={2}
                      disabled={!isAdmin}
                    />
                  </div>
                </div>
                {isAdmin && (
                  <Button type="submit" disabled={updateSettings.isPending}>
                    Save Changes
                  </Button>
                )}
              </form>
            </CardContent>
          </Card>

          {/* Join Code Card - Admin Only */}
          {isAdmin && businessInfo && (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <KeyRound className="h-5 w-5" />
                  Team Join Code
                </CardTitle>
                <CardDescription>
                  Share this code with your managers and cashiers to let them join your business
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 p-6 text-center space-y-2">
                  <div className="flex items-center justify-center gap-3">
                    <span className="text-4xl font-mono font-bold tracking-[0.3em] text-primary">
                      {businessInfo.join_code}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={async () => {
                        await navigator.clipboard.writeText(businessInfo.join_code);
                        setCopied(true);
                        toast.success('Code copied!');
                        setTimeout(() => setCopied(false), 2000);
                      }}
                    >
                      {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Max 8 members per business
                  </p>
                </div>
                <Button
                  variant="outline"
                  className="w-full"
                  disabled={regenerating}
                  onClick={async () => {
                    if (!confirm('Regenerating the code will make the old code invalid. Continue?')) return;
                    setRegenerating(true);
                    try {
                      const { data, error } = await supabase.rpc('regenerate_join_code', {
                        _user_id: user!.id,
                      });
                      if (error) throw error;
                      const result = data as any;
                      if (result.success) {
                        toast.success('Join code regenerated!');
                        await refreshBusinessInfo();
                      } else {
                        toast.error(result.error);
                      }
                    } catch (err: any) {
                      toast.error(err.message);
                    } finally {
                      setRegenerating(false);
                    }
                  }}
                >
                  <RefreshCw className={`mr-2 h-4 w-4 ${regenerating ? 'animate-spin' : ''}`} />
                  Regenerate Code
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Subscription Plan */}
        <TabsContent value="subscription">
          <SubscriptionManagement />
        </TabsContent>

        {/* Theme */}
        <TabsContent value="appearance">
          <Card>
            <CardHeader>
              <CardTitle>Appearance</CardTitle>
              <CardDescription>
                Choose a theme that matches your brand
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {themeOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setTheme(option.value)}
                    className={cn(
                      'flex flex-col items-start rounded-lg border-2 p-4 text-left transition-all hover:border-primary/50',
                      theme === option.value
                        ? 'border-primary bg-primary/5'
                        : 'border-border'
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="h-4 w-4 rounded-full"
                        style={{
                          backgroundColor: `hsl(${themes[option.value].primary})`,
                        }}
                      />
                      <span className="font-medium">{option.name}</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {option.description}
                    </p>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Billing Rules */}
        <TabsContent value="billing">
          <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-3 sm:pb-6">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Receipt className="h-4 w-4 sm:h-5 sm:w-5" />
                  Billing Rules
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <form onSubmit={handleBillingSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="bill_prefix" className="text-sm">Business Bill Prefix</Label>
                    <Input
                      id="bill_prefix"
                      name="bill_prefix"
                      defaultValue={settings?.bill_prefix}
                      disabled={!isAdmin}
                      className="h-9 sm:h-10"
                      placeholder="e.g., POS"
                    />
                    <p className="text-[10px] text-muted-foreground italic">
                      This prefix identifies your business on all bills.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="currency" className="text-sm">Currency Code</Label>
                      <Input
                        id="currency"
                        name="currency"
                        defaultValue={settings?.currency}
                        disabled={!isAdmin}
                        className="h-9 sm:h-10"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="currency_symbol" className="text-sm">Symbol</Label>
                      <Input
                        id="currency_symbol"
                        name="currency_symbol"
                        defaultValue={settings?.currency_symbol}
                        disabled={!isAdmin}
                        className="h-9 sm:h-10"
                      />
                    </div>
                  </div>
                  {isAdmin && (
                    <Button type="submit" disabled={updateSettings.isPending} className="w-full sm:w-auto">
                      Save Changes
                    </Button>
                  )}
                </form>
              </CardContent>
            </Card>

            {/* Personal Settings Card */}
            <Card>
              <CardHeader className="pb-3 sm:pb-6">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <span className="text-xl">👤</span>
                  My Personal Settings
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Settings specific to your account
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="my_bill_prefix" className="text-sm">Personal Collector Code</Label>
                  <div className="flex gap-2">
                    <Input
                      id="my_bill_prefix"
                      defaultValue={userRoles.find((r: any) => r.user_id === user?.id)?.bill_prefix || ''}
                      maxLength={2}
                      className="w-20 uppercase text-center font-mono font-bold"
                      placeholder="--"
                      onBlur={async (e) => {
                        const val = e.target.value.toUpperCase();
                        try {
                          const { error } = await supabase.rpc('update_my_bill_prefix', { _prefix: val });
                          if (error) throw error;
                          toast.success('Your personal code updated!');
                          await refreshBusinessInfo();
                          queryClient.invalidateQueries({ queryKey: ['allUserRoles'] });
                        } catch (err: any) {
                          toast.error('Failed to update: ' + err.message);
                        }
                      }}
                    />
                    <div className="text-xs text-muted-foreground self-center">
                      (e.g., 'UK' identifies you as the collector)
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground italic mt-1">
                    Your bills will be formatted as: BusinessPrefix-<b>Code</b>-Date-Number
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3 sm:pb-6">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Calculator className="h-4 w-4 sm:h-5 sm:w-5" />
                  GST Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <form onSubmit={handleTaxSubmit} className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="tax_rate" className="text-sm">GST Percentage (%)</Label>
                      <p className="text-[10px] text-muted-foreground">Default tax rate for new items</p>
                    </div>
                    <Input
                      id="tax_rate"
                      name="tax_rate"
                      type="number"
                      step="0.01"
                      min="0"
                      defaultValue={settings?.tax_rate}
                      disabled={!isAdmin}
                      className="h-9 w-24 text-right font-bold"
                    />
                  </div>
                  {isAdmin && (
                    <Button type="submit" disabled={updateSettings.isPending} className="w-full sm:w-auto">
                      Update GST Rate
                    </Button>
                  )}
                </form>

                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="space-y-0.5">
                    <Label className="text-sm">Show GST in Billing</Label>
                    <p className="text-[10px] text-muted-foreground">
                      Display GST toggle and calculation in billing screen
                    </p>
                  </div>
                  <Switch
                    checked={settings?.show_gst_in_billing ?? true}
                    onCheckedChange={(checked) => {
                      if (isAdmin) {
                        updateSettings.mutate({ show_gst_in_billing: checked });
                      }
                    }}
                    disabled={!isAdmin}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Billing Display Options */}
            <Card className="lg:col-span-2">
              <CardHeader className="pb-3 sm:pb-6">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Receipt className="h-4 w-4 sm:h-5 sm:w-5" />
                  Billing Display Options
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Control which fields are visible in the billing screen
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start sm:items-center justify-between gap-3">
                  <div className="space-y-0.5 flex-1">
                    <Label className="text-sm">Show Discount in Billing</Label>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Display discount input field
                    </p>
                  </div>
                  <Switch
                    checked={settings?.show_discount_in_billing ?? true}
                    onCheckedChange={(checked) => {
                      if (isAdmin) {
                        updateSettings.mutate({ show_discount_in_billing: checked });
                      }
                    }}
                    disabled={!isAdmin}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Invoice Customization */}
        <TabsContent value="invoices">
          <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
            {/* Template & Paper Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="h-5 w-5" />
                  General Layout
                </CardTitle>
                <CardDescription>Overall appearance and paper size</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { id: 'classic', name: 'Classic', desc: 'Typewriter' },
                    { id: 'modern', name: 'Modern', desc: 'Clean' },
                    { id: 'detailed', name: 'Detailed', desc: 'Grid' },
                  ].map((s) => (
                    <button
                      key={s.id}
                      onClick={() => isAdmin && updateSettings.mutate({ invoice_style: s.id as any })}
                      className={cn(
                        'flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all',
                        settings?.invoice_style === s.id
                          ? 'border-primary bg-primary/5 shadow-sm'
                          : 'border-border hover:border-primary/30'
                      )}
                      disabled={!isAdmin}
                    >
                      <span className="font-bold text-xs">{s.name}</span>
                      <span className="text-[9px] text-muted-foreground">{s.desc}</span>
                    </button>
                  ))}
                </div>

                <div className="space-y-4 pt-4 border-t">
                  <div className="space-y-2">
                    <Label>Paper Size</Label>
                    <div className="flex gap-2">
                      {[
                        { id: '58mm', label: '58mm' },
                        { id: '80mm', label: '80mm' },
                        { id: 'A4', label: 'A4' },
                      ].map((p) => (
                        <Button
                          key={p.id}
                          variant={settings?.invoice_paper_width === p.id ? 'default' : 'outline'}
                          size="sm"
                          className="flex-1"
                          onClick={() => isAdmin && updateSettings.mutate({ invoice_paper_width: p.id as any })}
                          disabled={!isAdmin}
                        >
                          {p.label}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Show Borders</Label>
                      <p className="text-[10px] text-muted-foreground">Toggle separation lines</p>
                    </div>
                    <Switch
                      checked={settings?.invoice_show_borders !== false}
                      onCheckedChange={(checked) => isAdmin && updateSettings.mutate({ invoice_show_borders: checked })}
                      disabled={!isAdmin}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Header Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Header Settings
                </CardTitle>
                <CardDescription>Business identity on invoice</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Text Alignment</Label>
                  <div className="flex gap-2">
                    {[
                      { id: 'left', icon: AlignLeft },
                      { id: 'center', icon: AlignCenter },
                      { id: 'right', icon: AlignRight },
                    ].map((a) => (
                      <Button
                        key={a.id}
                        variant={settings?.invoice_header_align === a.id ? 'default' : 'outline'}
                        size="icon"
                        className="flex-1"
                        onClick={() => isAdmin && updateSettings.mutate({ invoice_header_align: a.id as any })}
                        disabled={!isAdmin}
                      >
                        <a.icon className="h-4 w-4" />
                      </Button>
                    ))}
                  </div>
                </div>



                <div className="space-y-3 pt-3 border-t">
                  <div className="flex items-center justify-between font-medium text-xs text-muted-foreground uppercase tracking-wider">
                    Show Details
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Address</Label>
                    <Switch
                      checked={settings?.invoice_show_business_address !== false}
                      onCheckedChange={(checked) => isAdmin && updateSettings.mutate({ invoice_show_business_address: checked })}
                      disabled={!isAdmin}
                      className="scale-75"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Phone Number</Label>
                    <Switch
                      checked={settings?.invoice_show_business_phone !== false}
                      onCheckedChange={(checked) => isAdmin && updateSettings.mutate({ invoice_show_business_phone: checked })}
                      disabled={!isAdmin}
                      className="scale-75"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Email</Label>
                    <Switch
                      checked={settings?.invoice_show_business_email !== false}
                      onCheckedChange={(checked) => isAdmin && updateSettings.mutate({ invoice_show_business_email: checked })}
                      disabled={!isAdmin}
                      className="scale-75"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">GST Number</Label>
                    <Switch
                      checked={settings?.invoice_show_gst !== false}
                      onCheckedChange={(checked) => isAdmin && updateSettings.mutate({ invoice_show_gst: checked })}
                      disabled={!isAdmin}
                      className="scale-75"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Body Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Type className="h-5 w-5" />
                  Body & Table
                </CardTitle>
                <CardDescription>Item list styling</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-sm">Main Font Size</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 border"
                        onClick={() => isAdmin && updateSettings.mutate({ invoice_font_size: Math.max(8, (settings?.invoice_font_size || 12) - 1) })}
                        disabled={!isAdmin}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-6 text-center text-sm font-bold">{settings?.invoice_font_size || 12}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 border"
                        onClick={() => isAdmin && updateSettings.mutate({ invoice_font_size: Math.min(24, (settings?.invoice_font_size || 12) + 1) })}
                        disabled={!isAdmin}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-sm">Line Spacing</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 border"
                        onClick={() => isAdmin && updateSettings.mutate({ invoice_spacing: Math.max(0, (settings?.invoice_spacing || 4) - 1) })}
                        disabled={!isAdmin}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-6 text-center text-sm font-bold">{settings?.invoice_spacing || 4}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 border"
                        onClick={() => isAdmin && updateSettings.mutate({ invoice_spacing: Math.min(20, (settings?.invoice_spacing || 4) + 1) })}
                        disabled={!isAdmin}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t">
                    <div className="space-y-0.5">
                      <Label className="text-sm">Show Item Price Breakdown</Label>
                      <p className="text-[10px] text-muted-foreground">Show price x quantity line</p>
                    </div>
                    <Switch
                      checked={settings?.invoice_show_item_price === true}
                      onCheckedChange={(checked) => isAdmin && updateSettings.mutate({ invoice_show_item_price: checked })}
                      disabled={!isAdmin}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-sm">Show Price Column</Label>
                      <p className="text-[10px] text-muted-foreground">Toggle unit price column in table</p>
                    </div>
                    <Switch
                      checked={settings?.invoice_show_unit_price !== false}
                      onCheckedChange={(checked) => isAdmin && updateSettings.mutate({ invoice_show_unit_price: checked })}
                      disabled={!isAdmin}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Footer Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Footer Settings
                </CardTitle>
                <CardDescription>Credits and legal info</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="invoice_footer_message">Thank You Message</Label>
                  <Input
                    id="invoice_footer_message"
                    placeholder="Thank you for your business!"
                    defaultValue={settings?.invoice_footer_message || ''}
                    onBlur={(e) => isAdmin && updateSettings.mutate({ invoice_footer_message: e.target.value })}
                    disabled={!isAdmin}
                  />
                </div>

                <div className="flex items-center justify-between py-2 border-t">
                  <div className="space-y-0.5">
                    <Label className="text-sm">Footer Font Size</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 border"
                      onClick={() => isAdmin && updateSettings.mutate({ invoice_footer_font_size: Math.max(6, (settings?.invoice_footer_font_size || 10) - 1) })}
                      disabled={!isAdmin}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-6 text-center text-sm font-bold">{settings?.invoice_footer_font_size || 10}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 border"
                      onClick={() => isAdmin && updateSettings.mutate({ invoice_footer_font_size: Math.min(16, (settings?.invoice_footer_font_size || 10) + 1) })}
                      disabled={!isAdmin}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t">
                  <Label htmlFor="invoice_terms">Terms & Conditions</Label>
                  <Textarea
                    id="invoice_terms"
                    placeholder="e.g., No refund after 7 days"
                    defaultValue={settings?.invoice_terms_conditions || ''}
                    onBlur={(e) => isAdmin && updateSettings.mutate({ invoice_terms_conditions: e.target.value })}
                    disabled={!isAdmin}
                    rows={2}
                    className="text-xs"
                  />
                </div>

                <div className="flex items-center justify-between pt-2 border-t">
                  <div className="space-y-0.5">
                    <Label className="text-sm">Show Payment QR Code</Label>
                    <p className="text-[10px] text-muted-foreground">Generates dynamic UPI QR with total amount</p>
                  </div>
                  <Switch
                    checked={settings?.invoice_show_qr_code === true}
                    onCheckedChange={(checked) => isAdmin && updateSettings.mutate({ invoice_show_qr_code: checked })}
                    disabled={!isAdmin}
                  />
                </div>

                {settings?.invoice_show_qr_code && (
                  <div className="space-y-2 pt-2 border-t animate-in fade-in slide-in-from-top-1">
                    <Label htmlFor="upi_id" className="text-sm">UPI ID (VPA) for Payments</Label>
                    <Input
                      id="upi_id"
                      placeholder="e.g., yourname@bank"
                      defaultValue={settings?.upi_id || ''}
                      onBlur={(e) => isAdmin && updateSettings.mutate({ upi_id: e.target.value })}
                      disabled={!isAdmin}
                      className="text-xs"
                    />
                    <p className="text-[10px] text-muted-foreground italic">
                      Required for the dynamic QR code to work properly.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Categories */}
        <TabsContent value="categories">
          {isAdmin && <RandomSeeder />}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Product Categories</CardTitle>
                <CardDescription>
                  Organize your products into categories
                </CardDescription>
              </div>
              {isAdmin && (
                <Dialog open={categoryDialogOpen} onOpenChange={(open) => {
                  setCategoryDialogOpen(open);
                  if (!open) setEditingCategory(null);
                }}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Category
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>
                        {editingCategory ? 'Edit Category' : 'Add Category'}
                      </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleCategorySubmit} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="cat_name">Name</Label>
                        <Input
                          id="cat_name"
                          name="name"
                          defaultValue={editingCategory?.name}
                          required
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="cat_color">Color</Label>
                          <Input
                            id="cat_color"
                            name="color"
                            type="color"
                            defaultValue={editingCategory?.color || '#3B82F6'}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="cat_icon">Icon</Label>
                          <Input
                            id="cat_icon"
                            name="icon"
                            defaultValue={editingCategory?.icon || 'Package'}
                            placeholder="Lucide icon name"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setCategoryDialogOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button type="submit" disabled={saveCategoryMutation.isPending}>
                          Save
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              )}
            </CardHeader>
            <CardContent>
              {categories.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Category</TableHead>
                      <TableHead>Color</TableHead>
                      {isAdmin && <TableHead className="w-24">Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categories.map((cat) => (
                      <TableRow key={cat.id}>
                        <TableCell className="font-medium">{cat.name}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span
                              className="h-4 w-4 rounded-full"
                              style={{ backgroundColor: cat.color || '#3B82F6' }}
                            />
                            {cat.color}
                          </div>
                        </TableCell>
                        {isAdmin && (
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setEditingCategory(cat);
                                  setCategoryDialogOpen(true);
                                }}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive"
                                onClick={() => {
                                  if (confirm('Delete this category?')) {
                                    deleteCategoryMutation.mutate(cat.id);
                                  }
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-muted-foreground">No categories yet</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Users - Admin Only */}
        {isAdmin && (
          <TabsContent value="users">
            {/* Role Count Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              {[
                { label: 'Total Users', count: userRoles.length, color: 'bg-primary/10 text-primary' },
                { label: 'Admins', count: userRoles.filter((ur: any) => ur.role === 'admin').length, color: 'bg-amber-500/10 text-amber-600' },
                { label: 'Managers', count: userRoles.filter((ur: any) => ur.role === 'manager').length, color: 'bg-blue-500/10 text-blue-600' },
                { label: 'Cashiers', count: userRoles.filter((ur: any) => ur.role === 'cashier').length, color: 'bg-emerald-500/10 text-emerald-600' },
              ].map(({ label, count, color }) => (
                <Card key={label} className="p-4">
                  <div className="text-sm text-muted-foreground">{label}</div>
                  <div className={`text-2xl font-bold mt-1 ${color.split(' ')[1]}`}>{count}</div>
                </Card>
              ))}
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Team Members</CardTitle>
                <CardDescription>
                  Manage user access and permissions for your business
                </CardDescription>
              </CardHeader>
              <CardContent>
                {userRoles.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Bill Prefix</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {userRoles.map((ur: any) => (
                        <TableRow key={ur.id}>
                          <TableCell className="font-medium">
                            <div>
                              {ur.profiles?.display_name || 'Unknown User'}
                              {ur.user_id === user?.id && (
                                <span className="ml-2 text-xs text-muted-foreground">(You)</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                ur.role === 'admin'
                                  ? 'default'
                                  : ur.role === 'manager'
                                    ? 'secondary'
                                    : 'outline'
                              }
                            >
                              {ur.role === 'admin' ? '👑 Admin' : ur.role === 'manager' ? '🔧 Manager' : '💵 Cashier'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Input
                                className="w-16 h-8 text-center uppercase"
                                placeholder="-"
                                maxLength={2}
                                defaultValue={ur.bill_prefix || ''}
                                onBlur={(e) => {
                                  const newVal = e.target.value.toUpperCase();
                                  if (newVal !== (ur.bill_prefix || '')) {
                                    updatePrefixMutation.mutate({ roleId: ur.id, prefix: newVal });
                                  }
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.currentTarget.blur();
                                  }
                                }}
                              />
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            {ur.role !== 'admin' && ur.user_id !== user?.id && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={async () => {
                                  if (!confirm(`Remove ${ur.profiles?.display_name || 'this user'} from the business?`)) return;
                                  const { error } = await supabase
                                    .from('user_roles')
                                    .delete()
                                    .eq('id', ur.id);
                                  if (error) {
                                    toast.error('Failed to remove user: ' + error.message);
                                  } else {
                                    toast.success('User removed from business');
                                    queryClient.invalidateQueries({ queryKey: ['allUserRoles'] });
                                  }
                                }}
                              >
                                <Trash className="h-4 w-4" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8">
                    <Users className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3" />
                    <p className="text-muted-foreground">
                      No team members yet. Share your business code to invite people.
                    </p>
                    {businessInfo?.join_code && (
                      <p className="mt-2 text-sm font-mono bg-muted px-3 py-1 rounded inline-block">
                        {businessInfo.join_code}
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div >
  );
}
