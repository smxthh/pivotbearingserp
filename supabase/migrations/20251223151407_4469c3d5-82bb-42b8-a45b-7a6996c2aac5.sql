-- =====================================================
-- PART 2: Update Business Table RLS for 3-Tier Visibility
-- Superadmin: ALL, Admin: distributor_id, Salesperson: created_by
-- =====================================================

-- Helper function to check RLS access with 3-tier model
CREATE OR REPLACE FUNCTION public.can_access_distributor_data(p_distributor_id uuid, p_created_by uuid DEFAULT NULL)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    -- Superadmin sees everything
    public.is_superadmin()
    OR
    -- Admin sees their own distributor's data
    (public.is_admin() AND p_distributor_id = public.get_user_distributor_id())
    OR
    -- Salesperson sees only records they created (if created_by provided)
    (public.is_salesperson() AND p_created_by IS NOT NULL AND p_created_by = auth.uid())
    OR
    -- Salesperson can view (not edit) their distributor's shared data (items, parties etc)
    (public.is_salesperson() AND p_created_by IS NULL AND p_distributor_id = public.get_user_distributor_id());
$$;

-- Drop old overlapping policies and create new unified ones for INVOICES
DROP POLICY IF EXISTS "Distributors can manage their invoices" ON public.invoices;
DROP POLICY IF EXISTS "Distributors manage own invoices" ON public.invoices;
DROP POLICY IF EXISTS "Distributors view own invoices" ON public.invoices;
DROP POLICY IF EXISTS "Salespersons can insert invoices" ON public.invoices;
DROP POLICY IF EXISTS "Salespersons can view and create invoices" ON public.invoices;
DROP POLICY IF EXISTS "Superadmin full access invoices" ON public.invoices;

CREATE POLICY "3tier_invoices_select"
ON public.invoices FOR SELECT
USING (
  public.is_superadmin()
  OR (public.is_admin() AND distributor_id = public.get_user_distributor_id())
  OR (public.is_salesperson() AND created_by = auth.uid())
);

CREATE POLICY "3tier_invoices_insert"
ON public.invoices FOR INSERT
WITH CHECK (
  public.is_superadmin()
  OR (public.is_admin() AND distributor_id = public.get_user_distributor_id())
  OR (public.is_salesperson() AND distributor_id = public.get_user_distributor_id())
);

CREATE POLICY "3tier_invoices_update"
ON public.invoices FOR UPDATE
USING (
  public.is_superadmin()
  OR (public.is_admin() AND distributor_id = public.get_user_distributor_id())
  OR (public.is_salesperson() AND created_by = auth.uid())
);

CREATE POLICY "3tier_invoices_delete"
ON public.invoices FOR DELETE
USING (
  public.is_superadmin()
  OR (public.is_admin() AND distributor_id = public.get_user_distributor_id())
);

-- VOUCHERS - same 3-tier model
DROP POLICY IF EXISTS "vouchers_all" ON public.vouchers;
DROP POLICY IF EXISTS "vouchers_select" ON public.vouchers;
DROP POLICY IF EXISTS "Distributors can manage vouchers" ON public.vouchers;

CREATE POLICY "3tier_vouchers_select"
ON public.vouchers FOR SELECT
USING (
  public.is_superadmin()
  OR (public.is_admin() AND distributor_id = public.get_user_distributor_id())
  OR (public.is_salesperson() AND created_by = auth.uid())
);

CREATE POLICY "3tier_vouchers_insert"
ON public.vouchers FOR INSERT
WITH CHECK (
  public.is_superadmin()
  OR (public.is_admin() AND distributor_id = public.get_user_distributor_id())
  OR (public.is_salesperson() AND distributor_id = public.get_user_distributor_id())
);

CREATE POLICY "3tier_vouchers_update"
ON public.vouchers FOR UPDATE
USING (
  public.is_superadmin()
  OR (public.is_admin() AND distributor_id = public.get_user_distributor_id())
  OR (public.is_salesperson() AND created_by = auth.uid())
);

CREATE POLICY "3tier_vouchers_delete"
ON public.vouchers FOR DELETE
USING (
  public.is_superadmin()
  OR (public.is_admin() AND distributor_id = public.get_user_distributor_id())
);

-- ITEMS - salesperson can view all items from their distributor (shared catalog)
DROP POLICY IF EXISTS "Distributors can manage their items" ON public.items;
DROP POLICY IF EXISTS "Distributors manage own items" ON public.items;
DROP POLICY IF EXISTS "Distributors view own items" ON public.items;
DROP POLICY IF EXISTS "Superadmin full access items" ON public.items;

CREATE POLICY "3tier_items_select"
ON public.items FOR SELECT
USING (
  public.is_superadmin()
  OR distributor_id = public.get_user_distributor_id()
);

CREATE POLICY "3tier_items_manage"
ON public.items FOR ALL
USING (
  public.is_superadmin()
  OR (public.is_admin() AND distributor_id = public.get_user_distributor_id())
);

-- PARTIES - salesperson can view all, but only manage their created ones
DROP POLICY IF EXISTS "Distributors can manage their parties" ON public.parties;
DROP POLICY IF EXISTS "parties_all" ON public.parties;
DROP POLICY IF EXISTS "parties_select" ON public.parties;

CREATE POLICY "3tier_parties_select"
ON public.parties FOR SELECT
USING (
  public.is_superadmin()
  OR distributor_id = public.get_user_distributor_id()
);

CREATE POLICY "3tier_parties_insert"
ON public.parties FOR INSERT
WITH CHECK (
  public.is_superadmin()
  OR (public.is_admin() AND distributor_id = public.get_user_distributor_id())
  OR (public.is_salesperson() AND distributor_id = public.get_user_distributor_id())
);

