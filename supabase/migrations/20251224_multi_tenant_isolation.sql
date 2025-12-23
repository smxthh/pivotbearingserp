-- =====================================================
-- COMPLETE MULTI-TENANT DATA ISOLATION MIGRATION
-- Version: 1.1 (Fixed table names)
-- Date: 2025-12-23
-- 
-- This migration implements:
-- 1. tenant_id column on ALL business tables
-- 2. created_by/updated_by audit columns
-- 3. Comprehensive RLS policies for 3-tier access
-- 4. Auto-population triggers
-- 5. Dashboard RPCs for tenant analytics
-- =====================================================

BEGIN;

-- ============================================================================
-- PART 1: CORE HELPER FUNCTIONS
-- ============================================================================

-- Function: Check if current user is superadmin
CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() 
    AND role = 'superadmin'::app_role
  );
$$;

-- Function: Check if current user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() 
    AND role = 'admin'::app_role
  );
$$;

-- Function: Check if current user is salesperson
CREATE OR REPLACE FUNCTION public.is_salesperson()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() 
    AND role = 'salesperson'::app_role
  );
$$;

-- Function: Get current user's role
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM user_roles 
  WHERE user_id = auth.uid() 
  LIMIT 1;
$$;

-- Function: Get the current user's tenant_id
CREATE OR REPLACE FUNCTION public.get_user_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    -- Admin: their tenant is their own user_id
    (SELECT user_id FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'::app_role),
    -- Salesperson: their tenant is the tenant_id from their role assignment
    (SELECT tenant_id FROM user_roles WHERE user_id = auth.uid() AND role = 'salesperson'::app_role)
  );
$$;

-- Function: Check if user can access a specific tenant's data
CREATE OR REPLACE FUNCTION public.can_access_tenant(p_tenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    public.is_superadmin()
    OR
    public.get_user_tenant_id() = p_tenant_id;
$$;

-- Function: Get the distributor_id for the current user's tenant
CREATE OR REPLACE FUNCTION public.get_tenant_distributor_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id 
  FROM distributor_profiles 
  WHERE user_id = public.get_user_tenant_id()
  LIMIT 1;
$$;

-- Legacy compatibility function
CREATE OR REPLACE FUNCTION public.get_user_distributor_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.get_tenant_distributor_id();
$$;

-- ============================================================================
-- PART 2: ADD TENANT_ID AND AUDIT COLUMNS TO ALL TABLES
-- ============================================================================

-- Add columns to parties table
ALTER TABLE public.parties 
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- Add columns to vouchers table
ALTER TABLE public.vouchers 
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- Add columns to items table (NOT products!)
ALTER TABLE public.items 
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- Add columns to categories table
ALTER TABLE public.categories 
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- Add columns to brands table
ALTER TABLE public.brands 
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- Add columns to purchase_orders table
ALTER TABLE public.purchase_orders 
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- Add columns to gate_inward table (if exists)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'gate_inward' AND table_schema = 'public') THEN
    ALTER TABLE public.gate_inward 
    ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES auth.users(id),
    ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
    ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);
  END IF;
END $$;

-- Add columns to marking table (if exists)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'marking' AND table_schema = 'public') THEN
    ALTER TABLE public.marking 
    ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES auth.users(id),
    ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
    ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);
  END IF;
END $$;

-- Add columns to packing table (if exists)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'packing' AND table_schema = 'public') THEN
    ALTER TABLE public.packing 
    ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES auth.users(id),
    ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
    ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);
  END IF;
END $$;

-- Add columns to opening_stock table (if exists)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'opening_stock' AND table_schema = 'public') THEN
    ALTER TABLE public.opening_stock 
    ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES auth.users(id),
    ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
    ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);
  END IF;
END $$;

-- Add columns to ledgers table (if exists)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ledgers' AND table_schema = 'public') THEN
    ALTER TABLE public.ledgers 
    ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES auth.users(id),
    ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
    ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);
  END IF;
END $$;

-- Add columns to ledger_groups table (if exists)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ledger_groups' AND table_schema = 'public') THEN
    ALTER TABLE public.ledger_groups 
    ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES auth.users(id),
    ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
    ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);
  END IF;
END $$;

-- Add columns to terms table (if exists)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'terms' AND table_schema = 'public') THEN
    ALTER TABLE public.terms 
    ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES auth.users(id),
    ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
    ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);
  END IF;
