-- Add new columns for Urban Bill Style colors
ALTER TABLE public.business_settings 
ADD COLUMN IF NOT EXISTS print_primary_color TEXT DEFAULT '#242B3E',
ADD COLUMN IF NOT EXISTS print_secondary_color TEXT DEFAULT '#A3A3A3';

-- Notify PostgREST to reload the schema cache.
NOTIFY pgrst, 'reload schema';
