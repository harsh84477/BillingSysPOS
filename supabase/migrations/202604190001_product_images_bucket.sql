-- Add storage bucket for product-images
DO $$
BEGIN
  INSERT INTO storage.buckets (id, name, public) 
  VALUES ('product-images', 'product-images', true)
  ON CONFLICT (id) DO NOTHING;
EXCEPTION
  WHEN undefined_table THEN NULL;
END $$;

-- Enable RLS / Policies for product-images
DO $$
BEGIN
  CREATE POLICY "Authenticated users can upload product images"
  ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'product-images');
EXCEPTION
  WHEN duplicate_object OR undefined_table OR undefined_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "Authenticated users can update product images"
  ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'product-images');
EXCEPTION
  WHEN duplicate_object OR undefined_table OR undefined_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "Authenticated users can delete product images"
  ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'product-images');
EXCEPTION
  WHEN duplicate_object OR undefined_table OR undefined_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "Anyone can view product images"
  ON storage.objects FOR SELECT TO public USING (bucket_id = 'product-images');
EXCEPTION
  WHEN duplicate_object OR undefined_table OR undefined_object THEN NULL;
END $$;
