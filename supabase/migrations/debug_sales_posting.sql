-- DEBUG FUNCTION: Manually post sales invoice and return debug info
CREATE OR REPLACE FUNCTION public.debug_post_sales_invoice(p_invoice_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_log text := '';
    v_tenant_id uuid;
    inv_rec RECORD;
    v_item_count int;
    v_total_taxable numeric;
    v_grand_total numeric;
    v_sales_ledger_id uuid;
    v_customer_ledger_id uuid;
BEGIN
    v_log := v_log || 'Starting debug for invoice: ' || p_invoice_id || E'\n';
    
    -- 1. Check Tenant
    v_tenant_id := public.get_user_tenant_id();
    v_log := v_log || 'Tenant ID: ' || COALESCE(v_tenant_id::text, 'NULL') || E'\n';
    
    -- 2. Fetch Invoice
    SELECT * INTO inv_rec FROM invoices WHERE id = p_invoice_id;
    IF NOT FOUND THEN
        RETURN v_log || 'ERROR: Invoice not found in table';
    END IF;
    v_log := v_log || 'Invoice Found: #' || inv_rec.invoice_number || ' Status: ' || inv_rec.status || E'\n';
    
    -- 3. Check duplicate posting
    IF EXISTS (SELECT 1 FROM ledger_entries WHERE transaction_id = p_invoice_id) THEN
        v_log := v_log || 'WARNING: Already posted! Entries found in ledger_entries.\n';
        -- Don't exit, let's see what else happens
    ELSE
        v_log := v_log || 'Not posted yet (clean state).\n';
    END IF;

    -- 4. Check Customer Ledger
    SELECT ledger_id INTO v_customer_ledger_id FROM parties WHERE id = inv_rec.party_id;
    v_log := v_log || 'Party ID: ' || inv_rec.party_id || ' Ledger ID: ' || COALESCE(v_customer_ledger_id::text, 'NULL') || E'\n';

    -- 5. Check Sales Ledger
    v_sales_ledger_id := public.get_ledger_id_by_name(v_tenant_id, 'Sales Account');
    v_log := v_log || 'Sales Account Ledger ID: ' || COALESCE(v_sales_ledger_id::text, 'NULL') || E'\n';
    
    -- 6. Check Invoice Items Columns/Values
    SELECT COUNT(*) INTO v_item_count FROM invoice_items WHERE invoice_id = p_invoice_id;
    v_log := v_log || 'Item Count: ' || v_item_count || E'\n';
    
    -- Try to sum values
    SELECT 
        COALESCE(SUM(COALESCE(taxable_amount, amount, 0)), 0),
        COALESCE(SUM(COALESCE(cgst_amount, 0)), 0)
    INTO v_total_taxable, v_grand_total
    FROM invoice_items 
    WHERE invoice_id = p_invoice_id;
    
    v_log := v_log || 'Sum from Items - Taxable: ' || v_total_taxable || ' CGST: ' || v_grand_total || E'\n';
    
    -- Check totals from header
    v_log := v_log || 'Header Totals - Total: ' || inv_rec.total_amount || ' Tax: ' || COALESCE(inv_rec.total_tax, 0) || E'\n';

    -- Attempt Post call
    BEGIN
        PERFORM public.post_sales_invoice_to_accounting(p_invoice_id);
        v_log := v_log || 'SUCCESS: post_sales_invoice_to_accounting call completed without error.\n';
    EXCEPTION WHEN OTHERS THEN
        v_log := v_log || 'ERROR calling post function: ' || SQLERRM || E'\n';
    END;

    RETURN v_log;
END;
$$;
