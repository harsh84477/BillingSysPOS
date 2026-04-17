-- Add share_quantity_to_salesman toggle to business_settings
ALTER TABLE business_settings
ADD COLUMN IF NOT EXISTS share_quantity_to_salesman boolean DEFAULT true;
