-- Create a secure function for users to update their own bill_prefix
CREATE OR REPLACE FUNCTION public.update_my_bill_prefix(_prefix TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF length(_prefix) > 2 THEN
      RETURN json_build_object('success', false, 'error', 'Prefix must be 2 characters or less');
  END IF;

  UPDATE public.user_roles
  SET bill_prefix = upper(_prefix)
  WHERE user_id = auth.uid();
  
  RETURN json_build_object('success', true);
END;
$$;

NOTIFY pgrst, 'reload schema';
