/**
 * pages/SalesmanSettings.tsx — Dedicated settings for salesman role
 * - App Theme: Light themes & Dark themes separated
 * - Grid & Sizes: Layout and sizing configuration for POS screen
 * - Billing Preferences: Ask Quantity First toggle
 */
import React from 'react';
import { useTheme, ThemeName } from '@/contexts/ThemeContext';
import { usePosLayout } from '@/hooks/usePosLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Settings, Palette, LayoutGrid, List, Check, Sun, Moon,
  MousePointerClick, Hash, Package, Columns, Gap, Sparkles
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

export default function SalesmanSettings() {
  const { theme: currentTheme, setTheme } = useTheme();
  
  const {
    desktopLayout, setDesktopLayout,
    mobileLayout, setMobileLayout,
    listDensity, setListDensity,
    desktopColumns, setDesktopColumns,
    gridGap, setGridGap,
    mobileColumns, setMobileColumns,
    askQuantityFirst, setAskQuantityFirst
  } = usePosLayout();

  const isDarkTheme = darkThemes.some(t => t.value === currentTheme);

  const currentDesktopCols = desktopColumns > 0 ? desktopColumns : 5;
  const currentMobileCols = mobileColumns > 0 ? mobileColumns : 3;
  const currentGridGap = gridGap > 0 ? gridGap : 8;

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

      {/* ═══ Grid & Sizes (POS Customizer) ═══ */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <LayoutGrid className="h-4 w-4 text-primary" /> Grid & Sizes
          </CardTitle>
          <CardDescription className="text-xs">Configure product grid and sizes for POS screen</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <h4 className="text-[10px] font-bold tracking-wider uppercase text-muted-foreground">Visual Layout</h4>
            
            {/* Desktop Layout */}
            <div className="flex items-center justify-between py-1 border-b border-border/50">
              <div>
                <p className="text-xs font-semibold">Desktop Layout</p>
                <p className="text-[10px] text-muted-foreground">List or Grid view for computer</p>
              </div>
              <select 
                value={desktopLayout} 
                onChange={(e) => setDesktopLayout(e.target.value as any)}
                className="w-32 bg-background border border-input rounded-lg px-2 py-1 text-xs outline-none cursor-pointer hover:bg-muted/40 transition-colors"
              >
                <option value="grid">Grid View</option>
                <option value="list">List View</option>
              </select>
            </div>

            {/* Mobile Layout */}
            <div className="flex items-center justify-between py-1 border-b border-border/50">
              <div>
                <p className="text-xs font-semibold">Mobile Layout</p>
                <p className="text-[10px] text-muted-foreground">List or Grid view for mobile screen</p>
              </div>
              <select 
                value={mobileLayout} 
                onChange={(e) => setMobileLayout(e.target.value as any)}
                className="w-32 bg-background border border-input rounded-lg px-2 py-1 text-xs outline-none cursor-pointer hover:bg-muted/40 transition-colors"
              >
                <option value="grid">Grid View</option>
                <option value="list">List View</option>
              </select>
            </div>

            {/* List View Density */}
            <div className="flex items-center justify-between py-1">
              <div>
                <p className="text-xs font-semibold">List View Density</p>
                <p className="text-[10px] text-muted-foreground">Size of components in List View</p>
              </div>
              <select 
                value={listDensity} 
                onChange={(e) => setListDensity(e.target.value as any)}
                className="w-32 bg-background border border-input rounded-lg px-2 py-1 text-xs outline-none cursor-pointer hover:bg-muted/40 transition-colors"
              >
                <option value="compact">Compact</option>
                <option value="comfortable">Comfortable</option>
                <option value="spacious">Spacious</option>
              </select>
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <h4 className="text-[10px] font-bold tracking-wider uppercase text-muted-foreground">Grid Configurations</h4>
            
            {/* Desktop Columns */}
            <div className="flex items-center justify-between py-1 border-b border-border/50">
              <div>
                <p className="text-xs font-semibold">Desktop Columns</p>
                <p className="text-[10px] text-muted-foreground">Number of product columns (2–8) in Grid View</p>
              </div>
              <div className="flex items-center gap-1.5 bg-muted/30 rounded-lg p-0.5 border border-border/50">
                <button
                  onClick={() => setDesktopColumns(Math.max(2, currentDesktopCols - 1))}
                  className="h-7 w-7 rounded-md bg-card border border-border flex items-center justify-center font-bold text-xs hover:bg-muted active:scale-95 transition-all"
                >
                  −
                </button>
                <span className="w-8 text-center text-xs font-mono font-bold">{currentDesktopCols}</span>
                <button
                  onClick={() => setDesktopColumns(Math.min(8, currentDesktopCols + 1))}
                  className="h-7 w-7 rounded-md bg-card border border-border flex items-center justify-center font-bold text-xs hover:bg-muted active:scale-95 transition-all"
                >
                  +
                </button>
              </div>
            </div>

            {/* Grid Gap */}
            <div className="flex items-center justify-between py-1 border-b border-border/50">
              <div>
                <p className="text-xs font-semibold">Grid Gap</p>
                <p className="text-[10px] text-muted-foreground">Spacing between cards (px)</p>
              </div>
              <div className="flex items-center gap-1.5 bg-muted/30 rounded-lg p-0.5 border border-border/50">
                <button
                  onClick={() => setGridGap(Math.max(4, currentGridGap - 1))}
                  className="h-7 w-7 rounded-md bg-card border border-border flex items-center justify-center font-bold text-xs hover:bg-muted active:scale-95 transition-all"
                >
                  −
                </button>
                <span className="w-8 text-center text-xs font-mono font-bold">{currentGridGap}px</span>
                <button
                  onClick={() => setGridGap(Math.min(30, currentGridGap + 1))}
                  className="h-7 w-7 rounded-md bg-card border border-border flex items-center justify-center font-bold text-xs hover:bg-muted active:scale-95 transition-all"
                >
                  +
                </button>
              </div>
            </div>

            {/* Mobile Columns */}
            <div className="flex items-center justify-between py-1">
              <div>
                <p className="text-xs font-semibold">Mobile Columns</p>
                <p className="text-[10px] text-muted-foreground">Number of columns on mobile in Grid View</p>
              </div>
              <div className="flex items-center gap-1.5 bg-muted/30 rounded-lg p-0.5 border border-border/50">
                <button
                  onClick={() => setMobileColumns(Math.max(2, currentMobileCols - 1))}
                  className="h-7 w-7 rounded-md bg-card border border-border flex items-center justify-center font-bold text-xs hover:bg-muted active:scale-95 transition-all"
                >
                  −
                </button>
                <span className="w-8 text-center text-xs font-mono font-bold">{currentMobileCols}</span>
                <button
                  onClick={() => setMobileColumns(Math.min(4, currentMobileCols + 1))}
                  className="h-7 w-7 rounded-md bg-card border border-border flex items-center justify-center font-bold text-xs hover:bg-muted active:scale-95 transition-all"
                >
                  +
                </button>
              </div>
            </div>
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
            <Switch checked={askQuantityFirst} onCheckedChange={setAskQuantityFirst} />
          </div>

          {/* Hint cards */}
          <div className="rounded-xl bg-muted/30 border border-dashed p-3 mt-3">
            <p className="text-[11px] font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
              <MousePointerClick className="h-3.5 w-3.5" /> Quick Tips
            </p>
            <div className="space-y-1.5 text-[11px] text-muted-foreground">
              <div className="flex items-start gap-2">
                <LayoutGrid className="h-3 w-3 mt-0.5 flex-shrink-0" />
                <span><strong>Grid View:</strong> Tap cards to select products. Gaps and sizes can be adjusted above.</span>
              </div>
              <div className="flex items-start gap-2">
                <List className="h-3 w-3 mt-0.5 flex-shrink-0" />
                <span><strong>List View:</strong> Choose Compact, Comfortable, or Spacious densities to fit your screen.</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
