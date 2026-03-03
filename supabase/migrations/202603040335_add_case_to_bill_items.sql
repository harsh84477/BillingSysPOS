-- Migration: Add items_per_case to bill_items

ALTER TABLE public.bill_items
ADD COLUMN IF NOT EXISTS items_per_case NUMERIC(10,2) DEFAULT 0;
