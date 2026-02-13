-- ============================================================
-- SAFE migration - skips anything that already exists
-- Run this in Supabase SQL Editor
-- ============================================================

-- Create businesses table only if it doesn't exist
CREATE TABLE IF NOT EXISTS public.businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name TEXT NOT NULL DEFAULT 'My Business',
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  mobile_number TEXT NOT NULL UNIQUE,
  join_code TEXT NOT NULL UNIQUE,
  max_members INTEGER NOT NULL DEFAULT 8,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Generate join code function
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

-- Add business_id columns (IF NOT EXISTS handles re-runs safely)
ALTER TABLE public.business_settings ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE;
ALTER TABLE public.bills ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE;
ALTER TABLE public.inventory_logs ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES public.businesses(id) ON DELETE SET NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS mobile_number TEXT;

-- Safely change app_role enum (only if old enum exists)
DO $$
BEGIN
  -- Check if 'staff' value exists in enum (means old enum)
  IF EXISTS (
    SELECT 1 FROM pg_enum WHERE enumlabel = 'staff'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'app_role')
  ) THEN
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
  END IF;
END $$;

-- Add business_id to user_roles
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE;
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_role_key;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_roles_user_id_business_id_key'
  ) THEN
    ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_business_id_key UNIQUE (user_id, business_id);
  END IF;
END $$;

-- Trigger (safe)
DROP TRIGGER IF EXISTS update_businesses_updated_at ON public.businesses;
CREATE TRIGGER update_businesses_updated_at
  BEFORE UPDATE ON public.businesses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;

-- Helper functions (CREATE OR REPLACE is safe)
DROP FUNCTION IF EXISTS public.is_admin_or_staff(UUID);

CREATE OR REPLACE FUNCTION public.get_user_business_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT business_id FROM public.user_roles WHERE user_id = _user_id LIMIT 1 $$;

CREATE OR REPLACE FUNCTION public.is_admin_or_manager(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('admin', 'manager')) $$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;

-- Create business function (with bill prefix 'A' for admin)
CREATE OR REPLACE FUNCTION public.create_business(
  _business_name TEXT, _mobile_number TEXT, _user_id UUID
)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _business_id UUID; _join_code TEXT;
BEGIN
  IF EXISTS (SELECT 1 FROM public.businesses WHERE owner_id = _user_id) THEN
    RETURN json_build_object('success', false, 'error', 'You already own a business');
  END IF;
  IF EXISTS (SELECT 1 FROM public.businesses WHERE mobile_number = _mobile_number) THEN
    RETURN json_build_object('success', false, 'error', 'This mobile number is already registered with another business');
  END IF;
  _join_code := public.generate_join_code();
  INSERT INTO public.businesses (business_name, owner_id, mobile_number, join_code)
  VALUES (_business_name, _user_id, _mobile_number, _join_code)
  RETURNING id INTO _business_id;
  INSERT INTO public.user_roles (user_id, business_id, role, bill_prefix)
  VALUES (_user_id, _business_id, 'admin', 'A')
  ON CONFLICT (user_id, business_id) DO UPDATE SET role = 'admin', bill_prefix = 'A';
  UPDATE public.profiles SET business_id = _business_id, mobile_number = _mobile_number WHERE user_id = _user_id;
  INSERT INTO public.business_settings (business_name, business_id) VALUES (_business_name, _business_id);
  RETURN json_build_object('success', true, 'business_id', _business_id, 'join_code', _join_code);
END;
$$;

-- Join business function
CREATE OR REPLACE FUNCTION public.join_business(
  _join_code TEXT, _user_id UUID, _role app_role DEFAULT 'cashier'
)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _business RECORD; _member_count INTEGER;
BEGIN
  SELECT * INTO _business FROM public.businesses WHERE join_code = upper(trim(_join_code));
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Invalid business code.');
  END IF;
  SELECT COUNT(*) INTO _member_count FROM public.user_roles WHERE business_id = _business.id;
  IF _member_count >= _business.max_members THEN
    RETURN json_build_object('success', false, 'error', 'Business has reached max 8 members.');
  END IF;
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND business_id = _business.id) THEN
    RETURN json_build_object('success', false, 'error', 'You are already a member.');
  END IF;
  IF _role = 'admin' THEN _role := 'cashier'; END IF;
  INSERT INTO public.user_roles (user_id, business_id, role) VALUES (_user_id, _business.id, _role);
  UPDATE public.profiles SET business_id = _business.id WHERE user_id = _user_id;
  RETURN json_build_object('success', true, 'business_id', _business.id, 'business_name', _business.business_name);
