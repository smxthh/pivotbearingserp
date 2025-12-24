-- FIX FOR TENANT ID RESOLUTION
-- Run this in Supabase SQL Editor

CREATE OR REPLACE FUNCTION public.get_user_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    -- 1. Check user_roles for explicit assignment
    (SELECT user_id FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'::app_role LIMIT 1),
    (SELECT tenant_id FROM user_roles WHERE user_id = auth.uid() AND role = 'salesperson'::app_role LIMIT 1),
    
    -- 2. Fallback: Check if user is a distributor owner directly
    (SELECT user_id FROM distributor_profiles WHERE user_id = auth.uid() LIMIT 1),
    
    -- 3. Last Resort: Use auth.uid() directly (assuming single-tenant owner model)
    auth.uid()
  );
$$;
