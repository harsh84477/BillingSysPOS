-- Add price columns, items_per_case to purchase_order_items for Manage Products-style table
ALTER TABLE purchase_order_items
  ADD COLUMN IF NOT EXISTS mrp_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS selling_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS wholesale_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS items_per_case NUMERIC(12,3) NOT NULL DEFAULT 0;
