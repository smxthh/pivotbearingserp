-- Migration: Smart sequence preview that finds gaps
-- This updates preview_next_document_number to scan from the start number
-- instead of just last_number + 1, effectively allowing reuse of cancelled numbers.

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
    v_fy VARCHAR(10);
    v_formatted_number TEXT;
    v_year_part TEXT;
    v_limit INTEGER := 5000; -- Look ahead limit to prevent performance issues
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

    -- Get Current Sequence Last Number to define upper bound of search
    SELECT last_number INTO v_last_number
    FROM public.voucher_number_sequences
    WHERE prefix_id = v_prefix_record.id
      AND financial_year = v_fy;
      
    v_last_number := COALESCE(v_last_number, 0);
    v_start_number := COALESCE(v_prefix_record.auto_start_no, 1);

    -- Format Year Logic
    CASE v_prefix_record.year_format
        WHEN 'yy-yy' THEN v_year_part := v_fy;
        WHEN 'yy' THEN v_year_part := SPLIT_PART(v_fy, '-', 1);
        WHEN 'yyyy' THEN v_year_part := '20' || SPLIT_PART(v_fy, '-', 1) || '-20' || SPLIT_PART(v_fy, '-', 2);
        WHEN 'none' THEN v_year_part := '';
        ELSE v_year_part := v_fy;
    END CASE;

    -- Smart Scan: Find the first missing number starting from start_number
    -- We scan up to last_number + 1. If all are taken, the result will be last_number + 1.
    -- This efficiently finds gaps (like cancelled invoice #1).
    -- Using recursive CTE or generate_series for gap detection.
    
    SELECT t.n INTO v_next_number
    FROM generate_series(v_start_number, v_last_number + 1) AS t(n)
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
        AND v.distributor_id = p_distributor_id -- Scope check
        -- Note: We check global voucher_number uniqueness for this distributor
    )
    ORDER BY t.n ASC
    LIMIT 1;

    -- Fallback/Safety: If for some reason query returns null (shouldn't if range goes to +1), default to last+1
    IF v_next_number IS NULL THEN
        v_next_number := v_last_number + 1;
        IF v_next_number < v_start_number THEN
            v_next_number := v_start_number;
        END IF;
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
