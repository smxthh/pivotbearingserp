-- ============================================================
-- FINAL FIX: SET SMITMODI416 TO SUPERADMIN
-- ============================================================
-- Run this ENTIRE script in your Supabase SQL Editor.

-- Step 1: Show current role (for debugging)
SELECT 
    u.email, 
    ur.role 
FROM auth.users u 
LEFT JOIN user_roles ur ON u.id = ur.user_id 
WHERE u.email = 'smitmodi416@gmail.com';

-- Step 2: Force update to superadmin
UPDATE user_roles 
SET role = 'superadmin' 
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'smitmodi416@gmail.com');

-- Step 3: Verify the update worked
SELECT 
    u.email, 
    ur.role 
FROM auth.users u 
LEFT JOIN user_roles ur ON u.id = ur.user_id 
WHERE u.email = 'smitmodi416@gmail.com';
