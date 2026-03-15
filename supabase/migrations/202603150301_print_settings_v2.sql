-- Print Settings V2: Color customization, copy settings, item table config, bank details
-- Regular Printer — Color & Copy settings
ALTER TABLE business_settings ADD COLUMN IF NOT EXISTS print_accent_color text DEFAULT '#7c3aed';
ALTER TABLE business_settings ADD COLUMN IF NOT EXISTS print_original_duplicate boolean DEFAULT true;
ALTER TABLE business_settings ADD COLUMN IF NOT EXISTS print_copy_original boolean DEFAULT true;
ALTER TABLE business_settings ADD COLUMN IF NOT EXISTS print_copy_duplicate boolean DEFAULT true;
ALTER TABLE business_settings ADD COLUMN IF NOT EXISTS print_copy_triplicate boolean DEFAULT true;
ALTER TABLE business_settings ADD COLUMN IF NOT EXISTS print_extra_space_top integer DEFAULT 0;

-- Item Table configuration
ALTER TABLE business_settings ADD COLUMN IF NOT EXISTS print_min_table_rows integer DEFAULT 0;
ALTER TABLE business_settings ADD COLUMN IF NOT EXISTS print_show_item_number boolean DEFAULT true;
ALTER TABLE business_settings ADD COLUMN IF NOT EXISTS print_show_hsn_sac boolean DEFAULT true;
ALTER TABLE business_settings ADD COLUMN IF NOT EXISTS print_show_quantity boolean DEFAULT true;
ALTER TABLE business_settings ADD COLUMN IF NOT EXISTS print_show_price_unit boolean DEFAULT true;
ALTER TABLE business_settings ADD COLUMN IF NOT EXISTS print_show_discount boolean DEFAULT true;
ALTER TABLE business_settings ADD COLUMN IF NOT EXISTS print_show_gst boolean DEFAULT true;

-- Bank Details section
ALTER TABLE business_settings ADD COLUMN IF NOT EXISTS print_bank_details boolean DEFAULT true;
ALTER TABLE business_settings ADD COLUMN IF NOT EXISTS print_bank_name text;
ALTER TABLE business_settings ADD COLUMN IF NOT EXISTS print_bank_account text;
ALTER TABLE business_settings ADD COLUMN IF NOT EXISTS print_bank_ifsc text;
ALTER TABLE business_settings ADD COLUMN IF NOT EXISTS print_upi_qr boolean DEFAULT true;
ALTER TABLE business_settings ADD COLUMN IF NOT EXISTS print_pay_now_btn boolean DEFAULT true;

-- Signature
ALTER TABLE business_settings ADD COLUMN IF NOT EXISTS print_show_signature boolean DEFAULT false;
