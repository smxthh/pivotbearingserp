-- ==============================================================================
-- ACCOUNTING PHASE 3: PURCHASE VOUCHER INTEGRATION (ROBUST)
-- Created: 2025-12-24
-- Purpose: Connects existing 'purchase_invoice' vouchers to Accounting
--          Includes self-healing logic for missing ledgers/groups
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.post_purchase_voucher_accounting(p_voucher_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_tenant_id uuid;
    v_rec RECORD;
    tax_rec RECORD;
    v_vendor_ledger_id uuid;
    
    v_purchase_ledger_id uuid;
    v_input_cgst_id uuid;
    v_input_sgst_id uuid;
    v_input_igst_id uuid;
    
    -- IDs for Group Creation
    v_group_id uuid;
    v_root_id uuid;
    v_parent_id uuid;
    
    v_entries jsonb := '[]'::jsonb;
    v_total_taxable numeric := 0;
    v_total_cgst numeric := 0;
    v_total_sgst numeric := 0;
    v_total_igst numeric := 0;
    v_grand_total numeric := 0;
BEGIN
    v_tenant_id := public.get_user_tenant_id();

    -- 1. Fetch Voucher
    SELECT * INTO v_rec FROM vouchers WHERE id = p_voucher_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Voucher not found'; END IF;

    IF v_rec.voucher_type != 'purchase_invoice' THEN
        RAISE EXCEPTION 'Voucher is not a Purchase Invoice';
    END IF;

    -- Check if already posted
    IF EXISTS (SELECT 1 FROM ledger_entries WHERE transaction_id = p_voucher_id) THEN
        RAISE EXCEPTION 'Accounting entries already exist for this voucher';
    END IF;

    -- 2. Identify Ledgers
    -- Vendor
    SELECT ledger_id INTO v_vendor_ledger_id FROM parties WHERE id = v_rec.party_id;
    IF v_vendor_ledger_id IS NULL THEN
        PERFORM public.create_ledger_for_party(v_rec.party_id);
        SELECT ledger_id INTO v_vendor_ledger_id FROM parties WHERE id = v_rec.party_id;
    END IF;
    IF v_vendor_ledger_id IS NULL THEN RAISE EXCEPTION 'Vendor Ledger not found - please link party to a ledger'; END IF;

    -- ========================================================================
    -- SELF-HEALING: PURCHASE ACCOUNT
    -- ========================================================================
    v_purchase_ledger_id := public.get_ledger_id_by_name(v_tenant_id, 'Purchase Account');
    
    IF v_purchase_ledger_id IS NULL THEN
        -- Check/Create 'Purchase Accounts' Group
        SELECT id INTO v_group_id FROM ledger_groups WHERE tenant_id = v_tenant_id AND name = 'Purchase Accounts';
        
        IF v_group_id IS NULL THEN
             -- Check/Create 'Expenses' Root
             SELECT id INTO v_root_id FROM ledger_groups WHERE tenant_id = v_tenant_id AND name = 'Expenses';
             IF v_root_id IS NULL THEN
                 INSERT INTO ledger_groups (tenant_id, name, nature, code, is_system) 
                 VALUES (v_tenant_id, 'Expenses', 'Expense', 'EXP', true) RETURNING id INTO v_root_id;
             END IF;
             
             INSERT INTO ledger_groups (tenant_id, name, nature, parent_group_id, code, is_system) 
             VALUES (v_tenant_id, 'Purchase Accounts', 'Expense', v_root_id, 'E-PUR', true) RETURNING id INTO v_group_id;
        END IF;
        
        -- Create Ledger
        INSERT INTO ledgers (tenant_id, name, group_id, is_system)
        VALUES (v_tenant_id, 'Purchase Account', v_group_id, true)
        RETURNING id INTO v_purchase_ledger_id;
    END IF;
    
    -- ========================================================================
    -- SELF-HEALING: INPUT DUTIES (CGST/SGST/IGST)
    -- ========================================================================
    
    -- Helper Block to ensure 'Duties & Taxes' exists
    SELECT id INTO v_group_id FROM ledger_groups WHERE tenant_id = v_tenant_id AND (name = 'Duties & Taxes' OR name = 'Duties and Taxes');
    
    IF v_group_id IS NULL THEN
         -- Check/Create 'Liabilities' Root
         SELECT id INTO v_root_id FROM ledger_groups WHERE tenant_id = v_tenant_id AND name = 'Liabilities';
         IF v_root_id IS NULL THEN
             INSERT INTO ledger_groups (tenant_id, name, nature, code, is_system) 
             VALUES (v_tenant_id, 'Liabilities', 'Liability', 'LIAB', true) RETURNING id INTO v_root_id;
         END IF;
         
         -- Check/Create 'Current Liabilities'
         SELECT id INTO v_parent_id FROM ledger_groups WHERE tenant_id = v_tenant_id AND name = 'Current Liabilities';
         IF v_parent_id IS NULL THEN
             INSERT INTO ledger_groups (tenant_id, name, nature, parent_group_id, code, is_system) 
             VALUES (v_tenant_id, 'Current Liabilities', 'Liability', v_root_id, 'L-CUR', true) RETURNING id INTO v_parent_id;
         END IF;
         
         -- Create 'Duties & Taxes'
         INSERT INTO ledger_groups (tenant_id, name, nature, parent_group_id, code, is_system) 
         VALUES (v_tenant_id, 'Duties & Taxes', 'Liability', v_parent_id, 'L-DUT', true) RETURNING id INTO v_group_id;
    END IF;

    -- Ensure Input Ledgers Exist
    
    -- CGST
    v_input_cgst_id := public.get_ledger_id_by_name(v_tenant_id, 'Input CGST');
    IF v_input_cgst_id IS NULL THEN
        INSERT INTO ledgers (tenant_id, name, group_id, is_system)
        VALUES (v_tenant_id, 'Input CGST', v_group_id, true)
        RETURNING id INTO v_input_cgst_id;
    END IF;
    
    -- SGST
    v_input_sgst_id := public.get_ledger_id_by_name(v_tenant_id, 'Input SGST');
    IF v_input_sgst_id IS NULL THEN
        INSERT INTO ledgers (tenant_id, name, group_id, is_system)
        VALUES (v_tenant_id, 'Input SGST', v_group_id, true)
        RETURNING id INTO v_input_sgst_id;
    END IF;
    
    -- IGST
    v_input_igst_id := public.get_ledger_id_by_name(v_tenant_id, 'Input IGST');
    IF v_input_igst_id IS NULL THEN
        INSERT INTO ledgers (tenant_id, name, group_id, is_system)
        VALUES (v_tenant_id, 'Input IGST', v_group_id, true)
        RETURNING id INTO v_input_igst_id;
    END IF;


    -- 3. Calculate Totals (Group by Tax from Voucher Items)
    FOR tax_rec IN 
        SELECT 
            SUM(taxable_amount) as taxable_val, 
            SUM(cgst_amount) as cgst_val, 
            SUM(sgst_amount) as sgst_val, 
            SUM(igst_amount) as igst_val
        FROM voucher_items 
        WHERE voucher_id = p_voucher_id
    LOOP
        v_total_taxable := COALESCE(tax_rec.taxable_val, 0);
        v_total_cgst := COALESCE(tax_rec.cgst_val, 0);
        v_total_sgst := COALESCE(tax_rec.sgst_val, 0);
        v_total_igst := COALESCE(tax_rec.igst_val, 0);
    END LOOP;

    -- Recalculate Grand Total (Balance Check)
    v_grand_total := v_total_taxable + v_total_cgst + v_total_sgst + v_total_igst;

    -- 4. Construct Journal Entries
    -- CREDIT Vendor (Grand Total) - Liability
    IF v_grand_total > 0 THEN
        v_entries := v_entries || jsonb_build_object(
            'ledger_id', v_vendor_ledger_id,
            'debit', 0,
            'credit', v_grand_total
        );
    END IF;

    -- DEBIT Purchase (Taxable Total) - Expense
    IF v_total_taxable > 0 THEN
        v_entries := v_entries || jsonb_build_object(
            'ledger_id', v_purchase_ledger_id,
            'debit', v_total_taxable,
            'credit', 0
        );
    END IF;

    -- DEBIT Input Taxes - Asset
    IF v_total_cgst > 0 THEN
        v_entries := v_entries || jsonb_build_object('ledger_id', v_input_cgst_id, 'debit', v_total_cgst, 'credit', 0);
    END IF;
    IF v_total_sgst > 0 THEN
         v_entries := v_entries || jsonb_build_object('ledger_id', v_input_sgst_id, 'debit', v_total_sgst, 'credit', 0);
    END IF;
    IF v_total_igst > 0 THEN
         v_entries := v_entries || jsonb_build_object('ledger_id', v_input_igst_id, 'debit', v_total_igst, 'credit', 0);
    END IF;

    -- 5. Post Journal
    IF jsonb_array_length(v_entries) > 0 THEN
        PERFORM public.record_journal_entry(
            p_voucher_id, 
            'PURCHASE_INVOICE', 
            v_rec.voucher_date, 
            'Purchase Invoice #' || v_rec.voucher_number, 
            v_entries
        );
    END IF;

END;
$$;
