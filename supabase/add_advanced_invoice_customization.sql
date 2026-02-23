-- Advanced Invoice Customization columns
ALTER TABLE public.business_settings
ADD COLUMN IF NOT EXISTS invoice_footer_font_size INTEGER DEFAULT 10,
ADD COLUMN IF NOT EXISTS invoice_header_align TEXT DEFAULT 'center',
ADD COLUMN IF NOT EXISTS invoice_show_business_phone BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS invoice_show_business_email BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS invoice_show_business_address BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS invoice_terms_conditions TEXT,
ADD COLUMN IF NOT EXISTS invoice_paper_width TEXT DEFAULT '80mm',
ADD COLUMN IF NOT EXISTS invoice_show_qr_code BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS upi_id TEXT,
ADD COLUMN IF NOT EXISTS gst_number TEXT;

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
