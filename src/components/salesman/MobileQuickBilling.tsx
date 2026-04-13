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
  const [activeView, setActiveView] = useState<'products' | 'cart'>('products');
  const { data: settings } = useBusinessSettings();
  const [billLayout] = useState<'grid' | 'list'>(() =>
    (localStorage.getItem('salesman_bill_layout') as 'grid' | 'list') || 'grid'
  );

  const [quantityDialogOpen, setQuantityDialogOpen] = useState(false);
  const [quantityDialogProduct, setQuantityDialogProduct] = useState<any>(null);
  const [quantityValue, setQuantityValue] = useState('1');

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
    queryKey: ['customers'],
    queryFn: async () => {
      const { data, error } = await supabase.from('customers').select('*');
      if (error) throw error;
      return data;
    },
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
    if (billLayout === 'list' || settings?.ask_quantity_first) {
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

  const updateQuantity = (productId: string, delta: number) => {
    setCart(cart.map(i =>
      i.product_id === productId
        ? { ...i, quantity: Math.max(1, i.quantity + delta) }
        : i
    ));
  };

  // Mutation to generate a new order (status: 'pending')
  const generateOrderMutation = useMutation({
    mutationFn: async () => {
      if (cart.length === 0) throw new Error('Cart is empty');
      const salesmanName = user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Salesman';
      const items = cart.map(item => ({
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        cost_price: item.cost_price,
        total_price: item.unit_price * item.quantity,
      }));
      const { data, error } = await supabase
        .from('bills')
        .insert({
          business_id: businessId,
          bill_number: `ORD-${Date.now().toString().slice(-6)}`,
          customer_id: selectedCustomerId,
          salesman_name: salesmanName,
          subtotal: subtotal,
          discount_amount: 0,
          tax_amount: 0,
          total_amount: total,
          items,
          status: 'pending',
          created_by: user?.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Order generated!');
      clearCart();
      setActiveView('products');
      queryClient.invalidateQueries({ queryKey: ['salesmanOrders'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
                      </div>
                      {isLow && available > 0 && (
                        <Badge className="bg-amber-500 text-white text-[8px] px-1 py-0 h-4 border-none shrink-0">Low</Badge>
                      )}
                    <Button
                      className="w-full h-11 rounded-xl font-bold text-sm"
                      disabled={generateOrderMutation.isPending}
                      onClick={() => generateOrderMutation.mutate()}
                    >
                      {generateOrderMutation.isPending ? (
                        <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Processing...</>
                      ) : (
                        <><Check className="w-4 h-4 mr-2" /> Generate Order · ₹{total.toFixed(0)}</>
                      )}
                    </Button>
                      key={product.id}
                      className={cn(
                        "cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all active:scale-95",
                        available <= 0 && "opacity-40 pointer-events-none"
                      )}
                      onClick={() => handleProductClick(product)}
                    >
                      <CardContent className="p-0">
                        <div className="h-24 bg-muted/40 flex items-center justify-center relative">
                          <Package className="w-8 h-8 text-muted-foreground/15" />
                          {isLow && available > 0 && (
                            <Badge className="absolute top-1.5 right-1.5 bg-amber-500 text-white text-[8px] px-1 py-0 h-4 border-none">Low</Badge>
                          )}
                        </div>
                        <div className="p-2.5">
                          <p className="font-semibold text-xs line-clamp-2 leading-tight mb-1">{product.name}</p>
                          <div className="flex items-center justify-between">
                            <span className="text-primary font-bold text-sm">₹{product.selling_price}</span>
                            <span className={cn("text-[10px] font-medium", isLow ? "text-red-500" : "text-muted-foreground")}>
                              {available} left
                            </span>
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
                      <p className="text-xs text-muted-foreground mt-0.5">₹{item.unit_price} × {item.quantity} = <span className="text-primary font-semibold">₹{(item.unit_price * item.quantity).toFixed(0)}</span></p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground/40 hover:text-destructive" onClick={() => removeFromCart(item.product_id)}>
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                  <div className="flex items-center justify-center gap-4 mt-2 bg-muted/30 rounded-lg p-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md" onClick={() => updateQuantity(item.product_id, -1)}>
                      <Minus className="w-3 h-3" />
                    </Button>
                    <span className="font-bold text-sm w-8 text-center">{item.quantity}</span>
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
                      <button
                        key={product.id}
                        className={cn(
                          "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg border border-border/50 bg-card text-left active:scale-[0.98] transition-transform",
                          available <= 0 && "opacity-30 pointer-events-none",
                          inCart && "ring-2 ring-primary/40"
                        )}
                        onClick={() => handleProductClick(product)}
                      >
                        <div className="h-9 w-9 rounded-lg bg-muted/30 flex items-center justify-center shrink-0 relative">
                          <Package className="w-4 h-4 text-muted-foreground/15" />
                          {inCart && (
                            <span className="absolute -top-1 -left-1 bg-primary text-primary-foreground text-[8px] font-bold h-3.5 w-3.5 rounded-full flex items-center justify-center">
                              {inCart.quantity}
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-medium leading-tight line-clamp-1">{product.name}</p>
                          <p className={cn("text-[9px] font-medium", isLow ? "text-red-500" : "text-muted-foreground/60")}>
                            {available} left {isLow && available > 0 ? '· LOW' : ''}
                          </p>
                        </div>
                        <p className="text-primary font-bold text-xs shrink-0">₹{product.selling_price}</p>
                      </button>
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
                          "relative rounded-xl overflow-hidden bg-card border border-border/50 text-left active:scale-95 transition-transform",
                          available <= 0 && "opacity-30 pointer-events-none",
                          inCart && "ring-2 ring-primary/40"
                        )}
                        onClick={() => handleProductClick(product)}
                      >
                        <div className="h-16 bg-muted/30 flex items-center justify-center relative">
                          <Package className="w-6 h-6 text-muted-foreground/10" />
                          {isLow && available > 0 && (
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
                          <p className="text-[11px] text-muted-foreground">
                            ₹{item.unit_price} × {item.quantity} = <span className="text-primary font-semibold">₹{(item.unit_price * item.quantity).toFixed(0)}</span>
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="flex items-center gap-1 bg-muted/30 rounded-md px-1 py-0.5">
                            <Button variant="ghost" size="icon" className="h-6 w-6 rounded" onClick={() => updateQuantity(item.product_id, -1)}>
                              <Minus className="w-3 h-3" />
                            </Button>
                            <span className="font-bold text-sm w-6 text-center">{item.quantity}</span>
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
                  disabled={createDraftMutation.isPending}
                  onClick={() => createDraftMutation.mutate()}
                >
                  {createDraftMutation.isPending ? (
                    <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Processing...</>
                  ) : (
                    <><Check className="w-4 h-4 mr-2" /> Save Draft Order</>
                  )}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Customer Modal ── */}
      <Dialog open={showCustomerModal} onOpenChange={setShowCustomerModal}>
        <DialogContent className="max-w-sm w-[92vw] rounded-2xl p-0 overflow-hidden">
          <DialogHeader className="p-4 border-b border-border">
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              Select Customer
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-[50vh] overflow-y-auto p-2 space-y-1">
            <Button
              variant="ghost"
              className="w-full justify-start h-12 rounded-lg px-3"
              onClick={() => { setSelectedCustomerId(null); setShowCustomerModal(false); }}
            >
              <Package className="w-4 h-4 mr-3 text-muted-foreground" />
              <span className="font-medium">Walk-in Customer</span>
            </Button>
            {customers.map((c: any) => (
              <Button
                key={c.id}
                variant="ghost"
                className={cn(
                  "w-full justify-start h-12 rounded-lg px-3",
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
                  {c.phone && <p className="text-[10px] text-muted-foreground">{c.phone}</p>}
                </div>
                {selectedCustomerId === c.id && <Check className="w-4 h-4 ml-auto text-primary" />}
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Quantity Dialog ── */}
      <Dialog open={quantityDialogOpen} onOpenChange={setQuantityDialogOpen}>
        <DialogContent className="max-w-[280px] rounded-2xl p-5">
          <DialogHeader>
            <DialogTitle className="text-center text-sm font-bold">Set Quantity</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 text-center">
            <p className="text-xs text-muted-foreground">{quantityDialogProduct?.name}</p>
            <Input
              type="number"
              value={quantityValue}
              onChange={(e) => setQuantityValue(e.target.value)}
              className="text-2xl h-14 text-center font-bold rounded-xl"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && confirmQuantityDialog()}
            />
            <div className="grid grid-cols-3 gap-2">
              {[1, 5, 10].map(q => (
                <Button key={q} variant="outline" size="sm" className="rounded-lg" onClick={() => setQuantityValue(q.toString())}>+{q}</Button>
              ))}
            </div>
          </div>
          <Button className="w-full h-10 rounded-xl font-bold text-sm" onClick={confirmQuantityDialog}>Add to Cart</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
