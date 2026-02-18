-- Safe Migration Script for Supabase POS System
-- This script handles existing database objects gracefully

-- ============================================================
-- PART 1: Create enum types (only if they don't exist)
-- ============================================================
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'staff', 'viewer');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.bill_status AS ENUM ('draft', 'completed', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================================
-- PART 2: Create tables (with IF NOT EXISTS)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.business_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name TEXT NOT NULL DEFAULT 'My Business',
  address TEXT,
  phone TEXT,
  email TEXT,
  logo_url TEXT,
  currency TEXT NOT NULL DEFAULT 'USD',
  currency_symbol TEXT NOT NULL DEFAULT '$',
  tax_name TEXT NOT NULL DEFAULT 'Tax',
  tax_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  tax_inclusive BOOLEAN NOT NULL DEFAULT false,
  bill_prefix TEXT NOT NULL DEFAULT 'INV-',
  next_bill_number INTEGER NOT NULL DEFAULT 1,
  theme TEXT NOT NULL DEFAULT 'mint-pro',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  icon TEXT DEFAULT 'Package',
  color TEXT DEFAULT '#3B82F6',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  selling_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  cost_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  low_stock_threshold INTEGER NOT NULL DEFAULT 10,
  image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_number TEXT NOT NULL UNIQUE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status bill_status NOT NULL DEFAULT 'draft',
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount_type TEXT CHECK (discount_type IN ('flat', 'percent')),
  discount_value NUMERIC(12,2) DEFAULT 0,
  discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  notes TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.bill_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id UUID REFERENCES public.bills(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC(12,2) NOT NULL,
  cost_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_price NUMERIC(12,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.inventory_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  change_quantity INTEGER NOT NULL,
  previous_quantity INTEGER NOT NULL,
  new_quantity INTEGER NOT NULL,
  reason TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

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

-- Add base columns to business_settings if they don't exist (handle existing rows)
-- First add columns without NOT NULL if table has data
ALTER TABLE public.business_settings ADD COLUMN IF NOT EXISTS business_name TEXT;
ALTER TABLE public.business_settings ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.business_settings ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.business_settings ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.business_settings ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE public.business_settings ADD COLUMN IF NOT EXISTS currency TEXT;
ALTER TABLE public.business_settings ADD COLUMN IF NOT EXISTS currency_symbol TEXT;
ALTER TABLE public.business_settings ADD COLUMN IF NOT EXISTS tax_name TEXT;
ALTER TABLE public.business_settings ADD COLUMN IF NOT EXISTS tax_rate NUMERIC(5,2);
ALTER TABLE public.business_settings ADD COLUMN IF NOT EXISTS tax_inclusive BOOLEAN;
ALTER TABLE public.business_settings ADD COLUMN IF NOT EXISTS bill_prefix TEXT;
ALTER TABLE public.business_settings ADD COLUMN IF NOT EXISTS next_bill_number INTEGER;
ALTER TABLE public.business_settings ADD COLUMN IF NOT EXISTS theme TEXT;
ALTER TABLE public.business_settings ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;
ALTER TABLE public.business_settings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

-- Update NULL values to defaults for existing rows
UPDATE public.business_settings SET business_name = 'My Business' WHERE business_name IS NULL;
UPDATE public.business_settings SET currency = 'USD' WHERE currency IS NULL;
UPDATE public.business_settings SET currency_symbol = '$' WHERE currency_symbol IS NULL;
UPDATE public.business_settings SET tax_name = 'Tax' WHERE tax_name IS NULL;
UPDATE public.business_settings SET tax_rate = 0 WHERE tax_rate IS NULL;
UPDATE public.business_settings SET tax_inclusive = false WHERE tax_inclusive IS NULL;
UPDATE public.business_settings SET bill_prefix = 'INV-' WHERE bill_prefix IS NULL;
UPDATE public.business_settings SET next_bill_number = 1 WHERE next_bill_number IS NULL;
UPDATE public.business_settings SET theme = 'mint-pro' WHERE theme IS NULL;
UPDATE public.business_settings SET created_at = now() WHERE created_at IS NULL;
UPDATE public.business_settings SET updated_at = now() WHERE updated_at IS NULL;

-- Now add NOT NULL constraints
ALTER TABLE public.business_settings ALTER COLUMN business_name SET NOT NULL;
ALTER TABLE public.business_settings ALTER COLUMN business_name SET DEFAULT 'My Business';
ALTER TABLE public.business_settings ALTER COLUMN currency SET NOT NULL;
ALTER TABLE public.business_settings ALTER COLUMN currency SET DEFAULT 'USD';
ALTER TABLE public.business_settings ALTER COLUMN currency_symbol SET NOT NULL;
ALTER TABLE public.business_settings ALTER COLUMN currency_symbol SET DEFAULT '$';
ALTER TABLE public.business_settings ALTER COLUMN tax_name SET NOT NULL;
ALTER TABLE public.business_settings ALTER COLUMN tax_name SET DEFAULT 'Tax';
ALTER TABLE public.business_settings ALTER COLUMN tax_rate SET NOT NULL;
ALTER TABLE public.business_settings ALTER COLUMN tax_rate SET DEFAULT 0;
ALTER TABLE public.business_settings ALTER COLUMN tax_inclusive SET NOT NULL;
ALTER TABLE public.business_settings ALTER COLUMN tax_inclusive SET DEFAULT false;
ALTER TABLE public.business_settings ALTER COLUMN bill_prefix SET NOT NULL;
ALTER TABLE public.business_settings ALTER COLUMN bill_prefix SET DEFAULT 'INV-';
ALTER TABLE public.business_settings ALTER COLUMN next_bill_number SET NOT NULL;
ALTER TABLE public.business_settings ALTER COLUMN next_bill_number SET DEFAULT 1;
ALTER TABLE public.business_settings ALTER COLUMN theme SET NOT NULL;
ALTER TABLE public.business_settings ALTER COLUMN theme SET DEFAULT 'mint-pro';
ALTER TABLE public.business_settings ALTER COLUMN created_at SET NOT NULL;
ALTER TABLE public.business_settings ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE public.business_settings ALTER COLUMN updated_at SET NOT NULL;
ALTER TABLE public.business_settings ALTER COLUMN updated_at SET DEFAULT now();

-- Add multi-tenancy columns if they don't exist
ALTER TABLE public.business_settings ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE;
ALTER TABLE public.bills ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE;
ALTER TABLE public.inventory_logs ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES public.businesses(id) ON DELETE SET NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS mobile_number TEXT;
ALTER TABLE public.business_settings ADD COLUMN IF NOT EXISTS show_gst_in_billing boolean NOT NULL DEFAULT true;
ALTER TABLE public.business_settings ADD COLUMN IF NOT EXISTS show_discount_in_billing boolean NOT NULL DEFAULT true;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS icon text DEFAULT 'Package';
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE;

-- Add unique constraints (handle if they already exist)
DO $$ BEGIN
  ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_business_id_key UNIQUE (user_id, business_id);
EXCEPTION
  WHEN duplicate_table THEN NULL;
  WHEN others THEN NULL;
END $$;

-- Drop old constraint if it exists
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_role_key;

-- ============================================================
-- PART 3: Functions (CREATE OR REPLACE)
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email))
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

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

  INSERT INTO public.user_roles (user_id, business_id, role)
  VALUES (_user_id, _business_id, 'admin')
  ON CONFLICT (user_id, business_id) DO UPDATE SET role = 'admin';

  UPDATE public.profiles
  SET business_id = _business_id, mobile_number = _mobile_number
  WHERE user_id = _user_id;

  -- Note: business_settings are created/managed separately via the app

  RETURN json_build_object(
    'success', true,
    'business_id', _business_id,
    'join_code', _join_code
  );
END;
$$;

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
    RETURN json_build_object('success', false, 'error', 'Invalid business code. Please check with your business owner.');
  END IF;

  SELECT COUNT(*) INTO _member_count FROM public.user_roles WHERE business_id = _business.id;

  IF _member_count >= _business.max_members THEN
    RETURN json_build_object('success', false, 'error', 'This business has reached the maximum of 8 members.');
  END IF;

  IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND business_id = _business.id) THEN
    RETURN json_build_object('success', false, 'error', 'You are already a member of this business.');
  END IF;

  IF _role = 'admin' THEN
    _role := 'cashier';
  END IF;

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
-- PART 4: Triggers (Drop and recreate to ensure they exist)
-- ============================================================

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_business_settings_updated_at ON public.business_settings;
CREATE TRIGGER update_business_settings_updated_at BEFORE UPDATE ON public.business_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_categories_updated_at ON public.categories;
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_products_updated_at ON public.products;
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_customers_updated_at ON public.customers;
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_bills_updated_at ON public.bills;
CREATE TRIGGER update_bills_updated_at BEFORE UPDATE ON public.bills FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_businesses_updated_at ON public.businesses;
CREATE TRIGGER update_businesses_updated_at BEFORE UPDATE ON public.businesses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- PART 5: Enable RLS
-- ============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bill_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- PART 6: RLS Policies (Drop and recreate)
-- ============================================================

