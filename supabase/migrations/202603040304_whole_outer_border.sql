-- Migration: Add whole bill border

ALTER TABLE public.business_settings 
ADD COLUMN IF NOT EXISTS invoice_border_whole_bill BOOLEAN DEFAULT false;