END $$;

-- Add columns to transports table (if exists)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'transports' AND table_schema = 'public') THEN
    ALTER TABLE public.transports 
    ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES auth.users(id),
    ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
    ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);
  END IF;
END $$;

-- Add columns to store_locations table (if exists)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'store_locations' AND table_schema = 'public') THEN
    ALTER TABLE public.store_locations 
    ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES auth.users(id),
    ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
    ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);
  END IF;
END $$;

-- Add columns to sales_zones table (if exists)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sales_zones' AND table_schema = 'public') THEN
    ALTER TABLE public.sales_zones 
    ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES auth.users(id),
    ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
    ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);
  END IF;
END $$;

-- Add columns to price_structures table (if exists)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'price_structures' AND table_schema = 'public') THEN
    ALTER TABLE public.price_structures 
    ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES auth.users(id),
    ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
    ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);
  END IF;
END $$;

-- Add columns to voucher_prefixes table (if exists)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'voucher_prefixes' AND table_schema = 'public') THEN
    ALTER TABLE public.voucher_prefixes 
    ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES auth.users(id),
    ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
    ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);
  END IF;
END $$;

-- Add columns to salespersons table
ALTER TABLE public.salespersons 
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- ============================================================================
-- PART 3: CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_parties_tenant_id ON public.parties(tenant_id);
CREATE INDEX IF NOT EXISTS idx_vouchers_tenant_id ON public.vouchers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_vouchers_created_by ON public.vouchers(created_by);
CREATE INDEX IF NOT EXISTS idx_items_tenant_id ON public.items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_categories_tenant_id ON public.categories(tenant_id);
CREATE INDEX IF NOT EXISTS idx_brands_tenant_id ON public.brands(tenant_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_tenant_id ON public.purchase_orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_salespersons_tenant_id ON public.salespersons(tenant_id);

-- ============================================================================
-- PART 4: POPULATE TENANT_ID FROM EXISTING DATA
-- ============================================================================

-- Populate tenant_id for parties from distributor_profiles
UPDATE public.parties p
SET tenant_id = dp.user_id
FROM distributor_profiles dp
WHERE p.distributor_id = dp.id
AND p.tenant_id IS NULL;

-- Populate tenant_id for vouchers from distributor_profiles
UPDATE public.vouchers v
SET tenant_id = dp.user_id
FROM distributor_profiles dp
WHERE v.distributor_id = dp.id
AND v.tenant_id IS NULL;

-- Populate tenant_id for items from distributor_profiles
UPDATE public.items i
SET tenant_id = dp.user_id
FROM distributor_profiles dp
WHERE i.distributor_id = dp.id
AND i.tenant_id IS NULL;

-- Populate tenant_id for categories from distributor_profiles
UPDATE public.categories c
SET tenant_id = dp.user_id
FROM distributor_profiles dp
WHERE c.distributor_id = dp.id
AND c.tenant_id IS NULL;

-- Populate tenant_id for brands from distributor_profiles
UPDATE public.brands b
SET tenant_id = dp.user_id
FROM distributor_profiles dp
WHERE b.distributor_id = dp.id
AND b.tenant_id IS NULL;

-- Populate tenant_id for purchase_orders from distributor_profiles
UPDATE public.purchase_orders po
SET tenant_id = dp.user_id
FROM distributor_profiles dp
WHERE po.distributor_id = dp.id
AND po.tenant_id IS NULL;

-- Populate tenant_id for salespersons from distributor_profiles
UPDATE public.salespersons s
SET tenant_id = dp.user_id
FROM distributor_profiles dp
WHERE s.distributor_id = dp.id
AND s.tenant_id IS NULL;

-- ============================================================================
-- PART 5: AUTO-POPULATION TRIGGERS
-- ============================================================================

-- Trigger function: Auto-set tenant_id on INSERT
CREATE OR REPLACE FUNCTION public.trigger_set_tenant_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
BEGIN
  v_tenant_id := public.get_user_tenant_id();
  
  IF NEW.tenant_id IS NULL AND v_tenant_id IS NOT NULL THEN
    NEW.tenant_id := v_tenant_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger function: Auto-set created_by on INSERT
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

-- Trigger function: Auto-set updated_by on UPDATE
CREATE OR REPLACE FUNCTION public.trigger_set_updated_by()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_by := auth.uid();
  IF TG_TABLE_NAME != 'vouchers' THEN
    NEW.updated_at := now();
  END IF;
  RETURN NEW;
END;
$$;

-- Apply triggers to parties
DROP TRIGGER IF EXISTS set_parties_tenant_id ON public.parties;
CREATE TRIGGER set_parties_tenant_id
  BEFORE INSERT ON public.parties
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_tenant_id();

DROP TRIGGER IF EXISTS set_parties_created_by ON public.parties;
CREATE TRIGGER set_parties_created_by
  BEFORE INSERT ON public.parties
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_created_by();

DROP TRIGGER IF EXISTS set_parties_updated_by ON public.parties;
CREATE TRIGGER set_parties_updated_by
  BEFORE UPDATE ON public.parties
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_by();

-- Apply triggers to vouchers
DROP TRIGGER IF EXISTS set_vouchers_tenant_id ON public.vouchers;
CREATE TRIGGER set_vouchers_tenant_id
  BEFORE INSERT ON public.vouchers
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_tenant_id();

DROP TRIGGER IF EXISTS set_vouchers_created_by ON public.vouchers;
CREATE TRIGGER set_vouchers_created_by
  BEFORE INSERT ON public.vouchers
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_created_by();

DROP TRIGGER IF EXISTS set_vouchers_updated_by ON public.vouchers;
CREATE TRIGGER set_vouchers_updated_by
  BEFORE UPDATE ON public.vouchers
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_by();

-- Apply triggers to items
DROP TRIGGER IF EXISTS set_items_tenant_id ON public.items;
CREATE TRIGGER set_items_tenant_id
  BEFORE INSERT ON public.items
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_tenant_id();

DROP TRIGGER IF EXISTS set_items_created_by ON public.items;
CREATE TRIGGER set_items_created_by
  BEFORE INSERT ON public.items
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_created_by();

DROP TRIGGER IF EXISTS set_items_updated_by ON public.items;
CREATE TRIGGER set_items_updated_by
  BEFORE UPDATE ON public.items
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_by();

-- Apply triggers to categories
DROP TRIGGER IF EXISTS set_categories_tenant_id ON public.categories;
CREATE TRIGGER set_categories_tenant_id
  BEFORE INSERT ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_tenant_id();

DROP TRIGGER IF EXISTS set_categories_created_by ON public.categories;
CREATE TRIGGER set_categories_created_by
  BEFORE INSERT ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_created_by();

DROP TRIGGER IF EXISTS set_categories_updated_by ON public.categories;
CREATE TRIGGER set_categories_updated_by
  BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_by();

-- Apply triggers to brands
DROP TRIGGER IF EXISTS set_brands_tenant_id ON public.brands;
CREATE TRIGGER set_brands_tenant_id
  BEFORE INSERT ON public.brands
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_tenant_id();

DROP TRIGGER IF EXISTS set_brands_created_by ON public.brands;
CREATE TRIGGER set_brands_created_by
  BEFORE INSERT ON public.brands
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_created_by();

DROP TRIGGER IF EXISTS set_brands_updated_by_tenant ON public.brands;
CREATE TRIGGER set_brands_updated_by_tenant
  BEFORE UPDATE ON public.brands
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_by();

-- Apply triggers to purchase_orders
DROP TRIGGER IF EXISTS set_purchase_orders_tenant_id ON public.purchase_orders;
CREATE TRIGGER set_purchase_orders_tenant_id
  BEFORE INSERT ON public.purchase_orders
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_tenant_id();

DROP TRIGGER IF EXISTS set_purchase_orders_created_by ON public.purchase_orders;
CREATE TRIGGER set_purchase_orders_created_by
  BEFORE INSERT ON public.purchase_orders
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_created_by();

DROP TRIGGER IF EXISTS set_purchase_orders_updated_by ON public.purchase_orders;
CREATE TRIGGER set_purchase_orders_updated_by
  BEFORE UPDATE ON public.purchase_orders
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_by();

-- ============================================================================
-- PART 6: RLS POLICIES FOR ALL TABLES
-- ============================================================================

-- ==================== PARTIES ====================
ALTER TABLE public.parties ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "superadmin_full_access_parties" ON public.parties;
DROP POLICY IF EXISTS "tenant_select_parties" ON public.parties;
DROP POLICY IF EXISTS "tenant_insert_parties" ON public.parties;
DROP POLICY IF EXISTS "tenant_update_parties" ON public.parties;
DROP POLICY IF EXISTS "tenant_delete_parties" ON public.parties;

CREATE POLICY "superadmin_full_access_parties"
ON public.parties FOR ALL
USING (public.is_superadmin())
WITH CHECK (public.is_superadmin());

CREATE POLICY "tenant_select_parties"
ON public.parties FOR SELECT
USING (
  NOT public.is_superadmin() 
  AND tenant_id = public.get_user_tenant_id()
);

CREATE POLICY "tenant_insert_parties"
ON public.parties FOR INSERT
WITH CHECK (
  NOT public.is_superadmin()
  AND (tenant_id IS NULL OR tenant_id = public.get_user_tenant_id())
);

CREATE POLICY "tenant_update_parties"
ON public.parties FOR UPDATE
USING (
  NOT public.is_superadmin()
  AND tenant_id = public.get_user_tenant_id()
)
WITH CHECK (
  NOT public.is_superadmin()
  AND tenant_id = public.get_user_tenant_id()
);

CREATE POLICY "tenant_delete_parties"
ON public.parties FOR DELETE
USING (
  NOT public.is_superadmin()
  AND tenant_id = public.get_user_tenant_id()
);

-- ==================== VOUCHERS ====================
ALTER TABLE public.vouchers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "superadmin_full_access_vouchers" ON public.vouchers;
DROP POLICY IF EXISTS "tenant_select_vouchers" ON public.vouchers;
DROP POLICY IF EXISTS "tenant_insert_vouchers" ON public.vouchers;
DROP POLICY IF EXISTS "tenant_update_vouchers" ON public.vouchers;
DROP POLICY IF EXISTS "tenant_delete_vouchers" ON public.vouchers;

CREATE POLICY "superadmin_full_access_vouchers"
ON public.vouchers FOR ALL
USING (public.is_superadmin())
WITH CHECK (public.is_superadmin());

CREATE POLICY "tenant_select_vouchers"
ON public.vouchers FOR SELECT
USING (
  NOT public.is_superadmin() 
  AND tenant_id = public.get_user_tenant_id()
);

CREATE POLICY "tenant_insert_vouchers"
ON public.vouchers FOR INSERT
WITH CHECK (
  NOT public.is_superadmin()
  AND (tenant_id IS NULL OR tenant_id = public.get_user_tenant_id())
);

CREATE POLICY "tenant_update_vouchers"
ON public.vouchers FOR UPDATE
USING (
  NOT public.is_superadmin()
  AND tenant_id = public.get_user_tenant_id()
)
WITH CHECK (
  NOT public.is_superadmin()
  AND tenant_id = public.get_user_tenant_id()
);

CREATE POLICY "tenant_delete_vouchers"
ON public.vouchers FOR DELETE
USING (
  NOT public.is_superadmin()
  AND tenant_id = public.get_user_tenant_id()
);

-- ==================== ITEMS ====================
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "superadmin_full_access_items" ON public.items;
DROP POLICY IF EXISTS "tenant_select_items" ON public.items;
DROP POLICY IF EXISTS "tenant_insert_items" ON public.items;
DROP POLICY IF EXISTS "tenant_update_items" ON public.items;
DROP POLICY IF EXISTS "tenant_delete_items" ON public.items;

CREATE POLICY "superadmin_full_access_items"
ON public.items FOR ALL
USING (public.is_superadmin())
WITH CHECK (public.is_superadmin());

CREATE POLICY "tenant_select_items"
ON public.items FOR SELECT
USING (
  NOT public.is_superadmin() 
  AND tenant_id = public.get_user_tenant_id()
);

CREATE POLICY "tenant_insert_items"
ON public.items FOR INSERT
WITH CHECK (
  NOT public.is_superadmin()
  AND (tenant_id IS NULL OR tenant_id = public.get_user_tenant_id())
);

CREATE POLICY "tenant_update_items"
ON public.items FOR UPDATE
USING (
  NOT public.is_superadmin()
  AND tenant_id = public.get_user_tenant_id()
)
WITH CHECK (
  NOT public.is_superadmin()
  AND tenant_id = public.get_user_tenant_id()
);

CREATE POLICY "tenant_delete_items"
ON public.items FOR DELETE
USING (
  NOT public.is_superadmin()
  AND tenant_id = public.get_user_tenant_id()
);

-- ==================== CATEGORIES ====================
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "superadmin_full_access_categories" ON public.categories;
DROP POLICY IF EXISTS "tenant_select_categories" ON public.categories;
DROP POLICY IF EXISTS "tenant_insert_categories" ON public.categories;
DROP POLICY IF EXISTS "tenant_update_categories" ON public.categories;
DROP POLICY IF EXISTS "tenant_delete_categories" ON public.categories;

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
  AND (tenant_id IS NULL OR tenant_id = public.get_user_tenant_id())
);

