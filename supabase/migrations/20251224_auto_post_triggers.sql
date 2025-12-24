-- ============================================================================
-- AUTOMATIC LEDGER POSTING TRIGGERS
-- Creates triggers to automatically post vouchers to accounting ledger
-- ============================================================================

-- ========================================================================
-- TRIGGER FUNCTION: Auto-post vouchers to accounting on confirm
-- ========================================================================

CREATE OR REPLACE FUNCTION public.auto_post_voucher_to_accounting()
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
    
    -- Auto-post based on voucher type
    BEGIN
        IF NEW.voucher_type = 'purchase_invoice' THEN
            PERFORM public.post_purchase_voucher_accounting(NEW.id);
            RAISE NOTICE 'Auto-posted purchase invoice % to ledger', NEW.voucher_number;
            
        ELSIF NEW.voucher_type = 'tax_invoice' THEN
            PERFORM public.post_sales_invoice_to_accounting(NEW.id);
            RAISE NOTICE 'Auto-posted sales invoice % to ledger', NEW.voucher_number;
            
        -- Add more voucher types as needed
        -- ELSIF NEW.voucher_type = 'receipt_voucher' THEN
        --     PERFORM public.post_receipt_to_accounting(NEW.id);
        -- ELSIF NEW.voucher_type = 'payment_voucher' THEN
        --     PERFORM public.post_payment_to_accounting(NEW.id);
        END IF;
    EXCEPTION
        WHEN OTHERS THEN
            -- Log error but don't block voucher creation
            RAISE WARNING 'Failed to auto-post voucher % to ledger: %', NEW.voucher_number, SQLERRM;
    END;
    
    RETURN NEW;
END;
$$;

-- ========================================================================
-- TRIGGER FUNCTION: Auto-reverse vouchers from accounting on cancel
-- ========================================================================

CREATE OR REPLACE FUNCTION public.auto_reverse_voucher_from_accounting()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Only process if status changed from confirmed to cancelled
    IF OLD.status = 'confirmed' AND NEW.status = 'cancelled' THEN
        BEGIN
            -- Delete all ledger entries for this voucher
            DELETE FROM ledger_entries WHERE transaction_id = NEW.id;
            
            -- Update ledger balances by recalculating from remaining entries
            -- The record_journal_entry function updates balances, so we need to manually reverse
            UPDATE ledgers l
            SET current_balance = current_balance - COALESCE(
                (SELECT SUM(debit - credit) FROM ledger_entries WHERE ledger_id = l.id AND transaction_id = NEW.id), 
                0
            )
            WHERE id IN (
                SELECT DISTINCT ledger_id FROM ledger_entries WHERE transaction_id = NEW.id
            );
            
            RAISE NOTICE 'Auto-reversed voucher % from ledger', NEW.voucher_number;
        EXCEPTION
            WHEN OTHERS THEN
                RAISE WARNING 'Failed to reverse voucher % from ledger: %', NEW.voucher_number, SQLERRM;
        END;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Note: The reverse function above has a bug - it tries to update after delete.
-- Let me fix it:

CREATE OR REPLACE FUNCTION public.auto_reverse_voucher_from_accounting()
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
            
            RAISE NOTICE 'Auto-reversed voucher % from ledger', NEW.voucher_number;
        EXCEPTION
            WHEN OTHERS THEN
                RAISE WARNING 'Failed to reverse voucher % from ledger: %', NEW.voucher_number, SQLERRM;
        END;
    END IF;
    
    RETURN NEW;
END;
$$;

-- ========================================================================
-- CREATE TRIGGERS ON VOUCHERS TABLE
-- ========================================================================

-- Trigger for auto-posting on INSERT (when created as confirmed)
DROP TRIGGER IF EXISTS trigger_auto_post_voucher_on_insert ON public.vouchers;
CREATE TRIGGER trigger_auto_post_voucher_on_insert
    AFTER INSERT ON public.vouchers
    FOR EACH ROW
    WHEN (NEW.status = 'confirmed')
    EXECUTE FUNCTION public.auto_post_voucher_to_accounting();

-- Trigger for auto-posting on UPDATE (when status changes to confirmed)
DROP TRIGGER IF EXISTS trigger_auto_post_voucher_on_update ON public.vouchers;
CREATE TRIGGER trigger_auto_post_voucher_on_update
    AFTER UPDATE ON public.vouchers
    FOR EACH ROW
    WHEN (OLD.status != 'confirmed' AND NEW.status = 'confirmed')
    EXECUTE FUNCTION public.auto_post_voucher_to_accounting();

-- Trigger for auto-reversing on UPDATE (when status changes to cancelled)
DROP TRIGGER IF EXISTS trigger_auto_reverse_voucher_on_cancel ON public.vouchers;
CREATE TRIGGER trigger_auto_reverse_voucher_on_cancel
    AFTER UPDATE ON public.vouchers
    FOR EACH ROW
    WHEN (OLD.status = 'confirmed' AND NEW.status = 'cancelled')
    EXECUTE FUNCTION public.auto_reverse_voucher_from_accounting();

-- ========================================================================
-- DONE!
-- ========================================================================

-- Now vouchers will automatically:
-- 1. Post to ledger when confirmed
-- 2. Reverse from ledger when cancelled
-- No manual "Post to Ledger" button needed!
