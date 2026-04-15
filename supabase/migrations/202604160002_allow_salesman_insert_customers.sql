-- Allow salesman role to insert customers (for adding customers from salesman interface)
CREATE POLICY "Salesman can add customers"
  ON public.customers
  FOR INSERT
  TO authenticated
  WITH CHECK (
    business_id = public.get_user_business_id(auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'manager', 'salesman')
    )
  );

-- Allow salesman to update customers they created (assigned_salesman_id = their uid)
CREATE POLICY "Salesman can update own customers"
  ON public.customers
  FOR UPDATE
  TO authenticated
  USING (
    business_id = public.get_user_business_id(auth.uid())
    AND assigned_salesman_id = auth.uid()
  )
  WITH CHECK (
    business_id = public.get_user_business_id(auth.uid())
    AND assigned_salesman_id = auth.uid()
  );
