-- Add unit_type and items_per_case columns to purchase_order_items
ALTER TABLE purchase_order_items
  ADD COLUMN IF NOT EXISTS unit_type TEXT NOT NULL DEFAULT 'pcs',
  ADD COLUMN IF NOT EXISTS items_per_case NUMERIC(12,3) NOT NULL DEFAULT 0;
