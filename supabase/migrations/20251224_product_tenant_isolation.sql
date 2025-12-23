-- =====================================================
-- PRODUCT DATA ISOLATION MIGRATION
-- Version: 1.0
-- Date: 2025-12-24
-- 
-- This migration implements complete tenant isolation for:
-- - items (products/services)
-- - categories
-- - brands
-- - hsn_codes (per-tenant HSN master)
-- - sac_codes (per-tenant SAC master)
-- =====================================================

BEGIN;

-- ============================================================================
-- PART 1: ADD TENANT_ID TO ALL PRODUCT-RELATED TABLES
-- ============================================================================

-- Items table
ALTER TABLE public.items 
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- Categories table
ALTER TABLE public.categories 
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- Brands table
ALTER TABLE public.brands 
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- HSN codes table - make per-tenant (remove global unique constraint)
ALTER TABLE public.hsn_codes 
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- SAC codes table - make per-tenant
ALTER TABLE public.sac_codes 
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- ============================================================================
-- PART 2: CREATE PERFORMANCE INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_items_tenant_id ON public.items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_categories_tenant_id ON public.categories(tenant_id);
CREATE INDEX IF NOT EXISTS idx_brands_tenant_id ON public.brands(tenant_id);
CREATE INDEX IF NOT EXISTS idx_hsn_codes_tenant_id ON public.hsn_codes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sac_codes_tenant_id ON public.sac_codes(tenant_id);

-- ============================================================================
-- PART 3: UPDATE UNIQUE CONSTRAINTS FOR PER-TENANT UNIQUENESS
-- ============================================================================

-- Drop old global unique constraint on item_code
DROP INDEX IF EXISTS idx_items_unique_code_per_distributor;

-- Create unique constraint per tenant for item codes
CREATE UNIQUE INDEX IF NOT EXISTS idx_items_unique_code_per_tenant 
ON public.items(tenant_id, item_code) 
WHERE item_code IS NOT NULL;

-- Drop old global unique constraint on hsn_codes
-- (Allow same HSN code for different tenants)
ALTER TABLE public.hsn_codes DROP CONSTRAINT IF EXISTS hsn_codes_code_key;

-- Create unique constraint per tenant for HSN codes
CREATE UNIQUE INDEX IF NOT EXISTS idx_hsn_codes_unique_per_tenant 
ON public.hsn_codes(tenant_id, code) 
WHERE tenant_id IS NOT NULL;

-- Drop old global unique constraint on sac_codes
ALTER TABLE public.sac_codes DROP CONSTRAINT IF EXISTS sac_codes_code_key;

-- Create unique constraint per tenant for SAC codes
CREATE UNIQUE INDEX IF NOT EXISTS idx_sac_codes_unique_per_tenant 
ON public.sac_codes(tenant_id, code) 
WHERE tenant_id IS NOT NULL;

-- ============================================================================
-- PART 4: POPULATE TENANT_ID FROM EXISTING DATA
-- ============================================================================

-- Items: populate from distributor_profiles
UPDATE public.items i
SET tenant_id = dp.user_id
FROM distributor_profiles dp
WHERE i.distributor_id = dp.id
AND i.tenant_id IS NULL;

-- Categories: populate from distributor_profiles
UPDATE public.categories c
SET tenant_id = dp.user_id
FROM distributor_profiles dp
WHERE c.distributor_id = dp.id
AND c.tenant_id IS NULL;

-- Brands: populate from distributor_profiles
UPDATE public.brands b
SET tenant_id = dp.user_id
FROM distributor_profiles dp
WHERE b.distributor_id = dp.id
AND b.tenant_id IS NULL;

-- HSN/SAC codes: These are currently global. 
-- We'll keep existing ones as global (NULL tenant_id) for backward compatibility
-- New ones created by admins will have tenant_id set

-- ============================================================================
-- PART 5: AUTO-POPULATION TRIGGERS
-- ============================================================================

-- Generic trigger function for setting tenant_id
CREATE OR REPLACE FUNCTION public.trigger_set_tenant_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.tenant_id IS NULL THEN
    NEW.tenant_id := public.get_user_tenant_id();
  END IF;
  RETURN NEW;
END;
$$;

-- Generic trigger function for setting created_by
CREATE OR REPLACE FUNCTION public.trigger_set_created_by()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.created_by IS NULL THEN
    NEW.created_by := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

-- Apply triggers to items
DROP TRIGGER IF EXISTS set_items_tenant_id ON public.items;
CREATE TRIGGER set_items_tenant_id
  BEFORE INSERT ON public.items
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_tenant_id();

