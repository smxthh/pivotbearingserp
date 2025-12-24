-- ============================================================================
-- FINAL FIX: SALES INVOICE AUTO-POSTING (VOUCHERS TABLE)
-- Rewritten to read from 'vouchers' table instead of 'invoices'
-- ============================================================================

-- 1. Ensure Ledger Table has required columns for UI
ALTER TABLE public.ledgers 
ADD COLUMN IF NOT EXISTS opening_balance_type text DEFAULT 'Dr' CHECK (opening_balance_type IN ('Dr', 'Cr')),
ADD COLUMN IF NOT EXISTS closing_balance numeric DEFAULT 0.00;

-- Update existing records to have valid defaults
UPDATE public.ledgers 
SET opening_balance_type = CASE WHEN opening_balance >= 0 THEN 'Dr' ELSE 'Cr' END
WHERE opening_balance_type IS NULL;

UPDATE public.ledgers 
SET closing_balance = COALESCE(current_balance, 0)
WHERE closing_balance IS NULL;


-- 2. REWRITE: Post Sales Invoice (Reads from VOUCHERS table)
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
    
BEGIN
    v_tenant_id := public.get_user_tenant_id();

    -- A. Fetch Invoice (FROM VOUCHERS)
    SELECT * INTO inv_rec FROM vouchers WHERE id = p_invoice_id;
    IF NOT FOUND THEN 
        RAISE EXCEPTION 'Invoice not found in vouchers table: %', p_invoice_id;
    END IF;
    
    -- Validate Type
    IF inv_rec.voucher_type NOT IN ('tax_invoice', 'sales_invoice') THEN
         RAISE EXCEPTION 'Invalid voucher type for sales posting: %', inv_rec.voucher_type;
    END IF;

    -- B. Check if already posted
    IF EXISTS (SELECT 1 FROM ledger_entries WHERE transaction_id = p_invoice_id) THEN
        RETURN; -- Already posted, exit safely
    END IF;

    -- C. Get/Create Customer Ledger
    IF inv_rec.party_id IS NULL THEN
         RAISE EXCEPTION 'Party ID is missing for voucher %', inv_rec.voucher_number;
    END IF;

    SELECT ledger_id INTO v_customer_ledger_id FROM parties WHERE id = inv_rec.party_id;
    IF v_customer_ledger_id IS NULL THEN
        PERFORM public.create_ledger_for_party(inv_rec.party_id);
        SELECT ledger_id INTO v_customer_ledger_id FROM parties WHERE id = inv_rec.party_id;
    END IF;
    
    -- D. Get/Create Sales Account Ledger
    v_sales_ledger_id := public.get_ledger_id_by_name(v_tenant_id, 'Sales Account');
    IF v_sales_ledger_id IS NULL THEN
        INSERT INTO ledgers (tenant_id, name, group_id, opening_balance, opening_balance_type, current_balance, closing_balance, is_system)
        VALUES (
            v_tenant_id, 
            'Sales Account', 
            (SELECT id FROM ledger_groups WHERE tenant_id=v_tenant_id AND nature='Income' LIMIT 1),
            0, 'Cr', 0, 0, true
        ) RETURNING id INTO v_sales_ledger_id;
    END IF;

    -- E. Get/Create Output GST Ledgers
    v_output_cgst_id := public.get_ledger_id_by_name(v_tenant_id, 'Output CGST');
    IF v_output_cgst_id IS NULL THEN
       INSERT INTO ledgers (tenant_id, name, group_id, opening_balance, opening_balance_type, current_balance, closing_balance, is_system)
       VALUES (v_tenant_id, 'Output CGST', (SELECT id FROM ledger_groups WHERE tenant_id=v_tenant_id AND nature='Liability' LIMIT 1), 0, 'Cr', 0, 0, true) RETURNING id INTO v_output_cgst_id;
    END IF;

    v_output_sgst_id := public.get_ledger_id_by_name(v_tenant_id, 'Output SGST');
    IF v_output_sgst_id IS NULL THEN
       INSERT INTO ledgers (tenant_id, name, group_id, opening_balance, opening_balance_type, current_balance, closing_balance, is_system)
       VALUES (v_tenant_id, 'Output SGST', (SELECT id FROM ledger_groups WHERE tenant_id=v_tenant_id AND nature='Liability' LIMIT 1), 0, 'Cr', 0, 0, true) RETURNING id INTO v_output_sgst_id;
    END IF;

    v_output_igst_id := public.get_ledger_id_by_name(v_tenant_id, 'Output IGST');
    IF v_output_igst_id IS NULL THEN
       INSERT INTO ledgers (tenant_id, name, group_id, opening_balance, opening_balance_type, current_balance, closing_balance, is_system)
       VALUES (v_tenant_id, 'Output IGST', (SELECT id FROM ledger_groups WHERE tenant_id=v_tenant_id AND nature='Liability' LIMIT 1), 0, 'Cr', 0, 0, true) RETURNING id INTO v_output_igst_id;
    END IF;

    -- F. Extract Values (From Vouchers table columns)
    v_taxable_val := COALESCE(inv_rec.taxable_amount, 0);
    v_cgst_val := COALESCE(inv_rec.cgst_amount, 0);
    v_sgst_val := COALESCE(inv_rec.sgst_amount, 0);
    v_igst_val := COALESCE(inv_rec.igst_amount, 0);
    v_grand_total := COALESCE(inv_rec.total_amount, 0); -- vouchers table uses 'total_amount'
    v_round_off := COALESCE(inv_rec.round_off, 0);
    
    -- Fallback safety
    IF v_grand_total = 0 AND (v_taxable_val + v_cgst_val + v_sgst_val + v_igst_val) > 0 THEN
        v_grand_total := v_taxable_val + v_cgst_val + v_sgst_val + v_igst_val + v_round_off;
    END IF;

    -- G. Build Journal Entries
    IF v_grand_total > 0 THEN
        -- DEBIT Customer (Grand Total)
        v_entries := v_entries || jsonb_build_object('ledger_id', v_customer_ledger_id, 'debit', v_grand_total, 'credit', 0);

        -- CREDIT Sales (Taxable)
        IF v_taxable_val > 0 THEN
            v_entries := v_entries || jsonb_build_object('ledger_id', v_sales_ledger_id, 'debit', 0, 'credit', v_taxable_val);
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
        
        -- HANDLE ROUND OFF
        IF v_round_off != 0 THEN
             DECLARE
                v_round_off_id uuid := public.get_ledger_id_by_name(v_tenant_id, 'Round Off');
             BEGIN
                IF v_round_off_id IS NULL THEN
                     -- Create 'Round Off' ledger if missing
                     -- Try to find Indirect Expenses group
                    INSERT INTO ledgers (tenant_id, name, group_id, opening_balance, opening_balance_type, current_balance, closing_balance, is_system)
                    VALUES (v_tenant_id, 'Round Off', (SELECT id FROM ledger_groups WHERE tenant_id=v_tenant_id AND nature='Expense' LIMIT 1), 0, 'Dr', 0, 0, true) RETURNING id INTO v_round_off_id;
                END IF;
                
                IF v_round_off > 0 THEN -- Added to bill -> Credit (Income/Gain)
                    v_entries := v_entries || jsonb_build_object('ledger_id', v_round_off_id, 'debit', 0, 'credit', ABS(v_round_off));
                ELSE -- Reduced from bill -> Debit (Expense/Loss)
                    v_entries := v_entries || jsonb_build_object('ledger_id', v_round_off_id, 'debit', ABS(v_round_off), 'credit', 0);
                END IF;
             END;
        END IF;

        -- H. Post to Journal
        PERFORM public.record_journal_entry(
            p_invoice_id, 
            'SALES_INVOICE', 
            inv_rec.voucher_date, 
            'Sales Invoice #' || inv_rec.voucher_number, 
            v_entries
        );
    END IF;
