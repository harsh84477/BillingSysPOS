-- ================================================
-- POS System - Fresh Database Setup
-- Single consolidated migration (replaces all previous migration files)
-- Run this AFTER RESET_DATABASE.sql in Supabase SQL Editor
-- ================================================

-- ===========================
-- 1. CUSTOM TYPES
-- ===========================
DROP TYPE IF EXISTS public.bill_status CASCADE;
DROP TYPE IF EXISTS public.app_role CASCADE;
CREATE TYPE public.app_role AS ENUM ('super_admin', 'admin', 'manager', 'cashier');
CREATE TYPE public.bill_status AS ENUM ('draft', 'completed', 'cancelled');

-- ===========================
-- 2. TABLES (Clean start)
-- ===========================
DROP TABLE IF EXISTS public.bill_items CASCADE;
DROP TABLE IF EXISTS public.bills CASCADE;
DROP TABLE IF EXISTS public.inventory_logs CASCADE;
DROP TABLE IF EXISTS public.products CASCADE;
DROP TABLE IF EXISTS public.categories CASCADE;
DROP TABLE IF EXISTS public.customers CASCADE;
DROP TABLE IF EXISTS public.business_settings CASCADE;
DROP TABLE IF EXISTS public.user_roles CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.businesses CASCADE;

-- Businesses (multi-tenancy root)
CREATE TABLE public.businesses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  business_name TEXT,
  owner_name TEXT,
  business_email TEXT,
  mobile_number TEXT,
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  join_code TEXT UNIQUE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- User profiles (synced from auth.users)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  is_blocked BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- User roles (links users to businesses with roles)
CREATE TABLE public.user_roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL DEFAULT 'cashier',
  bill_prefix TEXT,
  next_bill_number INTEGER DEFAULT 1,
  last_bill_date DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, business_id)
);

-- Business settings
CREATE TABLE public.business_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
  business_name TEXT DEFAULT 'My Business',
  address TEXT,
  phone TEXT,
  email TEXT,
  currency_symbol TEXT DEFAULT '₹',
  tax_rate NUMERIC DEFAULT 0,
  low_stock_threshold INTEGER DEFAULT 10,
  theme TEXT DEFAULT 'light',
  show_gst_in_billing BOOLEAN DEFAULT true,
  show_discount_in_billing BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Categories
CREATE TABLE public.categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#3B82F6',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Products
CREATE TABLE public.products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  selling_price NUMERIC NOT NULL DEFAULT 0,
  cost_price NUMERIC DEFAULT 0,
  stock_quantity INTEGER DEFAULT 0,
  low_stock_threshold INTEGER DEFAULT 10,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  icon TEXT DEFAULT 'Package',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Customers
