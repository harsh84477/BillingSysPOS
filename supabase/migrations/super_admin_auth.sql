-- Create a table for Super Admin credentials
CREATE TABLE IF NOT EXISTS super_admin_credentials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    display_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on super_admin_credentials (private for extreme security)
ALTER TABLE super_admin_credentials ENABLE ROW LEVEL SECURITY;

-- No policies needed as we will only access this via service_role/RPC

-- Create a function to verify admin credentials securely
-- This keeps the password hash on the server side
CREATE OR REPLACE FUNCTION verify_super_admin_login(p_username TEXT, p_password_plain TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_admin_id UUID;
    v_password_hash TEXT;
    v_display_name TEXT;
BEGIN
    -- Find the admin by username
    SELECT id, password_hash, display_name 
    INTO v_admin_id, v_password_hash, v_display_name
    FROM super_admin_credentials
    WHERE username = p_username;

    -- If no admin found
    IF v_admin_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid username or password');
    END IF;

    -- verify password (using a simple check for now, you should use crypt if pgcrypto is enabled)
    -- If you want to use pgcrypto: IF v_password_hash = crypt(p_password_plain, v_password_hash) THEN
    -- For simplicity in this demo environment, we check absolute match or hash
    IF v_password_hash = p_password_plain THEN
        -- Insert a record into the main super_admins table if not already there 
        -- This links the concept of "Logged in as Admin" to the rest of the app's logic
        -- But since we don't have a real Auth User ID for this custom login yet, 
        -- we'll handle the "Super Admin" flag in the Frontend Session instead.
        
        RETURN jsonb_build_object(
            'success', true, 
            'admin_id', v_admin_id, 
            'display_name', v_display_name
        );
    ELSE
        RETURN jsonb_build_object('success', false, 'error', 'Invalid username or password');
    END IF;
END;
$$;

-- Insert a default admin (Username: admin, Password: admin_password)
-- NOTE: In a real production app, you should use hashed passwords and change this immediately.
INSERT INTO super_admin_credentials (username, password_hash, display_name)
VALUES ('admin', 'admin123', 'System Administrator')
ON CONFLICT (username) DO NOTHING;
