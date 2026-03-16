-- Migration: Add print_show_currency column to business_settings for Toggle currency symbol Setting
ALTER TABLE business_settings
ADD COLUMN IF NOT EXISTS print_show_currency BOOLEAN DEFAULT true;

-- Notify PostgREST to reload the schema cache so the table reflects the new column immediately
NOTIFY pgrst, 'reload schema';
