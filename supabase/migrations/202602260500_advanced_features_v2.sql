-- ============================================================
-- ADVANCED POS SYSTEM: Enhanced Billing, Credit, Expenses, Logging
-- ============================================================
-- Date: 2026-02-26
-- Version: 2.0
-- Objective: Add split payments, customer credit, expenses, activity logging, offline sync

-- ============================================================
-- 01. TYPES & ENUMS
-- ============================================================

-- Payment modes enum
CREATE TYPE public.payment_mode AS ENUM ('cash', 'upi', 'card', 'credit');

-- Expense categories enum
CREATE TYPE public.expense_category AS ENUM (
  'Rent', 
  'Electricity bill', 
  'Salary', 
  'Other exp',
  'transport', 
  'maintenance', 
  'internet', 
  'miscellaneous'
);

-- Activity action types
CREATE TYPE public.activity_action AS ENUM (
  'create_bill',
  'update_bill',
  'finalize_bill',
  'cancel_bill',
  'create_product',
  'update_product',
  'delete_product',
  'adjust_stock',
  'create_customer',
  'update_customer',
  'create_expense',
  'update_expense',
  'delete_expense',
  'credit_transaction',
  'sync_offline_data'
);

-- Sync status
CREATE TYPE public.offline_sync_status AS ENUM ('pending', 'syncing', 'synced', 'failed', 'conflict');

-- ============================================================
-- 02. TABLES - PAYMENT & SPLIT PAYMENT SYSTEM
-- ============================================================

-- Payment Modes Configuration (per business)
CREATE TABLE IF NOT EXISTS public.payment_modes_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE UNIQUE,
  is_cash_enabled BOOLEAN DEFAULT true,
  is_upi_enabled BOOLEAN DEFAULT true,
  is_card_enabled BOOLEAN DEFAULT false,
  is_credit_enabled BOOLEAN DEFAULT false,
  enable_split_payment BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Payment Records (for split payments and multi-mode tracking)
CREATE TABLE IF NOT EXISTS public.bill_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id UUID NOT NULL REFERENCES public.bills(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  payment_mode public.payment_mode NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  collected_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_offline BOOLEAN DEFAULT false,
  transaction_reference TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT bill_payments_amount_positive CHECK (amount > 0)
);

-- ============================================================
-- 02B. TABLES - CUSTOMER CREDIT SYSTEM
-- ============================================================

CREATE TABLE IF NOT EXISTS public.customer_credit_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE UNIQUE,
  enable_credit BOOLEAN DEFAULT true,
  enable_credit_limit BOOLEAN DEFAULT true,
  default_credit_limit NUMERIC(12,2) DEFAULT 10000,
  enable_credit_warning BOOLEAN DEFAULT true,
  credit_warning_percent NUMERIC(5,2) DEFAULT 80,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Customer Credit Limit (per customer per business)
CREATE TABLE IF NOT EXISTS public.customer_credit_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  credit_limit NUMERIC(12,2) NOT NULL DEFAULT 10000,
  current_balance NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT customer_credit_limits_unique UNIQUE(customer_id, business_id),
  CONSTRAINT credit_limit_positive CHECK (credit_limit >= 0)
);

-- Customer Credit Ledger (audit trail)
CREATE TABLE IF NOT EXISTS public.customer_credit_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  bill_id UUID REFERENCES public.bills(id) ON DELETE SET NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('debit', 'credit', 'payment', 'adjustment')),
  amount NUMERIC(12,2) NOT NULL,
  previous_balance NUMERIC(12,2) NOT NULL,
  new_balance NUMERIC(12,2) NOT NULL,
  description TEXT,
  reference_number TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT credit_ledger_amount_positive CHECK (amount > 0)
);

-- ============================================================
-- 02C. TABLES - EXPENSE TRACKING SYSTEM
-- ============================================================

CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  category public.expense_category NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  description TEXT,
  receipt_url TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT expenses_amount_positive CHECK (amount > 0)
);

-- ============================================================
-- 02D. TABLES - ACTIVITY LOGGING SYSTEM
-- ============================================================

CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action public.activity_action NOT NULL,
  target_type TEXT NOT NULL, -- 'bill', 'product', 'customer', 'expense', etc
  target_id UUID NOT NULL,
  old_value JSONB,
  new_value JSONB,
  description TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 02E. TABLES - OFFLINE SYNC SYSTEM
-- ============================================================

-- Offline queue for syncing when connection restored
CREATE TABLE IF NOT EXISTS public.offline_sync_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  operation_type TEXT NOT NULL, -- 'create_bill', 'update_bill', 'create_product', etc
  table_name TEXT NOT NULL,
  record_id UUID,
  data JSONB NOT NULL,
  status public.offline_sync_status DEFAULT 'pending',
  attempted_at TIMESTAMPTZ,
  synced_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Offline data cache (for optimistic UI updates)
CREATE TABLE IF NOT EXISTS public.offline_data_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  cache_type TEXT NOT NULL, -- 'products', 'customers', 'bills', 'categories'
  cache_data JSONB NOT NULL,
  last_synced TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Conflict resolution tracking
CREATE TABLE IF NOT EXISTS public.sync_conflicts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  queue_id UUID REFERENCES public.offline_sync_queue(id) ON DELETE CASCADE,
  conflict_type TEXT NOT NULL, -- 'stock_mismatch', 'duplicate_bill', 'customer_update_conflict'
  offline_data JSONB NOT NULL,
  server_data JSONB NOT NULL,
  resolution TEXT, -- 'keep_offline', 'use_server', 'manual_merge'
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 03. ENHANCED BUSINESS SETTINGS
-- ============================================================

ALTER TABLE public.business_settings ADD COLUMN IF NOT EXISTS enable_draft_stock_reservation BOOLEAN DEFAULT true;
ALTER TABLE public.business_settings ADD COLUMN IF NOT EXISTS enable_split_payment BOOLEAN DEFAULT false;
ALTER TABLE public.business_settings ADD COLUMN IF NOT EXISTS enable_customer_credit BOOLEAN DEFAULT true;
ALTER TABLE public.business_settings ADD COLUMN IF NOT EXISTS enable_offline_mode BOOLEAN DEFAULT true;
ALTER TABLE public.business_settings ADD COLUMN IF NOT EXISTS offline_sync_interval INTEGER DEFAULT 300; -- seconds
ALTER TABLE public.business_settings ADD COLUMN IF NOT EXISTS require_manager_override_credit BOOLEAN DEFAULT true;

-- ============================================================
-- 04. INDEXES FOR PERFORMANCE
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_bill_payments_bill_id ON public.bill_payments(bill_id);
CREATE INDEX IF NOT EXISTS idx_bill_payments_business_id ON public.bill_payments(business_id);
CREATE INDEX IF NOT EXISTS idx_bill_payments_created_at ON public.bill_payments(created_at);

