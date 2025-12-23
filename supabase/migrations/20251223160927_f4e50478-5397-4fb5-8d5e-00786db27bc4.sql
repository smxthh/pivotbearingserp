-- Create a function to handle invitation acceptance
-- This runs with SECURITY DEFINER to bypass RLS
CREATE OR REPLACE FUNCTION public.accept_invitation(
  p_invitation_id uuid,
  p_user_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invitation RECORD;
BEGIN
  -- Get the invitation
  SELECT * INTO v_invitation
  FROM user_invitations
  WHERE id = p_invitation_id
    AND accepted_at IS NULL;
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- Create user role
  INSERT INTO user_roles (user_id, role, tenant_id)
  VALUES (p_user_id, v_invitation.role, v_invitation.tenant_id)
  ON CONFLICT (user_id, role) DO NOTHING;
  
  -- Create profile if not exists
  INSERT INTO profiles (id, email)
  VALUES (p_user_id, v_invitation.email)
  ON CONFLICT (id) DO NOTHING;
  
  -- Mark invitation as accepted
  UPDATE user_invitations
  SET accepted_at = now()
  WHERE id = p_invitation_id;
  
  RETURN true;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.accept_invitation(uuid, uuid) TO authenticated;