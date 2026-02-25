-- Add plan management RPC

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