-- Profiles
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- User Roles
DROP POLICY IF EXISTS "Authenticated users can view roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view roles in their business" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage roles in their business" ON public.user_roles;
CREATE POLICY "Users can view roles in their business" ON public.user_roles
  FOR SELECT TO authenticated
  USING (business_id = public.get_user_business_id(auth.uid()) OR user_id = auth.uid());
CREATE POLICY "Admins can manage roles in their business" ON public.user_roles
  FOR ALL TO authenticated
  USING (business_id = public.get_user_business_id(auth.uid()) AND public.has_role(auth.uid(), 'admin'));

-- Business Settings
DROP POLICY IF EXISTS "Authenticated users can view settings" ON public.business_settings;
DROP POLICY IF EXISTS "Admins can update settings" ON public.business_settings;
DROP POLICY IF EXISTS "Users can view own business settings" ON public.business_settings;
DROP POLICY IF EXISTS "Admins can update own business settings" ON public.business_settings;
CREATE POLICY "Users can view own business settings" ON public.business_settings
  FOR SELECT TO authenticated
  USING (business_id = public.get_user_business_id(auth.uid()));
CREATE POLICY "Admins can update own business settings" ON public.business_settings
  FOR UPDATE TO authenticated
  USING (business_id = public.get_user_business_id(auth.uid()) AND public.has_role(auth.uid(), 'admin'));

