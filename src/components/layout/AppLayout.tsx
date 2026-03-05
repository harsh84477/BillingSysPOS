import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
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
  FileText,
  FolderOpen,
  AlertCircle,
  BarChart2,
  Activity,
  Receipt,
  Search,
  ChevronRight,
  ChevronsUpDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { OfflineSyncStatus, SubscriptionBanner } from '@/components/sync/SyncAndSubscriptionStatus';
import { CommandPalette, CommandPaletteTrigger } from '@/components/ui/CommandPalette';
import { format } from 'date-fns';

// ═══════════════════════════════════════════════
// Navigation Structure (per design spec section 7)
// ═══════════════════════════════════════════════

interface NavSection {
  label: string;
  items: NavItemDef[];
}

interface NavItemDef {
  name: string;
  href: string;
  icon: React.ElementType;
  roles: string[];
  badgeKey?: string; // if set, shows a badge
}

const navSections: NavSection[] = [
  {
    label: 'MAIN',
    items: [
      { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['owner', 'manager', 'cashier', 'salesman'] },
    ],
  },
  {
    label: 'BILLING',
    items: [
      { name: 'New Bill', href: '/billing', icon: ShoppingCart, roles: ['owner', 'manager', 'cashier'] },
      { name: 'Quick Bill', href: '/salesman-billing', icon: ShoppingCart, roles: ['salesman'] },
      { name: 'Draft Bills', href: '/draft-bills', icon: FileText, roles: ['owner', 'manager', 'cashier', 'salesman'], badgeKey: 'drafts' },
      { name: 'Bills History', href: '/bills-history', icon: Receipt, roles: ['owner', 'manager', 'cashier', 'salesman'] },
      { name: 'Due Bills', href: '/due-bills', icon: AlertCircle, roles: ['owner', 'manager', 'cashier'], badgeKey: 'due' },
    ],
  },
  {
    label: 'INVENTORY',
    items: [
      { name: 'Products', href: '/products', icon: Package, roles: ['owner', 'manager'] },
      { name: 'Categories', href: '/categories', icon: FolderOpen, roles: ['owner', 'manager'] },
    ],
  },
  {
    label: 'FINANCE',
    items: [
      { name: 'Expenses', href: '/expenses', icon: BarChart2, roles: ['owner', 'manager'] },
      { name: 'Activity Log', href: '/activity-logs', icon: Activity, roles: ['owner', 'manager'] },
    ],
  },
  {
    label: 'CRM',
    items: [
      { name: 'Customers', href: '/customers', icon: Users, roles: ['owner', 'manager'] },
    ],
  },
];

const settingsItem: NavItemDef = { name: 'Settings', href: '/settings', icon: Settings, roles: ['owner', 'manager'] };

const mobileNavItems = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['owner', 'manager', 'cashier', 'salesman'] },
  { name: 'Bill', href: '/billing', icon: ShoppingCart, roles: ['owner', 'manager', 'cashier'] },
  { name: 'Bill', href: '/salesman-billing', icon: ShoppingCart, roles: ['salesman'] },
  { name: 'Due', href: '/due-bills', icon: AlertCircle, roles: ['owner', 'manager', 'cashier'] },
  { name: 'History', href: '/bills-history', icon: FileText, roles: ['owner', 'manager', 'cashier', 'salesman'] },
  { name: 'More', href: '/settings', icon: Settings, roles: ['owner', 'manager'] },
];

// ═══════════════════════════════════════════════
// Page title map for breadcrumbs
// ═══════════════════════════════════════════════
const pageTitleMap: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/billing': 'New Bill',
  '/salesman-billing': 'Quick Bill',
  '/draft-bills': 'Draft Bills',
  '/bills-history': 'Bills History',
  '/due-bills': 'Due Bills',
  '/products': 'Products',
  '/categories': 'Categories',
  '/expenses': 'Expenses',
  '/activity-logs': 'Activity Log',
  '/customers': 'Customers',
  '/settings': 'Settings',
};

