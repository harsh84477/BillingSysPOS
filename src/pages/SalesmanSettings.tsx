/**
 * pages/SalesmanSettings.tsx — Dedicated settings for salesman role
 * - App Theme selection
 * - Quick Bill Layout: Grid (default) or List
 */
import React, { useState, useEffect } from 'react';
import { useTheme, ThemeName } from '@/contexts/ThemeContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Settings, Palette, LayoutGrid, List, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

const themeOptions: {
  name: string; value: ThemeName; color: string; bg: string; isDark?: boolean;
}[] = [
  { name: 'Mint Pro',       value: 'mint-pro',       color: '#10b981', bg: '#ecfdf5' },
  { name: 'Sunset Orange',  value: 'sunset-orange',  color: '#f97316', bg: '#fff7ed' },
  { name: 'Royal Purple',   value: 'royal-purple',   color: '#8b5cf6', bg: '#f5f3ff' },
  { name: 'Ocean Blue',     value: 'ocean-blue',     color: '#3b82f6', bg: '#eff6ff' },
  { name: 'Rose Gold',      value: 'rose-gold',      color: '#e11d48', bg: '#fff1f2' },
  { name: 'Slate Modern',   value: 'slate-modern',   color: '#475569', bg: '#f1f5f9' },
  { name: 'Forest Deep',    value: 'forest-deep',    color: '#16a34a', bg: '#f0fdf4' },
  { name: 'Dark Pro',       value: 'dark-pro',       color: '#3b82f6', bg: '#0f172a', isDark: true },
  { name: 'Cyber Neon',     value: 'cyber-neon',     color: '#00e69d', bg: '#0a0f1a', isDark: true },
  { name: 'Midnight Blue',  value: 'midnight-blue',  color: '#60a5fa', bg: '#0c1222', isDark: true },
];

type BillLayout = 'grid' | 'list';

export default function SalesmanSettings() {
  const { currentTheme, setTheme } = useTheme();
  const [billLayout, setBillLayout] = useState<BillLayout>(() =>
    (localStorage.getItem('salesman_bill_layout') as BillLayout) || 'grid'
  );

  const handleLayoutChange = (layout: BillLayout) => {
    setBillLayout(layout);
    localStorage.setItem('salesman_bill_layout', layout);
  };

  return (
    <div className="space-y-6 p-1 max-w-3xl mx-auto">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2"><Settings className="h-5 w-5" /> Settings</h1>
        <p className="text-sm text-muted-foreground">Personalize your experience</p>
      </div>

      {/* ─── App Theme ─── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Palette className="h-4 w-4" /> App Theme
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-4">Choose a theme that suits you</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
            {themeOptions.map(opt => {
              const active = currentTheme === opt.value;
              const isDark = !!opt.isDark;
              return (
                <button
                  key={opt.value}
                  onClick={() => setTheme(opt.value)}
                  className={cn(
                    'relative rounded-xl p-3 text-left transition-all border-2',
                    active ? 'shadow-md scale-[1.02]' : 'hover:shadow-sm',
                  )}
                  style={{
                    background: isDark ? opt.bg : opt.bg,
                    borderColor: active ? opt.color : isDark ? '#1e293b' : '#e2e8f0',
                  }}
                >
                  <div className="h-2 rounded-full mb-2" style={{ background: opt.color }} />
                  <p className="text-xs font-semibold" style={{ color: isDark ? '#f1f5f9' : '#0f172a' }}>
                    {opt.name}
                  </p>
                  {active && (
                    <div className="absolute top-1.5 right-1.5 h-4 w-4 rounded-full flex items-center justify-center"
                      style={{ background: opt.color }}>
                      <Check className="h-2.5 w-2.5 text-white" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ─── Quick Bill Layout ─── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <LayoutGrid className="h-4 w-4" /> Quick Bill Layout
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-4">Choose how products are displayed in Quick Bill</p>
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
              {/* Mini preview */}
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
                  <p className="text-[10px] text-muted-foreground">Compact rows, tap to add</p>
                </div>
                {billLayout === 'list' && <Badge className="ml-auto text-[10px]">Active</Badge>}
              </div>
              {/* Mini preview */}
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
    </div>
  );
}
