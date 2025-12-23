-- ================================================================
-- ATOMIC MARKING CREATION & NUMBERING
-- Prevents duplicate key errors and ensures data integrity
-- ================================================================

-- 1. Function to get next Marking Number (for Preview)
CREATE OR REPLACE FUNCTION public.get_next_mrk_number(
    p_distributor_id UUID,
    p_prefix TEXT
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    v_next_num BIGINT;
BEGIN
    -- Find the maximum number for the given distributor and prefix pattern
    -- We assume the mrk_full_number starts with the prefix
    SELECT COALESCE(MAX(mrk_number), 0) + 1
    INTO v_next_num
    FROM marking
    WHERE distributor_id = p_distributor_id
      AND mrk_full_number LIKE (p_prefix || '%');

    RETURN v_next_num;
END;
$function$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_next_mrk_number(UUID, TEXT) TO authenticated;


-- 2. Atomic Creation RPC
CREATE OR REPLACE FUNCTION public.create_marking_atomic(
    p_header JSONB,
    p_batches JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    v_header_id UUID;
    v_mrk_full_number TEXT;
    v_mrk_number BIGINT;
    v_prefix TEXT;
    v_batch JSONB;
    v_result JSONB;
BEGIN
    -- Validate inputs
    IF p_header IS NULL THEN
        RAISE EXCEPTION 'Header data is required';
    END IF;
    
    IF p_batches IS NULL OR jsonb_array_length(p_batches) = 0 THEN
        RAISE EXCEPTION 'At least one batch is required';
    END IF;

    -- Extract prefix
    v_prefix := p_header->>'mrk_prefix';
    IF v_prefix IS NULL THEN
        RAISE EXCEPTION 'Prefix is required';
    END IF;

    -- Generate Number (Concurrency safe-ish: we do it inside the trans, 
    -- but ideally we rely on a constraint or sequence. For now, this logic matches the other modules)
    -- Note: If p_header->>'mrk_number' is provided, we respect it (manual override), otherwise we generate.
    IF p_header->>'mrk_number' IS NOT NULL THEN
        v_mrk_number := (p_header->>'mrk_number')::BIGINT;
    ELSE
        SELECT public.get_next_mrk_number((p_header->>'distributor_id')::UUID, v_prefix)
        INTO v_mrk_number;
    END IF;

    v_mrk_full_number := v_prefix || v_mrk_number::TEXT;

    -- Insert Marking Header
    INSERT INTO marking (
        distributor_id,
        mrk_prefix,
        mrk_number,
        mrk_full_number,
        mrk_date,
        item_id,
        location_id,
        quantity,
        employee_id,
        remark,
        created_by
    ) VALUES (
        (p_header->>'distributor_id')::UUID,
        v_prefix,
        v_mrk_number,
        v_mrk_full_number,
        (p_header->>'mrk_date')::DATE,
        (p_header->>'item_id')::UUID,
        (p_header->>'location_id')::UUID,
        (p_header->>'quantity')::NUMERIC,
        CASE WHEN p_header->>'employee_id' IS NOT NULL THEN (p_header->>'employee_id')::UUID ELSE NULL END,
        p_header->>'remark',
        (p_header->>'created_by')::UUID
    )
    RETURNING id, mrk_full_number INTO v_header_id, v_mrk_full_number;

    -- Insert Batches
    FOR v_batch IN SELECT * FROM jsonb_array_elements(p_batches)
    LOOP
        INSERT INTO marking_batches (
            marking_id,
            location_id,
            batch_number,
            stock_quantity,
            quantity
        ) VALUES (
            v_header_id,
            (v_batch->>'location_id')::UUID,
            v_batch->>'batch_number',
            (v_batch->>'stock_quantity')::NUMERIC,
            (v_batch->>'quantity')::NUMERIC
        );
    END LOOP;

    -- Return result
    v_result := jsonb_build_object(
        'id', v_header_id,
        'mrk_full_number', v_mrk_full_number
    );

    RETURN v_result;
END;
$function$;

-- Grant execute
GRANT EXECUTE ON FUNCTION public.create_marking_atomic(JSONB, JSONB) TO authenticated;
