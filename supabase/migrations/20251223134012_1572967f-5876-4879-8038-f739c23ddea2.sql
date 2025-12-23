-- Fix: remove recursive policies on user_roles (cannot reference user_roles within its own RLS policies)

-- Drop any potentially recursive policies
DROP POLICY IF EXISTS "Users read own role" ON public.user_roles;
DROP POLICY IF EXISTS "Users can read own role" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own role" ON public.user_roles;
DROP POLICY IF EXISTS "Users can read their own role" ON public.user_roles;
DROP POLICY IF EXISTS "Superadmins view tenant" ON public.user_roles;
DROP POLICY IF EXISTS "Superadmins view tenant users" ON public.user_roles;
DROP POLICY IF EXISTS "Superadmins view tenant" ON public.user_roles;
DROP POLICY IF EXISTS "Superadmins insert users" ON public.user_roles;
DROP POLICY IF EXISTS "Superadmins update users" ON public.user_roles;
DROP POLICY IF EXISTS "Superadmins delete users" ON public.user_roles;
DROP POLICY IF EXISTS "Superadmins insert tenant users" ON public.user_roles;
DROP POLICY IF EXISTS "Superadmins update tenant users" ON public.user_roles;
DROP POLICY IF EXISTS "Superadmins delete tenant users" ON public.user_roles;

-- Remove helper function that can still trigger recursion detection in policy evaluation
DROP FUNCTION IF EXISTS public.get_user_role_direct(uuid);

-- Minimal safe policy set:
-- 1) Any authenticated user can read ONLY their own role row.
CREATE POLICY "user_roles_select_own"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- 2) No INSERT/UPDATE/DELETE from client by default (role assignment should be done via SQL/admin tooling).
-- If you later need role management UI, we should implement a SECURITY DEFINER RPC for controlled updates.

-- Ensure superadmin's tenant_id is set (idempotent)
UPDATE public.user_roles
SET tenant_id = user_id
WHERE role = 'superadmin'::app_role AND tenant_id IS NULL;