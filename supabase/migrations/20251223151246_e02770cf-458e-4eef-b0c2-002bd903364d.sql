-- =====================================================
-- COMPLETE RBAC OVERHAUL: 3-Tier Visibility Model
-- Superadmin: sees ALL, Admin: sees own tenant, Salesperson: sees own created_by
-- =====================================================

-- 1. First, fix existing tenant_id values - set admin's tenant_id to their own user_id
UPDATE user_roles 
SET tenant_id = user_id 
WHERE role = 'admin' AND tenant_id IS NULL;

-- 2. Create user_invitations table for secure salesperson onboarding
CREATE TABLE IF NOT EXISTS public.user_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  role app_role NOT NULL DEFAULT 'salesperson',
  inviter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '7 days'),
  accepted_at TIMESTAMPTZ,
  UNIQUE(email, tenant_id)
);

-- Enable RLS on user_invitations
ALTER TABLE public.user_invitations ENABLE ROW LEVEL SECURITY;

-- Invitations policy: admins see only their tenant's invitations, superadmin sees all
CREATE POLICY "Superadmin can manage all invitations"
ON public.user_invitations FOR ALL
USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'superadmin')
);

CREATE POLICY "Admins can manage their tenant invitations"
ON public.user_invitations FOR ALL
USING (
  tenant_id = auth.uid() AND 
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
)
WITH CHECK (
  tenant_id = auth.uid() AND 
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- 3. Create or replace helper functions for RLS with proper tenant isolation

-- Function to check if user is superadmin
CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role = 'superadmin'
  );
$$;

-- Function to check if user is admin (any admin, not tenant-specific)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  );
$$;

-- Function to check if user is salesperson
CREATE OR REPLACE FUNCTION public.is_salesperson()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role = 'salesperson'
  );
$$;

-- Function to get user's tenant_id (for admins, it's their own user_id; for salesperson, it's their assigned tenant)
CREATE OR REPLACE FUNCTION public.get_user_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    -- Superadmin: their tenant is their own user_id
    (SELECT user_id FROM user_roles WHERE user_id = auth.uid() AND role = 'superadmin'),
    -- Admin: their tenant is their own user_id
    (SELECT user_id FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'),
    -- Salesperson: their tenant is the tenant_id from their role
    (SELECT tenant_id FROM user_roles WHERE user_id = auth.uid() AND role = 'salesperson')
  );
$$;

-- Function to get user's distributor_id based on their tenant
CREATE OR REPLACE FUNCTION public.get_user_distributor_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT dp.id 
  FROM distributor_profiles dp
  WHERE dp.user_id = public.get_user_tenant_id()
  LIMIT 1;
$$;

-- Function to get user's role
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM user_roles WHERE user_id = auth.uid() LIMIT 1;
$$;

-- 4. Update user_roles RLS policies to fix visibility leak
DROP POLICY IF EXISTS "Superadmins can view all user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view their tenant user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own role" ON public.user_roles;

-- Superadmin sees ALL user_roles
CREATE POLICY "Superadmin full access to user_roles"
ON public.user_roles FOR ALL
USING (public.is_superadmin())
WITH CHECK (public.is_superadmin());

-- Admins can only see users in their tenant (tenant_id = their user_id)
CREATE POLICY "Admins see their tenant users only"
ON public.user_roles FOR SELECT
USING (
  public.is_admin() AND tenant_id = auth.uid()
);

-- Admins can insert users into their tenant
CREATE POLICY "Admins can assign roles to their tenant"
ON public.user_roles FOR INSERT
WITH CHECK (
  public.is_admin() AND tenant_id = auth.uid() AND role = 'salesperson'
);

-- Users can see their own role
CREATE POLICY "Users see own role"
ON public.user_roles FOR SELECT
USING (user_id = auth.uid());

-- 5. Update profiles RLS to restrict visibility
DROP POLICY IF EXISTS "Admins can view profiles in their tenant" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Superadmins can view all profiles" ON public.profiles;

-- Users can always see their own profile
CREATE POLICY "Users see own profile"
ON public.profiles FOR SELECT
USING (id = auth.uid());

-- Superadmins see all profiles
CREATE POLICY "Superadmin sees all profiles"
ON public.profiles FOR ALL
USING (public.is_superadmin());

-- Admins see only profiles of users in their tenant
CREATE POLICY "Admins see tenant profiles only"
ON public.profiles FOR SELECT
USING (
  public.is_admin() AND 
  id IN (SELECT user_id FROM user_roles WHERE tenant_id = auth.uid())
);

-- 6. Create trigger to auto-assign role from invitation on signup
CREATE OR REPLACE FUNCTION public.handle_new_user_invitation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  invite_record RECORD;
BEGIN
  -- Check for pending invitation for this email
  SELECT * INTO invite_record
  FROM user_invitations
  WHERE email = NEW.email
    AND accepted_at IS NULL
    AND expires_at > now()
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF invite_record IS NOT NULL THEN
    -- Auto-assign role and tenant from invitation
    INSERT INTO user_roles (user_id, role, tenant_id)
    VALUES (NEW.id, invite_record.role, invite_record.tenant_id);
    
    -- Mark invitation as accepted
    UPDATE user_invitations
    SET accepted_at = now()
    WHERE id = invite_record.id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on auth.users (if not exists)
DROP TRIGGER IF EXISTS on_auth_user_created_check_invitation ON auth.users;
CREATE TRIGGER on_auth_user_created_check_invitation
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_invitation();

-- 7. Add created_by column to key tables if not exists (for salesperson filtering)
DO $$
BEGIN
  -- Add created_by to parties if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'parties' AND column_name = 'created_by') THEN
    ALTER TABLE public.parties ADD COLUMN created_by UUID REFERENCES auth.users(id);
  END IF;
  
  -- Add created_by to vouchers if not exists  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vouchers' AND column_name = 'created_by') THEN
    ALTER TABLE public.vouchers ADD COLUMN created_by UUID REFERENCES auth.users(id);
  END IF;
END $$;