// ═══════════════════════════════════════════════
// AppLayout Component
// ═══════════════════════════════════════════════
export default function AppLayout() {
  const { user, signOut, userRole, businessId, isSuperAdmin, superAdminLogout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [infoModal, setInfoModal] = useState<{ open: boolean; title: string; content: React.ReactNode } | null>(null);

  const handleSignOut = async () => {
    if (!user && isSuperAdmin) {
      superAdminLogout();
      navigate('/super-admin-login');
      return;
    }
    await signOut();
    navigate('/auth');
  };

  const roleLabel = isSuperAdmin ? 'Super Admin' : (userRole === 'owner' ? 'Owner' : (userRole ? userRole.charAt(0).toUpperCase() + userRole.slice(1) : 'User'));
  const displayName = user?.email?.split('@')[0] || (isSuperAdmin ? 'Admin' : 'User');
  const currentPageTitle = pageTitleMap[location.pathname] || 'Dashboard';
  const isBillingPage = location.pathname === '/billing' || location.pathname === '/salesman-billing';

  // Filter sections by role
  const filteredSections = navSections
    .map(section => ({
      ...section,
      items: section.items.filter(item => !userRole || item.roles.includes(userRole)),
    }))
    .filter(section => section.items.length > 0);

  const showSettings = !userRole || settingsItem.roles.includes(userRole);
  const filteredMobileNav = mobileNavItems.filter(item => !userRole || item.roles.includes(userRole));

  return (
    <div>
      {/* ════════════════════════════════════
          SIDEBAR (desktop/tablet)
          ════════════════════════════════════ */}
      <aside className="spos-sidebar">
        {/* Logo Block */}
        <div className="spos-sidebar-logo">
          <div className="spos-sidebar-logo-mark">SP</div>
          <div>
            <div className="spos-sidebar-logo-text">Smart POS</div>
            <div className="spos-sidebar-logo-tagline">Business Management</div>
          </div>
        </div>

        {/* Navigation Sections */}
        <nav className="flex-1 overflow-y-auto py-2 custom-scrollbar">
          {filteredSections.map((section, sIdx) => (
            <React.Fragment key={section.label}>
              {sIdx > 0 && <div className="spos-sidebar-divider" />}
              <div className="spos-sidebar-section-label">{section.label}</div>
              {section.items.map(item => (
                <Link
                  key={item.href}
                  to={item.href}
                  className={cn('spos-sidebar-nav-item', location.pathname === item.href && 'active')}
                >
                  <item.icon />
                  <span>{item.name}</span>
                </Link>
              ))}
            </React.Fragment>
          ))}

          {/* Settings always at end */}
          {showSettings && (
            <>
              <div className="spos-sidebar-divider" />
              <Link
                to="/settings"
                className={cn('spos-sidebar-nav-item', location.pathname === '/settings' && 'active')}
              >
                <Settings />
                <span>Settings</span>
              </Link>
            </>
          )}
        </nav>

        {/* User Block */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div className="spos-sidebar-user">
              <div className="spos-sidebar-avatar">
                {displayName.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="spos-sidebar-username truncate">{displayName}</div>
                <div className="spos-sidebar-role">{roleLabel}</div>
              </div>
              <ChevronsUpDown style={{ width: 14, height: 14, color: 'rgba(255,255,255,0.3)' }} />
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-48">
            <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </aside>

      {/* ════════════════════════════════════
          MAIN AREA
          ════════════════════════════════════ */}
      <div className="spos-main">
        {/* Topbar (hidden on billing page for max space) */}
        {!isBillingPage && (
          <div className="spos-topbar hidden md:flex">
            {/* Left side: Breadcrumb + Date */}
            <div className="flex items-center gap-4">
              <div className="spos-breadcrumb">
                <span>Smart POS</span>
                <ChevronRight className="h-3 w-3 spos-breadcrumb-sep" />
                <span className="spos-breadcrumb-current">{currentPageTitle}</span>
              </div>
              <div className="spos-date-chip">
                {format(new Date(), 'dd MMM yyyy')}
              </div>
            </div>

            {/* Right side: Search trigger + actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }))}
                className="flex items-center gap-2 px-3 py-1.5 rounded border border-[var(--spos-border)] bg-[var(--spos-bg)] text-[var(--spos-text-sub)] text-sm hover:border-[var(--spos-border-dark)] transition-colors"
              >
                <Search className="h-3.5 w-3.5" />
                <span className="text-xs">Search…</span>
                <kbd className="text-[10px] font-mono bg-white border border-[var(--spos-border)] rounded px-1.5 py-0.5">⌘K</kbd>
              </button>
            </div>
          </div>
        )}

        {/* Mobile Header (below md) */}
        <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b bg-white px-4 md:hidden"
          style={{ borderColor: 'var(--spos-border)' }}
        >
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[260px] p-0" style={{ background: 'var(--spos-navy)' }}>
              <SheetHeader className="sr-only">
                <SheetTitle>Navigation Menu</SheetTitle>
              </SheetHeader>
              {/* Mobile sidebar content */}
              <div className="spos-sidebar-logo">
                <div className="spos-sidebar-logo-mark">SP</div>
                <div>
                  <div className="spos-sidebar-logo-text">Smart POS</div>
                  <div className="spos-sidebar-logo-tagline">Business Management</div>
                </div>
              </div>
              <nav className="flex-1 overflow-y-auto py-2">
                {filteredSections.map((section, sIdx) => (
                  <React.Fragment key={section.label}>
                    {sIdx > 0 && <div className="spos-sidebar-divider" />}
                    <div className="spos-sidebar-section-label">{section.label}</div>
                    {section.items.map(item => (
                      <Link
                        key={item.href}
                        to={item.href}
                        className={cn('spos-sidebar-nav-item', location.pathname === item.href && 'active')}
                      >
                        <item.icon />
                        <span>{item.name}</span>
                      </Link>
                    ))}
                  </React.Fragment>
                ))}
                {showSettings && (
                  <>
                    <div className="spos-sidebar-divider" />
                    <Link to="/settings" className={cn('spos-sidebar-nav-item', location.pathname === '/settings' && 'active')}>
                      <Settings />
                      <span>Settings</span>
                    </Link>
                  </>
                )}
              </nav>
            </SheetContent>
          </Sheet>

          <span className="font-semibold text-sm" style={{ color: 'var(--spos-text)', fontFamily: 'var(--spos-sans)' }}>
            {currentPageTitle}
          </span>

          <div className="ml-auto">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold uppercase"
                  style={{ background: 'var(--spos-accent-lt)', color: 'var(--spos-accent)' }}
                >
                  {displayName.charAt(0)}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Main Content */}
        <main className={cn(
          'flex-1 relative z-0 flex flex-col',
          isBillingPage
            ? 'overflow-hidden p-0'
            : 'overflow-y-auto overflow-x-hidden p-4 lg:p-6 pb-20 sm:pb-6 custom-scrollbar'
        )}
          style={!isBillingPage ? { background: 'var(--spos-bg)' } : undefined}
        >
          {!isBillingPage && (
            <div className="max-w-7xl mx-auto w-full px-0 sm:px-2">
              <SubscriptionBanner businessId={businessId || ''} />
            </div>
          )}
          <Outlet />
          <OfflineSyncStatus businessId={businessId || ''} userId={user?.id || ''} />
        </main>

        {/* Command Palette */}
        <CommandPalette userRole={userRole || undefined} />

        {/* Mobile Bottom Navigation */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 safe-area-bottom"
          style={{ background: 'var(--spos-white)', borderTop: '1px solid var(--spos-border)' }}
        >
          <div className="flex items-center justify-around h-16">
            {filteredMobileNav.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name + item.href}
                  to={item.href}
                  className="relative flex flex-col items-center justify-center gap-0.5 flex-1 h-full"
                  style={{
                    color: isActive ? 'var(--spos-accent)' : 'var(--spos-text-faint)',
                    fontSize: '10px', fontWeight: isActive ? 600 : 400,
                    fontFamily: 'var(--spos-sans)',
                  }}
                >
                  <item.icon style={{ width: 20, height: 20, strokeWidth: isActive ? 2.2 : 1.8 }} />
                  <span>{item.name}</span>
                  {isActive && (
                    <span className="absolute bottom-0 h-0.5 w-8 rounded-t-full" style={{ background: 'var(--spos-accent)' }} />
                  )}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Info Dialog */}
        <Dialog open={!!infoModal} onOpenChange={(open) => !open && setInfoModal(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{infoModal?.title}</DialogTitle>
              <DialogDescription>System Information & Support</DialogDescription>
            </DialogHeader>
            {infoModal?.content}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
