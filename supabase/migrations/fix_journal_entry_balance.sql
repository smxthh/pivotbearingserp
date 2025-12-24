-- FIX: Ensure record_journal_entry updates closing_balance too
CREATE OR REPLACE FUNCTION public.record_journal_entry(
    p_transaction_id uuid,
    p_transaction_type text,
    p_entry_date date,
    p_description text,
    p_entries jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_tenant_id uuid;
    v_total_debit numeric := 0;
    v_total_credit numeric := 0;
    v_entry jsonb;
    v_ledger_id uuid;
    v_debit numeric;
    v_credit numeric;
    v_is_locked boolean;
BEGIN
    -- 0. Get Tenant ID (Securely from auth)
    v_tenant_id := public.get_user_tenant_id();
    IF v_tenant_id IS NULL THEN
        -- Fallback for triggers where auth.uid() might be null or different context
        -- Try to get tenant from ledgers if possible, or fail gracefully?
        -- For robust design, let's assume if tenant_id is passed in entries we might use it or trust the caller?
        -- But for now let's error if strictly auth based.
        
        -- Bypass for triggers running as postgres or system
        -- Just proceed? No, RLS needs it.
        RAISE EXCEPTION 'Unauthorized: No tenant found';
    END IF;

    -- 1. Check Fiscal Year Locking
    SELECT is_locked INTO v_is_locked 
    FROM financial_years 
    WHERE tenant_id = v_tenant_id 
    AND p_entry_date BETWEEN start_date AND end_date
    LIMIT 1;

    IF v_is_locked THEN
        RAISE EXCEPTION 'Financial Year is locked for this date';
    END IF;

    -- 2. Validate Balance (Dr == Cr)
    FOR v_entry IN SELECT * FROM jsonb_array_elements(p_entries)
    LOOP
        v_total_debit := v_total_debit + COALESCE((v_entry->>'debit')::numeric, 0);
        v_total_credit := v_total_credit + COALESCE((v_entry->>'credit')::numeric, 0);
    END LOOP;

    IF v_total_debit != v_total_credit THEN
        -- Allow small rounding diff?
        IF ABS(v_total_debit - v_total_credit) > 0.05 THEN
             RAISE EXCEPTION 'Journal Entry mismatch: Debit % != Credit %', v_total_debit, v_total_credit;
        END IF;
    END IF;

    -- 3. Insert Entries & Update Balances
    FOR v_entry IN SELECT * FROM jsonb_array_elements(p_entries)
    LOOP
        v_ledger_id := (v_entry->>'ledger_id')::uuid;
        v_debit := COALESCE((v_entry->>'debit')::numeric, 0);
        v_credit := COALESCE((v_entry->>'credit')::numeric, 0);

        INSERT INTO ledger_entries (
            tenant_id,
            transaction_id,
            transaction_type,
            ledger_id,
            debit,
            credit,
            entry_date,
            description,
            created_by
        ) VALUES (
            v_tenant_id,
            p_transaction_id,
            p_transaction_type,
            v_ledger_id,
            v_debit,
            v_credit,
            p_entry_date,
            p_description,
            auth.uid()
        );
        
        -- Update Ledger Current Balance Cache & Closing Balance
        -- Balance = Balance + Debit - Credit. 
        -- Positive means Debit Balance. Negative means Credit Balance.
        UPDATE ledgers 
        SET current_balance = COALESCE(current_balance, 0) + v_debit - v_credit,
            closing_balance = COALESCE(closing_balance, 0) + v_debit - v_credit,
            updated_at = now()
        WHERE id = v_ledger_id;

    END LOOP;

END;
$$;

-- Also run a one-time sync of closing_balance from current_balance
UPDATE public.ledgers 
SET closing_balance = current_balance
WHERE closing_balance = 0 AND current_balance != 0;
