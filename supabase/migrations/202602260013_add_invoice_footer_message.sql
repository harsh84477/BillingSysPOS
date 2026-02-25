-- Add invoice_footer_message column to business_settings
ALTER TABLE public.business_settings
ADD COLUMN IF NOT EXISTS invoice_footer_message TEXT DEFAULT 'Thank you for your business!';

-- Refresh the PostgREST schema cache
NOTIFY pgrst, 'reload schema';
