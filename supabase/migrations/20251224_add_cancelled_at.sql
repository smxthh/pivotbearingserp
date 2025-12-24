-- Migration: Add cancelled_at column and update cancellation logic
-- Purpose: To store the exact timestamp of cancellation for audit purposes.

-- 1. Add cancelled_at column to vouchers table
ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP WITH TIME ZONE;

-- 2. Update cancel_voucher RPC to set cancelled_at
CREATE OR REPLACE FUNCTION public.cancel_voucher(
    p_voucher_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    v_voucher RECORD;
    v_new_voucher_number TEXT;
    v_timestamp TEXT;
    v_result JSONB;
BEGIN
    -- Fetch existing voucher
    SELECT * INTO v_voucher FROM vouchers WHERE id = p_voucher_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Voucher not found';
    END IF;
    
    IF v_voucher.status = 'cancelled' THEN
        RAISE NOTICE 'Voucher is already cancelled';
        RETURN jsonb_build_object('id', p_voucher_id, 'status', 'cancelled');
    END IF;
    
    -- Generate timestamp for uniqueness
    v_timestamp := to_char(now(), 'YYYYMMDDHH24MISS');
    
    -- New voucher number format: OLD_NO_CANCELLED_TIMESTAMP
    v_new_voucher_number := v_voucher.voucher_number || '_CANCELLED_' || v_timestamp;
    
    -- Delete ledger transactions
    DELETE FROM ledger_transactions WHERE voucher_id = p_voucher_id;
    
    -- Update voucher: rename number, clear inv_number, set status AND cancelled_at
    -- We clear inv_number to NULL (or modify it if not nullable) so the number constraint is freed
    UPDATE vouchers 
    SET 
        voucher_number = v_new_voucher_number,
        inv_number = NULL, -- IMPORTANT: Free up the sequence number
        status = 'cancelled',
        cancelled_at = now(), -- Set cancellation timestamp
        updated_at = now()
    WHERE id = p_voucher_id
    RETURNING id, voucher_number, status, cancelled_at INTO v_voucher.id, v_new_voucher_number, v_voucher.status, v_voucher.cancelled_at;
    
    v_result := jsonb_build_object(
        'id', v_voucher.id,
        'voucher_number', v_new_voucher_number,
        'status', 'cancelled',
        'cancelled_at', v_voucher.cancelled_at
    );
    
    RETURN v_result;
EXCEPTION WHEN others THEN
    RAISE;
END;
$function$;
