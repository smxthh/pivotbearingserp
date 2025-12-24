-- ============================================================================
-- MASTER FIX: COMPLETE LEDGER AUTOMATION & SYNC
-- Run this ENTIRE file in Supabase SQL Editor to fix everything at once.
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


-- 2. Update the Sales Posting Logic (The Core Fix)
-- Uses Invoice Header totals which are reliable, instead of item lines
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
BEGIN
    v_tenant_id := public.get_user_tenant_id();

    -- A. Fetch Invoice
    SELECT * INTO inv_rec FROM invoices WHERE id = p_invoice_id;
    IF NOT FOUND THEN 
        RAISE EXCEPTION 'Invoice not found: %', p_invoice_id;
    END IF;

    -- B. Check if already posted
    IF EXISTS (SELECT 1 FROM ledger_entries WHERE transaction_id = p_invoice_id) THEN
        RETURN; -- Already posted, exit safely
    END IF;

    -- C. Get/Create Customer Ledger
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
            (SELECT id FROM ledger_groups WHERE tenant_id=v_tenant_id AND nature='Income' LIMIT 1), -- Ensure 'Income' group exists first or use fallback
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

    -- F. Extract Values (Using Reliable Header Fields)
    v_taxable_val := COALESCE(inv_rec.taxable_amount, 0);
    v_cgst_val := COALESCE(inv_rec.cgst_amount, 0);
    v_sgst_val := COALESCE(inv_rec.sgst_amount, 0);
    v_igst_val := COALESCE(inv_rec.igst_amount, 0);
    v_grand_total := COALESCE(inv_rec.grand_total, 0);
    v_round_off := COALESCE(inv_rec.round_off, 0);
    
    -- Fallback for migrated/old data
    IF v_grand_total = 0 AND inv_rec.total_amount > 0 THEN
        v_grand_total := inv_rec.total_amount;
        IF v_taxable_val = 0 THEN v_taxable_val := v_grand_total; END IF;
    END IF;

    -- G. Build Journal Entries
    IF v_grand_total > 0 THEN
        -- DEBIT Customer
        v_entries := v_entries || jsonb_build_object('ledger_id', v_customer_ledger_id, 'debit', v_grand_total, 'credit', 0);

        -- CREDIT Sales
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
                     -- Try to find Expense group safely
                    INSERT INTO ledgers (tenant_id, name, group_id, opening_balance, opening_balance_type, current_balance, closing_balance, is_system)
                    VALUES (v_tenant_id, 'Round Off', (SELECT id FROM ledger_groups WHERE tenant_id=v_tenant_id AND nature='Expense' LIMIT 1), 0, 'Dr', 0, 0, true) RETURNING id INTO v_round_off_id;
                END IF;
                
                IF v_round_off > 0 THEN -- Credit nature (gained)
                    v_entries := v_entries || jsonb_build_object('ledger_id', v_round_off_id, 'debit', 0, 'credit', ABS(v_round_off));
                ELSE -- Debit nature (lost)
                    v_entries := v_entries || jsonb_build_object('ledger_id', v_round_off_id, 'debit', ABS(v_round_off), 'credit', 0);
                END IF;
             END;
        END IF;

        -- H. Post to Journal
        PERFORM public.record_journal_entry(
            p_invoice_id, 
            'SALES_INVOICE', 
            inv_rec.invoice_date, 
            'Sales Invoice #' || inv_rec.invoice_number, 
            v_entries
        );
    END IF;
END;
$$;


-- 3. Update Automation Triggers
-- Ensures confirmed invoices are auto-posted
CREATE OR REPLACE FUNCTION public.auto_post_invoice_to_accounting()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Only process if status is 'confirmed'
    IF NEW.status != 'confirmed' THEN RETURN NEW; END IF;
    
    -- Check if already posted
    IF EXISTS (SELECT 1 FROM ledger_entries WHERE transaction_id = NEW.id) THEN RETURN NEW; END IF;
    
    -- Auto-post
    BEGIN
        PERFORM public.post_sales_invoice_to_accounting(NEW.id);
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Failed to auto-post invoice %: %', NEW.invoice_number, SQLERRM;
    END;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.auto_reverse_invoice_from_accounting()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    entry_rec RECORD;
BEGIN
    IF OLD.status = 'confirmed' AND NEW.status = 'cancelled' THEN
        -- Reverse balances
        FOR entry_rec IN 
            SELECT ledger_id, SUM(debit - credit) as net_change
            FROM ledger_entries 
            WHERE transaction_id = NEW.id
            GROUP BY ledger_id
        LOOP
            UPDATE ledgers 
            SET current_balance = current_balance - entry_rec.net_change,
                closing_balance = closing_balance - entry_rec.net_change, -- Sync closing_balance too
                updated_at = now()
            WHERE id = entry_rec.ledger_id;
        END LOOP;
        
        -- Delete entries
        DELETE FROM ledger_entries WHERE transaction_id = NEW.id;
    END IF;
    RETURN NEW;
END;
$$;

-- Apply Triggers
DROP TRIGGER IF EXISTS trigger_auto_post_invoice_on_insert ON public.invoices;
CREATE TRIGGER trigger_auto_post_invoice_on_insert AFTER INSERT ON public.invoices FOR EACH ROW WHEN (NEW.status = 'confirmed') EXECUTE FUNCTION public.auto_post_invoice_to_accounting();

DROP TRIGGER IF EXISTS trigger_auto_post_invoice_on_update ON public.invoices;
CREATE TRIGGER trigger_auto_post_invoice_on_update AFTER UPDATE ON public.invoices FOR EACH ROW WHEN (OLD.status != 'confirmed' AND NEW.status = 'confirmed') EXECUTE FUNCTION public.auto_post_invoice_to_accounting();

DROP TRIGGER IF EXISTS trigger_auto_reverse_invoice_on_cancel ON public.invoices;
CREATE TRIGGER trigger_auto_reverse_invoice_on_cancel AFTER UPDATE ON public.invoices FOR EACH ROW WHEN (OLD.status = 'confirmed' AND NEW.status = 'cancelled') EXECUTE FUNCTION public.auto_reverse_invoice_from_accounting();


-- 4. BACKFILL: Sync All Existing Confirmed Invoices
-- This makes your existing data show up!
DO $$
DECLARE
    r RECORD;
    v_count integer := 0;
BEGIN
    RAISE NOTICE 'Starting Backfill...';
    FOR r IN SELECT id, invoice_number FROM invoices WHERE status = 'confirmed' LOOP
        IF NOT EXISTS (SELECT 1 FROM ledger_entries WHERE transaction_id = r.id) THEN
            PERFORM public.post_sales_invoice_to_accounting(r.id);
            RAISE NOTICE 'Backfilled sales invoice: %', r.invoice_number;
            v_count := v_count + 1;
        END IF;
    END LOOP;
    
    RAISE NOTICE '---------------------------------------------------';
    RAISE NOTICE 'SUCCESS! Backfill complete. Posted % invoices.', v_count;
    RAISE NOTICE 'Your Ledger is now fully automated and synced.';
    RAISE NOTICE '---------------------------------------------------';
END;
$$;
