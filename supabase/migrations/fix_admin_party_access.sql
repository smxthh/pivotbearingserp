-- ============================================================
-- FIX ADMIN PARTY ACCESS
-- ============================================================
-- This migration ensures admins can create distributor profiles
-- and add parties without restrictions

-- ============================================================
-- UPDATE DISTRIBUTOR_PROFILES RLS POLICIES
-- ============================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can insert their own distributor profile" ON distributor_profiles;
DROP POLICY IF EXISTS "Admins can insert distributor profiles" ON distributor_profiles;

-- Allow users to insert their own profile
CREATE POLICY "Users can insert their own distributor profile"
ON distributor_profiles FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Allow admins to insert any distributor profile
CREATE POLICY "Admins can insert distributor profiles"
ON distributor_profiles FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- ============================================================
-- UPDATE PARTIES RLS POLICIES FOR ADMIN ACCESS
-- ============================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins can view all parties" ON parties;
DROP POLICY IF EXISTS "Admins can insert parties" ON parties;
DROP POLICY IF EXISTS "Admins can update all parties" ON parties;
DROP POLICY IF EXISTS "Admins can delete all parties" ON parties;

-- Allow admins to view all parties
CREATE POLICY "Admins can view all parties"
ON parties FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- Allow admins to insert parties
CREATE POLICY "Admins can insert parties"
ON parties FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- Allow admins to update all parties
CREATE POLICY "Admins can update all parties"
ON parties FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- Allow admins to delete all parties
CREATE POLICY "Admins can delete all parties"
ON parties FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- ============================================================
-- VERIFY ADMIN USER EXISTS
-- ============================================================

-- Check if smitmodi416@gmail.com has admin role
DO $$
DECLARE
    admin_user_id UUID;
BEGIN
    -- Get user ID from auth.users
    SELECT id INTO admin_user_id
    FROM auth.users
    WHERE email = 'smitmodi416@gmail.com';

    IF admin_user_id IS NOT NULL THEN
        -- Ensure admin role exists
        INSERT INTO user_roles (user_id, role)
        VALUES (admin_user_id, 'admin')
        ON CONFLICT (user_id, role) DO NOTHING;

        RAISE NOTICE 'Admin role ensured for user: %', admin_user_id;
    ELSE
        RAISE NOTICE 'User smitmodi416@gmail.com not found in auth.users';
    END IF;
END $$;

-- ============================================================
-- GRANT PERMISSIONS
-- ============================================================

-- Ensure authenticated users can access tables
GRANT SELECT, INSERT, UPDATE, DELETE ON parties TO authenticated;
GRANT SELECT, INSERT, UPDATE ON distributor_profiles TO authenticated;

-- ============================================================
-- VERIFICATION QUERIES
-- ============================================================

-- Run these to verify the setup:

-- 1. Check admin user role
-- SELECT u.email, ur.role
-- FROM auth.users u
-- LEFT JOIN user_roles ur ON u.id = ur.user_id
-- WHERE u.email = 'smitmodi416@gmail.com';

-- 2. Check admin distributor profile
-- SELECT dp.*
-- FROM distributor_profiles dp
-- JOIN auth.users u ON dp.user_id = u.id
-- WHERE u.email = 'smitmodi416@gmail.com';

-- 3. Test party insert (run as admin)
-- INSERT INTO parties (distributor_id, name, type, state)
-- VALUES (
--   (SELECT id FROM distributor_profiles WHERE user_id = auth.uid() LIMIT 1),
--   'Test Party',
--   'customer',
--   'Gujarat'
-- );

-- ============================================================
-- NOTES
-- ============================================================
-- After running this migration:
-- 1. Admin users will automatically get a distributor profile
-- 2. Admins can add/edit/delete parties without restrictions
-- 3. The useDistributorId hook will create profiles for admins
-- 4. All RLS policies are properly configured
