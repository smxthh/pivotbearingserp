-- ============================================================================
-- AUTOMATIC LEDGER POSTING TRIGGERS FOR INVOICES TABLE
-- Handles sales invoices (tax_invoice, credit_note, etc.)
-- ============================================================================

-- ========================================================================
-- TRIGGER FUNCTION: Auto-post invoices to accounting on confirm
-- ========================================================================

CREATE OR REPLACE FUNCTION public.auto_post_invoice_to_accounting()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_already_posted boolean;
BEGIN
    -- Only process if status is 'confirmed'
    IF NEW.status != 'confirmed' THEN
        RETURN NEW;
    END IF;
    
    -- Check if already posted (prevent duplicate posting)
    SELECT EXISTS (
        SELECT 1 FROM ledger_entries WHERE transaction_id = NEW.id
    ) INTO v_already_posted;
    
    IF v_already_posted THEN
        RETURN NEW;
    END IF;
    
    -- Auto-post sales invoice to accounting
    BEGIN
        PERFORM public.post_sales_invoice_to_accounting(NEW.id);
        RAISE NOTICE 'Auto-posted sales invoice % to ledger', NEW.invoice_number;
    EXCEPTION
        WHEN OTHERS THEN
            -- Log error but don't block invoice creation
            RAISE WARNING 'Failed to auto-post invoice % to ledger: %', NEW.invoice_number, SQLERRM;
    END;
    
    RETURN NEW;
END;
$$;

-- ========================================================================
-- TRIGGER FUNCTION: Auto-reverse invoices from accounting on cancel
-- ========================================================================

CREATE OR REPLACE FUNCTION public.auto_reverse_invoice_from_accounting()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    entry_rec RECORD;
BEGIN
    -- Only process if status changed from confirmed to cancelled
    IF OLD.status = 'confirmed' AND NEW.status = 'cancelled' THEN
        BEGIN
            -- First, reverse the balances in ledgers
            FOR entry_rec IN 
                SELECT ledger_id, SUM(debit - credit) as net_change
                FROM ledger_entries 
                WHERE transaction_id = NEW.id
                GROUP BY ledger_id
            LOOP
                UPDATE ledgers 
                SET current_balance = current_balance - entry_rec.net_change,
                    updated_at = now()
                WHERE id = entry_rec.ledger_id;
            END LOOP;
            
            -- Then delete the entries
            DELETE FROM ledger_entries WHERE transaction_id = NEW.id;
            
            RAISE NOTICE 'Auto-reversed sales invoice % from ledger', NEW.invoice_number;
        EXCEPTION
            WHEN OTHERS THEN
                RAISE WARNING 'Failed to reverse invoice % from ledger: %', NEW.invoice_number, SQLERRM;
        END;
    END IF;
    
    RETURN NEW;
END;
$$;

-- ========================================================================
-- CREATE TRIGGERS ON INVOICES TABLE
-- ========================================================================

-- Trigger for auto-posting on INSERT (when created as confirmed)
DROP TRIGGER IF EXISTS trigger_auto_post_invoice_on_insert ON public.invoices;
CREATE TRIGGER trigger_auto_post_invoice_on_insert
    AFTER INSERT ON public.invoices
    FOR EACH ROW
    WHEN (NEW.status = 'confirmed')
    EXECUTE FUNCTION public.auto_post_invoice_to_accounting();

-- Trigger for auto-posting on UPDATE (when status changes to confirmed)
DROP TRIGGER IF EXISTS trigger_auto_post_invoice_on_update ON public.invoices;
CREATE TRIGGER trigger_auto_post_invoice_on_update
    AFTER UPDATE ON public.invoices
    FOR EACH ROW
    WHEN (OLD.status != 'confirmed' AND NEW.status = 'confirmed')
    EXECUTE FUNCTION public.auto_post_invoice_to_accounting();

-- Trigger for auto-reversing on UPDATE (when status changes to cancelled)
DROP TRIGGER IF EXISTS trigger_auto_reverse_invoice_on_cancel ON public.invoices;
CREATE TRIGGER trigger_auto_reverse_invoice_on_cancel
    AFTER UPDATE ON public.invoices
    FOR EACH ROW
    WHEN (OLD.status = 'confirmed' AND NEW.status = 'cancelled')
    EXECUTE FUNCTION public.auto_reverse_invoice_from_accounting();

-- ========================================================================
-- DONE!
-- ========================================================================

-- Now BOTH invoices (sales) and vouchers (purchase) will automatically:
-- 1. Post to ledger when confirmed
-- 2. Reverse from ledger when cancelled
