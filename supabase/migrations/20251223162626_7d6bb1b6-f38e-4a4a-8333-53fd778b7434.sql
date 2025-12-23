-- Fix existing user ragearmy901@gmail.com by assigning salesperson role
DO $$
DECLARE
  v_user_id uuid;
  v_tenant_id uuid := '91b3609a-d0fb-43c3-b9f3-fa6bb6989d13';
BEGIN
  -- Get user id from profiles
  SELECT id INTO v_user_id FROM profiles WHERE email = 'ragearmy901@gmail.com';
  
  IF v_user_id IS NOT NULL THEN
    -- Delete any existing roles
    DELETE FROM user_roles WHERE user_id = v_user_id;
    
    -- Insert salesperson role
    INSERT INTO user_roles (user_id, role, tenant_id)
    VALUES (v_user_id, 'salesperson', v_tenant_id);
    
    RAISE NOTICE 'Assigned salesperson role to user %', v_user_id;
  ELSE
    RAISE NOTICE 'User not found';
  END IF;
END $$;