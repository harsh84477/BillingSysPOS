-- Migration: Add manager full access permission column
ALTER TABLE public.user_roles
ADD COLUMN IF NOT EXISTS manager_full_access BOOLEAN DEFAULT false;
