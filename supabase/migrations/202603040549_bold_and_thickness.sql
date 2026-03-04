ALTER TABLE business_settings ADD COLUMN IF NOT EXISTS invoice_column_headers_bold boolean DEFAULT true;
ALTER TABLE business_settings ADD COLUMN IF NOT EXISTS invoice_grid_thickness numeric DEFAULT 1;
