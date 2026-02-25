-- Migration: Add product grid display settings to business_settings table
-- Run in: Supabase Dashboard > SQL Editor

ALTER TABLE public.business_settings
  ADD COLUMN IF NOT EXISTS product_button_size TEXT NOT NULL DEFAULT 'medium'
    CHECK (product_button_size IN ('small', 'medium', 'large', 'xlarge')),
  ADD COLUMN IF NOT EXISTS product_columns INTEGER NOT NULL DEFAULT 5
    CHECK (product_columns BETWEEN 2 AND 8),
  ADD COLUMN IF NOT EXISTS grid_gap INTEGER NOT NULL DEFAULT 8
    CHECK (grid_gap BETWEEN 4 AND 30),
  ADD COLUMN IF NOT EXISTS show_stock_badge BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_product_code BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS show_cost_price BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS auto_fit_enabled BOOLEAN NOT NULL DEFAULT false;

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
