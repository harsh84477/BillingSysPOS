-- Add theme column to profiles for individual user themes
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS theme TEXT DEFAULT 'mint-pro';

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
