// ============================================================
// BACKEND API HANDLERS FOR ADVANCED BILLING SYSTEM
// ============================================================
// Location: src/lib/api/advancedBillingApi.ts

import { supabase } from '@/integrations/supabase/client';

/**
 * Handles offline sync operations when connection is restored
 */
export const offlineSyncApi = {
  /**
   * Process pending offline bill creation
   */
  async processPendingBill(billData: any) {
    try {
      // Validate bill data on server
      const { data, error } = await supabase.rpc('create_draft_bill', {
        _business_id: billData.business_id,
        _bill_number: billData.bill_number,
        _customer_id: billData.customer_id || null,
        _salesman_name: billData.salesman_name,
        _subtotal: billData.subtotal,
        _discount_type: billData.discount_type,
        _discount_value: billData.discount_value,
        _discount_amount: billData.discount_amount,
        _tax_amount: billData.tax_amount,
        _total_amount: billData.total_amount,
        _items: billData.items,
      });

      if (error) throw error;
      return { success: true, data };
    } catch (error: any) {
      throw new Error(`Failed to sync bill: ${error.message}`);
    }
  },

  /**
   * Process pending offline expense creation
   */
  async processPendingExpense(expenseData: any) {
    try {
      const { data, error } = await supabase
        .from('expenses')
        .insert([
          {
            business_id: expenseData.business_id,
            category: expenseData.category,
            amount: expenseData.amount,
            description: expenseData.description,
            expense_date: expenseData.expense_date,
            receipt_url: expenseData.receipt_url,
          },
        ])
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error: any) {
      throw new Error(`Failed to sync expense: ${error.message}`);
    }
  },

  /**
   * Process pending offline customer creation
   */
  async processPendingCustomer(customerData: any) {
    try {
      const { data, error } = await supabase
        .from('customers')
        .insert([
          {
            business_id: customerData.business_id,
            name: customerData.name,
            email: customerData.email,
            phone: customerData.phone,
            address: customerData.address,
            notes: customerData.notes,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      // Initialize credit limit for customer
      if (customerData.enable_credit) {
        const creditLimit = customerData.default_credit_limit || 10000;
        const { error: creditError } = await supabase
          .from('customer_credit_limits')
          .insert([
            {
              customer_id: data.id,
              business_id: customerData.business_id,
              credit_limit: creditLimit,
              current_balance: 0,
            },
          ]);

        if (creditError) console.warn('Failed to initialize credit limit:', creditError);
      }

      return { success: true, data };
    } catch (error: any) {
      throw new Error(`Failed to sync customer: ${error.message}`);
    }
  },
};

/**
 * Split Payment Management
 */
export const splitPaymentApi = {
  /**
   * Get available payment modes for a business
   */
  async getPaymentModesConfig(businessId: string) {
    try {
      const { data, error } = await supabase
        .from('payment_modes_config')
        .select('*')
        .eq('business_id', businessId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      // Return default config if not found
      return data || {
        is_cash_enabled: true,
        is_upi_enabled: true,
        is_card_enabled: false,
        is_credit_enabled: false,
        enable_split_payment: false,
      };
    } catch (error: any) {
      throw new Error(`Failed to fetch payment modes: ${error.message}`);
    }
  },

  /**
   * Get payment history for a bill
   */
  async getBillPayments(billId: string) {
    try {
      const { data, error } = await supabase
        .from('bill_payments')
        .select('*')
        .eq('bill_id', billId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error: any) {
      throw new Error(`Failed to fetch bill payments: ${error.message}`);
    }
  },
};

/**
 * Customer Credit System Management
 */
export const customerCreditApi = {
  /**
   * Get customer credit limit and balance
   */
  async getCustomerCreditInfo(customerId: string, businessId: string) {
    try {
      const { data, error } = await supabase
        .from('customer_credit_limits')
        .select('*')
        .eq('customer_id', customerId)
        .eq('business_id', businessId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      return data || { credit_limit: 0, current_balance: 0 };
    } catch (error: any) {
      throw new Error(`Failed to fetch credit info: ${error.message}`);
    }
  },

  /**
   * Update customer credit limit
   */
  async updateCreditLimit(
    customerId: string,
    businessId: string,
    newLimit: number
  ) {
    try {
      const { data, error } = await supabase
        .from('customer_credit_limits')
        .update({ credit_limit: newLimit })
        .eq('customer_id', customerId)
        .eq('business_id', businessId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error: any) {
      throw new Error(`Failed to update credit limit: ${error.message}`);
    }
  },

  /**
   * Record credit payment (reduces balance)
   */
  async recordCreditPayment(
    customerId: string,
    businessId: string,
    amount: number,
    description?: string
  ) {
    try {
      const { data: creditData, error: creditError } = await supabase
        .from('customer_credit_limits')
        .select('current_balance')
        .eq('customer_id', customerId)
        .eq('business_id', businessId)
        .single();

      if (creditError) throw creditError;

      const previousBalance = creditData.current_balance;
      const newBalance = Math.max(0, previousBalance - amount);

      // Update balance
      const { error: updateError } = await supabase
        .from('customer_credit_limits')
        .update({ current_balance: newBalance })
        .eq('customer_id', customerId)
        .eq('business_id', businessId);

      if (updateError) throw updateError;

      // Log in ledger
      const { error: ledgerError } = await supabase
        .from('customer_credit_ledger')
        .insert([
          {
            business_id: businessId,
            customer_id: customerId,
            transaction_type: 'payment',
            amount,
            previous_balance: previousBalance,
            new_balance: newBalance,
            description,
          },
        ]);

      if (ledgerError) throw ledgerError;

      return { success: true, newBalance };
    } catch (error: any) {
      throw new Error(`Failed to record credit payment: ${error.message}`);
    }
  },

  /**
   * Get customer credit ledger
   */
  async getCreditLedger(customerId: string, businessId: string, limit: number = 100) {
    try {
      const { data, error } = await supabase
        .from('customer_credit_ledger')
        .select('*')
        .eq('customer_id', customerId)
        .eq('business_id', businessId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error: any) {
      throw new Error(`Failed to fetch credit ledger: ${error.message}`);
    }
  },
};

/**
 * Expense Tracking & Profit Analysis
 */
export const expenseApi = {
  /**
   * Get expenses for a date range
   */
  async getExpenses(
    businessId: string,
    startDate: string,
    endDate: string,
    category?: string
  ) {
    try {
      let query = supabase
        .from('expenses')
        .select('*')
        .eq('business_id', businessId)
        .gte('expense_date', startDate)
        .lte('expense_date', endDate);

      if (category) {
        query = query.eq('category', category);
      }

      const { data, error } = await query.order('expense_date', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error: any) {
      throw new Error(`Failed to fetch expenses: ${error.message}`);
    }
  },

  /**
   * Get expenses by category
   */
  async getExpensesByCategory(businessId: string, startDate: string, endDate: string) {
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select('category', { count: 'exact' })
        .eq('business_id', businessId)
        .gte('expense_date', startDate)
        .lte('expense_date', endDate);

      if (error) throw error;

      // Group by category and sum
      const grouped: Record<string, number> = {};
      for (const category of [
        'rent',
        'salary',
        'electricity',
        'transport',
        'maintenance',
        'internet',
        'miscellaneous',
      ]) {
        const categoryExpenses = await supabase
          .from('expenses')
          .select('amount')
          .eq('business_id', businessId)
          .eq('category', category)
          .gte('expense_date', startDate)
          .lte('expense_date', endDate);

        grouped[category] =
          categoryExpenses.data?.reduce((sum, e) => sum + e.amount, 0) || 0;
      }

      return grouped;
    } catch (error: any) {
      throw new Error(`Failed to group expenses: ${error.message}`);
    }
  },
};

/**
 * Activity Logging
 */
export const activityLoggingApi = {
  /**
   * Get recent activity logs
   */
  async getActivityLogs(businessId: string, limit: number = 100, offset: number = 0) {
    try {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;
      return data || [];
    } catch (error: any) {
      throw new Error(`Failed to fetch activity logs: ${error.message}`);
    }
  },

  /**
   * Filter activity logs by action
   */
  async filterActivityLogsByAction(businessId: string, action: string, limit: number = 100) {
    try {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('business_id', businessId)
        .eq('action', action)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error: any) {
      throw new Error(`Failed to filter activity logs: ${error.message}`);
    }
  },

  /**
   * Export activity logs as CSV
   */
  async exportActivityLogsAsCSV(businessId: string) {
    try {
      const logs = await this.getActivityLogs(businessId, 10000, 0);

      const csv = [
        ['Timestamp', 'User', 'Action', 'Target Type', 'Description'].join(','),
        ...logs.map((log) =>
          [
            new Date(log.created_at).toLocaleString(),
            log.user_id || 'System',
            log.action,
            log.target_type,
            log.description || '',
          ]
            .map((field) => `"${field}"`)
            .join(',')
        ),
      ].join('\n');

      return csv;
    } catch (error: any) {
      throw new Error(`Failed to export activity logs: ${error.message}`);
    }
  },
};

/**
 * Subscription Validation
 */
export const subscriptionApi = {
  /**
   * Check if subscription is active and can perform operations
   */
  async checkSubscriptionStatus(businessId: string) {
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('status, trial_end, current_period_end')
        .eq('business_id', businessId)
        .single();

      if (error) throw error;

      const now = new Date();
      let isActive = false;

      if (data.status === 'active' && data.current_period_end) {
        isActive = new Date(data.current_period_end) > now;
      } else if (data.status === 'trialing' && data.trial_end) {
        isActive = new Date(data.trial_end) > now;
      }

      return {
        isActive,
        status: data.status,
        expiresAt: data.current_period_end || data.trial_end,
      };
    } catch (error: any) {
      throw new Error(`Failed to check subscription: ${error.message}`);
    }
  },

  /**
   * Check if specific features are enabled based on subscription
   */
  async checkFeatureAccess(businessId: string, feature: string) {
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('plan_id, status')
        .eq('business_id', businessId)
        .single();

      if (error) throw error;

      // Free tier vs paid features logic
      const lockedFeatures = [];
      if (data.status === 'expired') {
        lockedFeatures.push('export', 'analytics');
      }

      return { isEnabled: !lockedFeatures.includes(feature) };
    } catch (error: any) {
      throw new Error(`Failed to check feature access: ${error.message}`);
    }
  },
};
