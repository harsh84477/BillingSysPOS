-- Migration: Add MRP and Tax Percentage columns to business_settings for Print Settings
ALTER TABLE business_settings
ADD COLUMN IF NOT EXISTS print_show_mrp BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS print_show_tax_pct BOOLEAN DEFAULT false;

-- Notify PostgREST to reload the schema cache so the tables reflect the new columns immediately
NOTIFY pgrst, 'reload schema';