CREATE POLICY "tenant_update_categories"
ON public.categories FOR UPDATE
USING (
  NOT public.is_superadmin()
  AND tenant_id = public.get_user_tenant_id()
)
WITH CHECK (
  NOT public.is_superadmin()
  AND tenant_id = public.get_user_tenant_id()
);

CREATE POLICY "tenant_delete_categories"
ON public.categories FOR DELETE
USING (
  NOT public.is_superadmin()
  AND tenant_id = public.get_user_tenant_id()
);

-- ==================== BRANDS ====================
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "superadmin_full_access_brands" ON public.brands;
DROP POLICY IF EXISTS "tenant_select_brands" ON public.brands;
DROP POLICY IF EXISTS "tenant_insert_brands" ON public.brands;
DROP POLICY IF EXISTS "tenant_update_brands" ON public.brands;
DROP POLICY IF EXISTS "tenant_delete_brands" ON public.brands;

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
  AND (tenant_id IS NULL OR tenant_id = public.get_user_tenant_id())
);

CREATE POLICY "tenant_update_brands"
ON public.brands FOR UPDATE
USING (
  NOT public.is_superadmin()
  AND tenant_id = public.get_user_tenant_id()
)
WITH CHECK (
  NOT public.is_superadmin()
  AND tenant_id = public.get_user_tenant_id()
);

