import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
  Plus,
  Pencil,
  Trash2,
  FolderOpen,
  Copy,
  Check,
  RefreshCw,
  KeyRound,
  Trash,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { RandomSeeder } from '@/components/RandomSeeder';

const themeOptions: { name: string; value: ThemeName; description: string }[] = [
  { name: 'Mint Pro', value: 'mint-pro', description: 'Fresh green tones for a modern look' },
  { name: 'Sunset Orange', value: 'sunset-orange', description: 'Warm orange for energetic vibes' },
  { name: 'Royal Purple', value: 'royal-purple', description: 'Elegant purple for premium feel' },
  { name: 'Ocean Blue', value: 'ocean-blue', description: 'Calm blue for professional use' },
  { name: 'Dark Pro', value: 'dark-pro', description: 'Sleek dark mode for low-light' },
];

export default function Settings() {
  const { isAdmin, isManager, user, businessInfo, refreshBusinessInfo } = useAuth();
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const { theme, setTheme } = useTheme();
  const { data: settings, isLoading } = useBusinessSettings();
  const updateSettings = useUpdateBusinessSettings();
  const queryClient = useQueryClient();

  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);

  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('sort_order');
      if (error) throw error;
      return data;
    },
  });

  // Fetch user roles
  const { data: userRoles = [] } = useQuery({
    queryKey: ['allUserRoles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('*, profiles:user_id(display_name, user_id)');
      if (error) throw error;
      return data;
    },
    enabled: isAdmin,
  });

  // Fetch join code directly (works even if businessInfo from AuthContext is null)
  const { data: myBusiness, isLoading: joinCodeLoading, error: joinCodeError } = useQuery({
    queryKey: ['myBusinessJoinCode'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('businesses')
          .select('join_code, business_name')
          .eq('owner_id', user!.id)
          .maybeSingle();
        if (error) {
          console.error('Join code query error:', error);
          return null;
        }
        return data;
      } catch (e) {
        console.error('Join code fetch failed:', e);
        return null;
      }
    },
    enabled: isAdmin && !!user,
    retry: false,
  });

  // Mutation for assigning bill prefix
  const assignPrefixMutation = useMutation({
    mutationFn: async ({ targetUserId, prefix }: { targetUserId: string; prefix: string }) => {
      const { data, error } = await supabase.rpc('assign_bill_prefix', {
        _admin_user_id: user!.id,
        _target_user_id: targetUserId,
        _prefix: prefix,
      });
      if (error) throw error;
      const result = data as any;
      if (!result.success) throw new Error(result.error);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allUserRoles'] });
      toast.success('Bill prefix assigned!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
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
        const { error } = await supabase.from('categories').insert(category);
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
      tax_name: formData.get('tax_name') as string,
      tax_rate: Number(formData.get('tax_rate')),
      tax_inclusive: formData.get('tax_inclusive') === 'on',
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

      <Tabs defaultValue="business" className="space-y-4">
        <div className="overflow-x-auto -mx-2 px-2 pb-2">
          <TabsList className="inline-flex w-auto min-w-full sm:grid sm:w-full sm:grid-cols-5 gap-1">
            <TabsTrigger value="business" className="gap-1.5 px-3 py-2 text-xs sm:text-sm whitespace-nowrap">
              <Building2 className="h-4 w-4" />
              <span className="hidden xs:inline sm:inline">Business</span>
            </TabsTrigger>
            <TabsTrigger value="appearance" className="gap-1.5 px-3 py-2 text-xs sm:text-sm whitespace-nowrap">
              <Palette className="h-4 w-4" />
              <span className="hidden xs:inline sm:inline">Theme</span>
            </TabsTrigger>
            <TabsTrigger value="billing" className="gap-1.5 px-3 py-2 text-xs sm:text-sm whitespace-nowrap">
              <Receipt className="h-4 w-4" />
              <span className="hidden xs:inline sm:inline">Billing</span>
            </TabsTrigger>
            <TabsTrigger value="categories" className="gap-1.5 px-3 py-2 text-xs sm:text-sm whitespace-nowrap">
              <FolderOpen className="h-4 w-4" />
              <span className="hidden xs:inline sm:inline">Categories</span>
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="users" className="gap-1.5 px-3 py-2 text-xs sm:text-sm whitespace-nowrap">
                <Users className="h-4 w-4" />
                <span className="hidden xs:inline sm:inline">Users</span>
              </TabsTrigger>
            )}
          </TabsList>
        </div>

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
                  <div className="space-y-2 md:col-span-1">
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
                    <Label htmlFor="bill_prefix" className="text-sm">Bill Number Prefix</Label>
                    <Input
                      id="bill_prefix"
                      name="bill_prefix"
                      defaultValue={settings?.bill_prefix}
                      disabled={!isAdmin}
                      className="h-9 sm:h-10"
                    />
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

            <Card>
              <CardHeader className="pb-3 sm:pb-6">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Calculator className="h-4 w-4 sm:h-5 sm:w-5" />
                  Tax Configuration
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleTaxSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="tax_name" className="text-sm">Tax Name</Label>
                      <Input
                        id="tax_name"
                        name="tax_name"
                        defaultValue={settings?.tax_name}
                        disabled={!isAdmin}
                        className="h-9 sm:h-10"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tax_rate" className="text-sm">Tax Rate (%)</Label>
                      <Input
                        id="tax_rate"
                        name="tax_rate"
                        type="number"
                        step="0.01"
                        min="0"
                        defaultValue={settings?.tax_rate}
                        disabled={!isAdmin}
                        className="h-9 sm:h-10"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      id="tax_inclusive"
                      name="tax_inclusive"
                      defaultChecked={settings?.tax_inclusive}
                      disabled={!isAdmin}
                    />
                    <Label htmlFor="tax_inclusive" className="text-sm">Tax included in price</Label>
                  </div>
                  {isAdmin && (
                    <Button type="submit" disabled={updateSettings.isPending} className="w-full sm:w-auto">
                      Save Changes
                    </Button>
                  )}
                </form>
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
                    <Label className="text-sm">Show GST in Billing</Label>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Display GST percentage input field
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

        {/* Users & Team - Admin Only */}
        {isAdmin && (
          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle>Team Management</CardTitle>
                <CardDescription>
                  Manage user roles and assign bill prefixes. Each team member gets a unique letter prefix for their bills.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Invite Section */}
                {(() => {
                  const joinCode = myBusiness?.join_code || businessInfo?.join_code;
                  if (joinCodeLoading) return (
                    <div className="rounded-xl border border-dashed border-muted-foreground/30 bg-muted/30 p-4 text-center text-sm text-muted-foreground">
                      Loading business join code...
                    </div>
                  );
                  if (!joinCode) return (
                    <div className="rounded-xl border border-dashed border-primary/30 bg-primary/5 p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <KeyRound className="h-4 w-4 text-primary" />
                        <span className="text-sm font-semibold">Set Up Your Business</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Create your business to get a join code that you can share with your team members.
                      </p>
                      <Button
                        onClick={() => window.location.href = '/business-setup'}
                        className="gap-2"
                      >
                        <Plus className="h-4 w-4" />
                        Create Business & Get Join Code
                      </Button>
                    </div>
                  );
                  return (
                    <div className="rounded-xl border border-dashed border-primary/30 bg-primary/5 p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <KeyRound className="h-4 w-4 text-primary" />
                        <span className="text-sm font-semibold">Invite Team Members</span>
                      </div>
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">Join Code:</span>
                          <span className="text-2xl font-mono font-bold tracking-[0.2em] text-primary">
                            {joinCode}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1.5"
                            onClick={async () => {
                              await navigator.clipboard.writeText(joinCode);
                              setCopied(true);
                              toast.success('Join code copied!');
                              setTimeout(() => setCopied(false), 2000);
                            }}
                          >
                            {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                            {copied ? 'Copied' : 'Copy Code'}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1.5"
                            onClick={async () => {
                              const inviteText = `Join my POS business!\n\nJoin Code: ${joinCode}\n\nSign up at: ${window.location.origin}`;
                              await navigator.clipboard.writeText(inviteText);
                              toast.success('Invitation message copied!');
                            }}
                          >
                            <Copy className="h-3.5 w-3.5" />
                            Copy Invite
                          </Button>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Share this code with your managers and cashiers. Max 8 members per business.
                      </p>
                    </div>
                  );
                })()}

                {/* Team Table */}
                {userRoles.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Bill Prefix</TableHead>
                        <TableHead className="text-right">Next Bill #</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {userRoles.map((ur: any) => (
                        <TableRow key={ur.id}>
                          <TableCell>
                            <div className="font-medium">
                              {ur.profiles?.display_name || 'Unknown User'}
                            </div>
                            {ur.user_id === user?.id && (
                              <span className="text-xs text-muted-foreground">(You)</span>
                            )}
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
                              {ur.role}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Input
                                className="w-16 h-8 text-center font-mono font-bold uppercase"
                                maxLength={1}
                                defaultValue={ur.bill_prefix || ''}
                                placeholder="—"
                                onBlur={(e) => {
                                  const newPrefix = e.target.value.trim().toUpperCase();
                                  if (newPrefix && newPrefix !== (ur.bill_prefix || '')) {
                                    if (/^[A-Z]$/.test(newPrefix)) {
                                      assignPrefixMutation.mutate({
                                        targetUserId: ur.user_id,
                                        prefix: newPrefix,
                                      });
                                    } else {
                                      toast.error('Prefix must be a single letter (A-Z)');
                                      e.target.value = ur.bill_prefix || '';
                                    }
                                  }
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    (e.target as HTMLInputElement).blur();
                                  }
                                }}
                              />
                              {ur.bill_prefix && (
                                <span className="text-xs text-muted-foreground">
                                  Bills: {ur.bill_prefix}MMDDXXXX
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {(() => {
                              if (!ur.bill_prefix) return '—';
                              const today = new Date();
                              const mm = String(today.getMonth() + 1).padStart(2, '0');
                              const dd = String(today.getDate()).padStart(2, '0');
                              const todayStr = today.toISOString().split('T')[0];
                              const seq = (ur.last_bill_date === todayStr) ? (ur.next_bill_number || 1) : 1;
                              return `${ur.bill_prefix}${mm}${dd}${String(seq).padStart(4, '0')}`;
                            })()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-muted-foreground">
                    No team members yet. Share your join code from the Business tab.
                  </p>
                )}

                <div className="mt-4 rounded-lg bg-muted/50 p-4 space-y-2">
                  <p className="text-sm font-medium">💡 How Bill Prefixes Work</p>
                  <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                    <li>Each team member gets a unique single letter (A, B, C, etc.)</li>
                    <li>Format: <code className="bg-muted px-1 rounded">A02140001</code> = Prefix + Month + Day + Sequence</li>
                    <li>The sequence resets daily — each day starts from 0001</li>
                    <li>This ensures no bill number conflicts when multiple users bill at the same time</li>
                    <li>Click the prefix field and type a new letter to change it</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
