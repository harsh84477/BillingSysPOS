-- Migration: Add invoice QR position and size settings

ALTER TABLE public.business_settings 
ADD COLUMN IF NOT EXISTS invoice_qr_position TEXT DEFAULT 'bottom-center',
ADD COLUMN IF NOT EXISTS invoice_qr_size TEXT DEFAULT 'medium';
