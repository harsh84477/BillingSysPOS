/**
 * pages/SalesmanSettings.tsx — Dedicated settings for salesman role
 * - App Theme: Light themes & Dark themes separated
 * - Quick Bill Layout: Grid / List
 * - Billing Preferences: Ask Quantity First toggle
 */
import React, { useState } from 'react';
import { useTheme, ThemeName } from '@/contexts/ThemeContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Settings, Palette, LayoutGrid, List, Check, Sun, Moon,
  MousePointerClick, Hash, Package,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import AccountTab from '@/components/settings/tabs/AccountTab';

const lightThemes: {
  name: string; value: ThemeName; color: string; bg: string;
}[] = [
  { name: 'Mint Pro',       value: 'mint-pro',       color: '#10b981', bg: '#ecfdf5' },
  { name: 'Sunset Orange',  value: 'sunset-orange',  color: '#f97316', bg: '#fff7ed' },
  { name: 'Royal Purple',   value: 'royal-purple',   color: '#8b5cf6', bg: '#f5f3ff' },
  { name: 'Ocean Blue',     value: 'ocean-blue',     color: '#3b82f6', bg: '#eff6ff' },
  { name: 'Rose Gold',      value: 'rose-gold',      color: '#e11d48', bg: '#fff1f2' },
  { name: 'Slate Modern',   value: 'slate-modern',   color: '#475569', bg: '#f1f5f9' },
  { name: 'Forest Deep',    value: 'forest-deep',    color: '#16a34a', bg: '#f0fdf4' },
];

const darkThemes: {
  name: string; value: ThemeName; color: string; bg: string;
}[] = [
  { name: 'Dark Pro',       value: 'dark-pro',       color: '#3b82f6', bg: '#0f172a' },
  { name: 'Cyber Neon',     value: 'cyber-neon',     color: '#00e69d', bg: '#0a0f1a' },
  { name: 'Midnight Blue',  value: 'midnight-blue',  color: '#60a5fa', bg: '#0c1222' },
];

type BillLayout = 'grid' | 'list';

