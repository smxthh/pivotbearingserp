-- Backfill script to post all existing confirmed sales invoices to ledger
DO $$
DECLARE
    r RECORD;
    v_count integer := 0;
BEGIN
    FOR r IN SELECT id, invoice_number FROM invoices WHERE status = 'confirmed' LOOP
        -- Attempt to post if not already posted
        IF NOT EXISTS (SELECT 1 FROM ledger_entries WHERE transaction_id = r.id) THEN
            PERFORM public.post_sales_invoice_to_accounting(r.id);
            RAISE NOTICE 'Backfilled sales invoice %', r.invoice_number;
            v_count := v_count + 1;
        END IF;
    END LOOP;
    
    RAISE NOTICE 'Backfill complete. Posted % invoices.', v_count;
END;
$$;
