import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useBusinessSettings } from '@/hooks/useBusinessSettings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Search,
  Plus,
  Minus,
  Trash2,
  User,
  ShoppingCart,
  FileText,
  Save,
  CheckCircle,
  Filter,
  Package,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface CartItem {
  productId: string;
  name: string;
  unitPrice: number;
  costPrice: number;
  quantity: number;
}

export default function Billing() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: settings } = useBusinessSettings();
  
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [discountType, setDiscountType] = useState<'flat' | 'percent'>('flat');
  const [discountValue, setDiscountValue] = useState(0);
  const [isCustomerDialogOpen, setIsCustomerDialogOpen] = useState(false);

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
  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*, categories(name, color)')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  // Fetch customers
  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  const currencySymbol = settings?.currency_symbol || '$';
  const taxRate = settings?.tax_rate || 0;
  const taxInclusive = settings?.tax_inclusive || false;

  // Filter products
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || product.category_id === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchQuery, selectedCategory]);

  // Cart calculations
  const cartCalculations = useMemo(() => {
    const subtotal = cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    const discountAmount = discountType === 'percent' 
      ? (subtotal * discountValue) / 100 
      : discountValue;
    const afterDiscount = subtotal - discountAmount;
    const taxAmount = taxInclusive ? 0 : (afterDiscount * taxRate) / 100;
    const total = afterDiscount + taxAmount;

    return { subtotal, discountAmount, taxAmount, total };
  }, [cart, discountType, discountValue, taxRate, taxInclusive]);

  // Add to cart
  const addToCart = (product: typeof products[0]) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product.id);
      if (existing) {
        return prev.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          unitPrice: Number(product.selling_price),
          costPrice: Number(product.cost_price),
          quantity: 1,
        },
      ];
    });
  };

  // Update quantity
  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.productId === productId
            ? { ...item, quantity: Math.max(0, item.quantity + delta) }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  // Remove from cart
  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.productId !== productId));
  };

  // Generate date-based bill number (MMDDXXXX format)
  const generateBillNumber = async (): Promise<string> => {
    const today = new Date();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const datePrefix = `${month}${day}`;

    // Get today's bills count to determine sequence
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();

    const { count } = await supabase
      .from('bills')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startOfDay)
      .lt('created_at', endOfDay);

    const sequence = (count || 0) + 1;
    return `${datePrefix}${String(sequence).padStart(4, '0')}`;
  };

  // Create bill mutation
  const createBillMutation = useMutation({
    mutationFn: async (status: 'draft' | 'completed') => {
      // Get date-based bill number
      const billNumber = await generateBillNumber();

      // Create bill
      const { data: bill, error: billError } = await supabase
        .from('bills')
        .insert({
          bill_number: billNumber,
          customer_id: selectedCustomerId,
          created_by: user?.id,
          status,
          subtotal: cartCalculations.subtotal,
          discount_type: discountType,
          discount_value: discountValue,
          discount_amount: cartCalculations.discountAmount,
          tax_amount: cartCalculations.taxAmount,
          total_amount: cartCalculations.total,
          completed_at: status === 'completed' ? new Date().toISOString() : null,
        })
        .select()
        .single();

      if (billError) throw billError;

      // Create bill items
      const billItems = cart.map((item) => ({
        bill_id: bill.id,
        product_id: item.productId,
        product_name: item.name,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        cost_price: item.costPrice,
        total_price: item.unitPrice * item.quantity,
      }));

      const { error: itemsError } = await supabase
        .from('bill_items')
        .insert(billItems);

      if (itemsError) throw itemsError;


      // If completed, deduct stock
      if (status === 'completed') {
        for (const item of cart) {
          const product = products.find((p) => p.id === item.productId);
          if (product) {
            const newQuantity = product.stock_quantity - item.quantity;
            await supabase
              .from('products')
              .update({ stock_quantity: newQuantity })
              .eq('id', item.productId);
          }
        }
      }

      return bill;
    },
    onSuccess: (_, status) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['bills'] });
      queryClient.invalidateQueries({ queryKey: ['businessSettings'] });
      setCart([]);
      setSelectedCustomerId(null);
      setDiscountValue(0);
      toast.success(status === 'completed' ? 'Bill completed!' : 'Bill saved as draft');
    },
    onError: (error: Error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);

  return (
    <div className="flex h-[calc(100vh-7rem)] gap-4">
      {/* Left Panel - Filters (Hidden on mobile, shown in sheet) */}
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" size="icon" className="lg:hidden fixed bottom-20 left-4 z-50 h-12 w-12 rounded-full shadow-lg">
            <Filter className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64">
          <SheetHeader>
            <SheetTitle>Filters</SheetTitle>
          </SheetHeader>
          <FilterPanel
            categories={categories}
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
          />
        </SheetContent>
      </Sheet>

      <Card className="hidden lg:flex w-56 flex-shrink-0 flex-col">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Categories</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 p-2">
          <FilterPanel
            categories={categories}
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
          />
        </CardContent>
      </Card>

      {/* Center Panel - Products */}
      <div className="flex flex-1 flex-col gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <ScrollArea className="flex-1">
          {filteredProducts.length === 0 ? (
            <div className="flex h-40 items-center justify-center text-muted-foreground">
              <Package className="mr-2 h-5 w-5" />
              No products found
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {filteredProducts.map((product) => (
                <button
                  key={product.id}
                  onClick={() => addToCart(product)}
                  className="flex flex-col rounded-lg border border-border bg-card p-3 text-left transition-all hover:border-primary hover:shadow-md"
                >
                  <div className="flex items-start justify-between">
                    <span className="font-medium text-sm line-clamp-2">{product.name}</span>
                  </div>
                  {product.categories && (
                    <Badge
                      variant="secondary"
                      className="mt-1 w-fit text-xs"
                      style={{ 
                        backgroundColor: product.categories.color + '20',
                        color: product.categories.color
                      }}
                    >
                      {product.categories.name}
                    </Badge>
                  )}
                  <div className="mt-auto pt-2 flex items-center justify-between">
                    <span className="text-lg font-bold text-primary">
                      {currencySymbol}{Number(product.selling_price).toFixed(2)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Stock: {product.stock_quantity}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Right Panel - Cart */}
      <Card className="hidden md:flex w-80 flex-shrink-0 flex-col lg:w-96">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <ShoppingCart className="h-5 w-5" />
              Current Bill
            </CardTitle>
            <Badge variant="secondary">{cart.length} items</Badge>
          </div>
        </CardHeader>

        <CardContent className="flex flex-1 flex-col gap-4 overflow-hidden p-4">
          {/* Customer Selection */}
          <Dialog open={isCustomerDialogOpen} onOpenChange={setIsCustomerDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full justify-start">
                <User className="mr-2 h-4 w-4" />
                {selectedCustomer ? selectedCustomer.name : 'Select Customer'}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Select Customer</DialogTitle>
              </DialogHeader>
              <ScrollArea className="max-h-64">
                <div className="space-y-2">
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={() => {
                      setSelectedCustomerId(null);
                      setIsCustomerDialogOpen(false);
                    }}
                  >
                    Walk-in Customer
                  </Button>
                  {customers.map((customer) => (
                    <Button
                      key={customer.id}
                      variant={selectedCustomerId === customer.id ? 'secondary' : 'ghost'}
                      className="w-full justify-start"
                      onClick={() => {
                        setSelectedCustomerId(customer.id);
                        setIsCustomerDialogOpen(false);
                      }}
                    >
                      <div className="text-left">
                        <div>{customer.name}</div>
                        {customer.phone && (
                          <div className="text-xs text-muted-foreground">{customer.phone}</div>
                        )}
                      </div>
                    </Button>
                  ))}
                </div>
              </ScrollArea>
            </DialogContent>
          </Dialog>

          {/* Cart Items */}
          <ScrollArea className="flex-1">
            {cart.length === 0 ? (
              <div className="flex h-40 items-center justify-center text-muted-foreground">
                Cart is empty
              </div>
            ) : (
              <div className="space-y-2">
                {cart.map((item) => (
                  <div
                    key={item.productId}
                    className="flex items-center gap-2 rounded-lg border border-border p-2"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {currencySymbol}{item.unitPrice.toFixed(2)} × {item.quantity}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => updateQuantity(item.productId, -1)}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-8 text-center text-sm font-medium">
                        {item.quantity}
                      </span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => updateQuantity(item.productId, 1)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive"
                        onClick={() => removeFromCart(item.productId)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Discount */}
          <div className="flex gap-2">
            <Select
              value={discountType}
              onValueChange={(v) => setDiscountType(v as 'flat' | 'percent')}
            >
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="flat">{currencySymbol}</SelectItem>
                <SelectItem value="percent">%</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="number"
              placeholder="Discount"
              value={discountValue || ''}
              onChange={(e) => setDiscountValue(Number(e.target.value))}
              min={0}
            />
          </div>

          {/* Totals */}
          <div className="space-y-1 border-t border-border pt-3">
            <div className="flex justify-between text-sm">
              <span>Subtotal</span>
              <span>{currencySymbol}{cartCalculations.subtotal.toFixed(2)}</span>
            </div>
            {cartCalculations.discountAmount > 0 && (
              <div className="flex justify-between text-sm text-destructive">
                <span>Discount</span>
                <span>-{currencySymbol}{cartCalculations.discountAmount.toFixed(2)}</span>
              </div>
            )}
            {!taxInclusive && cartCalculations.taxAmount > 0 && (
              <div className="flex justify-between text-sm">
                <span>{settings?.tax_name || 'Tax'} ({taxRate}%)</span>
                <span>{currencySymbol}{cartCalculations.taxAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold">
              <span>Total</span>
              <span className="text-primary">
                {currencySymbol}{cartCalculations.total.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              disabled={cart.length === 0 || createBillMutation.isPending}
              onClick={() => createBillMutation.mutate('draft')}
            >
              <Save className="mr-2 h-4 w-4" />
              Save Draft
            </Button>
            <Button
              className="flex-1"
              disabled={cart.length === 0 || createBillMutation.isPending}
              onClick={() => createBillMutation.mutate('completed')}
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              Complete
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Mobile Cart Button */}
      <Sheet>
        <SheetTrigger asChild>
          <Button 
            className="md:hidden fixed bottom-4 right-4 z-50 h-14 w-14 rounded-full shadow-lg"
            size="icon"
          >
            <ShoppingCart className="h-6 w-6" />
            {cart.length > 0 && (
              <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-xs text-white">
                {cart.length}
              </span>
            )}
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-full sm:max-w-md p-0">
          <SheetHeader className="p-4 border-b">
            <SheetTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Current Bill ({cart.length} items)
            </SheetTitle>
          </SheetHeader>
          <div className="flex flex-col h-[calc(100%-4rem)] p-4 gap-4">
            {/* Customer Selection - Mobile */}
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => setIsCustomerDialogOpen(true)}
            >
              <User className="mr-2 h-4 w-4" />
              {selectedCustomer ? selectedCustomer.name : 'Select Customer'}
            </Button>

            {/* Cart Items - Mobile */}
            <ScrollArea className="flex-1">
              {cart.length === 0 ? (
                <div className="flex h-40 items-center justify-center text-muted-foreground">
                  Cart is empty
                </div>
              ) : (
                <div className="space-y-2">
                  {cart.map((item) => (
                    <div
                      key={item.productId}
                      className="flex items-center gap-2 rounded-lg border border-border p-2"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{item.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {currencySymbol}{item.unitPrice.toFixed(2)} × {item.quantity}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => updateQuantity(item.productId, -1)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-8 text-center font-medium">{item.quantity}</span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => updateQuantity(item.productId, 1)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => removeFromCart(item.productId)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>

            {/* Discount - Mobile */}
            <div className="flex gap-2">
              <Select
                value={discountType}
                onValueChange={(v) => setDiscountType(v as 'flat' | 'percent')}
              >
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="flat">{currencySymbol}</SelectItem>
                  <SelectItem value="percent">%</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="number"
                placeholder="Discount"
                value={discountValue || ''}
                onChange={(e) => setDiscountValue(Number(e.target.value))}
                min={0}
              />
            </div>

            {/* Totals - Mobile */}
            <div className="space-y-1 border-t border-border pt-3">
              <div className="flex justify-between text-sm">
                <span>Subtotal</span>
                <span>{currencySymbol}{cartCalculations.subtotal.toFixed(2)}</span>
              </div>
              {cartCalculations.discountAmount > 0 && (
                <div className="flex justify-between text-sm text-destructive">
                  <span>Discount</span>
                  <span>-{currencySymbol}{cartCalculations.discountAmount.toFixed(2)}</span>
                </div>
              )}
              {!taxInclusive && cartCalculations.taxAmount > 0 && (
                <div className="flex justify-between text-sm">
                  <span>{settings?.tax_name || 'Tax'} ({taxRate}%)</span>
                  <span>{currencySymbol}{cartCalculations.taxAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span className="text-primary">
                  {currencySymbol}{cartCalculations.total.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Actions - Mobile */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                disabled={cart.length === 0 || createBillMutation.isPending}
                onClick={() => createBillMutation.mutate('draft')}
              >
                <Save className="mr-2 h-4 w-4" />
                Draft
              </Button>
              <Button
                className="flex-1"
                disabled={cart.length === 0 || createBillMutation.isPending}
                onClick={() => createBillMutation.mutate('completed')}
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                Complete
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function FilterPanel({
  categories,
  selectedCategory,
  onSelectCategory,
}: {
  categories: Array<{ id: string; name: string; color: string | null }>;
  selectedCategory: string;
  onSelectCategory: (id: string) => void;
}) {
  return (
    <div className="space-y-1">
      <button
        onClick={() => onSelectCategory('all')}
        className={cn(
          'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors',
          selectedCategory === 'all'
            ? 'bg-primary text-primary-foreground'
            : 'hover:bg-accent'
        )}
      >
        <Package className="h-4 w-4" />
        All Products
      </button>
      {categories.map((category) => (
        <button
          key={category.id}
          onClick={() => onSelectCategory(category.id)}
          className={cn(
            'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors',
            selectedCategory === category.id
              ? 'bg-primary text-primary-foreground'
              : 'hover:bg-accent'
          )}
        >
          <span
            className="h-3 w-3 rounded-full"
            style={{ backgroundColor: category.color || '#3B82F6' }}
          />
          {category.name}
        </button>
      ))}
    </div>
  );
}
