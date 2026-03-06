import { useState, useEffect } from 'react';
import { supabase as supabaseClient } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const supabase = supabaseClient as any;

export interface ExpenseCategory {
    id: string;
    name: string;
    icon: string;
    color: string;
    sort_order: number;
}

export interface RecurringExpense {
    id: string;
    category_id: string;
    amount: number;
    description: string;
    payment_method: string;
    frequency: string;
    next_due_date: string;
    is_active: boolean;
}

export interface ExtendedExpense {
    id: string;
    amount: number;
    description: string;
    payment_method: string;
    expense_date: string;
    category_id?: string;
    category?: ExpenseCategory;
    created_at: string;
}

export function useExpenseManagement(businessId: string | undefined | null) {
    const [categories, setCategories] = useState<ExpenseCategory[]>([]);
    const [expenses, setExpenses] = useState<ExtendedExpense[]>([]);
    const [recurringExpenses, setRecurringExpenses] = useState<RecurringExpense[]>([]);
    const [profitSummary, setProfitSummary] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    const loadData = async () => {
        if (!businessId) return;
        setIsLoading(true);
        try {
            // 1. Process recurring expenses first (auto-create if due)
            await supabase.rpc('process_due_recurring_expenses', { _business_id: businessId });

            // 1b. Load Profit Summary
            const { data: summaryData, error: summaryError } = await supabase.rpc('calculate_profit_summary', {
                _business_id: businessId
            });
            if (!summaryError) setProfitSummary(summaryData);

            // 2. Load Categories
            const { data: catData, error: catError } = await supabase
                .from('expense_categories')
                .select('*')
                .eq('business_id', businessId)
                .order('sort_order', { ascending: true });

            if (catError) throw catError;
            setCategories(catData || []);

            // 3. Load Expenses with category join if available, else fallback
            // Since category_id is new, older records might just have category (text)
            const { data: expData, error: expError } = await supabase
                .from('expenses')
                .select(`
          *,
          category:expense_categories (*)
        `)
                .eq('business_id', businessId)
                .order('expense_date', { ascending: false });

            if (expError) throw expError;
            setExpenses(expData || []);

            // 4. Load Recurring Expenses
            const { data: recData, error: recError } = await supabase
                .from('recurring_expenses')
                .select('*')
                .eq('business_id', businessId)
                .order('next_due_date', { ascending: true });

            if (recError) throw recError;
            setRecurringExpenses(recData || []);

        } catch (err: any) {
            console.error(err);
            toast.error('Failed to load expense data.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [businessId]);

    // Categories
    const addCategory = async (cat: Partial<ExpenseCategory>) => {
        if (!businessId) return null;
        try {
            const { data, error } = await supabase
                .from('expense_categories')
                .insert([{ ...cat, business_id: businessId }])
                .select()
                .single();
            if (error) throw error;
            setCategories([...categories, data]);
            toast.success('Category added');
            return data;
        } catch (err: any) {
            toast.error(err.message);
            return null;
        }
    };

    const updateCategory = async (id: string, updates: Partial<ExpenseCategory>) => {
        try {
            const { error } = await supabase
                .from('expense_categories')
                .update(updates)
                .eq('id', id);
            if (error) throw error;
            setCategories(categories.map(c => c.id === id ? { ...c, ...updates } : c));
            toast.success('Category updated');
        } catch (err: any) {
            toast.error(err.message);
        }
    };

    const deleteCategory = async (id: string) => {
        try {
            const { error } = await supabase.from('expense_categories').delete().eq('id', id);
            if (error) throw error;
            setCategories(categories.filter(c => c.id !== id));
            toast.success('Category deleted');
        } catch (err: any) {
            toast.error('Cannot delete category. It might be in use.');
        }
    };

    // Expenses
    const addExpense = async (exp: Partial<ExtendedExpense>, categoryTextFallback?: string) => {
        if (!businessId) return null;
        try {
            const { data, error } = await supabase
                .from('expenses')
                .insert([{
                    ...exp,
                    business_id: businessId,
                    // for backward compatibility if category logic still uses text
                    category: categoryTextFallback
                }])
                .select(`*, category:expense_categories (*)`)
                .single();

            if (error) throw error;
            setExpenses([data, ...expenses]);
            toast.success('Expense recorded natively');
            return data;
        } catch (err: any) {
            toast.error(err.message);
            return null;
        }
    };

    const deleteExpense = async (id: string) => {
        try {
            const { error } = await supabase.from('expenses').delete().eq('id', id);
            if (error) throw error;
            setExpenses(expenses.filter(e => e.id !== id));
            toast.success('Expense deleted');
        } catch (err: any) {
            toast.error(err.message);
        }
    };

    // Recurring Expenses
    const addRecurringExpense = async (rec: Partial<RecurringExpense>) => {
        if (!businessId) return null;
        try {
            const { data, error } = await supabase
                .from('recurring_expenses')
                .insert([{ ...rec, business_id: businessId }])
                .select()
                .single();
            if (error) throw error;
            setRecurringExpenses([...recurringExpenses, data]);
            toast.success('Recurring expense scheduled');
            return data;
        } catch (err: any) {
            toast.error(err.message);
            return null;
        }
    };

    const updateRecurringExpense = async (id: string, updates: Partial<RecurringExpense>) => {
        try {
            const { error } = await supabase.from('recurring_expenses').update(updates).eq('id', id);
            if (error) throw error;
            setRecurringExpenses(recurringExpenses.map(r => r.id === id ? { ...r, ...updates } : r));
            toast.success('Recurring expense updated');
        } catch (err: any) {
            toast.error(err.message);
        }
    };

    const deleteRecurringExpense = async (id: string) => {
        try {
            const { error } = await supabase.from('recurring_expenses').delete().eq('id', id);
            if (error) throw error;
            setRecurringExpenses(recurringExpenses.filter(r => r.id !== id));
            toast.success('Recurring expense cancelled');
        } catch (err: any) {
            toast.error(err.message);
        }
    };

    return {
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
        refreshOutlined: loadData
    };
}
