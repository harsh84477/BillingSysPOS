-- 1. Create Subscription Plans Table
CREATE TABLE IF NOT EXISTS public.subscription_plans (
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

-- 2. Create Subscriptions Table
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES public.subscription_plans(id),
    status TEXT NOT NULL DEFAULT 'trialing' CHECK (status IN ('active', 'trialing', 'expired', 'cancelled')),
    trial_end TIMESTAMPTZ,
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    cancel_at_period_end BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(business_id)
);

-- 3. Create Super Admins Table
CREATE TABLE IF NOT EXISTS public.super_admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id)
);

-- 4. Seed Default Plans
INSERT INTO public.subscription_plans (name, description, price, billing_period, features)
VALUES 
    ('Monthly Pro', 'Full access for 1 month', 29.00, 'monthly', '{"history_days": -1, "can_export": true}'),
    ('Semi-Annual Pro', 'Full access for 6 months', 149.00, '6_months', '{"history_days": -1, "can_export": true}'),
    ('Yearly Pro', 'Full access for 12 months', 249.00, 'yearly', '{"history_days": -1, "can_export": true}');

-- 5. Helper Function to Check Subscription
CREATE OR REPLACE FUNCTION public.check_subscription_active(_business_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.subscriptions
        WHERE business_id = _business_id
        AND (status = 'active' OR (status = 'trialing' AND trial_end > now()))
        AND current_period_end > now()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. RLS Policies for Subscriptions
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Everyone can view plans" ON public.subscription_plans FOR SELECT TO authenticated USING (true);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Business owners can view their subscription" ON public.subscriptions 
FOR SELECT TO authenticated 
USING (business_id IN (SELECT business_id FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- 7. RLS Policies for Super Admins
ALTER TABLE public.super_admins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super admins only" ON public.super_admins FOR ALL TO authenticated 
USING (auth.uid() IN (SELECT user_id FROM public.super_admins));

-- 8. Restriction Logic for Bills (Examples)
-- Update the select policy on bills to limit Free users
-- DROP POLICY IF EXISTS "Users can view bills of their business" ON public.bills;
-- CREATE POLICY "Users can view bills of their business" ON public.bills
-- FOR SELECT TO authenticated
-- USING (
--     business_id IN (SELECT business_id FROM public.user_roles WHERE user_id = auth.uid())
--     AND (
--         public.check_subscription_active(business_id) -- Paid/Active Trial
--         OR created_at > now() - INTERVAL '7 days' -- Free access
--     )
-- );
