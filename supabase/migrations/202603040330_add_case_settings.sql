-- Migration: Add CASE setting and items_per_case to products

ALTER TABLE public.business_settings 
ADD COLUMN IF NOT EXISTS invoice_show_case BOOLEAN DEFAULT true;

ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS items_per_case NUMERIC(10,2) DEFAULT 0;