DROP TRIGGER IF EXISTS set_items_created_by ON public.items;
CREATE TRIGGER set_items_created_by
  BEFORE INSERT ON public.items
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_created_by();

-- Apply triggers to categories
DROP TRIGGER IF EXISTS set_categories_tenant_id ON public.categories;
CREATE TRIGGER set_categories_tenant_id
  BEFORE INSERT ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_tenant_id();

DROP TRIGGER IF EXISTS set_categories_created_by ON public.categories;
CREATE TRIGGER set_categories_created_by
  BEFORE INSERT ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_created_by();

-- Apply triggers to brands
DROP TRIGGER IF EXISTS set_brands_tenant_id ON public.brands;
CREATE TRIGGER set_brands_tenant_id
  BEFORE INSERT ON public.brands
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_tenant_id();

DROP TRIGGER IF EXISTS set_brands_created_by ON public.brands;
CREATE TRIGGER set_brands_created_by
  BEFORE INSERT ON public.brands
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_created_by();

-- Apply triggers to hsn_codes
DROP TRIGGER IF EXISTS set_hsn_codes_tenant_id ON public.hsn_codes;
CREATE TRIGGER set_hsn_codes_tenant_id
  BEFORE INSERT ON public.hsn_codes
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_tenant_id();

DROP TRIGGER IF EXISTS set_hsn_codes_created_by ON public.hsn_codes;
CREATE TRIGGER set_hsn_codes_created_by
  BEFORE INSERT ON public.hsn_codes
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_created_by();

-- Apply triggers to sac_codes
DROP TRIGGER IF EXISTS set_sac_codes_tenant_id ON public.sac_codes;
CREATE TRIGGER set_sac_codes_tenant_id
  BEFORE INSERT ON public.sac_codes
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_tenant_id();

DROP TRIGGER IF EXISTS set_sac_codes_created_by ON public.sac_codes;
CREATE TRIGGER set_sac_codes_created_by
  BEFORE INSERT ON public.sac_codes
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_created_by();

-- ============================================================================
-- PART 6: RLS POLICIES FOR ITEMS
-- ============================================================================

ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "superadmin_full_access_items" ON public.items;
DROP POLICY IF EXISTS "tenant_select_items" ON public.items;
DROP POLICY IF EXISTS "tenant_insert_items" ON public.items;
DROP POLICY IF EXISTS "tenant_update_items" ON public.items;
DROP POLICY IF EXISTS "tenant_delete_items" ON public.items;
DROP POLICY IF EXISTS "Distributors can view their items" ON public.items;
DROP POLICY IF EXISTS "Distributors can insert their items" ON public.items;
DROP POLICY IF EXISTS "Distributors can update their items" ON public.items;
DROP POLICY IF EXISTS "Distributors can delete their items" ON public.items;
DROP POLICY IF EXISTS "Salespersons can view items" ON public.items;

-- Superadmin: Full access
CREATE POLICY "superadmin_full_access_items"
ON public.items FOR ALL
USING (public.is_superadmin())
WITH CHECK (public.is_superadmin());

-- Admin & Salesperson: View own tenant's items
CREATE POLICY "tenant_select_items"
ON public.items FOR SELECT
USING (
  NOT public.is_superadmin() 
  AND tenant_id = public.get_user_tenant_id()
);

-- Admin only: Insert items
CREATE POLICY "tenant_insert_items"
ON public.items FOR INSERT
WITH CHECK (
  NOT public.is_superadmin()
  AND public.is_admin()
  AND (tenant_id IS NULL OR tenant_id = public.get_user_tenant_id())
);

-- Admin only: Update items
CREATE POLICY "tenant_update_items"
ON public.items FOR UPDATE
USING (
  NOT public.is_superadmin()
  AND public.is_admin()
  AND tenant_id = public.get_user_tenant_id()
);

-- Admin only: Delete items
CREATE POLICY "tenant_delete_items"
ON public.items FOR DELETE
USING (
  NOT public.is_superadmin()
  AND public.is_admin()
  AND tenant_id = public.get_user_tenant_id()
);