CREATE POLICY "3tier_parties_update"
ON public.parties FOR UPDATE
USING (
  public.is_superadmin()
  OR (public.is_admin() AND distributor_id = public.get_user_distributor_id())
  OR (public.is_salesperson() AND created_by = auth.uid())
);

CREATE POLICY "3tier_parties_delete"
ON public.parties FOR DELETE
USING (
  public.is_superadmin()
  OR (public.is_admin() AND distributor_id = public.get_user_distributor_id())
);

-- BRANDS - shared catalog, salesperson can view
DROP POLICY IF EXISTS "Distributors can delete their brands" ON public.brands;
DROP POLICY IF EXISTS "Distributors can insert their brands" ON public.brands;
DROP POLICY IF EXISTS "Distributors can update their brands" ON public.brands;
DROP POLICY IF EXISTS "Distributors can view their brands" ON public.brands;
DROP POLICY IF EXISTS "Distributors manage own brands" ON public.brands;
DROP POLICY IF EXISTS "Distributors view own brands" ON public.brands;
DROP POLICY IF EXISTS "Admins can delete all brands" ON public.brands;
DROP POLICY IF EXISTS "Admins can insert brands" ON public.brands;
DROP POLICY IF EXISTS "Admins can update all brands" ON public.brands;
DROP POLICY IF EXISTS "Admins can view all brands" ON public.brands;
DROP POLICY IF EXISTS "Salespersons can view their distributor brands" ON public.brands;
DROP POLICY IF EXISTS "Superadmin full access brands" ON public.brands;

CREATE POLICY "3tier_brands_select"
ON public.brands FOR SELECT
USING (
  public.is_superadmin()
  OR distributor_id = public.get_user_distributor_id()
);

CREATE POLICY "3tier_brands_manage"
ON public.brands FOR ALL
USING (
  public.is_superadmin()
  OR (public.is_admin() AND distributor_id = public.get_user_distributor_id())
);

-- CATEGORIES - shared catalog
DROP POLICY IF EXISTS "Distributors can manage categories" ON public.categories;
DROP POLICY IF EXISTS "Distributors manage own categories" ON public.categories;
DROP POLICY IF EXISTS "Distributors view own categories" ON public.categories;
DROP POLICY IF EXISTS "Superadmin full access categories" ON public.categories;

CREATE POLICY "3tier_categories_select"
ON public.categories FOR SELECT
USING (
  public.is_superadmin()
  OR distributor_id = public.get_user_distributor_id()
);

CREATE POLICY "3tier_categories_manage"
ON public.categories FOR ALL
USING (
  public.is_superadmin()
  OR (public.is_admin() AND distributor_id = public.get_user_distributor_id())
);

-- LEDGERS - admin only (no salesperson access)
DROP POLICY IF EXISTS "ledgers_all" ON public.ledgers;
DROP POLICY IF EXISTS "ledgers_select" ON public.ledgers;

CREATE POLICY "3tier_ledgers_all"
ON public.ledgers FOR ALL
USING (
  public.is_superadmin()
  OR (public.is_admin() AND distributor_id = public.get_user_distributor_id())
);

-- LEDGER_TRANSACTIONS - admin only
DROP POLICY IF EXISTS "ledger_transactions_all" ON public.ledger_transactions;
DROP POLICY IF EXISTS "ledger_transactions_select" ON public.ledger_transactions;

CREATE POLICY "3tier_ledger_transactions_all"
ON public.ledger_transactions FOR ALL
USING (
  public.is_superadmin()
  OR (public.is_admin() AND distributor_id = public.get_user_distributor_id())
);

-- LEDGER_ENTRIES - admin only
DROP POLICY IF EXISTS "Distributors can view ledger entries" ON public.ledger_entries;

CREATE POLICY "3tier_ledger_entries_all"
ON public.ledger_entries FOR ALL
USING (
  public.is_superadmin()
  OR (public.is_admin() AND distributor_id = public.get_user_distributor_id())
);

-- DISTRIBUTOR_PROFILES - critical: each admin only sees their own
DROP POLICY IF EXISTS "Admin/User view own profile" ON public.distributor_profiles;
DROP POLICY IF EXISTS "Admins can update all distributor profiles" ON public.distributor_profiles;
DROP POLICY IF EXISTS "Superadmin manage all profiles" ON public.distributor_profiles;
DROP POLICY IF EXISTS "Superadmin view all profiles" ON public.distributor_profiles;
DROP POLICY IF EXISTS "Users can insert own distributor profile" ON public.distributor_profiles;
DROP POLICY IF EXISTS "Users can update own distributor profile" ON public.distributor_profiles;
DROP POLICY IF EXISTS "Users can update their own distributor profile" ON public.distributor_profiles;
DROP POLICY IF EXISTS "Users can view own distributor profile" ON public.distributor_profiles;
DROP POLICY IF EXISTS "Users insert own profile" ON public.distributor_profiles;
DROP POLICY IF EXISTS "Users update own profile" ON public.distributor_profiles;

CREATE POLICY "3tier_distributor_profiles_select"
ON public.distributor_profiles FOR SELECT
USING (
  public.is_superadmin()
  OR user_id = public.get_user_tenant_id()
);

CREATE POLICY "3tier_distributor_profiles_insert"
ON public.distributor_profiles FOR INSERT
WITH CHECK (
  user_id = auth.uid()
);

CREATE POLICY "3tier_distributor_profiles_update"
ON public.distributor_profiles FOR UPDATE
USING (
  public.is_superadmin()
  OR user_id = auth.uid()
);

CREATE POLICY "3tier_distributor_profiles_delete"
ON public.distributor_profiles FOR DELETE
USING (
  public.is_superadmin()
);