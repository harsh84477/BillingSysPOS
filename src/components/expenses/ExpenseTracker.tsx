import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useExpenseManagement } from '@/hooks/useExpenseManagement';
import { LayoutDashboard, PlusCircle, List, CalendarClock, Settings } from 'lucide-react';

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
    deleteRecurringExpense
  } = useExpenseManagement(businessId);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 animate-pulse text-muted-foreground">
        <div className="h-10 w-10 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
        Loading Financial Data...
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-muted/50 p-1 w-full justify-start overflow-x-auto rounded-xl flex">
          <TabsTrigger value="dashboard" className="px-5 py-2.5 rounded-lg flex gap-2 w-full md:w-auto text-xs md:text-sm font-bold shadow-none data-[state=active]:bg-primary data-[state=active]:text-white">
            <LayoutDashboard className="h-4 w-4" /> Dashboard
          </TabsTrigger>
          <TabsTrigger value="add" className="px-5 py-2.5 rounded-lg flex gap-2 w-full md:w-auto text-xs md:text-sm font-bold shadow-none data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
            <PlusCircle className="h-4 w-4" /> New Expense
          </TabsTrigger>
          <TabsTrigger value="logs" className="px-5 py-2.5 rounded-lg flex gap-2 w-full md:w-auto text-xs md:text-sm font-bold shadow-none data-[state=active]:bg-primary data-[state=active]:text-white">
            <List className="h-4 w-4" /> Reports
          </TabsTrigger>
          <TabsTrigger value="recurring" className="px-5 py-2.5 rounded-lg flex gap-2 w-full md:w-auto text-xs md:text-sm font-bold shadow-none data-[state=active]:bg-blue-600 data-[state=active]:text-white">
            <CalendarClock className="h-4 w-4" /> Recurring
          </TabsTrigger>
          <TabsTrigger value="categories" className="px-5 py-2.5 rounded-lg flex gap-2 w-full md:w-auto text-xs md:text-sm font-bold shadow-none data-[state=active]:bg-purple-600 data-[state=active]:text-white ml-auto">
            <Settings className="h-4 w-4" /> Settings
          </TabsTrigger>
        </TabsList>

        <div className="mt-6">
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
