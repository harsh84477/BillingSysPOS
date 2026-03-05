import React from 'react';
import {
    FileText,
    ShoppingCart,
    Users,
    Package,
    FolderOpen,
    BarChart2,
    Activity,
    Receipt,
    Search,
    AlertCircle,
    Inbox,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

// ─────────────────────────────────────────────
// Empty State Component
// ─────────────────────────────────────────────

type EmptyIcon = 'bills' | 'products' | 'customers' | 'categories' | 'expenses' | 'activity' | 'drafts' | 'search' | 'alert' | 'inbox';

const iconMap: Record<EmptyIcon, React.ElementType> = {
    bills: Receipt,
    products: Package,
    customers: Users,
    categories: FolderOpen,
    expenses: BarChart2,
    activity: Activity,
    drafts: FileText,
    search: Search,
    alert: AlertCircle,
    inbox: Inbox,
};

interface EmptyStateProps {
    icon?: EmptyIcon;
    title: string;
    description?: string;
    action?: React.ReactNode;
    className?: string;
}

export function EmptyState({ icon = 'inbox', title, description, action, className }: EmptyStateProps) {
    const Icon = iconMap[icon];
    return (
        <div className={cn('flex flex-col items-center justify-center py-12 px-4 text-center', className)}>
            <div className="relative mb-4">
                <div className="h-16 w-16 rounded-2xl bg-muted/60 flex items-center justify-center">
                    <Icon className="h-8 w-8 text-muted-foreground/60" />
                </div>
                <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center">
                    <Search className="h-2.5 w-2.5 text-primary" />
                </div>
            </div>
            <h3 className="text-base font-semibold text-foreground mb-1">{title}</h3>
            {description && (
                <p className="text-sm text-muted-foreground max-w-sm">{description}</p>
            )}
            {action && (
                <div className="mt-4">{action}</div>
            )}
        </div>
    );
}

// ─────────────────────────────────────────────
// Table Loading Skeleton
// ─────────────────────────────────────────────

interface TableSkeletonProps {
    columns?: number;
    rows?: number;
    className?: string;
}

export function TableSkeleton({ columns = 5, rows = 5, className }: TableSkeletonProps) {
    return (
        <div className={cn('w-full', className)}>
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
                {Array.from({ length: columns }).map((_, i) => (
                    <Skeleton key={`h-${i}`} className={cn('h-4 rounded', i === 0 ? 'w-16' : i === columns - 1 ? 'w-20 ml-auto' : 'flex-1 max-w-[120px]')} />
                ))}
            </div>
            {/* Rows */}
            {Array.from({ length: rows }).map((_, rowIdx) => (
                <div key={`r-${rowIdx}`} className="flex items-center gap-3 px-4 py-3 border-b border-border/50 animate-pulse" style={{ animationDelay: `${rowIdx * 80}ms` }}>
                    {Array.from({ length: columns }).map((_, colIdx) => (
                        <Skeleton key={`c-${rowIdx}-${colIdx}`} className={cn(
                            'h-4 rounded',
                            colIdx === 0 ? 'w-12' : colIdx === columns - 1 ? 'w-16 ml-auto' : 'flex-1 max-w-[100px]',
                            rowIdx % 2 === 0 ? 'opacity-80' : 'opacity-60'
                        )} />
                    ))}
                </div>
            ))}
        </div>
    );
}

// ─────────────────────────────────────────────
// Card Loading Skeleton (for stat grids)
// ─────────────────────────────────────────────

interface CardSkeletonProps {
    count?: number;
}

export function CardGridSkeleton({ count = 4 }: CardSkeletonProps) {
    return (
        <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: count }).map((_, i) => (
                <div key={i} className="rounded-xl border border-border bg-card p-4 animate-pulse" style={{ animationDelay: `${i * 100}ms` }}>
                    <div className="flex items-center justify-between mb-3">
                        <Skeleton className="h-3 w-20" />
                        <Skeleton className="h-8 w-8 rounded-lg" />
                    </div>
                    <Skeleton className="h-6 w-24 mb-1" />
                    <Skeleton className="h-3 w-16" />
                </div>
            ))}
        </div>
    );
}

// ─────────────────────────────────────────────  
// Page Loading Skeleton (full page)
// ─────────────────────────────────────────────

export function PageSkeleton() {
    return (
        <div className="space-y-6 animate-pulse">
            {/* Header */}
            <div>
                <Skeleton className="h-8 w-48 mb-2" />
                <Skeleton className="h-4 w-64" />
            </div>
            {/* Cards */}
            <CardGridSkeleton count={4} />
            {/* Table */}
            <div className="rounded-xl border border-border bg-card">
                <TableSkeleton columns={5} rows={6} />
            </div>
        </div>
    );
}
