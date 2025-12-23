-- =====================================================
-- CONSOLIDATED SALESPERSON ACCESS FIX
-- Run this SINGLE migration to fix all salesperson issues
-- =====================================================

-- ============================================================================
-- STEP 1: DISTRIBUTOR_PROFILES - Salesperson can read their tenant's profile
-- ============================================================================

ALTER TABLE public.distributor_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Distributors can view their profile" ON public.distributor_profiles;
DROP POLICY IF EXISTS "Distributors can update their profile" ON public.distributor_profiles;
DROP POLICY IF EXISTS "Distributors can insert their profile" ON public.distributor_profiles;
DROP POLICY IF EXISTS "superadmin_full_access_distributor_profiles" ON public.distributor_profiles;
DROP POLICY IF EXISTS "tenant_select_distributor_profiles" ON public.distributor_profiles;
DROP POLICY IF EXISTS "tenant_manage_distributor_profiles" ON public.distributor_profiles;
DROP POLICY IF EXISTS "distributor_profiles_select" ON public.distributor_profiles;
DROP POLICY IF EXISTS "distributor_profiles_manage" ON public.distributor_profiles;

-- Anyone can SELECT if user_id matches their tenant
CREATE POLICY "tenant_select_distributor_profiles"
ON public.distributor_profiles FOR SELECT
USING (
  user_id = public.get_user_tenant_id()
  OR user_id = auth.uid()
  OR public.is_superadmin()
);

-- Admin/Superadmin can manage their own profile
CREATE POLICY "admin_manage_distributor_profiles"
ON public.distributor_profiles FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Superadmin can manage all
CREATE POLICY "superadmin_full_distributor_profiles"
ON public.distributor_profiles FOR ALL
USING (public.is_superadmin())
WITH CHECK (public.is_superadmin());

-- ============================================================================
-- STEP 2: VOUCHER_PREFIXES - Salesperson can read tenant's prefixes
-- ============================================================================

ALTER TABLE public.voucher_prefixes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "voucher_prefixes_select_policy" ON public.voucher_prefixes;
DROP POLICY IF EXISTS "voucher_prefixes_insert_policy" ON public.voucher_prefixes;
DROP POLICY IF EXISTS "voucher_prefixes_update_policy" ON public.voucher_prefixes;
DROP POLICY IF EXISTS "voucher_prefixes_delete_policy" ON public.voucher_prefixes;
DROP POLICY IF EXISTS "superadmin_full_access_voucher_prefixes" ON public.voucher_prefixes;
DROP POLICY IF EXISTS "tenant_select_voucher_prefixes" ON public.voucher_prefixes;
DROP POLICY IF EXISTS "tenant_manage_voucher_prefixes" ON public.voucher_prefixes;

-- Anyone in tenant can SELECT
CREATE POLICY "tenant_select_voucher_prefixes"
ON public.voucher_prefixes FOR SELECT
USING (
  distributor_id IN (
    SELECT id FROM distributor_profiles 
    WHERE user_id = public.get_user_tenant_id() OR user_id = auth.uid()
  )
  OR public.is_superadmin()
);