CREATE POLICY "tenant_delete_brands"
ON public.brands FOR DELETE
USING (
  NOT public.is_superadmin()
  AND tenant_id = public.get_user_tenant_id()
);

-- ==================== PURCHASE_ORDERS ====================
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "superadmin_full_access_purchase_orders" ON public.purchase_orders;
DROP POLICY IF EXISTS "tenant_select_purchase_orders" ON public.purchase_orders;
DROP POLICY IF EXISTS "tenant_insert_purchase_orders" ON public.purchase_orders;
DROP POLICY IF EXISTS "tenant_update_purchase_orders" ON public.purchase_orders;
DROP POLICY IF EXISTS "tenant_delete_purchase_orders" ON public.purchase_orders;

CREATE POLICY "superadmin_full_access_purchase_orders"
ON public.purchase_orders FOR ALL
USING (public.is_superadmin())
WITH CHECK (public.is_superadmin());

CREATE POLICY "tenant_select_purchase_orders"
ON public.purchase_orders FOR SELECT
USING (
  NOT public.is_superadmin() 
  AND tenant_id = public.get_user_tenant_id()
);

CREATE POLICY "tenant_insert_purchase_orders"
ON public.purchase_orders FOR INSERT
WITH CHECK (
  NOT public.is_superadmin()
  AND (tenant_id IS NULL OR tenant_id = public.get_user_tenant_id())
);

