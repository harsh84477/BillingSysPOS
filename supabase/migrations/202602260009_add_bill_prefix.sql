-- Add bill_prefix column to user_roles
ALTER TABLE public.user_roles 
ADD COLUMN IF NOT EXISTS bill_prefix TEXT CHECK (length(bill_prefix) <= 2);

-- Update RLS policies to allow admins to manage bill_prefix
-- (The existing "Admins can update roles" policy covers this)

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
