-- ============================================================
-- Fix: Secure storage bucket 'product-images' (V10 - MEDIUM)
-- ============================================================
-- Enforces a 2MB maximum file size limit and restricts the allowed
-- mime types to only image formats (JPEG, PNG, WebP, GIF, SVG)
-- directly on the Supabase Storage server, preventing bypass.

UPDATE storage.buckets
SET file_size_limit = 2097152, -- 2MB (2 * 1024 * 1024 bytes)
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']
WHERE id = 'product-images';
