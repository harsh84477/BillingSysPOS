-- ============================================================
-- Fix: Super Admin Password Hashing (V1 - CRITICAL)
-- ============================================================
-- Previously, passwords were stored and compared in PLAINTEXT.
-- This migration:
--   1. Enables pgcrypto for bcrypt
--   2. Hashes the existing plaintext password in super_admin_credentials
--   3. Rewrites verify_super_admin_login to use bcrypt comparison
--   4. Adds a helper to hash new passwords

-- 1. Enable pgcrypto extension (idempotent)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Hash existing plaintext passwords in super_admin_credentials
-- The column is called password_hash but previously stored plaintext.
-- We detect unhashed values (bcrypt hashes always start with '$2')
-- and hash them in place.
DO $$
DECLARE
  _row RECORD;
BEGIN
  FOR _row IN SELECT id, password_hash FROM public.super_admin_credentials
  LOOP
    -- Only hash if not already a bcrypt hash
    IF _row.password_hash IS NOT NULL AND LEFT(_row.password_hash, 2) != '$2' THEN
      UPDATE public.super_admin_credentials
      SET password_hash = crypt(_row.password_hash, gen_salt('bf', 10))
      WHERE id = _row.id;
    END IF;
  END LOOP;
END $$;

-- 3. Rewrite verify_super_admin_login to use bcrypt
CREATE OR REPLACE FUNCTION verify_super_admin_login(p_username TEXT, p_password_plain TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin RECORD;
BEGIN
  SELECT * INTO v_admin FROM super_admin_credentials WHERE username = p_username;
  
  -- Check if admin exists and password matches using bcrypt
  IF v_admin.id IS NULL OR crypt(p_password_plain, v_admin.password_hash) != v_admin.password_hash THEN
    -- Log failed attempt (optional, for audit)
    PERFORM pg_sleep(0.5); -- Slow down brute-force attempts
    RETURN jsonb_build_object('success', false, 'error', 'Invalid credentials');
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'admin_id', v_admin.id,
    'display_name', v_admin.display_name
  );
END;
$$;

-- 4. Helper function to hash a new super admin password
-- Usage: SELECT hash_super_admin_password('my_new_password');
CREATE OR REPLACE FUNCTION hash_super_admin_password(p_password TEXT)
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT crypt(p_password, gen_salt('bf', 10));
$$;

-- 5. Add a function to change super admin password securely
CREATE OR REPLACE FUNCTION change_super_admin_password(
  p_admin_id UUID,
  p_old_password TEXT,
  p_new_password TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin RECORD;
BEGIN
  SELECT * INTO v_admin FROM super_admin_credentials WHERE id = p_admin_id;
  
  IF v_admin.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Admin not found');
  END IF;
  
  -- Verify old password
  IF crypt(p_old_password, v_admin.password_hash) != v_admin.password_hash THEN
    RETURN jsonb_build_object('success', false, 'error', 'Current password is incorrect');
  END IF;
  
  -- Enforce minimum password length
  IF length(p_new_password) < 8 THEN
    RETURN jsonb_build_object('success', false, 'error', 'New password must be at least 8 characters');
  END IF;
  
  -- Update with new hashed password
  UPDATE super_admin_credentials
  SET password_hash = crypt(p_new_password, gen_salt('bf', 10)),
      updated_at = now()
  WHERE id = p_admin_id;
  
  RETURN jsonb_build_object('success', true, 'message', 'Password changed successfully');
END;
$$;

NOTIFY pgrst, 'reload schema';
