-- Add invoice customization columns to business_settings
ALTER TABLE public.business_settings
ADD COLUMN IF NOT EXISTS invoice_style TEXT DEFAULT 'classic',
ADD COLUMN IF NOT EXISTS invoice_font_size INTEGER DEFAULT 12,
ADD COLUMN IF NOT EXISTS invoice_spacing INTEGER DEFAULT 4,
ADD COLUMN IF NOT EXISTS invoice_show_borders BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS invoice_show_item_price BOOLEAN DEFAULT true;

-- Update types for internal consistency if needed (NUMERIC for better precision)
-- ALTER TABLE public.business_settings ALTER COLUMN tax_rate TYPE NUMERIC(5,2);

-- Refresh the PostgREST schema cache
NOTIFY pgrst, 'reload schema';
