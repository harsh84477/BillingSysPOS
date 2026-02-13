-- ============================================================
-- Migration: Multi-tenant Business System
-- Changes roles from admin/staff/viewer to admin/manager/cashier
-- Adds business concept with join code system
-- Max 8 members per business
-- ============================================================

-- Step 1: Create businesses table
CREATE TABLE public.businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name TEXT NOT NULL DEFAULT 'My Business',
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  mobile_number TEXT NOT NULL UNIQUE,
  join_code TEXT NOT NULL UNIQUE,
  max_members INTEGER NOT NULL DEFAULT 8,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Step 2: Generate unique join codes function
CREATE OR REPLACE FUNCTION public.generate_join_code()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  code TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    code := upper(substr(md5(random()::text), 1, 6));
    SELECT EXISTS(SELECT 1 FROM public.businesses WHERE join_code = code) INTO code_exists;
    EXIT WHEN NOT code_exists;
  END LOOP;
  RETURN code;
END;
$$;

-- Step 3: Add business_id columns to all data tables
ALTER TABLE public.business_settings ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE;
ALTER TABLE public.bills ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE;
ALTER TABLE public.inventory_logs ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES public.businesses(id) ON DELETE SET NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS mobile_number TEXT;

-- Step 4: Change app_role enum from admin/staff/viewer to admin/manager/cashier
ALTER TYPE public.app_role RENAME TO app_role_old;
CREATE TYPE public.app_role AS ENUM ('admin', 'manager', 'cashier');
ALTER TABLE public.user_roles ALTER COLUMN role TYPE public.app_role USING (
  CASE role::text
    WHEN 'admin' THEN 'admin'::public.app_role
    WHEN 'staff' THEN 'manager'::public.app_role
    WHEN 'viewer' THEN 'cashier'::public.app_role
  END
);
DROP TYPE public.app_role_old;

-- Step 5: Add business_id to user_roles and update constraints
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE;
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_role_key;
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_business_id_key UNIQUE (user_id, business_id);

-- Step 6: Trigger for businesses updated_at
CREATE TRIGGER update_businesses_updated_at
  BEFORE UPDATE ON public.businesses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Step 7: Enable RLS on businesses
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;

-- Step 8: Update helper functions
-- Drop old function
DROP FUNCTION IF EXISTS public.is_admin_or_staff(UUID);

-- Get user's business_id
CREATE OR REPLACE FUNCTION public.get_user_business_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT business_id
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- Check admin or manager
CREATE OR REPLACE FUNCTION public.is_admin_or_manager(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin', 'manager')
  )
$$;

-- Update has_role to be business-scoped
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Step 9: Create business function (called when business owner registers)
CREATE OR REPLACE FUNCTION public.create_business(
  _business_name TEXT,
  _mobile_number TEXT,
  _user_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _business_id UUID;
  _join_code TEXT;
BEGIN
  -- Check if user already owns a business
  IF EXISTS (SELECT 1 FROM public.businesses WHERE owner_id = _user_id) THEN
    RETURN json_build_object('success', false, 'error', 'You already own a business');
  END IF;

  -- Check if mobile number is already registered
  IF EXISTS (SELECT 1 FROM public.businesses WHERE mobile_number = _mobile_number) THEN
    RETURN json_build_object('success', false, 'error', 'This mobile number is already registered with another business');
  END IF;

  -- Generate unique join code
  _join_code := public.generate_join_code();

  -- Create the business
  INSERT INTO public.businesses (business_name, owner_id, mobile_number, join_code)
  VALUES (_business_name, _user_id, _mobile_number, _join_code)
  RETURNING id INTO _business_id;

  -- Assign admin role to owner
  INSERT INTO public.user_roles (user_id, business_id, role)
  VALUES (_user_id, _business_id, 'admin')
  ON CONFLICT (user_id, business_id) DO UPDATE SET role = 'admin';

  -- Update owner's profile
  UPDATE public.profiles
  SET business_id = _business_id, mobile_number = _mobile_number
  WHERE user_id = _user_id;

  -- Create default business settings for this business
  INSERT INTO public.business_settings (business_name, business_id)
  VALUES (_business_name, _business_id);

  RETURN json_build_object(
    'success', true,
    'business_id', _business_id,
    'join_code', _join_code
  );
END;
$$;

-- Step 10: Join business function (called when manager/cashier joins)
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
  -- Find business by join code (case-insensitive)
  SELECT * INTO _business FROM public.businesses WHERE join_code = upper(trim(_join_code));

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Invalid business code. Please check with your business owner.');
  END IF;

  -- Check member limit
  SELECT COUNT(*) INTO _member_count FROM public.user_roles WHERE business_id = _business.id;

  IF _member_count >= _business.max_members THEN
    RETURN json_build_object('success', false, 'error', 'This business has reached the maximum of 8 members.');
  END IF;

  -- Check if already a member
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND business_id = _business.id) THEN
    RETURN json_build_object('success', false, 'error', 'You are already a member of this business.');
  END IF;

  -- Prevent joining as admin
  IF _role = 'admin' THEN
    _role := 'cashier';
  END IF;

  -- Add user to business
  INSERT INTO public.user_roles (user_id, business_id, role)
  VALUES (_user_id, _business.id, _role);

  -- Update profile
  UPDATE public.profiles SET business_id = _business.id WHERE user_id = _user_id;

  RETURN json_build_object(
    'success', true,
    'business_id', _business.id,
    'business_name', _business.business_name
  );
