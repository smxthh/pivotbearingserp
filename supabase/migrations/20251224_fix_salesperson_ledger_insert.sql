-- Quick fix: Allow salespersons to INSERT ledgers (for party auto-creation)
-- The party hook auto-creates a ledger when a party is created

BEGIN;

-- Drop the existing manage policy and recreate with separate INSERT policy
DROP POLICY IF EXISTS "tenant_manage_ledgers" ON public.ledgers;

-- Admin: Full CRUD on ledgers
CREATE POLICY "admin_manage_ledgers"
ON public.ledgers FOR ALL
USING (
  public.is_admin()
  AND (
    tenant_id = public.get_user_tenant_id()
    OR distributor_id IN (SELECT id FROM distributor_profiles WHERE user_id = public.get_user_tenant_id())
  )
)
WITH CHECK (
  public.is_admin()
  AND (
    tenant_id IS NULL OR tenant_id = public.get_user_tenant_id()
  )
);

-- Salesperson: Can INSERT ledgers (for party auto-creation)
CREATE POLICY "salesperson_insert_ledgers"
ON public.ledgers FOR INSERT
WITH CHECK (
  public.is_salesperson()
  AND (
    tenant_id IS NULL OR tenant_id = public.get_user_tenant_id()
  )
);

COMMIT;
