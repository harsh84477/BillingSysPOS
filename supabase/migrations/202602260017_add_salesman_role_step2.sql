-- ============================================================
-- Migration STEP 2 of 2: Salesman draft billing system
-- Run AFTER step 1 (add_salesman_role.sql) has completed
-- Run in: Supabase Dashboard > SQL Editor
-- ============================================================

-- 1. Add reserved_quantity to products table
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS reserved_quantity INTEGER NOT NULL DEFAULT 0;

-- 2. Add salesman_name column to bills (denormalized for fast display)
ALTER TABLE public.bills
  ADD COLUMN IF NOT EXISTS salesman_name TEXT;

-- 3. Add payment columns if missing
ALTER TABLE public.bills
  ADD COLUMN IF NOT EXISTS payment_type TEXT,
  ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS paid_amount NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS due_amount NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS due_date DATE,
  ADD COLUMN IF NOT EXISTS profit NUMERIC(12,2) DEFAULT 0;

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

-- Check if user is admin, manager, or cashier (not salesman)
CREATE OR REPLACE FUNCTION public.is_admin_or_staff(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin', 'manager', 'cashier')
  )
$$;

-- Check if user can finalize bills (admin/manager only)
CREATE OR REPLACE FUNCTION public.can_finalize_bill(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin', 'manager')
  )
$$;

