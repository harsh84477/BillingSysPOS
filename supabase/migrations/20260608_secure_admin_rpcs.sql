-- ============================================================
-- Fix: Secure Admin RPC Functions (V12 - MEDIUM)
-- ============================================================
-- Historically, several admin-only functions were SECURITY DEFINER 
-- but did not verify if the caller is actually an administrator,
-- exposing platform-wide stats, business lists, and logs to any caller.
--
-- This migration fixes that by introducing an authorization helper,
-- enabling RLS on credentials, and securing all admin functions.

-- 1. Helper function to check if caller is a super admin
CREATE OR REPLACE FUNCTION public.check_is_super_admin()
RETURNS BOOLEAN LANGUAGE plpgsql STABLE AS $$
DECLARE
  v_headers JSONB;
  v_admin_id TEXT;
BEGIN
  -- Check 1: Standard Supabase Auth user listed in super_admins table
  IF auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.super_admins WHERE user_id = auth.uid()
  ) THEN
    RETURN TRUE;
  END IF;

  -- Check 2: Custom admin session using x-custom-admin-id header (authenticated via credentials)
  BEGIN
    v_headers := COALESCE(current_setting('request.headers', true)::jsonb, '{}'::jsonb);
    v_admin_id := v_headers->>'x-custom-admin-id';
  EXCEPTION WHEN OTHERS THEN
    v_admin_id := NULL;
  END;
  
  IF v_admin_id IS NOT NULL AND v_admin_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    IF EXISTS (SELECT 1 FROM public.super_admin_credentials WHERE id = v_admin_id::uuid) THEN
      RETURN TRUE;
    END IF;
  END IF;

  RETURN FALSE;
END;
$$;

-- 2. Secure super_admin_credentials table itself using Row Level Security
ALTER TABLE public.super_admin_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins only access super_admin_credentials"
ON public.super_admin_credentials
FOR ALL
USING (public.check_is_super_admin());

