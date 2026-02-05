import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useBusinessSettings } from '@/hooks/useBusinessSettings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
  ShoppingCart,
  Save,
  Printer,
  ChevronLeft,
  ChevronRight,
  Sparkles,
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
  const [customerName, setCustomerName] = useState('');
  const [discountValue, setDiscountValue] = useState(0);
  const [gstPercent, setGstPercent] = useState(0);
  const [isCartExpanded, setIsCartExpanded] = useState(true);
  const [isCustomerDialogOpen, setIsCustomerDialogOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

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

  const currencySymbol = '₹';
  const taxRate = gstPercent || settings?.tax_rate || 0;

  // Filter products
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || product.category_id === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchQuery, selectedCategory]);

  // Cart calculations - using Math.round to avoid floating point issues
  const cartCalculations = useMemo(() => {
    const subtotal = cart.reduce((sum, item) => sum + Math.round(item.unitPrice) * item.quantity, 0);
    const discountAmount = Math.round(discountValue);
    const afterDiscount = subtotal - discountAmount;
    const taxAmount = Math.round((afterDiscount * taxRate) / 100 * 100) / 100;
    const total = afterDiscount + taxAmount;

    return { subtotal, discountAmount, taxAmount, total };
  }, [cart, discountValue, taxRate]);

  // Add to cart - round prices to avoid floating point issues
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
          unitPrice: Math.round(Number(product.selling_price)),
          costPrice: Math.round(Number(product.cost_price)),
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

  // Get current preview bill number
  const [previewBillNumber, setPreviewBillNumber] = useState('');
  
  React.useEffect(() => {
    generateBillNumber().then(setPreviewBillNumber);
  }, []);

  // Print bill function
  const printBill = (billNumber: string) => {
    const printContent = `
      <html>
        <head>
          <title>Bill #${billNumber}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; max-width: 300px; margin: 0 auto; }
            .header { text-align: center; margin-bottom: 20px; }
            .header h1 { margin: 0; font-size: 18px; }
            .header p { margin: 5px 0; font-size: 12px; color: #666; }
            .bill-info { border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 10px 0; margin: 10px 0; }
            .bill-info p { margin: 3px 0; font-size: 12px; }
            .items { margin: 15px 0; }
            .item { display: flex; justify-content: space-between; font-size: 12px; margin: 5px 0; }
            .item-name { flex: 1; }
            .item-qty { width: 40px; text-align: center; }
            .item-price { width: 70px; text-align: right; }
            .totals { border-top: 1px dashed #000; padding-top: 10px; margin-top: 10px; }
            .total-row { display: flex; justify-content: space-between; font-size: 12px; margin: 3px 0; }
            .grand-total { font-size: 16px; font-weight: bold; border-top: 1px solid #000; padding-top: 5px; margin-top: 5px; }
            .footer { text-align: center; margin-top: 20px; font-size: 11px; color: #666; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${settings?.business_name || 'My Business'}</h1>
            ${settings?.address ? `<p>${settings.address}</p>` : ''}
            ${settings?.phone ? `<p>Ph: ${settings.phone}</p>` : ''}
          </div>
          <div class="bill-info">
            <p><strong>Bill #:</strong> ${billNumber}</p>
            <p><strong>Date:</strong> ${new Date().toLocaleDateString('en-IN')}</p>
            <p><strong>Time:</strong> ${new Date().toLocaleTimeString('en-IN')}</p>
            ${customerName || selectedCustomer?.name ? `<p><strong>Customer:</strong> ${customerName || selectedCustomer?.name}</p>` : ''}
          </div>
          <div class="items">
            <div class="item" style="font-weight: bold; border-bottom: 1px solid #000; padding-bottom: 5px;">
              <span class="item-name">Item</span>
              <span class="item-qty">Qty</span>
              <span class="item-price">Amount</span>
            </div>
            ${cart.map(item => `
              <div class="item">
                <span class="item-name">${item.name}</span>
                <span class="item-qty">${item.quantity}</span>
                <span class="item-price">₹${(item.unitPrice * item.quantity).toFixed(2)}</span>
              </div>
            `).join('')}
          </div>
          <div class="totals">
            <div class="total-row">
              <span>Subtotal:</span>
              <span>₹${cartCalculations.subtotal.toFixed(2)}</span>
            </div>
            ${discountValue > 0 ? `
              <div class="total-row">
                <span>Discount:</span>
                <span>-₹${cartCalculations.discountAmount.toFixed(2)}</span>
              </div>
            ` : ''}
            ${gstPercent > 0 ? `
              <div class="total-row">
                <span>GST (${gstPercent}%):</span>
                <span>₹${cartCalculations.taxAmount.toFixed(2)}</span>
              </div>
            ` : ''}
            <div class="total-row grand-total">
              <span>Total:</span>
              <span>₹${cartCalculations.total.toFixed(2)}</span>
            </div>
          </div>
          <div class="footer">
            <p>Thank you for your purchase!</p>
          </div>
        </body>
      </html>
    `;
    
    const printWindow = window.open('', '_blank', 'width=400,height=600');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    }
  };

  // Create bill mutation
  const createBillMutation = useMutation({
    mutationFn: async (shouldPrint: boolean) => {
      const billNumber = await generateBillNumber();

      const { data: bill, error: billError } = await supabase
        .from('bills')
        .insert({
          bill_number: billNumber,
          customer_id: selectedCustomerId,
          created_by: user?.id,
          status: 'completed' as const,
          subtotal: cartCalculations.subtotal,
          discount_type: 'flat',
          discount_value: discountValue,
          discount_amount: cartCalculations.discountAmount,
          tax_amount: cartCalculations.taxAmount,
          total_amount: cartCalculations.total,
          completed_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (billError) throw billError;

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

      // Update stock quantities
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

      return { bill, billNumber, shouldPrint };
    },
    onSuccess: ({ billNumber, shouldPrint }) => {
      if (shouldPrint) {
        printBill(billNumber);
      }
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['bills'] });
      setCart([]);
      setCustomerName('');
      setSelectedCustomerId(null);
      setDiscountValue(0);
      setGstPercent(0);
      generateBillNumber().then(setPreviewBillNumber);
      toast.success(shouldPrint ? 'Bill saved & printed!' : 'Bill saved successfully!');
    },
    onError: (error: Error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="flex h-[calc(100vh-7rem)] gap-0">
      {/* Left Panel - Categories */}
      <div className="hidden lg:flex w-52 flex-shrink-0 flex-col border-r border-border bg-card">
        <ScrollArea className="flex-1 p-2">
          <div className="space-y-1">
            {/* All Items Button */}
            <button
              onClick={() => setSelectedCategory('all')}
              className={cn(
                'flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all',
                selectedCategory === 'all'
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'hover:bg-accent'
              )}
            >
              <Sparkles className="h-4 w-4" />
              All Items
            </button>

            {/* Category Buttons */}
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all',
                  selectedCategory === category.id
                    ? 'bg-primary text-primary-foreground shadow-md'
                    : 'hover:bg-accent'
                )}
              >
                <span
                  className="h-4 w-4 rounded-full flex-shrink-0"
                  style={{ backgroundColor: category.color || '#3B82F6' }}
                />
                <span className="truncate">{category.name}</span>
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Center Panel - Products */}
      <div className="flex flex-1 flex-col">
        {/* Search Bar */}
        <div className="p-3 border-b border-border bg-card">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-background"
            />
          </div>
        </div>

        {/* Products Grid */}
        <ScrollArea className="flex-1 p-3">
          {filteredProducts.length === 0 ? (
            <div className="flex h-40 items-center justify-center text-muted-foreground">
              <Package className="mr-2 h-5 w-5" />
              No products found
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-2">
              {filteredProducts.map((product) => (
                <button
                  key={product.id}
                  onClick={() => addToCart(product)}
                  className="relative flex flex-col items-center rounded-lg border border-border bg-card p-2 text-center transition-all hover:border-primary hover:shadow-md group"
                >
                  {/* Stock Badge */}
                  <Badge
                    variant="secondary"
                    className={cn(
                      'absolute -top-1 -right-1 text-[10px] px-1.5 py-0',
                      product.stock_quantity <= product.low_stock_threshold
                        ? 'bg-red-100 text-red-700'
                        : 'bg-green-100 text-green-700'
                    )}
                  >
                    {product.stock_quantity <= product.low_stock_threshold ? `${product.stock_quantity}` : `${product.stock_quantity}+`}
                  </Badge>

                  {/* Product Name */}
                  <span className="text-xs font-medium line-clamp-2 mt-1 min-h-[2rem]">
                    {product.name}
                  </span>

                  {/* Price */}
                  <span className="text-sm font-bold text-primary mt-1">
                    {currencySymbol}{Number(product.selling_price).toFixed(0)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Right Panel - Cart (Collapsible) */}
      <div
        className={cn(
          'hidden md:flex flex-col border-l border-border bg-card transition-all duration-300',
          isCartExpanded ? 'w-80 lg:w-96' : 'w-12'
        )}
      >
        {/* Collapse/Expand Button */}
        <button
          onClick={() => setIsCartExpanded(!isCartExpanded)}
          className="absolute right-0 top-1/2 -translate-y-1/2 -translate-x-full z-10 bg-primary text-primary-foreground rounded-l-md p-1 shadow-md hover:bg-primary/90"
          style={{ marginRight: isCartExpanded ? '24rem' : '3rem' }}
        >
          {isCartExpanded ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>

        {isCartExpanded ? (
          <>
            {/* Bill Header */}
            <div className="p-4 border-b border-border">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold">Bill #{previewBillNumber}</h2>
                  <p className="text-sm text-muted-foreground">{totalItems} items</p>
                </div>
                <ShoppingCart className="h-6 w-6 text-muted-foreground" />
              </div>
            </div>

            {/* Customer Name Input */}
            <div className="px-4 py-2 border-b border-border">
              <Input
                placeholder="Customer name"
                value={customerName || selectedCustomer?.name || ''}
                onChange={(e) => setCustomerName(e.target.value)}
                onClick={() => setIsCustomerDialogOpen(true)}
                className="bg-background"
              />
            </div>

            {/* Cart Items */}
            <ScrollArea className="flex-1 px-4">
              {cart.length === 0 ? (
                <div className="flex flex-col h-40 items-center justify-center text-muted-foreground">
                  <ShoppingCart className="h-12 w-12 mb-2 opacity-20" />
                  <p>Cart is empty</p>
                  <p className="text-xs">Tap products to add</p>
                </div>
              ) : (
                <div className="space-y-2 py-2">
                  {cart.map((item) => (
                    <div
                      key={item.productId}
                      className="flex items-center gap-2 rounded-lg border border-border p-2 bg-background"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{item.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {currencySymbol}{item.unitPrice.toFixed(0)} × {item.quantity} = {currencySymbol}{(item.unitPrice * item.quantity).toFixed(0)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => updateQuantity(item.productId, -1)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-6 text-center text-sm font-medium">
                          {item.quantity}
                        </span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => updateQuantity(item.productId, 1)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-destructive"
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

            {/* Totals Section */}
            <div className="p-4 border-t border-border space-y-3">
              {/* Subtotal */}
              <div className="flex justify-between text-sm">
                <span>Subtotal</span>
                <span>{currencySymbol}{cartCalculations.subtotal.toFixed(2)}</span>
              </div>

              {/* Discount Input */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm">Discount</span>
                <div className="flex items-center gap-1">
                  <span className="text-sm">{currencySymbol}</span>
                  <Input
                    type="number"
                    value={discountValue || ''}
                    onChange={(e) => setDiscountValue(Number(e.target.value))}
                    className="w-20 h-8 text-right"
                    min={0}
                  />
                </div>
              </div>

              {/* GST Input */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm">GST %</span>
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    value={gstPercent || ''}
                    onChange={(e) => setGstPercent(Number(e.target.value))}
                    className="w-20 h-8 text-right"
                    min={0}
                  />
                  <span className="text-sm">%</span>
                </div>
              </div>

              {/* Total */}
              <div className="flex justify-between text-xl font-bold pt-2 border-t">
                <span>Total</span>
                <span className="text-primary">
                  {currencySymbol}{cartCalculations.total.toFixed(2)}
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  disabled={cart.length === 0 || createBillMutation.isPending}
                  onClick={() => createBillMutation.mutate(false)}
                >
                  <Save className="mr-2 h-4 w-4" />
                  Save Bill
                </Button>
                <Button
                  className="flex-1"
                  disabled={cart.length === 0 || createBillMutation.isPending}
                  onClick={() => createBillMutation.mutate(true)}
                >
                  <Printer className="mr-2 h-4 w-4" />
                  Save & Print
                </Button>
              </div>
            </div>
          </>
        ) : (
          /* Collapsed state - just show cart icon */
          <div className="flex flex-col items-center py-4">
            <ShoppingCart className="h-6 w-6 text-muted-foreground" />
            {cart.length > 0 && (
              <Badge className="mt-2">{cart.length}</Badge>
            )}
          </div>
        )}
      </div>

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
              Bill #{previewBillNumber} ({totalItems} items)
            </SheetTitle>
          </SheetHeader>
          <div className="flex flex-col h-[calc(100%-4rem)] p-4 gap-4">
            <Input
              placeholder="Customer name"
              value={customerName || selectedCustomer?.name || ''}
              onChange={(e) => setCustomerName(e.target.value)}
            />

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
                          {currencySymbol}{item.unitPrice.toFixed(0)} × {item.quantity}
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

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Subtotal</span>
                <span>{currencySymbol}{cartCalculations.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Discount</span>
                <Input
                  type="number"
                  value={discountValue || ''}
                  onChange={(e) => setDiscountValue(Number(e.target.value))}
                  className="w-24 h-8"
                  min={0}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">GST %</span>
                <Input
                  type="number"
                  value={gstPercent || ''}
                  onChange={(e) => setGstPercent(Number(e.target.value))}
                  className="w-24 h-8"
                  min={0}
                />
              </div>
              <div className="flex justify-between text-lg font-bold pt-2 border-t">
                <span>Total</span>
                <span className="text-primary">{currencySymbol}{cartCalculations.total.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                disabled={cart.length === 0 || createBillMutation.isPending}
                onClick={() => createBillMutation.mutate(false)}
              >
                <Save className="mr-2 h-4 w-4" />
                Save
              </Button>
              <Button
                className="flex-1"
                disabled={cart.length === 0 || createBillMutation.isPending}
                onClick={() => createBillMutation.mutate(true)}
              >
                <Printer className="mr-2 h-4 w-4" />
                Save & Print
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Customer Selection Dialog */}
      <Dialog open={isCustomerDialogOpen} onOpenChange={setIsCustomerDialogOpen}>
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
                  setCustomerName('');
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
                    setCustomerName(customer.name);
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
    </div>
  );
}
