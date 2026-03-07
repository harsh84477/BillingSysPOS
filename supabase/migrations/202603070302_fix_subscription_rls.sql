-- Allow all users in the business to view the subscription status
-- so that managers, salesmen, and cashiers don't get "Expired" or "Trial" errors incorrectly.

DROP POLICY IF EXISTS "Owners view sub" ON public.subscriptions;
DROP POLICY IF EXISTS "Users view sub" ON public.subscriptions;

CREATE POLICY "Users view sub" 
ON public.subscriptions 
FOR SELECT 
USING (business_id = public.get_user_business_id(auth.uid()));
