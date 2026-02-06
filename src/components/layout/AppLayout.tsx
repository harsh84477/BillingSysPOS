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
  TooltipProvider,
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <TooltipProvider delayDuration={0}>
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

        <div className="flex flex-1 flex-col">
          {/* Header */}
          <header className="sticky top-0 z-40 flex h-14 items-center gap-4 border-b border-border bg-card px-4 lg:px-6">
            {/* Mobile Menu */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-0">
                <SheetHeader className="p-4">
                  <SheetTitle>Smart POS</SheetTitle>
                </SheetHeader>
                <Sidebar className="mt-4" collapsed={false} />
              </SheetContent>
            </Sheet>

            <div className="flex-1" />

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2">
                  <User className="h-4 w-4" />
                  <span className="hidden sm:inline-block">{user?.email}</span>
                  <span className="text-xs text-muted-foreground capitalize">
                    ({userRole || 'user'})
                  </span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
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
          <main className="flex-1 overflow-auto p-4 lg:p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}