END;
$$;

-- Step 11: Regenerate join code function (admin only)
CREATE OR REPLACE FUNCTION public.regenerate_join_code(_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _new_code TEXT;
  _business_id UUID;
BEGIN
  -- Get the business owned by this user
  SELECT id INTO _business_id FROM public.businesses WHERE owner_id = _user_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'You do not own a business');
  END IF;

  _new_code := public.generate_join_code();

  UPDATE public.businesses SET join_code = _new_code WHERE id = _business_id;

  RETURN json_build_object('success', true, 'join_code', _new_code);
END;
$$;

-- ============================================================
-- Step 12: Update ALL RLS policies for business-scoped access
-- ============================================================

-- === Businesses policies ===
CREATE POLICY "Users can view their business" ON public.businesses
  FOR SELECT TO authenticated
  USING (id = public.get_user_business_id(auth.uid()) OR owner_id = auth.uid());

CREATE POLICY "Owners can update their business" ON public.businesses
  FOR UPDATE TO authenticated
  USING (owner_id = auth.uid());

CREATE POLICY "Authenticated users can create business" ON public.businesses
  FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());

-- === Profiles - keep existing (users can view all profiles in their business context) ===

-- === User Roles ===
DROP POLICY IF EXISTS "Authenticated users can view roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
CREATE POLICY "Users can view roles in their business" ON public.user_roles
  FOR SELECT TO authenticated
  USING (business_id = public.get_user_business_id(auth.uid()) OR user_id = auth.uid());
CREATE POLICY "Admins can manage roles in their business" ON public.user_roles
  FOR ALL TO authenticated
  USING (business_id = public.get_user_business_id(auth.uid()) AND public.has_role(auth.uid(), 'admin'));

-- === Business Settings ===
DROP POLICY IF EXISTS "Authenticated users can view settings" ON public.business_settings;
DROP POLICY IF EXISTS "Admins can update settings" ON public.business_settings;
CREATE POLICY "Users can view own business settings" ON public.business_settings
  FOR SELECT TO authenticated
  USING (business_id = public.get_user_business_id(auth.uid()));
CREATE POLICY "Admins can update own business settings" ON public.business_settings
  FOR UPDATE TO authenticated
  USING (business_id = public.get_user_business_id(auth.uid()) AND public.has_role(auth.uid(), 'admin'));

-- === Categories ===
DROP POLICY IF EXISTS "Authenticated users can view categories" ON public.categories;
DROP POLICY IF EXISTS "Admins can manage categories" ON public.categories;
DROP POLICY IF EXISTS "Admins can update categories" ON public.categories;
DROP POLICY IF EXISTS "Admins can delete categories" ON public.categories;
CREATE POLICY "Users can view own business categories" ON public.categories
  FOR SELECT TO authenticated
  USING (business_id = public.get_user_business_id(auth.uid()));
CREATE POLICY "Admin/Manager can insert categories" ON public.categories
  FOR INSERT TO authenticated
  WITH CHECK (business_id = public.get_user_business_id(auth.uid()) AND public.is_admin_or_manager(auth.uid()));
CREATE POLICY "Admin/Manager can update categories" ON public.categories
  FOR UPDATE TO authenticated
  USING (business_id = public.get_user_business_id(auth.uid()) AND public.is_admin_or_manager(auth.uid()));
CREATE POLICY "Admins can delete categories" ON public.categories
  FOR DELETE TO authenticated
  USING (business_id = public.get_user_business_id(auth.uid()) AND public.has_role(auth.uid(), 'admin'));

-- === Products ===
DROP POLICY IF EXISTS "Authenticated users can view products" ON public.products;
DROP POLICY IF EXISTS "Admins can insert products" ON public.products;
DROP POLICY IF EXISTS "Admins can update products" ON public.products;
DROP POLICY IF EXISTS "Admins can delete products" ON public.products;
CREATE POLICY "Users can view own business products" ON public.products
  FOR SELECT TO authenticated
  USING (business_id = public.get_user_business_id(auth.uid()));
CREATE POLICY "Admin/Manager can insert products" ON public.products
  FOR INSERT TO authenticated
  WITH CHECK (business_id = public.get_user_business_id(auth.uid()) AND public.is_admin_or_manager(auth.uid()));
