-- Add missing Super Admin RPCs

-- 1. Manage Business Subscription
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

-- 2. Get Business Bills
CREATE OR REPLACE FUNCTION public.get_business_bills(p_business_id UUID)
RETURNS TABLE(
    id UUID,
    bill_number TEXT,
    total_amount NUMERIC,
    status TEXT,
    created_at TIMESTAMPTZ,
    payment_status TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT id, bill_number, total_amount, status, created_at, payment_status
    FROM public.bills
    WHERE business_id = p_business_id
    ORDER BY created_at DESC;
$$;

-- 3. Get Business Products
CREATE OR REPLACE FUNCTION public.get_business_products(p_business_id UUID)
RETURNS TABLE(
    id UUID,
    name TEXT,
    selling_price NUMERIC,
    cost_price NUMERIC,
    stock_quantity INTEGER,
    low_stock_threshold INTEGER
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT id, name, selling_price, cost_price, stock_quantity, low_stock_threshold
    FROM public.products
    WHERE business_id = p_business_id
    ORDER BY name ASC;
$$;

-- 4. Manage Subscription Plan
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

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
