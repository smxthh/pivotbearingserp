-- ================================================================
-- ATOMIC GATE INWARD CREATION RPC
-- Single transaction to create header + items (prevents ghost entries)
-- ================================================================

CREATE OR REPLACE FUNCTION public.create_gate_inward_atomic(
    p_header JSONB,
    p_items JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    v_header_id UUID;
    v_gi_number TEXT;
    v_item JSONB;
    v_result JSONB;
BEGIN
    -- Validate inputs
    IF p_header IS NULL THEN
        RAISE EXCEPTION 'Header data is required';
    END IF;
    
    IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'At least one item is required';
    END IF;
    
    -- Insert header (trigger will generate gi_number)
    INSERT INTO gate_inwards (
        gi_number,
        gi_date,
        party_id,
        invoice_number,
        invoice_date,
        challan_number,
        challan_date,
        purchase_order_id,
        status,
        distributor_id
    ) VALUES (
        p_header->>'gi_number',
        (p_header->>'gi_date')::TIMESTAMPTZ,
        (p_header->>'party_id')::UUID,
        p_header->>'invoice_number',
        CASE WHEN p_header->>'invoice_date' IS NOT NULL AND p_header->>'invoice_date' <> '' 
             THEN (p_header->>'invoice_date')::DATE ELSE NULL END,
        p_header->>'challan_number',
        CASE WHEN p_header->>'challan_date' IS NOT NULL AND p_header->>'challan_date' <> '' 
             THEN (p_header->>'challan_date')::DATE ELSE NULL END,
        CASE WHEN p_header->>'purchase_order_id' IS NOT NULL AND p_header->>'purchase_order_id' <> '' 
             THEN (p_header->>'purchase_order_id')::UUID ELSE NULL END,
        COALESCE(p_header->>'status', 'pending'),
        (p_header->>'distributor_id')::UUID
    )
    RETURNING id, gi_number INTO v_header_id, v_gi_number;
    
    -- Insert all items
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        INSERT INTO gate_inward_items (
            gate_inward_id,
            item_id,
            location_id,
            batch_number,
            quantity,
            discount_percent,
            price,
            remark
        ) VALUES (
            v_header_id,
            (v_item->>'item_id')::UUID,
            CASE WHEN v_item->>'location_id' IS NOT NULL AND v_item->>'location_id' <> '' 
                 THEN (v_item->>'location_id')::UUID ELSE NULL END,
            v_item->>'batch_number',
            (v_item->>'quantity')::NUMERIC,
            COALESCE((v_item->>'discount_percent')::NUMERIC, 0),
            COALESCE((v_item->>'price')::NUMERIC, 0),
            v_item->>'remark'
        );
    END LOOP;
    
    -- Return the created header info
    v_result := jsonb_build_object(
        'id', v_header_id,
        'gi_number', v_gi_number,
        'items_count', jsonb_array_length(p_items)
    );
    
    RETURN v_result;
END;
$function$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.create_gate_inward_atomic(JSONB, JSONB) TO authenticated;
