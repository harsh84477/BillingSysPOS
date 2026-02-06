import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useBusinessSettings } from '@/hooks/useBusinessSettings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Pencil, Trash2, Package, Search, AlertTriangle, icons, Download, Filter, X } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { exportToExcel } from '@/lib/exportToExcel';

interface Product {
  id: string;
  name: string;
  description: string | null;
  selling_price: number;
  cost_price: number;
  stock_quantity: number;
  low_stock_threshold: number;
  category_id: string | null;
  icon: string | null;
  is_active: boolean;
  categories?: { name: string; color: string | null } | null;
}

const PRODUCT_ICONS = [
  'Package', 'Cigarette', 'Flame', 'Droplet', 'Coffee', 'Cookie', 'Candy',
  'Apple', 'Sandwich', 'Pizza', 'IceCream', 'Beer', 'Wine', 'Milk',
  'ShoppingBag', 'Gift', 'Box', 'Boxes', 'Archive', 'PackageCheck',
];

export default function Products() {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const { data: settings } = useBusinessSettings();
  const currencySymbol = settings?.currency_symbol || '$';

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('Package');
  const [showFilters, setShowFilters] = useState(false);
  
  // Filters
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [stockFilter, setStockFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

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

  // Fetch products
  const { data: products, isLoading } = useQuery({
    queryKey: ['products', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*, categories(name, color)')
        .order('name');
      if (error) throw error;
      return data as Product[];
    },
  });

  const renderIcon = (iconName: string | null) => {
    const name = iconName || 'Package';
    const LucideIcon = icons[name as keyof typeof icons];
    return LucideIcon ? <LucideIcon className="h-5 w-5 text-muted-foreground" /> : <Package className="h-5 w-5 text-muted-foreground" />;
  };

  // Create/Update product
  const saveMutation = useMutation({
    mutationFn: async (product: Partial<Product>) => {
      if (editingProduct) {
        const { error } = await supabase
          .from('products')
          .update(product)
          .eq('id', editingProduct.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('products').insert([product as { name: string }]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setIsDialogOpen(false);
      setEditingProduct(null);
      toast.success(editingProduct ? 'Product updated' : 'Product created');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Delete product
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Product deleted');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    saveMutation.mutate({
      name: formData.get('name') as string,
      description: formData.get('description') as string || null,
      selling_price: Number(formData.get('selling_price')),
      cost_price: Number(formData.get('cost_price')),
      stock_quantity: Number(formData.get('stock_quantity')),
      low_stock_threshold: Number(formData.get('low_stock_threshold')),
      category_id: formData.get('category_id') as string || null,
      icon: selectedIcon,
    });
  };

  const openDialog = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setSelectedIcon(product.icon || 'Package');
    } else {
      setEditingProduct(null);
      setSelectedIcon('Package');
    }
    setIsDialogOpen(true);
  };

  const filteredProducts = useMemo(() => {
    return products?.filter((p) => {
      // Search filter
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Category filter
      const matchesCategory = categoryFilter === 'all' || 
        (categoryFilter === 'none' && !p.category_id) ||
        p.category_id === categoryFilter;
      
      // Stock filter
      let matchesStock = true;
      if (stockFilter === 'low') {
        matchesStock = p.stock_quantity <= p.low_stock_threshold;
      } else if (stockFilter === 'out') {
        matchesStock = p.stock_quantity === 0;
      } else if (stockFilter === 'in-stock') {
        matchesStock = p.stock_quantity > p.low_stock_threshold;
      }
      
      // Status filter
      const matchesStatus = statusFilter === 'all' || 
        (statusFilter === 'active' && p.is_active) ||
        (statusFilter === 'inactive' && !p.is_active);
      
      return matchesSearch && matchesCategory && matchesStock && matchesStatus;
    }) || [];
  }, [products, searchQuery, categoryFilter, stockFilter, statusFilter]);

  const clearFilters = () => {
    setCategoryFilter('all');
    setStockFilter('all');
    setStatusFilter('all');
  };

  const hasActiveFilters = categoryFilter !== 'all' || stockFilter !== 'all' || statusFilter !== 'all';

  const handleExportExcel = () => {
    if (filteredProducts.length === 0) {
      toast.error('No data to export');
      return;
    }

    exportToExcel(
      filteredProducts,
      [
        { key: 'name', header: 'Product Name' },
        { key: 'categories', header: 'Category', format: (v) => (v as { name: string } | null)?.name || 'None' },
        { key: 'selling_price', header: 'Selling Price', format: (v) => Number(v).toFixed(2) },
        { key: 'cost_price', header: 'Cost Price', format: (v) => Number(v).toFixed(2) },
        { key: 'stock_quantity', header: 'Stock' },
        { key: 'low_stock_threshold', header: 'Low Stock Alert' },
        { key: 'is_active', header: 'Status', format: (v) => v ? 'Active' : 'Inactive' },
      ],
      `products-${format(new Date(), 'yyyy-MM-dd')}`
    );
    toast.success('Exported successfully');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Products</h1>
          <p className="text-muted-foreground">Manage your product inventory</p>
        </div>

        <div className="flex gap-2">
          <Button onClick={handleExportExcel} variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export Excel
          </Button>
          
          {isAdmin && (
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) {
                setEditingProduct(null);
                setSelectedIcon('Package');
              }
            }}>
              <DialogTrigger asChild>
                <Button onClick={() => openDialog()}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Product
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>
                    {editingProduct ? 'Edit Product' : 'Add Product'}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name *</Label>
                    <Input
                      id="name"
                      name="name"
                      defaultValue={editingProduct?.name}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      name="description"
                      defaultValue={editingProduct?.description || ''}
                      rows={2}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="selling_price">Selling Price *</Label>
                      <Input
                        id="selling_price"
                        name="selling_price"
                        type="number"
                        step="0.01"
                        min="0"
                        defaultValue={editingProduct?.selling_price || 0}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cost_price">Cost Price</Label>
                      <Input
                        id="cost_price"
                        name="cost_price"
                        type="number"
                        step="0.01"
                        min="0"
                        defaultValue={editingProduct?.cost_price || 0}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="stock_quantity">Stock Quantity</Label>
                      <Input
                        id="stock_quantity"
                        name="stock_quantity"
                        type="number"
                        min="0"
                        defaultValue={editingProduct?.stock_quantity || 0}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="low_stock_threshold">Low Stock Alert</Label>
                      <Input
                        id="low_stock_threshold"
                        name="low_stock_threshold"
                        type="number"
                        min="0"
                        defaultValue={editingProduct?.low_stock_threshold || 10}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category_id">Category</Label>
                    <Select name="category_id" defaultValue={editingProduct?.category_id || ''}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Icon</Label>
                    <div className="grid grid-cols-5 gap-2 max-h-32 overflow-y-auto p-1 border rounded-md">
                      {PRODUCT_ICONS.map((iconName) => {
                        const IconComponent = icons[iconName as keyof typeof icons];
                        return IconComponent ? (
                          <button
                            key={iconName}
                            type="button"
                            onClick={() => setSelectedIcon(iconName)}
                            className={`p-2 rounded-md flex items-center justify-center transition-colors ${
                              selectedIcon === iconName
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted hover:bg-muted/80'
                            }`}
                          >
                            <IconComponent className="h-5 w-5" />
                          </button>
                        ) : null;
                      })}
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={saveMutation.isPending}>
                      {saveMutation.isPending ? 'Saving...' : 'Save'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button 
                variant={hasActiveFilters ? "default" : "outline"} 
                size="icon"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-4 w-4" />
              </Button>
            </div>
            
            {showFilters && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-4 bg-muted/50 rounded-lg">
                <div className="space-y-1">
                  <Label className="text-xs">Category</Label>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      <SelectItem value="none">No Category</SelectItem>
                      {categories.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-1">
                  <Label className="text-xs">Stock Status</Label>
                  <Select value={stockFilter} onValueChange={setStockFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Stock</SelectItem>
                      <SelectItem value="in-stock">In Stock</SelectItem>
                      <SelectItem value="low">Low Stock</SelectItem>
                      <SelectItem value="out">Out of Stock</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-1">
                  <Label className="text-xs">Status</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {hasActiveFilters && (
                  <div className="col-span-2 md:col-span-3">
                    <Button variant="ghost" size="sm" onClick={clearFilters}>
                      <X className="mr-1 h-3 w-3" />
                      Clear Filters
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredProducts && filteredProducts.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Stock</TableHead>
                    {isAdmin && <TableHead className="w-24">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                            {renderIcon(product.icon)}
                          </div>
                          <div>
                            <p className="font-medium">{product.name}</p>
                            {product.description && (
                              <p className="text-xs text-muted-foreground line-clamp-1">
                                {product.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {product.categories ? (
                          <Badge
                            variant="secondary"
                            style={{
                              backgroundColor: product.categories.color + '20',
                              color: product.categories.color || undefined,
                            }}
                          >
                            {product.categories.name}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {currencySymbol}{Number(product.selling_price).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {product.stock_quantity <= product.low_stock_threshold && (
                            <AlertTriangle className="h-4 w-4 text-destructive" />
                          )}
                          <span
                            className={
                              product.stock_quantity <= product.low_stock_threshold
                                ? 'text-destructive font-medium'
                                : ''
                            }
                          >
                            {product.stock_quantity}
                          </span>
                        </div>
                      </TableCell>
                      {isAdmin && (
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openDialog(product)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive"
                              onClick={() => {
                                if (confirm('Delete this product?')) {
                                  deleteMutation.mutate(product.id);
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
            </div>
          ) : (
            <div className="flex h-40 items-center justify-center text-muted-foreground">
              <Package className="mr-2 h-5 w-5" />
              No products found
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
