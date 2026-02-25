-- =============================================================================
-- SUPER ADMIN EXTENDED SERVICE
-- All functions run as SECURITY DEFINER to bypass RLS for super-admin access
-- =============================================================================

-- 1. Admin logs table (audit trail of all super-admin actions)
CREATE TABLE IF NOT EXISTS public.admin_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id TEXT NOT NULL,
    action TEXT NOT NULL,
    target_id TEXT,
    target_type TEXT,
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on admin_logs (only super-admins can query via RPC)
ALTER TABLE public.admin_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "No direct access to admin_logs" ON public.admin_logs FOR ALL USING (false);

-- =============================================================================
-- RPC: Get ALL businesses with subscription info (bypasses RLS)
-- =============================================================================
CREATE OR REPLACE FUNCTION get_all_businesses_admin()
RETURNS TABLE(
    id UUID,
    business_name TEXT,
    mobile_number TEXT,
    join_code TEXT,
    address TEXT,
    created_at TIMESTAMPTZ,
    sub_id UUID,
    sub_status TEXT,
    sub_trial_end TIMESTAMPTZ,
    sub_period_end TIMESTAMPTZ,
    plan_id UUID,
    plan_name TEXT,
    plan_price NUMERIC
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT
        b.id,
        b.business_name,
        b.mobile_number,
        b.join_code,
        bs.address,
        b.created_at,
        s.id           AS sub_id,
        s.status       AS sub_status,
        s.trial_end    AS sub_trial_end,
        s.current_period_end AS sub_period_end,
        sp.id          AS plan_id,
        sp.name        AS plan_name,
        sp.price       AS plan_price
    FROM businesses b
    LEFT JOIN business_settings bs ON bs.business_id = b.id
    LEFT JOIN subscriptions s      ON s.business_id = b.id
    LEFT JOIN subscription_plans sp ON sp.id = s.plan_id
    ORDER BY b.created_at DESC;
$$;

-- 2. Add is_blocked column to profiles (if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='profiles' AND column_name='is_blocked'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN is_blocked BOOLEAN DEFAULT false;
    END IF;
END$$;

-- =============================================================================
-- RPC: Extended Platform Stats (v2)
-- =============================================================================
CREATE OR REPLACE FUNCTION get_platform_stats_v2()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_total_businesses INT;
    v_total_users INT;
    v_active_subscriptions INT;
    v_trial_subscriptions INT;
    v_expired_subscriptions INT;
    v_new_businesses_30d INT;
    v_expiring_soon_7d INT;
    v_no_subscription_count INT;
BEGIN
    SELECT COUNT(*) INTO v_total_businesses FROM businesses;
    SELECT COUNT(*) INTO v_total_users FROM profiles;
    SELECT COUNT(*) INTO v_active_subscriptions FROM subscriptions WHERE status = 'active' AND current_period_end > now();
    SELECT COUNT(*) INTO v_trial_subscriptions FROM subscriptions WHERE status = 'trialing' AND trial_end > now();
    SELECT COUNT(*) INTO v_expired_subscriptions FROM subscriptions
        WHERE status = 'expired'
           OR (status = 'active' AND current_period_end < now())
           OR (status = 'trialing' AND trial_end < now());
    SELECT COUNT(*) INTO v_new_businesses_30d FROM businesses WHERE created_at >= now() - INTERVAL '30 days';

    -- Subscriptions expiring in the next 7 days (trial or active)
    SELECT COUNT(*) INTO v_expiring_soon_7d FROM subscriptions
        WHERE (status = 'trialing' AND trial_end BETWEEN now() AND now() + INTERVAL '7 days')
           OR (status = 'active' AND current_period_end BETWEEN now() AND now() + INTERVAL '7 days');

    -- Businesses with no subscription row at all
    SELECT COUNT(*) INTO v_no_subscription_count
        FROM businesses b
        WHERE NOT EXISTS (SELECT 1 FROM subscriptions s WHERE s.business_id = b.id);

    RETURN jsonb_build_object(
        'total_businesses', v_total_businesses,
        'total_users', v_total_users,
        'active_subscriptions', v_active_subscriptions,
        'trial_subscriptions', v_trial_subscriptions,
        'expired_subscriptions', v_expired_subscriptions,
        'new_businesses_30d', v_new_businesses_30d,
        'expiring_soon_7d', v_expiring_soon_7d,
        'no_subscription_count', v_no_subscription_count
    );
END;
$$;

-- =============================================================================
-- RPC: Revenue by Month (last 6 months) for chart
-- =============================================================================
CREATE OR REPLACE FUNCTION get_revenue_by_month()
RETURNS TABLE(month TEXT, revenue NUMERIC, bill_count BIGINT)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT
        TO_CHAR(date_trunc('month', created_at), 'Mon YY') AS month,
        COALESCE(SUM(total_amount), 0) AS revenue,
        COUNT(*) AS bill_count
    FROM bills
    WHERE status = 'completed'
      AND created_at >= date_trunc('month', now()) - INTERVAL '5 months'
    GROUP BY date_trunc('month', created_at)
    ORDER BY date_trunc('month', created_at) ASC;
$$;

-- =============================================================================
-- RPC: Subscription Overview (for donut chart)
-- =============================================================================
CREATE OR REPLACE FUNCTION get_subscription_overview()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_active INT;
    v_trialing INT;
    v_expired INT;
    v_no_sub INT;
BEGIN
    SELECT COUNT(*) INTO v_active FROM subscriptions WHERE status = 'active' AND current_period_end > now();
    SELECT COUNT(*) INTO v_trialing FROM subscriptions WHERE status = 'trialing' AND trial_end > now();
    SELECT COUNT(*) INTO v_expired FROM subscriptions WHERE status = 'expired' OR (status = 'active' AND current_period_end < now()) OR (status = 'trialing' AND trial_end < now());
    SELECT COUNT(*) INTO v_no_sub FROM businesses b WHERE NOT EXISTS (SELECT 1 FROM subscriptions s WHERE s.business_id = b.id);

    RETURN jsonb_build_object(
        'active', v_active,
        'trialing', v_trialing,
        'expired', v_expired,
        'no_sub', v_no_sub
    );
END;
$$;

-- =============================================================================
-- RPC: All subscriptions with business + plan details (for sub table)
-- =============================================================================
CREATE OR REPLACE FUNCTION get_all_subscriptions()
RETURNS TABLE(
    subscription_id UUID,
    business_id UUID,
    business_name TEXT,
    plan_id UUID,
    plan_name TEXT,
    plan_price NUMERIC,
    billing_period TEXT,
    status TEXT,
    trial_end TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    created_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT
        s.id AS subscription_id,
        b.id AS business_id,
        b.business_name,
        sp.id AS plan_id,
        sp.name AS plan_name,
        sp.price AS plan_price,
        sp.billing_period,
        s.status,
        s.trial_end,
        s.current_period_end,
        s.created_at
    FROM subscriptions s
    JOIN businesses b ON b.id = s.business_id
    JOIN subscription_plans sp ON sp.id = s.plan_id
    ORDER BY s.created_at DESC;
$$;

-- =============================================================================
-- RPC: Get users for a specific business
-- =============================================================================
CREATE OR REPLACE FUNCTION get_business_users(p_business_id UUID)
RETURNS TABLE(
    user_id UUID,
    display_name TEXT,
    role TEXT,
    bill_prefix TEXT,
    is_blocked BOOLEAN,
    joined_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT
        ur.user_id,
        COALESCE(p.display_name, 'Unknown') AS display_name,
        ur.role::TEXT,
        ur.bill_prefix,
        COALESCE(p.is_blocked, false) AS is_blocked,
        ur.created_at AS joined_at
    FROM user_roles ur
    LEFT JOIN profiles p ON p.user_id = ur.user_id
    WHERE ur.business_id = p_business_id
    ORDER BY ur.created_at ASC;
$$;

-- =============================================================================
-- RPC: Get ALL platform users across all businesses
-- =============================================================================
CREATE OR REPLACE FUNCTION get_all_platform_users()
RETURNS TABLE(
    user_id UUID,
    display_name TEXT,
    role TEXT,
    business_name TEXT,
    business_id UUID,
    is_blocked BOOLEAN,
    joined_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT
        ur.user_id,
        COALESCE(p.display_name, 'Unknown') AS display_name,
        ur.role::TEXT,
        b.business_name,
        b.id AS business_id,
        COALESCE(p.is_blocked, false) AS is_blocked,
        ur.created_at AS joined_at
    FROM user_roles ur
    LEFT JOIN profiles p ON p.user_id = ur.user_id
    LEFT JOIN businesses b ON b.id = ur.business_id
    ORDER BY ur.created_at DESC;
$$;

-- =============================================================================
-- RPC: Block a user
-- =============================================================================
CREATE OR REPLACE FUNCTION block_user(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE profiles SET is_blocked = true WHERE user_id = p_user_id;
END;
$$;

-- =============================================================================
-- RPC: Unblock a user
-- =============================================================================
CREATE OR REPLACE FUNCTION unblock_user(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE profiles SET is_blocked = false WHERE user_id = p_user_id;
END;
$$;

-- =============================================================================
-- RPC: Log admin action (called from frontend after significant operations)
-- =============================================================================
CREATE OR REPLACE FUNCTION log_admin_action(
    p_admin_id TEXT,
    p_action TEXT,
    p_target_id TEXT DEFAULT NULL,
    p_target_type TEXT DEFAULT NULL,
    p_details JSONB DEFAULT '{}'::jsonb
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO admin_logs (admin_id, action, target_id, target_type, details)
    VALUES (p_admin_id, p_action, p_target_id, p_target_type, p_details);
END;
$$;

-- =============================================================================
-- RPC: Get recent admin logs
-- =============================================================================
CREATE OR REPLACE FUNCTION get_admin_logs()
RETURNS TABLE(
    id UUID,
    admin_id TEXT,
    action TEXT,
    target_id TEXT,
    target_type TEXT,
    details JSONB,
    created_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT id, admin_id, action, target_id, target_type, details, created_at
    FROM admin_logs
    ORDER BY created_at DESC
    LIMIT 200;
$$;

-- =============================================================================
-- RPC: Get business summary metrics (bill count, user count, product count, revenue)
-- =============================================================================
CREATE OR REPLACE FUNCTION get_business_summary(p_business_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_bill_count INT;
    v_user_count INT;
    v_product_count INT;
    v_total_revenue NUMERIC;
BEGIN
    SELECT COUNT(*) INTO v_bill_count FROM bills WHERE business_id = p_business_id;
    SELECT COUNT(*) INTO v_user_count FROM user_roles WHERE business_id = p_business_id;
    SELECT COUNT(*) INTO v_product_count FROM products WHERE business_id = p_business_id;
    SELECT COALESCE(SUM(total_amount), 0) INTO v_total_revenue FROM bills WHERE business_id = p_business_id AND status = 'completed';

    RETURN jsonb_build_object(
        'bill_count', v_bill_count,
        'user_count', v_user_count,
        'product_count', v_product_count,
        'total_revenue', v_total_revenue
    );
END;
$$;