CREATE POLICY "Admin/Manager can update products" ON public.products
  FOR UPDATE TO authenticated
  USING (business_id = public.get_user_business_id(auth.uid()) AND public.is_admin_or_manager(auth.uid()));
CREATE POLICY "Admins can delete products" ON public.products
  FOR DELETE TO authenticated
  USING (business_id = public.get_user_business_id(auth.uid()) AND public.has_role(auth.uid(), 'admin'));

-- === Customers ===
DROP POLICY IF EXISTS "Authenticated users can view customers" ON public.customers;
DROP POLICY IF EXISTS "Admin and staff can insert customers" ON public.customers;
DROP POLICY IF EXISTS "Admin and staff can update customers" ON public.customers;
DROP POLICY IF EXISTS "Admins can delete customers" ON public.customers;
CREATE POLICY "Users can view own business customers" ON public.customers
  FOR SELECT TO authenticated
  USING (business_id = public.get_user_business_id(auth.uid()));
CREATE POLICY "Admin/Manager can insert customers" ON public.customers
  FOR INSERT TO authenticated
  WITH CHECK (business_id = public.get_user_business_id(auth.uid()) AND public.is_admin_or_manager(auth.uid()));
CREATE POLICY "Admin/Manager can update customers" ON public.customers
  FOR UPDATE TO authenticated
  USING (business_id = public.get_user_business_id(auth.uid()) AND public.is_admin_or_manager(auth.uid()));
CREATE POLICY "Admins can delete customers" ON public.customers
  FOR DELETE TO authenticated
  USING (business_id = public.get_user_business_id(auth.uid()) AND public.has_role(auth.uid(), 'admin'));

-- === Bills ===
DROP POLICY IF EXISTS "Authenticated users can view bills" ON public.bills;
DROP POLICY IF EXISTS "Admin and staff can create bills" ON public.bills;
DROP POLICY IF EXISTS "Admin and staff can update bills" ON public.bills;
DROP POLICY IF EXISTS "Admins can delete bills" ON public.bills;
CREATE POLICY "Users can view own business bills" ON public.bills
  FOR SELECT TO authenticated
  USING (business_id = public.get_user_business_id(auth.uid()));
CREATE POLICY "All business members can create bills" ON public.bills
  FOR INSERT TO authenticated
  WITH CHECK (business_id = public.get_user_business_id(auth.uid()));
CREATE POLICY "Admin/Manager can update bills" ON public.bills
  FOR UPDATE TO authenticated
  USING (business_id = public.get_user_business_id(auth.uid()) AND public.is_admin_or_manager(auth.uid()));
CREATE POLICY "Admins can delete bills" ON public.bills
  FOR DELETE TO authenticated
  USING (business_id = public.get_user_business_id(auth.uid()) AND public.has_role(auth.uid(), 'admin'));

-- === Bill Items ===
DROP POLICY IF EXISTS "Authenticated users can view bill items" ON public.bill_items;
DROP POLICY IF EXISTS "Admin and staff can insert bill items" ON public.bill_items;
DROP POLICY IF EXISTS "Admin and staff can update bill items" ON public.bill_items;
DROP POLICY IF EXISTS "Admin and staff can delete bill items" ON public.bill_items;
CREATE POLICY "Users can view own business bill items" ON public.bill_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.bills
      WHERE bills.id = bill_items.bill_id
      AND bills.business_id = public.get_user_business_id(auth.uid())
    )
  );
CREATE POLICY "Business members can insert bill items" ON public.bill_items
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.bills
      WHERE bills.id = bill_items.bill_id
      AND bills.business_id = public.get_user_business_id(auth.uid())
    )
  );
CREATE POLICY "Business members can update bill items" ON public.bill_items
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.bills
      WHERE bills.id = bill_items.bill_id
      AND bills.business_id = public.get_user_business_id(auth.uid())
    )
  );
CREATE POLICY "Business members can delete bill items" ON public.bill_items
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.bills
      WHERE bills.id = bill_items.bill_id
      AND bills.business_id = public.get_user_business_id(auth.uid())
    )
  );

-- === Inventory Logs ===
DROP POLICY IF EXISTS "Authenticated users can view inventory logs" ON public.inventory_logs;
DROP POLICY IF EXISTS "Admins can insert inventory logs" ON public.inventory_logs;
CREATE POLICY "Users can view own business inventory logs" ON public.inventory_logs
  FOR SELECT TO authenticated
  USING (business_id = public.get_user_business_id(auth.uid()));
CREATE POLICY "Admin/Manager can insert inventory logs" ON public.inventory_logs
  FOR INSERT TO authenticated
  WITH CHECK (business_id = public.get_user_business_id(auth.uid()) AND public.is_admin_or_manager(auth.uid()));