-- 3. Expose session validation helper for custom admin UI
CREATE OR REPLACE FUNCTION verify_custom_admin_session(p_admin_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    RETURN EXISTS (SELECT 1 FROM public.super_admin_credentials WHERE id = p_admin_id);
END;
$$;

-- 4. Redefine and secure admin RPC functions

-- get_all_businesses_admin
CREATE OR REPLACE FUNCTION public.get_all_businesses_admin()
RETURNS TABLE(id UUID, business_name TEXT, mobile_number TEXT, join_code TEXT, address TEXT, created_at TIMESTAMPTZ, sub_id UUID, sub_status TEXT, sub_trial_end TIMESTAMPTZ, sub_period_end TIMESTAMPTZ, plan_id UUID, plan_name TEXT, plan_price NUMERIC)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    IF NOT public.check_is_super_admin() THEN
        RAISE EXCEPTION 'Unauthorized: Super Admin access required';
    END IF;

    RETURN QUERY
    SELECT b.id, b.business_name, b.mobile_number, b.join_code, bs.address, b.created_at, s.id as sub_id, s.status as sub_status, s.trial_end as sub_trial_end, s.current_period_end as sub_period_end, sp.id as plan_id, sp.name as plan_name, sp.price as plan_price
    FROM businesses b 
    LEFT JOIN business_settings bs ON bs.business_id = b.id 
    LEFT JOIN subscriptions s ON s.business_id = b.id 
    LEFT JOIN subscription_plans sp ON sp.id = s.plan_id 
    ORDER BY b.created_at DESC;
END;
$$;

-- get_platform_stats_v2
CREATE OR REPLACE FUNCTION public.get_platform_stats_v2()
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE 
    v_res JSONB; 
BEGIN
    IF NOT public.check_is_super_admin() THEN
        RAISE EXCEPTION 'Unauthorized: Super Admin access required';
    END IF;

    SELECT jsonb_build_object(
        'total_businesses', (SELECT count(*) FROM businesses), 
        'total_users', (SELECT count(*) FROM profiles), 
        'active_subscriptions', (SELECT count(*) FROM subscriptions WHERE status = 'active' AND current_period_end > now()), 
        'trial_subscriptions', (SELECT count(*) FROM subscriptions WHERE status = 'trialing' AND trial_end > now()), 
        'new_businesses_30d', (SELECT count(*) FROM businesses WHERE created_at >= now() - INTERVAL '30 days')
    ) INTO v_res;
    
    RETURN v_res;
END; 
$$;

-- get_revenue_by_month
CREATE OR REPLACE FUNCTION public.get_revenue_by_month()
RETURNS TABLE(month TEXT, revenue NUMERIC, bill_count BIGINT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    IF NOT public.check_is_super_admin() THEN
        RAISE EXCEPTION 'Unauthorized: Super Admin access required';
    END IF;

    RETURN QUERY
    SELECT TO_CHAR(date_trunc('month', created_at), 'Mon YY') AS month, 
           COALESCE(SUM(total_amount), 0) AS revenue, 
           COUNT(*) AS bill_count 
    FROM bills 
    WHERE status = 'completed' AND created_at >= date_trunc('month', now()) - INTERVAL '5 months' 
    GROUP BY date_trunc('month', created_at) 
    ORDER BY date_trunc('month', created_at) ASC;
END;
$$;

-- get_subscription_overview
CREATE OR REPLACE FUNCTION public.get_subscription_overview()
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    IF NOT public.check_is_super_admin() THEN
        RAISE EXCEPTION 'Unauthorized: Super Admin access required';
    END IF;

    RETURN jsonb_build_object(
        'active', (SELECT count(*) FROM subscriptions WHERE status='active'), 
        'trialing', (SELECT count(*) FROM subscriptions WHERE status='trialing'), 
        'expired', (SELECT count(*) FROM subscriptions WHERE status='expired'), 
        'no_sub', (SELECT count(*) FROM businesses b WHERE NOT EXISTS (SELECT 1 FROM subscriptions s WHERE s.business_id = b.id))
    );
END; 
$$;

-- get_all_subscriptions
CREATE OR REPLACE FUNCTION public.get_all_subscriptions()
RETURNS TABLE(subscription_id UUID, business_id UUID, business_name TEXT, plan_id UUID, plan_name TEXT, plan_price NUMERIC, billing_period TEXT, status TEXT, trial_end TIMESTAMPTZ, current_period_end TIMESTAMPTZ, created_at TIMESTAMPTZ)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    IF NOT public.check_is_super_admin() THEN
        RAISE EXCEPTION 'Unauthorized: Super Admin access required';
    END IF;

    RETURN QUERY
    SELECT s.id, b.id, b.business_name, sp.id, sp.name, sp.price, sp.billing_period, s.status, s.trial_end, s.current_period_end, s.created_at 
    FROM subscriptions s 
    JOIN businesses b ON b.id = s.business_id 
    LEFT JOIN subscription_plans sp ON sp.id = s.plan_id 
    ORDER BY s.created_at DESC;
END;
$$;

-- get_business_users
CREATE OR REPLACE FUNCTION public.get_business_users(p_business_id UUID)
RETURNS TABLE(user_id UUID, display_name TEXT, role TEXT, bill_prefix TEXT, is_blocked BOOLEAN, joined_at TIMESTAMPTZ)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    IF NOT public.check_is_super_admin() THEN
        RAISE EXCEPTION 'Unauthorized: Super Admin access required';
    END IF;

    RETURN QUERY
    SELECT ur.user_id, COALESCE(p.display_name, 'Unknown'), ur.role::TEXT, ur.bill_prefix, COALESCE(p.is_blocked, false), ur.created_at 
    FROM user_roles ur 
    LEFT JOIN profiles p ON p.user_id = ur.user_id 
    WHERE ur.business_id = p_business_id 
    ORDER BY ur.created_at ASC;
END;
$$;

-- get_all_platform_users
CREATE OR REPLACE FUNCTION public.get_all_platform_users()
RETURNS TABLE(user_id UUID, display_name TEXT, role TEXT, business_name TEXT, business_id UUID, is_blocked BOOLEAN, joined_at TIMESTAMPTZ)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    IF NOT public.check_is_super_admin() THEN
        RAISE EXCEPTION 'Unauthorized: Super Admin access required';
    END IF;

    RETURN QUERY
    SELECT ur.user_id, COALESCE(p.display_name, 'Unknown'), ur.role::TEXT, b.business_name, b.id, COALESCE(p.is_blocked, false), ur.created_at 
    FROM user_roles ur 
    LEFT JOIN profiles p ON p.user_id = ur.user_id 
    LEFT JOIN businesses b ON b.id = ur.business_id 
    ORDER BY ur.created_at DESC;
END;
$$;

-- block_user
CREATE OR REPLACE FUNCTION public.block_user(p_user_id UUID) 
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$ 
BEGIN 
    IF NOT public.check_is_super_admin() THEN
        RAISE EXCEPTION 'Unauthorized: Super Admin access required';
    END IF;

    UPDATE profiles SET is_blocked = true WHERE user_id = p_user_id; 
END; 
$$;

-- unblock_user
CREATE OR REPLACE FUNCTION public.unblock_user(p_user_id UUID) 
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$ 
BEGIN 
    IF NOT public.check_is_super_admin() THEN
        RAISE EXCEPTION 'Unauthorized: Super Admin access required';
    END IF;

    UPDATE profiles SET is_blocked = false WHERE user_id = p_user_id; 
END; 
$$;

-- log_admin_action
CREATE OR REPLACE FUNCTION public.log_admin_action(p_admin_id TEXT, p_action TEXT, p_target_id TEXT DEFAULT NULL, p_target_type TEXT DEFAULT NULL, p_details JSONB DEFAULT '{}'::jsonb) 
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$ 
BEGIN 
    IF NOT public.check_is_super_admin() THEN
        RAISE EXCEPTION 'Unauthorized: Super Admin access required';
    END IF;

    INSERT INTO admin_logs (admin_id, action, target_id, target_type, details) 
    VALUES (p_admin_id, p_action, p_target_id, p_target_type, p_details); 
END; 
$$;

-- get_admin_logs
CREATE OR REPLACE FUNCTION public.get_admin_logs() 
RETURNS TABLE(id UUID, admin_id TEXT, action TEXT, target_id TEXT, target_type TEXT, details JSONB, created_at TIMESTAMPTZ) 
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$ 
BEGIN
    IF NOT public.check_is_super_admin() THEN
        RAISE EXCEPTION 'Unauthorized: Super Admin access required';
    END IF;

    RETURN QUERY
    SELECT * FROM admin_logs ORDER BY created_at DESC LIMIT 200; 
END;
$$;

-- get_business_summary
CREATE OR REPLACE FUNCTION public.get_business_summary(p_business_id UUID) 
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    IF NOT public.check_is_super_admin() THEN
        RAISE EXCEPTION 'Unauthorized: Super Admin access required';
    END IF;

    RETURN jsonb_build_object(
        'bill_count', (SELECT count(*) FROM bills WHERE business_id = p_business_id), 
        'user_count', (SELECT count(*) FROM user_roles WHERE business_id = p_business_id), 
        'product_count', (SELECT count(*) FROM products WHERE business_id = p_business_id), 
        'total_revenue', (SELECT COALESCE(SUM(total_amount), 0) FROM bills WHERE business_id = p_business_id AND status = 'completed')
    );
END; 
$$;

-- manage_business_subscription
CREATE OR REPLACE FUNCTION public.manage_business_subscription(
    p_business_id UUID,
    p_plan_id UUID,
    p_status TEXT,
    p_period_end TIMESTAMPTZ
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT public.check_is_super_admin() THEN
        RAISE EXCEPTION 'Unauthorized: Super Admin access required';
    END IF;

    INSERT INTO public.subscriptions (business_id, plan_id, status, current_period_end)
    VALUES (p_business_id, p_plan_id, p_status, p_period_end)
    ON CONFLICT (business_id) 
    DO UPDATE SET 
        plan_id = EXCLUDED.plan_id,
        status = EXCLUDED.status,
        current_period_end = EXCLUDED.current_period_end,
        updated_at = now();
END;
$$;

-- get_business_bills
CREATE OR REPLACE FUNCTION public.get_business_bills(p_business_id UUID)
RETURNS TABLE(
    id UUID,
    bill_number TEXT,
    total_amount NUMERIC,
    status TEXT,
    created_at TIMESTAMPTZ,
    payment_status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT public.check_is_super_admin() THEN
        RAISE EXCEPTION 'Unauthorized: Super Admin access required';
    END IF;

    RETURN QUERY
    SELECT id, bill_number, total_amount, status, created_at, payment_status
    FROM public.bills
    WHERE business_id = p_business_id
    ORDER BY created_at DESC;
END;
$$;

-- get_business_products
CREATE OR REPLACE FUNCTION public.get_business_products(p_business_id UUID)
RETURNS TABLE(
    id UUID,
    name TEXT,
    selling_price NUMERIC,
    cost_price NUMERIC,
    stock_quantity INTEGER,
    low_stock_threshold INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT public.check_is_super_admin() THEN
        RAISE EXCEPTION 'Unauthorized: Super Admin access required';
    END IF;

    RETURN QUERY
    SELECT id, name, selling_price, cost_price, stock_quantity, low_stock_threshold
    FROM public.products
    WHERE business_id = p_business_id
    ORDER BY name ASC;
END;
$$;

-- manage_subscription_plan
CREATE OR REPLACE FUNCTION public.manage_subscription_plan(
    p_id UUID DEFAULT NULL,
    p_name TEXT DEFAULT NULL,
    p_description TEXT DEFAULT NULL,
    p_price NUMERIC DEFAULT NULL,
    p_billing_period TEXT DEFAULT NULL,
    p_is_active BOOLEAN DEFAULT NULL,
    p_features JSONB DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT public.check_is_super_admin() THEN
        RAISE EXCEPTION 'Unauthorized: Super Admin access required';
    END IF;

    IF p_id IS NOT NULL THEN
        UPDATE public.subscription_plans
        SET 
            name = COALESCE(p_name, name),
            description = COALESCE(p_description, description),
            price = COALESCE(p_price, price),
            billing_period = COALESCE(p_billing_period, billing_period),
            is_active = COALESCE(p_is_active, is_active),
            features = COALESCE(p_features, features),
            updated_at = now()
        WHERE id = p_id;
    ELSE
        INSERT INTO public.subscription_plans (name, description, price, billing_period, is_active, features)
        VALUES (p_name, p_description, p_price, p_billing_period, p_is_active, p_features);
    END IF;
END;
$$;

-- delete_business_cascade
CREATE OR REPLACE FUNCTION public.delete_business_cascade(p_business_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT public.check_is_super_admin() THEN
        RAISE EXCEPTION 'Unauthorized: Super Admin access required';
    END IF;

    -- Delete bill items first (depends on bills)
    DELETE FROM public.bill_items WHERE bill_id IN (SELECT id FROM public.bills WHERE business_id = p_business_id);
    -- Delete bill payments
    DELETE FROM public.bill_payments WHERE business_id = p_business_id;
    -- Delete return items (depends on sales_returns)
    DELETE FROM public.return_items WHERE return_id IN (SELECT id FROM public.sales_returns WHERE business_id = p_business_id);
    -- Delete credit notes
    DELETE FROM public.credit_notes WHERE business_id = p_business_id;
    -- Delete sales returns
    DELETE FROM public.sales_returns WHERE business_id = p_business_id;
    -- Delete purchase order items
    DELETE FROM public.purchase_order_items WHERE purchase_order_id IN (SELECT id FROM public.purchase_orders WHERE business_id = p_business_id);
    -- Delete purchase orders
    DELETE FROM public.purchase_orders WHERE business_id = p_business_id;
    -- Delete suppliers
    DELETE FROM public.suppliers WHERE business_id = p_business_id;
    -- Delete bills
    DELETE FROM public.bills WHERE business_id = p_business_id;
    -- Delete inventory logs
    DELETE FROM public.inventory_logs WHERE business_id = p_business_id;
    -- Delete products
    DELETE FROM public.products WHERE business_id = p_business_id;
    -- Delete categories
    DELETE FROM public.categories WHERE business_id = p_business_id;
    -- Delete customer-related
    DELETE FROM public.customer_credit_ledger WHERE business_id = p_business_id;
    DELETE FROM public.customer_credit_limits WHERE business_id = p_business_id;
    -- Delete loyalty
    DELETE FROM public.loyalty_points WHERE business_id = p_business_id;
    -- Delete salesman tables
    DELETE FROM public.salesman_stores WHERE business_id = p_business_id;
    DELETE FROM public.salesman_targets WHERE business_id = p_business_id;
    -- Delete customers
    DELETE FROM public.customers WHERE business_id = p_business_id;
    -- Delete expenses
    DELETE FROM public.expense_subcategories WHERE category_id IN (SELECT id FROM public.expense_categories WHERE business_id = p_business_id);
    DELETE FROM public.expense_categories WHERE business_id = p_business_id;
    DELETE FROM public.expenses WHERE business_id = p_business_id;
    -- Delete activity logs
    DELETE FROM public.activity_logs WHERE business_id = p_business_id;
    -- Delete payment modes config
    DELETE FROM public.payment_modes_config WHERE business_id = p_business_id;
    -- Delete offline sync
    DELETE FROM public.offline_sync_queue WHERE business_id = p_business_id;
    DELETE FROM public.offline_data_cache WHERE business_id = p_business_id;
    DELETE FROM public.sync_conflicts WHERE business_id = p_business_id;
    -- Delete subscriptions
    DELETE FROM public.subscriptions WHERE business_id = p_business_id;
    -- Delete business settings
    DELETE FROM public.business_settings WHERE business_id = p_business_id;
    -- Delete user roles
    DELETE FROM public.user_roles WHERE business_id = p_business_id;
    -- Delete the business itself
    DELETE FROM public.businesses WHERE id = p_business_id;
END;
$$;

-- PostgREST reload
NOTIFY pgrst, 'reload schema';