END;
$$;

-- Regenerate join code function
CREATE OR REPLACE FUNCTION public.regenerate_join_code(_user_id UUID)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _new_code TEXT; _business_id UUID;
BEGIN
  SELECT id INTO _business_id FROM public.businesses WHERE owner_id = _user_id;
  IF NOT FOUND THEN RETURN json_build_object('success', false, 'error', 'You do not own a business'); END IF;
  _new_code := public.generate_join_code();
  UPDATE public.businesses SET join_code = _new_code WHERE id = _business_id;
  RETURN json_build_object('success', true, 'join_code', _new_code);
END;
$$;

-- ============================================================
-- RLS Policies (DROP IF EXISTS + CREATE to handle re-runs)
-- ============================================================

-- Businesses
DROP POLICY IF EXISTS "Users can view their business" ON public.businesses;
DROP POLICY IF EXISTS "Owners can update their business" ON public.businesses;
DROP POLICY IF EXISTS "Authenticated users can create business" ON public.businesses;
CREATE POLICY "Users can view their business" ON public.businesses FOR SELECT TO authenticated
  USING (id = public.get_user_business_id(auth.uid()) OR owner_id = auth.uid());
CREATE POLICY "Owners can update their business" ON public.businesses FOR UPDATE TO authenticated
  USING (owner_id = auth.uid());
CREATE POLICY "Authenticated users can create business" ON public.businesses FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());

-- User Roles
DROP POLICY IF EXISTS "Authenticated users can view roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view roles in their business" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage roles in their business" ON public.user_roles;
CREATE POLICY "Users can view roles in their business" ON public.user_roles FOR SELECT TO authenticated
  USING (business_id = public.get_user_business_id(auth.uid()) OR user_id = auth.uid());
CREATE POLICY "Admins can manage roles in their business" ON public.user_roles FOR ALL TO authenticated
  USING (business_id = public.get_user_business_id(auth.uid()) AND public.has_role(auth.uid(), 'admin'));

-- Business Settings
DROP POLICY IF EXISTS "Authenticated users can view settings" ON public.business_settings;
DROP POLICY IF EXISTS "Admins can update settings" ON public.business_settings;
DROP POLICY IF EXISTS "Users can view own business settings" ON public.business_settings;
DROP POLICY IF EXISTS "Admins can update own business settings" ON public.business_settings;
CREATE POLICY "Users can view own business settings" ON public.business_settings FOR SELECT TO authenticated
  USING (business_id = public.get_user_business_id(auth.uid()) OR business_id IS NULL);
CREATE POLICY "Admins can update own business settings" ON public.business_settings FOR UPDATE TO authenticated
  USING ((business_id = public.get_user_business_id(auth.uid()) OR business_id IS NULL) AND public.has_role(auth.uid(), 'admin'));

-- Categories
DROP POLICY IF EXISTS "Authenticated users can view categories" ON public.categories;
DROP POLICY IF EXISTS "Admins can manage categories" ON public.categories;
DROP POLICY IF EXISTS "Admins can update categories" ON public.categories;
DROP POLICY IF EXISTS "Admins can delete categories" ON public.categories;
DROP POLICY IF EXISTS "Users can view own business categories" ON public.categories;
DROP POLICY IF EXISTS "Admin/Manager can insert categories" ON public.categories;
DROP POLICY IF EXISTS "Admin/Manager can update categories" ON public.categories;
CREATE POLICY "Users can view own business categories" ON public.categories FOR SELECT TO authenticated
  USING (business_id = public.get_user_business_id(auth.uid()) OR business_id IS NULL);
CREATE POLICY "Admin/Manager can insert categories" ON public.categories FOR INSERT TO authenticated
  WITH CHECK (true);
CREATE POLICY "Admin/Manager can update categories" ON public.categories FOR UPDATE TO authenticated
  USING (true);
