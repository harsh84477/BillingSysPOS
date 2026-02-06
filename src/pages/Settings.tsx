import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
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
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const themeOptions: { name: string; value: ThemeName; description: string }[] = [
  { name: 'Mint Pro', value: 'mint-pro', description: 'Fresh green tones for a modern look' },
  { name: 'Sunset Orange', value: 'sunset-orange', description: 'Warm orange for energetic vibes' },
  { name: 'Royal Purple', value: 'royal-purple', description: 'Elegant purple for premium feel' },
  { name: 'Ocean Blue', value: 'ocean-blue', description: 'Calm blue for professional use' },
  { name: 'Dark Pro', value: 'dark-pro', description: 'Sleek dark mode for low-light' },
];

export default function Settings() {
  const { isAdmin, user } = useAuth();
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
            <Card>
              <CardHeader>
                <CardTitle>User Roles</CardTitle>
                <CardDescription>
                  Manage user access and permissions
                </CardDescription>
              </CardHeader>
              <CardContent>
                {userRoles.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Role</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {userRoles.map((ur: any) => (
                        <TableRow key={ur.id}>
                          <TableCell>
                            {ur.profiles?.display_name || 'Unknown User'}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                ur.role === 'admin'
                                  ? 'default'
                                  : ur.role === 'staff'
                                  ? 'secondary'
                                  : 'outline'
                              }
                            >
                              {ur.role}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-muted-foreground">
                    No users with assigned roles. Use the database to assign roles.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
