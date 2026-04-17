-- Automatically assign salesman_id when a salesman inserts a customer
-- This ensures assignment works even if the frontend doesn't send it

CREATE OR REPLACE FUNCTION public.auto_assign_salesman_to_customer()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only auto-assign if assigned_salesman_id is not already set
  IF NEW.assigned_salesman_id IS NULL THEN
    -- Check if the inserting user has the 'salesman' role in this business
    IF EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role = 'salesman'
        AND business_id = NEW.business_id
    ) THEN
      NEW.assigned_salesman_id := auth.uid();
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Drop trigger if it exists, then create
DROP TRIGGER IF EXISTS trg_auto_assign_salesman ON public.customers;
CREATE TRIGGER trg_auto_assign_salesman
  BEFORE INSERT ON public.customers
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_salesman_to_customer();
