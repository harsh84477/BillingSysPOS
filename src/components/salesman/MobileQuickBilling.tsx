import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
import { Alert, AlertDescription } from '@/components/ui/alert';
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
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface CartItem {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  cost_price: number;
}

export function MobileQuickBilling() {
  const { businessId, user } = useAuth();
  const queryClient = useQueryClient();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('products');
  const { data: settings } = useBusinessSettings();

  const mobileCols = settings?.mobile_product_columns ?? settings?.product_columns ?? 2;
  const mobileColsClass = `grid-cols-${mobileCols}`;

  // Quantity dialog state
  const [quantityDialogOpen, setQuantityDialogOpen] = useState(false);
  const [quantityDialogProduct, setQuantityDialogProduct] = useState<any>(null);
  const [quantityValue, setQuantityValue] = useState('1');

  // Fetch products
  const { data: products = [] as any[], isLoading: productsLoading } = useQuery({
    queryKey: ['products', businessId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('business_id', businessId)
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: !!businessId,
  });

  // Fetch customers
  const { data: customers = [] } = useQuery({
    queryKey: ['customers', businessId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('business_id', businessId);
      if (error) throw error;
      return data;
    },
    enabled: !!businessId,
  });

  const subtotal = cart.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
  const total = subtotal; // Simplified for quick billing, tax logic can be added

  const addToCart = (product: any, quantity: number = 1) => {
    try {
      if (!product) throw new Error('Invalid product');
      const id = product.id ?? product.product_id;
      if (!id) throw new Error('Product id missing');

      const unitPrice = Number(product.selling_price ?? product.unit_price ?? 0) || 0;
      const costPrice = Number(product.cost_price ?? 0) || 0;

      setCart((prev) => {
        const existing = prev.find((item) => item.product_id === id);
        if (existing) {
          return prev.map((item) => (item.product_id === id ? { ...item, quantity: item.quantity + quantity } : item));
        }
        return [
          ...prev,
          {
            product_id: id,
            product_name: product.name ?? product.product_name ?? 'Unknown',
            quantity,
            unit_price: unitPrice,
            cost_price: costPrice,
          },
        ];
      });

      try { toast.success(`${product.name ?? product.product_name ?? 'Item'} added`); } catch (e) { /* ignore toast errors */ }
    } catch (err: any) {
      console.error('addToCart error:', err);
      try { toast.error(err?.message || 'Failed to add item'); } catch (e) {}
    }
  };

  const handleProductClick = (product: any) => {
    if (settings?.ask_quantity_first) {
      setQuantityDialogProduct(product);
      setQuantityValue('1');
      setQuantityDialogOpen(true);
    } else {
      addToCart(product);
    }
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

  const createDraftMutation = useMutation({
    mutationFn: async () => {
      if (cart.length === 0) throw new Error('Cart is empty');

      const salesmanName = user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Salesman';

      const items = cart.map(item => ({
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        cost_price: item.cost_price,
        total_price: item.unit_price * item.quantity
      }));

      const { data, error } = await (supabase.rpc as any)('create_draft_bill', {
        _business_id: businessId,
        _bill_number: `DFT-${Date.now().toString().slice(-6)}`, // Temporary bill number
        _customer_id: selectedCustomerId,
        _salesman_name: salesmanName,
        _subtotal: subtotal,
        _discount_amount: 0,
        _tax_amount: 0,
        _total_amount: total,
        _items: items
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Draft order saved successfully!');
      clearCart();
      setActiveTab('products');
      queryClient.invalidateQueries({ queryKey: ['draftBills'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (error: any) => {
      toast.error(`Checkout failed: ${error.message}`);
    }
  });

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.sku?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedCustomer = customers.find(c => c.id === selectedCustomerId);

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      {/* ── Premium Header ── */}
      <div className="bg-primary px-4 py-3 md:px-5 md:py-4 text-primary-foreground shadow-lg shrink-0 relative overflow-hidden backdrop-blur-md">
        {/* Subtle background pattern decoration */}
        <div className="absolute top-0 right-0 md:h-40 md:w-40 h-24 w-24 bg-white/5 rounded-full -mr-8 -mt-8 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 md:h-20 md:w-20 h-12 w-12 bg-white/5 rounded-full -ml-4 -mb-4 blur-2xl pointer-events-none" />

        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-white/20 flex items-center justify-center border border-white/10">
                <ShoppingCart className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold">Quick POS v2</h1>
                <div className="flex items-center gap-1 opacity-80">
                  <div className="h-1 w-1 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[10px] uppercase font-semibold leading-none">Professional Interface</span>
                </div>
              </div>
            </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-white/95 text-primary font-semibold px-2 py-0.5 shadow border-none text-sm">
              {cart.reduce((a, b) => a + b.quantity, 0)} Items
            </Badge>
          </div>
        </div>
      </div>

      {/* ── Responsive Layout ── */}
      <div className="flex-1 flex overflow-hidden">
        {/* ── Desktop/Tablet Side-by-Side (md+) ── */}
        <div className="hidden md:grid md:grid-cols-12 flex-1 overflow-hidden bg-background">
          {/* Left: Product Selection (7 columns) */}
          <div className="md:col-span-7 lg:col-span-8 flex flex-col border-r border-border overflow-hidden">
            <div className="p-4 bg-muted/20 border-b border-border sticky top-0 z-10">
              <div className="relative max-w-md mx-auto">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search name or scan SKU..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-11 h-11 bg-background border-border/60 rounded-xl shadow-sm focus-visible:ring-primary/20"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-muted/10 custom-scrollbar">
              {productsLoading ? (
                <div className="flex flex-col items-center justify-center py-20 opacity-40">
                  <Loader2 className="animate-spin h-8 w-8 mb-4 text-primary" />
                  <p className="text-sm font-medium tracking-tight">Refining Stock Inventory...</p>
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="text-center py-20 bg-muted/30 rounded-3xl border-2 border-dashed border-border/40 m-4 flex flex-col items-center">
                  <Package className="h-16 w-16 mb-4 text-muted-foreground/30" />
                  <p className="text-lg font-bold text-muted-foreground/50">Item Archive Empty</p>
                  <p className="text-sm text-muted-foreground/30">Adjust your search parameters</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-10">
                  {filteredProducts.map((product) => {
                    const available = product.stock_quantity - (product.reserved_quantity || 0);
                    const isLow = available <= product.low_stock_threshold;
                    return (
                      <Card
                        key={product.id}
                        className={cn(
                          "relative overflow-hidden border border-border shadow-sm group hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer active:scale-95",
                          available <= 0 ? 'opacity-50 grayscale pointer-events-none' : 'bg-card'
                        )}
                        onClick={() => handleProductClick(product)}
                      >
                        <CardContent className="p-0">
                          {/* Product visual area */}
                          <div className="h-28 bg-muted/60 relative flex items-center justify-center group-hover:bg-primary/5 transition-colors overflow-hidden">
                            <Package className="w-10 h-10 text-muted-foreground/20 group-hover:text-primary/20 transition-all group-hover:scale-125 group-hover:rotate-6" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            {isLow && available > 0 && (
                              <div className="absolute top-2 right-2 px-1.5 py-0.5 bg-amber-500 text-[8px] font-black text-white rounded uppercase tracking-tighter shadow-sm animate-pulse">Low Stock</div>
                            )}
                            <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/60 backdrop-blur-md rounded text-white text-[9px] font-black tracking-widest">{product.category_id ? 'CAT' : 'STOCK'}</div>
                          </div>

                          <div className="p-3 space-y-1">
                            <h3 className="font-bold text-xs uppercase tracking-tight line-clamp-2 h-8 leading-[1.1]">{product.name}</h3>
                            <div className="flex items-center justify-between pt-1">
                              <p className="text-lg font-black text-primary leading-none">₹{product.selling_price}</p>
                              <div className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-full border", isLow ? 'bg-red-500/10 text-red-600 border-red-200' : 'bg-muted text-muted-foreground border-transparent')}>
                                {available} Qty
                              </div>
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

          {/* Right: Checkout (5 columns) */}
          <div className="md:col-span-5 lg:col-span-4 flex flex-col overflow-hidden bg-card">
            <div className="p-4 border-b border-border bg-muted/30 flex items-center justify-between">
              <h2 className="font-black text-xs uppercase tracking-widest flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-primary" />
                Current Draft
              </h2>
              <Button variant="ghost" size="sm" onClick={clearCart} className="text-[10px] text-muted-foreground hover:text-destructive h-7 px-2">Discard</Button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground/30 p-8 text-center border-2 border-dashed border-border/50 rounded-3xl m-2">
                  <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4 border border-border/50">
                    <ShoppingCart className="w-8 h-8 opacity-20" />
                  </div>
                  <p className="font-bold text-sm tracking-tight">Shopping Basket Idle</p>
                  <p className="text-xs max-w-[150px] mt-1 opacity-60">Tap stock items to begin draft order</p>
                </div>
              ) : (
                cart.map((item) => (
                  <div key={item.product_id} className="relative group p-3 rounded-2xl border border-border/50 bg-background shadow-sm hover:border-primary/30 transition-all hover:shadow-md animate-in fade-in slide-in-from-right-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm leading-tight group-hover:text-primary transition-colors">{item.product_name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-primary font-black text-sm">₹{item.unit_price}</p>
                          <span className="text-[10px] px-1.5 py-0.5 bg-muted rounded font-mono text-muted-foreground font-bold">Sum: ₹{(item.unit_price * item.quantity).toFixed(0)}</span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 rounded-full text-muted-foreground/40 hover:text-destructive hover:bg-destructive/5"
                        onClick={() => removeFromCart(item.product_id)}
                      >
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                    <div className="flex items-center mt-3 justify-between bg-muted/20 p-1 rounded-xl">
                      <div className="flex items-center w-full justify-between gap-1 overflow-hidden h-7">
                        <Button
                          variant="ghost" size="sm"
                          className="h-full px-2 rounded-lg bg-background shadow-xs hover:bg-primary/10 hover:text-primary border border-border/20"
                          onClick={() => setCart(cart.map(i => i.product_id === item.product_id && i.quantity > 1 ? { ...i, quantity: i.quantity - 1 } : i))}
                        >
                          <Minus className="w-3 h-3" />
                        </Button>
                        <span className="font-black text-sm px-4 select-none">{item.quantity}</span>
                        <Button
                          variant="ghost" size="sm"
                          className="h-full px-2 rounded-lg bg-background shadow-xs hover:bg-primary/10 hover:text-primary border border-border/20"
                          onClick={() => setCart(cart.map(i => i.product_id === item.product_id ? { ...i, quantity: i.quantity + 1 } : i))}
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 bg-muted/50 border-t border-border space-y-4">
              {/* Summary Stats */}
              <div className="bg-background/80 backdrop-blur-sm p-4 rounded-2xl border border-border/50 shadow-sm space-y-2.5">
                <div className="flex justify-between items-center text-xs font-bold text-muted-foreground uppercase tracking-widest">
                  <span>Subtotal Gross</span>
                  <span className="text-foreground">₹{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-[10px] text-muted-foreground/60 uppercase font-black">
                  <span>Inventory Count</span>
                  <span>{cart.length} SKUs</span>
                </div>
                <div className="flex justify-between items-center pt-2.5 border-t border-dashed border-border/60">
                  <span className="text-xs font-black uppercase tracking-widest text-primary">Total Amount Due</span>
                  <span className="text-2xl font-black text-primary leading-none">₹{total.toFixed(0)}</span>
                </div>
              </div>

              {/* Customer Link */}
              <button
                onClick={() => setShowCustomerModal(true)}
                className="w-full group p-3 rounded-2xl bg-background border border-border/40 hover:border-primary/40 transition-all flex items-center justify-between shadow-xs active:scale-95"
              >
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-xl bg-muted/60 flex items-center justify-center text-muted-foreground/60 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                    <Users className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <p className="text-[10px] font-black uppercase tracking-tighter text-muted-foreground opacity-60">Customer Assignment</p>
                    <p className="font-bold text-sm leading-tight text-foreground truncate max-w-[150px]">
                      {selectedCustomer ? selectedCustomer.name : 'Unassigned Walk-in'}
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className="text-[9px] uppercase font-black tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">Select</Badge>
              </button>

              <Button
                className="w-full h-14 rounded-2xl bg-primary text-primary-foreground font-black text-base shadow-xl shadow-primary/20 hover:shadow-2xl hover:scale-[1.01] active:scale-[0.98] transition-all group overflow-hidden"
                disabled={cart.length === 0 || createDraftMutation.isPending}
                onClick={() => createDraftMutation.mutate()}
              >
                <div className="absolute top-0 left-0 h-full w-full bg-gradient-to-r from-white/10 to-transparent opacity-0 group-hover:opacity-100 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                {createDraftMutation.isPending ? (
                  <Loader2 className="w-5 h-5 animate-spin mr-3" />
                ) : (
                  <Check className="w-6 h-6 mr-3" />
                )}
                {createDraftMutation.isPending ? 'TRANSMITTING...' : `GENERATE DRAFT ORDER`}
              </Button>
            </div>
          </div>
        </div>

        {/* ── Mobile Tabbed View (md hidden) ── */}
        <div className="flex-1 md:hidden flex flex-col overflow-hidden bg-background pb-32">{/* reserve space for fixed bottom nav/actions */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="w-full rounded-none border-b grid grid-cols-2 bg-card h-12 p-1">
              <TabsTrigger value="products" className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">
                <Package className="w-4 h-4 mr-2" />
                Inventory
              </TabsTrigger>
              <TabsTrigger value="cart" className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all relative">
                <ShoppingCart className="w-4 h-4 mr-2" />
                Cart (₹{total.toFixed(0)})
                {cart.length > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white rounded-full flex items-center justify-center text-[10px] font-bold border-2 border-white shadow-sm ring-2 ring-transparent animate-bounce">
                    {cart.reduce((a, b) => a + b.quantity, 0)}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>

            {/* Products Tab */}
            <TabsContent value="products" className="flex-1 overflow-hidden flex flex-col m-0 p-0 bg-muted/5">
              <div className="p-4 bg-background border-b border-border/40">
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
                  <Input
                    placeholder="Search stock..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-11 h-11 bg-muted/40 border-none rounded-2xl text-sm"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
                {productsLoading ? (
                  <div className="flex justify-center py-10"><Loader2 className="animate-spin text-primary" /></div>
                ) : filteredProducts.length === 0 ? (
                  <div className="text-center py-20 text-muted-foreground/50 font-bold opacity-30">No products found</div>
                ) : (
                  <div className={`grid ${mobileColsClass} pb-28`} style={{ gridGap: `${settings?.mobile_grid_gap ?? settings?.grid_gap ?? 8}px` }}>
                    {filteredProducts.map((product) => {
                      const available = product.stock_quantity - (product.reserved_quantity || 0);
                      const isLow = available <= product.low_stock_threshold;
                      return (
                        <Card
                          key={product.id}
                          className={cn(
                            "overflow-hidden border-none shadow-[0_4px_12px_rgba(0,0,0,0.03)] active:scale-95 transition-transform",
                            available <= 0 ? 'opacity-40 grayscale pointer-events-none' : 'bg-background'
                          )}
                          onClick={() => available > 0 && addToCart(product)}
                        >
                          <CardContent className="p-0">
                            <div className="h-20 bg-muted/40 flex items-center justify-center relative">
                              <Package className="w-10 h-10 text-muted-foreground/10" />
                              {isLow && available > 0 && (
                                <div className="absolute top-2 right-2 px-1.5 py-0.5 bg-red-500 rounded text-white font-black text-[8px] uppercase">Low Stock</div>
                              )}
                              <div className="absolute bottom-1 right-2 text-primary font-black text-sm">₹{product.selling_price}</div>
                            </div>
                            <div className="p-1 space-y-1">
                              <p className="font-bold text-[11px] leading-tight line-clamp-2">{product.name}</p>
                              <div className={cn("text-[9px] font-black uppercase tracking-widest", isLow ? 'text-red-500' : 'text-muted-foreground/60')}>
                                Avail: {available}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Floating View Cart Button (visible on product screen) */}
              {cart.length > 0 && (
                <div className="fixed bottom-16 left-0 right-0 mx-3 mb-3 z-40 pointer-events-auto">
                  <div className="max-w-xl mx-auto flex items-center justify-between bg-primary text-primary-foreground rounded-2xl px-4 py-2 shadow-lg active:scale-95 transition-transform">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-white/10 flex items-center justify-center">
                        <ShoppingCart className="w-5 h-5" />
                      </div>
                      <div className="font-bold">View Cart</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="h-7 min-w-[32px] px-2 bg-white/10 rounded-full flex items-center justify-center text-sm font-black">{cart.reduce((a, b) => a + b.quantity, 0)}</div>
                      <div className="font-bold">₹{memoizedTotal.toFixed(0)}</div>
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Checkout Tab */}
            <TabsContent value="cart" className="flex-1 overflow-hidden flex flex-col m-0 p-0 bg-muted/10">
              <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar pb-28">
                {cart.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground/40 text-center space-y-4">
                    <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center mb-2 border border-border/50">
                      <ShoppingCart className="w-10 h-10 opacity-10" />
                    </div>
                    <p className="font-black text-sm uppercase tracking-widest">Cart is empty</p>
                    <Button variant="outline" className="rounded-xl border-primary/20 text-primary" onClick={() => setActiveTab('products')}>Explore Inventory</Button>
                  </div>
                ) : (
                  <>
                    <div className="space-y-2.5">
                      {cart.map((item) => (
                        <div key={item.product_id} className="flex items-center justify-between gap-3 p-2 rounded-lg border border-border/50 bg-card shadow-sm animate-in fade-in slide-in-from-bottom-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-sm truncate leading-tight">{item.product_name}</p>
                            <div className="text-[12px] text-muted-foreground mt-0.5">
                              ₹{item.unit_price} × {item.quantity} = <span className="text-primary font-semibold">₹{(item.unit_price * item.quantity).toFixed(0)}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <div className="flex items-center rounded-md bg-muted/30 px-1 py-0.5 gap-1">
                              <button
                                aria-label="decrease"
                                onClick={() => setCart(cart.map(i => i.product_id === item.product_id && i.quantity > 1 ? { ...i, quantity: i.quantity - 1 } : i))}
                                className="h-6 w-6 flex items-center justify-center rounded-md bg-transparent text-muted-foreground hover:text-primary active:scale-95"
                                style={{ touchAction: 'manipulation' }}
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <div className="px-3 text-sm font-black select-none">{item.quantity}</div>
                              <button
                                aria-label="increase"
                                onClick={() => setCart(cart.map(i => i.product_id === item.product_id ? { ...i, quantity: i.quantity + 1 } : i))}
                                className="h-6 w-6 flex items-center justify-center rounded-md bg-transparent text-muted-foreground hover:text-primary active:scale-95"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>

                            <button
                              onClick={() => removeFromCart(item.product_id)}
                              className="h-8 w-8 flex items-center justify-center rounded-full text-muted-foreground/60 hover:text-destructive hover:bg-destructive/5"
                              aria-label="remove"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="bg-primary/5 border border-primary/10 p-4 rounded-2xl space-y-3 mt-4">
                      <div className="flex justify-between text-xs font-bold text-muted-foreground uppercase tracking-widest leading-none">
                        <span>Sum Total</span>
                        <span className="text-foreground">₹{memoizedSubtotal.toFixed(0)}</span>
                      </div>
                      <div className="flex justify-between font-black text-2xl pt-4 border-t border-primary/5 text-primary leading-none items-end">
                        <span className="text-[10px] uppercase tracking-[0.2em] mb-1">Payable Now</span>
                        <span>₹{memoizedTotal.toFixed(0)}</span>
                      </div>
                    </div>

                    <div
                      className="bg-background border border-border/60 p-3 rounded-2xl flex items-center justify-between shadow-xs active:scale-95 transition-all text-left"
                      onClick={() => setShowCustomerModal(true)}
                    >
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-xl bg-muted/50 flex items-center justify-center text-muted-foreground/50">
                          <Users className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase text-muted-foreground opacity-50">Customer</p>
                          <p className="font-bold text-sm tracking-tight">
                            {selectedCustomer ? selectedCustomer.name : 'Walk-in Customer'}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground/40" />
                    </div>
                  </>
                )}
              </div>

              {/* Fixed Bottom Action Mobile */}
              {/* Fixed checkout bar placed above bottom nav */}
              <div className="fixed bottom-16 left-0 right-0 z-50 px-4 safe-area-bottom">
                {cart.length > 0 && (
                  <div className="mx-auto max-w-xl grid grid-cols-4 gap-3">
                    <Button
                      variant="outline"
                      className="col-span-1 rounded-2xl h-14 border-muted-foreground/20 text-muted-foreground"
                      onClick={clearCart}
                      disabled={createDraftMutation.isPending}
                    >
                      <Trash2 className="w-6 h-6" />
                    </Button>
                    <Button
                      className="col-span-3 rounded-2xl h-14 bg-primary font-black text-sm tracking-widest shadow-xl shadow-primary/20 active:scale-[0.98] transition-all"
                      disabled={cart.length === 0 || createDraftMutation.isPending}
                      onClick={() => createDraftMutation.mutate()}
                    >
                      {createDraftMutation.isPending ? (
                        <Loader2 className="w-5 h-5 animate-spin mr-3" />
                      ) : (
                        <Check className="w-6 h-6 mr-3" />
                      )}
                      {createDraftMutation.isPending ? 'PROCESSING...' : `SAVE DRAFT - ₹${total.toFixed(0)}`}
                    </Button>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* ── Modals ── */}
      <Dialog open={showCustomerModal} onOpenChange={setShowCustomerModal}>
        <DialogContent className="max-w-[400px] w-[95vw] rounded-3xl p-0 overflow-hidden border-none shadow-2xl">
          <DialogHeader className="p-6 bg-muted/30 border-b border-border">
            <DialogTitle className="text-xl font-black uppercase tracking-widest flex items-center gap-3">
              <Users className="w-6 h-6 text-primary" />
              Customer Desk
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto p-3 space-y-2 custom-scrollbar bg-background">
            <Button
              variant="ghost"
              className="w-full justify-between h-14 rounded-2xl border-2 border-transparent hover:border-primary/20 hover:bg-primary/5 transition-all text-left px-5 group"
              onClick={() => {
                setSelectedCustomerId(null);
                setShowCustomerModal(false);
              }}
            >
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                  <Package className="w-5 h-5" />
                </div>
                <span className="font-bold tracking-tight">Generic Walk-in Customer</span>
              </div>
              <Check className="w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity text-primary" />
            </Button>

            <div className="px-2 pt-2 pb-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">Registered Clients</span>
            </div>

            {customers.map((c) => (
              <Button
                key={c.id}
                variant="ghost"
                className={cn(
                  "w-full justify-between h-16 rounded-2xl border-2 transition-all text-left px-5 items-center flex group",
                  selectedCustomerId === c.id ? 'border-primary bg-primary/5' : 'border-transparent hover:border-muted-foreground/10 hover:bg-muted/30'
                )}
                onClick={() => {
                  setSelectedCustomerId(c.id);
                  setShowCustomerModal(false);
                }}
              >
                <div className="flex items-center gap-4">
                  <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center font-black", selectedCustomerId === c.id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground opacity-60')}>
                    {c.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-bold tracking-tight text-foreground">{c.name}</p>
                    {c.phone && <p className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">📱 {c.phone}</p>}
                  </div>
                </div>
                {selectedCustomerId === c.id && <Check className="w-5 h-5 text-primary" />}
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Quantity Dialog ── */}
      <Dialog open={quantityDialogOpen} onOpenChange={setQuantityDialogOpen}>
        <DialogContent className="max-w-[320px] rounded-3xl p-6 border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-center font-black uppercase tracking-widest text-primary">Set Quantity</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4 text-center">
            <p className="text-sm font-bold opacity-60 leading-tight">{quantityDialogProduct?.name}</p>
            <Input
              type="number"
              value={quantityValue}
              onChange={(e) => setQuantityValue(e.target.value)}
              className="text-3xl h-16 text-center font-black border-none bg-muted/20 rounded-2xl focus-visible:ring-primary/20"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && confirmQuantityDialog()}
            />
            <div className="grid grid-cols-3 gap-2">
              {[1, 5, 10].map(q => (
                <Button key={q} variant="outline" className="rounded-xl h-10 font-bold" onClick={() => setQuantityValue(q.toString())}>+{q}</Button>
              ))}
            </div>
          </div>
          <Button className="w-full h-12 rounded-2xl font-black tracking-widest shadow-lg shadow-primary/20" onClick={confirmQuantityDialog}>ADD TO DRAFT</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}

