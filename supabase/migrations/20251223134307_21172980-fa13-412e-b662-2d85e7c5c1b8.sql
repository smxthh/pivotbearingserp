-- Fix infinite recursion: user_roles RLS policies must NOT reference user_roles (directly or via has_role/is_superadmin)

-- Drop all existing policies on public.user_roles that reference roles via user_roles
DROP POLICY IF EXISTS "Admins can delete user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can insert user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can update user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Superadmin manage all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Superadmins can manage tenant roles" ON public.user_roles;
DROP POLICY IF EXISTS "Superadmins can view tenant roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_select_own" ON public.user_roles;

-- Recreate a single non-recursive policy: users can read only their own role row
CREATE POLICY "user_roles_select_own"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- (Optional hardening) Ensure RLS is enabled
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;