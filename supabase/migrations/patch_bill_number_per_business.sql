-- =============================================================================
-- PATCH: Fix bill_number uniqueness — scope per business, not globally
--
-- Problem: bills.bill_number has a GLOBAL unique constraint, so two different
--          businesses cannot have the same bill number (e.g. both start INV-0001).
--
-- Fix: Drop the global unique constraint; replace with a composite unique
--      constraint on (business_id, bill_number) so the same number is fine
--      across different businesses but remains unique within one business.
--
-- Safe to run on live data — no data loss, constraint rename only.
-- Run in: Supabase Dashboard > SQL Editor
-- =============================================================================

-- 1. Drop the global unique constraint
ALTER TABLE public.bills
    DROP CONSTRAINT IF EXISTS bills_bill_number_key;

-- 2. Add per-business unique constraint
ALTER TABLE public.bills
    ADD CONSTRAINT bills_bill_number_business_unique
    UNIQUE (business_id, bill_number);