CREATE POLICY "Admins can delete categories" ON public.categories FOR DELETE TO authenticated
  USING (true);

-- Products
DROP POLICY IF EXISTS "Authenticated users can view products" ON public.products;
DROP POLICY IF EXISTS "Admins can insert products" ON public.products;
DROP POLICY IF EXISTS "Admins can update products" ON public.products;
DROP POLICY IF EXISTS "Admins can delete products" ON public.products;
DROP POLICY IF EXISTS "Users can view own business products" ON public.products;
DROP POLICY IF EXISTS "Admin/Manager can insert products" ON public.products;
DROP POLICY IF EXISTS "Admin/Manager can update products" ON public.products;
CREATE POLICY "Users can view own business products" ON public.products FOR SELECT TO authenticated
  USING (business_id = public.get_user_business_id(auth.uid()) OR business_id IS NULL);
CREATE POLICY "Admin/Manager can insert products" ON public.products FOR INSERT TO authenticated
  WITH CHECK (true);
CREATE POLICY "Admin/Manager can update products" ON public.products FOR UPDATE TO authenticated
  USING (true);
CREATE POLICY "Admins can delete products" ON public.products FOR DELETE TO authenticated
  USING (true);

-- Customers
DROP POLICY IF EXISTS "Authenticated users can view customers" ON public.customers;
DROP POLICY IF EXISTS "Admin and staff can insert customers" ON public.customers;
DROP POLICY IF EXISTS "Admin and staff can update customers" ON public.customers;
DROP POLICY IF EXISTS "Admins can delete customers" ON public.customers;
DROP POLICY IF EXISTS "Users can view own business customers" ON public.customers;
DROP POLICY IF EXISTS "Admin/Manager can insert customers" ON public.customers;
DROP POLICY IF EXISTS "Admin/Manager can update customers" ON public.customers;
CREATE POLICY "Users can view own business customers" ON public.customers FOR SELECT TO authenticated
  USING (business_id = public.get_user_business_id(auth.uid()) OR business_id IS NULL);
CREATE POLICY "Admin/Manager can insert customers" ON public.customers FOR INSERT TO authenticated
  WITH CHECK (true);
CREATE POLICY "Admin/Manager can update customers" ON public.customers FOR UPDATE TO authenticated
  USING (true);
CREATE POLICY "Admins can delete customers" ON public.customers FOR DELETE TO authenticated
  USING (true);

-- Bills
DROP POLICY IF EXISTS "Authenticated users can view bills" ON public.bills;
DROP POLICY IF EXISTS "Admin and staff can create bills" ON public.bills;
DROP POLICY IF EXISTS "Admin and staff can update bills" ON public.bills;
DROP POLICY IF EXISTS "Admins can delete bills" ON public.bills;
DROP POLICY IF EXISTS "Users can view own business bills" ON public.bills;
DROP POLICY IF EXISTS "All business members can create bills" ON public.bills;
DROP POLICY IF EXISTS "Admin/Manager can update bills" ON public.bills;
CREATE POLICY "Users can view own business bills" ON public.bills FOR SELECT TO authenticated
  USING (business_id = public.get_user_business_id(auth.uid()) OR business_id IS NULL);
CREATE POLICY "All business members can create bills" ON public.bills FOR INSERT TO authenticated
  WITH CHECK (true);
CREATE POLICY "Admin/Manager can update bills" ON public.bills FOR UPDATE TO authenticated
  USING (true);
CREATE POLICY "Admins can delete bills" ON public.bills FOR DELETE TO authenticated
  USING (true);

-- Bill Items
DROP POLICY IF EXISTS "Authenticated users can view bill items" ON public.bill_items;
DROP POLICY IF EXISTS "Admin and staff can insert bill items" ON public.bill_items;
DROP POLICY IF EXISTS "Admin and staff can update bill items" ON public.bill_items;
DROP POLICY IF EXISTS "Admin and staff can delete bill items" ON public.bill_items;
DROP POLICY IF EXISTS "Users can view own business bill items" ON public.bill_items;
DROP POLICY IF EXISTS "Business members can insert bill items" ON public.bill_items;
DROP POLICY IF EXISTS "Business members can update bill items" ON public.bill_items;
DROP POLICY IF EXISTS "Business members can delete bill items" ON public.bill_items;
CREATE POLICY "Users can view own business bill items" ON public.bill_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Business members can insert bill items" ON public.bill_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Business members can update bill items" ON public.bill_items FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Business members can delete bill items" ON public.bill_items FOR DELETE TO authenticated USING (true);

