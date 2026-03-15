import React, { useState } from 'react';
import { useExpenseManagement } from '@/hooks/useExpenseManagement';
import { LayoutDashboard, PlusCircle, List, CalendarClock, Settings, RefreshCw, IndianRupee } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import { DashboardTab } from './DashboardTab';
import { EntryTab } from './EntryTab';
import { LogsTab } from './LogsTab';
import { RecurringTab } from './RecurringTab';
import { CategoriesTab } from './CategoriesTab';

interface ExpenseTrackerProps {
  businessId: string;
}

const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, accent: '#6366f1' },
  { id: 'add',       label: 'New Expense', icon: PlusCircle,     accent: '#10b981' },
  { id: 'logs',      label: 'Reports',     icon: List,            accent: '#3b82f6' },
  { id: 'recurring', label: 'Recurring',   icon: CalendarClock,  accent: '#8b5cf6' },
  { id: 'categories',label: 'Settings',    icon: Settings,        accent: '#f59e0b' },
];

export function ExpenseTracker({ businessId }: ExpenseTrackerProps) {
  const [activeTab, setActiveTab] = useState('dashboard');

  const {
    categories, subcategories, expenses, recurringExpenses,
    profitSummary, monthlyTrends, isLoading,
    addCategory, updateCategory, deleteCategory,
    addSubcategory, updateSubcategory, deleteSubcategory,
    addExpense, updateExpense, deleteExpense,
    addRecurringExpense, updateRecurringExpense, deleteRecurringExpense,
    refresh
  } = useExpenseManagement(businessId);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
        <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-semibold">Loading Financial Data...</p>
        <p className="text-xs opacity-60 mt-1">Fetching expenses, trends & analytics</p>
      </div>
    );
  }

  const activeTabConfig = TABS.find(t => t.id === activeTab);

  return (
    <div className="w-full pb-8 space-y-4">
      {/* ─── Premium Tab Bar ─── */}
      <div className="flex items-center gap-2 w-full">
        <div className="flex-1 flex items-center gap-1 bg-muted/40 rounded-2xl p-1.5 border overflow-x-auto scrollbar-none">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all duration-200 whitespace-nowrap shrink-0 outline-none',
                  isActive
                    ? 'text-white shadow-lg scale-[1.02]'
                    : 'text-muted-foreground hover:text-foreground hover:bg-background/60'
                )}
                style={isActive ? { backgroundColor: tab.accent, boxShadow: `0 4px 14px ${tab.accent}40` } : {}}
              >
                <tab.icon className={cn('shrink-0', isActive ? 'h-4 w-4' : 'h-3.5 w-3.5')} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Refresh button */}
        <Button
          variant="outline"
          size="icon"
          className="h-11 w-11 rounded-xl shrink-0 border"
          onClick={() => refresh?.()}
          title="Refresh Data"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* ─── Tab Content ─── */}
      <div className="w-full">
        {activeTab === 'dashboard' && (
          <DashboardTab
            profitSummary={profitSummary}
            expenses={expenses}
            categories={categories}
            monthlyTrends={monthlyTrends}
          />
        )}
        {activeTab === 'add' && (
          <EntryTab
            categories={categories}
            subcategories={subcategories}
            addExpense={addExpense}
          />
        )}
        {activeTab === 'logs' && (
          <LogsTab
            expenses={expenses}
            categories={categories}
            subcategories={subcategories}
            deleteExpense={deleteExpense}
          />
        )}
        {activeTab === 'recurring' && (
          <RecurringTab
            recurringExpenses={recurringExpenses}
            categories={categories}
            addRecurringExpense={addRecurringExpense}
            updateRecurringExpense={updateRecurringExpense}
            deleteRecurringExpense={deleteRecurringExpense}
          />
        )}
        {activeTab === 'categories' && (
          <CategoriesTab
            categories={categories}
            subcategories={subcategories}
            addCategory={addCategory}
            updateCategory={updateCategory}
            deleteCategory={deleteCategory}
            addSubcategory={addSubcategory}
            updateSubcategory={updateSubcategory}
            deleteSubcategory={deleteSubcategory}
          />
        )}
      </div>
    </div>
  );
}
