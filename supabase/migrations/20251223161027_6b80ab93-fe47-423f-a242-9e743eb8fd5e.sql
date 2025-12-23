-- Manually fix the existing user who signed up but didn't get their role assigned
INSERT INTO user_roles (user_id, role, tenant_id)
VALUES ('bade85ab-b465-4fb0-a5b5-25356e920c37', 'salesperson', '91b3609a-d0fb-43c3-b9f3-fa6bb6989d13')
ON CONFLICT (user_id, role) DO NOTHING;

-- Mark the invitation as accepted
UPDATE user_invitations
SET accepted_at = now()
WHERE id = '007aaa5a-8ae6-427d-a5e0-7c6ba64dc04b';