-- =====================================================
-- SELF-SIGNUP USERS TRACKING
-- Allows superadmin to see users who signed up without invitation
-- =====================================================

-- Function to get all auth users who have no role assigned
-- This uses security definer to access auth.users
CREATE OR REPLACE FUNCTION public.get_self_signup_users()
RETURNS TABLE (
    id uuid,
    email text,
    created_at timestamptz,
    email_confirmed_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Only superadmin can call this function
    IF NOT EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = auth.uid() 
        AND role = 'superadmin'
    ) THEN
        RAISE EXCEPTION 'Only superadmin can access this function';
    END IF;

    -- Return users from auth.users who have no entry in user_roles
    RETURN QUERY
    SELECT 
        au.id,
        au.email::text,
        au.created_at,
        au.email_confirmed_at
    FROM auth.users au
    WHERE NOT EXISTS (
        SELECT 1 FROM user_roles ur WHERE ur.user_id = au.id
    )
    ORDER BY au.created_at DESC;
END;
$$;

-- Grant execute permission to authenticated users (RLS will filter)
GRANT EXECUTE ON FUNCTION public.get_self_signup_users() TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.get_self_signup_users() IS 
'Returns users who signed up without invitation (no role assigned). Only superadmin can call this.';