CREATE POLICY "tenant_update_purchase_orders"
ON public.purchase_orders FOR UPDATE
USING (
  NOT public.is_superadmin()
  AND tenant_id = public.get_user_tenant_id()
)
WITH CHECK (
  NOT public.is_superadmin()
  AND tenant_id = public.get_user_tenant_id()
);

CREATE POLICY "tenant_delete_purchase_orders"
ON public.purchase_orders FOR DELETE
USING (
  NOT public.is_superadmin()
  AND tenant_id = public.get_user_tenant_id()
);

-- ==================== SALESPERSONS ====================
ALTER TABLE public.salespersons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "superadmin_full_access_salespersons" ON public.salespersons;
DROP POLICY IF EXISTS "tenant_select_salespersons" ON public.salespersons;
DROP POLICY IF EXISTS "tenant_manage_salespersons" ON public.salespersons;

CREATE POLICY "superadmin_full_access_salespersons"
ON public.salespersons FOR ALL
USING (public.is_superadmin())
WITH CHECK (public.is_superadmin());

CREATE POLICY "tenant_select_salespersons"
ON public.salespersons FOR SELECT
USING (
  NOT public.is_superadmin() 
  AND tenant_id = public.get_user_tenant_id()
);

CREATE POLICY "tenant_manage_salespersons"
ON public.salespersons FOR ALL
USING (
  public.is_admin()
  AND tenant_id = public.get_user_tenant_id()
)
WITH CHECK (
  public.is_admin()
  AND (tenant_id IS NULL OR tenant_id = public.get_user_tenant_id())
);

