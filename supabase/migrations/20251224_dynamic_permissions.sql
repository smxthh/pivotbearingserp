-- ==============================================================================
-- DYNAMIC ADMIN PERMISSIONS MIGRATION
-- Created: 2025-12-24
-- Purpose: Schema for storing granule user permissions
-- ==============================================================================

-- 1. USER PERMISSIONS TABLE
CREATE TABLE IF NOT EXISTS public.user_permissions (
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    resource_key text NOT NULL, -- e.g., 'dept:accounting', 'page:ledger'
    access_level text DEFAULT 'view', -- 'view', 'edit', 'admin'
    created_at timestamptz DEFAULT now(),
    created_by uuid REFERENCES auth.users(id),
    PRIMARY KEY (user_id, resource_key)
);

-- RLS
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

-- Policy: Superadmin can do everything
CREATE POLICY "Superadmins can manage all permissions"
    ON public.user_permissions
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() AND r.name = 'superadmin'
        )
    );

-- Policy: Users can read their own permissions
CREATE POLICY "Users can read own permissions"
    ON public.user_permissions
    FOR SELECT
    USING (user_id = auth.uid());


-- 2. RPC: SYNC PERMISSIONS (Bulk Update)
CREATE OR REPLACE FUNCTION public.sync_user_permissions(
    target_user_id uuid,
    resource_keys text[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Check if executor is superadmin
    IF NOT EXISTS (
        SELECT 1 FROM public.user_roles ur
        JOIN public.roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid() AND r.name = 'superadmin'
    ) THEN
        RAISE EXCEPTION 'Access Denied: Only Superadmins can manage permissions';
    END IF;

    -- Delete existing permissions for the user
    DELETE FROM public.user_permissions WHERE user_id = target_user_id;

    -- Insert new permissions
    INSERT INTO public.user_permissions (user_id, resource_key, created_by)
    SELECT target_user_id, unnest(resource_keys), auth.uid();
END;
$$;


-- 3. RPC: GET ACCESSIBLE RESOURCES (Helper)
CREATE OR REPLACE FUNCTION public.get_user_accessible_resources(p_user_id uuid)
RETURNS TABLE (resource_key text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- If user is superadmin, return ALL resources (Conceptual "wildcard" or we handle in frontend)
    -- Ideally, explicit is better. But let's check roles.
    IF EXISTS (
        SELECT 1 FROM public.user_roles ur
        JOIN public.roles r ON ur.role_id = r.id
        WHERE ur.user_id = p_user_id AND r.name = 'superadmin'
    ) THEN
        -- Return a special wildcard or just assume frontend handles superadmin bypass
        -- Let's return a wildcard resource
        RETURN QUERY SELECT '*'::text;
    ELSE
        RETURN QUERY 
        SELECT up.resource_key 
        FROM public.user_permissions up 
        WHERE up.user_id = p_user_id;
    END IF;
END;
$$;

-- 4. ENABLE REALTIME FOR user_permissions
-- This allows real-time subscriptions for permission changes
ALTER TABLE public.user_permissions REPLICA IDENTITY FULL;
