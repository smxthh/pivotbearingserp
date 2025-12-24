-- Drop and recreate post_sales_invoice_to_accounting with new parameter name
DROP FUNCTION IF EXISTS public.post_sales_invoice_to_accounting(uuid);

-- Recreate with p_voucher_id parameter
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
    v_entries jsonb := '[]'::jsonb;
    v_taxable_amount numeric;
    v_total_amount numeric;
    v_cgst_amount numeric;
    v_sgst_amount numeric;
    v_igst_amount numeric;
BEGIN
    v_tenant_id := public.get_user_tenant_id();
    
    -- 1. Fetch voucher
    SELECT * INTO v_rec FROM vouchers WHERE id = p_voucher_id;
    IF NOT FOUND THEN 
        RAISE EXCEPTION 'Voucher not found: %', p_voucher_id;
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
        RAISE EXCEPTION 'Sales Account ledger not found';
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
    
    -- 6. Build Journal Entries
    -- DEBIT: Customer (Accounts Receivable) - Total Amount
    v_entries := v_entries || jsonb_build_object(
        'ledger_id', v_customer_ledger_id,
        'debit', v_total_amount,
        'credit', 0
    );
    
    -- CREDIT: Sales Account - Taxable Amount
    IF v_taxable_amount > 0 THEN
        v_entries := v_entries || jsonb_build_object(
            'ledger_id', v_sales_ledger_id,
            'debit', 0,
            'credit', v_taxable_amount
        );
    END IF;
    
    -- CREDIT: Output CGST
    IF v_cgst_amount > 0 AND v_cgst_ledger_id IS NOT NULL THEN
        v_entries := v_entries || jsonb_build_object(
            'ledger_id', v_cgst_ledger_id,
            'debit', 0,
            'credit', v_cgst_amount
        );
    END IF;
    
    -- CREDIT: Output SGST
    IF v_sgst_amount > 0 AND v_sgst_ledger_id IS NOT NULL THEN
        v_entries := v_entries || jsonb_build_object(
            'ledger_id', v_sgst_ledger_id,
            'debit', 0,
            'credit', v_sgst_amount
        );
    END IF;
    
    -- CREDIT: Output IGST
    IF v_igst_amount > 0 AND v_igst_ledger_id IS NOT NULL THEN
        v_entries := v_entries || jsonb_build_object(
            'ledger_id', v_igst_ledger_id,
            'debit', 0,
            'credit', v_igst_amount
        );
    END IF;
    
    -- 7. Post using record_journal_entry
    IF jsonb_array_length(v_entries) > 0 THEN
        PERFORM public.record_journal_entry(
            p_voucher_id,
            'SALES_INVOICE',
            v_rec.voucher_date,
            'Tax Invoice: ' || v_rec.voucher_number || ' - ' || COALESCE(v_rec.party_name, ''),
            v_entries
        );
    END IF;
    
END;
$function$;