-- =====================================================
-- FIX ACCOUNTING MODULE RLS FOR SALESPERSON ACCESS
-- Allows salespersons to create tax invoices
-- =====================================================

BEGIN;

-- ============================================================================
-- PART 1: VOUCHERS - Allow salesperson INSERT
-- ============================================================================

ALTER TABLE public.vouchers ENABLE ROW LEVEL SECURITY;

-- Drop old policies
DROP POLICY IF EXISTS "vouchers_select" ON public.vouchers;
DROP POLICY IF EXISTS "vouchers_all" ON public.vouchers;
DROP POLICY IF EXISTS "superadmin_full_access_vouchers" ON public.vouchers;
DROP POLICY IF EXISTS "tenant_select_vouchers" ON public.vouchers;
DROP POLICY IF EXISTS "tenant_insert_vouchers" ON public.vouchers;
DROP POLICY IF EXISTS "tenant_update_vouchers" ON public.vouchers;
DROP POLICY IF EXISTS "tenant_delete_vouchers" ON public.vouchers;

-- Superadmin: Full access
CREATE POLICY "superadmin_full_access_vouchers"
ON public.vouchers FOR ALL
USING (public.is_superadmin())
WITH CHECK (public.is_superadmin());

-- Admin & Salesperson: SELECT their tenant's vouchers
CREATE POLICY "tenant_select_vouchers"
ON public.vouchers FOR SELECT
USING (
  NOT public.is_superadmin()
  AND (
    tenant_id = public.get_user_tenant_id()
    OR distributor_id IN (SELECT id FROM distributor_profiles WHERE user_id = public.get_user_tenant_id())
  )
);

-- Admin & Salesperson: INSERT vouchers (salesperson can create invoices)
CREATE POLICY "tenant_insert_vouchers"
ON public.vouchers FOR INSERT
WITH CHECK (
  NOT public.is_superadmin()
  AND (
    tenant_id IS NULL OR tenant_id = public.get_user_tenant_id()
  )
);

-- Admin & Salesperson: UPDATE their own vouchers
CREATE POLICY "tenant_update_vouchers"
ON public.vouchers FOR UPDATE
USING (
  NOT public.is_superadmin()
  AND (
    tenant_id = public.get_user_tenant_id()
    OR distributor_id IN (SELECT id FROM distributor_profiles WHERE user_id = public.get_user_tenant_id())
  )
)
WITH CHECK (
  NOT public.is_superadmin()
  AND (
    tenant_id IS NULL OR tenant_id = public.get_user_tenant_id()
  )
);

-- Admin only: DELETE vouchers
CREATE POLICY "tenant_delete_vouchers"
ON public.vouchers FOR DELETE
USING (
  public.is_admin()
  AND (
    tenant_id = public.get_user_tenant_id()
    OR distributor_id IN (SELECT id FROM distributor_profiles WHERE user_id = public.get_user_tenant_id())
  )
);

-- ============================================================================
-- PART 2: VOUCHER_ITEMS - Allow salesperson INSERT
-- ============================================================================

ALTER TABLE public.voucher_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "voucher_items_select" ON public.voucher_items;
DROP POLICY IF EXISTS "voucher_items_all" ON public.voucher_items;
DROP POLICY IF EXISTS "superadmin_full_access_voucher_items" ON public.voucher_items;
DROP POLICY IF EXISTS "tenant_access_voucher_items" ON public.voucher_items;

-- Superadmin: Full access
CREATE POLICY "superadmin_full_access_voucher_items"
ON public.voucher_items FOR ALL
USING (public.is_superadmin())
WITH CHECK (public.is_superadmin());

-- Admin & Salesperson: Access voucher_items via voucher relationship
CREATE POLICY "tenant_access_voucher_items"
ON public.voucher_items FOR ALL
USING (
  NOT public.is_superadmin()
  AND EXISTS (
    SELECT 1 FROM vouchers v 
    WHERE v.id = voucher_items.voucher_id 
    AND (
      v.tenant_id = public.get_user_tenant_id()
      OR v.distributor_id IN (SELECT id FROM distributor_profiles WHERE user_id = public.get_user_tenant_id())
    )
  )
)
WITH CHECK (
  NOT public.is_superadmin()
  AND EXISTS (
    SELECT 1 FROM vouchers v 
    WHERE v.id = voucher_items.voucher_id 
    AND (
      v.tenant_id = public.get_user_tenant_id()
      OR v.distributor_id IN (SELECT id FROM distributor_profiles WHERE user_id = public.get_user_tenant_id())
    )
  )
);

-- ============================================================================
-- PART 3: LEDGER_TRANSACTIONS - Allow salesperson INSERT (for invoice postings)
-- ============================================================================