-- Categories
DROP POLICY IF EXISTS "Authenticated users can view categories" ON public.categories;
DROP POLICY IF EXISTS "Admins can manage categories" ON public.categories;
DROP POLICY IF EXISTS "Admins can update categories" ON public.categories;
DROP POLICY IF EXISTS "Admins can delete categories" ON public.categories;
DROP POLICY IF EXISTS "Users can view own business categories" ON public.categories;
DROP POLICY IF EXISTS "Admin/Manager can insert categories" ON public.categories;
DROP POLICY IF EXISTS "Admin/Manager can update categories" ON public.categories;
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

-- Products
DROP POLICY IF EXISTS "Authenticated users can view products" ON public.products;
DROP POLICY IF EXISTS "Admins can insert products" ON public.products;
DROP POLICY IF EXISTS "Admins can update products" ON public.products;
DROP POLICY IF EXISTS "Admins can delete products" ON public.products;
DROP POLICY IF EXISTS "Users can view own business products" ON public.products;
DROP POLICY IF EXISTS "Admin/Manager can insert products" ON public.products;
DROP POLICY IF EXISTS "Admin/Manager can update products" ON public.products;
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

-- Customers
DROP POLICY IF EXISTS "Authenticated users can view customers" ON public.customers;
DROP POLICY IF EXISTS "Admin and staff can insert customers" ON public.customers;
DROP POLICY IF EXISTS "Admin and staff can update customers" ON public.customers;
DROP POLICY IF EXISTS "Admins can delete customers" ON public.customers;
DROP POLICY IF EXISTS "Users can view own business customers" ON public.customers;
DROP POLICY IF EXISTS "Admin/Manager can insert customers" ON public.customers;
DROP POLICY IF EXISTS "Admin/Manager can update customers" ON public.customers;
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

-- Bills
DROP POLICY IF EXISTS "Authenticated users can view bills" ON public.bills;
DROP POLICY IF EXISTS "Admin and staff can create bills" ON public.bills;
DROP POLICY IF EXISTS "Admin and staff can update bills" ON public.bills;
DROP POLICY IF EXISTS "Admins can delete bills" ON public.bills;
DROP POLICY IF EXISTS "Users can view own business bills" ON public.bills;
DROP POLICY IF EXISTS "All business members can create bills" ON public.bills;
DROP POLICY IF EXISTS "Admin/Manager can update bills" ON public.bills;
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

-- Bill Items
DROP POLICY IF EXISTS "Authenticated users can view bill items" ON public.bill_items;
DROP POLICY IF EXISTS "Admin and staff can insert bill items" ON public.bill_items;
DROP POLICY IF EXISTS "Admin and staff can update bill items" ON public.bill_items;
DROP POLICY IF EXISTS "Admin and staff can delete bill items" ON public.bill_items;
DROP POLICY IF EXISTS "Users can view own business bill items" ON public.bill_items;
DROP POLICY IF EXISTS "Business members can insert bill items" ON public.bill_items;
DROP POLICY IF EXISTS "Business members can update bill items" ON public.bill_items;
DROP POLICY IF EXISTS "Business members can delete bill items" ON public.bill_items;
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

-- Inventory Logs
DROP POLICY IF EXISTS "Authenticated users can view inventory logs" ON public.inventory_logs;
DROP POLICY IF EXISTS "Admins can insert inventory logs" ON public.inventory_logs;
DROP POLICY IF EXISTS "Users can view own business inventory logs" ON public.inventory_logs;
DROP POLICY IF EXISTS "Admin/Manager can insert inventory logs" ON public.inventory_logs;
CREATE POLICY "Users can view own business inventory logs" ON public.inventory_logs
  FOR SELECT TO authenticated
  USING (business_id = public.get_user_business_id(auth.uid()));
CREATE POLICY "Admin/Manager can insert inventory logs" ON public.inventory_logs
  FOR INSERT TO authenticated
  WITH CHECK (business_id = public.get_user_business_id(auth.uid()) AND public.is_admin_or_manager(auth.uid()));

-- Businesses
DROP POLICY IF EXISTS "Users can view their business" ON public.businesses;
DROP POLICY IF EXISTS "Owners can update their business" ON public.businesses;
DROP POLICY IF EXISTS "Authenticated users can create business" ON public.businesses;
CREATE POLICY "Users can view their business" ON public.businesses
  FOR SELECT TO authenticated
  USING (id = public.get_user_business_id(auth.uid()) OR owner_id = auth.uid());
CREATE POLICY "Owners can update their business" ON public.businesses
  FOR UPDATE TO authenticated
  USING (owner_id = auth.uid());
CREATE POLICY "Authenticated users can create business" ON public.businesses
  FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());
