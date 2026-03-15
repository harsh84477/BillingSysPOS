-- ============================================================
-- Phase 1: Enhanced Items, Units & Conversion
-- Run this migration on your Supabase SQL Editor
-- ============================================================

-- 1A. Enhanced Product Fields
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS item_code TEXT,
  ADD COLUMN IF NOT EXISTS sku TEXT,
  ADD COLUMN IF NOT EXISTS hsn_code TEXT,
  ADD COLUMN IF NOT EXISTS wholesale_price NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_percent NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_type TEXT DEFAULT 'exclusive',
  ADD COLUMN IF NOT EXISTS batch_number TEXT,
  ADD COLUMN IF NOT EXISTS expiry_date DATE,
  ADD COLUMN IF NOT EXISTS manufacturing_date DATE,
  ADD COLUMN IF NOT EXISTS serial_number TEXT,
  ADD COLUMN IF NOT EXISTS model_number TEXT,
  ADD COLUMN IF NOT EXISTS size TEXT,
  ADD COLUMN IF NOT EXISTS product_image_url TEXT,
  ADD COLUMN IF NOT EXISTS barcode TEXT,
  ADD COLUMN IF NOT EXISTS base_unit TEXT DEFAULT 'PCS',
  ADD COLUMN IF NOT EXISTS secondary_unit TEXT,
  ADD COLUMN IF NOT EXISTS unit_conversion_ratio NUMERIC DEFAULT 1;

-- 1B. Units table (predefined + custom units)
CREATE TABLE IF NOT EXISTS units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  abbreviation TEXT NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Seed default units
INSERT INTO units (name, abbreviation, is_default) VALUES
  ('Pieces', 'PCS', true),
  ('Box', 'BOX', true),
  ('Pack', 'PACK', true),
  ('Kilogram', 'KG', true),
  ('Gram', 'G', true),
  ('Litre', 'L', true),
  ('Millilitre', 'ML', true),
  ('Metre', 'M', true),
  ('Centimetre', 'CM', true),
  ('Dozen', 'DZN', true),
  ('Pair', 'PR', true),
  ('Carton', 'CTN', true),
  ('Bag', 'BAG', true),
  ('Bundle', 'BDL', true),
  ('Roll', 'ROL', true),
  ('Tablet', 'TAB', true),
  ('Strip', 'STRIP', true),
  ('Bottle', 'BTL', true),
  ('Can', 'CAN', true),
  ('Set', 'SET', true)
ON CONFLICT DO NOTHING;

-- Enable RLS on units
ALTER TABLE units ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view default units and their business units"
  ON units FOR SELECT
  USING (is_default = true OR business_id IN (
    SELECT business_id FROM profiles WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can insert units for their business"
  ON units FOR INSERT
  WITH CHECK (business_id IN (
    SELECT business_id FROM profiles WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can update their business units"
  ON units FOR UPDATE
  USING (business_id IN (
    SELECT business_id FROM profiles WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can delete their business units"
  ON units FOR DELETE
  USING (business_id IN (
    SELECT business_id FROM profiles WHERE user_id = auth.uid()
  ));

-- 1C. Enhanced business_settings for GST
ALTER TABLE business_settings
  ADD COLUMN IF NOT EXISTS gstin TEXT,
  ADD COLUMN IF NOT EXISTS business_category TEXT,
  ADD COLUMN IF NOT EXISTS business_type TEXT,
  ADD COLUMN IF NOT EXISTS state TEXT,
  ADD COLUMN IF NOT EXISTS pincode TEXT,
  ADD COLUMN IF NOT EXISTS signature_url TEXT,
  ADD COLUMN IF NOT EXISTS bank_name TEXT,
  ADD COLUMN IF NOT EXISTS bank_account_number TEXT,
  ADD COLUMN IF NOT EXISTS bank_ifsc TEXT,
  ADD COLUMN IF NOT EXISTS bank_branch TEXT,
  ADD COLUMN IF NOT EXISTS terms_and_conditions TEXT;

-- Index for barcode lookups
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode) WHERE barcode IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_item_code ON products(item_code) WHERE item_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku) WHERE sku IS NOT NULL;
