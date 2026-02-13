-- ======================================================================
-- Migration: Per-user bill prefix system
-- Bill format: {UserPrefix}{MM}{DD}{SEQUENCE}
-- Example: A02140001, A02140002, B02140001
-- Sequence resets daily. No race conditions.
-- ======================================================================

-- Step 1: Add bill_prefix, next_bill_number, and last_bill_date to user_roles
ALTER TABLE public.user_roles
  ADD COLUMN IF NOT EXISTS bill_prefix TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS next_bill_number INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS last_bill_date DATE DEFAULT NULL;

-- Step 2: Set default prefix 'A' for existing admin users
UPDATE public.user_roles
SET bill_prefix = 'A'
WHERE role = 'admin' AND bill_prefix IS NULL;

-- Step 3: Atomic function to get next bill number
-- Format: A02140001 (Prefix + Month + Day + Sequence)
-- Sequence resets each day automatically
CREATE OR REPLACE FUNCTION public.get_next_bill_number(_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _prefix TEXT;
  _current_number INTEGER;
  _last_date DATE;
  _today DATE;
  _bill_number TEXT;
  _month TEXT;
  _day TEXT;
BEGIN
  _today := CURRENT_DATE;

  -- Lock the row and get current values atomically
  SELECT bill_prefix, next_bill_number, last_bill_date
  INTO _prefix, _current_number, _last_date
  FROM public.user_roles
  WHERE user_id = _user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'User role not found');
  END IF;

  IF _prefix IS NULL OR _prefix = '' THEN
    RETURN json_build_object('success', false, 'error', 'No bill prefix assigned. Contact your admin.');
  END IF;

  -- Reset sequence if it's a new day
  IF _last_date IS NULL OR _last_date != _today THEN
    _current_number := 1;
  END IF;

  -- Build date parts
  _month := lpad(EXTRACT(MONTH FROM _today)::text, 2, '0');
  _day := lpad(EXTRACT(DAY FROM _today)::text, 2, '0');

  -- Build bill number: A02140001
  _bill_number := _prefix || _month || _day || lpad(_current_number::text, 4, '0');

  -- Increment counter and update last_bill_date
  UPDATE public.user_roles
  SET next_bill_number = _current_number + 1,
      last_bill_date = _today
  WHERE user_id = _user_id;

  RETURN json_build_object(
    'success', true,
    'bill_number', _bill_number,
    'prefix', _prefix,
    'sequence', _current_number
  );
END;
$$;

-- Step 4: Admin assigns bill prefixes to team members
CREATE OR REPLACE FUNCTION public.assign_bill_prefix(
  _admin_user_id UUID,
  _target_user_id UUID,
  _prefix TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _admin_business_id UUID;
  _target_business_id UUID;
BEGIN
  SELECT business_id INTO _admin_business_id
  FROM public.user_roles
  WHERE user_id = _admin_user_id AND role = 'admin';

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Only admins can assign bill prefixes');
  END IF;

  SELECT business_id INTO _target_business_id
  FROM public.user_roles
  WHERE user_id = _target_user_id;

  IF NOT FOUND OR _target_business_id != _admin_business_id THEN
    RETURN json_build_object('success', false, 'error', 'User not found in your business');
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE business_id = _admin_business_id
      AND bill_prefix = upper(trim(_prefix))
      AND user_id != _target_user_id
  ) THEN
    RETURN json_build_object('success', false, 'error', 'This prefix is already assigned to another team member');
  END IF;

  UPDATE public.user_roles
  SET bill_prefix = upper(trim(_prefix))
  WHERE user_id = _target_user_id AND business_id = _admin_business_id;

  RETURN json_build_object('success', true);
END;
$$;

-- Step 5: Update create_business to auto-assign prefix 'A' to admin
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
BEGIN
  IF EXISTS (SELECT 1 FROM public.businesses WHERE owner_id = _user_id) THEN
    RETURN json_build_object('success', false, 'error', 'You already own a business');
  END IF;

  IF EXISTS (SELECT 1 FROM public.businesses WHERE mobile_number = _mobile_number) THEN
    RETURN json_build_object('success', false, 'error', 'This mobile number is already registered with another business');
  END IF;

  _join_code := public.generate_join_code();

  INSERT INTO public.businesses (business_name, owner_id, mobile_number, join_code)
  VALUES (_business_name, _user_id, _mobile_number, _join_code)
  RETURNING id INTO _business_id;

  -- Assign admin role with bill prefix 'A'
  INSERT INTO public.user_roles (user_id, business_id, role, bill_prefix)
  VALUES (_user_id, _business_id, 'admin', 'A')
  ON CONFLICT (user_id, business_id) DO UPDATE SET role = 'admin', bill_prefix = 'A';

  UPDATE public.profiles
  SET business_id = _business_id, mobile_number = _mobile_number
  WHERE user_id = _user_id;

  INSERT INTO public.business_settings (business_name, business_id)
  VALUES (_business_name, _business_id);

  RETURN json_build_object(
    'success', true,
    'business_id', _business_id,
    'join_code', _join_code
  );
END;
$$;

-- Step 6: Reload schema cache
NOTIFY pgrst, 'reload schema';
