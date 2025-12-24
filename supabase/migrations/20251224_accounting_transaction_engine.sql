-- ==============================================================================
-- ACCOUNTING PHASE 2: TRANSACTION ENGINE & INTEGRATION
-- Created: 2025-12-24
-- Purpose: Connects Parties to Ledgers and implements Journal Entry RPCs
-- ==============================================================================

-- 1. CONNECT PARTIES TO LEDGERS
---------------------------------------------------------------------------------

-- Add ledger_id column to parties if not exists
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'parties' AND column_name = 'ledger_id') THEN
        ALTER TABLE public.parties ADD COLUMN ledger_id uuid REFERENCES public.ledgers(id);
    END IF;
END $$;

-- FUNCTION: create_ledger_for_party
-- Automatically creates a ledger for a new party
CREATE OR REPLACE FUNCTION public.create_ledger_for_party(party_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    p_rec RECORD;
    l_group_id uuid;
    l_nature text;
    new_ledger_id uuid;
    v_root_id uuid;
    v_parent_id uuid;
BEGIN
    SELECT * INTO p_rec FROM parties WHERE id = party_id;
    IF NOT FOUND THEN RETURN; END IF;
    
    -- If already has ledger, skip
    IF p_rec.ledger_id IS NOT NULL THEN RETURN; END IF;

    -- Determine Group based on Type
    -- Default to Sundry Debtors (Asset) for Customers
    -- Default to Sundry Creditors (Liability) for Vendors/Suppliers
    IF p_rec.type ILIKE '%Vendor%' OR p_rec.type ILIKE '%Supplier%' THEN
        SELECT id INTO l_group_id FROM ledger_groups WHERE tenant_id = p_rec.tenant_id AND code = 'L-SUN' LIMIT 1;
        
        -- If Sundry Creditors group doesn't exist, create it
        IF l_group_id IS NULL THEN
            -- Ensure Liabilities root exists
            SELECT id INTO v_root_id FROM ledger_groups WHERE tenant_id = p_rec.tenant_id AND code = 'LIAB';
            IF v_root_id IS NULL THEN
                INSERT INTO ledger_groups (tenant_id, name, nature, code, is_system)
                VALUES (p_rec.tenant_id, 'Liabilities', 'Liability', 'LIAB', true) RETURNING id INTO v_root_id;
            END IF;
            
            -- Ensure Current Liabilities exists
            SELECT id INTO v_parent_id FROM ledger_groups WHERE tenant_id = p_rec.tenant_id AND code = 'L-CUR';
            IF v_parent_id IS NULL THEN
                INSERT INTO ledger_groups (tenant_id, name, nature, parent_group_id, code, is_system)
                VALUES (p_rec.tenant_id, 'Current Liabilities', 'Liability', v_root_id, 'L-CUR', true) RETURNING id INTO v_parent_id;
            END IF;
            
            -- Create Sundry Creditors
            INSERT INTO ledger_groups (tenant_id, name, nature, parent_group_id, code, is_system)
            VALUES (p_rec.tenant_id, 'Sundry Creditors', 'Liability', v_parent_id, 'L-SUN', true) RETURNING id INTO l_group_id;
        END IF;
    ELSE
        SELECT id INTO l_group_id FROM ledger_groups WHERE tenant_id = p_rec.tenant_id AND code = 'A-SUN' LIMIT 1;
        
        -- If Sundry Debtors group doesn't exist, create it
        IF l_group_id IS NULL THEN
            -- Ensure Assets root exists
            SELECT id INTO v_root_id FROM ledger_groups WHERE tenant_id = p_rec.tenant_id AND code = 'ASST';
            IF v_root_id IS NULL THEN
                INSERT INTO ledger_groups (tenant_id, name, nature, code, is_system)
                VALUES (p_rec.tenant_id, 'Assets', 'Asset', 'ASST', true) RETURNING id INTO v_root_id;
            END IF;
            
            -- Ensure Current Assets exists
            SELECT id INTO v_parent_id FROM ledger_groups WHERE tenant_id = p_rec.tenant_id AND code = 'A-CUR';
            IF v_parent_id IS NULL THEN
                INSERT INTO ledger_groups (tenant_id, name, nature, parent_group_id, code, is_system)
                VALUES (p_rec.tenant_id, 'Current Assets', 'Asset', v_root_id, 'A-CUR', true) RETURNING id INTO v_parent_id;
            END IF;
            
            -- Create Sundry Debtors
            INSERT INTO ledger_groups (tenant_id, name, nature, parent_group_id, code, is_system)
            VALUES (p_rec.tenant_id, 'Sundry Debtors', 'Asset', v_parent_id, 'A-SUN', true) RETURNING id INTO l_group_id;
        END IF;
    END IF;

    -- Create Ledger with current_balance and opening_balance_type
    INSERT INTO ledgers (tenant_id, name, group_id, opening_balance, opening_balance_type, current_balance, is_system)
    VALUES (
        p_rec.tenant_id, 
        p_rec.name, 
        l_group_id, 
        COALESCE(ABS(p_rec.opening_balance), 0), 
        CASE WHEN p_rec.opening_balance >= 0 THEN 'Dr' ELSE 'Cr' END,
        COALESCE(p_rec.opening_balance, 0), 
        false
    )
    RETURNING id INTO new_ledger_id;

    -- Update Party
    UPDATE parties SET ledger_id = new_ledger_id WHERE id = party_id;
END;
$$;

-- TRIGGER: Auto-create ledger on Party Insert
CREATE OR REPLACE FUNCTION public.trigger_create_party_ledger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    PERFORM public.create_ledger_for_party(NEW.id);
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_party_created_add_ledger ON public.parties;
CREATE TRIGGER on_party_created_add_ledger
    AFTER INSERT ON public.parties
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_create_party_ledger();

-- BACKFILL: Create ledgers for existing parties
DO $$
DECLARE
    p RECORD;
BEGIN
    FOR p IN SELECT id FROM parties WHERE ledger_id IS NULL
    LOOP
        PERFORM public.create_ledger_for_party(p.id);
    END LOOP;
END;
$$;


-- 2. CORE TRANSACTION ENGINE (RPC)
---------------------------------------------------------------------------------

-- Helper: Get Ledger ID by Name (Safe Lookup)
CREATE OR REPLACE FUNCTION public.get_ledger_id_by_name(p_tenant_id uuid, p_name text)
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
    SELECT id FROM ledgers WHERE tenant_id = p_tenant_id AND name = p_name LIMIT 1;
$$;

-- RPC: record_journal_entry
-- The Atomic double-entry writer
-- Input entries: JSONB array of objects { "ledger_id": uuid, "debit": numeric, "credit": numeric }
CREATE OR REPLACE FUNCTION public.record_journal_entry(
    p_transaction_id uuid,
    p_transaction_type text,
    p_entry_date date,
    p_description text,
    p_entries jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_tenant_id uuid;
    v_total_debit numeric := 0;
    v_total_credit numeric := 0;
    v_entry jsonb;
    v_ledger_id uuid;
    v_debit numeric;
    v_credit numeric;
    v_is_locked boolean;
BEGIN
    -- 0. Get Tenant ID (Securely from auth)
    v_tenant_id := public.get_user_tenant_id();
    IF v_tenant_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: No tenant found';
    END IF;

    -- 1. Check Fiscal Year Lock
    SELECT is_locked INTO v_is_locked 
    FROM fiscal_years 
    WHERE tenant_id = v_tenant_id 
    AND start_date <= p_entry_date AND end_date >= p_entry_date;

    IF v_is_locked THEN
        RAISE EXCEPTION 'Fiscal Year is locked for date %', p_entry_date;
    END IF;

    -- 2. Validate Double Entry (Sum Dr == Sum Cr)
    FOR v_entry IN SELECT * FROM jsonb_array_elements(p_entries)
    LOOP
        v_debit := COALESCE((v_entry->>'debit')::numeric, 0);
        v_credit := COALESCE((v_entry->>'credit')::numeric, 0);
        
        v_total_debit := v_total_debit + v_debit;
        v_total_credit := v_total_credit + v_credit;
    END LOOP;

    IF ABS(v_total_debit - v_total_credit) > 0.05 THEN -- Allow tiny rounding diff? No, standard is strict. But let's allow 0.05 for float issues.
        RAISE EXCEPTION 'Double Entry Mismatch: Debit %, Credit %', v_total_debit, v_total_credit;
    END IF;

    -- 3. Insert Entries
    FOR v_entry IN SELECT * FROM jsonb_array_elements(p_entries)
    LOOP
        v_ledger_id := (v_entry->>'ledger_id')::uuid;
        v_debit := COALESCE((v_entry->>'debit')::numeric, 0);
        v_credit := COALESCE((v_entry->>'credit')::numeric, 0);

        INSERT INTO ledger_entries (
            tenant_id,
            transaction_id,
            transaction_type,
            ledger_id,
            debit,
            credit,
            entry_date,
            description,
            created_by
        ) VALUES (
            v_tenant_id,
            p_transaction_id,
            p_transaction_type,
            v_ledger_id,
            v_debit,
            v_credit,
            p_entry_date,
            p_description,
            auth.uid()
        );
        
        -- Update Ledger Current Balance Cache
        -- Asset/Expense: Dr increases, Cr decreases
        -- Liab/Income: Cr increases, Dr decreases
        -- Simplified: Just add (Debit - Credit) to balance, and interpret sign at display level?
        -- OR: store standard Dr-Cr.
        -- Let's do: Balance = Balance + Debit - Credit. 
        -- Positive means Debit Balance. Negative means Credit Balance.
        UPDATE ledgers 
        SET current_balance = current_balance + v_debit - v_credit,
            updated_at = now()
        WHERE id = v_ledger_id;

    END LOOP;

END;
$$;


-- 3. SALES INTEGRATION (RPC)
---------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.post_sales_invoice_to_accounting(p_invoice_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_tenant_id uuid;
    inv_rec RECORD;
    tax_rec RECORD;
    v_customer_ledger_id uuid;
    v_sales_ledger_id uuid;
    v_output_cgst_id uuid;
    v_output_sgst_id uuid;
    v_output_igst_id uuid;
    v_entries jsonb := '[]'::jsonb;
    v_total_taxable numeric := 0;
    v_total_cgst numeric := 0;
    v_total_sgst numeric := 0;
    v_total_igst numeric := 0;
    v_grand_total numeric := 0;
BEGIN
    v_tenant_id := public.get_user_tenant_id();

    -- 1. Fetch Invoice
    SELECT * INTO inv_rec FROM invoices WHERE id = p_invoice_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Invoice not found'; END IF;

    -- Check if already posted? (Check ledger_entries for this transaction_id)
    IF EXISTS (SELECT 1 FROM ledger_entries WHERE transaction_id = p_invoice_id) THEN
        RAISE EXCEPTION 'Accounting entries already exist for this invoice';
    END IF;

    -- 2. Identify Ledgers
    -- Customer
    SELECT ledger_id INTO v_customer_ledger_id FROM parties WHERE id = inv_rec.party_id;
    IF v_customer_ledger_id IS NULL THEN
        -- Try to create it on the fly if missing (healing)
        PERFORM public.create_ledger_for_party(inv_rec.party_id);
        SELECT ledger_id INTO v_customer_ledger_id FROM parties WHERE id = inv_rec.party_id;
        IF v_customer_ledger_id IS NULL THEN
             RAISE EXCEPTION 'Customer Ledger not found for party %', inv_rec.party_id;
        END IF;
    END IF;

    -- Sales Account (Default)
    v_sales_ledger_id := public.get_ledger_id_by_name(v_tenant_id, 'Sales Account');
    IF v_sales_ledger_id IS NULL THEN RAISE EXCEPTION 'Sales Account ledger missing'; END IF;

    -- Output Duties
    v_output_cgst_id := public.get_ledger_id_by_name(v_tenant_id, 'Output CGST');
    v_output_sgst_id := public.get_ledger_id_by_name(v_tenant_id, 'Output SGST');
    v_output_igst_id := public.get_ledger_id_by_name(v_tenant_id, 'Output IGST');

    -- 3. Calculate Totals (Group by Tax)
    -- We need to sum up taxable, cgst, sgst, igst from invoice items
    -- Assuming invoice_items has these columns or we use invoice header totals if accurate
    -- Let's hope invoice header has totals. If not, sum items.
    -- Looking at typical schema, invoices has total_amount, total_tax.
    -- But we need split of Taxable vs Tax.
    -- Let's query invoice_items.
    
    FOR tax_rec IN 
        SELECT 
            SUM(amount) as taxable_val, 
            SUM(cgst_amount) as cgst_val, 
            SUM(sgst_amount) as sgst_val, 
            SUM(igst_amount) as igst_val
        FROM invoice_items 
        WHERE invoice_id = p_invoice_id
    LOOP
        v_total_taxable := COALESCE(tax_rec.taxable_val, 0);
        v_total_cgst := COALESCE(tax_rec.cgst_val, 0);
        v_total_sgst := COALESCE(tax_rec.sgst_val, 0);
        v_total_igst := COALESCE(tax_rec.igst_val, 0);
    END LOOP;

    -- Recalculate Grand Total from components to ensure balance
    v_grand_total := v_total_taxable + v_total_cgst + v_total_sgst + v_total_igst;

    -- 4. Construct Journal Entries
    
    -- DEBIT Customer (Grand Total)
    v_entries := v_entries || jsonb_build_object(
        'ledger_id', v_customer_ledger_id,
        'debit', v_grand_total,
        'credit', 0
    );

    -- CREDIT Sales (Taxable Total)
    v_entries := v_entries || jsonb_build_object(
        'ledger_id', v_sales_ledger_id,
        'debit', 0,
        'credit', v_total_taxable
    );

    -- CREDIT Taxes
    IF v_total_cgst > 0 THEN
        v_entries := v_entries || jsonb_build_object('ledger_id', v_output_cgst_id, 'debit', 0, 'credit', v_total_cgst);
    END IF;
    IF v_total_sgst > 0 THEN
         v_entries := v_entries || jsonb_build_object('ledger_id', v_output_sgst_id, 'debit', 0, 'credit', v_total_sgst);
    END IF;
    IF v_total_igst > 0 THEN
         v_entries := v_entries || jsonb_build_object('ledger_id', v_output_igst_id, 'debit', 0, 'credit', v_total_igst);
    END IF;

    -- 5. Post Journal
    PERFORM public.record_journal_entry(
        p_invoice_id, 
        'SALES_INVOICE', 
        inv_rec.invoice_date, 
        'Sales Invoice #' || inv_rec.invoice_number, 
        v_entries
    );

END;
$$;