-- Admin can manage
CREATE POLICY "admin_manage_voucher_prefixes"
ON public.voucher_prefixes FOR ALL
USING (
  public.is_admin()
  AND distributor_id IN (
    SELECT id FROM distributor_profiles WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  public.is_admin()
  AND distributor_id IN (
    SELECT id FROM distributor_profiles WHERE user_id = auth.uid()
  )
);

-- Superadmin full access
CREATE POLICY "superadmin_full_voucher_prefixes"
ON public.voucher_prefixes FOR ALL
USING (public.is_superadmin())
WITH CHECK (public.is_superadmin());

-- ============================================================================
-- STEP 3: VOUCHERS - Salesperson can create & view invoices
-- ============================================================================

ALTER TABLE public.vouchers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vouchers_select" ON public.vouchers;
DROP POLICY IF EXISTS "vouchers_all" ON public.vouchers;
DROP POLICY IF EXISTS "superadmin_full_access_vouchers" ON public.vouchers;
DROP POLICY IF EXISTS "tenant_select_vouchers" ON public.vouchers;
DROP POLICY IF EXISTS "tenant_insert_vouchers" ON public.vouchers;
DROP POLICY IF EXISTS "tenant_update_vouchers" ON public.vouchers;
DROP POLICY IF EXISTS "tenant_delete_vouchers" ON public.vouchers;

-- Superadmin: Full access
CREATE POLICY "superadmin_full_vouchers"
ON public.vouchers FOR ALL
USING (public.is_superadmin())
WITH CHECK (public.is_superadmin());

-- Tenant SELECT (admin + salesperson)
CREATE POLICY "tenant_select_vouchers"
ON public.vouchers FOR SELECT
USING (
  distributor_id IN (
    SELECT id FROM distributor_profiles 
    WHERE user_id = public.get_user_tenant_id() OR user_id = auth.uid()
  )
);

-- Tenant INSERT (admin + salesperson can create invoices)
CREATE POLICY "tenant_insert_vouchers"
ON public.vouchers FOR INSERT
WITH CHECK (
  distributor_id IN (
    SELECT id FROM distributor_profiles 
    WHERE user_id = public.get_user_tenant_id() OR user_id = auth.uid()
  )
);

-- Tenant UPDATE
CREATE POLICY "tenant_update_vouchers"
ON public.vouchers FOR UPDATE
USING (
  distributor_id IN (
    SELECT id FROM distributor_profiles 
    WHERE user_id = public.get_user_tenant_id() OR user_id = auth.uid()
  )
);

-- Admin only DELETE
CREATE POLICY "admin_delete_vouchers"
ON public.vouchers FOR DELETE
USING (
  public.is_admin()
  AND distributor_id IN (
    SELECT id FROM distributor_profiles WHERE user_id = auth.uid()
  )
);

-- ============================================================================
-- STEP 4: VOUCHER_ITEMS - Follow voucher access
-- ============================================================================

ALTER TABLE public.voucher_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "voucher_items_select" ON public.voucher_items;
DROP POLICY IF EXISTS "voucher_items_all" ON public.voucher_items;
DROP POLICY IF EXISTS "superadmin_full_access_voucher_items" ON public.voucher_items;
DROP POLICY IF EXISTS "tenant_access_voucher_items" ON public.voucher_items;

-- Anyone who can access the voucher can access its items
CREATE POLICY "voucher_items_access"
ON public.voucher_items FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM vouchers v 
    WHERE v.id = voucher_items.voucher_id 
    AND (
      v.distributor_id IN (
        SELECT id FROM distributor_profiles 
        WHERE user_id = public.get_user_tenant_id() OR user_id = auth.uid()
      )
      OR public.is_superadmin()
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM vouchers v 
    WHERE v.id = voucher_items.voucher_id 
    AND (
      v.distributor_id IN (
        SELECT id FROM distributor_profiles 
        WHERE user_id = public.get_user_tenant_id() OR user_id = auth.uid()
      )
      OR public.is_superadmin()
    )
  )
);

-- ============================================================================
-- STEP 5: LEDGERS - Salesperson can read & insert (for auto-ledger creation)
-- ============================================================================

ALTER TABLE public.ledgers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ledgers_select" ON public.ledgers;
DROP POLICY IF EXISTS "ledgers_all" ON public.ledgers;
DROP POLICY IF EXISTS "superadmin_full_access_ledgers" ON public.ledgers;
DROP POLICY IF EXISTS "tenant_select_ledgers" ON public.ledgers;
DROP POLICY IF EXISTS "tenant_manage_ledgers" ON public.ledgers;
DROP POLICY IF EXISTS "admin_manage_ledgers" ON public.ledgers;
DROP POLICY IF EXISTS "salesperson_insert_ledgers" ON public.ledgers;

-- Superadmin full access
CREATE POLICY "superadmin_full_ledgers"
ON public.ledgers FOR ALL
USING (public.is_superadmin())
WITH CHECK (public.is_superadmin());

-- Tenant SELECT
CREATE POLICY "tenant_select_ledgers"
ON public.ledgers FOR SELECT
USING (
  distributor_id IN (
    SELECT id FROM distributor_profiles 
    WHERE user_id = public.get_user_tenant_id() OR user_id = auth.uid()
  )
);

-- Tenant INSERT (both admin and salesperson - for auto ledger creation)
CREATE POLICY "tenant_insert_ledgers"
ON public.ledgers FOR INSERT
WITH CHECK (
  distributor_id IN (
    SELECT id FROM distributor_profiles 
    WHERE user_id = public.get_user_tenant_id() OR user_id = auth.uid()
  )
);

