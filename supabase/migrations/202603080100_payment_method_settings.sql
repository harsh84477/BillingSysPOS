-- Migration: Add Payment Method settings
ALTER TABLE public.business_settings
ADD COLUMN IF NOT EXISTS default_payment_method text DEFAULT 'cash',
ADD COLUMN IF NOT EXISTS enable_payment_cash boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS enable_payment_online boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS enable_payment_split boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS enable_payment_due boolean DEFAULT true;
