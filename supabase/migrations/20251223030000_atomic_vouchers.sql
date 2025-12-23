-- Atomic Voucher Creation RPC
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
BEGIN
    v_distributor_id := (p_voucher->>'distributor_id')::UUID;
    v_voucher_number := p_voucher->>'voucher_number';

    -- Insert Voucher Header
    INSERT INTO vouchers (
        distributor_id,
        voucher_type,
        voucher_number,
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
        gst_type
    ) VALUES (
        v_distributor_id,
        (p_voucher->>'voucher_type')::voucher_type,
        v_voucher_number,
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
        COALESCE((p_voucher->>'gst_type')::TEXT, '')
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

-- Atomic Purchase Order Creation RPC
CREATE OR REPLACE FUNCTION public.create_purchase_order_atomic(
    p_header JSONB,
    p_items JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    v_po_id UUID;
    v_po_number INTEGER;
    v_po_full_number TEXT;
    v_item JSONB;
    v_result JSONB;
    v_distributor_id UUID;
BEGIN
    v_distributor_id := (p_header->>'distributor_id')::UUID;
    v_po_number := (p_header->>'po_number')::INTEGER;
    v_po_full_number := p_header->>'po_full_number';

    -- Insert PO Header
    INSERT INTO purchase_orders (
        distributor_id,
        po_prefix,
        po_number,
        po_full_number,
        po_date,
        party_id,
        party_gstin,
        transport_name,
        contact_person,
        contact_number,
        delivery_address,
        gst_type,
        remark,
        taxable_amount,
        cgst_amount,
        sgst_amount,
        igst_amount,
        round_off_amount,
        net_amount,
        status,
        created_by
    ) VALUES (
        v_distributor_id,
        p_header->>'po_prefix',
        v_po_number,
        v_po_full_number,
        (p_header->>'po_date')::DATE,
        (p_header->>'party_id')::UUID,
        p_header->>'party_gstin',
        p_header->>'transport_name',
        p_header->>'contact_person',
        p_header->>'contact_number',
        p_header->>'delivery_address',
        COALESCE((p_header->>'gst_type')::INTEGER, 1),
        p_header->>'remark',
        COALESCE((p_header->>'taxable_amount')::NUMERIC, 0),
        COALESCE((p_header->>'cgst_amount')::NUMERIC, 0),
        COALESCE((p_header->>'sgst_amount')::NUMERIC, 0),
        COALESCE((p_header->>'igst_amount')::NUMERIC, 0),
        COALESCE((p_header->>'round_off_amount')::NUMERIC, 0),
        COALESCE((p_header->>'net_amount')::NUMERIC, 0),
        'pending',
        (p_header->>'created_by')::UUID
    )
    RETURNING id INTO v_po_id;

    -- Insert PO Items
    IF jsonb_array_length(p_items) > 0 THEN
        FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
        LOOP
            INSERT INTO purchase_order_items (
                purchase_order_id,
                item_id,
                item_name,
                hsn_code,
                quantity,
                unit,
                price,
                discount_percent,
                discount_amount,
                gst_percent,
                cgst_percent,
                sgst_percent,
                igst_percent,
                cgst_amount,
                sgst_amount,
                igst_amount,
                taxable_amount,
                net_amount,
                remark,
                sort_order
            ) VALUES (
                v_po_id,
                (v_item->>'item_id')::UUID,
                v_item->>'item_name',
                v_item->>'hsn_code',
                COALESCE((v_item->>'quantity')::NUMERIC, 0),
                v_item->>'unit',
                COALESCE((v_item->>'price')::NUMERIC, 0),
                COALESCE((v_item->>'discount_percent')::NUMERIC, 0),
                COALESCE((v_item->>'discount_amount')::NUMERIC, 0),
                COALESCE((v_item->>'gst_percent')::NUMERIC, 0),
                COALESCE((v_item->>'cgst_percent')::NUMERIC, 0),
                COALESCE((v_item->>'sgst_percent')::NUMERIC, 0),
                COALESCE((v_item->>'igst_percent')::NUMERIC, 0),
                COALESCE((v_item->>'cgst_amount')::NUMERIC, 0),
                COALESCE((v_item->>'sgst_amount')::NUMERIC, 0),
                COALESCE((v_item->>'igst_amount')::NUMERIC, 0),
                COALESCE((v_item->>'taxable_amount')::NUMERIC, 0),
                COALESCE((v_item->>'net_amount')::NUMERIC, 0),
                v_item->>'remark',
                COALESCE((v_item->>'sort_order')::INTEGER, 0)
            );
        END LOOP;
    END IF;

    v_result := jsonb_build_object(
        'id', v_po_id,
        'po_full_number', v_po_full_number
    );

    RETURN v_result;
END;
$function$;
