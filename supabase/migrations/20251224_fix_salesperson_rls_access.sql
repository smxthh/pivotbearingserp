-- =====================================================
-- SALESPERSON ACCESS FIX MIGRATION
-- Version: 1.0
-- Date: 2025-12-24
-- 
-- Fixes RLS policies for tables that salespersons need
-- to access via their tenant (admin) relationship
-- =====================================================

BEGIN;

-- ============================================================================
-- PART 1: FIX VOUCHER_PREFIXES RLS
-- Salespersons need to SELECT their admin's voucher prefixes
-- ============================================================================

ALTER TABLE public.voucher_prefixes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "voucher_prefixes_select_policy" ON public.voucher_prefixes;
DROP POLICY IF EXISTS "voucher_prefixes_insert_policy" ON public.voucher_prefixes;
DROP POLICY IF EXISTS "voucher_prefixes_update_policy" ON public.voucher_prefixes;
DROP POLICY IF EXISTS "voucher_prefixes_delete_policy" ON public.voucher_prefixes;
DROP POLICY IF EXISTS "superadmin_full_access_voucher_prefixes" ON public.voucher_prefixes;
DROP POLICY IF EXISTS "tenant_select_voucher_prefixes" ON public.voucher_prefixes;
DROP POLICY IF EXISTS "tenant_manage_voucher_prefixes" ON public.voucher_prefixes;

-- Superadmin: Full access
CREATE POLICY "superadmin_full_access_voucher_prefixes"
ON public.voucher_prefixes FOR ALL
USING (public.is_superadmin())
WITH CHECK (public.is_superadmin());

-- Admin & Salesperson: SELECT their tenant's prefixes
-- Uses distributor_profiles.user_id = get_user_tenant_id() to find the right distributor
CREATE POLICY "tenant_select_voucher_prefixes"
ON public.voucher_prefixes FOR SELECT
USING (
  NOT public.is_superadmin()
  AND distributor_id IN (
    SELECT id FROM distributor_profiles 
    WHERE user_id = public.get_user_tenant_id()
  )
);

-- Admin only: INSERT/UPDATE/DELETE
CREATE POLICY "tenant_manage_voucher_prefixes"
ON public.voucher_prefixes FOR ALL
USING (
  public.is_admin()
  AND distributor_id IN (
    SELECT id FROM distributor_profiles 
    WHERE user_id = public.get_user_tenant_id()
  )
)
WITH CHECK (
  public.is_admin()
  AND distributor_id IN (
    SELECT id FROM distributor_profiles 
    WHERE user_id = public.get_user_tenant_id()
  )
);

-- ============================================================================
-- PART 2: FIX VOUCHER_NUMBER_SEQUENCES RLS
-- ============================================================================

ALTER TABLE public.voucher_number_sequences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "voucher_sequences_select_policy" ON public.voucher_number_sequences;
DROP POLICY IF EXISTS "voucher_sequences_insert_policy" ON public.voucher_number_sequences;
DROP POLICY IF EXISTS "voucher_sequences_update_policy" ON public.voucher_number_sequences;
DROP POLICY IF EXISTS "superadmin_full_access_voucher_sequences" ON public.voucher_number_sequences;
DROP POLICY IF EXISTS "tenant_access_voucher_sequences" ON public.voucher_number_sequences;

-- Superadmin: Full access
CREATE POLICY "superadmin_full_access_voucher_sequences"
ON public.voucher_number_sequences FOR ALL
USING (public.is_superadmin())
WITH CHECK (public.is_superadmin());

-- Admin & Salesperson: Access via voucher_prefixes -> distributor_profiles -> tenant
CREATE POLICY "tenant_access_voucher_sequences"
ON public.voucher_number_sequences FOR ALL
USING (
  NOT public.is_superadmin()
  AND prefix_id IN (
    SELECT id FROM voucher_prefixes 
    WHERE distributor_id IN (
      SELECT id FROM distributor_profiles 
      WHERE user_id = public.get_user_tenant_id()
    )
  )
)
WITH CHECK (
  NOT public.is_superadmin()
  AND prefix_id IN (
    SELECT id FROM voucher_prefixes 
    WHERE distributor_id IN (
      SELECT id FROM distributor_profiles 
      WHERE user_id = public.get_user_tenant_id()
    )
  )
);

-- ============================================================================
-- PART 3: FIX DISTRIBUTOR_PROFILES RLS
-- Salespersons need to SELECT their admin's distributor profile
-- ============================================================================

