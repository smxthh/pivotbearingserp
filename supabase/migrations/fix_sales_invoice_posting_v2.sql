-- ============================================================================
-- FINAL FIX: SALES INVOICE AUTO-POSTING FUNCTION
-- Uses Invoice Header Totals directly for reliability
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
    
    -- Values
    v_taxable_val numeric := 0;
    v_cgst_val numeric := 0;
    v_sgst_val numeric := 0;
    v_igst_val numeric := 0;
    v_grand_total numeric := 0;
    v_round_off numeric := 0;

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

    -- 5. Extracts Totals from Invoice Header
    -- Use COALESCE to safely handle nulls
    v_taxable_val := COALESCE(inv_rec.taxable_amount, 0);
    v_cgst_val := COALESCE(inv_rec.cgst_amount, 0);
    v_sgst_val := COALESCE(inv_rec.sgst_amount, 0);
    v_igst_val := COALESCE(inv_rec.igst_amount, 0);
    v_grand_total := COALESCE(inv_rec.grand_total, 0);
    IF v_grand_total = 0 AND inv_rec.total_amount > 0 THEN
         v_grand_total := inv_rec.total_amount; -- Fallback to total_amount if grand_total is 0
    END IF;
    v_round_off := COALESCE(inv_rec.round_off, 0);

    -- 6. Construct Journal Entries
    IF v_grand_total > 0 THEN
        -- DEBIT Customer (Grand Total)
        v_entries := v_entries || jsonb_build_object(
            'ledger_id', v_customer_ledger_id,
            'debit', v_grand_total,
            'credit', 0
        );

        -- CREDIT Sales (Taxable Total)
        IF v_taxable_val > 0 THEN
            v_entries := v_entries || jsonb_build_object(
                'ledger_id', v_sales_ledger_id,
                'debit', 0,
                'credit', v_taxable_val
            );
        END IF;

        -- CREDIT Taxes
        IF v_cgst_val > 0 THEN
            v_entries := v_entries || jsonb_build_object('ledger_id', v_output_cgst_id, 'debit', 0, 'credit', v_cgst_val);
        END IF;
        IF v_sgst_val > 0 THEN
            v_entries := v_entries || jsonb_build_object('ledger_id', v_output_sgst_id, 'debit', 0, 'credit', v_sgst_val);
        END IF;
        IF v_igst_val > 0 THEN
            v_entries := v_entries || jsonb_build_object('ledger_id', v_output_igst_id, 'debit', 0, 'credit', v_igst_val);
        END IF;
        
        -- HANDLE ROUND OFF (Expense or Income)
        -- If round off is negative (e.g. -0.4), it's a gain (we pay less? no wait).
        -- GrandTotal = Subtotal + Tax + RoundOff.
        -- If entries Debit = GrandTotal. 
        -- Credits = Taxable + Tax.
        -- Difference is RoundOff.
        -- If RoundOff is -0.50, GrandTotal is lower. So Debit is lower. Credits are higher. We need a Debit Entry to balance.
        -- Debit Entry = Expense (Round Off Expense).
        
        -- If RoundOff is +0.50, GrandTotal is higher. Debit is higher. Credits are lower. We need a Credit Entry to balance.
        -- Credit Entry = Income (Round Off Income).

        -- Simplified: Just post it to "Round Off" ledger.
        IF v_round_off != 0 THEN
             DECLARE
                v_round_off_ledger_id uuid;
             BEGIN
                v_round_off_ledger_id := public.get_ledger_id_by_name(v_tenant_id, 'Round Off');
                IF v_round_off_ledger_id IS NULL THEN
                     -- Create Round Off under Indirect Expenses default
                     INSERT INTO ledgers (tenant_id, name, group_id, opening_balance, opening_balance_type, current_balance, closing_balance, is_system)
                     VALUES (v_tenant_id, 'Round Off', (SELECT id FROM ledger_groups WHERE tenant_id=v_tenant_id AND code='I-EXP-IND' LIMIT 1), 0, 'Dr', 0, 0, true)
                     RETURNING id INTO v_round_off_ledger_id;
                END IF;
                
                -- Fallback if group creation failed earlier or I-EXP-IND missing
                IF v_round_off_ledger_id IS NULL THEN
                     -- Try finding Expense group
                     SELECT id INTO v_group_id FROM ledger_groups WHERE tenant_id = v_tenant_id AND nature = 'Expense' LIMIT 1;
                     INSERT INTO ledgers (tenant_id, name, group_id, opening_balance, opening_balance_type, current_balance, closing_balance, is_system)
                     VALUES (v_tenant_id, 'Round Off', v_group_id, 0, 'Dr', 0, 0, true)
                     RETURNING id INTO v_round_off_ledger_id;
                END IF;

                IF v_round_off > 0 THEN
                    -- Added to total, so it's an income/gain? Or we charged more?
                    -- We charged more. Sales = 100, Total = 101. Customer Dr 101, Sales Cr 100. Diff 1 Cr.
                    -- So Credit Round Off.
                    v_entries := v_entries || jsonb_build_object('ledger_id', v_round_off_ledger_id, 'debit', 0, 'credit', ABS(v_round_off));
                ELSE
                    -- Reduced from total. Sales = 100, Total = 99. Customer Dr 99, Sales Cr 100. Diff 1 Dr.
                    -- So Debit Round Off.
                    v_entries := v_entries || jsonb_build_object('ledger_id', v_round_off_ledger_id, 'debit', ABS(v_round_off), 'credit', 0);
                END IF;
             END;
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
