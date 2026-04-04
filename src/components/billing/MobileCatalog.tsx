// @ts-nocheck
/**
 * MobileCatalog — Professional mobile POS catalog UI
 * Dark navy header + search + category pills + product rows
 * Dark navy bottom total bar + bottom navigation
 */
import React, { useState, useMemo } from 'react';
import {
  Search,
  ArrowRight,
  Package,
  Menu,
  LayoutGrid,
  ClipboardList,
  Users,
  Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Product {
  id: string;
  name: string;
  sku?: string | null;
  selling_price: number | string;
  mrp_price?: number | string | null;
  items_per_case?: number | null;
  cost_price?: number | string;
  stock_quantity?: number;
  reserved_quantity?: number;
  low_stock_threshold?: number;
  category_id?: string | null;
  icon?: string | null;
  image_url?: string | null;
  is_active?: boolean;
  [key: string]: unknown;
}

interface Category {
  id: string;
  name: string;
  color?: string | null;
}

interface CartItem {
  productId: string;
  name: string;
  unitPrice: number;
  costPrice: number;
  mrpPrice: number;
  itemsPerCase: number;
  quantity: number;
}

interface Props {
  products: Product[];
  categories: Category[];
  cart: CartItem[];
  currencySymbol?: string;
  businessName?: string;
  onAddPiece: (product: Product) => void;
  onAddCase: (product: Product, caseQty: number) => void;
  onUpdateQty: (productId: string, delta: number) => void;
  onViewBill: () => void;
  onNavigate?: (path: string) => void;
}

// Warm placeholder backgrounds for products without images
const PLACEHOLDER_BG = [
  '#fee2e2', '#fef3c7', '#d1fae5', '#dbeafe', '#ede9fe',
  '#fce7f3', '#ffedd5', '#e0f2fe', '#dcfce7', '#faf5ff',
];

function getPlaceholderBg(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  return PLACEHOLDER_BG[Math.abs(hash) % PLACEHOLDER_BG.length];
}

const NAV_ITEMS = [
  { id: 'catalog',   label: 'CATALOG',   icon: LayoutGrid,    path: '/billing' },
  { id: 'orders',    label: 'ORDERS',    icon: ClipboardList, path: '/bills-history' },
  { id: 'customers', label: 'CUSTOMERS', icon: Users,         path: '/customers' },
  { id: 'settings',  label: 'SETTINGS',  icon: Settings,      path: '/settings' },
];

export default function MobileCatalog({
  products,
  categories,
  cart,
  currencySymbol = 'Rs.',
  businessName = 'Invoice Adda',
  onAddPiece,
  onAddCase,
  onUpdateQty,
  onViewBill,
  onNavigate,
}: Props) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return products.filter((p) => {
      const matchSearch =
        p.name.toLowerCase().includes(q) ||
        (p.sku || '').toLowerCase().includes(q) ||
        (p.item_code || '').toLowerCase().includes(q) ||
        (p.barcode || '').toLowerCase().includes(q);
      const matchCat = selectedCategory === 'all' || p.category_id === selectedCategory;
      return matchSearch && matchCat;
    });
  }, [products, search, selectedCategory]);

  const totalQty = useMemo(() => cart.reduce((s, i) => s + i.quantity, 0), [cart]);
  const totalAmount = useMemo(
    () => cart.reduce((s, i) => s + i.unitPrice * i.quantity, 0),
    [cart],
  );

  const getCartQty = (productId: string) =>
    cart.find((i) => i.productId === productId)?.quantity ?? 0;

  return (
    <div className="flex flex-col h-full" style={{ background: 'hsl(var(--muted))', fontFamily: 'system-ui,-apple-system,sans-serif' }}>

      {/* HEADER */}
      <div className="flex items-center px-4 gap-3 shrink-0" style={{ background: '#1a2e5a', height: 56 }}>
        <button className="p-1.5 -ml-1 rounded-lg active:bg-white/10">
          <Menu className="h-5 w-5 text-white" />
        </button>
        <span className="flex-1 font-extrabold text-white tracking-tight" style={{ fontSize: 18 }}>
          {businessName}
        </span>
        <button className="p-1.5 rounded-lg active:bg-white/10">
          <Search className="h-5 w-5 text-white" />
        </button>
      </div>

      {/* SEARCH BAR */}
      <div className="px-4 pt-3 pb-2 shrink-0" style={{ background: 'hsl(var(--card))', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none text-muted-foreground" />
          <input
            type="text"
            placeholder="Search product name or SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-11 pl-10 pr-4 rounded-xl text-sm outline-none text-foreground"
            style={{ background: 'hsl(var(--muted))', border: '1px solid hsl(var(--border))' }}
          />
        </div>
      </div>

      {/* CATEGORY TABS */}
      <div
        className="flex gap-2 px-4 pb-3 pt-2 overflow-x-auto shrink-0"
        style={{ scrollbarWidth: 'none', background: 'var(--card, #fff)' }}
      >
        <button
          onClick={() => setSelectedCategory('all')}
          className="shrink-0 px-4 py-1.5 rounded-full text-sm font-semibold active:scale-95 transition-transform"
          style={selectedCategory === 'all' ? { background: '#1a2e5a', color: '#fff' } : { background: 'hsl(var(--muted))', color: 'hsl(var(--muted-foreground))' }}
        >
          All Items
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className="shrink-0 px-4 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap active:scale-95 transition-transform"
            style={selectedCategory === cat.id ? { background: '#1a2e5a', color: '#fff' } : { background: 'hsl(var(--muted))', color: 'hsl(var(--muted-foreground))' }}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* PRODUCT LIST */}
      <div className="flex-1 overflow-y-auto px-3 pt-2 pb-2 space-y-2" style={{ WebkitOverflowScrolling: 'touch' }}>
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
            <Package className="h-10 w-10 mb-2 opacity-30" />
            <p className="text-sm">No products found</p>
          </div>
        )}
        {filtered.map((product) => {
          const price = Number(product.selling_price);
          const caseQty = Number(product.items_per_case) || 0;
          const casePrice = caseQty > 0 ? price * caseQty : null;
          const sku = product.sku || (product as any).item_code || (product as any).model_number || null;
          const qty = getCartQty(product.id);
          const available = (product.stock_quantity ?? 9999) - (product.reserved_quantity ?? 0);
          const outOfStock = available <= 0;
          const hasQty = qty > 0;

          return (
            <div
              key={product.id}
              className="rounded-2xl border flex items-center gap-3 px-3 py-3 transition-all"
              style={{
                opacity: outOfStock ? 0.55 : 1,
                background: hasQty ? 'hsl(var(--primary) / 0.04)' : 'hsl(var(--card))',
                borderColor: hasQty ? 'hsl(var(--primary) / 0.25)' : 'hsl(var(--border))',
                boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
              }}
            >
              {/* Image / placeholder with warm tint */}
              <div
                className="w-16 h-16 rounded-xl flex items-center justify-center shrink-0 overflow-hidden"
                style={{ background: product.image_url ? 'transparent' : getPlaceholderBg(product.id) }}
              >
                {product.image_url ? (
                  <img src={product.image_url} alt={product.name} className="w-full h-full object-cover rounded-xl" />
                ) : (
                  <Package className="w-7 h-7" style={{ color: '#1a2e5a', opacity: 0.45 }} />
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-extrabold leading-tight truncate text-sm text-foreground">
                  {product.name}
                </p>
                {sku && (
                  <p className="mt-0.5 font-medium text-[11px] text-muted-foreground">
                    SKU: {sku}
                  </p>
                )}
                <div className="mt-1.5 space-y-0.5">
                  {casePrice !== null && (
                    <div className="flex items-center gap-1">
                      <span className="font-bold uppercase text-[10px] text-muted-foreground" style={{ minWidth: 64 }}>CASE ({caseQty})</span>
                      <span className="font-bold text-[13px] text-foreground">{currencySymbol}{casePrice.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <span className="font-bold uppercase text-[10px] text-muted-foreground" style={{ minWidth: 64 }}>PIECE</span>
                    <span className="font-bold text-[13px] text-foreground">{currencySymbol}{price.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex flex-col gap-1.5 items-end shrink-0">
                {/* + CASE — emerald gradient matching Expenses theme */}
                {caseQty > 0 && (
                  <button
                    disabled={outOfStock}
                    onClick={() => onAddCase(product, caseQty)}
                    className="flex items-center justify-center gap-1 rounded-xl font-bold active:scale-95 transition-transform disabled:opacity-40 shadow-sm"
                    style={{ background: 'linear-gradient(135deg,#10b981,#059669)', color: '#fff', fontSize: 11, minWidth: 68, height: 32 }}
                  >
                    + CASE
                    {qty >= caseQty && caseQty > 0 && (
                      <span className="rounded px-1" style={{ background: 'rgba(255,255,255,0.25)', fontSize: 10 }}>
                        {Math.floor(qty / caseQty)}
                      </span>
                    )}
                  </button>
                )}
                {/* + PIECE / counter — indigo gradient */}
                {qty > 0 ? (
                  <div className="flex items-center" style={{ height: 32, gap: 4 }}>
                    <button
                      onClick={() => onUpdateQty(product.id, -1)}
                      className="flex items-center justify-center rounded-xl font-bold text-white active:scale-95 transition-transform shadow-sm"
                      style={{ background: 'linear-gradient(135deg,#6366f1,#4f46e5)', width: 28, height: 32, fontSize: 18 }}
                    >−</button>
                    <span className="text-center font-black text-sm" style={{ width: 26, color: 'hsl(var(--foreground))' }}>{qty}</span>
                    <button
                      disabled={outOfStock}
                      onClick={() => onAddPiece(product)}
                      className="flex items-center justify-center rounded-xl font-bold text-white active:scale-95 transition-transform disabled:opacity-40 shadow-sm"
                      style={{ background: 'linear-gradient(135deg,#6366f1,#4f46e5)', width: 28, height: 32, fontSize: 18 }}
                    >+</button>
                  </div>
                ) : (
                  <button
                    disabled={outOfStock}
                    onClick={() => onAddPiece(product)}
                    className="flex items-center justify-center rounded-xl font-bold active:scale-95 transition-transform disabled:opacity-40 shadow-sm"
                    style={{ background: 'linear-gradient(135deg,#6366f1,#4f46e5)', color: '#fff', fontSize: 11, minWidth: 68, height: 32 }}
                  >
                    + PIECE
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* BOTTOM TOTAL BAR */}
      {totalQty > 0 && (
        <div className="flex items-center justify-between px-4 py-3 shrink-0" style={{ background: '#1a2e5a' }}>
          <div>
            <p className="uppercase font-bold tracking-widest" style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)' }}>
              Current Total
            </p>
            <p className="font-black text-white" style={{ fontSize: 22 }}>
              {currencySymbol}{totalAmount.toFixed(2)}
            </p>
          </div>
          <button
            onClick={onViewBill}
            className="flex items-center gap-2 font-bold text-white rounded-xl active:scale-95 transition-transform shadow-lg"
            style={{ background: 'linear-gradient(135deg,#10b981,#059669)', fontSize: 14, paddingLeft: 20, paddingRight: 20, height: 48 }}
          >
            VIEW BILL <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* BOTTOM NAVIGATION */}
      <div className="flex items-center shrink-0" style={{ background: '#0f1d3a', paddingBottom: 'env(safe-area-inset-bottom,0px)' }}>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = item.id === 'catalog';
          return (
            <button
              key={item.id}
              onClick={() => onNavigate?.(item.path)}
              className="flex-1 flex flex-col items-center py-2.5 gap-0.5 active:opacity-70 transition-opacity"
            >
              <div
                className="flex items-center justify-center rounded-lg"
                style={{ background: isActive ? '#1a2e5a' : 'transparent', width: 38, height: 30 }}
              >
                <Icon className="h-5 w-5" style={{ color: isActive ? '#fff' : 'rgba(255,255,255,0.4)' }} />
              </div>
              <span
                className="font-bold"
                style={{ fontSize: 9, color: isActive ? '#fff' : 'rgba(255,255,255,0.4)', letterSpacing: '0.04em' }}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>

    </div>
  );
}