ALTER TABLE public.distributor_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "distributor_profiles_select" ON public.distributor_profiles;
DROP POLICY IF EXISTS "distributor_profiles_manage" ON public.distributor_profiles;
DROP POLICY IF EXISTS "Distributors can view their profile" ON public.distributor_profiles;
DROP POLICY IF EXISTS "Distributors can update their profile" ON public.distributor_profiles;
DROP POLICY IF EXISTS "Distributors can insert their profile" ON public.distributor_profiles;
DROP POLICY IF EXISTS "superadmin_full_access_distributor_profiles" ON public.distributor_profiles;
DROP POLICY IF EXISTS "tenant_select_distributor_profiles" ON public.distributor_profiles;
DROP POLICY IF EXISTS "tenant_manage_distributor_profiles" ON public.distributor_profiles;

-- Superadmin: Full access
CREATE POLICY "superadmin_full_access_distributor_profiles"
ON public.distributor_profiles FOR ALL
USING (public.is_superadmin())
WITH CHECK (public.is_superadmin());

-- Admin & Salesperson: SELECT their tenant's distributor profile
CREATE POLICY "tenant_select_distributor_profiles"
ON public.distributor_profiles FOR SELECT
USING (
  NOT public.is_superadmin()
  AND user_id = public.get_user_tenant_id()
);

-- Admin only: INSERT/UPDATE/DELETE their own profile
CREATE POLICY "tenant_manage_distributor_profiles"
ON public.distributor_profiles FOR ALL
USING (
  public.is_admin()
  AND user_id = auth.uid()
)
WITH CHECK (
  public.is_admin()
  AND user_id = auth.uid()
);

-- ============================================================================
-- PART 4: FIX LEDGERS RLS (if using distributor_id)
-- Salespersons need to access ledgers for invoice creation
-- ============================================================================

DO $$ 
BEGIN
  -- Check if ledgers table has RLS enabled and fix policies
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ledgers' AND table_schema = 'public') THEN
    -- Enable RLS
    ALTER TABLE public.ledgers ENABLE ROW LEVEL SECURITY;
    
    -- Drop old policies
    EXECUTE 'DROP POLICY IF EXISTS "superadmin_full_access_ledgers" ON public.ledgers';
    EXECUTE 'DROP POLICY IF EXISTS "tenant_select_ledgers" ON public.ledgers';
    EXECUTE 'DROP POLICY IF EXISTS "tenant_manage_ledgers" ON public.ledgers';
    EXECUTE 'DROP POLICY IF EXISTS "Distributors can view their ledgers" ON public.ledgers';
    EXECUTE 'DROP POLICY IF EXISTS "Distributors can manage their ledgers" ON public.ledgers';
    
    -- Superadmin: Full access
    EXECUTE 'CREATE POLICY "superadmin_full_access_ledgers" ON public.ledgers FOR ALL USING (public.is_superadmin()) WITH CHECK (public.is_superadmin())';
    
    -- Admin & Salesperson: SELECT ledgers via tenant
    EXECUTE 'CREATE POLICY "tenant_select_ledgers" ON public.ledgers FOR SELECT USING (
      NOT public.is_superadmin()
      AND (
        tenant_id = public.get_user_tenant_id()
        OR distributor_id IN (SELECT id FROM distributor_profiles WHERE user_id = public.get_user_tenant_id())
      )
    )';
    
    -- Admin only: Manage ledgers
    EXECUTE 'CREATE POLICY "tenant_manage_ledgers" ON public.ledgers FOR ALL USING (
      public.is_admin()
      AND (
        tenant_id = public.get_user_tenant_id()
        OR distributor_id IN (SELECT id FROM distributor_profiles WHERE user_id = public.get_user_tenant_id())
      )
    ) WITH CHECK (
      public.is_admin()
      AND (
        tenant_id IS NULL OR tenant_id = public.get_user_tenant_id()
      )
    )';
  END IF;
END $$;

-- ============================================================================
-- PART 5: GRANTS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.voucher_prefixes TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.voucher_number_sequences TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.distributor_profiles TO authenticated;

COMMIT;

-- ============================================================================
-- VERIFICATION QUERY (Run manually to verify)
-- ============================================================================
/*
-- Test as salesperson: should return tenant's voucher_prefixes
SELECT * FROM voucher_prefixes LIMIT 5;

-- Test as salesperson: should return tenant's distributor_profile
SELECT * FROM distributor_profiles LIMIT 5;

-- Check policies
SELECT tablename, policyname, cmd 
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('voucher_prefixes', 'voucher_number_sequences', 'distributor_profiles', 'ledgers')
ORDER BY tablename, policyname;
*/
