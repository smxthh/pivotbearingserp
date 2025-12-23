-- Add SELECT policy for superadmins to view all user roles
CREATE POLICY "superadmin_select_roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (is_superadmin_user());