ALTER TABLE public.ledger_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ledger_transactions_select" ON public.ledger_transactions;
DROP POLICY IF EXISTS "ledger_transactions_all" ON public.ledger_transactions;
DROP POLICY IF EXISTS "superadmin_full_access_ledger_transactions" ON public.ledger_transactions;
DROP POLICY IF EXISTS "tenant_select_ledger_transactions" ON public.ledger_transactions;
DROP POLICY IF EXISTS "tenant_insert_ledger_transactions" ON public.ledger_transactions;
DROP POLICY IF EXISTS "tenant_manage_ledger_transactions" ON public.ledger_transactions;

-- Superadmin: Full access
CREATE POLICY "superadmin_full_access_ledger_transactions"
ON public.ledger_transactions FOR ALL
USING (public.is_superadmin())
WITH CHECK (public.is_superadmin());

-- Admin & Salesperson: SELECT their tenant's ledger transactions
CREATE POLICY "tenant_select_ledger_transactions"
ON public.ledger_transactions FOR SELECT
USING (
  NOT public.is_superadmin()
  AND distributor_id IN (SELECT id FROM distributor_profiles WHERE user_id = public.get_user_tenant_id())
);

-- Admin & Salesperson: INSERT ledger transactions (for invoice creation)
CREATE POLICY "tenant_insert_ledger_transactions"
ON public.ledger_transactions FOR INSERT
WITH CHECK (
  NOT public.is_superadmin()
  AND distributor_id IN (SELECT id FROM distributor_profiles WHERE user_id = public.get_user_tenant_id())
);

-- Admin only: UPDATE/DELETE ledger transactions
CREATE POLICY "tenant_manage_ledger_transactions"
ON public.ledger_transactions FOR ALL
USING (
  public.is_admin()
  AND distributor_id IN (SELECT id FROM distributor_profiles WHERE user_id = public.get_user_tenant_id())
)
WITH CHECK (
  public.is_admin()
  AND distributor_id IN (SELECT id FROM distributor_profiles WHERE user_id = public.get_user_tenant_id())
);

-- ============================================================================
-- PART 4: LEDGER_GROUPS - Allow salesperson SELECT
-- ============================================================================

ALTER TABLE public.ledger_groups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ledger_groups_select" ON public.ledger_groups;
DROP POLICY IF EXISTS "ledger_groups_all" ON public.ledger_groups;
DROP POLICY IF EXISTS "superadmin_full_access_ledger_groups" ON public.ledger_groups;
DROP POLICY IF EXISTS "tenant_select_ledger_groups" ON public.ledger_groups;
DROP POLICY IF EXISTS "tenant_manage_ledger_groups" ON public.ledger_groups;

-- Superadmin: Full access
CREATE POLICY "superadmin_full_access_ledger_groups"
ON public.ledger_groups FOR ALL
USING (public.is_superadmin())
WITH CHECK (public.is_superadmin());

-- Admin & Salesperson: SELECT ledger groups (includes system groups with NULL distributor_id)
CREATE POLICY "tenant_select_ledger_groups"
ON public.ledger_groups FOR SELECT
USING (
  NOT public.is_superadmin()
  AND (
    distributor_id IS NULL -- System groups
    OR distributor_id IN (SELECT id FROM distributor_profiles WHERE user_id = public.get_user_tenant_id())
  )
);

-- Admin only: Manage ledger groups
CREATE POLICY "tenant_manage_ledger_groups"
ON public.ledger_groups FOR ALL
USING (
  public.is_admin()
  AND (
    distributor_id IS NULL
    OR distributor_id IN (SELECT id FROM distributor_profiles WHERE user_id = public.get_user_tenant_id())
  )
)
WITH CHECK (
  public.is_admin()
);

-- ============================================================================
-- PART 5: GST_SUMMARY - Allow salesperson SELECT
-- ============================================================================

ALTER TABLE public.gst_summary ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "gst_summary_select" ON public.gst_summary;
DROP POLICY IF EXISTS "gst_summary_all" ON public.gst_summary;
DROP POLICY IF EXISTS "superadmin_full_access_gst_summary" ON public.gst_summary;
DROP POLICY IF EXISTS "tenant_select_gst_summary" ON public.gst_summary;
DROP POLICY IF EXISTS "tenant_manage_gst_summary" ON public.gst_summary;

-- Superadmin: Full access
CREATE POLICY "superadmin_full_access_gst_summary"
ON public.gst_summary FOR ALL
USING (public.is_superadmin())
WITH CHECK (public.is_superadmin());

-- Admin & Salesperson: SELECT
CREATE POLICY "tenant_select_gst_summary"
ON public.gst_summary FOR SELECT
USING (
  NOT public.is_superadmin()
  AND distributor_id IN (SELECT id FROM distributor_profiles WHERE user_id = public.get_user_tenant_id())
);

-- Admin only: Manage
CREATE POLICY "tenant_manage_gst_summary"
ON public.gst_summary FOR ALL
USING (
  public.is_admin()
  AND distributor_id IN (SELECT id FROM distributor_profiles WHERE user_id = public.get_user_tenant_id())
)
WITH CHECK (
  public.is_admin()
  AND distributor_id IN (SELECT id FROM distributor_profiles WHERE user_id = public.get_user_tenant_id())
);

COMMIT;
