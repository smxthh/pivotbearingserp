-- Create a SECURITY DEFINER function to check if user is superadmin (avoids recursion)
CREATE OR REPLACE FUNCTION public.is_superadmin_user()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'superadmin'
  );
$$;

-- Add INSERT policy for superadmins
CREATE POLICY "superadmin_insert_roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (is_superadmin_user());

-- Add UPDATE policy for superadmins
CREATE POLICY "superadmin_update_roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (is_superadmin_user());

-- Add DELETE policy for superadmins (can't delete self)
CREATE POLICY "superadmin_delete_roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (is_superadmin_user() AND user_id != auth.uid());