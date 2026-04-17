-- When a customer is created with assigned_salesman_id set,
-- automatically add to salesman_stores junction table so it
-- appears in the salesman's "My Stores" dashboard.

-- BEFORE INSERT: auto-set assigned_salesman_id if the inserter is a salesman
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

-- AFTER INSERT: add to salesman_stores (customer row exists now, so FK is satisfied)
CREATE OR REPLACE FUNCTION public.auto_add_salesman_store()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.assigned_salesman_id IS NOT NULL THEN
    INSERT INTO public.salesman_stores (business_id, salesman_id, customer_id)
    VALUES (NEW.business_id, NEW.assigned_salesman_id, NEW.id)
    ON CONFLICT (salesman_id, customer_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

-- Also handle UPDATE: if assigned_salesman_id changes, update salesman_stores
CREATE OR REPLACE FUNCTION public.auto_reassign_salesman_store()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only act when assigned_salesman_id actually changes
  IF OLD.assigned_salesman_id IS DISTINCT FROM NEW.assigned_salesman_id THEN
    -- Remove old assignment if it existed
    IF OLD.assigned_salesman_id IS NOT NULL THEN
      DELETE FROM public.salesman_stores
      WHERE salesman_id = OLD.assigned_salesman_id
        AND customer_id = OLD.id;
    END IF;
    -- Add new assignment
    IF NEW.assigned_salesman_id IS NOT NULL THEN
      INSERT INTO public.salesman_stores (business_id, salesman_id, customer_id)
      VALUES (NEW.business_id, NEW.assigned_salesman_id, NEW.id)
      ON CONFLICT (salesman_id, customer_id) DO NOTHING;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Recreate the BEFORE INSERT trigger (sets assigned_salesman_id)
DROP TRIGGER IF EXISTS trg_auto_assign_salesman ON public.customers;
CREATE TRIGGER trg_auto_assign_salesman
  BEFORE INSERT ON public.customers
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_salesman_to_customer();

-- AFTER INSERT trigger (adds to salesman_stores — customer row exists at this point)
DROP TRIGGER IF EXISTS trg_auto_add_salesman_store ON public.customers;
CREATE TRIGGER trg_auto_add_salesman_store
  AFTER INSERT ON public.customers
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_add_salesman_store();

-- New UPDATE trigger for reassignment
DROP TRIGGER IF EXISTS trg_auto_reassign_salesman ON public.customers;
CREATE TRIGGER trg_auto_reassign_salesman
  AFTER UPDATE ON public.customers
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_reassign_salesman_store();

-- Allow salesman to insert into salesman_stores for themselves
-- (needed as a fallback if trigger runs as SECURITY DEFINER but
--  frontend also does a direct insert)
DROP POLICY IF EXISTS "Salesman can insert own store assignments" ON public.salesman_stores;
CREATE POLICY "Salesman can insert own store assignments"
  ON public.salesman_stores
  FOR INSERT
  TO authenticated
  WITH CHECK (
    salesman_id = auth.uid()
    AND business_id = public.get_user_business_id(auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role = 'salesman'
        AND business_id = salesman_stores.business_id
    )
  );
