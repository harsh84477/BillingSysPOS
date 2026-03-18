-- Migration: Add signature image and MRP total columns to business_settings
ALTER TABLE business_settings
ADD COLUMN IF NOT EXISTS print_signature_image TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS print_show_mrp_total BOOLEAN DEFAULT false;

-- Notify PostgREST to reload the schema cache so the tables reflect the new columns immediately
NOTIFY pgrst, 'reload schema';
