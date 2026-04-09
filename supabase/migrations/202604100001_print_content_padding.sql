-- Add missing print_content_padding column to business_settings
ALTER TABLE business_settings ADD COLUMN IF NOT EXISTS print_content_padding integer DEFAULT 20;
