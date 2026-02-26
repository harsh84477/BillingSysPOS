// ============================================================
// CUSTOM HOOKS FOR BILLING SYSTEM
// ============================================================
// Location: src/hooks/useBillingSystem.ts

import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// ========== SPLIT PAYMENT HOOK ==========

export function useSplitPayment(billId: string | null) {
  const [payments, setPayments] = useState<any[]>([]);
  const [totalPaid, setTotalPaid] = useState(0);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch existing payments
  const { data: existingPayments } = useQuery({
    queryKey: ['bill-payments', billId],
    queryFn: async () => {
      if (!billId) return [];
      const { data, error } = await (supabase
        .from('bill_payments' as any)
        .select('*')
        .eq('bill_id', billId) as any);

      if (error) throw error;
      return data || [];
    },
    enabled: !!billId,
  });

  // Add payment mutation
  const addPaymentMutation = useMutation({
    mutationFn: async (paymentData: {
      payment_mode: 'cash' | 'upi' | 'card' | 'credit';
      amount: number;
      transaction_reference?: string;
      notes?: string;
    }) => {
      if (!billId) throw new Error('Bill ID is required');

      const { data, error } = await (supabase.rpc as any)('add_bill_payment', {
        _bill_id: billId,
        _payment_mode: paymentData.payment_mode,
        _amount: paymentData.amount,
        _transaction_reference: paymentData.transaction_reference,
        _notes: paymentData.notes,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast({
        title: 'Payment Added',
        description: `Payment of ${data.paid_total} recorded. Remaining: ${data.remaining}`,
      });
      queryClient.invalidateQueries({ queryKey: ['bill-payments', billId] });
      queryClient.invalidateQueries({ queryKey: ['bills'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Payment Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Calculate totals
  useEffect(() => {
    if (existingPayments) {
      const total = existingPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
      setTotalPaid(total);
      setPayments(existingPayments);
    }
  }, [existingPayments]);

  return {
    payments,
    totalPaid,
    addPayment: addPaymentMutation.mutate,
    isLoading: addPaymentMutation.isPending,
  };
}

// ========== CUSTOMER CREDIT HOOK ==========

export function useCustomerCredit(customerId: string | null, businessId: string | null) {
  const [creditStatus, setCreditStatus] = useState<any>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch credit status
  const { data: status, isLoading } = useQuery({
    queryKey: ['customer-credit', customerId, businessId],
    queryFn: async () => {
      if (!customerId || !businessId) return null;

      const { data, error } = await (supabase.rpc as any)(
        'get_customer_credit_status',
        {
          _customer_id: customerId,
          _business_id: businessId,
        }
      );

      if (error) throw error;
      return data;
    },
    enabled: !!customerId && !!businessId,
  });

  // Create credit sale bill mutation
  const createCreditSaleMutation = useMutation({
    mutationFn: async (billData: {
      bill_number: string;
      items: any[];
      total_amount: number;
      subtotal: number;
      discount_amount?: number;
      tax_amount?: number;
    }) => {
      if (!customerId || !businessId) throw new Error('Customer and business IDs required');

      const { data, error } = await (supabase.rpc as any)('create_credit_sale_bill', {
        _business_id: businessId,
        _bill_number: billData.bill_number,
        _customer_id: customerId,
        _items: billData.items,
        _total_amount: billData.total_amount,
        _subtotal: billData.subtotal,
        _discount_amount: billData.discount_amount || 0,
        _tax_amount: billData.tax_amount || 0,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast({
        title: 'Credit Bill Created',
        description: `Bill ${data.bill_id} created successfully`,
      });
      queryClient.invalidateQueries({ queryKey: ['customer-credit'] });
      queryClient.invalidateQueries({ queryKey: ['bills'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Credit Sale Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  useEffect(() => {
    if (status) {
      setCreditStatus(status);

      // Show warning if credit is above threshold
      if (status.is_warning) {
        toast({
          title: 'Credit Limit Warning',
          description: `Customer credit usage at ${Math.round((status.current_balance / status.credit_limit) * 100)}%`,
          variant: 'destructive',
        });
      }
    }
  }, [status, toast]);

  return {
    creditStatus,
    isLoading,
    createCreditSale: createCreditSaleMutation.mutate,
    isCreating: createCreditSaleMutation.isPending,
  };
}

export function useExpenseTracking(businessId: string | null) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch profit summary
  const { data: profitSummary, isLoading: isSummaryLoading } = useQuery({
    queryKey: ['profit-summary', businessId],
    queryFn: async () => {
      if (!businessId) return null;

      const { data, error } = await (supabase.rpc as any)(
        'calculate_profit_summary',
        {
          _business_id: businessId,
        }
      );

      if (error) throw error;
      return data;
    },
    enabled: !!businessId,
  });

  // Fetch all expenses
  const { data: expenses, isLoading: isExpensesLoading } = useQuery({
    queryKey: ['expenses', businessId],
    queryFn: async () => {
      if (!businessId) return [];
      const { data, error } = await (supabase
        .from('expenses' as any)
        .select('*')
        .eq('business_id', businessId)
        .order('expense_date', { ascending: false })
        .order('created_at', { ascending: false }) as any);

      if (error) throw error;
      return data || [];
    },
    enabled: !!businessId,
  });

  // Create expense mutation
  const createExpenseMutation = useMutation({
    mutationFn: async (expenseData: {
      category: string;
      amount: number;
      description: string;
      expense_date: string;
      receipt_url?: string;
    }) => {
      if (!businessId) throw new Error('Business ID required');

      const { data, error } = await (supabase
        .from('expenses' as any)
        .insert([
          {
            business_id: businessId,
            ...expenseData,
          },
        ])
        .select()
        .single() as any);

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: 'Expense Recorded',
        description: 'Expense has been added successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['profit-summary', businessId] });
      queryClient.invalidateQueries({ queryKey: ['expenses', businessId] });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to Record Expense',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Delete expense mutation
  const deleteExpenseMutation = useMutation({
    mutationFn: async (expenseId: string) => {
      const { error } = await (supabase
        .from('expenses' as any)
        .delete()
        .eq('id', expenseId) as any);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: 'Expense Deleted',
        description: 'Expense has been removed successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['profit-summary', businessId] });
      queryClient.invalidateQueries({ queryKey: ['expenses', businessId] });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to Delete Expense',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    profitSummary,
    isSummaryLoading,
    createExpense: createExpenseMutation.mutate,
    isCreating: createExpenseMutation.isPending,
    deleteExpense: deleteExpenseMutation.mutate,
    isDeleting: deleteExpenseMutation.isPending,
    expenses,
    isExpensesLoading,
  };
}

// ========== ACTIVITY LOGGING HOOK ==========

export function useActivityLogs(businessId: string | null) {
  // Fetch activity logs (only visible to Owner/Manager)
  const { data: logs, isLoading } = useQuery({
    queryKey: ['activity-logs', businessId],
    queryFn: async () => {
      if (!businessId) return [];

      const { data, error } = await (supabase
        .from('activity_logs' as any)
        .select('*')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false })
        .limit(500) as any);

      if (error) throw error;
      return data || [];
    },
    enabled: !!businessId,
  });

  // Export logs
  const exportLogs = useCallback(async () => {
    if (!logs) return;

    const csv = [
      ['Timestamp', 'User', 'Action', 'Target Type', 'Description'].join(','),
      ...logs.map((log) =>
        [
          new Date(log.created_at).toLocaleString(),
          log.user_id || 'System',
          log.action,
          log.target_type,
          log.description || '',
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `activity-logs-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [logs]);

  return {
    logs,
    isLoading,
    exportLogs,
  };
}

// ========== OFFLINE SYNC HOOK ==========

export function useOfflineSync(businessId: string | null, userId: string | null) {
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'error'>('idle');
  const [pendingCount, setPendingCount] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    if (!businessId || !userId) return;

    import('@/lib/offlineSync').then(({ offlineSyncManager }) => {
      offlineSyncManager.initialize(businessId, userId);

      // Listen for online/offline changes
      const handleOnline = () => {
        setSyncStatus('syncing');
        offlineSyncManager.syncPendingOperations().then(() => {
          setSyncStatus('synced');
          toast({
            title: 'Sync Complete',
            description: 'All offline changes have been synced',
          });
        });
      };

      window.addEventListener('online', handleOnline);
      return () => {
        window.removeEventListener('online', handleOnline);
        offlineSyncManager.destroy();
      };
    });
  }, [businessId, userId, toast]);

  const getPendingCount = useCallback(async () => {
    const { offlineSyncManager } = await import('@/lib/offlineSync');
    const stats = await offlineSyncManager.getStorageStats();
    // Count pending operations
    const queue = await (offlineSyncManager as any).db?.getAllFromIndex('sync_queue', 'status', 'pending');
    setPendingCount(queue?.length || 0);
  }, []);

  return {
    syncStatus,
    pendingCount,
    getPendingCount,
  };
}

// ========== SUBSCRIPTION VALIDATION HOOK ==========

export function useSubscriptionStatus(businessId: string | null) {
  const { data: subscription, isLoading } = useQuery({
    queryKey: ['subscription-status', businessId],
    queryFn: async () => {
      if (!businessId) return null;

      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('business_id', businessId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!businessId,
  });

  const isActive = useCallback(() => {
    if (!subscription) return false;
    if (subscription.status === 'active') return true;
    if (subscription.status === 'trialing' && subscription.trial_end) {
      return new Date(subscription.trial_end) > new Date();
    }
    return false;
  }, [subscription]);

  const isExpired = useCallback(() => {
    return !isActive();
  }, [isActive]);

  const daysUntilExpiration = useCallback(() => {
    if (!subscription) return 0;

    let expiryDate: Date | null = null;
    if (subscription.status === 'trialing' && subscription.trial_end) {
      expiryDate = new Date(subscription.trial_end);
    } else if (subscription.current_period_end) {
      expiryDate = new Date(subscription.current_period_end);
    }

    if (!expiryDate) return 0;

    const today = new Date();
    const diff = expiryDate.getTime() - today.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }, [subscription]);

  return {
    subscription,
    isLoading,
    isActive: isActive(),
    isExpired: isExpired(),
    daysUntilExpiration: daysUntilExpiration(),
  };
}
