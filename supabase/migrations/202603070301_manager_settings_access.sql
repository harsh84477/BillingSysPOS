-- Allow managers to manage business settings and roles
DROP POLICY IF EXISTS "Admins can manage settings" ON public.business_settings;
DROP POLICY IF EXISTS "Owners can manage settings" ON public.business_settings;
CREATE POLICY "Owner/Manager can manage settings" 
ON public.business_settings 
FOR ALL 
TO authenticated 
USING (
  business_id = public.get_user_business_id(auth.uid()) 
  AND public.is_admin_or_manager(auth.uid())
);

DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Owners can manage roles" ON public.user_roles;
CREATE POLICY "Owner/Manager can manage roles" 
ON public.user_roles 
FOR ALL 
TO authenticated 
USING (
  business_id = public.get_user_business_id(auth.uid()) 
  AND public.is_admin_or_manager(auth.uid())
);
