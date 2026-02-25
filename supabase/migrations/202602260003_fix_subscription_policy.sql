-- Fix for subscription visibility for non-admin users (salesmen, cashiers, managers)
-- This allows all members of a business to see the business subscription status

DROP POLICY IF EXISTS "Business owners can view their subscription" ON public.subscriptions;

CREATE POLICY "Business members can view their subscription" ON public.subscriptions 
FOR SELECT TO authenticated 
USING (
  business_id IN (
    SELECT business_id FROM public.user_roles 
    WHERE user_id = auth.uid()
  )
);

-- Also ensure subscription_plans is visible (should already be, but good to double check)
-- DROP POLICY IF EXISTS "Everyone can view plans" ON public.subscription_plans;
-- CREATE POLICY "Everyone can view plans" ON public.subscription_plans FOR SELECT TO authenticated USING (true);
