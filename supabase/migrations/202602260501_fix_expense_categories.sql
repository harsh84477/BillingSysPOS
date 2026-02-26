-- Fix expense categories enum to match UI
-- This allows existing databases to accept the new categories

-- Rename existing values if they exist (to avoid duplicates if we add then rename)
-- But ALTER TYPE ... ADD VALUE is safer

DO $$
BEGIN
    -- Add new values if they don't exist
    IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'expense_category' AND e.enumlabel = 'Rent') THEN
        ALTER TYPE public.expense_category ADD VALUE 'Rent';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'expense_category' AND e.enumlabel = 'Electricity bill') THEN
        ALTER TYPE public.expense_category ADD VALUE 'Electricity bill';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'expense_category' AND e.enumlabel = 'Salary') THEN
        ALTER TYPE public.expense_category ADD VALUE 'Salary';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'expense_category' AND e.enumlabel = 'Other exp') THEN
        ALTER TYPE public.expense_category ADD VALUE 'Other exp';
    END IF;
END $$;