-- Admin UPDATE/DELETE
CREATE POLICY "admin_manage_ledgers"
ON public.ledgers FOR ALL
USING (
  public.is_admin()
  AND distributor_id IN (
    SELECT id FROM distributor_profiles WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  public.is_admin()
  AND distributor_id IN (
    SELECT id FROM distributor_profiles WHERE user_id = auth.uid()
  )
);

-- ============================================================================
-- STEP 6: LEDGER_TRANSACTIONS - Salesperson can insert (for invoice postings)
-- ============================================================================

ALTER TABLE public.ledger_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ledger_transactions_select" ON public.ledger_transactions;
DROP POLICY IF EXISTS "ledger_transactions_all" ON public.ledger_transactions;
DROP POLICY IF EXISTS "superadmin_full_access_ledger_transactions" ON public.ledger_transactions;
DROP POLICY IF EXISTS "tenant_select_ledger_transactions" ON public.ledger_transactions;
DROP POLICY IF EXISTS "tenant_insert_ledger_transactions" ON public.ledger_transactions;
DROP POLICY IF EXISTS "tenant_manage_ledger_transactions" ON public.ledger_transactions;

-- Superadmin full access
CREATE POLICY "superadmin_full_ledger_transactions"
ON public.ledger_transactions FOR ALL
USING (public.is_superadmin())
WITH CHECK (public.is_superadmin());

-- Tenant SELECT
CREATE POLICY "tenant_select_ledger_transactions"
ON public.ledger_transactions FOR SELECT
USING (
  distributor_id IN (
    SELECT id FROM distributor_profiles 
    WHERE user_id = public.get_user_tenant_id() OR user_id = auth.uid()
  )
);

-- Tenant INSERT (for invoice creation)
CREATE POLICY "tenant_insert_ledger_transactions"
ON public.ledger_transactions FOR INSERT
WITH CHECK (
  distributor_id IN (
    SELECT id FROM distributor_profiles 
    WHERE user_id = public.get_user_tenant_id() OR user_id = auth.uid()
  )
);

-- Admin UPDATE/DELETE
CREATE POLICY "admin_manage_ledger_transactions"
ON public.ledger_transactions FOR ALL
USING (
  public.is_admin()
  AND distributor_id IN (
    SELECT id FROM distributor_profiles WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  public.is_admin()
);

-- ============================================================================
-- STEP 7: PARTIES - Salesperson can read & create parties
-- ============================================================================

ALTER TABLE public.parties ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "superadmin_full_access_parties" ON public.parties;
DROP POLICY IF EXISTS "tenant_select_parties" ON public.parties;
DROP POLICY IF EXISTS "tenant_insert_parties" ON public.parties;
DROP POLICY IF EXISTS "tenant_update_parties" ON public.parties;
DROP POLICY IF EXISTS "tenant_delete_parties" ON public.parties;

-- Superadmin full access
CREATE POLICY "superadmin_full_parties"
ON public.parties FOR ALL
USING (public.is_superadmin())
WITH CHECK (public.is_superadmin());

-- Tenant SELECT
CREATE POLICY "tenant_select_parties"
ON public.parties FOR SELECT
USING (
  tenant_id = public.get_user_tenant_id()
  OR distributor_id IN (
    SELECT id FROM distributor_profiles 
    WHERE user_id = public.get_user_tenant_id() OR user_id = auth.uid()
  )
);

-- Tenant INSERT
CREATE POLICY "tenant_insert_parties"
ON public.parties FOR INSERT
WITH CHECK (
  tenant_id IS NULL OR tenant_id = public.get_user_tenant_id()
);

-- Tenant UPDATE
CREATE POLICY "tenant_update_parties"
ON public.parties FOR UPDATE
USING (
  tenant_id = public.get_user_tenant_id()
  OR distributor_id IN (
    SELECT id FROM distributor_profiles 
    WHERE user_id = public.get_user_tenant_id() OR user_id = auth.uid()
  )
);

-- Admin DELETE
CREATE POLICY "admin_delete_parties"
ON public.parties FOR DELETE
USING (
  public.is_admin()
  AND (
    tenant_id = auth.uid()
    OR distributor_id IN (SELECT id FROM distributor_profiles WHERE user_id = auth.uid())
  )
);

-- ============================================================================
-- STEP 8: ITEMS - Salesperson can read items
-- ============================================================================

ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "superadmin_full_access_items" ON public.items;
DROP POLICY IF EXISTS "tenant_select_items" ON public.items;
DROP POLICY IF EXISTS "tenant_insert_items" ON public.items;
DROP POLICY IF EXISTS "tenant_update_items" ON public.items;
DROP POLICY IF EXISTS "tenant_delete_items" ON public.items;

-- Superadmin full access
CREATE POLICY "superadmin_full_items"
ON public.items FOR ALL
USING (public.is_superadmin())
WITH CHECK (public.is_superadmin());

-- Tenant SELECT
CREATE POLICY "tenant_select_items"
ON public.items FOR SELECT
USING (
  tenant_id = public.get_user_tenant_id()
  OR distributor_id IN (
    SELECT id FROM distributor_profiles 
    WHERE user_id = public.get_user_tenant_id() OR user_id = auth.uid()
  )
);

-- Admin INSERT/UPDATE/DELETE
CREATE POLICY "admin_manage_items"
ON public.items FOR ALL
USING (
  public.is_admin()
  AND (
    tenant_id = auth.uid()
    OR distributor_id IN (SELECT id FROM distributor_profiles WHERE user_id = auth.uid())
  )
)
WITH CHECK (
  public.is_admin()
);

-- ============================================================================
-- DONE - Salesperson should now be able to:
-- 1. Read their tenant's distributor_profile (for distributorId)
-- 2. Read voucher_prefixes (for invoice numbering)
-- 3. Read parties and items (for selection)
-- 4. Create vouchers (tax invoices)
-- 5. Create voucher_items
-- 6. Create ledger_transactions (for accounting postings)
-- 7. Create ledgers (for auto party-ledger creation)
-- ============================================================================
