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

export interface ExpenseSubcategory {
    id: string;
    category_id: string;
    name: string;
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
    subcategory_id?: string;
    category?: string | ExpenseCategory | ExpenseCategory[];
    subcategory?: ExpenseSubcategory | ExpenseSubcategory[] | null;
    receipt_url?: string;
    created_at: string;
}

export interface MonthlyTrend {
    month: string;
    sales: number;
    inventory_cost: number;
    expenses: number;
    profit: number;
}

// Helper to safely extract category name from any shape
export function getCategoryName(exp: any, categories?: any[]): string {
    if (!exp) return 'Uncategorized';
    if (typeof exp.category === 'string' && exp.category.length > 0) {
        return exp.category;
    }
    if (exp.category && typeof exp.category === 'object' && !Array.isArray(exp.category) && exp.category.name) {
        return String(exp.category.name);
    }
    if (Array.isArray(exp.category) && exp.category.length > 0 && exp.category[0]?.name) {
        return String(exp.category[0].name);
    }
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

export function getSubcategoryName(exp: any, subcategories?: any[]): string {
    if (!exp) return '';
    if (exp.subcategory && typeof exp.subcategory === 'object' && !Array.isArray(exp.subcategory) && exp.subcategory.name) {
        return String(exp.subcategory.name);
    }
    if (Array.isArray(exp.subcategory) && exp.subcategory.length > 0 && exp.subcategory[0]?.name) {
        return String(exp.subcategory[0].name);
    }
    if (exp.subcategory_id && subcategories && subcategories.length > 0) {
        const found = subcategories.find((s: any) => s.id === exp.subcategory_id);
        if (found) return found.name;
    }
    return '';
}

export function useExpenseManagement(businessId: string | undefined | null) {
    const [categories, setCategories] = useState<ExpenseCategory[]>([]);
    const [subcategories, setSubcategories] = useState<ExpenseSubcategory[]>([]);
    const [expenses, setExpenses] = useState<ExtendedExpense[]>([]);
    const [recurringExpenses, setRecurringExpenses] = useState<RecurringExpense[]>([]);
    const [profitSummary, setProfitSummary] = useState<any>(null);
    const [monthlyTrends, setMonthlyTrends] = useState<MonthlyTrend[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const loadData = useCallback(async () => {
        if (!businessId) {
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        try {
            // 1. Process recurring expenses
            try {
                await supabase.rpc('process_due_recurring_expenses', { _business_id: businessId });
            } catch (_) { }

            // 1b. Profit Summary
            try {
                const { data: summaryData, error: summaryError } = await supabase.rpc('calculate_profit_summary', {
                    _business_id: businessId
                });
                if (!summaryError && summaryData) setProfitSummary(summaryData);
            } catch (_) { }

            // 1c. Monthly Cost Trends
            try {
                const { data: trendsData, error: trendsError } = await supabase.rpc('get_monthly_cost_trends', {
                    _business_id: businessId
                });
                if (!trendsError && trendsData) setMonthlyTrends(trendsData);
            } catch (_) { }

            // 2. Categories
            try {
                const { data: catData, error: catError } = await supabase
                    .from('expense_categories')
                    .select('*')
                    .eq('business_id', businessId)
                    .order('sort_order', { ascending: true });
                if (!catError && catData) setCategories(catData);
            } catch (_) { }

            // 2b. Subcategories
            try {
                const { data: subData, error: subError } = await supabase
                    .from('expense_subcategories')
                    .select('*')
                    .eq('business_id', businessId)
                    .order('name', { ascending: true });
                if (!subError && subData) setSubcategories(subData);
            } catch (_) { }

            // 3. Expenses (with joins)
            try {
                const { data: expData, error: expError } = await supabase
                    .from('expenses')
                    .select(`*, category:expense_categories (*), subcategory:expense_subcategories (*)`)
                    .eq('business_id', businessId)
                    .order('expense_date', { ascending: false });

                if (!expError && expData) {
                    setExpenses(expData);
                } else {
                    // Fallback without subcategory join
                    try {
                        const { data: expData2, error: expError2 } = await supabase
                            .from('expenses')
                            .select(`*, category:expense_categories (*)`)
                            .eq('business_id', businessId)
                            .order('expense_date', { ascending: false });
                        if (!expError2 && expData2) setExpenses(expData2);
                        else {
                            const { data: expDataPlain } = await supabase
                                .from('expenses')
                                .select('*')
                                .eq('business_id', businessId)
                                .order('expense_date', { ascending: false });
                            setExpenses(expDataPlain || []);
                        }
                    } catch (__) {
                        const { data: expDataPlain } = await supabase
                            .from('expenses')
                            .select('*')
                            .eq('business_id', businessId)
                            .order('expense_date', { ascending: false });
                        setExpenses(expDataPlain || []);
                    }
                }
            } catch (_) {
                try {
                    const { data: expDataPlain } = await supabase
                        .from('expenses')
                        .select('*')
                        .eq('business_id', businessId)
                        .order('expense_date', { ascending: false });
                    setExpenses(expDataPlain || []);
                } catch (__) { }
            }

            // 4. Recurring Expenses
            try {
                const { data: recData, error: recError } = await supabase
                    .from('recurring_expenses')
                    .select('*')
                    .eq('business_id', businessId)
                    .order('next_due_date', { ascending: true });
                if (!recError && recData) setRecurringExpenses(recData);
            } catch (_) { }

        } catch (err: any) {
            console.error('Expense data load error:', err);
        } finally {
            setIsLoading(false);
        }
    }, [businessId]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // ═══════════════════════════════════════════════
    // Categories CRUD
    // ═══════════════════════════════════════════════
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
            // Also remove subcategories that belonged to this category
            setSubcategories(prev => prev.filter(s => s.category_id !== id));
            toast.success('Category deleted');
        } catch (err: any) {
            toast.error('Cannot delete category. It might be in use.');
        }
    };

    // ═══════════════════════════════════════════════
    // Subcategories CRUD
    // ═══════════════════════════════════════════════
    const addSubcategory = async (sub: { category_id: string; name: string }) => {
        if (!businessId) return null;
        try {
            const { data, error } = await supabase
                .from('expense_subcategories')
                .insert([{ ...sub, business_id: businessId }])
                .select()
                .single();
            if (error) throw error;
            setSubcategories(prev => [...prev, data]);
            toast.success('Subcategory added');
            return data;
        } catch (err: any) {
            toast.error(err.message);
            return null;
        }
    };

    const updateSubcategory = async (id: string, updates: Partial<ExpenseSubcategory>) => {
        try {
            const { error } = await supabase
                .from('expense_subcategories')
                .update(updates)
                .eq('id', id);
            if (error) throw error;
            setSubcategories(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
            toast.success('Subcategory updated');
        } catch (err: any) {
            toast.error(err.message);
        }
    };

    const deleteSubcategory = async (id: string) => {
        try {
            const { error } = await supabase.from('expense_subcategories').delete().eq('id', id);
            if (error) throw error;
            setSubcategories(prev => prev.filter(s => s.id !== id));
            toast.success('Subcategory deleted');
        } catch (err: any) {
            toast.error('Cannot delete subcategory. It might be in use.');
        }
    };

    // ═══════════════════════════════════════════════
    // Expenses CRUD
    // ═══════════════════════════════════════════════
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
                .select(`*, category:expense_categories (*), subcategory:expense_subcategories (*)`)
                .single();

            if (error) throw error;
            setExpenses(prev => [data, ...prev]);
            toast.success('Expense recorded');
            return data;
        } catch (err: any) {
            // Fallback insert without subcategory join
            try {
                const { data: data2, error: error2 } = await supabase
                    .from('expenses')
                    .insert([{
                        ...exp,
                        business_id: businessId,
                        category: categoryTextFallback
                    }])
                    .select(`*, category:expense_categories (*)`)
                    .single();
                if (error2) throw error2;
                setExpenses(prev => [data2, ...prev]);
                toast.success('Expense recorded');
                return data2;
            } catch (err2: any) {
                toast.error(err2.message);
                return null;
            }
        }
    };

    const updateExpense = async (id: string, updates: Partial<ExtendedExpense>) => {
        try {
            const { error } = await supabase
                .from('expenses')
                .update(updates)
                .eq('id', id);
            if (error) throw error;
            setExpenses(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
            toast.success('Expense updated');
        } catch (err: any) {
            toast.error(err.message);
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

    // ═══════════════════════════════════════════════
    // Recurring Expenses CRUD
    // ═══════════════════════════════════════════════
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
        subcategories,
        expenses,
        recurringExpenses,
        profitSummary,
        monthlyTrends,
        isLoading,
        addCategory,
        updateCategory,
        deleteCategory,
        addSubcategory,
        updateSubcategory,
        deleteSubcategory,
        addExpense,
        updateExpense,
        deleteExpense,
        addRecurringExpense,
        updateRecurringExpense,
        deleteRecurringExpense,
        refresh: loadData
    };
}
