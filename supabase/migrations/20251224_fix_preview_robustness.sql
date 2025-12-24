-- Migration: Robust Preview Next Document Number
-- Uses MAX(inv_number) from actual vouchers table as a fallback for the upper bound of the scan
-- This prevents issues where voucher_number_sequences lags behind the actual inserted vouchers.

CREATE OR REPLACE FUNCTION public.preview_next_document_number(
    p_distributor_id UUID,
    p_voucher_name TEXT,
    p_prefix TEXT DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    v_prefix_record RECORD;
    v_last_number INTEGER;
    v_start_number INTEGER;
    v_next_number INTEGER;
    v_max_inv INTEGER;
    v_scan_limit INTEGER;
    v_fy VARCHAR(10);
    v_formatted_number TEXT;
    v_year_part TEXT;
BEGIN
    -- Get FY
    v_fy := get_current_financial_year();
    
    -- Get Prefix Config
    IF p_prefix IS NOT NULL THEN
        SELECT * INTO v_prefix_record FROM public.voucher_prefixes
        WHERE distributor_id = p_distributor_id 
          AND voucher_name = p_voucher_name 
          AND CONCAT(voucher_prefix, prefix_separator) = p_prefix
          AND is_active = true
        LIMIT 1;
    ELSE
        SELECT * INTO v_prefix_record FROM public.voucher_prefixes
        WHERE distributor_id = p_distributor_id 
          AND voucher_name = p_voucher_name 
          AND is_default = true
          AND is_active = true
        LIMIT 1;
    END IF;

    IF v_prefix_record IS NULL THEN
        RETURN NULL; -- Graceful fallback
    END IF;

    -- Get Current Sequence Last Number
    SELECT last_number INTO v_last_number
    FROM public.voucher_number_sequences
    WHERE prefix_id = v_prefix_record.id
      AND financial_year = v_fy;
      
    v_last_number := COALESCE(v_last_number, 0);
    v_start_number := COALESCE(v_prefix_record.auto_start_no, 1);

    -- Format Year Logic (needed for checking existence)
    CASE v_prefix_record.year_format
        WHEN 'yy-yy' THEN v_year_part := v_fy;
        WHEN 'yy' THEN v_year_part := SPLIT_PART(v_fy, '-', 1);
        WHEN 'yyyy' THEN v_year_part := '20' || SPLIT_PART(v_fy, '-', 1) || '-20' || SPLIT_PART(v_fy, '-', 2);
        WHEN 'none' THEN v_year_part := '';
        ELSE v_year_part := v_fy;
    END CASE;

    -- DETERMINE SCAN LIMIT
    -- We want to scan at least up to the known sequence.
    -- But if sequence is stale, we check the actual table max.
    -- We assume the voucher_number pattern follows the prefix.
    -- Optimization: We only check for numbers that "Look like" this prefix.
    
    SELECT COALESCE(MAX(inv_number::INTEGER), 0) INTO v_max_inv
    FROM vouchers
    WHERE distributor_id = p_distributor_id
      AND voucher_number LIKE (v_prefix_record.voucher_prefix || v_prefix_record.prefix_separator || '%')
      AND inv_number ~ '^\d+$'; -- Ensure it's numeric
    
    -- The upper bound for the scan is the maximum of (sequence, actual usage) + 1 (to check the next free one)
    v_scan_limit := GREATEST(v_last_number, v_max_inv) + 1;
    
    -- Sanity check: if scan limit is crazy high vs start, warn or cap? 
    -- For now, we trust it. Unlikely to have 1 million invoices suddenly.

    -- Smart Scan with Corrected Limit
    SELECT t.n INTO v_next_number
    FROM generate_series(v_start_number, v_scan_limit) AS t(n)
    WHERE NOT EXISTS (
        SELECT 1 FROM public.vouchers v
        WHERE v.voucher_number = (
            CASE 
                WHEN v_year_part = '' THEN 
                    v_prefix_record.voucher_prefix || v_prefix_record.prefix_separator || t.n::TEXT
                ELSE 
                    v_prefix_record.voucher_prefix || v_prefix_record.prefix_separator || v_year_part || v_prefix_record.prefix_separator || t.n::TEXT
            END
        )
        AND v.distributor_id = p_distributor_id
    )
    ORDER BY t.n ASC
    LIMIT 1;

    -- Fallback
    IF v_next_number IS NULL THEN
        v_next_number := v_scan_limit; 
        -- If even scan_limit is taken (unlikely due to NOT EXISTS logic covering it), bump one more?
        -- The loop checks availability. passing v_scan_limit where v_scan_limit was max+1 means max+1 is checked.
        -- If max+1 is free, it returns it.
        -- If max+1 matches v_max_inv (impossible, max_inv is max), then...
        -- Wait, if generate_series goes to v_scan_limit, and v_scan_limit is free, it returns it.
        -- If v_next_number IS NULL, it means *every* number from start to scan_limit is taken.
        -- In that case, the next free is scan_limit + 1.
        v_next_number := v_scan_limit + 1;
    END IF;
    
    -- Format Final Number
    IF v_year_part = '' THEN
        v_formatted_number := v_prefix_record.voucher_prefix || v_prefix_record.prefix_separator || v_next_number::TEXT;
    ELSE
        v_formatted_number := v_prefix_record.voucher_prefix || v_prefix_record.prefix_separator || v_year_part || v_prefix_record.prefix_separator || v_next_number::TEXT;
    END IF;

    RETURN v_formatted_number;
END;
$function$;
