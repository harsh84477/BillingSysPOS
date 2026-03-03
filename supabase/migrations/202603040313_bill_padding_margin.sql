-- Migration: Add outer bill border padding and margin settings

ALTER TABLE public.business_settings 
ADD COLUMN IF NOT EXISTS invoice_margin INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS invoice_padding INTEGER DEFAULT 20;
