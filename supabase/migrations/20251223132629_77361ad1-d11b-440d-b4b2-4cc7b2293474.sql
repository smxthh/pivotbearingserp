-- Phase 1: Multi-Tenant Role-Based ERP Schema Updates

-- 1. Add tenant_id to user_roles table (references the SuperAdmin's user_id)
ALTER TABLE public.user_roles 
ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. Create index for tenant lookups
CREATE INDEX IF NOT EXISTS idx_user_roles_tenant_id ON public.user_roles(tenant_id);

-- 3. Update app_role enum to include superadmin if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'superadmin' AND enumtypid = 'app_role'::regtype) THEN
        ALTER TYPE app_role ADD VALUE 'superadmin' BEFORE 'admin';
    END IF;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- 4. Create helper function to get current user's tenant_id
CREATE OR REPLACE FUNCTION public.get_user_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    -- If user is superadmin, their tenant_id is their own user_id
    (SELECT user_id FROM user_roles WHERE user_id = auth.uid() AND role = 'superadmin'),
    -- Otherwise, get the tenant_id from their role assignment
    (SELECT tenant_id FROM user_roles WHERE user_id = auth.uid() LIMIT 1)
  );
$$;

-- 5. Create function to check if user is superadmin of a tenant
CREATE OR REPLACE FUNCTION public.is_tenant_superadmin(p_tenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'superadmin' 
    AND (tenant_id = p_tenant_id OR user_id = p_tenant_id)
  );
$$;

-- 6. Create function to check if user belongs to tenant
CREATE OR REPLACE FUNCTION public.belongs_to_tenant(p_tenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT get_user_tenant_id() = p_tenant_id;
$$;

-- 7. Create data_export_logs table for audit trail
CREATE TABLE IF NOT EXISTS public.data_export_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    superadmin_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    target_user_email text NOT NULL,
    target_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    export_type text NOT NULL DEFAULT 'all', -- 'all', 'parties', 'invoices', etc.
    export_format text NOT NULL DEFAULT 'json', -- 'json', 'csv', 'excel'
    record_count integer DEFAULT 0,
    file_size_bytes bigint DEFAULT 0,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    metadata jsonb DEFAULT '{}'::jsonb
);

-- 8. Enable RLS on data_export_logs
ALTER TABLE public.data_export_logs ENABLE ROW LEVEL SECURITY;

-- 9. Create RLS policy for data_export_logs (only superadmins can view their tenant's logs)
CREATE POLICY "Superadmins can view their tenant export logs"
ON public.data_export_logs
FOR SELECT
USING (
    tenant_id = get_user_tenant_id() 
    AND EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = auth.uid() 
        AND role = 'superadmin'
    )
);

CREATE POLICY "Superadmins can insert export logs"
ON public.data_export_logs
FOR INSERT
WITH CHECK (
    superadmin_id = auth.uid()
    AND EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = auth.uid() 
        AND role = 'superadmin'
    )
);

-- 10. Create tenant_users view for easy querying
CREATE OR REPLACE VIEW public.tenant_users AS
SELECT 
    ur.user_id,
    ur.role,
    ur.tenant_id,
    ur.created_at,
    p.email
FROM public.user_roles ur
LEFT JOIN public.profiles p ON ur.user_id = p.id;

-- 11. Update RLS on user_roles table for tenant isolation
DROP POLICY IF EXISTS "Users can view their own role" ON public.user_roles;
DROP POLICY IF EXISTS "Superadmin can manage all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Superadmin can manage tenant roles" ON public.user_roles;

-- Allow users to view their own role
CREATE POLICY "Users can view their own role"
ON public.user_roles
FOR SELECT
USING (user_id = auth.uid());

-- Superadmins can view all roles within their tenant
CREATE POLICY "Superadmins can view tenant roles"
ON public.user_roles
FOR SELECT
USING (
    tenant_id = get_user_tenant_id()
    OR user_id = auth.uid()
);

-- Superadmins can manage roles within their tenant
CREATE POLICY "Superadmins can manage tenant roles"
ON public.user_roles
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = auth.uid() 
        AND role = 'superadmin'
    )
    AND (tenant_id = get_user_tenant_id() OR tenant_id IS NULL)
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = auth.uid() 
        AND role = 'superadmin'
    )
);

-- 12. Add comment for documentation
COMMENT ON TABLE public.data_export_logs IS 'Audit log for SuperAdmin data exports - tracks all data downloads for compliance';
COMMENT ON COLUMN public.user_roles.tenant_id IS 'References the SuperAdmin user_id who owns this tenant';