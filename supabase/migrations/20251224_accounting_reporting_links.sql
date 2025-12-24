-- ==============================================================================
-- ACCOUNTING PHASE 3: REPORTING LINKAGE
-- Created: 2025-12-24
-- Purpose: Links ledger_entries to vouchers for reporting and joins
-- ==============================================================================

-- 1. ADD FOREIGN KEY TO LEDGER_ENTRIES
-- We assume transaction_id points to vouchers.id for now.
-- If we support other transaction sources later, we might need a polymorphic design or separate join tables.
-- But for the core ERP, everything is a Voucher.

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_ledger_entries_transaction_voucher'
    ) THEN
        ALTER TABLE public.ledger_entries
        ADD CONSTRAINT fk_ledger_entries_transaction_voucher
        FOREIGN KEY (transaction_id) REFERENCES public.vouchers(id)
        ON DELETE CASCADE; -- If voucher is deleted, entries should go too (or restricted)
    END IF;
END $$;

-- 2. CREATE VIEW FOR EASIER API CONSUMPTION (Optional, keeping it simple in hook for now)
-- We'll just rely on the FK for the Supabase join.
