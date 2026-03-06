-- Add storage bucket for documents and receipts
DO $$
BEGIN
  INSERT INTO storage.buckets (id, name, public) 
  VALUES ('documents', 'documents', true)
  ON CONFLICT (id) DO NOTHING;
EXCEPTION
  WHEN undefined_table THEN NULL;
END $$;

-- Enable RLS for documents if table exists
DO $$
BEGIN
  CREATE POLICY "Authenticated users can upload documents"
  ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'documents');
EXCEPTION
  WHEN duplicate_object OR undefined_table OR undefined_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "Anyone can view documents"
  ON storage.objects FOR SELECT TO public USING (bucket_id = 'documents');
EXCEPTION
  WHEN duplicate_object OR undefined_table OR undefined_object THEN NULL;
END $$;
