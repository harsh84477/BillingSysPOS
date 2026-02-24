// @ts-nocheck
import React, { useState, useMemo, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useBusinessSettings } from '@/hooks/useBusinessSettings';
import { useSubscription } from '@/hooks/useSubscription';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
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
  Building2,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  AlertCircle,
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
  User,
  type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { printBillReceipt } from '@/components/bills/BillReceiptPrint';

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
  const { user, businessId, billPrefix, userRole, isAdmin, isSalesman } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: settings } = useBusinessSettings();
  const { isTrial, isActive, isExpired, canCreateBill, planName } = useSubscription();

  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [customerName, setCustomerName] = useState('');
  const [discountValue, setDiscountValue] = useState(0);
  const [applyGst, setApplyGst] = useState(true);

  // Payment type: 'cash' (paid immediately) | 'due' (unpaid/partial)
  const [paymentType, setPaymentType] = useState<'cash' | 'due'>('cash');
  const [paidAmount, setPaidAmount] = useState<number | ''>('');
  const [dueDate, setDueDate] = useState<string>('');

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

  // Cart price edit state
  const [editingCartPriceItemId, setEditingCartPriceItemId] = useState<string | null>(null);
  const [editingCartPrice, setEditingCartPrice] = useState('');
  const [costWarningDialogOpen, setCostWarningDialogOpen] = useState(false);
  const [pendingPriceInfo, setPendingPriceInfo] = useState<{ productId: string; price: number } | null>(null);

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
    // Stock validation: available = total stock - reserved by all drafts
    const available = product.stock_quantity - (product.reserved_quantity || 0);
    const existing = cart.find((item) => item.productId === product.id);
    const currentQty = existing ? existing.quantity : 0;

    if (currentQty + 1 > available) {
      toast.error(`Out of stock! Only ${available} units available.`);
      return;
    }

    setCart((prev) => {
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
    setCart((prev) => {
      const item = prev.find(i => i.productId === productId);
      if (!item) return prev;

      if (delta > 0) {
        const product = products.find(p => p.id === productId);
        if (product) {
          const available = product.stock_quantity - (product.reserved_quantity || 0);
          if (item.quantity + delta > available) {
            toast.error(`Stock limit reached. Only ${available} units available.`);
            return prev;
          }
        }
      }

      return prev
        .map((i) =>
          i.productId === productId
            ? { ...i, quantity: Math.max(0, i.quantity + delta) }
            : i
        )
        .filter((i) => i.quantity > 0);
    });
  };

  // Set exact quantity for cart item
  const setQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }

    const product = products.find(p => p.id === productId);
    if (product) {
      const available = product.stock_quantity - (product.reserved_quantity || 0);
      if (quantity > available) {
        toast.error(`Insufficient stock! Max available: ${available}`);
        return;
      }
    }

    setCart((prev) =>
      prev.map((item) =>
        item.productId === productId
          ? { ...item, quantity }
          : item
      )
    );
  };

  // Update price
  const updatePrice = (productId: string, newPrice: number) => {
    setCart((prev) =>
      prev.map((item) =>
        item.productId === productId
          ? { ...item, unitPrice: Math.max(0, newPrice) }
          : item
      )
    );
  };

  // Add to cart with specific quantity (for long-press)
  const addToCartWithQuantity = (product: typeof products[0], quantity: number) => {
    if (quantity <= 0) return;

    const available = product.stock_quantity - (product.reserved_quantity || 0);
    const existing = cart.find((item) => item.productId === product.id);
    const currentQty = existing ? existing.quantity : 0;

    if (currentQty + quantity > available) {
      toast.error(`Out of stock! Only ${available} units available.`);
      return;
    }

    setCart((prev) => {
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

  // Cart price edit handlers
  const handleCartPriceClick = (productId: string, currentPrice: number) => {
    setEditingCartPriceItemId(productId);
    setEditingCartPrice(currentPrice.toString());
  };

  const handleCartPriceBlur = (productId: string) => {
    const price = parseFloat(editingCartPrice);
    const item = cart.find((i) => i.productId === productId);
    if (!isNaN(price) && item) {
      if (price <= item.costPrice) {
        setPendingPriceInfo({ productId, price });
        setCostWarningDialogOpen(true);
      } else {
        updatePrice(productId, price);
      }
    }
    setEditingCartPriceItemId(null);
    setEditingCartPrice('');
  };

  const confirmCostWarning = () => {
    if (pendingPriceInfo) {
      updatePrice(pendingPriceInfo.productId, pendingPriceInfo.price);
    }
    setCostWarningDialogOpen(false);
    setPendingPriceInfo(null);
  };

  const handleCartPriceKeyDown = (e: React.KeyboardEvent, productId: string) => {
    if (e.key === 'Enter') {
      handleCartPriceBlur(productId);
    } else if (e.key === 'Escape') {
      setEditingCartPriceItemId(null);
      setEditingCartPrice('');
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

  // Print bill function using unified central component
  const printBill = (billNumber: string) => {
    const billData = {
      bill_number: billNumber,
      subtotal: cartCalculations.subtotal,
      discount_amount: cartCalculations.discountAmount,
      tax_amount: cartCalculations.taxAmount,
      total_amount: cartCalculations.total,
      created_at: new Date().toISOString(),
      customers: selectedCustomerId ? customers.find(c => c.id === selectedCustomerId) : { name: customerName || 'Walk-in' }
    };

    const itemsData = cart.map(item => ({
      id: item.productId,
      product_name: item.name,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      total_price: item.unitPrice * item.quantity,
      cost_price: item.costPrice || 0
    }));

    printBillReceipt(billData, itemsData, settings);
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

        const isDraft = isSalesman;

        // ─── DRAFT PATH: Use atomic RPC ───
        if (isDraft) {
          const salesmanDisplayName =
            user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Salesman';

          const items = cart.map(item => ({
            product_id: item.productId,
            product_name: item.name,
            quantity: item.quantity,
            unit_price: item.unitPrice,
            cost_price: item.costPrice,
            total_price: item.unitPrice * item.quantity,
          }));

          const { data, error } = await supabase.rpc('create_draft_bill', {
            _business_id: businessId,
            _bill_number: billNumber,
            _customer_id: finalCustomerId || null,
            _salesman_name: salesmanDisplayName,
            _subtotal: cartCalculations.subtotal,
            _discount_type: 'flat',
            _discount_value: discountValue,
            _discount_amount: cartCalculations.discountAmount,
            _tax_amount: cartCalculations.taxAmount,
            _total_amount: cartCalculations.total,
            _items: items,
          } as any);

          if (error) {
            if (error.code === '23505' && retryCount < maxRetries - 1) {
              retryCount++;
              continue;
            }
            throw error;
          }

          const result = data as any;
          if (!result.success) {
            throw new Error(result.error || 'Failed to create draft');
          }

          return { bill: result, billNumber: result.bill_number || billNumber, shouldPrint, isDraft };
        }

        // ─── COMPLETED BILL PATH: existing client-side logic ───
        const billProfit = cart.reduce(
          (sum, item) => sum + (item.unitPrice - item.costPrice) * item.quantity, 0
        );

        const resolvedPaidAmount = paymentType === 'cash'
          ? cartCalculations.total
          : (typeof paidAmount === 'number' ? paidAmount : 0);
        const resolvedDueAmount = Math.max(0, cartCalculations.total - resolvedPaidAmount);
        const resolvedPaymentStatus = paymentType === 'cash' ? 'paid'
          : resolvedDueAmount <= 0 ? 'paid'
            : resolvedPaidAmount > 0 ? 'partial'
              : 'unpaid';

        const { data: bill, error: billError } = await supabase
          .from('bills')
          .insert({
            bill_number: billNumber,
            customer_id: finalCustomerId,
            created_by: user?.id,
            business_id: businessId,
            status: 'completed' as any,
            subtotal: cartCalculations.subtotal,
            discount_type: 'flat',
            discount_value: discountValue,
            discount_amount: cartCalculations.discountAmount,
            tax_amount: cartCalculations.taxAmount,
            total_amount: cartCalculations.total,
            completed_at: new Date().toISOString(),
            payment_type: paymentType,
            payment_status: resolvedPaymentStatus,
            paid_amount: resolvedPaidAmount,
            due_amount: resolvedDueAmount,
            due_date: (paymentType === 'due' && dueDate) ? dueDate : null,
            profit: billProfit,
          } as any)
          .select()
          .single();

        if (billError) {
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

        // Reduce actual stock for completed bills
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

        return { bill, billNumber, shouldPrint, isDraft: false };
      }

      throw new Error('Failed to generate unique bill number after multiple attempts');
    },
    onSuccess: ({ billNumber, shouldPrint, isDraft }) => {
      if (shouldPrint && !isDraft) {
        printBill(billNumber);
      }
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['bills'] });
      queryClient.invalidateQueries({ queryKey: ['draftBills'] });
      setCart([]);
      setCustomerName('');
      setSelectedCustomerId(null);
      setDiscountValue(0);
      setApplyGst(true);
      generateBillNumber().then(setPreviewBillNumber);
      if (isDraft) {
        toast.success('Draft order saved! Stock has been reserved.');
      } else {
        toast.success(shouldPrint ? 'Bill saved & printed!' : 'Bill saved successfully!');
      }
    },
    onError: (error: Error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  // ─── Dynamic grid settings from admin ───
  const productColumns = settings?.product_columns ?? 5;
  const gridGap = settings?.grid_gap ?? 8;
  const buttonSize = settings?.product_button_size ?? 'medium';
  const showStockBadge = settings?.show_stock_badge ?? true;
  const showProductCode = settings?.show_product_code ?? false;
  const showCostPrice = isAdmin && (settings?.show_cost_price ?? false);
  const autoFitEnabled = settings?.auto_fit_enabled ?? false;

  // Size map for product card styles
  const sizeMap = {
    small: { card: 'p-1.5 sm:p-2', icon: 'h-6 w-6 sm:h-8 sm:w-8', fIcon: 'h-3 w-3 sm:h-4 sm:w-4', name: 'text-[9px] sm:text-[10px]', price: 'text-[10px] sm:text-xs' },
    medium: { card: 'p-2 sm:p-3', icon: 'h-7 w-7 sm:h-11 sm:w-11', fIcon: 'h-3.5 w-3.5 sm:h-6 sm:w-6', name: 'text-[10px] sm:text-xs', price: 'text-xs sm:text-sm' },
    large: { card: 'p-3 sm:p-4', icon: 'h-9 w-9 sm:h-14 sm:w-14', fIcon: 'h-4 w-4 sm:h-7 sm:w-7', name: 'text-xs sm:text-sm', price: 'text-sm sm:text-base' },
    xlarge: { card: 'p-4 sm:p-5', icon: 'h-11 w-11 sm:h-16 sm:w-16', fIcon: 'h-5 w-5 sm:h-8 sm:w-8', name: 'text-sm sm:text-base', price: 'text-base sm:text-lg' },
  };
  const sz = sizeMap[buttonSize] || sizeMap.medium;

  // ── Memoized Product Card Component for perf with 1000+ products ──
  const ProductCard = React.memo(({ product }: { product: typeof products[0] }) => {
    const iconName = product.icon || 'Package';
    const IconComponent = ICON_MAP[iconName] || Package;
    // Available stock = actual stock minus reserved stock (for drafts)
    const availableStock = product.stock_quantity - (product.reserved_quantity || 0);
    const isOutOfStock = availableStock <= 0;
    const isLowStock = !isOutOfStock && availableStock <= product.low_stock_threshold;
    const stockBadgeClass = isOutOfStock
      ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
      : isLowStock
        ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400'
        : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';

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
        className={cn(
          'pos-product-card relative flex flex-col items-center justify-between rounded-xl border border-border bg-card text-center',
          'group select-none overflow-hidden touch-manipulation w-full',
          autoFitEnabled ? '' : 'aspect-square',
          sz.card
        )}
      >
        {/* Stock Badge */}
        {showStockBadge && (
          <Badge
            variant="secondary"
            className={cn(
              'absolute top-1 right-1 text-[9px] px-1 py-0 z-10 font-bold',
              stockBadgeClass
            )}
          >
            {availableStock}
          </Badge>
        )}

        <div className="flex flex-col items-center justify-center flex-1 w-full gap-1">
          {/* Icon */}
          <div className={cn(
            'flex items-center justify-center rounded-full bg-primary/5 group-hover:bg-primary/10 transition-colors',
            sz.icon
          )}>
            <IconComponent className={cn('text-primary', sz.fIcon)} />
          </div>

          {/* Product Name */}
          <span className={cn('font-semibold line-clamp-2 leading-tight px-0.5', sz.name)}>
            {product.name}
          </span>

          {/* Product Code */}
          {showProductCode && product.sku && (
            <span className="text-[8px] text-muted-foreground/70 font-mono tracking-wide">
              {product.sku}
            </span>
          )}

          {/* Cost Price (admin only) */}
          {showCostPrice && (
            <span className="text-[9px] text-muted-foreground">
              Cost: {currencySymbol}{Number(product.cost_price).toFixed(2)}
            </span>
          )}
        </div>

        {/* Price */}
        <div className="w-full pt-1 border-t border-dashed border-border/50">
          <span className={cn('font-bold text-primary', sz.price)}>
            {currencySymbol}{Number(product.selling_price).toFixed(2)}
          </span>
        </div>
      </button>
    );
  });

  return (
    <div className="flex h-[calc(100dvh-3.5rem-env(safe-area-inset-bottom))] sm:h-[calc(100dvh-3.5rem)] gap-0 w-full">
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

            {/* Category Buttons - High density professional style */}
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-semibold transition-all group',
                  selectedCategory === category.id
                    ? 'bg-primary text-primary-foreground shadow-sm ring-1 ring-primary/20'
                    : 'hover:bg-accent/50 text-muted-foreground hover:text-foreground'
                )}
              >
                <div
                  className={cn(
                    "h-2 w-2 rounded-full flex-shrink-0 transition-transform group-hover:scale-125",
                    selectedCategory === category.id ? "bg-primary-foreground" : ""
                  )}
                  style={selectedCategory !== category.id ? { backgroundColor: category.color || '#3B82F6' } : {}}
                />
                <span className="truncate">{category.name}</span>
                {selectedCategory === category.id && (
                  <ChevronRight className="ml-auto h-3 w-3 opacity-50" />
                )}
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Center Panel - Products */}
      <div className="flex-1 flex flex-col min-w-0 bg-background overflow-hidden relative">
        {/* Mobile horizontal category scroll */}
        {!canCreateBill && (
          <div className="px-4 pt-4">
            <Alert variant="destructive" className="animate-in fade-in slide-in-from-top-4 duration-300">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Subscription Expired</AlertTitle>
              <AlertDescription className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <span>Your {planName} has expired. Please upgrade to continue creating bills.</span>
                <Button size="sm" variant="outline" className="w-fit" onClick={() => navigate('/settings')}>
                  Upgrade Now
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </AlertDescription>
            </Alert>
          </div>
        )}

        {isTrial && isActive && (
          <div className="px-4 pt-4">
            <Alert className="bg-primary/5 border-primary/20 animate-in fade-in slide-in-from-top-4 duration-300">
              <Sparkles className="h-4 w-4 text-primary" />
              <AlertTitle>Free Trial</AlertTitle>
              <AlertDescription className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <span>You are currently using the Free Trial. Upgrade for full features and history.</span>
                <Button size="sm" variant="link" className="text-primary p-0 h-auto w-fit" onClick={() => navigate('/settings')}>
                  View Plans
                  <ChevronRight className="ml-1 h-3 w-3" />
                </Button>
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Existing category scroll ... */}
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
          {/* Mobile horizontal category scroll - Fixed overflow & swipe */}
          <div className="lg:hidden flex flex-nowrap gap-1.5 overflow-x-auto px-2.5 pb-2.5 scroll-smooth touch-pan-x">
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

        {/* Products Grid – dynamic admin-controlled with responsive breakpoints */}
        <ScrollArea className="flex-1">
          {filteredProducts.length === 0 ? (
            <div className="flex h-40 items-center justify-center text-muted-foreground">
              <Package className="mr-2 h-5 w-5" />
              No products found
            </div>
          ) : (
            <div
              className="pos-product-grid pb-20 sm:pb-4 pt-2 px-3 transition-all duration-300"
              style={{
                display: 'grid',
                gridTemplateColumns: `repeat(var(--pos-cols, ${productColumns}), minmax(0, 1fr))`,
                gap: `${gridGap}px`,
                ['--pos-cols-desktop' as string]: productColumns,
              }}
            >
              {filteredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
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
            {/* Bill Header - Premium Styling */}
            <div className="p-4 bg-muted/30 border-b border-border">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <h2 className="text-base font-bold tracking-tight">Invoice #{previewBillNumber}</h2>
                  <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">{totalItems} items in cart</p>
                </div>
                <div className="h-9 w-9 rounded-full bg-background border border-border flex items-center justify-center text-primary shadow-sm">
                  <ShoppingCart className="h-4 w-4" />
                </div>
              </div>
            </div>

            {/* Customer Section - Sophisticated Input */}
            <div className="px-4 py-3 border-b border-border bg-card">
              <div className="flex items-center gap-2 group">
                <div className="relative flex-1">
                  <User className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Customer Name..."
                    value={customerName || (selectedCustomerId ? customers.find(c => c.id === selectedCustomerId)?.name : '') || ''}
                    onChange={(e) => {
                      setCustomerName(e.target.value);
                      if (selectedCustomerId) setSelectedCustomerId(null);
                    }}
                    className="bg-background pl-8 h-9 text-xs focus-visible:ring-primary/20"
                  />
                </div>
                <Button
                  variant="secondary"
                  size="icon"
                  className="h-9 w-9 shrink-0 border border-border"
                  onClick={() => setIsCustomerDialogOpen(true)}
                  title="Select Customer"
                >
                  <Users className="h-4 w-4" />
                </Button>
              </div>
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
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {editingCartPriceItemId === item.productId ? (
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] text-muted-foreground">{currencySymbol}</span>
                              <Input
                                type="number"
                                value={editingCartPrice}
                                onChange={(e) => setEditingCartPrice(e.target.value)}
                                onBlur={() => handleCartPriceBlur(item.productId)}
                                onKeyDown={(e) => handleCartPriceKeyDown(e, item.productId)}
                                className="w-16 h-5 text-[10px] p-1 h-6"
                                autoFocus
                                step="0.01"
                              />
                            </div>
                          ) : (
                            <div className="flex items-center gap-1">
                              <span
                                className={cn(
                                  "text-xs cursor-pointer hover:text-primary transition-colors flex items-center gap-1",
                                  item.unitPrice <= item.costPrice ? "text-destructive font-bold" : "text-muted-foreground"
                                )}
                                onClick={() => handleCartPriceClick(item.productId, item.unitPrice)}
                              >
                                {currencySymbol}{item.unitPrice.toFixed(2)}
                              </span>
                            </div>
                          )}
                          <span className="text-[10px] text-muted-foreground">× {item.quantity} = </span>
                          <span className={cn(
                            "text-xs font-bold",
                            item.unitPrice <= item.costPrice ? "text-destructive" : "text-primary"
                          )}>
                            {currencySymbol}{(item.unitPrice * item.quantity).toFixed(2)}
                          </span>
                        </div>
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

              {/* ── Payment Type Selector (hidden for salesman) ── */}
              {!isSalesman && (
                <div className="pt-2 border-t">
                  <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Payment Type</p>
                  <div className="grid grid-cols-2 gap-1 p-1 bg-muted rounded-lg">
                    {(['cash', 'due'] as const).map((type) => (
                      <button
                        key={type}
                        onClick={() => {
                          setPaymentType(type);
                          setPaidAmount('');
                          setDueDate('');
                        }}
                        className={cn(
                          'py-1.5 rounded-md text-sm font-semibold transition-all',
                          paymentType === type
                            ? type === 'cash'
                              ? 'bg-primary text-primary-foreground shadow-sm'
                              : 'bg-destructive text-destructive-foreground shadow-sm'
                            : 'text-muted-foreground hover:text-foreground'
                        )}
                      >
                        {type === 'cash' ? '💵 Cash / Online' : '⏳ Due / Credit'}
                      </button>
                    ))}
                  </div>

                  {/* Due-specific fields */}
                  {paymentType === 'due' && (
                    <div className="mt-2 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm text-muted-foreground">Paid Now ({currencySymbol})</span>
                        <Input
                          type="number"
                          placeholder="0"
                          value={paidAmount}
                          onChange={(e) => setPaidAmount(e.target.value === '' ? '' : Number(e.target.value))}
                          className="w-28 h-8 text-right"
                          min={0}
                          max={cartCalculations.total}
                        />
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm text-muted-foreground">Due Amount</span>
                        <span className="font-bold text-destructive text-sm">
                          {currencySymbol}{Math.max(0, cartCalculations.total - (typeof paidAmount === 'number' ? paidAmount : 0)).toFixed(2)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm text-muted-foreground">Due Date</span>
                        <Input
                          type="date"
                          value={dueDate}
                          onChange={(e) => setDueDate(e.target.value)}
                          className="w-36 h-8 text-sm"
                          min={new Date().toISOString().split('T')[0]}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Salesman info badge */}
              {isSalesman && (
                <div className="pt-2 border-t">
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-teal-500/10 border border-teal-500/20">
                    <div className="h-6 w-6 rounded-full bg-teal-500/20 flex items-center justify-center">
                      <Save className="h-3.5 w-3.5 text-teal-600" />
                    </div>
                    <p className="text-xs text-teal-700 dark:text-teal-400">
                      Orders saved as <strong>Draft</strong>. Stock will be reserved. Admin/Manager will finalize.
                    </p>
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
                {isSalesman ? (
                  <Button
                    className="flex-1 bg-teal-600 hover:bg-teal-700 text-white"
                    disabled={cart.length === 0 || createBillMutation.isPending || !canCreateBill}
                    onClick={() => createBillMutation.mutate(false)}
                  >
                    <Save className="mr-2 h-4 w-4" />
                    {createBillMutation.isPending ? 'Saving Draft...' : 'Save Draft Order'}
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      className="flex-1"
                      disabled={cart.length === 0 || createBillMutation.isPending || !canCreateBill}
                      onClick={() => createBillMutation.mutate(false)}
                    >
                      <Save className="mr-2 h-4 w-4" />
                      Save Bill
                    </Button>
                    <Button
                      className="flex-1"
                      disabled={cart.length === 0 || createBillMutation.isPending || !canCreateBill}
                      onClick={() => createBillMutation.mutate(true)}
                    >
                      <Printer className="mr-2 h-4 w-4" />
                      Checkout & Print
                    </Button>
                  </>
                )}
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

            <ScrollArea className="flex-1 -mx-4 px-4 pb-4">
              {/* SaaS Alerts */}
              {isTrial && (
                <div className="mb-4">
                  <Alert className="bg-primary/5 border-primary/20 animate-pulse">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <AlertTitle className="text-sm font-semibold">Free Trial Active ({planName})</AlertTitle>
                    <AlertDescription className="text-xs flex items-center justify-between">
                      <span>Enjoy full features during your 7-day trial.</span>
                      <Button size="sm" variant="link" className="h-auto p-0 text-primary font-bold" onClick={() => navigate('/settings')}>
                        Upgrade
                      </Button>
                    </AlertDescription>
                  </Alert>
                </div>
              )}

              {isExpired && (
                <div className="mb-4">
                  <Alert variant="destructive" className="animate-bounce">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle className="text-sm font-semibold">Subscription Expired</AlertTitle>
                    <AlertDescription className="text-xs flex items-center justify-between">
                      <span>Renew now to continue creating bills.</span>
                      <Button size="sm" variant="link" className="h-auto p-0 text-white font-bold" onClick={() => navigate('/settings')}>
                        Renew
                      </Button>
                    </AlertDescription>
                  </Alert>
                </div>
              )}

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
                        <div className="flex items-center gap-1 mt-0.5">
                          {editingCartPriceItemId === item.productId ? (
                            <Input
                              type="number"
                              value={editingCartPrice}
                              onChange={(e) => setEditingCartPrice(e.target.value)}
                              onBlur={() => handleCartPriceBlur(item.productId)}
                              onKeyDown={(e) => handleCartPriceKeyDown(e, item.productId)}
                              className="w-16 h-6 text-[10px] p-1"
                              autoFocus
                              step="0.01"
                            />
                          ) : (
                            <span
                              className={cn(
                                "text-xs cursor-pointer",
                                item.unitPrice <= item.costPrice ? "text-destructive font-bold" : "text-muted-foreground"
                              )}
                              onClick={() => handleCartPriceClick(item.productId, item.unitPrice)}
                            >
                              {currencySymbol}{item.unitPrice.toFixed(2)}
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground"> × {item.quantity}</span>
                        </div>
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
              {isSalesman ? (
                <Button
                  className="flex-1 bg-teal-600 hover:bg-teal-700 text-white"
                  disabled={cart.length === 0 || createBillMutation.isPending || !canCreateBill}
                  onClick={() => createBillMutation.mutate(false)}
                >
                  <Save className="mr-2 h-4 w-4" />
                  {createBillMutation.isPending ? 'Saving...' : 'Save Draft Order'}
                </Button>
              ) : (
                <>
                  <Button
                    variant="outline"
                    className="flex-1"
                    disabled={cart.length === 0 || createBillMutation.isPending || !canCreateBill}
                    onClick={() => createBillMutation.mutate(false)}
                  >
                    <Save className="mr-2 h-4 w-4" />
                    Save
                  </Button>
                  <Button
                    className="flex-1"
                    disabled={cart.length === 0 || createBillMutation.isPending || !canCreateBill}
                    onClick={() => createBillMutation.mutate(true)}
                  >
                    <Printer className="mr-2 h-4 w-4" />
                    Save & Print
                  </Button>
                </>
              )}
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

      {/* Cost Warning Dialog */}
      <Dialog open={costWarningDialogOpen} onOpenChange={setCostWarningDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Building2 className="h-5 w-5" />
              Price Alert: Below Cost Price
            </DialogTitle>
            <DialogDescription className="py-2">
              This price is at or below cost price. You are selling without profit or at loss. Are you sure you want to continue?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => {
              setCostWarningDialogOpen(false);
              setPendingPriceInfo(null);
            }}>
              Cancel & Revert
            </Button>
            <Button variant="destructive" onClick={confirmCostWarning}>
              Accept Price
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
