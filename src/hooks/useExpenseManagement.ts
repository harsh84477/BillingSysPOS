import { useState, useEffect, useCallback } from 'react';
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
    category?: string | ExpenseCategory | ExpenseCategory[];
    receipt_url?: string;
    created_at: string;
}

// Helper to safely extract category name from any shape
export function getCategoryName(exp: any, categories?: any[]): string {
    if (!exp) return 'Uncategorized';
    // If category is a plain string
    if (typeof exp.category === 'string' && exp.category.length > 0) {
        return exp.category;
    }
    // If category is a single object with a name
    if (exp.category && typeof exp.category === 'object' && !Array.isArray(exp.category) && exp.category.name) {
        return String(exp.category.name);
    }
    // If category is an array (Supabase join result)
    if (Array.isArray(exp.category) && exp.category.length > 0 && exp.category[0]?.name) {
        return String(exp.category[0].name);
    }
    // Fallback: look up by category_id in categories list
    if (exp.category_id && categories && categories.length > 0) {
        const found = categories.find((c: any) => c.id === exp.category_id);
        if (found) return found.name;
    }
    return 'Uncategorized';
}

export function getCategoryColor(exp: any, categories?: any[]): string {
    if (!exp) return '#94a3b8';
    if (exp.category && typeof exp.category === 'object' && !Array.isArray(exp.category) && exp.category.color) {
        return exp.category.color;
    }
    if (Array.isArray(exp.category) && exp.category.length > 0 && exp.category[0]?.color) {
        return exp.category[0].color;
    }
    if (exp.category_id && categories && categories.length > 0) {
        const found = categories.find((c: any) => c.id === exp.category_id);
        if (found?.color) return found.color;
    }
    return '#94a3b8';
}

export function useExpenseManagement(businessId: string | undefined | null) {
    const [categories, setCategories] = useState<ExpenseCategory[]>([]);
    const [expenses, setExpenses] = useState<ExtendedExpense[]>([]);
    const [recurringExpenses, setRecurringExpenses] = useState<RecurringExpense[]>([]);
    const [profitSummary, setProfitSummary] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    const loadData = useCallback(async () => {
        if (!businessId) {
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        try {
            // 1. Process recurring expenses (silently fail if function doesn't exist)
            try {
                await supabase.rpc('process_due_recurring_expenses', { _business_id: businessId });
            } catch (_) { /* RPC might not exist yet */ }

            // 1b. Load Profit Summary (silently fail if function doesn't exist)
            try {
                const { data: summaryData, error: summaryError } = await supabase.rpc('calculate_profit_summary', {
                    _business_id: businessId
                });
                if (!summaryError && summaryData) setProfitSummary(summaryData);
            } catch (_) { /* RPC might not exist yet */ }

            // 2. Load Categories (silently fail if table doesn't exist)
            try {
                const { data: catData, error: catError } = await supabase
                    .from('expense_categories')
                    .select('*')
                    .eq('business_id', businessId)
                    .order('sort_order', { ascending: true });

                if (!catError && catData) setCategories(catData);
            } catch (_) { /* Table might not exist yet */ }

            // 3. Load Expenses - try with join first, fallback to plain select
            try {
                const { data: expData, error: expError } = await supabase
                    .from('expenses')
                    .select(`*, category:expense_categories (*)`)
                    .eq('business_id', businessId)
                    .order('expense_date', { ascending: false });

                if (!expError && expData) {
                    setExpenses(expData);
                } else {
                    // Fallback: load without join
                    const { data: expDataPlain } = await supabase
                        .from('expenses')
                        .select('*')
                        .eq('business_id', businessId)
                        .order('expense_date', { ascending: false });
                    setExpenses(expDataPlain || []);
                }
            } catch (_) {
                // Final fallback
                try {
                    const { data: expDataPlain } = await supabase
                        .from('expenses')
                        .select('*')
                        .eq('business_id', businessId)
                        .order('expense_date', { ascending: false });
                    setExpenses(expDataPlain || []);
                } catch (__) { /* expenses table doesn't exist */ }
            }

            // 4. Load Recurring Expenses (silently fail if table doesn't exist)
            try {
                const { data: recData, error: recError } = await supabase
                    .from('recurring_expenses')
                    .select('*')
                    .eq('business_id', businessId)
                    .order('next_due_date', { ascending: true });

                if (!recError && recData) setRecurringExpenses(recData);
            } catch (_) { /* Table might not exist yet */ }

        } catch (err: any) {
            console.error('Expense data load error:', err);
        } finally {
            setIsLoading(false);
        }
    }, [businessId]);

    useEffect(() => {
        loadData();
    }, [loadData]);

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
            setCategories(prev => [...prev, data]);
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
            setCategories(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
            toast.success('Category updated');
        } catch (err: any) {
            toast.error(err.message);
        }
    };

    const deleteCategory = async (id: string) => {
        try {
            const { error } = await supabase.from('expense_categories').delete().eq('id', id);
            if (error) throw error;
            setCategories(prev => prev.filter(c => c.id !== id));
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
                    category: categoryTextFallback
                }])
                .select(`*, category:expense_categories (*)`)
                .single();

            if (error) throw error;
            setExpenses(prev => [data, ...prev]);
            toast.success('Expense recorded');
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
            setExpenses(prev => prev.filter(e => e.id !== id));
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
            setRecurringExpenses(prev => [...prev, data]);
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
            setRecurringExpenses(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
            toast.success('Recurring expense updated');
        } catch (err: any) {
            toast.error(err.message);
        }
    };

    const deleteRecurringExpense = async (id: string) => {
        try {
            const { error } = await supabase.from('recurring_expenses').delete().eq('id', id);
            if (error) throw error;
            setRecurringExpenses(prev => prev.filter(r => r.id !== id));
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
        refresh: loadData
    };
}
