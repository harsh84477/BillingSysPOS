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
  DialogDescription,
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
  Building2,
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
  User,
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

  // Print bill function using a hidden iframe for better mobile compatibility
  const printBill = (billNumber: string) => {
    const paperWidth = settings?.invoice_paper_width || '80mm';
    const headerAlign = settings?.invoice_header_align || 'center';
    const fontSize = settings?.invoice_font_size || 12;
    const footerFontSize = settings?.invoice_footer_font_size || 10;
    const spacing = settings?.invoice_spacing || 4;

    const widthStyle = paperWidth === '58mm' ? '240px' : paperWidth === 'A4' ? '100%' : '380px';
    const maxWidthStyle = paperWidth === 'A4' ? '800px' : widthStyle;
    const qrSize = paperWidth === '58mm' ? 100 : 120;

    const printContent = `
      <html>
        <head>
          <title>Bill #${billNumber}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: ${settings?.invoice_style === 'modern' ? "'Inter', sans-serif" : "Courier, monospace"}; 
              width: ${widthStyle}; 
              max-width: ${maxWidthStyle};
              margin: ${paperWidth === 'A4' ? '0 auto' : '0'};
              padding: ${paperWidth === 'A4' ? '40px' : '15px'};
              font-size: ${fontSize}px;
              line-height: 1.4;
            }
            .header { text-align: ${headerAlign}; margin-bottom: 20px; }
            .header h1 { margin: 0; font-size: ${fontSize + 6}px; }
            .header p { margin: 2px 0; font-size: ${fontSize - 2}px; color: #666; }
            .bill-info { border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 10px 0; margin: 10px 0; }
            .bill-info p { margin: 3px 0; font-size: ${fontSize - 1}px; }
            .items { margin: 15px 0; }
            .item-header { display: flex; font-weight: bold; border-bottom: 2px solid #000; padding: 8px 0; margin-bottom: 8px; text-transform: uppercase; font-size: ${fontSize - 1}px; }
            .item-row { display: flex; padding: ${spacing}px 0; font-size: ${fontSize - 1}px; }
            .item-row:nth-of-type(even) { background-color: ${settings?.invoice_style === 'modern' ? '#f9fafb' : 'transparent'}; }
            .totals { border-top: 1px solid #000; padding-top: 10px; margin-top: 20px; }
            .total-row { display: flex; justify-content: space-between; font-size: ${fontSize}px; margin: 5px 0; }
            .grand-total { font-size: ${fontSize + 4}px; font-weight: bold; border-top: 2px solid #000; padding: 10px 0; margin-top: 10px; }
            .footer { text-align: center; margin-top: 40px; border-top: 1px solid #ccc; padding-top: 20px; }
            .footer-msg { font-size: ${footerFontSize}px; font-weight: bold; margin-bottom: 5px; }
            .terms { font-size: ${fontSize - 3}px; color: #4b5563; margin-top: 15px; text-align: left; font-style: italic; }
            .qr-placeholder { margin: 15px auto; width: 80px; height: 80px; border: 1px dashed #ccc; display: flex; align-items: center; justify-content: center; font-size: 8px; color: #999; }
          </style>
          <script>
            window.onload = function() {
              var images = document.getElementsByTagName('img');
              var loaded = 0;
              var total = images.length;
              
              if (total === 0) {
                setTimeout(function() { window.print(); }, 800);
                return;
              }

              function checkAllLoaded() {
                loaded++;
                if (loaded >= total) {
                  setTimeout(function() { window.print(); }, 1000);
                }
              }

              for (var i = 0; i < total; i++) {
                if (images[i].complete) {
                  checkAllLoaded();
                } else {
                  images[i].addEventListener('load', checkAllLoaded);
                  images[i].addEventListener('error', checkAllLoaded);
                }
              }

              setTimeout(function() {
                if (loaded < total) window.print();
              }, 3000);
            };
          </script>
        </head>
        <body>
          <div class="header">
            <h1>${settings?.business_name || 'Business'}</h1>
            ${settings?.invoice_show_business_address !== false && settings?.address ? `<p>${settings.address}</p>` : ''}
            ${settings?.invoice_show_business_phone !== false && settings?.phone ? `<p>Ph: ${settings.phone}</p>` : ''}
            ${settings?.invoice_show_business_email !== false && settings?.email ? `<p>${settings.email}</p>` : ''}
            ${settings?.invoice_show_gst !== false && settings?.gst_number ? `<p>GST: ${settings.gst_number}</p>` : ''}
          </div>
          <div class="bill-info">
            <p><strong>Bill #:</strong> ${billNumber}</p>
            <p><strong>Date:</strong> ${new Date().toLocaleDateString('en-IN')} ${new Date().toLocaleTimeString('en-IN')}</p>
            ${customerName || selectedCustomer?.name ? `<p><strong>Customer:</strong> ${customerName || selectedCustomer?.name}</p>` : ''}
          </div>
          <div class="items">
            <div class="item-header">
              <span style="flex: ${settings?.invoice_show_unit_price !== false ? '2' : '2.8'};">ITEM</span>
              ${settings?.invoice_show_unit_price !== false ? '<span style="flex: 0.8; text-align: right;">PRICE</span>' : ''}
              <span style="flex: 0.5; text-align: right;">QTY</span>
              <span style="flex: 1; text-align: right;">TOTAL</span>
            </div>
            ${cart.map(item => `
              <div class="item-row">
                <div style="flex: ${settings?.invoice_show_unit_price !== false ? '2' : '2.8'}; overflow-wrap: break-word;">
                  <div>${item.name}</div>
                  ${settings?.invoice_show_item_price === true ? `
                    <div style="font-size: ${fontSize - 3}px; color: #666;">
                      ${item.unitPrice.toFixed(0)} x ${item.quantity}
                    </div>
                  ` : ''}
                </div>
                ${settings?.invoice_show_unit_price !== false ? `<span style="flex: 0.8; text-align: right;">${item.unitPrice.toFixed(0)}</span>` : ''}
                <span style="flex: 0.5; text-align: right;">${item.quantity}</span>
                <span style="flex: 1; text-align: right;">${(item.unitPrice * item.quantity).toFixed(0)}</span>
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
            <div class="footer-msg">${settings?.invoice_footer_message || 'Thank you for your purchase!'}</div>
            
            ${settings?.invoice_terms_conditions ? `
              <div class="terms">
                <strong>T&C:</strong> ${settings.invoice_terms_conditions}
              </div>
            ` : ''}

            ${settings?.invoice_show_qr_code && settings?.upi_id ? `
              <div class="qr-container" style="margin: 15px auto; text-align: center; min-height: ${qrSize}px;">
                <img 
                  src="https://api.qrserver.com/v1/create-qr-code/?size=${qrSize}x${qrSize}&data=${encodeURIComponent(`upi://pay?pa=${settings.upi_id}&pn=${settings.business_name || 'Business'}&am=${cartCalculations.total.toFixed(2)}&cu=INR`)}" 
                  alt="Payment QR"
                  style="width: ${qrSize}px; height: ${qrSize}px; border: 1px solid #eee; padding: 5px; display: block; margin: 0 auto;"
                />
                <p style="font-size: 8px; color: #666; margin-top: 4px;">Scan to Pay: ${currencySymbol}${cartCalculations.total.toFixed(2)}</p>
              </div>
            ` : settings?.invoice_show_qr_code ? `
              <div class="qr-placeholder" style="margin: 15px auto; width: 80px; height: 80px; border: 1px dashed #ccc; display: flex; align-items: center; justify-content: center; font-size: 8px; color: #999; text-align: center;">
                UPI ID NOT SET
              </div>
            ` : ''}

            <p style="font-size: ${fontSize - 3}px; color: #666; margin-top: 10px;">
              Printed on ${new Date().toLocaleString('en-IN')}
            </p>
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
          // print() is handled by internal script
          // Remove the iframe after a delay
          setTimeout(() => {
            document.body.removeChild(iframe);
          }, 3000);
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
    <div className="flex h-[calc(100dvh-3.5rem-env(safe-area-inset-bottom))] sm:h-[calc(100vh-7rem)] gap-0 -mx-4 sm:-mx-6 lg:-mx-8 -my-3 sm:-my-4 lg:-my-6">
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
      <div className="flex flex-1 flex-col min-w-0">
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

        {/* Products Grid */}
        <ScrollArea className="flex-1 p-3">
          {filteredProducts.length === 0 ? (
            <div className="flex h-40 items-center justify-center text-muted-foreground">
              <Package className="mr-2 h-5 w-5" />
              No products found
            </div>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(90px,1fr))] sm:grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-2 sm:gap-3 justify-items-center pb-20">
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
                    className="relative flex flex-col items-center justify-between rounded-xl border border-border bg-card p-2 sm:p-3 text-center shadow-sm transition-all hover:border-primary hover:shadow-md hover:-translate-y-0.5 active:scale-95 group select-none aspect-square overflow-hidden animate-in fade-in zoom-in-95 duration-200 w-full max-w-[120px] touch-manipulation"
                  >
                    {/* Stock Badge - Compact */}
                    <Badge
                      variant="secondary"
                      className={cn(
                        'absolute top-1 right-1 text-[9px] px-1 py-0 z-10 font-bold',
                        product.stock_quantity <= product.low_stock_threshold
                          ? 'bg-destructive/10 text-destructive'
                          : 'bg-accent/80 text-accent-foreground'
                      )}
                    >
                      {product.stock_quantity}
                    </Badge>

                    <div className="flex flex-col items-center justify-center flex-1 w-full gap-1 sm:gap-2">
                      {/* Icon - Scaled for high mobile density */}
                      <div className="flex h-7 w-7 sm:h-11 sm:w-11 items-center justify-center rounded-full bg-primary/5 group-hover:bg-primary/10 transition-colors">
                        <IconComponent className="h-3.5 w-3.5 sm:h-6 sm:w-6 text-primary" />
                      </div>

                      {/* Product Name - High density font sizes */}
                      <span className="text-[10px] sm:text-xs font-semibold line-clamp-2 leading-tight px-1">
                        {product.name}
                      </span>
                    </div>

                    {/* Price - Fixed at bottom */}
                    <div className="w-full pt-1 border-t border-dashed border-border/50">
                      <span className="text-xs sm:text-sm font-bold text-primary">
                        {currencySymbol}{Number(product.selling_price).toFixed(2)}
                      </span>
                    </div>
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
