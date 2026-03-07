-- Migration: Add checkout button settings
ALTER TABLE public.business_settings
ADD COLUMN IF NOT EXISTS checkout_save_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS checkout_print_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS checkout_save_print_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS checkout_whatsapp_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS checkout_draft_enabled BOOLEAN DEFAULT true;
