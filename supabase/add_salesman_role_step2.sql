-- ============================================================
-- Migration STEP 2 of 2: Salesman schema changes & policies
-- Run this AFTER step 1 (add_salesman_role.sql) has completed
-- Run in: Supabase Dashboard > SQL Editor
-- ============================================================

-- 1. Add reserved_quantity to products table
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS reserved_quantity INTEGER NOT NULL DEFAULT 0;

-- 2. Add salesman_name column to bills (denormalized for fast display)
ALTER TABLE public.bills
  ADD COLUMN IF NOT EXISTS salesman_name TEXT;

-- 3. Create helper: check if user is admin, manager, or cashier (not salesman)
CREATE OR REPLACE FUNCTION public.is_admin_or_staff(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin', 'manager', 'cashier')
  )
$$;

-- 4. Create helper: check if user can finalize bills (admin/manager/cashier only)
CREATE OR REPLACE FUNCTION public.can_finalize_bill(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin', 'manager', 'cashier')
  )
$$;

-- 5. Update bills INSERT policy: allow salesman to create bills too
DROP POLICY IF EXISTS "All business members can create bills" ON public.bills;
CREATE POLICY "All business members can create bills" ON public.bills
  FOR INSERT TO authenticated
  WITH CHECK (business_id = public.get_user_business_id(auth.uid()));

-- 6. Update bills UPDATE policy: 
-- Admin/Manager can update any bill; Salesman can update only own draft bills
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

-- 7. Update products UPDATE policy to allow salesman stock reservation
DROP POLICY IF EXISTS "Admin/Manager can update products" ON public.products;
DROP POLICY IF EXISTS "Authorized users can update products" ON public.products;
CREATE POLICY "Authorized users can update products" ON public.products
  FOR UPDATE TO authenticated
  USING (
    business_id = public.get_user_business_id(auth.uid())
    AND (
      public.is_admin_or_manager(auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid() AND role IN ('cashier', 'salesman')
      )
    )
  );

-- 8. Allow salesman to insert inventory logs for stock reservation tracking
DROP POLICY IF EXISTS "Admin/Manager can insert inventory logs" ON public.inventory_logs;
DROP POLICY IF EXISTS "Authorized users can insert inventory logs" ON public.inventory_logs;
CREATE POLICY "Authorized users can insert inventory logs" ON public.inventory_logs
  FOR INSERT TO authenticated
  WITH CHECK (
    business_id = public.get_user_business_id(auth.uid())
  );

-- 9. Update join_business function to accept 'salesman' role
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

-- 10. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
