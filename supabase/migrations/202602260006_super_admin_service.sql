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
    IF p_plan_id IS NULL THEN
        -- Force-expire / cancel: only update the existing row, never INSERT
        -- (avoids NOT NULL violation on plan_id)
        UPDATE subscriptions
        SET
            status = p_status,
            current_period_end = COALESCE(p_period_end, current_period_end),
            trial_end = COALESCE(p_trial_end, trial_end),
            updated_at = NOW()
        WHERE business_id = p_business_id;
    ELSE
        -- Assign / switch / extend plan: full UPSERT
        INSERT INTO subscriptions (business_id, plan_id, status, trial_end, current_period_end)
        VALUES (p_business_id, p_plan_id, p_status, p_trial_end, p_period_end)
        ON CONFLICT (business_id)
        DO UPDATE SET
            plan_id            = EXCLUDED.plan_id,
            status             = EXCLUDED.status,
            trial_end          = EXCLUDED.trial_end,
            current_period_end = EXCLUDED.current_period_end,
            updated_at         = NOW();
    END IF;
END;
$$;

-- 5. Function to get ALL businesses with subscription info (bypasses RLS)
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
        s.id                 AS sub_id,
        s.status             AS sub_status,
        s.trial_end          AS sub_trial_end,
        s.current_period_end AS sub_period_end,
        sp.id                AS plan_id,
        sp.name              AS plan_name,
        sp.price             AS plan_price
    FROM businesses b
    LEFT JOIN business_settings bs  ON bs.business_id = b.id
    LEFT JOIN subscriptions s        ON s.business_id  = b.id
    LEFT JOIN subscription_plans sp  ON sp.id          = s.plan_id
    ORDER BY b.created_at DESC;
$$;
