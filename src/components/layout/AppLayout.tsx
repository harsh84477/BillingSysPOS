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
  Phone,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Support phone number
const SUPPORT_PHONE = '+1234567890';

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
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "hidden flex-shrink-0 border-r border-border bg-card lg:flex flex-col transition-all duration-300 shadow-sm z-30",
          sidebarCollapsed ? "w-16" : "w-64"
        )}
      >
        {/* Sidebar Header (App Title & Collapse Btn) */}
        <div className={cn("flex items-center h-14 border-b border-border transition-all", sidebarCollapsed ? "justify-center px-0" : "justify-between px-4")}>
          {!sidebarCollapsed && (
            <div className="flex items-center gap-2 overflow-hidden">
               <div className="h-8 w-8 rounded-md bg-primary text-primary-foreground flex items-center justify-center font-bold">
                 SP
               </div>
               <span className="font-bold text-lg tracking-tight whitespace-nowrap truncate">Smart POS</span>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="h-8 w-8 flex-shrink-0"
          >
            {sidebarCollapsed ? (
              <PanelLeft className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Sidebar Navigation */}
        <div className="flex-1 overflow-y-auto py-4 custom-scrollbar">
          <Sidebar collapsed={sidebarCollapsed} />
        </div>

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
      </aside>

      <div className="flex flex-1 flex-col min-w-0 overflow-hidden relative">
        {/* Header */}
        <header className="sticky top-0 z-40 flex h-14 flex-shrink-0 items-center gap-4 border-b border-border bg-card/80 backdrop-blur-sm px-4 lg:px-6 shadow-sm">
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
              <Button variant="ghost" className="relative h-9 w-9 rounded-full sm:w-auto sm:px-2 sm:rounded-md border border-transparent hover:border-border transition-colors">
                <div className="flex items-center gap-2">
                   <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <User className="h-4 w-4" />
                   </div>
                  <div className="hidden sm:flex flex-col items-start leading-none gap-0.5">
                    <span className="text-sm font-medium w-[100px] truncate pr-1">Me</span>
                    <span className="text-[10px] text-muted-foreground capitalize">{userRole || 'user'}</span>
                  </div>
                  <ChevronDown className="hidden sm:block h-3.5 w-3.5 text-muted-foreground" />
                </div>
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
              <DropdownMenuItem onClick={() => navigate('/settings')} className="cursor-pointer">
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="cursor-pointer">
                <a href={`tel:${SUPPORT_PHONE}`}>
                  <Phone className="mr-2 h-4 w-4" />
                  Help & Support
                </a>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-destructive focus:bg-destructive focus:text-destructive-foreground">
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 lg:p-6 pb-20 sm:pb-6 bg-muted/20 custom-scrollbar relative z-0">
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
