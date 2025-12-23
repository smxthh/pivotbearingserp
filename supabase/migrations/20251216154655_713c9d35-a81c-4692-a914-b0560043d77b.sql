-- Drop the restrictive admin policies on user_roles that cause circular dependency
DROP POLICY IF EXISTS "Admins can view all user roles" ON public.user_roles;

-- Create a PERMISSIVE policy allowing users to view their own role (this is critical!)
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Create separate PERMISSIVE policy for admins (using security definer function)
CREATE POLICY "Admins can view all user roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR auth.uid() = user_id);