END;
$$;


-- 3. VALIDATE AUTOMATION TRIGGERS (Already exist in separate file, but ensuring they are correct for Vouchers)
-- The triggers in 20251224_auto_post_triggers.sql call public.post_sales_invoice_to_accounting(NEW.id) for 'tax_invoice'.
-- Since we just updated that function to expect a VOUCHER ID, it is now perfectly aligned.


-- 4. BACKFILL: Sync All Existing Confirmed Tax Invoices (VOUCHERS)
DO $$
DECLARE
    r RECORD;
    v_count integer := 0;
BEGIN
    RAISE NOTICE 'Starting Backfill for VOUCHERS table...';
    FOR r IN SELECT id, voucher_number FROM vouchers WHERE voucher_type = 'tax_invoice' AND status = 'confirmed' LOOP
        IF NOT EXISTS (SELECT 1 FROM ledger_entries WHERE transaction_id = r.id) THEN
            BEGIN
                PERFORM public.post_sales_invoice_to_accounting(r.id);
                RAISE NOTICE 'Backfilled sales invoice: %', r.voucher_number;
                v_count := v_count + 1;
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Skipping voucher % due to error: %', r.voucher_number, SQLERRM;
            END;
        END IF;
    END LOOP;
    
    RAISE NOTICE '---------------------------------------------------';
    RAISE NOTICE 'SUCCESS! Backfill complete. Posted % vouchers.', v_count;
    RAISE NOTICE '---------------------------------------------------';
END;
$$;
