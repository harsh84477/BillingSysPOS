import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useExpenseManagement } from '@/hooks/useExpenseManagement';
import { LayoutDashboard, PlusCircle, List, CalendarClock, Settings, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

import { DashboardTab } from './DashboardTab';
import { EntryTab } from './EntryTab';
import { LogsTab } from './LogsTab';
import { RecurringTab } from './RecurringTab';
import { CategoriesTab } from './CategoriesTab';

interface ExpenseTrackerProps {
  businessId: string;
}

export function ExpenseTracker({ businessId }: ExpenseTrackerProps) {
  const [activeTab, setActiveTab] = useState('dashboard');

  const {
    categories,
    expenses,
    recurringExpenses,
    profitSummary,
    isLoading,
    addCategory,
    updateCategory,
    deleteCategory,
    addExpense,
    deleteExpense,
    addRecurringExpense,
    updateRecurringExpense,
    deleteRecurringExpense,
    refresh
  } = useExpenseManagement(businessId);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <div className="h-10 w-10 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-medium">Loading Financial Data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-20">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex items-center gap-2">
          <TabsList className="bg-muted/50 p-1 flex-1 justify-start overflow-x-auto rounded-xl flex">
            <TabsTrigger value="dashboard" className="px-4 py-2 rounded-lg flex gap-1.5 text-xs font-bold shadow-none data-[state=active]:bg-primary data-[state=active]:text-white">
              <LayoutDashboard className="h-3.5 w-3.5" /> Dashboard
            </TabsTrigger>
            <TabsTrigger value="add" className="px-4 py-2 rounded-lg flex gap-1.5 text-xs font-bold shadow-none data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
              <PlusCircle className="h-3.5 w-3.5" /> New Expense
            </TabsTrigger>
            <TabsTrigger value="logs" className="px-4 py-2 rounded-lg flex gap-1.5 text-xs font-bold shadow-none data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
              <List className="h-3.5 w-3.5" /> Reports
            </TabsTrigger>
            <TabsTrigger value="recurring" className="px-4 py-2 rounded-lg flex gap-1.5 text-xs font-bold shadow-none data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              <CalendarClock className="h-3.5 w-3.5" /> Recurring
            </TabsTrigger>
            <TabsTrigger value="categories" className="px-4 py-2 rounded-lg flex gap-1.5 text-xs font-bold shadow-none data-[state=active]:bg-purple-600 data-[state=active]:text-white ml-auto">
              <Settings className="h-3.5 w-3.5" /> Settings
            </TabsTrigger>
          </TabsList>
          <Button variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={() => refresh?.()} title="Refresh Data">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        <div className="mt-5">
          <TabsContent value="dashboard" className="mt-0 outline-none">
            <DashboardTab profitSummary={profitSummary} expenses={expenses} categories={categories} />
          </TabsContent>

          <TabsContent value="add" className="mt-0 outline-none">
            <EntryTab categories={categories} addExpense={addExpense} />
          </TabsContent>

          <TabsContent value="logs" className="mt-0 outline-none">
            <LogsTab expenses={expenses} categories={categories} deleteExpense={deleteExpense} />
          </TabsContent>

          <TabsContent value="recurring" className="mt-0 outline-none">
            <RecurringTab
              recurringExpenses={recurringExpenses}
              categories={categories}
              addRecurringExpense={addRecurringExpense}
              updateRecurringExpense={updateRecurringExpense}
              deleteRecurringExpense={deleteRecurringExpense}
            />
          </TabsContent>

          <TabsContent value="categories" className="mt-0 outline-none">
            <CategoriesTab
              categories={categories}
              addCategory={addCategory}
              updateCategory={updateCategory}
              deleteCategory={deleteCategory}
            />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