-- ============================================================
-- TRANSACTION-SAFE RPC: Create Draft Bill
-- Validates available stock, reserves it, creates bill + items
-- ============================================================
CREATE OR REPLACE FUNCTION public.create_draft_bill(
  _business_id UUID,
  _bill_number TEXT,
  _customer_id UUID DEFAULT NULL,
  _salesman_name TEXT DEFAULT NULL,
  _subtotal NUMERIC DEFAULT 0,
  _discount_type TEXT DEFAULT 'flat',
  _discount_value NUMERIC DEFAULT 0,
  _discount_amount NUMERIC DEFAULT 0,
  _tax_amount NUMERIC DEFAULT 0,
  _total_amount NUMERIC DEFAULT 0,
  _items JSONB DEFAULT '[]'::JSONB
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _bill_id UUID;
  _item JSONB;
  _product RECORD;
  _available INTEGER;
BEGIN
  -- Validate stock availability for every item
  FOR _item IN SELECT * FROM jsonb_array_elements(_items)
  LOOP
    SELECT stock_quantity, reserved_quantity
    INTO _product
    FROM public.products
    WHERE id = (_item->>'product_id')::UUID
    FOR UPDATE; -- row-level lock

    IF NOT FOUND THEN
      RETURN json_build_object('success', false, 'error',
        'Product not found: ' || (_item->>'product_name'));
    END IF;

    _available := _product.stock_quantity - _product.reserved_quantity;
    IF _available < (_item->>'quantity')::INTEGER THEN
      RETURN json_build_object('success', false, 'error',
        'Insufficient stock for ' || (_item->>'product_name') ||
        '. Available: ' || _available || ', Requested: ' || (_item->>'quantity')::INTEGER);
    END IF;
  END LOOP;

  -- Create the bill
  INSERT INTO public.bills (
    business_id, bill_number, customer_id, created_by,
    status, subtotal, discount_type, discount_value,
    discount_amount, tax_amount, total_amount,
    salesman_name, payment_status, paid_amount, due_amount, profit
  ) VALUES (
    _business_id, _bill_number, _customer_id, auth.uid(),
    'draft', _subtotal, _discount_type, _discount_value,
    _discount_amount, _tax_amount, _total_amount,
    _salesman_name, 'unpaid', 0, _total_amount, 0
  )
  RETURNING id INTO _bill_id;

  -- Insert items and reserve stock
  FOR _item IN SELECT * FROM jsonb_array_elements(_items)
  LOOP
    INSERT INTO public.bill_items (
      bill_id, product_id, product_name,
      quantity, unit_price, cost_price, total_price
    ) VALUES (
      _bill_id,
      (_item->>'product_id')::UUID,
      _item->>'product_name',
      (_item->>'quantity')::INTEGER,
      (_item->>'unit_price')::NUMERIC,
      (_item->>'cost_price')::NUMERIC,
      (_item->>'total_price')::NUMERIC
    );

    -- Reserve stock atomically
    UPDATE public.products
    SET reserved_quantity = reserved_quantity + (_item->>'quantity')::INTEGER
    WHERE id = (_item->>'product_id')::UUID;
  END LOOP;

  RETURN json_build_object(
    'success', true,
    'bill_id', _bill_id,
    'bill_number', _bill_number
  );
END;
$$;

-- ============================================================
-- TRANSACTION-SAFE RPC: Finalize Draft Bill
-- Transfers reserved stock to actual deduction, marks completed
-- ============================================================
CREATE OR REPLACE FUNCTION public.finalize_draft_bill(
  _bill_id UUID,
  _payment_type TEXT DEFAULT 'cash',
  _payment_status TEXT DEFAULT 'paid',
  _paid_amount NUMERIC DEFAULT 0,
  _due_amount NUMERIC DEFAULT 0,
  _due_date DATE DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _bill RECORD;
  _item RECORD;
  _product RECORD;
BEGIN
  -- Check permission
  IF NOT public.can_finalize_bill(auth.uid()) THEN
    RETURN json_build_object('success', false, 'error', 'Only owner/manager can finalize drafts.');
  END IF;

  -- Lock and fetch bill
  SELECT * INTO _bill FROM public.bills
  WHERE id = _bill_id AND status = 'draft'
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Draft bill not found or already finalized.');
  END IF;

  -- Process each item: reduce stock_quantity, reduce reserved_quantity
  FOR _item IN
    SELECT * FROM public.bill_items WHERE bill_id = _bill_id
  LOOP
    SELECT stock_quantity, reserved_quantity INTO _product
    FROM public.products WHERE id = _item.product_id
    FOR UPDATE;

    IF FOUND THEN
      UPDATE public.products
      SET stock_quantity = stock_quantity - _item.quantity,
          reserved_quantity = GREATEST(0, reserved_quantity - _item.quantity)
      WHERE id = _item.product_id;
    END IF;
  END LOOP;

  -- Compute profit
  UPDATE public.bills
  SET status = 'completed',
      completed_at = now(),
      payment_type = _payment_type,
      payment_status = _payment_status,
      paid_amount = _paid_amount,
      due_amount = _due_amount,
      due_date = _due_date,
      profit = (
        SELECT COALESCE(SUM((bi.unit_price - bi.cost_price) * bi.quantity), 0)
        FROM public.bill_items bi WHERE bi.bill_id = _bill_id
      )
  WHERE id = _bill_id;

  RETURN json_build_object('success', true, 'bill_id', _bill_id);
END;
$$;

-- ============================================================
-- TRANSACTION-SAFE RPC: Cancel/Delete Draft Bill
-- Restores reserved_quantity, marks bill cancelled
-- ============================================================
CREATE OR REPLACE FUNCTION public.cancel_draft_bill(_bill_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _bill RECORD;
  _item RECORD;
BEGIN
  -- Lock and fetch bill
  SELECT * INTO _bill FROM public.bills
  WHERE id = _bill_id AND status = 'draft'
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Draft bill not found or already processed.');
  END IF;

  -- Only creator or admin/manager can cancel
  IF _bill.created_by != auth.uid() AND NOT public.can_finalize_bill(auth.uid()) THEN
    RETURN json_build_object('success', false, 'error', 'You do not have permission to cancel this draft.');
  END IF;

  -- Restore reserved stock
  FOR _item IN
    SELECT * FROM public.bill_items WHERE bill_id = _bill_id
  LOOP
    UPDATE public.products
    SET reserved_quantity = GREATEST(0, reserved_quantity - _item.quantity)
    WHERE id = _item.product_id;
  END LOOP;

  -- Delete bill items and mark cancelled
  DELETE FROM public.bill_items WHERE bill_id = _bill_id;
  UPDATE public.bills SET status = 'cancelled' WHERE id = _bill_id;

  RETURN json_build_object('success', true);
END;
$$;

-- ============================================================
-- TRANSACTION-SAFE RPC: Update Draft Bill Items
-- Reconciles old vs new reserved quantities
-- ============================================================
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
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _bill RECORD;
  _old_item RECORD;
  _item JSONB;
  _product RECORD;
  _available INTEGER;
  _old_qty INTEGER;
  _new_qty INTEGER;
  _diff INTEGER;
BEGIN
  -- Lock and fetch bill
  SELECT * INTO _bill FROM public.bills
  WHERE id = _bill_id AND status = 'draft'
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Draft not found or already finalized.');
  END IF;

  -- Only creator or admin/manager can edit
  IF _bill.created_by != auth.uid() AND NOT public.can_finalize_bill(auth.uid()) THEN
    RETURN json_build_object('success', false, 'error', 'No permission to edit this draft.');
  END IF;

  -- Step 1: Restore ALL old reservations
  FOR _old_item IN SELECT * FROM public.bill_items WHERE bill_id = _bill_id
  LOOP
    UPDATE public.products
    SET reserved_quantity = GREATEST(0, reserved_quantity - _old_item.quantity)
    WHERE id = _old_item.product_id;
  END LOOP;

  -- Step 2: Validate new stock availability
  FOR _item IN SELECT * FROM jsonb_array_elements(_items)
  LOOP
    SELECT stock_quantity, reserved_quantity INTO _product
    FROM public.products WHERE id = (_item->>'product_id')::UUID
    FOR UPDATE;

    IF NOT FOUND THEN
      -- Rollback is automatic on error
      RAISE EXCEPTION 'Product not found: %', (_item->>'product_name');
    END IF;

    _available := _product.stock_quantity - _product.reserved_quantity;
    IF _available < (_item->>'quantity')::INTEGER THEN
      RAISE EXCEPTION 'Insufficient stock for %. Available: %, Requested: %',
        (_item->>'product_name'), _available, (_item->>'quantity')::INTEGER;
    END IF;
  END LOOP;

  -- Step 3: Delete old items
  DELETE FROM public.bill_items WHERE bill_id = _bill_id;

  -- Step 4: Insert new items and reserve stock
  FOR _item IN SELECT * FROM jsonb_array_elements(_items)
  LOOP
    INSERT INTO public.bill_items (
      bill_id, product_id, product_name,
      quantity, unit_price, cost_price, total_price
    ) VALUES (
      _bill_id,
      (_item->>'product_id')::UUID,
      _item->>'product_name',
      (_item->>'quantity')::INTEGER,
      (_item->>'unit_price')::NUMERIC,
      (_item->>'cost_price')::NUMERIC,
      (_item->>'total_price')::NUMERIC
    );

    UPDATE public.products
    SET reserved_quantity = reserved_quantity + (_item->>'quantity')::INTEGER
    WHERE id = (_item->>'product_id')::UUID;
  END LOOP;

  -- Step 5: Update bill totals
  UPDATE public.bills
  SET customer_id = _customer_id,
      subtotal = _subtotal,
      discount_type = _discount_type,
      discount_value = _discount_value,
      discount_amount = _discount_amount,
      tax_amount = _tax_amount,
      total_amount = _total_amount,
      due_amount = _total_amount,
      updated_at = now()
  WHERE id = _bill_id;

  RETURN json_build_object('success', true, 'bill_id', _bill_id);
END;
$$;

-- ============================================================
-- RLS POLICIES
-- ============================================================

-- Bills INSERT: all business members can create bills
DROP POLICY IF EXISTS "All business members can create bills" ON public.bills;
CREATE POLICY "All business members can create bills" ON public.bills
  FOR INSERT TO authenticated
  WITH CHECK (business_id = public.get_user_business_id(auth.uid()));

-- Bills UPDATE: admin/manager can update any; salesman can update own drafts
DROP POLICY IF EXISTS "Admin/Manager can update bills" ON public.bills;
DROP POLICY IF EXISTS "Staff can update bills" ON public.bills;
CREATE POLICY "Staff can update bills" ON public.bills
  FOR UPDATE TO authenticated
  USING (
    business_id = public.get_user_business_id(auth.uid())
    AND (
      public.is_admin_or_manager(auth.uid())
      OR (created_by = auth.uid() AND status = 'draft')
    )
  );

-- Products UPDATE: admin/manager/cashier/salesman can update (for stock)
DROP POLICY IF EXISTS "Admin/Manager can update products" ON public.products;
DROP POLICY IF EXISTS "Authorized users can update products" ON public.products;
CREATE POLICY "Authorized users can update products" ON public.products
  FOR UPDATE TO authenticated
  USING (
    business_id = public.get_user_business_id(auth.uid())
  );

-- Inventory logs INSERT
DROP POLICY IF EXISTS "Admin/Manager can insert inventory logs" ON public.inventory_logs;
DROP POLICY IF EXISTS "Authorized users can insert inventory logs" ON public.inventory_logs;
CREATE POLICY "Authorized users can insert inventory logs" ON public.inventory_logs
  FOR INSERT TO authenticated
  WITH CHECK (
    business_id = public.get_user_business_id(auth.uid())
  );

-- ============================================================
-- Update join_business to accept salesman role
-- ============================================================
CREATE OR REPLACE FUNCTION public.join_business(
  _join_code TEXT,
  _user_id UUID,
  _role app_role DEFAULT 'cashier'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _business RECORD;
  _member_count INTEGER;
BEGIN
  SELECT * INTO _business FROM public.businesses WHERE join_code = upper(trim(_join_code));

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Invalid business code.');
  END IF;

  SELECT COUNT(*) INTO _member_count FROM public.user_roles WHERE business_id = _business.id;

  IF _member_count >= _business.max_members THEN
    RETURN json_build_object('success', false, 'error', 'Business has reached max members.');
  END IF;

  IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND business_id = _business.id) THEN
    RETURN json_build_object('success', false, 'error', 'You are already a member.');
  END IF;

  -- Prevent joining as admin
  IF _role = 'admin' THEN _role := 'cashier'; END IF;

  INSERT INTO public.user_roles (user_id, business_id, role)
  VALUES (_user_id, _business.id, _role);

  UPDATE public.profiles SET business_id = _business.id WHERE user_id = _user_id;

  RETURN json_build_object(
    'success', true,
    'business_id', _business.id,
    'business_name', _business.business_name
  );
END;
$$;

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
