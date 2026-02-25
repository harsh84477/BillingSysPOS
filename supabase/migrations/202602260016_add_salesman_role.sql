-- ============================================================
-- Migration STEP 1 of 2: Add 'salesman' enum value
-- Run this FIRST in: Supabase Dashboard > SQL Editor
-- Then run step 2 (add_salesman_role_step2.sql)
-- ============================================================
-- PostgreSQL requires new enum values to be committed before
-- they can be used in functions or policies.
-- ============================================================

ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'salesman';
