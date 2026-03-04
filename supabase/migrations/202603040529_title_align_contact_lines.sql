ALTER TABLE business_settings ADD COLUMN IF NOT EXISTS invoice_title_align text DEFAULT 'center';
ALTER TABLE business_settings ADD COLUMN IF NOT EXISTS invoice_contact_separate_lines boolean DEFAULT false;
