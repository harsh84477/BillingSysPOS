import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import {
    ShieldCheck, LogOut, ArrowLeft,
    LayoutDashboard, Building2, CreditCard,
    Users, Sparkles, ScrollText, ChevronRight,
} from 'lucide-react';

const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'businesses', label: 'Businesses', icon: Building2 },
    { id: 'subscriptions', label: 'Subscriptions', icon: CreditCard },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'plans', label: 'Plans', icon: Sparkles },
    { id: 'logs', label: 'Audit Logs', icon: ScrollText },
];

interface Props {
    activeTab: string;
    onTabChange: (tab: string) => void;
    children: React.ReactNode;
}

export default function SuperAdminLayout({ activeTab, onTabChange, children }: Props) {
    const { superAdminLogout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        superAdminLogout();
        navigate('/super-admin-login');
    };

    const activeItem = navItems.find(n => n.id === activeTab) || navItems[0];

    return (
        <div className="flex h-screen overflow-hidden bg-[#0f1117]">
            {/* ── Sidebar ── */}
            <aside className="hidden lg:flex w-60 flex-col flex-shrink-0 bg-[#13151f] border-r border-white/5">
                {/* Brand */}
                <div className="flex items-center gap-3 h-16 px-5 border-b border-white/5">
                    <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
                        <ShieldCheck className="h-4 w-4 text-primary-foreground" />
                    </div>
                    <div>
                        <p className="text-white font-bold text-sm leading-none">Admin Console</p>
                        <p className="text-primary/70 text-[10px] font-semibold uppercase tracking-widest mt-0.5">Master Control</p>
                    </div>
                </div>

                {/* Nav */}
                <nav className="flex-1 py-4 px-3 space-y-0.5 overflow-y-auto">
                    <p className="text-white/25 text-[10px] font-bold uppercase tracking-widest px-3 mb-2">Navigation</p>
                    {navItems.map((item) => {
                        const active = activeTab === item.id;
                        return (
                            <button
                                key={item.id}
                                onClick={() => onTabChange(item.id)}
                                className={cn(
                                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group',
                                    active
                                        ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/40'
                                        : 'text-white/50 hover:text-white hover:bg-white/5'
                                )}
                            >
                                <item.icon className={cn('h-4 w-4 shrink-0', active ? 'text-primary-foreground' : 'text-white/40 group-hover:text-white/70')} />
                                <span className="flex-1 text-left">{item.label}</span>
                                {active && <ChevronRight className="h-3 w-3 opacity-60" />}
                            </button>
                        );
                    })}

                    <div className="pt-4 pb-1">
                        <p className="text-white/25 text-[10px] font-bold uppercase tracking-widest px-3 mb-2">Environment</p>
                        <Link
                            to="/dashboard"
                            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-white/40 hover:text-white hover:bg-white/5 transition-all"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Back to App
                        </Link>
                    </div>
                </nav>

                {/* Logout */}
                <div className="p-3 border-t border-white/5">
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
                <header className="flex h-14 flex-shrink-0 items-center justify-between border-b border-white/5 bg-[#13151f] px-6">
                    <div className="flex items-center gap-3">
                        {/* Mobile brand */}
                        <div className="lg:hidden h-7 w-7 rounded bg-primary flex items-center justify-center">
                            <ShieldCheck className="h-4 w-4 text-primary-foreground" />
                        </div>
                        <div>
                            <p className="text-white/90 font-bold text-sm">{activeItem.label}</p>
                            <p className="text-white/30 text-[11px] hidden lg:block">Super Admin · Platform Control</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
                        <span className="text-white/40 text-xs font-mono hidden sm:block">System Administrator</span>
                    </div>
                </header>

                {/* Scrollable content */}
                <main className="flex-1 overflow-y-auto bg-[#0f1117] p-6 lg:p-8">
                    <div className="max-w-7xl mx-auto">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
