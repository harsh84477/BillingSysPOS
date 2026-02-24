import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme, ThemeName, themes } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  Settings,
  LogOut,
  Menu,
  ChevronDown,
  Palette,
  User,
  FileText,
  FolderOpen,
  PanelLeftClose,
  PanelLeft,
  AlertCircle,
  BarChart2,
  Building2,
  ChevronsUpDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

const allNavigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['admin', 'manager', 'cashier', 'salesman'] },
  { name: 'New Bill', href: '/billing', icon: ShoppingCart, roles: ['admin', 'manager', 'cashier', 'salesman'] },
  { name: 'Bills History', href: '/bills-history', icon: FileText, roles: ['admin', 'manager', 'cashier', 'salesman'] },
  { name: 'Due Bills', href: '/due-bills', icon: AlertCircle, roles: ['admin', 'manager', 'cashier'] },
  { name: 'Products', href: '/products', icon: Package, roles: ['admin', 'manager'] },
  { name: 'Categories', href: '/categories', icon: FolderOpen, roles: ['admin', 'manager'] },
  { name: 'Customers', href: '/customers', icon: Users, roles: ['admin', 'manager'] },
  { name: 'Settings', href: '/settings', icon: Settings, roles: ['admin', 'manager'] },
];

const allMobileNavItems = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['admin', 'manager', 'cashier', 'salesman'] },
  { name: 'Bill', href: '/billing', icon: ShoppingCart, roles: ['admin', 'manager', 'cashier', 'salesman'] },
  { name: 'Due', href: '/due-bills', icon: AlertCircle, roles: ['admin', 'manager', 'cashier'] },
  { name: 'History', href: '/bills-history', icon: FileText, roles: ['admin', 'manager', 'cashier', 'salesman'] },
  { name: 'More', href: '/settings', icon: Settings, roles: ['admin', 'manager'] },
];

const themeOptions: { name: string; value: ThemeName }[] = [
  { name: 'Mint Pro', value: 'mint-pro' },
  { name: 'Sunset Orange', value: 'sunset-orange' },
  { name: 'Royal Purple', value: 'royal-purple' },
  { name: 'Ocean Blue', value: 'ocean-blue' },
  { name: 'Dark Pro', value: 'dark-pro' },
];

function NavItem({ item, isActive, collapsed }: { item: typeof allNavigation[0]; isActive: boolean; collapsed: boolean }) {
  const content = (
    <Link
      to={item.href}
      className={cn(
        'flex items-center gap-3 rounded-lg transition-colors',
        collapsed ? 'justify-center p-2' : 'px-3 py-2 text-sm font-medium',
        isActive
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
      )}
    >
      <item.icon className="h-5 w-5 shrink-0" />
      {!collapsed && item.name}
    </Link>
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent side="right">{item.name}</TooltipContent>
      </Tooltip>
    );
  }
  return content;
}

