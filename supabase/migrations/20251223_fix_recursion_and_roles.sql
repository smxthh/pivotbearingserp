-- ============================================================
-- FIX RECURSION AND ASSIGN ROLES
-- ============================================================

-- 1. Create a helper function to check superadmin status securely
-- This function uses SECURITY DEFINER to bypass RLS, avoiding infinite recursion
-- when querying the user_roles table within a user_roles policy.
CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'superadmin'
  );
END;
$$;

-- 2. Fix policies on user_roles
-- Drop potentially problematic policies
DROP POLICY IF EXISTS "Superadmin full access user_roles" ON user_roles;
DROP POLICY IF EXISTS "Superadmin manage all roles" ON user_roles;
DROP POLICY IF EXISTS "Users can read own role" ON user_roles;

-- Policy 1: Users can read their own role (Critical for Login)
CREATE POLICY "Users can read own role"
ON user_roles FOR SELECT
USING (auth.uid() = user_id);

-- Policy 2: Superadmins can manage all roles (Using the safe function)
CREATE POLICY "Superadmin manage all roles"
ON user_roles FOR ALL
USING ( is_superadmin() )
WITH CHECK ( is_superadmin() );


-- 3. Update User Roles as requested
DO $$
DECLARE
    v_smit_id UUID;
    v_abc_id UUID;
BEGIN
    -- Get User IDs
    SELECT id INTO v_smit_id FROM auth.users WHERE email = 'smitmodi416@gmail.com';
    SELECT id INTO v_abc_id FROM auth.users WHERE email = 'abc@gmail.com';

    -- Update smitmodi416@gmail.com to 'admin'
    IF v_smit_id IS NOT NULL THEN
        -- Upsert admin role (delete first to ensure clean state if multiple roles existed)
        DELETE FROM user_roles WHERE user_id = v_smit_id;
        INSERT INTO user_roles (user_id, role) VALUES (v_smit_id, 'admin');
        RAISE NOTICE 'Updated smitmodi416@gmail.com to admin';
    ELSE
        RAISE WARNING 'User smitmodi416@gmail.com not found';
    END IF;

    -- Update abc@gmail.com to 'superadmin'
    IF v_abc_id IS NOT NULL THEN
        DELETE FROM user_roles WHERE user_id = v_abc_id;
        INSERT INTO user_roles (user_id, role) VALUES (v_abc_id, 'superadmin');
        RAISE NOTICE 'Updated abc@gmail.com to superadmin';
    ELSE
        RAISE WARNING 'User abc@gmail.com not found - Please sign up this user first';
    END IF;
END $$;
