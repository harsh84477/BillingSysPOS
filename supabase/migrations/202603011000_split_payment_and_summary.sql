-- ============================================================
-- SPLIT PAYMENT & COLLECTION TRACKING
-- ============================================================
-- Date: 2026-03-01
-- Objective: Fix missing types, add split payment collections to profit summary

-- 1. Create payment_status enum if missing
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status') THEN
        CREATE TYPE public.payment_status AS ENUM ('unpaid', 'partial', 'paid', 'overdue', 'cancelled');
    END IF;
END $$;

-- 2. Ensure payment_mode enum includes required values
-- (It already has 'cash', 'upi', 'card', 'credit')

-- 3. Update calculate_profit_summary to include detailed collections
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
  _cash_collection NUMERIC;
  _online_collection NUMERIC;
  _credit_collection NUMERIC;
BEGIN
  -- Default to current month
  _start_date := COALESCE(_start_date, date_trunc('month', CURRENT_DATE)::DATE);
  _end_date := COALESCE(_end_date, CURRENT_DATE);

  -- Sales (Total amount from completed bills created in this period)
  SELECT COALESCE(SUM(total_amount), 0) INTO _sales
  FROM public.bills
  WHERE business_id = _business_id
  AND status = 'completed'
  -- Use completed_at for historical accuracy of when the sale actually finished
  AND completed_at >= _start_date AND completed_at <= _end_date + INTERVAL '1 day';

  -- Purchase cost (COGS)
  SELECT COALESCE(SUM(bi.cost_price * bi.quantity), 0) INTO _purchase_cost
  FROM public.bill_items bi
  JOIN public.bills b ON b.id = bi.bill_id
  WHERE b.business_id = _business_id
  AND b.status = 'completed'
  AND b.completed_at >= _start_date AND b.completed_at <= _end_date + INTERVAL '1 day';

  -- Expenses
  SELECT COALESCE(SUM(amount), 0) INTO _expenses
  FROM public.expenses
  WHERE business_id = _business_id
  AND expense_date >= _start_date AND expense_date <= _end_date;

  -- CASH Collections
  -- From new split payment table
  SELECT COALESCE(SUM(amount), 0) INTO _cash_collection
  FROM public.bill_payments
  WHERE business_id = _business_id
  AND payment_mode = 'cash'
  AND created_at >= _start_date AND created_at <= _end_date + INTERVAL '1 day';

  -- Add from legacy bills (backward compatibility)
  _cash_collection := _cash_collection + (
    SELECT COALESCE(SUM(paid_amount), 0) 
    FROM public.bills b
    WHERE b.business_id = _business_id
    AND b.status = 'completed'
    AND b.payment_type = 'cash'
    AND b.completed_at >= _start_date AND b.completed_at <= _end_date + INTERVAL '1 day'
    AND NOT EXISTS (SELECT 1 FROM public.bill_payments bp WHERE bp.bill_id = b.id)
  );

  -- ONLINE Collections (UPI + Card)
  SELECT COALESCE(SUM(amount), 0) INTO _online_collection
  FROM public.bill_payments
  WHERE business_id = _business_id
  AND payment_mode IN ('upi', 'card')
  AND created_at >= _start_date AND created_at <= _end_date + INTERVAL '1 day';

  -- Add from legacy bills (backward compatibility)
  _online_collection := _online_collection + (
    SELECT COALESCE(SUM(paid_amount), 0) 
    FROM public.bills b
    WHERE b.business_id = _business_id
    AND b.status = 'completed'
    AND (b.payment_type IN ('upi', 'card') OR b.payment_type LIKE '%online%')
    AND b.completed_at >= _start_date AND b.completed_at <= _end_date + INTERVAL '1 day'
    AND NOT EXISTS (SELECT 1 FROM public.bill_payments bp WHERE bp.bill_id = b.id)
  );
  
  -- CREDIT Collections (for completeness)
  SELECT COALESCE(SUM(amount), 0) INTO _credit_collection
  FROM public.bill_payments
  WHERE business_id = _business_id
  AND payment_mode = 'credit'
  AND created_at >= _start_date AND created_at <= _end_date + INTERVAL '1 day';

  _profit := _sales - _purchase_cost - _expenses;

  RETURN json_build_object(
    'sales', _sales,
    'purchase_cost', _purchase_cost,
    'expenses', _expenses,
    'net_profit', _profit,
    'total_collection', _cash_collection + _online_collection + _credit_collection,
    'cash_collection', _cash_collection,
    'online_collection', _online_collection,
    'credit_collection', _credit_collection,
    'period_start', _start_date,
    'period_end', _end_date
  );
END;
$$;