CREATE TABLE public.customers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Bills
CREATE TABLE public.bills (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
  bill_number TEXT NOT NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status public.bill_status DEFAULT 'draft',
  subtotal NUMERIC DEFAULT 0,
  discount_type TEXT DEFAULT 'flat',
  discount_value NUMERIC DEFAULT 0,
  discount_amount NUMERIC DEFAULT 0,
  tax_amount NUMERIC DEFAULT 0,
  total_amount NUMERIC DEFAULT 0,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Bill items
CREATE TABLE public.bill_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  bill_id UUID REFERENCES public.bills(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id),
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  cost_price NUMERIC DEFAULT 0,
  total_price NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Inventory logs
CREATE TABLE public.inventory_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  change_type TEXT NOT NULL,
  quantity_change INTEGER NOT NULL,
  previous_quantity INTEGER,
  new_quantity INTEGER,
  reference_id UUID,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ===========================
-- 3. HELPER FUNCTIONS & OPERATIONS (Clean start)
-- ===========================

-- Drop existing functions to allow signature changes
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.generate_join_code() CASCADE;
DROP FUNCTION IF EXISTS public.get_user_business_id(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.get_user_business_id() CASCADE; -- Old signature
DROP FUNCTION IF EXISTS public.is_admin_or_manager(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.is_admin_or_manager() CASCADE; -- Old signature
DROP FUNCTION IF EXISTS public.has_role(public.app_role, UUID) CASCADE;
DROP FUNCTION IF EXISTS public.has_role(public.app_role) CASCADE; -- Old signature
DROP FUNCTION IF EXISTS public.create_business(TEXT, TEXT, TEXT, TEXT, UUID) CASCADE;
DROP FUNCTION IF EXISTS public.create_business(TEXT, TEXT, UUID) CASCADE; -- Mid signature
DROP FUNCTION IF EXISTS public.create_business(TEXT) CASCADE; -- Old signature
DROP FUNCTION IF EXISTS public.join_business(TEXT, UUID, public.app_role) CASCADE;
DROP FUNCTION IF EXISTS public.join_business(TEXT) CASCADE; -- Old signature
DROP FUNCTION IF EXISTS public.regenerate_join_code(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.assign_bill_prefix(UUID, UUID, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.assign_bill_prefix(UUID, TEXT) CASCADE; -- Old signature
DROP FUNCTION IF EXISTS public.get_next_bill_number(UUID) CASCADE;

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Auto-create profile when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Generate random 6-char join code
CREATE OR REPLACE FUNCTION public.generate_join_code()
RETURNS TEXT AS $$
DECLARE
  code TEXT;
  exists_count INTEGER;
BEGIN
  LOOP
    code := upper(substr(md5(random()::text), 1, 6));
    SELECT COUNT(*) INTO exists_count FROM public.businesses WHERE join_code = code;
    EXIT WHEN exists_count = 0;
  END LOOP;
  RETURN code;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Check if user is a super admin
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = _user_id AND role = 'super_admin'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- Get user's business ID
CREATE OR REPLACE FUNCTION public.get_user_business_id(_user_id UUID)
RETURNS UUID AS $$
  SELECT business_id FROM public.user_roles WHERE user_id = _user_id AND role != 'super_admin' LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- Check if user is admin or manager
CREATE OR REPLACE FUNCTION public.is_admin_or_manager(_user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
    AND role IN ('super_admin', 'admin', 'manager')
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- Check if user has specific role
CREATE OR REPLACE FUNCTION public.has_role(_role public.app_role, _user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
    AND role = _role
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- ===========================
-- 4. BUSINESS OPERATIONS
-- ===========================

-- Create a new business (called during onboarding)
CREATE OR REPLACE FUNCTION public.create_business(
  _business_name TEXT,
  _owner_name TEXT,
  _email TEXT,
  _mobile_number TEXT,
  _user_id UUID
)
RETURNS JSON AS $$
DECLARE
  _business_id UUID;
  _join_code TEXT;
BEGIN
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id) THEN
    RETURN json_build_object('success', false, 'error', 'You already own a business');
  END IF;

  _join_code := public.generate_join_code();

  INSERT INTO public.businesses (name, business_name, owner_name, business_email, mobile_number, owner_id, join_code, created_by)
  VALUES (_business_name, _business_name, _owner_name, _email, _mobile_number, _user_id, _join_code, _user_id)
  RETURNING id INTO _business_id;

  INSERT INTO public.user_roles (user_id, business_id, role, bill_prefix)
  VALUES (_user_id, _business_id, 'admin', 'A');

  INSERT INTO public.business_settings (business_id, business_name, phone, email)
  VALUES (_business_id, _business_name, _mobile_number, _email);

  RETURN json_build_object(
    'success', true,
    'business_id', _business_id,
    'join_code', _join_code
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Join an existing business via code
CREATE OR REPLACE FUNCTION public.join_business(
  _join_code TEXT,
  _user_id UUID,
  _role public.app_role DEFAULT 'cashier'
)
RETURNS JSON AS $$
DECLARE
  _business_id UUID;
  _next_prefix TEXT;
  _prefix_count INTEGER;
BEGIN
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id) THEN
    RETURN json_build_object('success', false, 'error', 'You already belong to a business');
  END IF;

  SELECT id INTO _business_id
  FROM public.businesses
  WHERE join_code = upper(_join_code);

  IF _business_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Invalid join code');
  END IF;

  -- Get next available prefix letter
  SELECT COUNT(*) INTO _prefix_count
  FROM public.user_roles
  WHERE business_id = _business_id;

  _next_prefix := chr(65 + _prefix_count); -- A=65, B=66, etc.

  INSERT INTO public.user_roles (user_id, business_id, role, bill_prefix)
  VALUES (_user_id, _business_id, _role, _next_prefix);

  RETURN json_build_object(
    'success', true,
    'business_id', _business_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Regenerate join code for a business (admin only)
CREATE OR REPLACE FUNCTION public.regenerate_join_code(_user_id UUID)
RETURNS JSON AS $$
DECLARE
  _new_code TEXT;
  _business_id UUID;
BEGIN
  -- Get the user's business where they are admin
  SELECT business_id INTO _business_id
  FROM public.user_roles
  WHERE user_id = _user_id
  AND role = 'admin';

  IF _business_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Only admins can regenerate join codes');
  END IF;

  _new_code := public.generate_join_code();

  UPDATE public.businesses
  SET join_code = _new_code
  WHERE id = _business_id;

  RETURN json_build_object('success', true, 'join_code', _new_code);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ===========================
-- 5. BILL NUMBERING SYSTEM
-- ===========================

-- Assign bill prefix to a user (called by admin)
CREATE OR REPLACE FUNCTION public.assign_bill_prefix(
  _admin_user_id UUID,
  _target_user_id UUID,
  _prefix TEXT
)
RETURNS JSON AS $$
DECLARE
  _business_id UUID;
BEGIN
  SELECT business_id INTO _business_id
  FROM public.user_roles
  WHERE user_id = _admin_user_id
  AND role = 'admin';

  IF _business_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Only admins can assign prefixes');
  END IF;

  -- Check prefix not already in use
  IF EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE business_id = _business_id
    AND bill_prefix = upper(_prefix)
    AND user_id != _target_user_id
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Prefix already in use');
  END IF;

  UPDATE public.user_roles
  SET bill_prefix = upper(_prefix)
  WHERE user_id = _target_user_id
  AND business_id = _business_id;

  RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Get next bill number atomically (per-user, daily reset)
CREATE OR REPLACE FUNCTION public.get_next_bill_number(_user_id UUID)
RETURNS JSON AS $$
DECLARE
  _prefix TEXT;
  _next_num INTEGER;
  _last_date DATE;
  _today DATE := CURRENT_DATE;
  _bill_number TEXT;
BEGIN
  -- Lock the row for atomic update
  SELECT bill_prefix, next_bill_number, last_bill_date
  INTO _prefix, _next_num, _last_date
  FROM public.user_roles
  WHERE user_id = _user_id
  FOR UPDATE;

  IF _prefix IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'No bill prefix assigned. Contact your admin.');
  END IF;

  -- Reset numbering if new day
  IF _last_date IS NULL OR _last_date < _today THEN
    _next_num := 1;
  END IF;

  -- Build bill number: PREFIX + MMDD + 0001
  _bill_number := _prefix
    || to_char(_today, 'MMDD')
    || lpad(_next_num::TEXT, 4, '0');

  -- Increment counter
  UPDATE public.user_roles
  SET next_bill_number = _next_num + 1,
      last_bill_date = _today
  WHERE user_id = _user_id;

  RETURN json_build_object(
    'success', true,
    'bill_number', _bill_number
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ===========================
-- 6. TRIGGERS
-- ===========================

-- Auth trigger: create profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Updated_at triggers for all relevant tables
CREATE TRIGGER update_businesses_updated_at
  BEFORE UPDATE ON public.businesses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_business_settings_updated_at
  BEFORE UPDATE ON public.business_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_customers_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bills_updated_at
  BEFORE UPDATE ON public.bills
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ===========================
-- 7. ROW LEVEL SECURITY
-- ===========================

-- Enable RLS on all tables
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bill_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_logs ENABLE ROW LEVEL SECURITY;

-- BUSINESSES
CREATE POLICY "Users can view their business"
  ON public.businesses FOR SELECT
  USING (
    public.is_super_admin(auth.uid())
    OR id IN (SELECT business_id FROM public.user_roles WHERE user_id = auth.uid())
  );

CREATE POLICY "Super admins can manage businesses"
  ON public.businesses FOR ALL
  USING (public.is_super_admin(auth.uid()));

-- PROFILES
CREATE POLICY "Users can view all profiles"
  ON public.profiles FOR SELECT
  USING (NOT is_blocked OR public.is_super_admin(auth.uid()));

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (id = auth.uid() AND NOT is_blocked);

CREATE POLICY "Super admins can manage profiles"
  ON public.profiles FOR ALL
  USING (public.is_super_admin(auth.uid()));

-- USER ROLES
CREATE POLICY "Users can view roles in their business"
  ON public.user_roles FOR SELECT
  USING (
    public.is_super_admin(auth.uid())
    OR business_id IN (SELECT business_id FROM public.user_roles ur WHERE ur.user_id = auth.uid())
    OR user_id = auth.uid()
  );

CREATE POLICY "Admins can manage roles"
  ON public.user_roles FOR ALL
  USING (
    public.is_super_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.business_id = public.user_roles.business_id
      AND ur.role = 'admin'
    )
  );

-- BUSINESS SETTINGS
CREATE POLICY "Users can view their business settings"
  ON public.business_settings FOR SELECT
  USING (
    public.is_super_admin(auth.uid())
    OR business_id IS NULL
    OR business_id IN (SELECT business_id FROM public.user_roles WHERE user_id = auth.uid())
  );

CREATE POLICY "Admins can update business settings"
  ON public.business_settings FOR UPDATE
  USING (
    public.is_super_admin(auth.uid())
    OR business_id IN (
      SELECT business_id FROM public.user_roles
      WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Admins can insert business settings"
  ON public.business_settings FOR INSERT
  WITH CHECK (
    public.is_super_admin(auth.uid())
    OR business_id IN (
      SELECT business_id FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- CATEGORIES
CREATE POLICY "Users can view categories in their business"
  ON public.categories FOR SELECT
  USING (
    public.is_super_admin(auth.uid())
    OR business_id IS NULL
    OR business_id IN (SELECT business_id FROM public.user_roles WHERE user_id = auth.uid())
  );

CREATE POLICY "Admins can manage categories"
  ON public.categories FOR ALL
  USING (
    public.is_super_admin(auth.uid())
    OR business_id IN (
      SELECT business_id FROM public.user_roles
      WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

-- PRODUCTS
CREATE POLICY "Users can view products in their business"
  ON public.products FOR SELECT
  USING (
    public.is_super_admin(auth.uid())
    OR business_id IS NULL
    OR business_id IN (SELECT business_id FROM public.user_roles WHERE user_id = auth.uid())
  );

CREATE POLICY "Admins can manage products"
  ON public.products FOR ALL
  USING (
    public.is_super_admin(auth.uid())
    OR business_id IS NULL
    OR business_id IN (
      SELECT business_id FROM public.user_roles
      WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

-- CUSTOMERS
CREATE POLICY "Users can view customers in their business"
  ON public.customers FOR SELECT
  USING (
    public.is_super_admin(auth.uid())
    OR business_id IS NULL
    OR business_id IN (SELECT business_id FROM public.user_roles WHERE user_id = auth.uid())
  );

CREATE POLICY "Staff can manage customers"
  ON public.customers FOR ALL
  USING (
    public.is_super_admin(auth.uid())
    OR business_id IS NULL
    OR business_id IN (
      SELECT business_id FROM public.user_roles
      WHERE user_id = auth.uid()
    )
  );

-- BILLS
CREATE POLICY "Users can view bills in their business"
  ON public.bills FOR SELECT
  USING (
    public.is_super_admin(auth.uid())
    OR business_id IS NULL
    OR business_id IN (SELECT business_id FROM public.user_roles WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can create bills"
  ON public.bills FOR INSERT
  WITH CHECK (
    NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_blocked)
    AND (
      public.is_super_admin(auth.uid())
      OR business_id IS NULL
      OR business_id IN (SELECT business_id FROM public.user_roles WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Admins can manage bills"
  ON public.bills FOR UPDATE
  USING (
    public.is_super_admin(auth.uid())
    OR business_id IS NULL
    OR business_id IN (
      SELECT business_id FROM public.user_roles
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can delete bills"
  ON public.bills FOR DELETE
  USING (
    public.is_super_admin(auth.uid())
    OR business_id IS NULL
    OR business_id IN (
      SELECT business_id FROM public.user_roles
      WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

-- BILL ITEMS
CREATE POLICY "Users can view bill items"
  ON public.bill_items FOR SELECT
  USING (
    bill_id IN (
      SELECT id FROM public.bills
      WHERE business_id IS NULL
      OR business_id IN (SELECT business_id FROM public.user_roles WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Users can create bill items"
  ON public.bill_items FOR INSERT
  WITH CHECK (
    bill_id IN (
      SELECT id FROM public.bills
      WHERE business_id IS NULL
      OR business_id IN (SELECT business_id FROM public.user_roles WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Users can delete bill items"
  ON public.bill_items FOR DELETE
  USING (
    bill_id IN (
      SELECT id FROM public.bills
      WHERE business_id IS NULL
      OR business_id IN (SELECT business_id FROM public.user_roles WHERE user_id = auth.uid())
    )
  );

-- INVENTORY LOGS
CREATE POLICY "Users can view inventory logs"
  ON public.inventory_logs FOR SELECT
  USING (
    business_id IS NULL
    OR business_id IN (SELECT business_id FROM public.user_roles WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can create inventory logs"
  ON public.inventory_logs FOR INSERT
  WITH CHECK (
    business_id IS NULL
    OR business_id IN (SELECT business_id FROM public.user_roles WHERE user_id = auth.uid())
  );
