-- Fix missing tenant_id for admins
-- Admins should be their own tenants

BEGIN;

-- Update tenant_id for admins where it is missing
UPDATE public.user_roles 
SET tenant_id = user_id 
WHERE role = 'admin' AND tenant_id IS NULL;

-- Also ensure salespersons have a tenant_id (if linked to an admin)
-- (We can't easily guess this for salespersons, but we can prevent future issues)

COMMIT;