-- 4. Unified RPC for finalizing bill with split payments
CREATE OR REPLACE FUNCTION public.finalize_bill_with_split_payments(
  _bill_id UUID,
  _payments JSONB, -- Array of { mode: string, amount: numeric, reference?: string, notes?: string }
  _due_amount NUMERIC DEFAULT 0,
  _due_date DATE DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _bill RECORD;
  _item RECORD;
  _payment JSONB;
  _business_id UUID;
  _total_paid NUMERIC := 0;
  _primary_payment_mode TEXT;
BEGIN
  -- 1. Permission check
  IF NOT public.can_finalize_bill(auth.uid()) THEN 
    RETURN jsonb_build_object('success', false, 'error', 'Permission denied'); 
  END IF;

  -- 2. Get bill and lock for update
  SELECT * INTO _bill FROM public.bills WHERE id = _bill_id AND status = 'draft' FOR UPDATE;
  IF NOT FOUND THEN 
    RETURN jsonb_build_object('success', false, 'error', 'Draft bill not found'); 
  END IF;
  
  _business_id := _bill.business_id;

  -- 3. Clear any existing payments for this bill ID (in case of retry)
  DELETE FROM public.bill_payments WHERE bill_id = _bill_id;

  -- 4. Record new payments from JSONB array
  FOR _payment IN SELECT * FROM jsonb_array_elements(_payments)
  LOOP
    IF (_payment->>'amount')::NUMERIC > 0 THEN
      _total_paid := _total_paid + (_payment->>'amount')::NUMERIC;
      
      -- Insert payment record
      INSERT INTO public.bill_payments (
        bill_id, business_id, payment_mode, amount, collected_by, transaction_reference, notes
      )
      VALUES (
        _bill_id, _business_id, (_payment->>'mode')::public.payment_mode, (_payment->>'amount')::NUMERIC, 
        auth.uid(), _payment->>'reference', _payment->>'notes'
      );
      
      -- Handle customer credit if mode is credit
      IF (_payment->>'mode') = 'credit' THEN
        IF _bill.customer_id IS NULL THEN
          RAISE EXCEPTION 'Customer is required for credit payments';
        END IF;
        
        -- Update balance and ledger
        DECLARE
          _available_credit NUMERIC;
        BEGIN
          _available_credit := (public.get_customer_credit_status(_bill.customer_id, _business_id)->>'available_credit')::NUMERIC;
          IF _available_credit < (_payment->>'amount')::NUMERIC THEN
            RAISE EXCEPTION 'Insufficient credit limit for customer';
          END IF;
          
          UPDATE public.customer_credit_limits
          SET current_balance = current_balance + (_payment->>'amount')::NUMERIC,
              updated_at = now()
          WHERE customer_id = _bill.customer_id AND business_id = _business_id;
          
          INSERT INTO public.customer_credit_ledger (
            business_id, customer_id, bill_id, transaction_type,
            amount, previous_balance, new_balance, description, created_by
          )
          SELECT
            _business_id, _bill.customer_id, _bill_id, 'debit',
            (_payment->>'amount')::NUMERIC, current_balance - (_payment->>'amount')::NUMERIC, current_balance,
            'Payment for bill #' || _bill.bill_number, auth.uid()
          FROM public.customer_credit_limits
          WHERE customer_id = _bill.customer_id AND business_id = _business_id;
        END;
      END IF;
    END IF;
  END LOOP;

  -- 5. Determine display payment mode
  IF jsonb_array_length(_payments) = 1 THEN
    _primary_payment_mode := (_payments->0->>'mode');
  ELSE
    _primary_payment_mode := 'split';
  END IF;

  -- 6. Update main bill record
  UPDATE public.bills SET 
    status = 'completed', 
    completed_at = now(), 
    payment_type = _primary_payment_mode, 
    payment_status = CASE WHEN _due_amount > 0 THEN 'partial' ELSE 'paid' END, 
    paid_amount = _total_paid, 
    due_amount = _due_amount, 
    due_date = _due_date, 
    profit = (SELECT COALESCE(SUM((bi.unit_price - bi.cost_price) * bi.quantity), 0) FROM public.bill_items bi WHERE bi.bill_id = _bill_id),
    updated_at = now()
  WHERE id = _bill_id;

  -- 7. Deduct stock and clear reserved quantities
  FOR _item IN SELECT * FROM public.bill_items WHERE bill_id = _bill_id
  LOOP
    UPDATE public.products 
    SET stock_quantity = stock_quantity - _item.quantity, 
        reserved_quantity = GREATEST(0, COALESCE(reserved_quantity, 0) - _item.quantity),
        updated_at = now()
    WHERE id = _item.product_id;
  END LOOP;

  -- 8. Activity log
  PERFORM public.log_activity(
    _business_id, 'finalize_bill', 'bills', _bill_id, 
    jsonb_build_object('status', 'draft'), 
    jsonb_build_object('status', 'completed', 'payment_type', _primary_payment_mode), 
    'Draft bill finalized with ' || _primary_payment_mode || ' payment'
  );

  RETURN jsonb_build_object('success', true, 'bill_id', _bill_id);
END;
$$;
