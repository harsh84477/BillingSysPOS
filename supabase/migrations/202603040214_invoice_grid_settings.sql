-- Migration: Add invoice grid & title settings

ALTER TABLE public.business_settings 
ADD COLUMN IF NOT EXISTS invoice_title TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS invoice_border_top BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS invoice_border_bottom BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS invoice_border_left BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS invoice_border_right BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS invoice_border_inner_v BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS invoice_border_inner_h BOOLEAN DEFAULT true;
