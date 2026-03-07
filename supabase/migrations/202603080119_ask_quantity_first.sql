-- Migration: Add ask_quantity_first setting
ALTER TABLE public.business_settings
ADD COLUMN IF NOT EXISTS ask_quantity_first boolean DEFAULT false;
