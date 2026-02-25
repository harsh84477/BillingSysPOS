-- ============================================================
-- 01. SCHEMA: Types and Tables (Consolidated)
-- ============================================================

-- TYPES
CREATE TYPE public.app_role AS ENUM ('admin', 'manager', 'cashier', 'salesman');
CREATE TYPE public.bill_status AS ENUM ('draft', 'completed', 'cancelled');

-- TABLES

-- 1. Businesses
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

-- 2. Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  display_name TEXT,
  business_id UUID REFERENCES public.businesses(id) ON DELETE SET NULL,
  mobile_number TEXT,
  theme TEXT,
  is_blocked BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. User Roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  bill_prefix TEXT CHECK (length(bill_prefix) <= 2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT user_roles_user_id_business_id_key UNIQUE (user_id, business_id)
);

-- 4. Business Settings (Consolidated with all patches)
CREATE TABLE public.business_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE UNIQUE,
  business_name TEXT NOT NULL DEFAULT 'My Business',
  address TEXT,
  phone TEXT,
  email TEXT,
  logo_url TEXT,
  currency TEXT NOT NULL DEFAULT 'INR',
  currency_symbol TEXT NOT NULL DEFAULT '₹',
  tax_name TEXT NOT NULL DEFAULT 'GST',
  tax_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  tax_inclusive BOOLEAN NOT NULL DEFAULT false,
  bill_prefix TEXT NOT NULL DEFAULT 'INV',
  next_bill_number INTEGER NOT NULL DEFAULT 1,
  theme TEXT NOT NULL DEFAULT 'mint-pro',
  show_gst_in_billing BOOLEAN NOT NULL DEFAULT true,
  show_discount_in_billing BOOLEAN NOT NULL DEFAULT true,
  
  -- Invoice customization (Sync with frontend)
  invoice_style TEXT DEFAULT 'classic', -- 'classic' | 'modern' | 'detailed'
  invoice_font_size INTEGER DEFAULT 12,
  invoice_spacing INTEGER DEFAULT 1,
  invoice_show_borders BOOLEAN DEFAULT true,
  invoice_show_item_price BOOLEAN DEFAULT true,
  invoice_footer_message TEXT,
  invoice_footer_font_size INTEGER DEFAULT 10,
  invoice_header_align TEXT DEFAULT 'left',
  invoice_show_business_phone BOOLEAN DEFAULT true,
  invoice_show_business_email BOOLEAN DEFAULT true,
  invoice_show_business_address BOOLEAN DEFAULT true,
  invoice_terms_conditions TEXT,
  invoice_paper_width TEXT DEFAULT '80mm',
  invoice_show_qr_code BOOLEAN DEFAULT true,
  upi_id TEXT,
  gst_number TEXT,
  invoice_show_gst BOOLEAN DEFAULT true,
  invoice_show_unit_price BOOLEAN DEFAULT true,

  -- Product grid display settings
  product_button_size TEXT DEFAULT 'medium', -- 'small' | 'medium' | 'large' | 'xlarge'
  product_columns INTEGER DEFAULT 5,
  grid_gap INTEGER DEFAULT 8,
  show_stock_badge BOOLEAN DEFAULT true,
  show_product_code BOOLEAN DEFAULT false,
  show_cost_price BOOLEAN DEFAULT false,
  auto_fit_enabled BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Subscription Plans
CREATE TABLE public.subscription_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC(10, 2) NOT NULL,
    billing_period TEXT NOT NULL CHECK (billing_period IN ('monthly', '6_months', 'yearly')),
    features JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Subscriptions
CREATE TABLE public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE UNIQUE,
    plan_id UUID REFERENCES public.subscription_plans(id),
    status TEXT NOT NULL DEFAULT 'trialing' CHECK (status IN ('active', 'trialing', 'expired', 'cancelled')),
    trial_end TIMESTAMPTZ,
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    cancel_at_period_end BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Categories
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT DEFAULT 'Package',
  color TEXT DEFAULT '#3B82F6',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. Products
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  selling_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  cost_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  reserved_quantity INTEGER NOT NULL DEFAULT 0,
  low_stock_threshold INTEGER NOT NULL DEFAULT 10,
  image_url TEXT,
  icon TEXT DEFAULT 'Package',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. Customers
CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 10. Bills
CREATE TABLE public.bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
  bill_number TEXT NOT NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status public.bill_status NOT NULL DEFAULT 'draft',
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount_type TEXT CHECK (discount_type IN ('flat', 'percent')),
  discount_value NUMERIC(12,2) DEFAULT 0,
  discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  notes TEXT,
  salesman_name TEXT,
  payment_type TEXT,
  payment_status TEXT DEFAULT 'unpaid',
  paid_amount NUMERIC(12,2) DEFAULT 0,
  due_amount NUMERIC(12,2) DEFAULT 0,
  due_date DATE,
  profit NUMERIC(12,2) DEFAULT 0,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT bills_bill_number_business_unique UNIQUE (business_id, bill_number)
);

-- 11. Bill Items
CREATE TABLE public.bill_items (
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

-- 12. Inventory Logs
CREATE TABLE public.inventory_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  change_quantity INTEGER NOT NULL,
  previous_quantity INTEGER NOT NULL,
  new_quantity INTEGER NOT NULL,
  reason TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 13. Super Admins
CREATE TABLE public.super_admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    display_name TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 14. Super Admin Credentials
CREATE TABLE public.super_admin_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    display_name TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 15. Admin Logs
CREATE TABLE public.admin_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id TEXT NOT NULL,
    action TEXT NOT NULL,
    target_id TEXT,
    target_type TEXT,
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 16. Performance Indices
CREATE INDEX IF NOT EXISTS idx_profiles_business_id ON public.profiles(business_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_business_id ON public.user_roles(business_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_categories_business_id ON public.categories(business_id);
CREATE INDEX IF NOT EXISTS idx_products_business_id ON public.products(business_id);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_customers_business_id ON public.customers(business_id);
CREATE INDEX IF NOT EXISTS idx_bills_business_id ON public.bills(business_id);
CREATE INDEX IF NOT EXISTS idx_bills_customer_id ON public.bills(customer_id);
CREATE INDEX IF NOT EXISTS idx_bills_created_by ON public.bills(created_by);
CREATE INDEX IF NOT EXISTS idx_bill_items_bill_id ON public.bill_items(bill_id);
CREATE INDEX IF NOT EXISTS idx_bill_items_product_id ON public.bill_items(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_logs_business_id ON public.inventory_logs(business_id);
CREATE INDEX IF NOT EXISTS idx_inventory_logs_product_id ON public.inventory_logs(product_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_business_id ON public.subscriptions(business_id);
-- ============================================================
-- 02. LOGIC: Functions, Triggers, and Policies (Consolidated)
-- ============================================================

-- 1. TRIGGER FUNCTIONS

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

-- 2. HELPER FUNCTIONS

CREATE OR REPLACE FUNCTION public.generate_join_code()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  _code TEXT;
  _exists BOOLEAN;
BEGIN
  LOOP
    _code := upper(substr(md5(random()::text), 1, 6));
    SELECT EXISTS(SELECT 1 FROM public.businesses WHERE join_code = _code) INTO _exists;
    EXIT WHEN NOT _exists;
  END LOOP;
  RETURN _code;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_business_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Return the primary or most recent business the user is part of
  SELECT business_id FROM public.user_roles 
  WHERE user_id = _user_id 
  ORDER BY created_at DESC 
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
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id 
    AND role IN ('admin', 'manager')
    AND business_id = public.get_user_business_id(_user_id)
  )
$$;

CREATE OR REPLACE FUNCTION public.is_admin_or_staff(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id 
    AND role IN ('admin', 'manager', 'cashier')
    AND business_id = public.get_user_business_id(_user_id)
  )
$$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id 
    AND role = _role
    AND business_id = public.get_user_business_id(_user_id)
  )
$$;

CREATE OR REPLACE FUNCTION public.can_finalize_bill(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin', 'manager')
  )
$$;

CREATE OR REPLACE FUNCTION public.check_subscription_active(_business_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.subscriptions
        WHERE business_id = _business_id
        AND (status = 'active' OR (status = 'trialing' AND trial_end > now()))
        AND (current_period_end > now() OR trial_end > now())
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. RPCs (Business & Auth)

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
  _trial_end TIMESTAMPTZ;
BEGIN
  IF EXISTS (SELECT 1 FROM public.businesses WHERE owner_id = _user_id) THEN
    RETURN json_build_object('success', false, 'error', 'You already own a business');
  END IF;

  IF EXISTS (SELECT 1 FROM public.businesses WHERE mobile_number = _mobile_number) THEN
    RETURN json_build_object('success', false, 'error', 'This mobile number is already registered');
  END IF;

  _join_code := public.generate_join_code();
  _trial_end := now() + INTERVAL '30 days';

  INSERT INTO public.businesses (business_name, owner_id, mobile_number, join_code)
  VALUES (_business_name, _user_id, _mobile_number, _join_code)
  RETURNING id INTO _business_id;

  -- CRITICAL: Ensure Admin role is set
  INSERT INTO public.user_roles (user_id, business_id, role)
  VALUES (_user_id, _business_id, 'admin')
  ON CONFLICT (user_id, business_id) DO UPDATE SET role = 'admin';

  UPDATE public.profiles
  SET business_id = _business_id, mobile_number = _mobile_number
  WHERE user_id = _user_id;

  INSERT INTO public.business_settings (business_name, business_id)
  VALUES (_business_name, _business_id);

  -- Auto-provision trial
  INSERT INTO public.subscriptions (business_id, status, trial_end, current_period_end)
  VALUES (_business_id, 'trialing', _trial_end, _trial_end);

  RETURN json_build_object(
    'success', true,
    'business_id', _business_id,
    'join_code', _join_code,
    'trial_end', _trial_end
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.join_business(
  _join_code TEXT,
  _user_id UUID,
  _role public.app_role DEFAULT 'cashier'
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

CREATE OR REPLACE FUNCTION public.update_my_bill_prefix(_prefix TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF length(_prefix) > 2 THEN
      RETURN json_build_object('success', false, 'error', 'Prefix must be 2 characters or less');
  END IF;

  UPDATE public.user_roles
  SET bill_prefix = upper(_prefix)
  WHERE user_id = auth.uid()
  AND business_id = public.get_user_business_id(auth.uid());
  
  RETURN json_build_object('success', true);
END;
$$;

-- 4. RPCs (Billing Logic)

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
  -- Validate stock
  FOR _item IN SELECT * FROM jsonb_array_elements(_items)
  LOOP
    SELECT stock_quantity, reserved_quantity INTO _product FROM public.products WHERE id = (_item->>'product_id')::UUID FOR UPDATE;
    IF NOT FOUND THEN RETURN json_build_object('success', false, 'error', 'Product not found: ' || (_item->>'product_name')); END IF;
    _available := _product.stock_quantity - _product.reserved_quantity;
    IF _available < (_item->>'quantity')::INTEGER THEN
      RETURN json_build_object('success', false, 'error', 'Insufficient stock for ' || (_item->>'product_name'));
    END IF;
  END LOOP;

  INSERT INTO public.bills (business_id, bill_number, customer_id, created_by, status, subtotal, discount_type, discount_value, discount_amount, tax_amount, total_amount, salesman_name, payment_status, paid_amount, due_amount, profit)
  VALUES (_business_id, _bill_number, _customer_id, auth.uid(), 'draft', _subtotal, _discount_type, _discount_value, _discount_amount, _tax_amount, _total_amount, _salesman_name, 'unpaid', 0, _total_amount, 0)
  RETURNING id INTO _bill_id;

  FOR _item IN SELECT * FROM jsonb_array_elements(_items)
  LOOP
    INSERT INTO public.bill_items (bill_id, product_id, product_name, quantity, unit_price, cost_price, total_price)
    VALUES (_bill_id, (_item->>'product_id')::UUID, _item->>'product_name', (_item->>'quantity')::INTEGER, (_item->>'unit_price')::NUMERIC, (_item->>'cost_price')::NUMERIC, (_item->>'total_price')::NUMERIC);
    UPDATE public.products SET reserved_quantity = reserved_quantity + (_item->>'quantity')::INTEGER WHERE id = (_item->>'product_id')::UUID;
  END LOOP;

  RETURN json_build_object('success', true, 'bill_id', _bill_id);
END;
$$;

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
BEGIN
  IF NOT public.can_finalize_bill(auth.uid()) THEN RETURN json_build_object('success', false, 'error', 'Permission denied'); END IF;
  SELECT * INTO _bill FROM public.bills WHERE id = _bill_id AND status = 'draft' FOR UPDATE;
  IF NOT FOUND THEN RETURN json_build_object('success', false, 'error', 'Draft not found'); END IF;

  FOR _item IN SELECT * FROM public.bill_items WHERE bill_id = _bill_id
  LOOP
    UPDATE public.products SET stock_quantity = stock_quantity - _item.quantity, reserved_quantity = GREATEST(0, reserved_quantity - _item.quantity) WHERE id = _item.product_id;
  END LOOP;

  UPDATE public.bills SET status = 'completed', completed_at = now(), payment_type = _payment_type, payment_status = _payment_status, paid_amount = _paid_amount, due_amount = _due_amount, due_date = _due_date, profit = (SELECT COALESCE(SUM((bi.unit_price - bi.cost_price) * bi.quantity), 0) FROM public.bill_items bi WHERE bi.bill_id = _bill_id)
  WHERE id = _bill_id;

  RETURN json_build_object('success', true, 'bill_id', _bill_id);
END;
$$;

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
  SELECT * INTO _bill FROM public.bills WHERE id = _bill_id AND status = 'draft' FOR UPDATE;
  IF NOT FOUND THEN RETURN json_build_object('success', false, 'error', 'Draft not found'); END IF;
  
  IF _bill.created_by != auth.uid() AND NOT public.can_finalize_bill(auth.uid()) THEN
    RETURN json_build_object('success', false, 'error', 'Permission denied');
  END IF;

  FOR _item IN SELECT * FROM public.bill_items WHERE bill_id = _bill_id
  LOOP
    UPDATE public.products SET reserved_quantity = GREATEST(0, reserved_quantity - _item.quantity) WHERE id = _item.product_id;
  END LOOP;

  DELETE FROM public.bill_items WHERE bill_id = _bill_id;
  UPDATE public.bills SET status = 'cancelled' WHERE id = _bill_id;
  RETURN json_build_object('success', true);
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
BEGIN
  SELECT * INTO _bill FROM public.bills WHERE id = _bill_id AND status = 'draft' FOR UPDATE;
  IF NOT FOUND THEN RETURN json_build_object('success', false, 'error', 'Draft not found'); END IF;
  
  IF _bill.created_by != auth.uid() AND NOT public.can_finalize_bill(auth.uid()) THEN
    RETURN json_build_object('success', false, 'error', 'Permission denied');
  END IF;

  -- Restore old stock
  FOR _old_item IN SELECT * FROM public.bill_items WHERE bill_id = _bill_id
  LOOP
    UPDATE public.products SET reserved_quantity = GREATEST(0, reserved_quantity - _old_item.quantity) WHERE id = _old_item.product_id;
  END LOOP;

  -- Validate/Reserve new stock
  FOR _item IN SELECT * FROM jsonb_array_elements(_items) LOOP
    SELECT stock_quantity, reserved_quantity INTO _product FROM public.products WHERE id = (_item->>'product_id')::UUID FOR UPDATE;
    _available := _product.stock_quantity - _product.reserved_quantity;
    IF _available < (_item->>'quantity')::INTEGER THEN RAISE EXCEPTION 'Insufficient stock for %', (_item->>'product_name'); END IF;
  END LOOP;

  DELETE FROM public.bill_items WHERE bill_id = _bill_id;

  FOR _item IN SELECT * FROM jsonb_array_elements(_items) LOOP
    INSERT INTO public.bill_items (bill_id, product_id, product_name, quantity, unit_price, cost_price, total_price)
    VALUES (_bill_id, (_item->>'product_id')::UUID, _item->>'product_name', (_item->>'quantity')::INTEGER, (_item->>'unit_price')::NUMERIC, (_item->>'cost_price')::NUMERIC, (_item->>'total_price')::NUMERIC);
    UPDATE public.products SET reserved_quantity = reserved_quantity + (_item->>'quantity')::INTEGER WHERE id = (_item->>'product_id')::UUID;
  END LOOP;

  UPDATE public.bills SET customer_id = _customer_id, subtotal = _subtotal, discount_type = _discount_type, discount_value = _discount_value, discount_amount = _discount_amount, tax_amount = _tax_amount, total_amount = _total_amount, due_amount = _total_amount, updated_at = now() WHERE id = _bill_id;
  RETURN json_build_object('success', true, 'bill_id', _bill_id);
END;
$$;

-- 5. RPCs (Super Admin & Stats)

CREATE OR REPLACE FUNCTION get_all_businesses_admin()
RETURNS TABLE(id UUID, business_name TEXT, mobile_number TEXT, join_code TEXT, address TEXT, created_at TIMESTAMPTZ, sub_id UUID, sub_status TEXT, sub_trial_end TIMESTAMPTZ, sub_period_end TIMESTAMPTZ, plan_id UUID, plan_name TEXT, plan_price NUMERIC)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
    SELECT b.id, b.business_name, b.mobile_number, b.join_code, bs.address, b.created_at, s.id as sub_id, s.status as sub_status, s.trial_end as sub_trial_end, s.current_period_end as sub_period_end, sp.id as plan_id, sp.name as plan_name, sp.price as plan_price
    FROM businesses b LEFT JOIN business_settings bs ON bs.business_id = b.id LEFT JOIN subscriptions s ON s.business_id = b.id LEFT JOIN subscription_plans sp ON sp.id = s.plan_id ORDER BY b.created_at DESC;
$$;

CREATE OR REPLACE FUNCTION get_platform_stats_v2()
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_res JSONB; BEGIN
    SELECT jsonb_build_object('total_businesses', (SELECT count(*) FROM businesses), 'total_users', (SELECT count(*) FROM profiles), 'active_subscriptions', (SELECT count(*) FROM subscriptions WHERE status = 'active' AND current_period_end > now()), 'trial_subscriptions', (SELECT count(*) FROM subscriptions WHERE status = 'trialing' AND trial_end > now()), 'new_businesses_30d', (SELECT count(*) FROM businesses WHERE created_at >= now() - INTERVAL '30 days')) INTO v_res;
    RETURN v_res;
END; $$;

CREATE OR REPLACE FUNCTION get_revenue_by_month()
RETURNS TABLE(month TEXT, revenue NUMERIC, bill_count BIGINT)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
    SELECT TO_CHAR(date_trunc('month', created_at), 'Mon YY') AS month, COALESCE(SUM(total_amount), 0) AS revenue, COUNT(*) AS bill_count FROM bills WHERE status = 'completed' AND created_at >= date_trunc('month', now()) - INTERVAL '5 months' GROUP BY date_trunc('month', created_at) ORDER BY date_trunc('month', created_at) ASC;
$$;

-- Additional admin RPCs (block, logs, summary) omitted for brevity or merged as per original files
-- ... (I'll keep the ones I saw in the migrations)

CREATE OR REPLACE FUNCTION get_subscription_overview()
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    RETURN jsonb_build_object('active', (SELECT count(*) FROM subscriptions WHERE status='active'), 'trialing', (SELECT count(*) FROM subscriptions WHERE status='trialing'), 'expired', (SELECT count(*) FROM subscriptions WHERE status='expired'), 'no_sub', (SELECT count(*) FROM businesses b WHERE NOT EXISTS (SELECT 1 FROM subscriptions s WHERE s.business_id = b.id)));
END; $$;

CREATE OR REPLACE FUNCTION get_all_subscriptions()
RETURNS TABLE(subscription_id UUID, business_id UUID, business_name TEXT, plan_id UUID, plan_name TEXT, plan_price NUMERIC, billing_period TEXT, status TEXT, trial_end TIMESTAMPTZ, current_period_end TIMESTAMPTZ, created_at TIMESTAMPTZ)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
    SELECT s.id, b.id, b.business_name, sp.id, sp.name, sp.price, sp.billing_period, s.status, s.trial_end, s.current_period_end, s.created_at FROM subscriptions s JOIN businesses b ON b.id = s.business_id LEFT JOIN subscription_plans sp ON sp.id = s.plan_id ORDER BY s.created_at DESC;
$$;

CREATE OR REPLACE FUNCTION get_business_users(p_business_id UUID)
RETURNS TABLE(user_id UUID, display_name TEXT, role TEXT, bill_prefix TEXT, is_blocked BOOLEAN, joined_at TIMESTAMPTZ)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
    SELECT ur.user_id, COALESCE(p.display_name, 'Unknown'), ur.role::TEXT, ur.bill_prefix, COALESCE(p.is_blocked, false), ur.created_at FROM user_roles ur LEFT JOIN profiles p ON p.user_id = ur.user_id WHERE ur.business_id = p_business_id ORDER BY ur.created_at ASC;
$$;

CREATE OR REPLACE FUNCTION get_all_platform_users()
RETURNS TABLE(user_id UUID, display_name TEXT, role TEXT, business_name TEXT, business_id UUID, is_blocked BOOLEAN, joined_at TIMESTAMPTZ)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
    SELECT ur.user_id, COALESCE(p.display_name, 'Unknown'), ur.role::TEXT, b.business_name, b.id, COALESCE(p.is_blocked, false), ur.created_at FROM user_roles ur LEFT JOIN profiles p ON p.user_id = ur.user_id LEFT JOIN businesses b ON b.id = ur.business_id ORDER BY ur.created_at DESC;
$$;

CREATE OR REPLACE FUNCTION block_user(p_user_id UUID) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$ BEGIN UPDATE profiles SET is_blocked = true WHERE user_id = p_user_id; END; $$;
CREATE OR REPLACE FUNCTION unblock_user(p_user_id UUID) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$ BEGIN UPDATE profiles SET is_blocked = false WHERE user_id = p_user_id; END; $$;
CREATE OR REPLACE FUNCTION log_admin_action(p_admin_id TEXT, p_action TEXT, p_target_id TEXT DEFAULT NULL, p_target_type TEXT DEFAULT NULL, p_details JSONB DEFAULT '{}'::jsonb) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$ BEGIN INSERT INTO admin_logs (admin_id, action, target_id, target_type, details) VALUES (p_admin_id, p_action, p_target_id, p_target_type, p_details); END; $$;
CREATE OR REPLACE FUNCTION get_admin_logs() RETURNS TABLE(id UUID, admin_id TEXT, action TEXT, target_id TEXT, target_type TEXT, details JSONB, created_at TIMESTAMPTZ) LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$ SELECT * FROM admin_logs ORDER BY created_at DESC LIMIT 200; $$;

CREATE OR REPLACE FUNCTION get_business_summary(p_business_id UUID) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    RETURN jsonb_build_object('bill_count', (SELECT count(*) FROM bills WHERE business_id = p_business_id), 'user_count', (SELECT count(*) FROM user_roles WHERE business_id = p_business_id), 'product_count', (SELECT count(*) FROM products WHERE business_id = p_business_id), 'total_revenue', (SELECT COALESCE(SUM(total_amount), 0) FROM bills WHERE business_id = p_business_id AND status = 'completed'));
END; $$;

CREATE OR REPLACE FUNCTION verify_super_admin_login(p_username TEXT, p_password_plain TEXT) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_admin RECORD; BEGIN
    SELECT * INTO v_admin FROM super_admin_credentials WHERE username = p_username;
    IF v_admin.id IS NULL OR v_admin.password_hash != p_password_plain THEN RETURN jsonb_build_object('success', false, 'error', 'Invalid login'); END IF;
    RETURN jsonb_build_object('success', true, 'admin_id', v_admin.id, 'display_name', v_admin.display_name);
END; $$;

-- 4. TRIGGERS

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_business_settings_updated_at BEFORE UPDATE ON public.business_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_bills_updated_at BEFORE UPDATE ON public.bills FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_businesses_updated_at BEFORE UPDATE ON public.businesses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. POLICIES (Consolidated)

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (user_id = auth.uid());

ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their business" ON public.businesses FOR SELECT TO authenticated USING (id = public.get_user_business_id(auth.uid()) OR owner_id = auth.uid());
CREATE POLICY "Owners can update their business" ON public.businesses FOR UPDATE TO authenticated USING (owner_id = auth.uid());
CREATE POLICY "Authenticated users can create business" ON public.businesses FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view roles in their business" ON public.user_roles FOR SELECT TO authenticated USING (business_id = public.get_user_business_id(auth.uid()) OR user_id = auth.uid());
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL TO authenticated USING (business_id = public.get_user_business_id(auth.uid()) AND public.has_role(auth.uid(), 'admin'));

ALTER TABLE public.business_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view settings" ON public.business_settings FOR SELECT TO authenticated USING (business_id = public.get_user_business_id(auth.uid()));
CREATE POLICY "Admins can manage settings" ON public.business_settings FOR ALL TO authenticated USING (business_id = public.get_user_business_id(auth.uid()) AND public.has_role(auth.uid(), 'admin'));

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view categories" ON public.categories FOR SELECT TO authenticated USING (business_id = public.get_user_business_id(auth.uid()));
CREATE POLICY "Admin/Manager can manage categories" ON public.categories FOR ALL TO authenticated USING (business_id = public.get_user_business_id(auth.uid()) AND public.is_admin_or_manager(auth.uid()));

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view products" ON public.products FOR SELECT TO authenticated USING (business_id = public.get_user_business_id(auth.uid()));
CREATE POLICY "Staff can update products" ON public.products FOR UPDATE TO authenticated USING (business_id = public.get_user_business_id(auth.uid()));
CREATE POLICY "Admin/Manager can manage products" ON public.products FOR ALL TO authenticated USING (business_id = public.get_user_business_id(auth.uid()) AND public.is_admin_or_manager(auth.uid()));

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view customers" ON public.customers FOR SELECT TO authenticated USING (business_id = public.get_user_business_id(auth.uid()));
CREATE POLICY "Admin/Manager can manage customers" ON public.customers FOR ALL TO authenticated USING (business_id = public.get_user_business_id(auth.uid()) AND public.is_admin_or_manager(auth.uid()));

ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view bills" ON public.bills FOR SELECT TO authenticated USING (business_id = public.get_user_business_id(auth.uid()));
CREATE POLICY "Members can create bills" ON public.bills FOR INSERT TO authenticated WITH CHECK (business_id = public.get_user_business_id(auth.uid()));
CREATE POLICY "Staff can update bills" ON public.bills FOR UPDATE TO authenticated USING (business_id = public.get_user_business_id(auth.uid()) AND (public.is_admin_or_manager(auth.uid()) OR (created_by = auth.uid() AND status = 'draft')));

ALTER TABLE public.bill_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage bill items" ON public.bill_items FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.bills WHERE bills.id = bill_items.bill_id AND bills.business_id = public.get_user_business_id(auth.uid())));

ALTER TABLE public.inventory_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view logs" ON public.inventory_logs FOR SELECT TO authenticated USING (business_id = public.get_user_business_id(auth.uid()));
CREATE POLICY "Auth staff can insert logs" ON public.inventory_logs FOR INSERT TO authenticated WITH CHECK (business_id = public.get_user_business_id(auth.uid()));

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Everyone view plans" ON public.subscription_plans FOR SELECT USING (true);
CREATE POLICY "Owners view sub" ON public.subscriptions FOR SELECT USING (business_id = public.get_user_business_id(auth.uid()) AND public.has_role(auth.uid(), 'admin'));

ALTER TABLE public.super_admins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super admins only" ON public.super_admins FOR ALL USING (auth.uid() IN (SELECT user_id FROM public.super_admins));

-- PostgREST reload
NOTIFY pgrst, 'reload schema';
-- ============================================================
-- 03. SEED: Initial Data
-- ============================================================

-- 1. Subscription Plans
INSERT INTO public.subscription_plans (name, description, price, billing_period, features)
VALUES 
    ('Monthly Pro', 'Full access for 1 month', 29.00, 'monthly', '{"history_days": -1, "can_export": true}'),
    ('Semi-Annual Pro', 'Full access for 6 months', 149.00, '6_months', '{"history_days": -1, "can_export": true}'),
    ('Yearly Pro', 'Full access for 12 months', 249.00, 'yearly', '{"history_days": -1, "can_export": true}');

-- 2. Super Admin Initial Account
-- NOTE: Password is 'admin123' for initial setup. Change this immediately!
INSERT INTO public.super_admin_credentials (username, password_hash, display_name)
VALUES ('admin', 'admin123', 'System Administrator')
ON CONFLICT (username) DO NOTHING;
