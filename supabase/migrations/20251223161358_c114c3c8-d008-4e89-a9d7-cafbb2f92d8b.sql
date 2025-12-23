-- Allow superadmins to delete any profile
CREATE POLICY "Superadmins can delete profiles"
ON public.profiles
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'superadmin'
  )
);