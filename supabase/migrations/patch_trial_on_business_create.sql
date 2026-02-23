-- =============================================================================
-- PATCH: Auto-provision 30-day free trial on new business creation
-- Also adds get_all_businesses_admin (admin panel fix)
-- Run in: Supabase Dashboard > SQL Editor
-- Safe to re-run (uses CREATE OR REPLACE)
-- =============================================================================

-- 1. Updated create_business: inserts a 30-day free trial subscription automatically
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
  -- Guard: one business per owner
  IF EXISTS (SELECT 1 FROM public.businesses WHERE owner_id = _user_id) THEN
    RETURN json_build_object('success', false, 'error', 'You already own a business');
  END IF;

  -- Guard: unique mobile number
  IF EXISTS (SELECT 1 FROM public.businesses WHERE mobile_number = _mobile_number) THEN
    RETURN json_build_object('success', false, 'error', 'This mobile number is already registered');
  END IF;

  _join_code  := public.generate_join_code();
  _trial_end  := now() + INTERVAL '30 days';

  -- Create the business
  INSERT INTO public.businesses (business_name, owner_id, mobile_number, join_code)
  VALUES (_business_name, _user_id, _mobile_number, _join_code)
  RETURNING id INTO _business_id;

  -- Assign admin role to the owner
  INSERT INTO public.user_roles (user_id, business_id, role)
  VALUES (_user_id, _business_id, 'admin')
  ON CONFLICT (user_id, business_id) DO UPDATE SET role = 'admin';

  -- Update profile with business link & mobile
  UPDATE public.profiles
  SET business_id = _business_id, mobile_number = _mobile_number
  WHERE user_id = _user_id;

  -- Create default business settings
  INSERT INTO public.business_settings (business_name, business_id)
  VALUES (_business_name, _business_id);

  -- ✅ Auto-provision 30-day free trial (no plan_id — trial is plan-less)
  -- Only inserted when no subscription exists yet (safe to re-run)
  INSERT INTO public.subscriptions (business_id, plan_id, status, trial_end, current_period_end)
  SELECT
    _business_id,
    -- Use the cheapest/first available plan as a placeholder (NULL-safe)
    (SELECT id FROM public.subscription_plans ORDER BY price ASC LIMIT 1),
    'trialing',
    _trial_end,
    _trial_end
  WHERE NOT EXISTS (
    SELECT 1 FROM public.subscriptions WHERE business_id = _business_id
  );

  RETURN json_build_object(
    'success',     true,
    'business_id', _business_id,
    'join_code',   _join_code,
    'trial_end',   _trial_end
  );
END;
$$;

-- 2. get_all_businesses_admin — bypasses RLS for the Super Admin panel
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

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
