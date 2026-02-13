-- ================================================
-- NUCLEAR RESET: Drops ALL custom tables, functions, types, triggers, policies
-- Run this in Supabase SQL Editor to start fresh
-- WARNING: This deletes ALL data permanently!
-- ================================================

-- Drop all policies first
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
  END LOOP;
END $$;

-- Drop all triggers
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT trigger_name, event_object_table
    FROM information_schema.triggers
    WHERE trigger_schema = 'public'
  ) LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I CASCADE', r.trigger_name, r.event_object_table);
  END LOOP;
END $$;

-- Drop all functions
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT p.proname, pg_get_function_identity_arguments(p.oid) as args
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.prokind = 'f'
  ) LOOP
    EXECUTE format('DROP FUNCTION IF EXISTS public.%I(%s) CASCADE', r.proname, r.args);
  END LOOP;
END $$;

-- Drop all tables (order matters for foreign keys)
DROP TABLE IF EXISTS public.bill_items CASCADE;
DROP TABLE IF EXISTS public.bills CASCADE;
DROP TABLE IF EXISTS public.inventory_logs CASCADE;
DROP TABLE IF EXISTS public.products CASCADE;
DROP TABLE IF EXISTS public.categories CASCADE;
DROP TABLE IF EXISTS public.customers CASCADE;
DROP TABLE IF EXISTS public.business_settings CASCADE;
DROP TABLE IF EXISTS public.user_roles CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.businesses CASCADE;

-- Drop custom types
DROP TYPE IF EXISTS public.app_role CASCADE;
DROP TYPE IF EXISTS public.bill_status CASCADE;
