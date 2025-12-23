-- Drop ALL existing policies on user_roles to start fresh
DROP POLICY IF EXISTS "Users can read own role" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own role" ON public.user_roles;
DROP POLICY IF EXISTS "Superadmins can manage tenant users" ON public.user_roles;
DROP POLICY IF EXISTS "Superadmins can view tenant users" ON public.user_roles;
DROP POLICY IF EXISTS "Superadmins view tenant users" ON public.user_roles;
DROP POLICY IF EXISTS "Superadmins insert tenant users" ON public.user_roles;
DROP POLICY IF EXISTS "Superadmins update tenant users" ON public.user_roles;
DROP POLICY IF EXISTS "Superadmins delete tenant users" ON public.user_roles;

-- Create a security definer function to get user role without RLS
CREATE OR REPLACE FUNCTION public.get_user_role_direct(p_user_id uuid)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = p_user_id LIMIT 1;
$$;

-- Simple policy: Users can always read their own role
CREATE POLICY "Users read own role"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Superadmins can view all users where tenant_id matches their user_id
CREATE POLICY "Superadmins view tenant"
ON public.user_roles
FOR SELECT
TO authenticated
USING (
  tenant_id = auth.uid() 
  AND get_user_role_direct(auth.uid()) = 'superadmin'
);

-- Superadmins can insert users into their tenant
CREATE POLICY "Superadmins insert users"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  tenant_id = auth.uid() 
  AND get_user_role_direct(auth.uid()) = 'superadmin'
);

-- Superadmins can update users in their tenant
CREATE POLICY "Superadmins update users"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (
  tenant_id = auth.uid() 
  AND get_user_role_direct(auth.uid()) = 'superadmin'
);

-- Superadmins can delete non-self users in their tenant
CREATE POLICY "Superadmins delete users"
ON public.user_roles
FOR DELETE
TO authenticated
USING (
  tenant_id = auth.uid() 
  AND get_user_role_direct(auth.uid()) = 'superadmin'
  AND user_id != auth.uid()
);

-- Set the superadmin's tenant_id to their own user_id
UPDATE public.user_roles 
SET tenant_id = user_id 
WHERE user_id = '91b3609a-d0fb-43c3-b9f3-fa6bb6989d13' 
AND role = 'superadmin';