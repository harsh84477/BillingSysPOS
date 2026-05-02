import React from 'react';
import { useNavigate, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import {
    ShieldCheck, LogOut,
    LayoutDashboard, Building2, CreditCard,
    Users, Sparkles, ScrollText, ChevronRight,
    BarChart3, IndianRupee, Tag, MessageSquare,
    Megaphone, Activity, Settings,
} from 'lucide-react';



// Sidebar structure with groups, badges, and icons
const navGroups = [
    {
        label: 'Platform',
        items: [
            { id: 'overview', label: 'Overview', icon: LayoutDashboard, path: '/super-admin/dashboard' },
            { id: 'analytics', label: 'Analytics', icon: BarChart3, path: '/super-admin/analytics' },
        ],
    },
    {
        label: 'Users & Tenants',
        items: [
            { id: 'users', label: 'All Users', icon: Users, path: '/super-admin/users' },
            { id: 'tenants', label: 'Shop Tenants', icon: Building2, path: '/super-admin/tenants' },
            { id: 'roles', label: 'Roles & Permissions', icon: ShieldCheck, path: '/super-admin/roles' },
        ],
    },
    {
        label: 'Monetisation',
        items: [
            { id: 'subscriptions', label: 'Subscriptions', icon: CreditCard, path: '/super-admin/subscriptions' },
            { id: 'revenue', label: 'Revenue', icon: IndianRupee, path: '/super-admin/revenue' },
            { id: 'plans', label: 'Plans & Pricing', icon: Tag, path: '/super-admin/plans' },
        ],
    },
    {
        label: 'Support',
        items: [
            { id: 'tickets', label: 'Support Tickets', icon: MessageSquare, path: '/super-admin/support-tickets' },
            { id: 'announcements', label: 'Announcements', icon: Megaphone, path: '/super-admin/announcements' },
        ],
    },
    {
        label: 'System',
        items: [
            { id: 'logs', label: 'Audit Log', icon: ScrollText, path: '/super-admin/logs' },
            { id: 'health', label: 'System Health', icon: Activity, path: '/super-admin/health' },
            { id: 'settings', label: 'Platform Settings', icon: Settings, path: '/super-admin/settings' },
        ],
    },
];

// Flattened nav items for active item and mobile nav
const navItems = navGroups.flatMap(group => group.items);



interface Props {
    children: React.ReactNode;
}

export default function SuperAdminLayout({ children }: Props) {
    const { superAdminLogout, customAdminName } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = () => {
        superAdminLogout();
        navigate('/super-admin-login');
    };

    // Determine active item by matching path
    const activeItem = navItems.find(n => location.pathname.startsWith(n.path)) || navItems[0];

    return (
        <div className="flex h-screen overflow-hidden bg-background">
            {/* ── Sidebar ── */}
            <aside className="hidden lg:flex w-60 flex-col flex-shrink-0 bg-card border-r border-border">
                {/* Brand */}
                <div className="flex items-center gap-3 h-16 px-5 border-b border-border">
                    <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
                        <ShieldCheck className="h-4 w-4 text-primary-foreground" />
                    </div>
                    <div>
                        <p className="font-bold text-sm leading-none">Admin Console</p>
                        <p className="text-primary/70 text-[10px] font-semibold uppercase tracking-widest mt-0.5">Master Control</p>
                    </div>
                </div>


                                {/* Nav */}
                                <nav className="flex-1 py-4 px-3 space-y-2 overflow-y-auto">
                                    {navGroups.map((group, gi) => (
                                        <div key={gi} className="mb-2">
                                            <div className="text-muted-foreground/50 text-[10px] font-bold uppercase tracking-widest px-3 mb-1">{group.label}</div>
                                            {group.items.map((item) => {
                                                const active = location.pathname.startsWith(item.path);
                                                return (
                                                    <NavLink
                                                        key={item.id}
                                                        to={item.path}
                                                        className={({ isActive }) =>
                                                            cn(
                                                                'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group',
                                                                isActive || active
                                                                    ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/20'
                                                                    : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                                                            )
                                                        }
                                                    >
                                                        <item.icon className={cn('h-4 w-4 shrink-0', active ? 'text-primary-foreground' : 'text-muted-foreground group-hover:text-foreground')} />
                                                        <span className="flex-1 text-left">{item.label}</span>
                                                        {active && <ChevronRight className="h-3 w-3 opacity-60" />}
                                                    </NavLink>
                                                );
                                            })}
                                        </div>
                                    ))}
                                </nav>

                {/* Admin Name + Logout */}
                <div className="p-3 border-t border-border space-y-2">
                    {customAdminName && (
                        <div className="px-3 py-1.5">
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Logged in as</p>
                            <p className="text-xs font-bold truncate">{customAdminName}</p>
                        </div>
                    )}
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-400/70 hover:text-red-400 hover:bg-red-500/10 transition-all"
                    >
                        <LogOut className="h-4 w-4" />
                        Logout System
                    </button>
                </div>
            </aside>

            {/* ── Main Area ── */}
            <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
                {/* Top bar */}
                <header className="flex h-14 flex-shrink-0 items-center justify-between border-b border-border bg-card px-4 sm:px-6">
                    <div className="flex items-center gap-3">
                        {/* Mobile brand */}
                        <div className="lg:hidden h-7 w-7 rounded bg-primary flex items-center justify-center">
                            <ShieldCheck className="h-4 w-4 text-primary-foreground" />
                        </div>
                        <div>
                            <p className="font-bold text-sm">{activeItem.label}</p>
                            <p className="text-muted-foreground text-[11px] hidden lg:block">Super Admin · Platform Control</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
                        <span className="text-muted-foreground text-xs font-mono hidden sm:block">{customAdminName || 'System Administrator'}</span>
                        <button onClick={handleLogout} className="lg:hidden ml-2 text-red-400 hover:text-red-500">
                            <LogOut className="h-4 w-4" />
                        </button>
                    </div>
                </header>

                {/* Scrollable content */}
                <main className="flex-1 overflow-y-auto bg-muted/30 p-4 sm:p-6 lg:p-8 pb-20 lg:pb-8">
                    <div className="max-w-7xl mx-auto">
                        {children}
                    </div>
                </main>

                {/* Mobile Bottom Nav */}
                <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border flex justify-around py-1.5 px-1 z-50">
                    {navItems.slice(0, 5).map((item) => {
                        const active = location.pathname.startsWith(item.path);
                        return (
                            <NavLink
                                key={item.id}
                                to={item.path}
                                className={({ isActive }) =>
                                    cn(
                                        'flex flex-col items-center gap-0.5 px-2 py-1 rounded-md text-[10px] font-medium transition-colors min-w-0',
                                        isActive || active ? 'text-primary' : 'text-muted-foreground'
                                    )
                                }
                                end={item.id === 'overview'}
                            >
                                <item.icon className="h-4 w-4" />
                                <span className="truncate">{item.label.split(' ')[0]}</span>
                            </NavLink>
                        );
                    })}
                </nav>
            </div>
        </div>
    );
}

