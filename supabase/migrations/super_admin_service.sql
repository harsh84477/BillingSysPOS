-- Create a set of functions for Super Admin to access cross-business data
-- These bypass the standard RLS by being SECURITY DEFINER

-- 1. Function to get platform-wide statistics
CREATE OR REPLACE FUNCTION get_platform_stats()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_total_revenue NUMERIC;
    v_total_businesses INT;
    v_total_users INT;
    v_active_subscriptions INT;
BEGIN
    SELECT COALESCE(SUM(total_amount), 0) INTO v_total_revenue FROM bills WHERE status = 'completed';
    SELECT COUNT(*) INTO v_total_businesses FROM businesses;
    SELECT COUNT(*) INTO v_total_users FROM profiles;
    SELECT COUNT(*) INTO v_active_subscriptions FROM subscriptions WHERE status = 'active';

    RETURN jsonb_build_object(
        'total_revenue', v_total_revenue,
        'total_businesses', v_total_businesses,
        'total_users', v_total_users,
        'active_subscriptions', v_active_subscriptions
    );
END;
$$;

-- 2. Function to get all bills for a specific business (bypassing RLS)
CREATE OR REPLACE FUNCTION get_business_bills(p_business_id UUID)
RETURNS SETOF bills
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT * FROM bills WHERE business_id = p_business_id ORDER BY created_at DESC;
$$;

-- 3. Function to get all products for a specific business
CREATE OR REPLACE FUNCTION get_business_products(p_business_id UUID)
RETURNS SETOF products
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT * FROM products WHERE business_id = p_business_id ORDER BY name ASC;
$$;

-- 4. Function to manage subscriptions manually
CREATE OR REPLACE FUNCTION manage_business_subscription(
    p_business_id UUID,
    p_plan_id UUID DEFAULT NULL,
    p_status TEXT DEFAULT 'active',
    p_trial_end TIMESTAMPTZ DEFAULT NULL,
    p_period_end TIMESTAMPTZ DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO subscriptions (business_id, plan_id, status, trial_end, current_period_end)
    VALUES (p_business_id, p_plan_id, p_status, p_trial_end, p_period_end)
    ON CONFLICT (business_id)
    DO UPDATE SET
        -- Preserve existing plan_id if no new plan is provided (e.g. when force-expiring)
        plan_id = COALESCE(EXCLUDED.plan_id, subscriptions.plan_id),
        status = EXCLUDED.status,
        trial_end = EXCLUDED.trial_end,
        current_period_end = EXCLUDED.current_period_end,
        updated_at = NOW();
END;
$$;