export default function AppLayout() {
  const { user, signOut, userRole, businessId, isSuperAdmin, superAdminLogout, subscription } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const businessName = (subscription as any)?.plan?.name
    ? undefined
    : undefined; // will come from auth context if exposed

  const handleSignOut = async () => {
    if (!user && isSuperAdmin) {
      superAdminLogout();
      navigate('/super-admin-login');
      return;
    }
    await signOut();
    navigate('/auth');
  };

  const roleLabel = isSuperAdmin ? 'Super Admin' : (userRole || 'user');
  const displayName = user?.email?.split('@')[0] || (isSuperAdmin ? 'Admin' : 'User');

  // Filter nav items by role
  const navigation = allNavigation.filter(item => !userRole || item.roles.includes(userRole));
  const mobileNavItems = allMobileNavItems.filter(item => !userRole || item.roles.includes(userRole));

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* ── Desktop Sidebar ── */}
      <aside className={cn(
        'hidden flex-shrink-0 border-r border-border bg-card lg:flex flex-col transition-all duration-300 shadow-sm z-30',
        sidebarCollapsed ? 'w-16' : 'w-60'
      )}>
        {/* Brand + collapse */}
        <div className={cn(
          'flex items-center h-14 border-b border-border transition-all',
          sidebarCollapsed ? 'justify-center px-0' : 'justify-between px-4'
        )}>
          {!sidebarCollapsed && (
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="h-8 w-8 rounded-md bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm flex-shrink-0">
                SP
              </div>
              <span className="font-bold text-base tracking-tight whitespace-nowrap truncate">Smart POS</span>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="h-8 w-8 flex-shrink-0"
          >
            {sidebarCollapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </Button>
        </div>

        {/* Navigation */}
        <nav className={cn('flex-1 overflow-y-auto py-3 space-y-0.5 custom-scrollbar', sidebarCollapsed ? 'px-1' : 'px-2')}>
          {navigation.map((item) => (
            <NavItem
              key={item.name}
              item={item}
              isActive={location.pathname === item.href}
              collapsed={sidebarCollapsed}
            />
          ))}
        </nav>

        {/* ── BOTTOM: User Profile + Theme ── */}
        <div className={cn('border-t border-border p-2 space-y-1', sidebarCollapsed ? 'px-1' : '')}>
          {/* Theme picker */}
          {sidebarCollapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="w-full">
                      <Palette className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" side="right" className="w-48">
                    {themeOptions.map((opt) => (
                      <DropdownMenuItem key={opt.value} onClick={() => setTheme(opt.value)} className={cn(theme === opt.value && 'bg-accent')}>
                        <span className="mr-2 h-3 w-3 rounded-full inline-block" style={{ backgroundColor: `hsl(${themes[opt.value].primary})` }} />
                        {opt.name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TooltipTrigger>
              <TooltipContent side="right">Theme</TooltipContent>
            </Tooltip>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="w-full justify-start gap-2 h-8 px-3 text-sm">
                  <Palette className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Theme</span>
                  <ChevronDown className="ml-auto h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                {themeOptions.map((opt) => (
                  <DropdownMenuItem key={opt.value} onClick={() => setTheme(opt.value)} className={cn(theme === opt.value && 'bg-accent')}>
                    <span className="mr-2 h-3 w-3 rounded-full inline-block" style={{ backgroundColor: `hsl(${themes[opt.value].primary})` }} />
                    {opt.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* User Profile Block */}
          {sidebarCollapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center justify-center p-2 rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                >
                  <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold uppercase">
                    {displayName[0]}
                  </div>
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">{displayName} · {roleLabel}</TooltipContent>
            </Tooltip>
          ) : (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/40 border border-border">
              <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold uppercase flex-shrink-0">
                {displayName[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{displayName}</p>
                <p className="text-[11px] text-muted-foreground capitalize">{roleLabel}</p>
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={handleSignOut}
                    className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors flex-shrink-0"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Sign out</TooltipContent>
              </Tooltip>
            </div>
          )}
        </div>
      </aside>

      {/* ── Main Area ── */}
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden relative">
        {/* Header — minimal, no user button */}
        <header className="sticky top-0 z-40 flex h-14 flex-shrink-0 items-center gap-4 border-b border-border bg-card/80 backdrop-blur-sm px-4 lg:px-6 shadow-sm">
          {/* Mobile menu */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="hidden sm:flex lg:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0 flex flex-col">
              <SheetHeader className="p-4 border-b border-border">
                <SheetTitle className="text-lg font-bold">Smart POS</SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-1 p-2 mt-2 flex-1 overflow-y-auto">
                {navigation.map((item) => (
                  <NavItem key={item.name} item={item} isActive={location.pathname === item.href} collapsed={false} />
                ))}
              </nav>
              {/* User profile & sign out (tablet Sheet) */}
              <div className="border-t border-border p-3 space-y-2">
                <div className="flex items-center gap-2 px-2 py-2 rounded-lg bg-muted/40 border border-border">
                  <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold uppercase flex-shrink-0">
                    {displayName[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{displayName}</p>
                    <p className="text-[11px] text-muted-foreground capitalize">{roleLabel}</p>
                  </div>
                </div>
                <Button variant="ghost" className="w-full justify-start gap-2 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={handleSignOut}>
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </Button>
              </div>
            </SheetContent>
          </Sheet>

          {/* App title on mobile */}
          <span className="font-bold text-base sm:hidden text-primary">Smart POS</span>

          <div className="flex-1" />

          {/* Right side — page context on desktop */}
          <span className="hidden lg:block text-sm text-muted-foreground capitalize font-medium">
            {navigation.find(n => n.href === location.pathname)?.name || ''}
          </span>

          {/* Mobile/Tablet: user avatar + sign-out dropdown */}
          <div className="lg:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold uppercase">
                  {displayName[0]}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <div className="px-3 py-2 border-b">
                  <p className="text-sm font-semibold truncate">{displayName}</p>
                  <p className="text-[11px] text-muted-foreground capitalize">{roleLabel}</p>
                </div>
                <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Main Content */}
        <main className={cn(
          'flex-1 overflow-x-hidden relative z-0',
          location.pathname === '/billing'
            ? 'overflow-hidden p-0'
            : 'overflow-y-auto p-4 lg:p-6 pb-20 sm:pb-6 bg-muted/20 custom-scrollbar'
        )}>
          <Outlet />
        </main>

        {/* Mobile Bottom Navigation */}
        <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border safe-area-bottom">
          <div className="flex items-center justify-around h-16">
            {mobileNavItems.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    'relative flex flex-col items-center justify-center gap-0.5 flex-1 h-full text-xs font-medium transition-colors',
                    isActive ? 'text-primary' : 'text-muted-foreground'
                  )}
                >
                  <item.icon className={cn('h-5 w-5', isActive ? 'text-primary' : 'text-muted-foreground')} />
                  <span className={cn('text-[10px]', isActive ? 'text-primary font-semibold' : '')}>{item.name}</span>
                  {isActive && <span className="absolute bottom-0 h-0.5 w-8 bg-primary rounded-t-full" />}
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}
