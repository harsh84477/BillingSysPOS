-- Add icon column to products table
ALTER TABLE public.products
ADD COLUMN icon text DEFAULT 'Package';