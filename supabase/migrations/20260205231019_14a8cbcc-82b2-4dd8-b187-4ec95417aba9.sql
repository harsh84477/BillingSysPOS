-- Add billing display settings to business_settings table
ALTER TABLE public.business_settings 
ADD COLUMN IF NOT EXISTS show_gst_in_billing boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS show_discount_in_billing boolean NOT NULL DEFAULT true;