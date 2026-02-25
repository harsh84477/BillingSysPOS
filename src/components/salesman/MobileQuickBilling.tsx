import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
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
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

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

  const addToCart = (product: any) => {
    const existing = cart.find((item) => item.product_id === product.id);
    if (existing) {
      setCart(
        cart.map((item) =>
          item.product_id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        )
      );
    } else {
      setCart([
        ...cart,
        {
          product_id: product.id,
          product_name: product.name,
          quantity: 1,
          unit_price: Number(product.selling_price),
          cost_price: Number(product.cost_price),
        },
      ]);
    }
    toast.success(`${product.name} added`);
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
    <div className="flex flex-col h-full bg-slate-50">
      {/* Header */}
      <div className="bg-primary p-4 text-primary-foreground shadow-md shrink-0">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            Quick POS
          </h1>
          <Badge variant="secondary" className="bg-white text-primary font-bold">
            {cart.reduce((a, b) => a + b.quantity, 0)} Items
          </Badge>
        </div>
        <p className="text-xs text-primary-foreground/80">Salesmate Interface</p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="w-full rounded-none border-b grid grid-cols-2 bg-white h-12">
          <TabsTrigger value="products" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
            <Package className="w-4 h-4 mr-2" />
            Stock
          </TabsTrigger>
          <TabsTrigger value="cart" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
            <ShoppingCart className="w-4 h-4 mr-2" />
            Checkout (₹{total.toFixed(0)})
          </TabsTrigger>
        </TabsList>

        {/* Products Tab */}
        <TabsContent value="products" className="flex-1 overflow-hidden flex flex-col m-0 p-0">
          <div className="p-3 bg-white border-b sticky top-0 z-10">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search products or SKU..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-10 bg-slate-50 border-none rounded-full"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 bg-slate-50 custom-scrollbar">
            {productsLoading ? (
              <div className="flex justify-center py-10"><Loader2 className="animate-spin text-primary" /></div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-10 text-slate-400">No products found</div>
            ) : (
              <div className="grid grid-cols-2 gap-3 pb-4">
                {filteredProducts.map((product) => {
                  const available = product.stock_quantity - (product.reserved_quantity || 0);
                  const isLow = available <= product.low_stock_threshold;
                  return (
                    <Card
                      key={product.id}
                      className={`overflow-hidden border-none shadow-sm active:scale-95 transition-transform ${available <= 0 ? 'opacity-60 grayscale' : ''}`}
                      onClick={() => available > 0 && addToCart(product)}
                    >
                      <CardContent className="p-0">
                        <div className="h-20 bg-slate-200 flex items-center justify-center text-slate-400">
                          <Package className="w-8 h-8" />
                        </div>
                        <div className="p-2 space-y-1 text-center">
                          <p className="font-bold text-xs truncate leading-tight h-8">{product.name}</p>
                          <p className="text-lg font-black text-primary">₹{product.selling_price}</p>
                          <div className={`text-[10px] font-bold ${isLow ? 'text-red-500' : 'text-slate-500'}`}>
                            Stock: {available}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Checkout Tab */}
        <TabsContent value="cart" className="flex-1 overflow-hidden flex flex-col m-0 p-0">
          <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-slate-400 bg-white rounded-xl shadow-inner m-4 border-2 border-dashed">
                <ShoppingCart className="w-12 h-12 mb-2 opacity-20" />
                <p>Empty Cart</p>
                <Button variant="link" onClick={() => setActiveTab('products')}>Go to Stock</Button>
              </div>
            ) : (
              <>
                {/* Cart Items */}
                <div className="space-y-2">
                  {cart.map((item) => (
                    <div key={item.product_id} className="bg-white p-3 rounded-xl shadow-sm border border-slate-100">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 pr-2">
                          <p className="font-bold text-sm leading-tight mb-1">{item.product_name}</p>
                          <div className="flex items-center gap-2">
                            <p className="text-primary font-bold">₹{item.unit_price}</p>
                            <p className="text-[10px] text-slate-400">Total: ₹{(item.unit_price * item.quantity).toFixed(0)}</p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-slate-300 hover:text-red-500"
                          onClick={() => removeFromCart(item.product_id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="flex items-center justify-between mt-3 bg-slate-50 p-1.5 rounded-lg">
                        <div className="flex items-center gap-4">
                          <Button
                            variant="secondary"
                            size="icon"
                            className="h-8 w-8 rounded-full bg-white shadow-sm"
                            onClick={() =>
                              setCart(
                                cart.map((i) =>
                                  i.product_id === item.product_id && i.quantity > 1
                                    ? { ...i, quantity: i.quantity - 1 }
                                    : i
                                )
                              )
                            }
                          >
                            <Minus className="w-3 h-3" />
                          </Button>
                          <span className="font-black text-base">{item.quantity}</span>
                          <Button
                            variant="secondary"
                            size="icon"
                            className="h-8 w-8 rounded-full bg-white shadow-sm"
                            onClick={() =>
                              setCart(
                                cart.map((i) =>
                                  i.product_id === item.product_id
                                    ? { ...i, quantity: i.quantity + 1 }
                                    : i
                                )
                              )
                            }
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Bill Summary */}
                <div className="bg-primary/5 border border-primary/20 p-4 rounded-xl space-y-2 mt-4">
                  <div className="flex justify-between text-sm text-slate-600">
                    <span>Subtotal</span>
                    <span className="font-bold">₹{subtotal.toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>Items Count</span>
                    <span>{cart.length}</span>
                  </div>
                  <div className="flex justify-between font-black text-xl pt-3 border-t border-primary/10 text-primary">
                    <span>Payable</span>
                    <span>₹{total.toFixed(0)}</span>
                  </div>
                </div>

                {/* Customer Selection */}
                <Card
                  className="bg-white border-2 border-slate-100 shadow-none cursor-pointer active:bg-slate-50"
                  onClick={() => setShowCustomerModal(true)}
                >
                  <CardContent className="p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                        <Users className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs text-slate-400">Customer</p>
                        <p className="font-bold text-sm">
                          {selectedCustomer ? selectedCustomer.name : 'Walk-in Customer'}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[10px]">Change</Badge>
                  </CardContent>
                </Card>
              </>
            )}
          </div>

          {/* Fixed Bottom Action */}
          <div className="p-4 bg-white border-t space-y-3 shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
            {cart.length > 0 && (
              <div className="grid grid-cols-4 gap-2">
                <Button
                  variant="outline"
                  className="col-span-1 rounded-xl h-12"
                  onClick={clearCart}
                  disabled={createDraftMutation.isPending}
                >
                  <Trash2 className="w-5 h-5" />
                </Button>
                <Button
                  className="col-span-3 rounded-xl h-12 bg-primary font-bold shadow-lg shadow-primary/20 active:scale-95 transition-transform"
                  disabled={cart.length === 0 || createDraftMutation.isPending}
                  onClick={() => createDraftMutation.mutate()}
                >
                  {createDraftMutation.isPending ? (
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  ) : (
                    <Check className="w-5 h-5 mr-2" />
                  )}
                  {createDraftMutation.isPending ? 'Processing...' : `Save Draft Order`}
                </Button>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Customer Modal */}
      <Dialog open={showCustomerModal} onOpenChange={setShowCustomerModal}>
        <DialogContent className="max-w-[90vw] rounded-2xl p-0 overflow-hidden">
          <DialogHeader className="p-4 border-b bg-slate-50">
            <DialogTitle>Select Customer</DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto p-2 space-y-1">
            <Button
              variant="ghost"
              className="w-full justify-start h-12 rounded-xl"
              onClick={() => {
                setSelectedCustomerId(null);
                setShowCustomerModal(false);
              }}
            >
              Walk-in Customer
            </Button>
            {customers.map((c) => (
              <Button
                key={c.id}
                variant={selectedCustomerId === c.id ? 'secondary' : 'ghost'}
                className="w-full justify-start h-14 rounded-xl flex flex-col items-start px-4"
                onClick={() => {
                  setSelectedCustomerId(c.id);
                  setShowCustomerModal(false);
                }}
              >
                <span className="font-bold">{c.name}</span>
                {c.phone && <span className="text-[10px] text-slate-400">{c.phone}</span>}
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