export default function SalesmanSettings() {
  const { currentTheme, setTheme } = useTheme();
  const [billLayout, setBillLayout] = useState<BillLayout>(() =>
    (localStorage.getItem('salesman_bill_layout') as BillLayout) || 'grid'
  );
  const [askQuantityFirst, setAskQuantityFirst] = useState<boolean>(() =>
    localStorage.getItem('salesman_ask_quantity_first') === 'true'
  );

  const handleLayoutChange = (layout: BillLayout) => {
    setBillLayout(layout);
    localStorage.setItem('salesman_bill_layout', layout);
  };

  const handleAskQuantityFirst = (value: boolean) => {
    setAskQuantityFirst(value);
    localStorage.setItem('salesman_ask_quantity_first', String(value));
  };

  const isDarkTheme = darkThemes.some(t => t.value === currentTheme);

  const ThemeButton = ({ opt, isDark }: { opt: typeof lightThemes[0]; isDark: boolean }) => {
    const active = currentTheme === opt.value;
    return (
      <button
        onClick={() => setTheme(opt.value)}
        className={cn(
          'relative rounded-xl p-3 text-left transition-all border-2 group',
          active ? 'shadow-lg scale-[1.02]' : 'hover:shadow-sm hover:scale-[1.01]',
        )}
        style={{
          background: opt.bg,
          borderColor: active ? opt.color : isDark ? '#1e293b' : '#e2e8f0',
        }}
      >
        <div className="flex items-center gap-2 mb-1.5">
          <div className="h-3 w-3 rounded-full" style={{ background: opt.color }} />
          <p className="text-[11px] font-bold leading-none" style={{ color: isDark ? '#f1f5f9' : '#0f172a' }}>
            {opt.name}
          </p>
        </div>
        {/* Mini color bar preview */}
        <div className="flex gap-1">
          <div className="h-1.5 flex-1 rounded-full" style={{ background: opt.color }} />
          <div className="h-1.5 flex-1 rounded-full opacity-40" style={{ background: opt.color }} />
          <div className="h-1.5 flex-1 rounded-full opacity-20" style={{ background: opt.color }} />
        </div>
        {active && (
          <div className="absolute top-1.5 right-1.5 h-5 w-5 rounded-full flex items-center justify-center shadow-sm"
            style={{ background: opt.color }}>
            <Check className="h-3 w-3 text-white" />
          </div>
        )}
      </button>
    );
  };

  return (
    <div className="space-y-5 p-1 max-w-3xl mx-auto pb-20">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Settings className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Settings</h1>
          <p className="text-xs text-muted-foreground">Personalize your experience</p>
        </div>
      </div>

      {/* User Account Settings */}
      <AccountTab />

      {/* ═══ App Theme ═══ */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Palette className="h-4 w-4 text-primary" /> App Theme
          </CardTitle>
          <CardDescription className="text-xs">Choose a theme that suits you</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Light Themes */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Sun className="h-3.5 w-3.5 text-amber-500" />
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Light Themes</span>
              {!isDarkTheme && <Badge variant="secondary" className="text-[9px] h-4 px-1.5">Active</Badge>}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
              {lightThemes.map(opt => <ThemeButton key={opt.value} opt={opt} isDark={false} />)}
            </div>
          </div>

          <Separator />

          {/* Dark Themes */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Moon className="h-3.5 w-3.5 text-indigo-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Dark Themes</span>
              {isDarkTheme && <Badge variant="secondary" className="text-[9px] h-4 px-1.5">Active</Badge>}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {darkThemes.map(opt => <ThemeButton key={opt.value} opt={opt} isDark={true} />)}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ═══ Quick Bill Layout ═══ */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <LayoutGrid className="h-4 w-4 text-primary" /> Quick Bill Layout
          </CardTitle>
          <CardDescription className="text-xs">Choose how products appear in Quick Bill</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            {/* Grid option */}
            <button
              onClick={() => handleLayoutChange('grid')}
              className={cn(
                'rounded-xl border-2 p-4 text-left transition-all',
                billLayout === 'grid' ? 'border-primary bg-primary/5 shadow-md' : 'border-border hover:border-primary/30'
              )}
            >
              <div className="flex items-center gap-2 mb-3">
                <div className={cn('p-2 rounded-lg', billLayout === 'grid' ? 'bg-primary/10' : 'bg-muted')}>
                  <LayoutGrid className={cn('h-5 w-5', billLayout === 'grid' ? 'text-primary' : 'text-muted-foreground')} />
                </div>
                <div>
                  <p className="font-semibold text-sm">Grid View</p>
                  <p className="text-[10px] text-muted-foreground">Card layout with images</p>
                </div>
                {billLayout === 'grid' && <Badge className="ml-auto text-[10px]">Active</Badge>}
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <div key={i} className="aspect-square rounded-md bg-muted/60 flex items-center justify-center">
                    <div className="w-3 h-3 rounded bg-muted-foreground/10" />
                  </div>
                ))}
              </div>
            </button>

            {/* List option */}
            <button
              onClick={() => handleLayoutChange('list')}
              className={cn(
                'rounded-xl border-2 p-4 text-left transition-all',
                billLayout === 'list' ? 'border-primary bg-primary/5 shadow-md' : 'border-border hover:border-primary/30'
              )}
            >
              <div className="flex items-center gap-2 mb-3">
                <div className={cn('p-2 rounded-lg', billLayout === 'list' ? 'bg-primary/10' : 'bg-muted')}>
                  <List className={cn('h-5 w-5', billLayout === 'list' ? 'text-primary' : 'text-muted-foreground')} />
                </div>
                <div>
                  <p className="font-semibold text-sm">List View</p>
                  <p className="text-[10px] text-muted-foreground">Compact rows with actions</p>
                </div>
                {billLayout === 'list' && <Badge className="ml-auto text-[10px]">Active</Badge>}
              </div>
              <div className="space-y-1.5">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="h-5 rounded bg-muted/60 flex items-center px-2 gap-2">
                    <div className="w-3 h-3 rounded bg-muted-foreground/10" />
                    <div className="flex-1 h-2 rounded bg-muted-foreground/10" />
                    <div className="w-6 h-2 rounded bg-muted-foreground/10" />
                  </div>
                ))}
              </div>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* ═══ Billing Preferences ═══ */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="h-4 w-4 text-primary" /> Billing Preferences
          </CardTitle>
          <CardDescription className="text-xs">Control how products are added to cart</CardDescription>
        </CardHeader>
        <CardContent className="space-y-1">
          {/* Ask Quantity First */}
          <div className="flex items-center justify-between rounded-xl border p-4 transition-colors hover:bg-muted/30">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="h-9 w-9 rounded-lg bg-amber-100 dark:bg-amber-950/40 flex items-center justify-center flex-shrink-0">
                <Hash className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold">Ask Quantity First</p>
                <p className="text-[11px] text-muted-foreground leading-tight">
                  Open a pop-up to enter quantity instead of auto-adding 1 item when tapping a product
                </p>
              </div>
            </div>
            <Switch checked={askQuantityFirst} onCheckedChange={handleAskQuantityFirst} />
          </div>

          {/* Hint cards */}
          <div className="rounded-xl bg-muted/30 border border-dashed p-3 mt-3">
            <p className="text-[11px] font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
              <MousePointerClick className="h-3.5 w-3.5" /> Quick Tips
            </p>
            <div className="space-y-1.5 text-[11px] text-muted-foreground">
              <div className="flex items-start gap-2">
                <LayoutGrid className="h-3 w-3 mt-0.5 flex-shrink-0" />
                <span><strong>Grid View:</strong> Tap to add 1 item. Long-press to enter quantity.</span>
              </div>
              <div className="flex items-start gap-2">
                <List className="h-3 w-3 mt-0.5 flex-shrink-0" />
                <span><strong>List View:</strong> Use +1 and +Case buttons for quick adding.</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
