-- ============================================================
-- FIX USER_ROLES RLS POLICIES
-- ============================================================
-- The "Pending" page issue occurs because users cannot read their own role from 'user_roles' table.
-- This script ensures RLS is enabled and proper policies exist.

-- 1. Enable RLS on user_roles (good practice, ensuring it's on)
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- 2. Drop potential existing conflicting policies
DROP POLICY IF EXISTS "Users can read own role" ON user_roles;
DROP POLICY IF EXISTS "Superadmin can read all roles" ON user_roles;
DROP POLICY IF EXISTS "Superadmin can manage all roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can read all roles" ON user_roles; -- Legacy policy if any

-- 3. Create Policy: Users can read their OWN role (Critical for Login/AuthContext)
CREATE POLICY "Users can read own role"
ON user_roles FOR SELECT
USING (
    auth.uid() = user_id
);

-- 4. Create Policy: Superadmins can do EVERYTHING on user_roles
CREATE POLICY "Superadmin full access user_roles"
ON user_roles FOR ALL
USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'superadmin')
)
WITH CHECK (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'superadmin')
);

-- Note: We intentionally DO NOT give standard 'admin' write access to user_roles anymore, 
-- or general read access (except maybe for User Management if they are allowed to see users).
-- If standard Admins need to see User Management, they might need "Admins read all roles".
-- Based on the requirement "Admin... restricted to viewing only their own data", 
-- user_roles is effectively global system data. 
-- Standard Admins probably shouldn't see other users' roles unless they are managing users for their distributor?
-- For now, "Users can read own role" fixes the Pending page issue.
