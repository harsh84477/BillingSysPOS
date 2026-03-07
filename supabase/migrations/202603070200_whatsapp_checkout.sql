-- Migration: Add WhatsApp checkout setting
ALTER TABLE public.business_settings
ADD COLUMN IF NOT EXISTS checkout_whatsapp_enabled BOOLEAN DEFAULT true;
