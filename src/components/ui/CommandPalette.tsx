import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    LayoutDashboard, ShoppingCart, Package, Users, Settings, FileText, FolderOpen,
    BarChart2, Activity, Receipt, AlertCircle, Search, Command, ArrowRight,
    Keyboard, Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Types ───
interface CommandItem {
    id: string;
    label: string;
    description?: string;
    icon: React.ElementType;
    action: () => void;
    category: 'navigation' | 'action' | 'shortcut';
    keywords?: string[];
}

// ─── Command Palette Component ───
export function CommandPalette({ userRole }: { userRole?: string }) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();

    // ─── Global keyboard shortcut ───
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ctrl+K or Cmd+K to open
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                setOpen(prev => !prev);
                setQuery('');
                setSelectedIndex(0);
            }
            // Escape to close
            if (e.key === 'Escape' && open) {
                setOpen(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [open]);

    // ─── Focus input when opened ───
    useEffect(() => {
        if (open) {
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [open]);

    // ─── Build command items ───
    const allCommands: CommandItem[] = useMemo(() => {
        const nav = (href: string) => () => { navigate(href); setOpen(false); };

        const items: CommandItem[] = [
            // Navigation
            { id: 'dash', label: 'Dashboard', description: 'View sales overview', icon: LayoutDashboard, action: nav('/dashboard'), category: 'navigation', keywords: ['home', 'overview', 'stats'] },
            { id: 'bill', label: 'New Bill', description: 'Create a new billing invoice', icon: ShoppingCart, action: nav('/billing'), category: 'navigation', keywords: ['invoice', 'sale', 'checkout', 'pos'] },
            { id: 'drafts', label: 'Draft Bills', description: 'View pending draft orders', icon: FileText, action: nav('/draft-bills'), category: 'navigation', keywords: ['pending', 'orders'] },
            { id: 'history', label: 'Bills History', description: 'View completed bills', icon: Receipt, action: nav('/bills-history'), category: 'navigation', keywords: ['completed', 'past', 'records'] },
            { id: 'due', label: 'Due Bills', description: 'View unpaid credit bills', icon: AlertCircle, action: nav('/due-bills'), category: 'navigation', keywords: ['unpaid', 'credit', 'outstanding'] },
            { id: 'products', label: 'Products', description: 'Manage product inventory', icon: Package, action: nav('/products'), category: 'navigation', keywords: ['inventory', 'stock', 'items'] },
            { id: 'expenses', label: 'Expenses', description: 'Track business expenses', icon: BarChart2, action: nav('/expenses'), category: 'navigation', keywords: ['cost', 'spending', 'profit'] },
            { id: 'logs', label: 'Activity Log', description: 'View system audit trail', icon: Activity, action: nav('/activity-logs'), category: 'navigation', keywords: ['audit', 'history', 'actions'] },
            { id: 'categories', label: 'Categories', description: 'Organize product categories', icon: FolderOpen, action: nav('/categories'), category: 'navigation', keywords: ['groups', 'organize'] },
            { id: 'customers', label: 'Customers', description: 'Manage customer database', icon: Users, action: nav('/customers'), category: 'navigation', keywords: ['clients', 'contacts', 'people'] },
            { id: 'settings', label: 'Settings', description: 'Configure business settings', icon: Settings, action: nav('/settings'), category: 'navigation', keywords: ['config', 'preferences', 'options'] },

            // Quick Actions
            { id: 'new-bill-action', label: 'Start New Bill', description: 'Jump to billing immediately', icon: Zap, action: nav('/billing'), category: 'action', keywords: ['quick', 'fast'] },
            { id: 'add-product', label: 'Add Product', description: 'Add a new product to inventory', icon: Package, action: nav('/products'), category: 'action', keywords: ['create', 'new'] },
            { id: 'add-customer', label: 'Add Customer', description: 'Register a new customer', icon: Users, action: nav('/customers'), category: 'action', keywords: ['create', 'new', 'register'] },
        ];

        // Filter by role
        const roleMap: Record<string, string[]> = {
            salesman: ['dash', 'bill', 'drafts', 'history', 'new-bill-action'],
            cashier: ['dash', 'bill', 'drafts', 'history', 'due', 'new-bill-action'],
        };

        if (userRole && roleMap[userRole]) {
            return items.filter(i => roleMap[userRole].includes(i.id));
        }
        return items;
    }, [navigate, userRole]);

    // ─── Filter commands ───
    const filtered = useMemo(() => {
        if (!query.trim()) return allCommands;
        const q = query.toLowerCase();
        return allCommands.filter(item => {
            const searchable = [item.label, item.description, ...(item.keywords || [])].join(' ').toLowerCase();
            return searchable.includes(q);
        });
    }, [query, allCommands]);

    // ─── Reset selection on filter change ───
    useEffect(() => {
        setSelectedIndex(0);
    }, [filtered.length]);

    // ─── Keyboard navigation ───
    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(prev => Math.min(prev + 1, filtered.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(prev => Math.max(prev - 1, 0));
        } else if (e.key === 'Enter' && filtered[selectedIndex]) {
            e.preventDefault();
            filtered[selectedIndex].action();
        }
    }, [filtered, selectedIndex]);

    // ─── Scroll selected into view ───
    useEffect(() => {
        if (listRef.current) {
            const el = listRef.current.children[selectedIndex] as HTMLElement;
            el?.scrollIntoView({ block: 'nearest' });
        }
    }, [selectedIndex]);

    // ─── Group commands by category ───
    const grouped = useMemo(() => {
        const groups: Record<string, CommandItem[]> = {};
        filtered.forEach(item => {
            if (!groups[item.category]) groups[item.category] = [];
            groups[item.category].push(item);
        });
        return groups;
    }, [filtered]);

    const categoryLabels: Record<string, string> = {
        navigation: 'Pages',
        action: 'Quick Actions',
        shortcut: 'Shortcuts',
    };

    if (!open) return null;

    let globalIdx = -1;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm animate-in fade-in duration-150"
                onClick={() => setOpen(false)}
            />

            {/* Palette */}
            <div className="fixed inset-0 z-[101] flex items-start justify-center pt-[15vh] sm:pt-[20vh] px-4">
                <div
                    className="w-full max-w-lg rounded-2xl border border-border bg-card shadow-2xl overflow-hidden animate-in slide-in-from-top-4 fade-in duration-200"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Search Input */}
                    <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
                        <Search className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                        <input
                            ref={inputRef}
                            type="text"
                            placeholder="Search pages, actions..."
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={handleKeyDown}
                            className="flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground/60"
                            autoComplete="off"
                        />
                        <kbd className="hidden sm:inline-flex h-6 items-center gap-1 rounded-md border border-border bg-muted px-2 font-mono text-[10px] font-medium text-muted-foreground">
                            ESC
                        </kbd>
                    </div>

                    {/* Results */}
                    <div ref={listRef} className="max-h-[320px] overflow-y-auto py-2 custom-scrollbar">
                        {filtered.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                                <Search className="h-8 w-8 mb-2 opacity-30" />
                                <p className="text-sm font-medium">No results found</p>
                                <p className="text-xs">Try a different search term</p>
                            </div>
                        ) : (
                            Object.entries(grouped).map(([category, items]) => (
                                <div key={category}>
                                    <div className="px-4 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
                                        {categoryLabels[category] || category}
                                    </div>
                                    {items.map((item) => {
                                        globalIdx++;
                                        const idx = globalIdx;
                                        return (
                                            <button
                                                key={item.id}
                                                onClick={item.action}
                                                onMouseEnter={() => setSelectedIndex(idx)}
                                                className={cn(
                                                    'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors',
                                                    idx === selectedIndex
                                                        ? 'bg-primary/10 text-primary'
                                                        : 'text-foreground hover:bg-accent'
                                                )}
                                            >
                                                <div className={cn(
                                                    'h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0',
                                                    idx === selectedIndex ? 'bg-primary/15' : 'bg-muted'
                                                )}>
                                                    <item.icon className="h-4 w-4" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-sm font-medium truncate">{item.label}</div>
                                                    {item.description && (
                                                        <div className="text-xs text-muted-foreground truncate">{item.description}</div>
                                                    )}
                                                </div>
                                                {idx === selectedIndex && (
                                                    <ArrowRight className="h-4 w-4 text-primary flex-shrink-0" />
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            ))
                        )}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between px-4 py-2 border-t border-border bg-muted/30">
                        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                            <span className="flex items-center gap-1">
                                <kbd className="inline-flex h-4 items-center rounded border border-border bg-muted px-1 font-mono text-[9px]">↑</kbd>
                                <kbd className="inline-flex h-4 items-center rounded border border-border bg-muted px-1 font-mono text-[9px]">↓</kbd>
                                Navigate
                            </span>
                            <span className="flex items-center gap-1">
                                <kbd className="inline-flex h-4 items-center rounded border border-border bg-muted px-1 font-mono text-[9px]">↵</kbd>
                                Select
                            </span>
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                            <Command className="h-3 w-3" />
                            <span>Smart POS</span>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

// ─── Trigger Button (for sidebar/header) ───
export function CommandPaletteTrigger({ collapsed }: { collapsed?: boolean }) {
    const handleClick = () => {
        // Dispatch Ctrl+K programmatically
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }));
    };

    if (collapsed) {
        return (
            <button
                onClick={handleClick}
                className="w-full flex items-center justify-center p-2 rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                title="Search (Ctrl+K)"
            >
                <Search className="h-4 w-4" />
            </button>
        );
    }

    return (
        <button
            onClick={handleClick}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-muted/40 hover:bg-muted/60 transition-colors text-left group"
        >
            <Search className="h-4 w-4 text-muted-foreground" />
            <span className="flex-1 text-sm text-muted-foreground">Search...</span>
            <kbd className="hidden sm:inline-flex h-5 items-center gap-0.5 rounded-md border border-border bg-background px-1.5 font-mono text-[10px] font-medium text-muted-foreground group-hover:border-primary/30">
                <span className="text-[9px]">⌘</span>K
            </kbd>
        </button>
    );
}
