// ============================================================
// MOBILE-OPTIMIZED SALESMAN INTERFACE
// ============================================================
// Location: src/components/salesman/MobileQuickBilling.tsx

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Plus,
  Minus,
  Trash2,
  Check,
  X,
  QrCode,
  Package,
  Search,
  ShoppingCart,
  Users,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface MobileQuickBillingProps {
  businessId: string;
}

interface CartItem {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  cost_price: number;
}

export function MobileQuickBilling({ businessId }: MobileQuickBillingProps) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [paymentMode, setPaymentMode] = useState<'cash' | 'upi' | 'card' | 'credit'>('cash');
  const [tempNotes, setTempNotes] = useState('');

  const subtotal = cart.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
  const tax = subtotal * 0.18; // 18% tax (adjust as needed)
  const total = subtotal + tax;

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
          unit_price: product.selling_price,
          cost_price: product.cost_price,
        },
      ]);
    }
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter((item) => item.product_id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setSelectedCustomer(null);
    setPaymentMode('cash');
  };

  return (
    <div className="w-full max-w-md mx-auto bg-white rounded-lg shadow-lg">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 text-white rounded-t-lg">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            Quick Billing
          </h1>
          <Badge variant="secondary" className="bg-white text-blue-600">
            {cart.length} items
          </Badge>
        </div>
        <p className="text-sm text-blue-100">Fast mobile checkout</p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="products" className="w-full">
        <TabsList className="w-full rounded-none border-b">
          <TabsTrigger value="products" className="flex-1">
            <Package className="w-4 h-4 mr-2" />
            Products
          </TabsTrigger>
          <TabsTrigger value="cart" className="flex-1">
            <ShoppingCart className="w-4 h-4 mr-2" />
            Cart
          </TabsTrigger>
        </TabsList>

        {/* Products Tab */}
        <TabsContent value="products" className="p-4 space-y-3 max-h-96 overflow-y-auto">
          <Input
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="mb-3"
            icon={<Search className="w-4 h-4" />}
          />

          {/* Sample products - replace with real data */}
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: '1', name: 'Product A', selling_price: 250, cost_price: 150 },
              { id: '2', name: 'Product B', selling_price: 500, cost_price: 300 },
              { id: '3', name: 'Product C', selling_price: 1000, cost_price: 600 },
              { id: '4', name: 'Product D', selling_price: 350, cost_price: 200 },
            ].map((product) => (
              <Card
                key={product.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => addToCart(product)}
              >
                <CardContent className="p-3 text-center">
                  <Package className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  <p className="font-medium text-sm truncate">{product.name}</p>
                  <p className="text-lg font-bold text-green-600">₹{product.selling_price}</p>
                  <Button variant="outline" size="sm" className="w-full mt-2 text-xs">
                    <Plus className="w-3 h-3 mr-1" />
                    Add
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Cart Tab */}
        <TabsContent value="cart" className="p-4 space-y-4">
          {cart.length === 0 ? (
            <Alert>
              <AlertDescription>Cart is empty. Add products to continue.</AlertDescription>
            </Alert>
          ) : (
            <>
              {/* Cart Items */}
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {cart.map((item) => (
                  <Card key={item.product_id} className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium text-sm">{item.product_name}</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFromCart(item.product_id)}
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
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
                        <span className="font-bold w-8 text-center">{item.quantity}</span>
                        <Button
                          variant="outline"
                          size="sm"
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
                      <p className="font-bold">
                        ₹{(item.unit_price * item.quantity).toFixed(2)}
                      </p>
                    </div>
                  </Card>
                ))}
              </div>

              {/* Bill Summary */}
              <Card className="bg-gray-50 p-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal</span>
                  <span>₹{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Tax (18%)</span>
                  <span>₹{tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg pt-2 border-t">
                  <span>Total</span>
                  <span className="text-green-600">₹{total.toFixed(2)}</span>
                </div>
              </Card>

              {/* Customer Selection */}
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setShowCustomerModal(true)}
              >
                <Users className="w-4 h-4 mr-2" />
                {selectedCustomer ? selectedCustomer.name : 'Select Customer'}
              </Button>

              {/* Checkout Buttons */}
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" onClick={clearCart}>
                  <X className="w-4 h-4 mr-1" />
                  Clear
                </Button>
                <Button className="bg-green-600 hover:bg-green-700">
                  <Check className="w-4 h-4 mr-1" />
                  Checkout
                </Button>
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
