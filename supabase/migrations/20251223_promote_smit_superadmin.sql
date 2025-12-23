-- ============================================================
-- PROMOTE SMITMODI416 TO SUPERADMIN
-- ============================================================
-- I previously set smitmodi416 to 'admin'. Promoting back to 'superadmin' 
-- so they can see the full User Management options.

DO $$
DECLARE
    v_user_id UUID;
BEGIN
    SELECT id INTO v_user_id FROM auth.users WHERE email = 'smitmodi416@gmail.com';
    
    IF v_user_id IS NOT NULL THEN
        -- Update to superadmin
        UPDATE user_roles 
        SET role = 'superadmin'
        WHERE user_id = v_user_id;

        -- If no row existed (unlikely), insert it
        IF NOT FOUND THEN
            INSERT INTO user_roles (user_id, role) VALUES (v_user_id, 'superadmin');
        END IF;
        
        RAISE NOTICE 'Promoted smitmodi416@gmail.com to superadmin';
    ELSE
        RAISE WARNING 'User smitmodi416@gmail.com not found';
    END IF;
END $$;
