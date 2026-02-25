-- Patch: Rename 'admin' to 'owner'
DO $$
BEGIN
    -- Rename enum value
    ALTER TYPE public.app_role RENAME VALUE 'admin' TO 'owner';
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN others THEN 
        -- If renaming fails (maybe already renamed or used elsewhere), try to handle it
        NULL;
END $$;

-- Update create_business function
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
  _trial_end TIMESTAMPTZ;
BEGIN
  IF EXISTS (SELECT 1 FROM public.businesses WHERE owner_id = _user_id) THEN
    RETURN json_build_object('success', false, 'error', 'You already own a business');
  END IF;

  IF EXISTS (SELECT 1 FROM public.businesses WHERE mobile_number = _mobile_number) THEN
    RETURN json_build_object('success', false, 'error', 'This mobile number is already registered');
  END IF;

  _join_code := public.generate_join_code();
  _trial_end := now() + INTERVAL '30 days';

  INSERT INTO public.businesses (business_name, owner_id, mobile_number, join_code)
  VALUES (_business_name, _user_id, _mobile_number, _join_code)
  RETURNING id INTO _business_id;

  -- CRITICAL: Ensure Owner role is set
  INSERT INTO public.user_roles (user_id, business_id, role)
  VALUES (_user_id, _business_id, 'owner')
  ON CONFLICT (user_id, business_id) DO UPDATE SET role = 'owner';

  UPDATE public.profiles
  SET business_id = _business_id, mobile_number = _mobile_number
  WHERE user_id = _user_id;

  INSERT INTO public.business_settings (business_name, business_id)
  VALUES (_business_name, _business_id);

  -- Auto-provision trial
  INSERT INTO public.subscriptions (business_id, status, trial_end, current_period_end)
  VALUES (_business_id, 'trialing', _trial_end, _trial_end);

  RETURN json_build_object(
    'success', true,
    'business_id', _business_id,
    'join_code', _join_code,
    'trial_end', _trial_end
  );
END;
$$;

-- Update join_business function
CREATE OR REPLACE FUNCTION public.join_business(
  _join_code TEXT,
  _user_id UUID,
  _role public.app_role DEFAULT 'cashier'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _business RECORD;
  _member_count INTEGER;
BEGIN
  SELECT * INTO _business FROM public.businesses WHERE join_code = upper(trim(_join_code));

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Invalid business code.');
  END IF;

  SELECT COUNT(*) INTO _member_count FROM public.user_roles WHERE business_id = _business.id;

  IF _member_count >= _business.max_members THEN
    RETURN json_build_object('success', false, 'error', 'Business has reached max members.');
  END IF;

  IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND business_id = _business.id) THEN
    RETURN json_build_object('success', false, 'error', 'You are already a member.');
  END IF;

  IF _role = 'owner' THEN _role := 'cashier'; END IF;

  INSERT INTO public.user_roles (user_id, business_id, role)
  VALUES (_user_id, _business.id, _role);

  UPDATE public.profiles SET business_id = _business.id WHERE user_id = _user_id;

  RETURN json_build_object(
    'success', true,
    'business_id', _business.id,
    'business_name', _business.business_name
  );
END;
$$;

-- Update helper functions
CREATE OR REPLACE FUNCTION public.is_admin_or_manager(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id 
    AND role IN ('owner', 'manager')
    AND business_id = public.get_user_business_id(_user_id)
  )
$$;

CREATE OR REPLACE FUNCTION public.is_admin_or_staff(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id 
    AND role IN ('owner', 'manager', 'cashier')
    AND business_id = public.get_user_business_id(_user_id)
  )
$$;

CREATE OR REPLACE FUNCTION public.can_finalize_bill(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('owner', 'manager')
  )
$$;

-- Update Policies
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL TO authenticated USING (business_id = public.get_user_business_id(auth.uid()) AND public.has_role(auth.uid(), 'owner'));

DROP POLICY IF EXISTS "Admins can manage settings" ON public.business_settings;
CREATE POLICY "Admins can manage settings" ON public.business_settings FOR ALL TO authenticated USING (business_id = public.get_user_business_id(auth.uid()) AND public.has_role(auth.uid(), 'owner'));

DROP POLICY IF EXISTS "Owners view sub" ON public.subscriptions;
CREATE POLICY "Owners view sub" ON public.subscriptions FOR SELECT USING (business_id = public.get_user_business_id(auth.uid()) AND public.has_role(auth.uid(), 'owner'));