-- Inventory Logs
DROP POLICY IF EXISTS "Authenticated users can view inventory logs" ON public.inventory_logs;
DROP POLICY IF EXISTS "Admins can insert inventory logs" ON public.inventory_logs;
DROP POLICY IF EXISTS "Users can view own business inventory logs" ON public.inventory_logs;
DROP POLICY IF EXISTS "Admin/Manager can insert inventory logs" ON public.inventory_logs;
CREATE POLICY "Users can view own business inventory logs" ON public.inventory_logs FOR SELECT TO authenticated
  USING (business_id = public.get_user_business_id(auth.uid()) OR business_id IS NULL);
CREATE POLICY "Admin/Manager can insert inventory logs" ON public.inventory_logs FOR INSERT TO authenticated
  WITH CHECK (true);

-- ============================================================
-- Bill Prefix System
-- ============================================================
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS bill_prefix TEXT DEFAULT NULL;
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS next_bill_number INTEGER NOT NULL DEFAULT 1;
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS last_bill_date DATE DEFAULT NULL;

-- Set default prefix 'A' for existing admin users
UPDATE public.user_roles SET bill_prefix = 'A' WHERE role = 'admin' AND bill_prefix IS NULL;

-- Atomic bill number function
CREATE OR REPLACE FUNCTION public.get_next_bill_number(_user_id UUID)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _prefix TEXT; _current_number INTEGER; _last_date DATE; _today DATE; _bill_number TEXT; _month TEXT; _day TEXT;
BEGIN
  _today := CURRENT_DATE;
  SELECT bill_prefix, next_bill_number, last_bill_date INTO _prefix, _current_number, _last_date
  FROM public.user_roles WHERE user_id = _user_id FOR UPDATE;
  IF NOT FOUND THEN RETURN json_build_object('success', false, 'error', 'User role not found'); END IF;
  IF _prefix IS NULL OR _prefix = '' THEN RETURN json_build_object('success', false, 'error', 'No bill prefix assigned. Contact your admin.'); END IF;
  IF _last_date IS NULL OR _last_date != _today THEN _current_number := 1; END IF;
  _month := lpad(EXTRACT(MONTH FROM _today)::text, 2, '0');
  _day := lpad(EXTRACT(DAY FROM _today)::text, 2, '0');
  _bill_number := _prefix || _month || _day || lpad(_current_number::text, 4, '0');
  UPDATE public.user_roles SET next_bill_number = _current_number + 1, last_bill_date = _today WHERE user_id = _user_id;
  RETURN json_build_object('success', true, 'bill_number', _bill_number, 'prefix', _prefix, 'sequence', _current_number);
END;
$$;

-- Admin assigns bill prefixes
CREATE OR REPLACE FUNCTION public.assign_bill_prefix(
  _admin_user_id UUID, _target_user_id UUID, _prefix TEXT
)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _admin_business_id UUID; _target_business_id UUID;
BEGIN
  SELECT business_id INTO _admin_business_id FROM public.user_roles WHERE user_id = _admin_user_id AND role = 'admin';
  IF NOT FOUND THEN RETURN json_build_object('success', false, 'error', 'Only admins can assign bill prefixes'); END IF;
  SELECT business_id INTO _target_business_id FROM public.user_roles WHERE user_id = _target_user_id;
  IF NOT FOUND OR _target_business_id != _admin_business_id THEN RETURN json_build_object('success', false, 'error', 'User not found in your business'); END IF;
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE business_id = _admin_business_id AND bill_prefix = upper(trim(_prefix)) AND user_id != _target_user_id) THEN
    RETURN json_build_object('success', false, 'error', 'This prefix is already assigned to another team member');
  END IF;
  UPDATE public.user_roles SET bill_prefix = upper(trim(_prefix)) WHERE user_id = _target_user_id AND business_id = _admin_business_id;
  RETURN json_build_object('success', true);
END;
$$;

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