-- ============================================================================
-- PART 7: RLS POLICIES FOR CATEGORIES
-- ============================================================================

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "superadmin_full_access_categories" ON public.categories;
DROP POLICY IF EXISTS "tenant_select_categories" ON public.categories;
DROP POLICY IF EXISTS "tenant_insert_categories" ON public.categories;
DROP POLICY IF EXISTS "tenant_update_categories" ON public.categories;
DROP POLICY IF EXISTS "tenant_delete_categories" ON public.categories;
DROP POLICY IF EXISTS "Distributors can view their categories" ON public.categories;
DROP POLICY IF EXISTS "Distributors can insert their categories" ON public.categories;
DROP POLICY IF EXISTS "Distributors can update their categories" ON public.categories;
DROP POLICY IF EXISTS "Distributors can delete their categories" ON public.categories;
DROP POLICY IF EXISTS "Salespersons can view categories" ON public.categories;

CREATE POLICY "superadmin_full_access_categories"
ON public.categories FOR ALL
USING (public.is_superadmin())
WITH CHECK (public.is_superadmin());

CREATE POLICY "tenant_select_categories"
ON public.categories FOR SELECT
USING (
  NOT public.is_superadmin() 
  AND tenant_id = public.get_user_tenant_id()
);

CREATE POLICY "tenant_insert_categories"
ON public.categories FOR INSERT
WITH CHECK (
  NOT public.is_superadmin()
  AND public.is_admin()
  AND (tenant_id IS NULL OR tenant_id = public.get_user_tenant_id())
);

CREATE POLICY "tenant_update_categories"
ON public.categories FOR UPDATE
USING (
  NOT public.is_superadmin()
  AND public.is_admin()
  AND tenant_id = public.get_user_tenant_id()
);

CREATE POLICY "tenant_delete_categories"
ON public.categories FOR DELETE
USING (
  NOT public.is_superadmin()
  AND public.is_admin()
  AND tenant_id = public.get_user_tenant_id()
);

-- ============================================================================
-- PART 8: RLS POLICIES FOR BRANDS
-- ============================================================================

ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "superadmin_full_access_brands" ON public.brands;
DROP POLICY IF EXISTS "tenant_select_brands" ON public.brands;
DROP POLICY IF EXISTS "tenant_insert_brands" ON public.brands;
DROP POLICY IF EXISTS "tenant_update_brands" ON public.brands;
DROP POLICY IF EXISTS "tenant_delete_brands" ON public.brands;
DROP POLICY IF EXISTS "Distributors can view their brands" ON public.brands;
DROP POLICY IF EXISTS "Distributors can insert their brands" ON public.brands;
DROP POLICY IF EXISTS "Distributors can update their brands" ON public.brands;
DROP POLICY IF EXISTS "Distributors can delete their brands" ON public.brands;
DROP POLICY IF EXISTS "Salespersons can view their distributor brands" ON public.brands;
DROP POLICY IF EXISTS "Admins can view all brands" ON public.brands;
DROP POLICY IF EXISTS "Admins can insert brands" ON public.brands;
DROP POLICY IF EXISTS "Admins can update all brands" ON public.brands;
DROP POLICY IF EXISTS "Admins can delete all brands" ON public.brands;

CREATE POLICY "superadmin_full_access_brands"
ON public.brands FOR ALL
USING (public.is_superadmin())
WITH CHECK (public.is_superadmin());

CREATE POLICY "tenant_select_brands"
ON public.brands FOR SELECT
USING (
  NOT public.is_superadmin() 
  AND tenant_id = public.get_user_tenant_id()
);

CREATE POLICY "tenant_insert_brands"
ON public.brands FOR INSERT
WITH CHECK (
  NOT public.is_superadmin()
  AND public.is_admin()
  AND (tenant_id IS NULL OR tenant_id = public.get_user_tenant_id())
);

CREATE POLICY "tenant_update_brands"
ON public.brands FOR UPDATE
USING (
  NOT public.is_superadmin()
  AND public.is_admin()
  AND tenant_id = public.get_user_tenant_id()
);

CREATE POLICY "tenant_delete_brands"
ON public.brands FOR DELETE
USING (
  NOT public.is_superadmin()
  AND public.is_admin()
  AND tenant_id = public.get_user_tenant_id()
);

-- ============================================================================
-- PART 9: RLS POLICIES FOR HSN_CODES (Per-Tenant + Global Fallback)
-- ============================================================================

ALTER TABLE public.hsn_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view HSN codes" ON public.hsn_codes;
DROP POLICY IF EXISTS "superadmin_full_access_hsn_codes" ON public.hsn_codes;
DROP POLICY IF EXISTS "tenant_select_hsn_codes" ON public.hsn_codes;
DROP POLICY IF EXISTS "tenant_insert_hsn_codes" ON public.hsn_codes;
DROP POLICY IF EXISTS "tenant_update_hsn_codes" ON public.hsn_codes;
DROP POLICY IF EXISTS "tenant_delete_hsn_codes" ON public.hsn_codes;