CREATE INDEX IF NOT EXISTS idx_customer_credit_limits_customer_id ON public.customer_credit_limits(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_credit_limits_business_id ON public.customer_credit_limits(business_id);

CREATE INDEX IF NOT EXISTS idx_customer_credit_ledger_customer_id ON public.customer_credit_ledger(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_credit_ledger_business_id ON public.customer_credit_ledger(business_id);
CREATE INDEX IF NOT EXISTS idx_customer_credit_ledger_created_at ON public.customer_credit_ledger(created_at);

CREATE INDEX IF NOT EXISTS idx_expenses_business_id ON public.expenses(business_id);
CREATE INDEX IF NOT EXISTS idx_expenses_expense_date ON public.expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON public.expenses(category);

CREATE INDEX IF NOT EXISTS idx_activity_logs_business_id ON public.activity_logs(business_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON public.activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON public.activity_logs(action);
CREATE INDEX IF NOT EXISTS idx_activity_logs_target_type ON public.activity_logs(target_type);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON public.activity_logs(created_at);

CREATE INDEX IF NOT EXISTS idx_offline_sync_queue_business_id ON public.offline_sync_queue(business_id);
CREATE INDEX IF NOT EXISTS idx_offline_sync_queue_status ON public.offline_sync_queue(status);
CREATE INDEX IF NOT EXISTS idx_offline_sync_queue_created_at ON public.offline_sync_queue(created_at);

CREATE INDEX IF NOT EXISTS idx_offline_data_cache_business_id ON public.offline_data_cache(business_id);
CREATE INDEX IF NOT EXISTS idx_offline_data_cache_cache_type ON public.offline_data_cache(cache_type);

CREATE INDEX IF NOT EXISTS idx_sync_conflicts_business_id ON public.sync_conflicts(business_id);
CREATE INDEX IF NOT EXISTS idx_sync_conflicts_conflict_type ON public.sync_conflicts(conflict_type);

-- ============================================================
-- 05. CORE FUNCTIONS FOR SPLIT PAYMENT
-- ============================================================

CREATE OR REPLACE FUNCTION public.add_bill_payment(
  _bill_id UUID,
  _payment_mode public.payment_mode,
  _amount NUMERIC,
  _transaction_reference TEXT DEFAULT NULL,
  _notes TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _bill RECORD;
  _paid_total NUMERIC;
  _remaining NUMERIC;
  _business_id UUID;
BEGIN
  -- Get bill and lock for update
  SELECT * INTO _bill FROM public.bills WHERE id = _bill_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Bill not found');
  END IF;

  _business_id := _bill.business_id;

  -- Verify payment mode is enabled
  IF NOT EXISTS (
    SELECT 1 FROM public.payment_modes_config
    WHERE business_id = _business_id
    AND (
      (_payment_mode = 'cash' AND is_cash_enabled) OR
      (_payment_mode = 'upi' AND is_upi_enabled) OR
      (_payment_mode = 'card' AND is_card_enabled) OR
      (_payment_mode = 'credit' AND is_credit_enabled)
    )
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Payment mode not enabled');
  END IF;

  -- Calculate total paid so far
  SELECT COALESCE(SUM(amount), 0) INTO _paid_total
  FROM public.bill_payments WHERE bill_id = _bill_id;

  _remaining := _bill.total_amount - _paid_total;

  IF _amount > _remaining THEN
    RETURN json_build_object('success', false, 'error', 'Payment exceeds remaining amount', 'remaining', _remaining);
  END IF;

  -- Add payment record
  INSERT INTO public.bill_payments (bill_id, business_id, payment_mode, amount, collected_by, transaction_reference, notes)
  VALUES (_bill_id, _business_id, _payment_mode, _amount, auth.uid(), _transaction_reference, _notes);

  -- Update bill payment status
  IF _paid_total + _amount >= _bill.total_amount THEN
    UPDATE public.bills
    SET payment_status = 'paid', paid_amount = _bill.total_amount, due_amount = 0
    WHERE id = _bill_id;
  ELSE
    UPDATE public.bills
    SET payment_status = 'partial', paid_amount = _paid_total + _amount, due_amount = _remaining - _amount
    WHERE id = _bill_id;
  END IF;

  RETURN json_build_object('success', true, 'paid_total', _paid_total + _amount, 'remaining', _remaining - _amount);
END;
$$;

-- ============================================================
-- 06. CORE FUNCTIONS FOR CUSTOMER CREDIT
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_customer_credit_status(_customer_id UUID, _business_id UUID)
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _limit RECORD;
  _settings RECORD;
  _warning_threshold NUMERIC;
BEGIN
  SELECT * INTO _limit FROM public.customer_credit_limits
  WHERE customer_id = _customer_id AND business_id = _business_id;

  SELECT * INTO _settings FROM public.customer_credit_settings
  WHERE business_id = _business_id;

  IF NOT FOUND THEN
    -- Return defaults if not initialized
    RETURN json_build_object(
      'credit_limit', COALESCE(_settings.default_credit_limit, 0),
      'current_balance', 0,
      'available_credit', COALESCE(_settings.default_credit_limit, 0),
      'is_warning', false,
      'warning_threshold', COALESCE(_settings.credit_warning_percent, 80)
    );
  END IF;

  _warning_threshold := (_limit.credit_limit * COALESCE(_settings.credit_warning_percent, 80)) / 100;

  RETURN json_build_object(
    'credit_limit', _limit.credit_limit,
    'current_balance', _limit.current_balance,
    'available_credit', _limit.credit_limit - _limit.current_balance,
    'is_warning', _limit.current_balance >= _warning_threshold,
    'warning_threshold', _warning_threshold
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.create_credit_sale_bill(
  _business_id UUID,
  _bill_number TEXT,
  _customer_id UUID,
  _items JSONB,
  _total_amount NUMERIC,
  _subtotal NUMERIC,
  _discount_amount NUMERIC DEFAULT 0,
  _tax_amount NUMERIC DEFAULT 0
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _bill_id UUID;
  _credit_status JSON;
  _available_credit NUMERIC;
  _item JSONB;
  _product RECORD;
BEGIN
  -- Get credit status
  SELECT (jsonb_build_object('sufficient_credit', available_credit >= _total_amount))
  FROM json_to_record(public.get_customer_credit_status(_customer_id, _business_id))
  AS x(credit_limit numeric, current_balance numeric, available_credit numeric, is_warning boolean, warning_threshold numeric);

  -- This is normally a reference, get the availability
  _available_credit := (public.get_customer_credit_status(_customer_id, _business_id)->>'available_credit')::NUMERIC;

  IF _available_credit < _total_amount THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Insufficient credit limit',
      'credit_limit', (public.get_customer_credit_status(_customer_id, _business_id)->>'credit_limit')::NUMERIC,
      'current_balance', (public.get_customer_credit_status(_customer_id, _business_id)->>'current_balance')::NUMERIC,
      'available_credit', _available_credit
    );
  END IF;

  -- Create bill with credit payment mode
  INSERT INTO public.bills (
    business_id, bill_number, customer_id, created_by, status,
    subtotal, discount_amount, tax_amount, total_amount,
    payment_status, payment_type, due_amount, profit
  )
  VALUES (
    _business_id, _bill_number, _customer_id, auth.uid(), 'completed',
    _subtotal, _discount_amount, _tax_amount, _total_amount,
    'paid', 'credit', 0, 0
  )
  RETURNING id INTO _bill_id;

  -- Add bill items
  FOR _item IN SELECT * FROM jsonb_array_elements(_items)
  LOOP
    INSERT INTO public.bill_items (
      bill_id, product_id, product_name, quantity, unit_price, cost_price, total_price
    )
    VALUES (
      _bill_id, (_item->>'product_id')::UUID, _item->>'product_name',
      (_item->>'quantity')::INTEGER, (_item->>'unit_price')::NUMERIC,
      (_item->>'cost_price')::NUMERIC, (_item->>'total_price')::NUMERIC
    );
    
    -- Deduct stock
    UPDATE public.products
    SET stock_quantity = stock_quantity - (_item->>'quantity')::INTEGER,
        reserved_quantity = GREATEST(0, reserved_quantity - (_item->>'quantity')::INTEGER)
    WHERE id = (_item->>'product_id')::UUID;
  END LOOP;

  -- Add to credit ledger
  INSERT INTO public.customer_credit_ledger (
    business_id, customer_id, bill_id, transaction_type,
    amount, previous_balance, new_balance, description, created_by
  )
  SELECT
    _business_id, _customer_id, _bill_id, 'debit',
    _total_amount, current_balance, current_balance + _total_amount,
    'Sale bill #' || _bill_number, auth.uid()
  FROM public.customer_credit_limits
  WHERE customer_id = _customer_id AND business_id = _business_id;

  -- Update credit balance
  UPDATE public.customer_credit_limits
  SET current_balance = current_balance + _total_amount
  WHERE customer_id = _customer_id AND business_id = _business_id;

  -- Log activity
  INSERT INTO public.activity_logs (business_id, user_id, action, target_type, target_id, description)
  VALUES (_business_id, auth.uid(), 'create_bill'::public.activity_action, 'bill', _bill_id, 'Credit sale bill created');

  RETURN json_build_object('success', true, 'bill_id', _bill_id);
END;
$$;

-- ============================================================
-- 07. CORE FUNCTIONS FOR EXPENSES
-- ============================================================


CREATE OR REPLACE FUNCTION public.calculate_profit_summary(_business_id UUID, _start_date DATE DEFAULT NULL, _end_date DATE DEFAULT NULL)
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _sales NUMERIC;
  _purchase_cost NUMERIC;
  _expenses NUMERIC;
  _profit NUMERIC;
BEGIN
  -- Default to current month
  _start_date := COALESCE(_start_date, date_trunc('month', CURRENT_DATE)::DATE);
  _end_date := COALESCE(_end_date, CURRENT_DATE);

  -- Sales
  SELECT COALESCE(SUM(total_amount), 0) INTO _sales
  FROM public.bills
  WHERE business_id = _business_id
  AND status = 'completed'
  AND created_at >= _start_date AND created_at <= _end_date + INTERVAL '1 day';

  -- Purchase cost
  SELECT COALESCE(SUM(bi.cost_price * bi.quantity), 0) INTO _purchase_cost
  FROM public.bill_items bi
  JOIN public.bills b ON b.id = bi.bill_id
  WHERE b.business_id = _business_id
  AND b.status = 'completed'
  AND b.created_at >= _start_date AND b.created_at <= _end_date + INTERVAL '1 day';

  -- Expenses
  SELECT COALESCE(SUM(amount), 0) INTO _expenses
  FROM public.expenses
  WHERE business_id = _business_id
  AND expense_date >= _start_date AND expense_date <= _end_date;

  _profit := _sales - _purchase_cost - _expenses;

  RETURN json_build_object(
    'sales', _sales,
    'purchase_cost', _purchase_cost,
    'expenses', _expenses,
    'net_profit', _profit,
    'period_start', _start_date,
    'period_end', _end_date
  );
END;
$$;

-- ============================================================
-- 08. CORE FUNCTIONS FOR ACTIVITY LOGGING
-- ============================================================

CREATE OR REPLACE FUNCTION public.log_activity(
  _business_id UUID,
  _action public.activity_action,
  _target_type TEXT,
  _target_id UUID,
  _old_value JSONB DEFAULT NULL,
  _new_value JSONB DEFAULT NULL,
  _description TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _log_id UUID;
BEGIN
  INSERT INTO public.activity_logs (
    business_id, user_id, action, target_type, target_id,
    old_value, new_value, description, ip_address
  )
  VALUES (
    _business_id, auth.uid(), _action, _target_type, _target_id,
    _old_value, _new_value, _description, 
    current_setting('app.client_ip')::TEXT
  )
  RETURNING id INTO _log_id;

  RETURN _log_id;
END;
$$;

-- ============================================================
-- 09. CORE FUNCTIONS FOR OFFLINE SYNC
-- ============================================================

CREATE OR REPLACE FUNCTION public.enqueue_offline_operation(
  _business_id UUID,
  _operation_type TEXT,
  _table_name TEXT,
  _record_id UUID,
  _data JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _queue_id UUID;
BEGIN
  INSERT INTO public.offline_sync_queue (
    business_id, user_id, operation_type, table_name, record_id, data, status
  )
  VALUES (
    _business_id, auth.uid(), _operation_type, _table_name, _record_id, _data, 'pending'
  )
  RETURNING id INTO _queue_id;

  RETURN _queue_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.process_offline_sync_queue(_business_id UUID)
RETURNS TABLE(success_count INTEGER, failed_count INTEGER, conflict_count INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _item RECORD;
  _success INTEGER := 0;
  _failed INTEGER := 0;
  _conflicts INTEGER := 0;
BEGIN
  FOR _item IN
    SELECT * FROM public.offline_sync_queue
    WHERE business_id = _business_id AND status = 'pending'
    ORDER BY created_at ASC
  LOOP
    BEGIN
      UPDATE public.offline_sync_queue SET status = 'syncing', attempted_at = now() WHERE id = _item.id;
      
      -- Process based on operation type (simplified - extend as needed)
      CASE _item.operation_type
        WHEN 'create_bill' THEN
          INSERT INTO public.bills (id, business_id, bill_number, status, created_at, updated_at)
          SELECT _item.record_id, _business_id, _item.data->>'bill_number', 'draft', now(), now()
          ON CONFLICT DO NOTHING;
        WHEN 'create_customer' THEN
          INSERT INTO public.customers (id, business_id, name, email, phone, created_at)
          SELECT _item.record_id, _business_id, _item.data->>'name', _item.data->>'email', _item.data->>'phone', now()
          ON CONFLICT DO NOTHING;
        -- Add more operation types as needed
      END CASE;

      UPDATE public.offline_sync_queue SET status = 'synced', synced_at = now() WHERE id = _item.id;
      _success := _success + 1;
      
    EXCEPTION WHEN OTHERS THEN
      UPDATE public.offline_sync_queue
      SET status = 'failed', error_message = SQLERRM
      WHERE id = _item.id;
      _failed := _failed + 1;
    END;
  END LOOP;

  RETURN QUERY SELECT _success, _failed, _conflicts;
END;
$$;

-- ============================================================
-- 10. DRAFT BILL & STOCK RESERVATION
-- ============================================================

CREATE OR REPLACE FUNCTION public.create_draft_bill(
  _business_id UUID,
  _bill_number TEXT,
  _customer_id UUID DEFAULT NULL,
  _salesman_name TEXT DEFAULT NULL,
  _subtotal NUMERIC DEFAULT 0,
  _discount_amount NUMERIC DEFAULT 0,
  _tax_amount NUMERIC DEFAULT 0,
  _total_amount NUMERIC DEFAULT 0,
  _items JSONB DEFAULT '[]'::JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _bill_id UUID;
  _item RECORD;
  _reservation_enabled BOOLEAN;
BEGIN
  -- Check if draft stock reservation is enabled
  SELECT enable_draft_stock_reservation INTO _reservation_enabled 
  FROM public.business_settings WHERE business_id = _business_id;
  
  -- Create bill record
  INSERT INTO public.bills (
    business_id, bill_number, customer_id, salesman_name,
    subtotal, discount_amount, tax_amount, total_amount,
    status, created_at, updated_at
  )
  VALUES (
    _business_id, _bill_number, _customer_id, _salesman_name,
    _subtotal, _discount_amount, _tax_amount, _total_amount,
    'draft', now(), now()
  )
  RETURNING id INTO _bill_id;

  -- Process items and reserve stock
  FOR _item IN SELECT * FROM jsonb_to_recordset(_items) 
    AS x(product_id UUID, quantity INTEGER, unit_price NUMERIC, cost_price NUMERIC, total_price NUMERIC)
  LOOP
    -- Insert bill item
    INSERT INTO public.bill_items (
      bill_id, product_id, quantity, unit_price, cost_price, total_price
    )
    VALUES (
      _bill_id, _item.product_id, _item.quantity, _item.unit_price, _item.cost_price, _item.total_price
    );

    -- Update reserved quantity if enabled
    IF _reservation_enabled THEN
      UPDATE public.products
      SET reserved_quantity = COALESCE(reserved_quantity, 0) + _item.quantity,
          updated_at = now()
      WHERE id = _item.product_id AND business_id = _business_id;
    END IF;
  END LOOP;

  -- Log Activity
  PERFORM public.log_activity(
    _business_id, 
    'create_bill', 
    'bills', 
    _bill_id, 
    NULL, 
    jsonb_build_object('bill_number', _bill_number, 'status', 'draft'), 
    'Draft bill created via mobile quick billing'
  );

  RETURN jsonb_build_object(
    'success', true,
    'bill_id', _bill_id,
    'bill_number', _bill_number,
    'stock_reserved', _reservation_enabled
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.update_draft_bill(
  _bill_id UUID,
  _customer_id UUID DEFAULT NULL,
  _subtotal NUMERIC DEFAULT 0,
  _discount_type TEXT DEFAULT 'flat',
  _discount_value NUMERIC DEFAULT 0,
  _discount_amount NUMERIC DEFAULT 0,
  _tax_amount NUMERIC DEFAULT 0,
  _total_amount NUMERIC DEFAULT 0,
  _items JSONB DEFAULT '[]'::JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _item RECORD;
  _reservation_enabled BOOLEAN;
  _business_id UUID;
BEGIN
  -- Get business_id
  SELECT business_id INTO _business_id FROM public.bills WHERE id = _bill_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Bill not found');
  END IF;

  -- Check reservation setting
  SELECT enable_draft_stock_reservation INTO _reservation_enabled 
  FROM public.business_settings WHERE business_id = _business_id;

  -- Restore old reservations first
  IF _reservation_enabled THEN
    FOR _item IN SELECT * FROM public.bill_items WHERE bill_id = _bill_id
    LOOP
      UPDATE public.products
      SET reserved_quantity = GREATEST(0, COALESCE(reserved_quantity, 0) - _item.quantity)
      WHERE id = _item.product_id;
    END LOOP;
  END IF;

  -- Delete old items
  DELETE FROM public.bill_items WHERE bill_id = _bill_id;

  -- Update bill
  UPDATE public.bills SET
    customer_id = _customer_id,
    subtotal = _subtotal,
    discount_amount = _discount_amount,
    tax_amount = _tax_amount,
    total_amount = _total_amount,
    updated_at = now()
  WHERE id = _bill_id;

  -- Insert new items and reserve stock
  FOR _item IN SELECT * FROM jsonb_to_recordset(_items) 
    AS x(product_id UUID, quantity INTEGER, unit_price NUMERIC, cost_price NUMERIC, total_price NUMERIC)
  LOOP
    INSERT INTO public.bill_items (
      bill_id, product_id, quantity, unit_price, cost_price, total_price
    )
    VALUES (
      _bill_id, _item.product_id, _item.quantity, _item.unit_price, _item.cost_price, _item.total_price
    );

    IF _reservation_enabled THEN
      UPDATE public.products
      SET reserved_quantity = COALESCE(reserved_quantity, 0) + _item.quantity
      WHERE id = _item.product_id;
    END IF;
  END LOOP;

  RETURN jsonb_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.finalize_draft_bill(
  _bill_id UUID,
  _payment_type TEXT,
  _payment_status TEXT,
  _paid_amount NUMERIC,
  _due_amount NUMERIC,
  _due_date DATE DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _item RECORD;
  _reservation_enabled BOOLEAN;
  _business_id UUID;
BEGIN
  SELECT business_id INTO _business_id FROM public.bills WHERE id = _bill_id;
  
  -- Update bill status
  UPDATE public.bills SET
    status = 'completed',
    payment_status = _payment_status::public.payment_status,
    payment_type = _payment_type::public.payment_mode,
    paid_amount = _paid_amount,
    due_amount = _due_amount,
    due_date = _due_date,
    updated_at = now()
  WHERE id = _bill_id;

  -- Deduct actual stock and clear reservations
  FOR _item IN SELECT * FROM public.bill_items WHERE bill_id = _bill_id
  LOOP
    UPDATE public.products
    SET stock_quantity = stock_quantity - _item.quantity,
        reserved_quantity = GREATEST(0, COALESCE(reserved_quantity, 0) - _item.quantity),
        updated_at = now()
    WHERE id = _item.product_id;
  END LOOP;

  PERFORM public.log_activity(
    _business_id, 'finalize_bill', 'bills', _bill_id, 
    jsonb_build_object('status', 'draft'), 
    jsonb_build_object('status', 'completed'), 
    'Draft bill finalized'
  );

  RETURN jsonb_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_draft_bill(_bill_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _item RECORD;
  _business_id UUID;
BEGIN
  SELECT business_id INTO _business_id FROM public.bills WHERE id = _bill_id;

  -- Clear reservations
  FOR _item IN SELECT * FROM public.bill_items WHERE bill_id = _bill_id
  LOOP
    UPDATE public.products
    SET reserved_quantity = GREATEST(0, COALESCE(reserved_quantity, 0) - _item.quantity),
        updated_at = now()
    WHERE id = _item.product_id;
  END LOOP;

  -- Update status or delete
  UPDATE public.bills SET status = 'cancelled', updated_at = now() WHERE id = _bill_id;

  PERFORM public.log_activity(
    _business_id, 'cancel_bill', 'bills', _bill_id, 
    NULL, NULL, 'Draft bill cancelled'
  );

  RETURN jsonb_build_object('success', true);
END;
$$;



-- ============================================================
-- 10. RLS POLICIES FOR NEW TABLES
-- ============================================================

ALTER TABLE public.bill_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view bill payments" ON public.bill_payments
  FOR SELECT TO authenticated
  USING (business_id = public.get_user_business_id(auth.uid()));
CREATE POLICY "Staff can create payments" ON public.bill_payments
  FOR INSERT TO authenticated
  WITH CHECK (business_id = public.get_user_business_id(auth.uid()));

ALTER TABLE public.customer_credit_limits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view credit limits" ON public.customer_credit_limits
  FOR SELECT TO authenticated
  USING (business_id = public.get_user_business_id(auth.uid()));
CREATE POLICY "Admin/Manager can manage credit" ON public.customer_credit_limits
  FOR ALL TO authenticated
  USING (business_id = public.get_user_business_id(auth.uid()) AND public.is_admin_or_manager(auth.uid()));

ALTER TABLE public.customer_credit_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view credit ledger" ON public.customer_credit_ledger
  FOR SELECT TO authenticated
  USING (business_id = public.get_user_business_id(auth.uid()));
CREATE POLICY "System can insert to ledger" ON public.customer_credit_ledger
  FOR INSERT TO authenticated
  WITH CHECK (business_id = public.get_user_business_id(auth.uid()));

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner/Manager can view expenses" ON public.expenses
  FOR SELECT TO authenticated
  USING (business_id = public.get_user_business_id(auth.uid()) AND public.is_admin_or_manager(auth.uid()));
CREATE POLICY "Owner/Manager can manage expenses" ON public.expenses
  FOR ALL TO authenticated
  USING (business_id = public.get_user_business_id(auth.uid()) AND public.is_admin_or_manager(auth.uid()));

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner/Manager can view activity logs" ON public.activity_logs
  FOR SELECT TO authenticated
  USING (business_id = public.get_user_business_id(auth.uid()) AND public.is_admin_or_manager(auth.uid()));
CREATE POLICY "System can create activity logs" ON public.activity_logs
  FOR INSERT TO authenticated
  WITH CHECK (business_id = public.get_user_business_id(auth.uid()));

ALTER TABLE public.offline_sync_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their sync queue" ON public.offline_sync_queue
  FOR SELECT TO authenticated
  USING (business_id = public.get_user_business_id(auth.uid()));
CREATE POLICY "System can manage sync queue" ON public.offline_sync_queue
  FOR ALL TO authenticated
  USING (business_id = public.get_user_business_id(auth.uid()));

ALTER TABLE public.offline_data_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their cache" ON public.offline_data_cache
  FOR ALL TO authenticated
  USING (business_id = public.get_user_business_id(auth.uid()));

ALTER TABLE public.sync_conflicts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view conflicts" ON public.sync_conflicts
  FOR SELECT TO authenticated
  USING (business_id = public.get_user_business_id(auth.uid()) AND public.is_admin_or_manager(auth.uid()));
CREATE POLICY "System can manage conflicts" ON public.sync_conflicts
  FOR ALL TO authenticated
  USING (business_id = public.get_user_business_id(auth.uid()));

-- ============================================================
-- 11. INITIALIZATION DATA
-- ============================================================


-- Enable required settings for new businesses (run on business creation in future transactions)
-- This will be handled by triggers/functions when new businesses are created

-- ============================================================
-- SCHEMA RELOAD
-- ============================================================
NOTIFY pgrst, 'reload schema';
