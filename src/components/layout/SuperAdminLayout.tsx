import React from 'react';
import { Outlet, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { ShieldCheck, LogOut, ArrowLeft, LayoutDashboard, Building2, Users, CreditCard } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function SuperAdminLayout() {
    const { superAdminLogout, user } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        superAdminLogout();
        navigate('/super-admin-login');
    };

    return (
        <div className="flex h-screen overflow-hidden bg-background">
            {/* Sidebar - Dedicated for Admin */}
            <aside className="hidden lg:flex w-64 flex-col border-r border-border bg-card shadow-sm z-30">
                <div className="flex items-center h-16 px-6 border-b border-border bg-primary/5">
                    <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shadow-lg">
                            <ShieldCheck className="h-6 w-6" />
                        </div>
                        <div className="flex flex-col">
                            <span className="font-bold text-base tracking-tight">Admin Console</span>
                            <span className="text-[10px] text-primary/70 font-bold uppercase tracking-widest">Master Control</span>
                        </div>
                    </div>
                </div>

                <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-2 custom-scrollbar">
                    <Link
                        to="/super-admin"
                        className="flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-semibold bg-primary text-primary-foreground shadow-sm transition-all"
                    >
                        <LayoutDashboard className="h-5 w-5" />
                        Dashboard
                    </Link>

                    <div className="pt-4 pb-2 px-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                        Environment
                    </div>

                    <Link
                        to="/dashboard"
                        className="flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-all"
                    >
                        <ArrowLeft className="h-5 w-5" />
                        Back to App
                    </Link>
                </nav>

                <div className="p-4 border-t border-border">
                    <Button
                        variant="ghost"
                        className="w-full justify-start gap-3 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={handleLogout}
                    >
                        <LogOut className="h-5 w-5" />
                        Logout System
                    </Button>
                </div>
            </aside>

            <div className="flex flex-1 flex-col min-w-0 overflow-hidden relative">
                {/* Header */}
                <header className="sticky top-0 z-40 flex h-16 flex-shrink-0 items-center justify-between border-b border-border bg-card/80 backdrop-blur-md px-6 shadow-sm">
                    <div className="flex items-center gap-4 lg:hidden">
                        <div className="h-8 w-8 rounded bg-primary text-primary-foreground flex items-center justify-center font-bold">
                            SA
                        </div>
                        <span className="font-bold text-lg">Admin</span>
                    </div>

                    <div className="hidden lg:block text-sm text-muted-foreground italic">
                        Signed in as <span className="text-foreground font-semibold">System Administrator</span>
                    </div>

                    <div className="flex items-center gap-3">
                        <Button variant="outline" size="sm" className="lg:hidden" onClick={handleLogout}>
                            Logout
                        </Button>
                    </div>
                </header>

                {/* Main Content */}
                <main className="flex-1 overflow-y-auto p-4 lg:p-8 bg-muted/30 custom-scrollbar relative z-0">
                    <div className="max-w-7xl mx-auto h-full">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
}
