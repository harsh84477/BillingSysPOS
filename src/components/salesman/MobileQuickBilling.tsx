import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useBusinessSettings } from '@/hooks/useBusinessSettings';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Plus,
  Minus,
  Trash2,
  Check,
  X,
  Package,
  Search,
  ShoppingCart,
  Users,
  Loader2,
  ChevronRight,
  PackagePlus,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import NumericKeyboard from '@/components/billing/NumericKeyboard';

interface CartItem {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  cost_price: number;
}

export function MobileQuickBilling() {
  const { businessId, user, isSalesman, billPrefix } = useAuth();
  const queryClient = useQueryClient();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'products' | 'cart'>('products');
  const { data: settings } = useBusinessSettings();
  const showStockToSalesman = settings?.share_quantity_to_salesman ?? true;
  const canEditPrice = !isSalesman || (settings?.allow_salesman_price_edit ?? false);
  const [costPriceAlert, setCostPriceAlert] = useState<{ productId: string; productName: string; costPrice: number; newPrice: number } | null>(null);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustStoreName, setNewCustStoreName] = useState('');
  const [newCustSaving, setNewCustSaving] = useState(false);
  const [billLayout] = useState<'grid' | 'list'>(() =>
    (localStorage.getItem('salesman_bill_layout') as 'grid' | 'list') || 'grid'
  );
  const [askQuantityFirst] = useState<boolean>(() =>
    localStorage.getItem('salesman_ask_quantity_first') === 'true'
  );

  // Auto-select customer from navigation state (Take Order from Stores page)
  useEffect(() => {
    const state = location.state as { customerId?: string; customerName?: string } | null;
    if (state?.customerId) {
      setSelectedCustomerId(state.customerId);
      // Clear the state so it doesn't persist on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const [quantityDialogOpen, setQuantityDialogOpen] = useState(false);
  const [quantityDialogProduct, setQuantityDialogProduct] = useState<any>(null);
  const [quantityValue, setQuantityValue] = useState('1');
  const [cartQuantityDialogOpen, setCartQuantityDialogOpen] = useState(false);
  const [cartQuantityDialogItemId, setCartQuantityDialogItemId] = useState<string | null>(null);
  const [cartQuantityDialogValue, setCartQuantityDialogValue] = useState('');

  // Long-press support for grid view
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressFired = useRef(false);

  const handleLongPressStart = useCallback((product: any) => {
    longPressFired.current = false;
    longPressTimer.current = setTimeout(() => {
      longPressFired.current = true;
      setQuantityDialogProduct(product);
      setQuantityValue('1');
      setQuantityDialogOpen(true);
    }, 500);
  }, []);

  const handleLongPressEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const { data: products = [] as any[], isLoading: productsLoading } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['customers', businessId],
    queryFn: async () => {
      const { data, error } = await supabase.from('customers').select('*').eq('business_id', businessId!).order('name');
      if (error) throw error;
      return data;
    },
    enabled: !!businessId,
  });

  const subtotal = cart.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
  const total = subtotal;
  const cartCount = cart.reduce((a, b) => a + b.quantity, 0);

  const addToCart = (product: any, quantity: number = 1) => {
    const existing = cart.find((item) => item.product_id === product.id);
    if (existing) {
      setCart(cart.map((item) =>
        item.product_id === product.id ? { ...item, quantity: item.quantity + quantity } : item
      ));
    } else {
      setCart([...cart, {
        product_id: product.id,
        product_name: product.name,
        quantity,
        unit_price: Number(product.selling_price),
        cost_price: Number(product.cost_price),
      }]);
    }
    toast.success(`${product.name} added`, { duration: 1500 });
  };

  const handleProductClick = (product: any) => {
    if (askQuantityFirst) {
      setQuantityDialogProduct(product);
      setQuantityValue('1');
      setQuantityDialogOpen(true);
    } else {
      addToCart(product);
    }
  };

  const handleGridProductClick = (product: any) => {
    // If long-press already fired, do nothing (quantity dialog opened)
    if (longPressFired.current) return;
    handleProductClick(product);
  };

  const confirmQuantityDialog = () => {
    if (quantityDialogProduct && Number(quantityValue) > 0) {
      addToCart(quantityDialogProduct, Number(quantityValue));
      setQuantityDialogOpen(false);
      setQuantityDialogProduct(null);
    }
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter((item) => item.product_id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setSelectedCustomerId(null);
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(cart.map(i =>
      i.product_id === productId
        ? { ...i, quantity: Math.max(1, i.quantity + delta) }
        : i
    ));
  };

  const setQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart(cart.map(i =>
      i.product_id === productId ? { ...i, quantity } : i
    ));
  };

  const handleCartQuantityClick = (productId: string, currentQty: number) => {
    setCartQuantityDialogItemId(productId);
    setCartQuantityDialogValue(currentQty.toString());
    setCartQuantityDialogOpen(true);
  };

  const handleCartQuantityDialogConfirm = () => {
    const qty = parseInt(cartQuantityDialogValue, 10);
    if (cartQuantityDialogItemId && !isNaN(qty) && qty > 0) {
      setQuantity(cartQuantityDialogItemId, qty);
    }
    setCartQuantityDialogOpen(false);
    setCartQuantityDialogItemId(null);
    setCartQuantityDialogValue('');
  };

  const updatePrice = (productId: string, newPrice: number) => {
    const item = cart.find(i => i.product_id === productId);
    const price = Math.max(0, newPrice);
    if (item && price > 0 && price < item.cost_price) {
      setCostPriceAlert({ productId, productName: item.product_name, costPrice: item.cost_price, newPrice: price });
      return;
    }
    setCart(cart.map(i =>
      i.product_id === productId
        ? { ...i, unit_price: price }
        : i
    ));
  };

  const confirmBelowCostPrice = () => {
    if (!costPriceAlert) return;
    const { productId, newPrice } = costPriceAlert;
    setCart(prev => prev.map(i =>
      i.product_id === productId
        ? { ...i, unit_price: newPrice }
        : i
    ));
    setCostPriceAlert(null);
  };

  // Generate sequential date-based order number: ORD-{PREFIX}-MMDD0001
  const generateOrderNumber = async (): Promise<string> => {
    const today = new Date();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const code = billPrefix?.trim() || '';
    const datePrefix = code ? `ORD-${code}-${mm}${dd}` : `ORD-${mm}${dd}`;

    const { data: latestBill } = await supabase
      .from('bills')
      .select('bill_number')
      .like('bill_number', `${datePrefix}%`)
      .order('bill_number', { ascending: false })
      .limit(1)
      .maybeSingle();

    let sequence = 1;
    if (latestBill?.bill_number) {
      const seqPart = latestBill.bill_number.slice(-4);
      const parsed = parseInt(seqPart, 10);
      if (!isNaN(parsed)) sequence = parsed + 1;
    }
    return `${datePrefix}${String(sequence).padStart(4, '0')}`;
  };

  // Mutation to generate a new order via RPC (creates bill + bill_items + reserves stock)
  const generateOrderMutation = useMutation({
    mutationFn: async () => {
      if (cart.length === 0) throw new Error('Cart is empty');
      const billNumber = await generateOrderNumber();
      const salesmanName = user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Salesman';
      const items = cart.map(item => ({
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        cost_price: item.cost_price,
        total_price: item.unit_price * item.quantity,
      }));
      const { data, error } = await (supabase.rpc as any)('create_draft_bill', {
        _business_id: businessId,
        _bill_number: billNumber,
        _customer_id: selectedCustomerId || null,
        _salesman_name: salesmanName,
        _subtotal: subtotal,
        _discount_amount: 0,
        _tax_amount: 0,
        _total_amount: total,
        _items: items,
      });
      if (error) throw error;
      const result = data as any;
      if (!result?.success) throw new Error(result?.error || 'Failed to create order');
      return result;
    },
    onSuccess: () => {
      toast.success('Order generated successfully!');
      clearCart();
      setActiveView('products');
      queryClient.invalidateQueries({ queryKey: ['salesmanOrders'] });
      queryClient.invalidateQueries({ queryKey: ['salesman-orders-all'] });
      queryClient.invalidateQueries({ queryKey: ['salesman-my-orders'] });
      queryClient.invalidateQueries({ queryKey: ['salesman-today-bills'] });
      queryClient.invalidateQueries({ queryKey: ['salesman-month-bills'] });
      queryClient.invalidateQueries({ queryKey: ['salesman-recent-orders'] });
      queryClient.invalidateQueries({ queryKey: ['salesman-target'] });
      queryClient.invalidateQueries({ queryKey: ['salesman-all-targets'] });
      queryClient.invalidateQueries({ queryKey: ['salesman-bills-for-targets'] });
      queryClient.invalidateQueries({ queryKey: ['salesman-orders-targets'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      // Dashboard keys
      queryClient.invalidateQueries({ queryKey: ['todaySales'] });
      queryClient.invalidateQueries({ queryKey: ['todayStats'] });
      queryClient.invalidateQueries({ queryKey: ['todayPayments'] });
      queryClient.invalidateQueries({ queryKey: ['todayProfit'] });
      queryClient.invalidateQueries({ queryKey: ['recentBills'] });
      queryClient.invalidateQueries({ queryKey: ['pendingBills'] });
      queryClient.invalidateQueries({ queryKey: ['draftBills'] });
      queryClient.invalidateQueries({ queryKey: ['bills'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to generate order');
    },
  });

  const selectedCustomer = customers.find((c: any) => c.id === selectedCustomerId);
  const filteredProducts = (products as any[]).filter((p: any) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-background">
      {/* ── Desktop Layout ── */}
      <div className="hidden md:grid md:grid-cols-12 flex-1 overflow-hidden">
        {/* Left: Products */}
        <div className="md:col-span-7 lg:col-span-8 flex flex-col overflow-hidden border-r border-border">
          <div className="p-3 border-b border-border bg-background shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
              <Input
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-9 bg-muted/30 border-none rounded-lg text-sm"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            {productsLoading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="animate-spin text-primary h-5 w-5" />
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground/40">
                <Package className="h-10 w-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm font-medium">No products found</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 lg:grid-cols-4 gap-2.5">
                {filteredProducts.map((product: any) => {
                  const available = product.stock_quantity - (product.reserved_quantity || 0);
                  const isLow = available <= product.low_stock_threshold;
                  return (
                    <Card
                      key={product.id}
                      className={cn(
                        "cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all active:scale-95 select-none",
                        showStockToSalesman && available <= 0 && "opacity-40 pointer-events-none"
                      )}
                      onClick={() => handleGridProductClick(product)}
                      onMouseDown={() => handleLongPressStart(product)}
                      onMouseUp={handleLongPressEnd}
                      onMouseLeave={handleLongPressEnd}
                      onTouchStart={() => handleLongPressStart(product)}
                      onTouchEnd={handleLongPressEnd}
                    >
                      <CardContent className="p-0">
                        <div className="h-24 bg-muted/40 flex items-center justify-center relative">
                          <Package className="w-8 h-8 text-muted-foreground/15" />
                          {showStockToSalesman && isLow && available > 0 && (
                            <Badge className="absolute top-1.5 right-1.5 bg-amber-500 text-white text-[8px] px-1 py-0 h-4 border-none">Low</Badge>
                          )}
                        </div>
                        <div className="p-2.5">
                          <p className="font-semibold text-xs line-clamp-2 leading-tight mb-1">{product.name}</p>
                          <div className="flex items-center justify-between">
                            <span className="text-primary font-bold text-sm">₹{product.selling_price}</span>
                            {showStockToSalesman && (
                              <span className={cn("text-[10px] font-medium", isLow ? "text-red-500" : "text-muted-foreground")}>
                                {available} left
                              </span>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right: Cart */}
        <div className="md:col-span-5 lg:col-span-4 flex flex-col overflow-hidden">
          <div className="p-3 border-b border-border flex items-center justify-between bg-muted/20">
            <h2 className="font-semibold text-sm flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-primary" />
              Cart
            </h2>
            {cart.length > 0 && (
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground h-7" onClick={clearCart}>Clear</Button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground/40">
                <ShoppingCart className="w-10 h-10 mb-3 opacity-20" />
                <p className="text-sm font-medium">Cart is empty</p>
                <p className="text-xs mt-1">Tap products to add</p>
              </div>
            ) : (
              cart.map((item) => (
                <div key={item.product_id} className="p-3 rounded-xl border border-border bg-card">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm leading-tight truncate">{item.product_name}</p>
                      <div className="flex items-center gap-1 mt-0.5 text-xs text-muted-foreground">
                        {canEditPrice ? (
                          <>
                            <span>₹</span>
                            <Input
                              type="number"
                              value={item.unit_price}
                              onChange={(e) => updatePrice(item.product_id, Number(e.target.value) || 0)}
                              className="h-5 w-16 text-xs px-1 border-dashed [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                            />
                          </>
                        ) : (
                          <span>₹{item.unit_price}</span>
                        )}
                        <span>× {item.quantity} = <span className="text-primary font-semibold">₹{(item.unit_price * item.quantity).toFixed(0)}</span></span>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground/40 hover:text-destructive" onClick={() => removeFromCart(item.product_id)}>
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                  <div className="flex items-center justify-center gap-4 mt-2 bg-muted/30 rounded-lg p-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md" onClick={() => updateQuantity(item.product_id, -1)}>
                      <Minus className="w-3 h-3" />
                    </Button>
                    <span 
                      className="font-bold text-sm w-8 text-center cursor-pointer hover:bg-muted/40 rounded py-0.5 select-none"
                      onClick={() => handleCartQuantityClick(item.product_id, item.quantity)}
                      title="Click to edit quantity"
                    >
                      {item.quantity}
                    </span>
                    <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md" onClick={() => updateQuantity(item.product_id, 1)}>
                      <Plus className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
          {cart.length > 0 && (
            <div className="p-3 border-t border-border space-y-3 bg-muted/20">
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground font-medium">Subtotal ({cart.length} items)</span>
                <span className="font-bold">₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-border">
                <span className="font-bold text-primary">Total</span>
                <span className="text-xl font-bold text-primary">₹{total.toFixed(0)}</span>
              </div>
              <button
                onClick={() => setShowCustomerModal(true)}
                className="w-full p-2.5 rounded-lg border border-border bg-card flex items-center gap-3 text-left hover:border-primary/30 transition-colors"
              >
                <Users className="w-4 h-4 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-muted-foreground uppercase font-medium">Customer</p>
                  <p className="text-sm font-medium truncate">{selectedCustomer?.name || 'Walk-in'}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground/40" />
              </button>
              <Button
                className="w-full h-12 rounded-xl font-bold text-sm"
                disabled={cart.length === 0 || generateOrderMutation.isPending}
                onClick={() => generateOrderMutation.mutate()}
              >
                {generateOrderMutation.isPending ? (
                  <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Generating...</>
                ) : (
                  <><Check className="w-4 h-4 mr-2" /> Generate Order · ₹{total.toFixed(0)}</>
                )}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* ── Mobile Layout ── */}
      <div className="flex-1 md:hidden flex flex-col overflow-hidden">
        {/* Mobile Tab Bar */}
        <div className="grid grid-cols-2 bg-card border-b border-border shrink-0">
          <button
            onClick={() => setActiveView('products')}
            className={cn(
              "flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors border-b-2",
              activeView === 'products'
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground"
            )}
          >
            <Package className="w-4 h-4" />
            Products
          </button>
          <button
            onClick={() => setActiveView('cart')}
            className={cn(
              "flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors border-b-2 relative",
              activeView === 'cart'
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground"
            )}
          >
            <ShoppingCart className="w-4 h-4" />
            Cart
            {cartCount > 0 && (
              <span className="bg-primary text-primary-foreground text-[10px] font-bold rounded-full h-5 min-w-[20px] flex items-center justify-center px-1">
                {cartCount}
              </span>
            )}
          </button>
        </div>

        {/* Products View */}
        {activeView === 'products' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="px-3 py-2 border-b border-border bg-background shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                <Input
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-9 bg-muted/30 border-none rounded-lg text-sm"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2.5 pb-20">
              {productsLoading ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="animate-spin text-primary h-5 w-5" />
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground/40">
                  <Package className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm font-medium">No products found</p>
                </div>
              ) : billLayout === 'list' ? (
                <div className="space-y-1">
                  {filteredProducts.map((product: any) => {
                    const available = product.stock_quantity - (product.reserved_quantity || 0);
                    const isLow = available <= product.low_stock_threshold;
                    const inCart = cart.find(i => i.product_id === product.id);
                    return (
                      <div
                        key={product.id}
                        className={cn(
                          "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg border border-border/50 bg-card text-left transition-all",
                          showStockToSalesman && available <= 0 && "opacity-30 pointer-events-none",
                          inCart && "ring-2 ring-primary/40"
                        )}
                      >
                        <div className="h-9 w-9 rounded-lg bg-muted/30 flex items-center justify-center shrink-0 relative cursor-pointer active:scale-95 transition-transform"
                          onClick={() => handleProductClick(product)}
                        >
                          <Package className="w-4 h-4 text-muted-foreground/15" />
                          {inCart && (
                            <span className="absolute -top-1 -left-1 bg-primary text-primary-foreground text-[8px] font-bold h-3.5 w-3.5 rounded-full flex items-center justify-center">
                              {inCart.quantity}
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => handleProductClick(product)}>
                          <p className="text-[11px] font-medium leading-tight line-clamp-1">{product.name}</p>
                          <p className={cn("text-[9px] font-medium", showStockToSalesman && isLow ? "text-red-500" : "text-muted-foreground/60")}>
                            ₹{product.selling_price}{showStockToSalesman ? ` · ${available} left${isLow && available > 0 ? ' · LOW' : ''}` : ''}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 px-2 text-[10px] font-bold rounded-md gap-0.5"
                            onClick={(e) => { e.stopPropagation(); addToCart(product, 1); }}
                          >
                            <Plus className="h-3 w-3" /> 1
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 px-2 text-[10px] font-bold rounded-md gap-0.5"
                            onClick={(e) => {
                              e.stopPropagation();
                              setQuantityDialogProduct(product);
                              setQuantityValue(String(product.case_quantity || 12));
                              setQuantityDialogOpen(true);
                            }}
                          >
                            <PackagePlus className="h-3 w-3" /> Case
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {filteredProducts.map((product: any) => {
                    const available = product.stock_quantity - (product.reserved_quantity || 0);
                    const isLow = available <= product.low_stock_threshold;
                    const inCart = cart.find(i => i.product_id === product.id);
                    return (
                      <button
                        key={product.id}
                        className={cn(
                          "relative rounded-xl overflow-hidden bg-card border border-border/50 text-left active:scale-95 transition-transform select-none",
                          showStockToSalesman && available <= 0 && "opacity-30 pointer-events-none",
                          inCart && "ring-2 ring-primary/40"
                        )}
                        onClick={() => handleGridProductClick(product)}
                        onMouseDown={() => handleLongPressStart(product)}
                        onMouseUp={handleLongPressEnd}
                        onMouseLeave={handleLongPressEnd}
                        onTouchStart={() => handleLongPressStart(product)}
                        onTouchEnd={handleLongPressEnd}
                      >
                        <div className="h-16 bg-muted/30 flex items-center justify-center relative">
                          <Package className="w-6 h-6 text-muted-foreground/10" />
                          {showStockToSalesman && isLow && available > 0 && (
                            <span className="absolute top-1 right-1 bg-amber-500 text-white text-[7px] font-bold px-1 rounded">LOW</span>
                          )}
                          {inCart && (
                            <span className="absolute top-1 left-1 bg-primary text-primary-foreground text-[9px] font-bold h-4 w-4 rounded-full flex items-center justify-center">
                              {inCart.quantity}
                            </span>
                          )}
                        </div>
                        <div className="p-1.5">
                          <p className="text-[10px] font-medium leading-tight line-clamp-2 min-h-[24px]">{product.name}</p>
                          <p className="text-primary font-bold text-xs mt-0.5">₹{product.selling_price}</p>
                          {showStockToSalesman && (
                            <p className={cn("text-[8px] font-medium", isLow ? "text-red-500" : "text-muted-foreground/60")}>{available} left</p>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Floating cart summary on products view */}
            {cartCount > 0 && (
              <div className="fixed bottom-16 left-0 right-0 z-40 p-2.5 bg-background/95 backdrop-blur-sm border-t border-border md:hidden">
                <Button
                  className="w-full h-11 rounded-xl font-bold text-sm"
                  onClick={() => setActiveView('cart')}
                >
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  View Cart · {cartCount} items · ₹{total.toFixed(0)}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Cart View */}
        {activeView === 'cart' && (
        <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-3 space-y-2.5 pb-52">
              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground/40">
                  <ShoppingCart className="w-12 h-12 mb-3 opacity-15" />
                  <p className="text-sm font-medium">Your cart is empty</p>
                  <Button variant="outline" size="sm" className="mt-3 rounded-lg" onClick={() => setActiveView('products')}>
                    Browse Products
                  </Button>
                </div>
              ) : (
                <>
                  {cart.map((item) => (
                    <div key={item.product_id} className="bg-card px-3 py-2 rounded-lg border border-border/50">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm leading-tight truncate">{item.product_name}</p>
                          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                            {canEditPrice ? (
                              <>
                                <span>₹</span>
                                <Input
                                  type="number"
                                  value={item.unit_price}
                                  onChange={(e) => updatePrice(item.product_id, Number(e.target.value) || 0)}
                                  className="h-5 w-14 text-[11px] px-0.5 border-dashed [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                />
                              </>
                            ) : (
                              <span>₹{item.unit_price}</span>
                            )}
                            <span>× {item.quantity} = <span className="text-primary font-semibold">₹{(item.unit_price * item.quantity).toFixed(0)}</span></span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="flex items-center gap-1 bg-muted/30 rounded-md px-1 py-0.5">
                            <Button variant="ghost" size="icon" className="h-6 w-6 rounded" onClick={() => updateQuantity(item.product_id, -1)}>
                              <Minus className="w-3 h-3" />
                            </Button>
                            <span 
                              className="font-bold text-sm w-6 text-center cursor-pointer hover:bg-muted/40 rounded py-0.5 select-none"
                              onClick={() => handleCartQuantityClick(item.product_id, item.quantity)}
                              title="Click to edit quantity"
                            >
                              {item.quantity}
                            </span>
                            <Button variant="ghost" size="icon" className="h-6 w-6 rounded" onClick={() => updateQuantity(item.product_id, 1)}>
                              <Plus className="w-3 h-3" />
                            </Button>
                          </div>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground/30 hover:text-destructive" onClick={() => removeFromCart(item.product_id)}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Customer selector */}
                  <button
                    onClick={() => setShowCustomerModal(true)}
                    className="w-full p-3 rounded-xl border border-border bg-card flex items-center gap-3 text-left active:scale-[0.98] transition-transform"
                  >
                    <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center text-muted-foreground shrink-0">
                      <Users className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-muted-foreground uppercase font-medium">Customer</p>
                      <p className="text-sm font-medium truncate">{selectedCustomer?.name || 'Walk-in'}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground/30 shrink-0" />
                  </button>
                </>
              )}
            </div>

            {/* Fixed bottom checkout - positioned above bottom nav */}
            {cart.length > 0 && (
              <div className="fixed bottom-16 left-0 right-0 z-40 bg-card border-t border-border px-3 pt-2.5 pb-2 md:hidden">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase font-medium tracking-wide">Total ({cart.length} items)</p>
                    <p className="text-lg font-bold text-primary leading-tight">₹{total.toFixed(0)}</p>
                  </div>
                  <Button variant="ghost" size="sm" className="text-xs text-muted-foreground h-8 gap-1.5" onClick={clearCart}>
                    <Trash2 className="w-3.5 h-3.5" /> Clear
                  </Button>
                </div>
                <Button
                  className="w-full h-11 rounded-xl font-bold text-sm"
                  disabled={generateOrderMutation.isPending}
                  onClick={() => generateOrderMutation.mutate()}
                >
                  {generateOrderMutation.isPending ? (
                    <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Generating...</>
                  ) : (
                    <><Check className="w-4 h-4 mr-2" /> Generate Order · ₹{total.toFixed(0)}</>
                  )}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Customer Modal (with search + add) ── */}
      <Dialog open={showCustomerModal} onOpenChange={(o) => { setShowCustomerModal(o); if (!o) setCustomerSearch(''); }}>
        <DialogContent className="max-w-sm w-[92vw] rounded-2xl p-0 overflow-hidden">
          <DialogHeader className="p-4 border-b border-border">
            <DialogTitle className="text-base font-bold flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                Select Customer
              </span>
              <Button size="sm" variant="outline" className="text-xs gap-1 text-emerald-600 border-emerald-200 h-7"
                onClick={() => { setShowCustomerModal(false); setNewCustName(''); setNewCustPhone(''); setNewCustStoreName(''); setShowAddCustomerModal(true); }}>
                <Plus className="h-3 w-3" /> Add New
              </Button>
            </DialogTitle>
          </DialogHeader>
          <div className="px-3 pt-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search name, store, phone..." value={customerSearch} onChange={(e) => setCustomerSearch(e.target.value)} className="pl-9 h-9 text-sm" autoFocus />
            </div>
          </div>
          <div className="max-h-[50vh] overflow-y-auto p-2 space-y-1">
            <Button
              variant="ghost"
              className="w-full justify-start h-12 rounded-lg px-3"
              onClick={() => { setSelectedCustomerId(null); setShowCustomerModal(false); }}
            >
              <Package className="w-4 h-4 mr-3 text-muted-foreground" />
              <span className="font-medium">Walk-in Customer</span>
            </Button>
            {customers
              .filter((c: any) => {
                if (!customerSearch.trim()) return true;
                const q = customerSearch.toLowerCase();
                return c.name?.toLowerCase().includes(q) || (c.phone || '').includes(customerSearch) || (c.store_name || '').toLowerCase().includes(q);
              })
              .map((c: any) => (
              <Button
                key={c.id}
                variant="ghost"
                className={cn(
                  "w-full justify-start h-auto py-2.5 rounded-lg px-3",
                  selectedCustomerId === c.id && "bg-primary/5 text-primary"
                )}
                onClick={() => { setSelectedCustomerId(c.id); setShowCustomerModal(false); }}
              >
                <div className={cn(
                  "h-7 w-7 rounded-md flex items-center justify-center text-xs font-bold mr-3 shrink-0",
                  selectedCustomerId === c.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                )}>
                  {c.name.charAt(0)}
                </div>
                <div className="text-left min-w-0">
                  <p className="font-medium text-sm truncate">{c.name}</p>
                  <div className="flex items-center gap-2">
                    {c.store_name && <span className="text-[10px] text-muted-foreground truncate">🏪 {c.store_name}</span>}
                    {c.phone && <span className="text-[10px] text-muted-foreground">{c.phone}</span>}
                  </div>
                </div>
                {selectedCustomerId === c.id && <Check className="w-4 h-4 ml-auto text-primary" />}
              </Button>
            ))}
            {customers.filter((c: any) => {
              if (!customerSearch.trim()) return true;
              const q = customerSearch.toLowerCase();
              return c.name?.toLowerCase().includes(q) || (c.phone || '').includes(customerSearch) || (c.store_name || '').toLowerCase().includes(q);
            }).length === 0 && customerSearch.trim() && (
              <div className="p-4 text-center text-sm text-muted-foreground">
                <p>No customers found</p>
                <Button size="sm" variant="link" className="text-primary mt-1"
                  onClick={() => { setShowCustomerModal(false); setNewCustName(customerSearch); setNewCustPhone(''); setNewCustStoreName(''); setShowAddCustomerModal(true); }}>
                  Create "{customerSearch}" as new customer
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Add Customer Modal ── */}
      <Dialog open={showAddCustomerModal} onOpenChange={setShowAddCustomerModal}>
        <DialogContent className="max-w-sm w-[92vw] rounded-2xl p-5">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Plus className="w-4 h-4 text-emerald-500" />
              Add Customer
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div className="space-y-1">
              <label className="text-xs font-bold">Store Name</label>
              <Input placeholder="e.g. Sharma General Store" value={newCustStoreName} onChange={e => setNewCustStoreName(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold">Customer Name *</label>
              <Input placeholder="e.g. Ravi Kumar" value={newCustName} onChange={e => setNewCustName(e.target.value)} autoFocus />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold">Mobile Number</label>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-muted-foreground bg-muted px-3 py-2 rounded-lg">+91</span>
                <Input type="tel" placeholder="10 digit number" value={newCustPhone} onChange={e => setNewCustPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} maxLength={10} />
              </div>
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="flex-1" onClick={() => setShowAddCustomerModal(false)}>Cancel</Button>
            <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
              disabled={!newCustName.trim() || newCustSaving}
              onClick={async () => {
                setNewCustSaving(true);
                try {
                  const { data: newCust, error } = await (supabase.from('customers') as any).insert({
                    name: newCustName.trim(),
                    phone: newCustPhone || null,
                    store_name: newCustStoreName.trim() || null,
                    business_id: businessId,
                    assigned_salesman_id: user?.id || null,
                  }).select().single();
                  if (error) throw error;
                  // Auto-add to salesman_stores so it shows in salesman's dashboard
                  if (newCust?.id && user?.id) {
                    await (supabase as any).from('salesman_stores').upsert({
                      business_id: businessId,
                      salesman_id: user.id,
                      customer_id: newCust.id,
                    }, { onConflict: 'salesman_id,customer_id' });
                  }
                  queryClient.invalidateQueries({ queryKey: ['customers'] });
                  queryClient.invalidateQueries({ queryKey: ['salesman-stores'] });
                  queryClient.invalidateQueries({ queryKey: ['salesman-stores-full'] });
                  setSelectedCustomerId(newCust.id);
                  toast.success(`Customer "${newCust.name}" added!`);
                  setShowAddCustomerModal(false);
                } catch (err: any) { toast.error('Failed: ' + err.message); }
                finally { setNewCustSaving(false); }
              }}>
              {newCustSaving ? 'Saving...' : 'Add & Select'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Quantity Dialog ── */}
      <Dialog open={quantityDialogOpen} onOpenChange={setQuantityDialogOpen}>
        <DialogContent className="max-w-[300px] w-[calc(100%-2rem)] mx-auto rounded-2xl p-5">
          <DialogHeader>
            <DialogTitle className="text-center text-sm font-bold">Set Quantity</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 text-center">
            <p className="text-xs text-muted-foreground line-clamp-1">{quantityDialogProduct?.name}</p>
            <p className="text-primary font-bold text-sm">₹{quantityDialogProduct?.selling_price}</p>
            <Input
              type="number"
              value={quantityValue}
              onChange={(e) => setQuantityValue(e.target.value)}
              className="text-2xl h-14 text-center font-bold rounded-xl"
              autoFocus={!isMobile}
              min={1}
              onKeyDown={(e) => e.key === 'Enter' && confirmQuantityDialog()}
              inputMode={isMobile ? "none" : undefined}
            />
            <div className="grid grid-cols-4 gap-1.5">
              {[1, 5, 10, 12].map(q => (
                <Button key={q} variant="outline" size="sm" className="rounded-lg text-xs font-bold h-8" onClick={() => setQuantityValue(q.toString())}>{q}</Button>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {[24, 48, 100].map(q => (
                <Button key={q} variant="outline" size="sm" className="rounded-lg text-xs font-bold h-8" onClick={() => setQuantityValue(q.toString())}>{q}</Button>
              ))}
            </div>
            {isMobile && (
              <NumericKeyboard
                value={quantityValue}
                onChange={setQuantityValue}
                onConfirm={confirmQuantityDialog}
                className="mt-2"
              />
            )}
          </div>
          <Button className="w-full h-11 rounded-xl font-bold text-sm" onClick={confirmQuantityDialog} disabled={!quantityValue || Number(quantityValue) < 1}>
            <Plus className="h-4 w-4 mr-1.5" /> Add {quantityValue || 0} to Cart
          </Button>
        </DialogContent>
      </Dialog>

      {/* ── Edit Cart Quantity Dialog ── */}
      <Dialog open={cartQuantityDialogOpen} onOpenChange={setCartQuantityDialogOpen}>
        <DialogContent className="max-w-[300px] w-[calc(100%-2rem)] mx-auto rounded-2xl p-5">
          <DialogHeader>
            <DialogTitle className="text-center text-sm font-bold">Edit Quantity</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 text-center">
            <p className="text-xs text-muted-foreground line-clamp-1">
              {cart.find(item => item.product_id === cartQuantityDialogItemId)?.product_name}
            </p>
            <Input
              type="number"
              value={cartQuantityDialogValue}
              onChange={(e) => setCartQuantityDialogValue(e.target.value)}
              className="text-2xl h-14 text-center font-bold rounded-xl"
              autoFocus={!isMobile}
              min={1}
              onKeyDown={(e) => e.key === 'Enter' && handleCartQuantityDialogConfirm()}
              inputMode={isMobile ? "none" : undefined}
            />
            {isMobile && (
              <NumericKeyboard
                value={cartQuantityDialogValue}
                onChange={setCartQuantityDialogValue}
                onConfirm={handleCartQuantityDialogConfirm}
                className="mt-2"
              />
            )}
          </div>
          <Button className="w-full h-11 rounded-xl font-bold text-sm" onClick={handleCartQuantityDialogConfirm} disabled={!cartQuantityDialogValue || Number(cartQuantityDialogValue) < 1}>
            Update Quantity
          </Button>
        </DialogContent>
      </Dialog>

      {/* ── Cost Price Warning Alert ── */}
      <AlertDialog open={!!costPriceAlert} onOpenChange={(v) => !v && setCostPriceAlert(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              Price Below Cost
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>The cost price of <strong>{costPriceAlert?.productName}</strong> is <strong>₹{costPriceAlert?.costPrice?.toFixed(2)}</strong>.</p>
              <p>You are trying to set the selling price to <strong>₹{costPriceAlert?.newPrice?.toFixed(2)}</strong>, which is lower than the cost price. You will incur a loss on this product.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-amber-600 text-white hover:bg-amber-700"
              onClick={confirmBelowCostPrice}
            >
              Sell Below Cost
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