-- ============================================================================
-- PART 7: DASHBOARD RPC FOR TENANT ANALYTICS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_tenant_dashboard_stats(
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
  v_distributor_id UUID;
  v_start_date DATE;
  v_end_date DATE;
  v_result JSON;
BEGIN
  v_tenant_id := public.get_user_tenant_id();
  
  -- If superadmin with no specific tenant, return platform-wide stats
  IF v_tenant_id IS NULL AND public.is_superadmin() THEN
    SELECT json_build_object(
      'is_platform_wide', true,
      'total_tenants', (SELECT COUNT(DISTINCT tenant_id) FROM user_roles WHERE role = 'admin'::app_role),
      'total_users', (SELECT COUNT(*) FROM user_roles),
      'total_invoices', (SELECT COUNT(*) FROM vouchers WHERE voucher_type = 'tax_invoice')
    ) INTO v_result;
    RETURN v_result;
  END IF;
  
  SELECT id INTO v_distributor_id
  FROM distributor_profiles
  WHERE user_id = v_tenant_id;
  
  -- Set date range (default to current financial year)
  v_start_date := COALESCE(p_start_date, 
    CASE WHEN EXTRACT(MONTH FROM CURRENT_DATE) >= 4 
      THEN DATE_TRUNC('year', CURRENT_DATE) + INTERVAL '3 months'
      ELSE DATE_TRUNC('year', CURRENT_DATE) - INTERVAL '9 months'
    END
  );
  v_end_date := COALESCE(p_end_date, CURRENT_DATE);
  
  SELECT json_build_object(
    'tenant_id', v_tenant_id,
    'distributor_id', v_distributor_id,
    'date_range', json_build_object('start', v_start_date, 'end', v_end_date),
    
    'total_items', (
      SELECT COUNT(*) FROM items 
      WHERE tenant_id = v_tenant_id
    ),
    'total_parties', (
      SELECT COUNT(*) FROM parties 
      WHERE tenant_id = v_tenant_id
    ),
    'total_salespersons', (
      SELECT COUNT(*) FROM salespersons 
      WHERE tenant_id = v_tenant_id AND is_active = true
    ),
    
    'total_sales', (
      SELECT COALESCE(SUM(total_amount), 0) 
      FROM vouchers 
      WHERE tenant_id = v_tenant_id 
        AND voucher_type = 'tax_invoice'
        AND status != 'cancelled'
        AND voucher_date BETWEEN v_start_date AND v_end_date
    ),
    'total_invoices', (
      SELECT COUNT(*) 
      FROM vouchers 
      WHERE tenant_id = v_tenant_id 
        AND voucher_type = 'tax_invoice'
        AND voucher_date BETWEEN v_start_date AND v_end_date
    ),
    
    'salesperson_performance', (
      SELECT COALESCE(json_agg(sp_stats), '[]'::json)
      FROM (
        SELECT 
          s.id,
          s.name,
          s.email,
          COUNT(v.id) as invoice_count,
          COALESCE(SUM(v.total_amount), 0) as total_sales
        FROM salespersons s
        LEFT JOIN vouchers v ON v.created_by = s.user_id 
          AND v.tenant_id = v_tenant_id
          AND v.voucher_type = 'tax_invoice'
          AND v.status != 'cancelled'
          AND v.voucher_date BETWEEN v_start_date AND v_end_date
        WHERE s.tenant_id = v_tenant_id AND s.is_active = true
        GROUP BY s.id, s.name, s.email
        ORDER BY total_sales DESC
      ) sp_stats
    )
  ) INTO v_result;
  
  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_tenant_dashboard_stats TO authenticated;

-- ============================================================================
-- PART 8: GRANT NECESSARY PERMISSIONS
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.is_superadmin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_salesperson() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_tenant_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_tenant(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_tenant_distributor_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_distributor_id() TO authenticated;

COMMIT;
