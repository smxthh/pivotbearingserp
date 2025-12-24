-- ==============================================================================
-- ACCOUNTING PHASE 2: PAYMENT & RECEIPT INTEGRATION
-- Created: 2025-12-24
-- Purpose: Connects Payments table to Accounting Journal
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.post_payment_receipt_accounting(p_payment_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_tenant_id uuid;
    p_rec RECORD;
    v_bank_ledger_id uuid;
    v_cash_ledger_id uuid;
    v_party_ledger_id uuid;
    v_mode_ledger_id uuid;
    v_entries jsonb := '[]'::jsonb;
    v_transaction_type text;
    v_desc text;
BEGIN
    v_tenant_id := public.get_user_tenant_id();

    -- 1. Fetch Payment
    SELECT * INTO p_rec FROM payments WHERE id = p_payment_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Payment record not found'; END IF;

    -- Check if already posted
    IF EXISTS (SELECT 1 FROM ledger_entries WHERE transaction_id = p_payment_id) THEN
        RAISE EXCEPTION 'Accounting entries already exist for this payment';
    END IF;

    -- 2. Identify Type & Description
    -- Assuming payment_type is 'Received' (In) or 'Paid' (Out)
    IF p_rec.payment_type ILIKE 'Received' THEN
        v_transaction_type := 'RECEIPT';
        v_desc := 'Receipt from ' || (SELECT name FROM parties WHERE id = p_rec.party_id);
    ELSIF p_rec.payment_type ILIKE 'Paid' THEN
        v_transaction_type := 'PAYMENT';
        v_desc := 'Payment to ' || (SELECT name FROM parties WHERE id = p_rec.party_id);
    ELSE
        RAISE EXCEPTION 'Unknown payment type: %', p_rec.payment_type;
    END IF;

    -- 3. Identify Ledgers
    -- Party Ledger
    SELECT ledger_id INTO v_party_ledger_id FROM parties WHERE id = p_rec.party_id;
    IF v_party_ledger_id IS NULL THEN
        PERFORM public.create_ledger_for_party(p_rec.party_id);
        SELECT ledger_id INTO v_party_ledger_id FROM parties WHERE id = p_rec.party_id;
    END IF;
    IF v_party_ledger_id IS NULL THEN RAISE EXCEPTION 'Party ledger missing'; END IF;

    -- Money Ledger (Cash or Bank)
    IF p_rec.payment_mode ILIKE 'Cash' THEN
        v_mode_ledger_id := public.get_ledger_id_by_name(v_tenant_id, 'Cash');
        IF v_mode_ledger_id IS NULL THEN RAISE EXCEPTION 'Cash ledger not found'; END IF;
    ELSE
        -- Bank or Cheque or UPI
        IF p_rec.bank_name IS NOT NULL THEN
            v_mode_ledger_id := public.get_ledger_id_by_name(v_tenant_id, p_rec.bank_name);
        END IF;
        
        -- If specific bank ledger not found by name, try generic or fail
        IF v_mode_ledger_id IS NULL THEN
            -- Try 'Bank Accounts' group... but specific ledger needed.
            -- Fallback: Look for ANY ledger in 'Bank Accounts' group? Hazardous.
            -- Let's fail for now to force user to map bank name to ledger name.
            RAISE EXCEPTION 'Bank Ledger "%" not found. Please create a ledger with this exact name.', COALESCE(p_rec.bank_name, 'Unknown Bank');
        END IF;
    END IF;

    -- 4. Construct Entries
    IF v_transaction_type = 'RECEIPT' THEN
        -- Dr Cash/Bank, Cr Party
        v_entries := v_entries || jsonb_build_object('ledger_id', v_mode_ledger_id, 'debit', p_rec.amount, 'credit', 0);
        v_entries := v_entries || jsonb_build_object('ledger_id', v_party_ledger_id, 'debit', 0, 'credit', p_rec.amount);
    ELSE -- PAYMENT
        -- Dr Party, Cr Cash/Bank
        v_entries := v_entries || jsonb_build_object('ledger_id', v_party_ledger_id, 'debit', p_rec.amount, 'credit', 0);
        v_entries := v_entries || jsonb_build_object('ledger_id', v_mode_ledger_id, 'debit', 0, 'credit', p_rec.amount);
    END IF;

    -- 5. Post
    PERFORM public.record_journal_entry(
        p_payment_id,
        v_transaction_type,
        p_rec.payment_date,
        v_desc,
        v_entries
    );

END;
$$;
