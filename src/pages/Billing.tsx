// @ts-nocheck
import React, { useState, useMemo, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useBusinessSettings } from '@/hooks/useBusinessSettings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
  Apple,
  Beef,
  Beer,
  Bike,
  Book,
  Cake,
  Car,
  Coffee,
  Cookie,
  Cpu,
  Fish,
  Flame,
  Flower,
  Gift,
  Grape,
  Ham,
  Headphones,
  Home,
  IceCream,
  Lamp,
  Laptop,
  Leaf,
  Milk,
  Monitor,
  Music,
  Phone,
  Pizza,
  Salad,
  Sandwich,
  Scissors,
  Shirt,
  ShoppingBag,
  Smartphone,
  Smile,
  Star,
  Sun,
  Tablet,
  Tag,
  Tv,
  Watch,
  Wine,
  Wrench,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// Safe icon map — avoids the broken `icons` bulk export from lucide-react
const ICON_MAP: Record<string, LucideIcon> = {
  Package, Apple, Beef, Beer, Bike, Book, Cake, Car, Coffee, Cookie, Cpu,
  Fish, Flame, Flower, Gift, Grape, Ham, Headphones, Home, IceCream, Lamp,
  Laptop, Leaf, Milk, Monitor, Music, Phone, Pizza, Salad, Sandwich,
  Scissors, Shirt, ShoppingBag, ShoppingCart, Smartphone, Smile, Star, Sun,
  Tablet, Tag, Tv, Watch, Wine, Wrench,
};

interface CartItem {
  productId: string;
  name: string;
  unitPrice: number;
  costPrice: number;
  quantity: number;
}

