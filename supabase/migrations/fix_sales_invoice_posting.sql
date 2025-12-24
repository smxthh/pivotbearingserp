-- ============================================================================
-- FIX: SALES INVOICE AUTO-POSTING FUNCTION
-- Updated to match actual invoice_items schema
-- ============================================================================

CREATE OR REPLACE FUNCTION public.post_sales_invoice_to_accounting(p_invoice_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_tenant_id uuid;
    inv_rec RECORD;
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
    
    -- For group creation
    v_group_id uuid;
    v_root_id uuid;
    v_parent_id uuid;
BEGIN
    v_tenant_id := public.get_user_tenant_id();

    -- 1. Fetch Invoice
    SELECT * INTO inv_rec FROM invoices WHERE id = p_invoice_id;
    IF NOT FOUND THEN 
        RAISE EXCEPTION 'Invoice not found: %', p_invoice_id;
    END IF;

    -- Check if already posted
    IF EXISTS (SELECT 1 FROM ledger_entries WHERE transaction_id = p_invoice_id) THEN
        RETURN; -- Already posted, exit silently
    END IF;

    -- 2. Get or Create Customer Ledger
    SELECT ledger_id INTO v_customer_ledger_id FROM parties WHERE id = inv_rec.party_id;
    IF v_customer_ledger_id IS NULL THEN
        PERFORM public.create_ledger_for_party(inv_rec.party_id);
        SELECT ledger_id INTO v_customer_ledger_id FROM parties WHERE id = inv_rec.party_id;
    END IF;
    
    IF v_customer_ledger_id IS NULL THEN 
        RAISE EXCEPTION 'Could not find or create ledger for customer';
    END IF;

    -- 3. Get or Create Sales Account Ledger
    v_sales_ledger_id := public.get_ledger_id_by_name(v_tenant_id, 'Sales Account');
    IF v_sales_ledger_id IS NULL THEN
        -- Auto-create Sales Account
        SELECT id INTO v_group_id FROM ledger_groups WHERE tenant_id = v_tenant_id AND name = 'Sales Account';
        IF v_group_id IS NULL THEN
            SELECT id INTO v_root_id FROM ledger_groups WHERE tenant_id = v_tenant_id AND name = 'Income';
            IF v_root_id IS NULL THEN
                INSERT INTO ledger_groups (tenant_id, name, nature, code, is_system)
                VALUES (v_tenant_id, 'Income', 'Income', 'INC', true) RETURNING id INTO v_root_id;
            END IF;
            INSERT INTO ledger_groups (tenant_id, name, nature, parent_group_id, code, is_system)
            VALUES (v_tenant_id, 'Sales Account', 'Income', v_root_id, 'I-SAL', true) RETURNING id INTO v_group_id;
        END IF;
        INSERT INTO ledgers (tenant_id, name, group_id, opening_balance, opening_balance_type, current_balance, closing_balance, is_system)
        VALUES (v_tenant_id, 'Sales Account', v_group_id, 0, 'Cr', 0, 0, true) RETURNING id INTO v_sales_ledger_id;
    END IF;

    -- 4. Get or Create Output GST Ledgers
    v_output_cgst_id := public.get_ledger_id_by_name(v_tenant_id, 'Output CGST');
    v_output_sgst_id := public.get_ledger_id_by_name(v_tenant_id, 'Output SGST');
    v_output_igst_id := public.get_ledger_id_by_name(v_tenant_id, 'Output IGST');
    
    -- Auto-create if missing
    IF v_output_cgst_id IS NULL OR v_output_sgst_id IS NULL OR v_output_igst_id IS NULL THEN
        SELECT id INTO v_group_id FROM ledger_groups WHERE tenant_id = v_tenant_id AND name = 'Duties & Taxes';
        IF v_group_id IS NULL THEN
            SELECT id INTO v_root_id FROM ledger_groups WHERE tenant_id = v_tenant_id AND name = 'Liabilities';
            IF v_root_id IS NULL THEN
                INSERT INTO ledger_groups (tenant_id, name, nature, code, is_system)
                VALUES (v_tenant_id, 'Liabilities', 'Liability', 'LIAB', true) RETURNING id INTO v_root_id;
            END IF;
            SELECT id INTO v_parent_id FROM ledger_groups WHERE tenant_id = v_tenant_id AND name = 'Current Liabilities';
            IF v_parent_id IS NULL THEN
                INSERT INTO ledger_groups (tenant_id, name, nature, parent_group_id, code, is_system)
                VALUES (v_tenant_id, 'Current Liabilities', 'Liability', v_root_id, 'L-CUR', true) RETURNING id INTO v_parent_id;
            END IF;
            INSERT INTO ledger_groups (tenant_id, name, nature, parent_group_id, code, is_system)
            VALUES (v_tenant_id, 'Duties & Taxes', 'Liability', v_parent_id, 'L-DUT', true) RETURNING id INTO v_group_id;
        END IF;
        
        IF v_output_cgst_id IS NULL THEN
            INSERT INTO ledgers (tenant_id, name, group_id, opening_balance, opening_balance_type, current_balance, closing_balance, is_system)
            VALUES (v_tenant_id, 'Output CGST', v_group_id, 0, 'Cr', 0, 0, true) RETURNING id INTO v_output_cgst_id;
        END IF;
        IF v_output_sgst_id IS NULL THEN
            INSERT INTO ledgers (tenant_id, name, group_id, opening_balance, opening_balance_type, current_balance, closing_balance, is_system)
            VALUES (v_tenant_id, 'Output SGST', v_group_id, 0, 'Cr', 0, 0, true) RETURNING id INTO v_output_sgst_id;
        END IF;
        IF v_output_igst_id IS NULL THEN
            INSERT INTO ledgers (tenant_id, name, group_id, opening_balance, opening_balance_type, current_balance, closing_balance, is_system)
            VALUES (v_tenant_id, 'Output IGST', v_group_id, 0, 'Cr', 0, 0, true) RETURNING id INTO v_output_igst_id;
        END IF;
    END IF;

    -- 5. Calculate Totals from invoice_items
    -- Try different column names that might exist
    SELECT 
        COALESCE(SUM(COALESCE(taxable_amount, amount, 0)), 0),
        COALESCE(SUM(COALESCE(cgst_amount, 0)), 0),
        COALESCE(SUM(COALESCE(sgst_amount, 0)), 0),
        COALESCE(SUM(COALESCE(igst_amount, 0)), 0)
    INTO v_total_taxable, v_total_cgst, v_total_sgst, v_total_igst
    FROM invoice_items 
    WHERE invoice_id = p_invoice_id;

    v_grand_total := v_total_taxable + v_total_cgst + v_total_sgst + v_total_igst;
    
    -- If totals are zero, try to get from invoice header
    IF v_grand_total = 0 THEN
        v_grand_total := COALESCE(inv_rec.total_amount, 0);
        v_total_taxable := v_grand_total; -- Assume all taxable if no breakdown
    END IF;

    -- 6. Construct Journal Entries
    IF v_grand_total > 0 THEN
        -- DEBIT Customer (Grand Total)
        v_entries := v_entries || jsonb_build_object(
            'ledger_id', v_customer_ledger_id,
            'debit', v_grand_total,
            'credit', 0
        );

        -- CREDIT Sales (Taxable Total)
        IF v_total_taxable > 0 THEN
            v_entries := v_entries || jsonb_build_object(
                'ledger_id', v_sales_ledger_id,
                'debit', 0,
                'credit', v_total_taxable
            );
        END IF;

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

        -- 7. Post Journal
        IF jsonb_array_length(v_entries) > 0 THEN
            PERFORM public.record_journal_entry(
                p_invoice_id, 
                'SALES_INVOICE', 
                inv_rec.invoice_date, 
                'Sales Invoice #' || inv_rec.invoice_number, 
                v_entries
            );
        END IF;
    END IF;

END;
$$;

-- Also ensure closing_balance column exists
ALTER TABLE public.ledgers 
ADD COLUMN IF NOT EXISTS closing_balance numeric DEFAULT 0.00;

-- Update closing_balance for existing records
UPDATE public.ledgers 
SET closing_balance = COALESCE(current_balance, 0)
WHERE closing_balance IS NULL;
