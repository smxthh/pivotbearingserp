-- Fix post_sales_invoice_to_accounting to use voucher's tenant_id instead of auth context
DROP FUNCTION IF EXISTS public.post_sales_invoice_to_accounting(uuid);

CREATE OR REPLACE FUNCTION public.post_sales_invoice_to_accounting(p_voucher_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_tenant_id uuid;
    v_rec RECORD;
    v_customer_ledger_id uuid;
    v_sales_ledger_id uuid;
    v_cgst_ledger_id uuid;
    v_sgst_ledger_id uuid;
    v_igst_ledger_id uuid;
    v_taxable_amount numeric;
    v_total_amount numeric;
    v_cgst_amount numeric;
    v_sgst_amount numeric;
    v_igst_amount numeric;
    v_entry_ledger uuid;
    v_entry_debit numeric;
    v_entry_credit numeric;
BEGIN
    -- 1. Fetch voucher and get tenant_id from voucher itself (not auth context)
    SELECT * INTO v_rec FROM vouchers WHERE id = p_voucher_id;
    IF NOT FOUND THEN 
        RAISE EXCEPTION 'Voucher not found: %', p_voucher_id;
    END IF;
    
    -- Use voucher's tenant_id
    v_tenant_id := v_rec.tenant_id;
    IF v_tenant_id IS NULL THEN
        RAISE EXCEPTION 'Voucher has no tenant_id: %', p_voucher_id;
    END IF;
    
    -- Only process tax_invoice type
    IF v_rec.voucher_type != 'tax_invoice' THEN
        RETURN;
    END IF;
    
    -- Check if already posted (idempotent)
    IF EXISTS (SELECT 1 FROM ledger_entries WHERE transaction_id = p_voucher_id AND transaction_type != 'REVERSAL') THEN
        RETURN;
    END IF;
    
    -- 2. Get amounts
    v_taxable_amount := COALESCE(v_rec.taxable_amount, v_rec.subtotal, 0);
    v_cgst_amount := COALESCE(v_rec.cgst_amount, 0);
    v_sgst_amount := COALESCE(v_rec.sgst_amount, 0);
    v_igst_amount := COALESCE(v_rec.igst_amount, 0);
    v_total_amount := COALESCE(v_rec.total_amount, v_taxable_amount + v_cgst_amount + v_sgst_amount + v_igst_amount);
    
    -- 3. Get Customer Ledger
    SELECT ledger_id INTO v_customer_ledger_id FROM parties WHERE id = v_rec.party_id;
    IF v_customer_ledger_id IS NULL THEN
        -- Try to create ledger for party
        PERFORM public.create_ledger_for_party(v_rec.party_id);
        SELECT ledger_id INTO v_customer_ledger_id FROM parties WHERE id = v_rec.party_id;
    END IF;
    
    IF v_customer_ledger_id IS NULL THEN
        RAISE EXCEPTION 'Customer ledger not found for party: %', v_rec.party_id;
    END IF;
    
    -- 4. Get Sales Account
    v_sales_ledger_id := public.get_ledger_id_by_name(v_tenant_id, 'Sales Account');
    IF v_sales_ledger_id IS NULL THEN
        RAISE EXCEPTION 'Sales Account ledger not found for tenant: %', v_tenant_id;
    END IF;
    
    -- 5. Get GST Ledgers
    v_cgst_ledger_id := public.get_ledger_id_by_name(v_tenant_id, 'Output CGST');
    IF v_cgst_ledger_id IS NULL THEN
        v_cgst_ledger_id := public.get_ledger_id_by_name(v_tenant_id, 'CGST Output');
    END IF;
    
    v_sgst_ledger_id := public.get_ledger_id_by_name(v_tenant_id, 'Output SGST');
    IF v_sgst_ledger_id IS NULL THEN
        v_sgst_ledger_id := public.get_ledger_id_by_name(v_tenant_id, 'SGST Output');
    END IF;
    
    v_igst_ledger_id := public.get_ledger_id_by_name(v_tenant_id, 'Output IGST');
    IF v_igst_ledger_id IS NULL THEN
        v_igst_ledger_id := public.get_ledger_id_by_name(v_tenant_id, 'IGST Output');
    END IF;
    
    -- 6. Insert Ledger Entries Directly (bypass record_journal_entry auth check)
    
    -- DEBIT: Customer (Accounts Receivable) - Total Amount
    INSERT INTO ledger_entries (
        tenant_id, transaction_id, transaction_type, ledger_id, 
        debit, credit, entry_date, description, created_by
    ) VALUES (
        v_tenant_id, p_voucher_id, 'SALES_INVOICE', v_customer_ledger_id,
        v_total_amount, 0, v_rec.voucher_date, 
        'Sales Invoice #' || v_rec.voucher_number, v_rec.created_by
    );
    
    -- Update customer ledger balance
    UPDATE ledgers 
    SET current_balance = COALESCE(current_balance, 0) + v_total_amount,
        closing_balance = COALESCE(closing_balance, 0) + v_total_amount,
        updated_at = now()
    WHERE id = v_customer_ledger_id;
    
    -- CREDIT: Sales Account - Taxable Amount
    IF v_taxable_amount > 0 THEN
        INSERT INTO ledger_entries (
            tenant_id, transaction_id, transaction_type, ledger_id, 
            debit, credit, entry_date, description, created_by
        ) VALUES (
            v_tenant_id, p_voucher_id, 'SALES_INVOICE', v_sales_ledger_id,
            0, v_taxable_amount, v_rec.voucher_date, 
            'Sales Invoice #' || v_rec.voucher_number, v_rec.created_by
        );
        
        UPDATE ledgers 
        SET current_balance = COALESCE(current_balance, 0) - v_taxable_amount,
            closing_balance = COALESCE(closing_balance, 0) - v_taxable_amount,
            updated_at = now()
        WHERE id = v_sales_ledger_id;
    END IF;
    
    -- CREDIT: Output CGST
    IF v_cgst_amount > 0 AND v_cgst_ledger_id IS NOT NULL THEN
        INSERT INTO ledger_entries (
            tenant_id, transaction_id, transaction_type, ledger_id, 
            debit, credit, entry_date, description, created_by
        ) VALUES (
            v_tenant_id, p_voucher_id, 'SALES_INVOICE', v_cgst_ledger_id,
            0, v_cgst_amount, v_rec.voucher_date, 
            'Sales Invoice #' || v_rec.voucher_number, v_rec.created_by
        );
        
        UPDATE ledgers 
        SET current_balance = COALESCE(current_balance, 0) - v_cgst_amount,
            closing_balance = COALESCE(closing_balance, 0) - v_cgst_amount,
            updated_at = now()
        WHERE id = v_cgst_ledger_id;
    END IF;
    
    -- CREDIT: Output SGST
    IF v_sgst_amount > 0 AND v_sgst_ledger_id IS NOT NULL THEN
        INSERT INTO ledger_entries (
            tenant_id, transaction_id, transaction_type, ledger_id, 
            debit, credit, entry_date, description, created_by
        ) VALUES (
            v_tenant_id, p_voucher_id, 'SALES_INVOICE', v_sgst_ledger_id,
            0, v_sgst_amount, v_rec.voucher_date, 
            'Sales Invoice #' || v_rec.voucher_number, v_rec.created_by
        );
        
        UPDATE ledgers 
        SET current_balance = COALESCE(current_balance, 0) - v_sgst_amount,
            closing_balance = COALESCE(closing_balance, 0) - v_sgst_amount,
            updated_at = now()
        WHERE id = v_sgst_ledger_id;
    END IF;
    
    -- CREDIT: Output IGST
    IF v_igst_amount > 0 AND v_igst_ledger_id IS NOT NULL THEN
        INSERT INTO ledger_entries (
            tenant_id, transaction_id, transaction_type, ledger_id, 
            debit, credit, entry_date, description, created_by
        ) VALUES (
            v_tenant_id, p_voucher_id, 'SALES_INVOICE', v_igst_ledger_id,
            0, v_igst_amount, v_rec.voucher_date, 
            'Sales Invoice #' || v_rec.voucher_number, v_rec.created_by
        );
        
        UPDATE ledgers 
        SET current_balance = COALESCE(current_balance, 0) - v_igst_amount,
            closing_balance = COALESCE(closing_balance, 0) - v_igst_amount,
            updated_at = now()
        WHERE id = v_igst_ledger_id;
    END IF;
    
    RAISE NOTICE 'Successfully posted Sales Invoice % to ledger accounts', v_rec.voucher_number;
END;
$function$;