-- Migration: Allow Invoice Number Reuse
-- 1. Update create_voucher_atomic to accept and insert inv_number
-- 2. Create cancel_voucher RPC to handle atomic cancellation and renaming

-- Update create_voucher_atomic to include inv_number in INSERT
CREATE OR REPLACE FUNCTION public.create_voucher_atomic(
    p_voucher JSONB,
    p_items JSONB,
    p_ledgers JSONB DEFAULT '[]'::JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    v_voucher_id UUID;
    v_voucher_number TEXT;
    v_item JSONB;
    v_ledger JSONB;
    v_result JSONB;
    v_distributor_id UUID;
    v_inv_number TEXT;
BEGIN
    v_distributor_id := (p_voucher->>'distributor_id')::UUID;
    v_voucher_number := p_voucher->>'voucher_number';
    v_inv_number := p_voucher->>'inv_number'; -- Extract inv_number

    -- Insert Voucher Header
    INSERT INTO vouchers (
        distributor_id,
        voucher_type,
        voucher_number,
        inv_number, -- Added field
        voucher_date,
        party_id,
        party_name,
        reference_number,
        reference_voucher_id,
        narration,
        customer_po_number,
        customer_po_date,
        delivery_date,
        transport_name,
        lr_number,
        ship_to,
        po_number,
        subtotal,
        discount_percent,
        discount_amount,
        taxable_amount,
        cgst_amount,
        sgst_amount,
        igst_amount,
        cess_amount,
        total_tax,
        round_off,
        total_amount,
        tds_percent,
        tds_amount,
        tcs_percent,
        tcs_amount,
        status,
        created_by,
        apply_round_off,
        gst_type,
        inv_prefix -- Ensure prefix is passed if available
    ) VALUES (
        v_distributor_id,
        (p_voucher->>'voucher_type')::voucher_type,
        v_voucher_number,
        v_inv_number, -- Insert inv_number
        (p_voucher->>'voucher_date')::DATE,
        (p_voucher->>'party_id')::UUID,
        p_voucher->>'party_name',
        p_voucher->>'reference_number',
        (p_voucher->>'reference_voucher_id')::UUID,
        p_voucher->>'narration',
        p_voucher->>'customer_po_number',
        (p_voucher->>'customer_po_date')::DATE,
        (p_voucher->>'delivery_date')::DATE,
        p_voucher->>'transport_name',
        p_voucher->>'lr_number',
        p_voucher->>'ship_to',
        p_voucher->>'po_number',
        COALESCE((p_voucher->>'subtotal')::NUMERIC, 0),
        COALESCE((p_voucher->>'discount_percent')::NUMERIC, 0),
        COALESCE((p_voucher->>'discount_amount')::NUMERIC, 0),
        COALESCE((p_voucher->>'taxable_amount')::NUMERIC, 0),
        COALESCE((p_voucher->>'cgst_amount')::NUMERIC, 0),
        COALESCE((p_voucher->>'sgst_amount')::NUMERIC, 0),
        COALESCE((p_voucher->>'igst_amount')::NUMERIC, 0),
        COALESCE((p_voucher->>'cess_amount')::NUMERIC, 0),
        COALESCE((p_voucher->>'total_tax')::NUMERIC, 0),
        COALESCE((p_voucher->>'round_off')::NUMERIC, 0),
        COALESCE((p_voucher->>'total_amount')::NUMERIC, 0),
        COALESCE((p_voucher->>'tds_percent')::NUMERIC, 0),
        COALESCE((p_voucher->>'tds_amount')::NUMERIC, 0),
        COALESCE((p_voucher->>'tcs_percent')::NUMERIC, 0),
        COALESCE((p_voucher->>'tcs_amount')::NUMERIC, 0),
        COALESCE(p_voucher->>'status', 'draft')::voucher_status,
        (p_voucher->>'created_by')::UUID,
        COALESCE((p_voucher->>'apply_round_off')::BOOLEAN, true),
        COALESCE((p_voucher->>'gst_type')::TEXT, ''),
        p_voucher->>'inv_prefix'
    )
    RETURNING id INTO v_voucher_id;

    -- Insert Voucher Items
    IF jsonb_array_length(p_items) > 0 THEN
        FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
        LOOP
            INSERT INTO voucher_items (
                voucher_id,
                item_id,
                item_name,
                item_sku,
                hsn_code,
                description,
                quantity,
                unit,
                rate,
                amount,
                discount_percent,
                discount_amount,
                taxable_amount,
                gst_percent,
                cgst_amount,
                sgst_amount,
                igst_amount,
                cess_percent,
                cess_amount,
                total_amount,
                line_order,
                remarks
            ) VALUES (
                v_voucher_id,
                (v_item->>'item_id')::UUID,
                v_item->>'item_name',
                v_item->>'item_sku',
                v_item->>'hsn_code',
                v_item->>'description',
                COALESCE((v_item->>'quantity')::NUMERIC, 0),
                v_item->>'unit',
                COALESCE((v_item->>'rate')::NUMERIC, 0),
                COALESCE((v_item->>'amount')::NUMERIC, 0),
                COALESCE((v_item->>'discount_percent')::NUMERIC, 0),
                COALESCE((v_item->>'discount_amount')::NUMERIC, 0),
                COALESCE((v_item->>'taxable_amount')::NUMERIC, 0),
                COALESCE((v_item->>'gst_percent')::NUMERIC, 0),
                COALESCE((v_item->>'cgst_amount')::NUMERIC, 0),
                COALESCE((v_item->>'sgst_amount')::NUMERIC, 0),
                COALESCE((v_item->>'igst_amount')::NUMERIC, 0),
                COALESCE((v_item->>'cess_percent')::NUMERIC, 0),
                COALESCE((v_item->>'cess_amount')::NUMERIC, 0),
                COALESCE((v_item->>'total_amount')::NUMERIC, 0),
                COALESCE((v_item->>'line_order')::INTEGER, 0),
                v_item->>'remarks'
            );
        END LOOP;
    END IF;

    -- Insert Ledger Transactions (if any)
    IF jsonb_array_length(p_ledgers) > 0 THEN
        FOR v_ledger IN SELECT * FROM jsonb_array_elements(p_ledgers)
        LOOP
            INSERT INTO ledger_transactions (
                distributor_id,
                voucher_id,
                ledger_id,
                transaction_date,
                debit_amount,
                credit_amount,
                narration
            ) VALUES (
                v_distributor_id,
                v_voucher_id,
                (v_ledger->>'ledger_id')::UUID,
                (p_voucher->>'voucher_date')::DATE,
                COALESCE((v_ledger->>'debit_amount')::NUMERIC, 0),
                COALESCE((v_ledger->>'credit_amount')::NUMERIC, 0),
                COALESCE(v_ledger->>'narration', p_voucher->>'narration')
            );
        END LOOP;
    END IF;

    v_result := jsonb_build_object(
        'id', v_voucher_id,
        'voucher_number', v_voucher_number
    );

    RETURN v_result;
END;
$function$;

-- Create cancel_voucher RPC
-- Renames voucher_number/inv_number to allow reuse and sets status to cancelled
-- Also deletes related ledger transactions
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
    
    -- Update voucher: rename number, clear inv_number, set status
    -- We clear inv_number to NULL (or modify it if not nullable) so the number constraint is freed
    UPDATE vouchers 
    SET 
        voucher_number = v_new_voucher_number,
        inv_number = NULL, -- IMPORTANT: Free up the sequence number
        status = 'cancelled',
        updated_at = now()
    WHERE id = p_voucher_id
    RETURNING id, voucher_number, status INTO v_voucher.id, v_new_voucher_number, v_voucher.status;
    
    v_result := jsonb_build_object(
        'id', v_voucher.id,
        'voucher_number', v_new_voucher_number,
        'status', 'cancelled'
    );
    
    RETURN v_result;
EXCEPTION WHEN others THEN
    RAISE;
END;
$function$;
