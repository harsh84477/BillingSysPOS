import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme, ThemeName, themes } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Bottom nav items for mobile (only most important pages)
const mobileNavItems = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Bill', href: '/billing', icon: ShoppingCart },
  { name: 'History', href: '/bills-history', icon: FileText },
  { name: 'Products', href: '/products', icon: Package },
  { name: 'More', href: '/settings', icon: Settings },
];

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'New Bill', href: '/billing', icon: ShoppingCart },
  { name: 'Bills History', href: '/bills-history', icon: FileText },
  { name: 'Products', href: '/products', icon: Package },
  { name: 'Categories', href: '/categories', icon: FolderOpen },
  { name: 'Customers', href: '/customers', icon: Users },
  { name: 'Settings', href: '/settings', icon: Settings },
];

const themeOptions: { name: string; value: ThemeName }[] = [
  { name: 'Mint Pro', value: 'mint-pro' },
  { name: 'Sunset Orange', value: 'sunset-orange' },
  { name: 'Royal Purple', value: 'royal-purple' },
  { name: 'Ocean Blue', value: 'ocean-blue' },
  { name: 'Dark Pro', value: 'dark-pro' },
];

function NavItem({ item, isActive, collapsed }: { item: typeof navigation[0]; isActive: boolean; collapsed: boolean }) {
  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Link
            to={item.href}
            className={cn(
              'flex items-center justify-center rounded-lg p-2 transition-colors',
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            )}
          >
            <item.icon className="h-5 w-5" />
          </Link>
        </TooltipTrigger>
        <TooltipContent side="right">
          {item.name}
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Link
      to={item.href}
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
        isActive
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
      )}
    >
      <item.icon className="h-5 w-5" />
      {item.name}
    </Link>
  );
}

function Sidebar({ className, collapsed }: { className?: string; collapsed: boolean }) {
  const location = useLocation();

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      {!collapsed && (
        <div className="px-3 py-2">
          <h2 className="mb-2 px-2 text-lg font-semibold tracking-tight">
            Smart POS
          </h2>
        </div>
      )}
      <nav className={cn('flex flex-col gap-1', collapsed ? 'px-1' : 'px-2')}>
        {navigation.map((item) => (
          <NavItem
            key={item.name}
            item={item}
            isActive={location.pathname === item.href}
            collapsed={collapsed}
          />
        ))}
      </nav>
    </div>
  );
}

export default function AppLayout() {
  const { user, signOut, userRole } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "hidden flex-shrink-0 border-r border-border bg-card lg:block transition-all duration-300",
          sidebarCollapsed ? "w-16" : "w-64"
        )}
      >
        <div className="flex h-full flex-col">
          {/* Collapse/Expand Button */}
          <div className={cn("flex items-center border-b border-border", sidebarCollapsed ? "justify-center p-2" : "justify-end p-2")}>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="h-8 w-8"
            >
              {sidebarCollapsed ? (
                <PanelLeft className="h-4 w-4" />
              ) : (
                <PanelLeftClose className="h-4 w-4" />
              )}
            </Button>
          </div>

          <Sidebar className="flex-1 pt-4" collapsed={sidebarCollapsed} />

          <div className="border-t border-border p-2">
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
                      {themeOptions.map((option) => (
                        <DropdownMenuItem
                          key={option.value}
                          onClick={() => setTheme(option.value)}
                          className={cn(theme === option.value && 'bg-accent')}
                        >
                          <span
                            className="mr-2 h-3 w-3 rounded-full"
                            style={{
                              backgroundColor: `hsl(${themes[option.value].primary})`,
                            }}
                          />
                          {option.name}
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
                  <Button variant="ghost" className="w-full justify-start gap-2">
                    <Palette className="h-4 w-4" />
                    Theme
                    <ChevronDown className="ml-auto h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48">
                  {themeOptions.map((option) => (
                    <DropdownMenuItem
                      key={option.value}
                      onClick={() => setTheme(option.value)}
                      className={cn(theme === option.value && 'bg-accent')}
                    >
                      <span
                        className="mr-2 h-3 w-3 rounded-full"
                        style={{
                          backgroundColor: `hsl(${themes[option.value].primary})`,
                        }}
                      />
                      {option.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </aside>

      <div className="flex flex-1 flex-col min-w-0">
        {/* Header */}
        <header className="sticky top-0 z-40 flex h-14 items-center gap-2 border-b border-border bg-card px-3 lg:px-6">
          {/* Mobile Menu - only shown on tablet, not mobile (mobile uses bottom nav) */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="hidden sm:flex lg:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <SheetHeader className="p-4 border-b border-border">
                <SheetTitle className="text-lg font-bold">Smart POS</SheetTitle>
              </SheetHeader>
              <Sidebar className="mt-4" collapsed={false} />
            </SheetContent>
          </Sheet>

          {/* App title on mobile */}
          <span className="font-bold text-base sm:hidden text-primary">Smart POS</span>

          <div className="flex-1" />

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-1.5 h-9 px-2">
                <User className="h-4 w-4" />
                <span className="hidden sm:inline-block text-sm max-w-[120px] truncate">{user?.email}</span>
                <span className="hidden sm:inline text-xs text-muted-foreground capitalize">
                  ({userRole || 'user'})
                </span>
                <ChevronDown className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">My Account</p>
                  <p className="text-xs leading-none text-muted-foreground truncate">{user?.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/settings')}>
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-auto p-3 sm:p-4 lg:p-6 pb-20 sm:pb-4">
          <Outlet />
        </main>

        {/* Mobile Bottom Navigation - only visible on small screens */}
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
                    isActive
                      ? 'text-primary'
                      : 'text-muted-foreground'
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