-- Superadmin: Full access
CREATE POLICY "superadmin_full_access_hsn_codes"
ON public.hsn_codes FOR ALL
USING (public.is_superadmin())
WITH CHECK (public.is_superadmin());

-- Admin & Salesperson: View own tenant's HSN codes OR global (NULL tenant_id)
CREATE POLICY "tenant_select_hsn_codes"
ON public.hsn_codes FOR SELECT
USING (
  NOT public.is_superadmin() 
  AND (tenant_id IS NULL OR tenant_id = public.get_user_tenant_id())
);

-- Admin only: Insert HSN codes
CREATE POLICY "tenant_insert_hsn_codes"
ON public.hsn_codes FOR INSERT
WITH CHECK (
  NOT public.is_superadmin()
  AND public.is_admin()
  AND (tenant_id IS NULL OR tenant_id = public.get_user_tenant_id())
);

-- Admin only: Update own HSN codes (not global ones)
CREATE POLICY "tenant_update_hsn_codes"
ON public.hsn_codes FOR UPDATE
USING (
  NOT public.is_superadmin()
  AND public.is_admin()
  AND tenant_id IS NOT NULL
  AND tenant_id = public.get_user_tenant_id()
);

-- Admin only: Delete own HSN codes (not global ones)
CREATE POLICY "tenant_delete_hsn_codes"
ON public.hsn_codes FOR DELETE
USING (
  NOT public.is_superadmin()
  AND public.is_admin()
  AND tenant_id IS NOT NULL
  AND tenant_id = public.get_user_tenant_id()
);

-- ============================================================================
-- PART 10: RLS POLICIES FOR SAC_CODES (Per-Tenant + Global Fallback)
-- ============================================================================

ALTER TABLE public.sac_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view SAC codes" ON public.sac_codes;
DROP POLICY IF EXISTS "superadmin_full_access_sac_codes" ON public.sac_codes;
DROP POLICY IF EXISTS "tenant_select_sac_codes" ON public.sac_codes;
DROP POLICY IF EXISTS "tenant_insert_sac_codes" ON public.sac_codes;
DROP POLICY IF EXISTS "tenant_update_sac_codes" ON public.sac_codes;
DROP POLICY IF EXISTS "tenant_delete_sac_codes" ON public.sac_codes;

CREATE POLICY "superadmin_full_access_sac_codes"
ON public.sac_codes FOR ALL
USING (public.is_superadmin())
WITH CHECK (public.is_superadmin());

CREATE POLICY "tenant_select_sac_codes"
ON public.sac_codes FOR SELECT
USING (
  NOT public.is_superadmin() 
  AND (tenant_id IS NULL OR tenant_id = public.get_user_tenant_id())
);

CREATE POLICY "tenant_insert_sac_codes"
ON public.sac_codes FOR INSERT
WITH CHECK (
  NOT public.is_superadmin()
  AND public.is_admin()
  AND (tenant_id IS NULL OR tenant_id = public.get_user_tenant_id())
);

CREATE POLICY "tenant_update_sac_codes"
ON public.sac_codes FOR UPDATE
USING (
  NOT public.is_superadmin()
  AND public.is_admin()
  AND tenant_id IS NOT NULL
  AND tenant_id = public.get_user_tenant_id()
);

CREATE POLICY "tenant_delete_sac_codes"
ON public.sac_codes FOR DELETE
USING (
  NOT public.is_superadmin()
  AND public.is_admin()
  AND tenant_id IS NOT NULL
  AND tenant_id = public.get_user_tenant_id()
);

-- ============================================================================
-- PART 11: GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.brands TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hsn_codes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sac_codes TO authenticated;

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES (Run manually)
-- ============================================================================
/*
-- Check tenant_id population
SELECT 
  'items' as table_name, 
  COUNT(*) as total,
  COUNT(tenant_id) as with_tenant
FROM items
UNION ALL
SELECT 'categories', COUNT(*), COUNT(tenant_id) FROM categories
UNION ALL
SELECT 'brands', COUNT(*), COUNT(tenant_id) FROM brands
UNION ALL
SELECT 'hsn_codes', COUNT(*), COUNT(tenant_id) FROM hsn_codes
UNION ALL
SELECT 'sac_codes', COUNT(*), COUNT(tenant_id) FROM sac_codes;

-- Check RLS policies
SELECT tablename, policyname, cmd 
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('items', 'categories', 'brands', 'hsn_codes', 'sac_codes')
ORDER BY tablename, policyname;
*/
