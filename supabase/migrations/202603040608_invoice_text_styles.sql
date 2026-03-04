ALTER TABLE business_settings ADD COLUMN IF NOT EXISTS invoice_item_desc_style text DEFAULT '';
ALTER TABLE business_settings ADD COLUMN IF NOT EXISTS invoice_mrp_style text DEFAULT '';
ALTER TABLE business_settings ADD COLUMN IF NOT EXISTS invoice_discount_style text DEFAULT '';
ALTER TABLE business_settings ADD COLUMN IF NOT EXISTS invoice_gst_style text DEFAULT '';