export default function Billing() {
  const { user, businessId, billPrefix, userRole } = useAuth();
  const queryClient = useQueryClient();
  const { data: settings } = useBusinessSettings();

  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [customerName, setCustomerName] = useState('');
  const [discountValue, setDiscountValue] = useState(0);
  const [applyGst, setApplyGst] = useState(true);

  // Sync applyGst with settings once settings load
  React.useEffect(() => {
    if (settings && settings.show_gst_in_billing !== undefined) {
      setApplyGst(settings.show_gst_in_billing);
    }
  }, [settings?.show_gst_in_billing]);
  const [isCartExpanded, setIsCartExpanded] = useState(true);
  const [isCustomerDialogOpen, setIsCustomerDialogOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

  // Long-press quantity dialog state
  const [quantityDialogOpen, setQuantityDialogOpen] = useState(false);
  const [quantityDialogProduct, setQuantityDialogProduct] = useState<{
    id: string;
    name: string;
    selling_price: number | string;
    cost_price: number | string;
    icon?: string | null;
    stock_quantity: number;
    low_stock_threshold: number;
    [key: string]: unknown;
  } | null>(null);
  const [quantityDialogValue, setQuantityDialogValue] = useState('');
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cart quantity edit state
  const [editingCartItemId, setEditingCartItemId] = useState<string | null>(null);
  const [editingCartQuantity, setEditingCartQuantity] = useState('');

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

  // Fetch products
  const { data: products = [] } = useQuery({
    queryKey: ['products', businessId],
    queryFn: async () => {
      let query = supabase
        .from('products')
        .select('*, categories(name, color)')
        .eq('is_active', true);
      if (businessId) query = query.eq('business_id', businessId);
      const { data, error } = await query.order('name');
      if (error) throw error;
      return data;
    },
    enabled: !!businessId,
  });

  // Fetch customers
  const { data: customers = [] } = useQuery({
    queryKey: ['customers', businessId],
    queryFn: async () => {
      let query = supabase
        .from('customers')
        .select('*');
      if (businessId) query = query.eq('business_id', businessId);
      const { data, error } = await query.order('name');
      if (error) throw error;
      return data;
    },
    enabled: !!businessId,
  });

  const currencySymbol = settings?.currency_symbol || '₹';
  const taxRate = settings?.tax_rate || 0;

  // Filter products
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || product.category_id === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchQuery, selectedCategory]);

  // Cart calculations - preserving decimals
  const cartCalculations = useMemo(() => {
    const subtotal = cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    const calculatedTax = Number(((subtotal * taxRate) / 100).toFixed(2));
    const taxAmount = applyGst ? calculatedTax : 0;
    const totalBeforeDiscount = subtotal + taxAmount;
    const discountAmount = discountValue;
    const total = Math.max(0, totalBeforeDiscount - discountAmount);

    return { subtotal, discountAmount, taxAmount, calculatedTax, total };
  }, [cart, discountValue, taxRate, applyGst]);

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

  // Set exact quantity for cart item
  const setQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart((prev) =>
      prev.map((item) =>
        item.productId === productId
          ? { ...item, quantity }
          : item
      )
    );
  };

  // Add to cart with specific quantity (for long-press)
  const addToCartWithQuantity = (product: typeof products[0], quantity: number) => {
    if (quantity <= 0) return;
    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product.id);
      if (existing) {
        return prev.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + quantity }
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
          quantity,
        },
      ];
    });
  };

  // Long press handlers
  const handleProductTouchStart = useCallback((product: typeof products[0]) => {
    longPressTimerRef.current = setTimeout(() => {
      setQuantityDialogProduct(product);
      setQuantityDialogValue('');
      setQuantityDialogOpen(true);
    }, 800); // 800ms for long press
  }, []);

  const handleProductTouchEnd = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const handleQuantityDialogConfirm = () => {
    const qty = parseInt(quantityDialogValue, 10);
    if (quantityDialogProduct && qty > 0) {
      addToCartWithQuantity(quantityDialogProduct, qty);
      toast.success(`Added ${qty}× ${quantityDialogProduct.name}`);
    }
    setQuantityDialogOpen(false);
    setQuantityDialogProduct(null);
    setQuantityDialogValue('');
  };

  // Cart quantity edit handlers
  const handleCartQuantityClick = (productId: string, currentQty: number) => {
    setEditingCartItemId(productId);
    setEditingCartQuantity(currentQty.toString());
  };

  const handleCartQuantityBlur = (productId: string) => {
    const qty = parseInt(editingCartQuantity, 10);
    if (!isNaN(qty)) {
      setQuantity(productId, qty);
    }
    setEditingCartItemId(null);
    setEditingCartQuantity('');
  };

  const handleCartQuantityKeyDown = (e: React.KeyboardEvent, productId: string) => {
    if (e.key === 'Enter') {
      handleCartQuantityBlur(productId);
    } else if (e.key === 'Escape') {
      setEditingCartItemId(null);
      setEditingCartQuantity('');
    }
  };

  // Remove from cart
  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.productId !== productId));
  };

  // Generate date-based bill number with user prefix
  const generateBillNumber = async (retryCount = 0): Promise<string> => {
    const today = new Date();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');

    // Combine Business Prefix and Personal Collector Code
    // Format: [Business]-[Collector]-[MMDD][Sequence]
    const businessPrefix = settings?.bill_prefix?.trim() || 'INV';
    const collectorCode = billPrefix?.trim() || '';

    let combinedPrefix = businessPrefix;

    // Add collector code if available
    if (collectorCode) {
      // Ensure business prefix doesn't end with hyphen before adding our own
      const base = businessPrefix.endsWith('-') ? businessPrefix.slice(0, -1) : businessPrefix;
      combinedPrefix = `${base}-${collectorCode}`;
    }

    // Ensure it ends with a hyphen before the date/sequence part
    if (!combinedPrefix.endsWith('-')) combinedPrefix += '-';

    const datePrefix = `${combinedPrefix}${month}${day}`;

    // Get the highest bill number for today matching this prefix
    const { data: latestBill } = await supabase
      .from('bills')
      .select('bill_number')
      .like('bill_number', `${datePrefix}%`)
      .order('bill_number', { ascending: false })
      .limit(1)
      .maybeSingle();

    let sequence = 1;
    if (latestBill?.bill_number) {
      // Extract the sequence part (last 4 digits)
      const numberStr = latestBill.bill_number;
      const sequencePart = numberStr.slice(-4);
      const lastSequence = parseInt(sequencePart, 10);
      if (!isNaN(lastSequence)) {
        sequence = lastSequence + 1 + retryCount;
      }
    }

    return `${datePrefix}${String(sequence).padStart(4, '0')}`;
  };

  // Get current preview bill number
  const [previewBillNumber, setPreviewBillNumber] = useState('');

  React.useEffect(() => {
    generateBillNumber().then(setPreviewBillNumber);
  }, []);

  // Print bill function using a hidden iframe for better mobile compatibility
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
                <span class="item-price">${currencySymbol}${(item.unitPrice * item.quantity).toFixed(2)}</span>
              </div>
            `).join('')}
          </div>
          <div class="totals">
            <div class="total-row">
              <span>Subtotal:</span>
              <span>${currencySymbol}${cartCalculations.subtotal.toFixed(2)}</span>
            </div>
            ${taxRate > 0 && applyGst ? `
              <div class="total-row">
                <span>GST (${taxRate}%):</span>
                <span>${currencySymbol}${cartCalculations.taxAmount.toFixed(2)}</span>
              </div>
            ` : ''}
            ${discountValue > 0 ? `
              <div class="total-row">
                <span>Discount:</span>
                <span>-${currencySymbol}${cartCalculations.discountAmount.toFixed(2)}</span>
              </div>
            ` : ''}
            <div class="total-row grand-total">
              <span>Total:</span>
              <span>${currencySymbol}${cartCalculations.total.toFixed(2)}</span>
            </div>
          </div>
          <div class="footer">
            <p>Thank you for your purchase!</p>
          </div>
        </body>
      </html>
    `;

    // Create a hidden iframe
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (doc) {
      doc.open();
      doc.write(printContent);
      doc.close();

      // Wait for content to be ready
      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
          // Remove the iframe after a delay to ensure print dialog opened
          setTimeout(() => {
            document.body.removeChild(iframe);
          }, 1000);
        } catch (e) {
          console.error('Print error:', e);
          document.body.removeChild(iframe);
        }
      }, 500);
    }
  };

  // Create bill mutation with retry logic for duplicate key handling
  const createBillMutation = useMutation({
    mutationFn: async (shouldPrint: boolean) => {
      let retryCount = 0;
      const maxRetries = 3;

      while (retryCount < maxRetries) {
        const billNumber = await generateBillNumber(retryCount);
        let finalCustomerId = selectedCustomerId;

        // Auto-create customer if name provided but not selected from list
        if (!finalCustomerId && customerName.trim()) {
          const { data: newCustomer, error: customerError } = await supabase
            .from('customers')
            .insert({
              name: customerName.trim(),
              business_id: businessId,
            })
            .select()
            .single();

          if (customerError) throw customerError;
          finalCustomerId = newCustomer.id;
        }

        const { data: bill, error: billError } = await supabase
          .from('bills')
          .insert({
            bill_number: billNumber,
            customer_id: finalCustomerId,
            created_by: user?.id,
            business_id: businessId,
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

        if (billError) {
          // Check if it's a duplicate key error
          if (billError.code === '23505' && retryCount < maxRetries - 1) {
            retryCount++;
            continue;
          }
          throw billError;
        }

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
      }

      throw new Error('Failed to generate unique bill number after multiple attempts');
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
      setApplyGst(true);
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
    <div className="flex h-[calc(100dvh-3.5rem-env(safe-area-inset-bottom))] sm:h-[calc(100vh-7rem)] gap-0 -m-3 sm:-m-4 lg:-m-6">
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
        {/* Search Bar + Mobile Category Scroll */}
        <div className="border-b border-border bg-card">
          <div className="p-2.5">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-background h-9"
              />
            </div>
          </div>
          {/* Mobile horizontal category scroll */}
          <div className="lg:hidden flex gap-1.5 overflow-x-auto px-2.5 pb-2.5 scrollbar-hide">
            <button
              onClick={() => setSelectedCategory('all')}
              className={cn(
                'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all whitespace-nowrap shrink-0',
                selectedCategory === 'all'
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'bg-accent hover:bg-accent/80'
              )}
            >
              <Sparkles className="h-3 w-3" />
              All
            </button>
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={cn(
                  'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all whitespace-nowrap shrink-0',
                  selectedCategory === category.id
                    ? 'bg-primary text-primary-foreground shadow-md'
                    : 'bg-accent hover:bg-accent/80'
                )}
              >
                <span
                  className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: category.color || '#3B82F6' }}
                />
                {category.name}
              </button>
            ))}
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
            <div className="grid grid-cols-2 min-[480px]:grid-cols-3 sm:grid-cols-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
              {filteredProducts.map((product) => {
                const iconName = product.icon || 'Package';
                const IconComponent = ICON_MAP[iconName] || Package;

                return (
                  <button
                    key={product.id}
                    onClick={() => addToCart(product)}
                    onMouseDown={() => handleProductTouchStart(product)}
                    onMouseUp={handleProductTouchEnd}
                    onMouseLeave={handleProductTouchEnd}
                    onTouchStart={() => handleProductTouchStart(product)}
                    onTouchEnd={handleProductTouchEnd}
                    onContextMenu={(e) => e.preventDefault()}
                    className="relative flex flex-col items-center rounded-xl border border-border bg-card p-2.5 sm:p-3 text-center transition-all hover:border-primary hover:shadow-lg group select-none h-full min-h-[120px]"
                  >
                    {/* Stock Badge */}
                    <Badge
                      variant="secondary"
                      className={cn(
                        'absolute -top-1.5 -right-1.5 text-[10px] px-1.5 py-0.5',
                        product.stock_quantity <= product.low_stock_threshold
                          ? 'bg-destructive/10 text-destructive'
                          : 'bg-accent text-accent-foreground'
                      )}
                    >
                      {product.stock_quantity}
                    </Badge>

                    {/* Icon */}
                    <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-primary/5 group-hover:bg-primary/10 mb-2 transition-colors">
                      <IconComponent className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                    </div>

                    {/* Product Name */}
                    <span className="text-xs sm:text-sm font-semibold line-clamp-2 leading-tight mb-2">
                      {product.name}
                    </span>

                    {/* Price */}
                    <span className="text-sm sm:text-base font-bold text-primary mt-auto">
                      {currencySymbol}{Number(product.selling_price).toFixed(2)}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Right Panel - Cart (Collapsible) */}
      <div
        className={cn(
          'relative hidden md:flex flex-col border-l border-border bg-card transition-all duration-300',
          isCartExpanded ? 'w-80 lg:w-96' : 'w-12'
        )}
      >
        {/* Collapse/Expand Button */}
        <button
          onClick={() => setIsCartExpanded(!isCartExpanded)}
          className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full z-10 bg-primary text-primary-foreground rounded-l-md p-1 shadow-md hover:bg-primary/90"
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
            <div className="px-4 py-2 border-b border-border flex gap-2">
              <Input
                placeholder="Customer name (or select ->)"
                value={customerName || (selectedCustomerId ? customers.find(c => c.id === selectedCustomerId)?.name : '') || ''}
                onChange={(e) => {
                  setCustomerName(e.target.value);
                  if (selectedCustomerId) setSelectedCustomerId(null); // Clear selected if typing
                }}
                className="bg-background flex-1"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => setIsCustomerDialogOpen(true)}
                title="Select Customer"
              >
                <Users className="h-4 w-4" />
              </Button>
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
                          {currencySymbol}{item.unitPrice.toFixed(2)} × {item.quantity} = {currencySymbol}{(item.unitPrice * item.quantity).toFixed(2)}
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
                        {editingCartItemId === item.productId ? (
                          <Input
                            type="number"
                            value={editingCartQuantity}
                            onChange={(e) => setEditingCartQuantity(e.target.value)}
                            onBlur={() => handleCartQuantityBlur(item.productId)}
                            onKeyDown={(e) => handleCartQuantityKeyDown(e, item.productId)}
                            className="w-12 h-6 text-center text-sm font-medium p-1"
                            autoFocus
                            min={0}
                          />
                        ) : (
                          <span
                            className="w-8 text-center text-sm font-medium cursor-pointer hover:bg-accent rounded px-1"
                            onClick={() => handleCartQuantityClick(item.productId, item.quantity)}
                            onDoubleClick={() => handleCartQuantityClick(item.productId, item.quantity)}
                            title="Click to edit quantity"
                          >
                            {item.quantity}
                          </span>
                        )}
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

              {/* GST Display (Static) */}
              {(settings?.show_gst_in_billing ?? true) && taxRate > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-xs">GST ({taxRate}%)</span>
                  <span className="text-sm">
                    {currencySymbol}{cartCalculations.calculatedTax.toFixed(2)}
                  </span>
                </div>
              )}

              {/* Discount Input */}
              {(settings?.show_discount_in_billing ?? true) && (
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
              )}

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

      {/* Mobile Cart Button - High quality FAB */}
      <Sheet>
        <SheetTrigger asChild>
          <Button
            className="md:hidden fixed bottom-[76px] right-4 z-50 h-14 w-14 rounded-full shadow-2xl shadow-primary/30 bg-primary text-primary-foreground hover:scale-105 active:scale-95 transition-all duration-200"
            size="icon"
          >
            <ShoppingCart className="h-6 w-6" />
            {cart.length > 0 && (
              <span className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white border-2 border-background animate-in zoom-in">
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
                        {editingCartItemId === item.productId ? (
                          <Input
                            type="number"
                            value={editingCartQuantity}
                            onChange={(e) => setEditingCartQuantity(e.target.value)}
                            onBlur={() => handleCartQuantityBlur(item.productId)}
                            onKeyDown={(e) => handleCartQuantityKeyDown(e, item.productId)}
                            className="w-14 h-8 text-center font-medium p-1"
                            autoFocus
                            min={0}
                          />
                        ) : (
                          <span
                            className="w-10 text-center font-medium cursor-pointer hover:bg-accent rounded px-1 py-1"
                            onClick={() => handleCartQuantityClick(item.productId, item.quantity)}
                            title="Tap to edit quantity"
                          >
                            {item.quantity}
                          </span>
                        )}
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

              {/* Optional GST Display (Static) */}
              {(settings?.show_gst_in_billing ?? true) && taxRate > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-sm">GST ({taxRate}%)</span>
                  <span>
                    {currencySymbol}{cartCalculations.calculatedTax.toFixed(2)}
                  </span>
                </div>
              )}
              {(settings?.show_discount_in_billing ?? true) && (
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
              )}

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

      {/* Long-Press Quantity Dialog */}
      <Dialog open={quantityDialogOpen} onOpenChange={setQuantityDialogOpen}>
        <DialogContent className="sm:max-w-[320px]">
          <DialogHeader>
            <DialogTitle>Enter Quantity</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Add <span className="font-medium text-foreground">{quantityDialogProduct?.name}</span> to cart
            </p>
            <Input
              type="number"
              placeholder="Enter quantity..."
              value={quantityDialogValue}
              onChange={(e) => setQuantityDialogValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleQuantityDialogConfirm();
                }
              }}
              className="text-lg h-12 text-center"
              autoFocus
              min={1}
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setQuantityDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleQuantityDialogConfirm} disabled={!quantityDialogValue || parseInt(quantityDialogValue, 10) <= 0}>
              Add to Cart
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
