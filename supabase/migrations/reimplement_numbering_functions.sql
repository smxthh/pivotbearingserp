-- ================================================================
-- REIMPLEMENTATION OF DOCUMENT NUMBERING (Atomic Trigger)
-- ================================================================

-- This function handles atomic invoice number generation on INSERT
-- It uses database sequences (voucher_number_sequences) with FOR UPDATE locking
-- to prevent race conditions.
CREATE OR REPLACE FUNCTION public.generate_inv_number_on_insert()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_next_number INTEGER;
    v_fy TEXT;
    v_prefix_record RECORD;
    v_year_part TEXT := '';
    v_candidate_voucher_number TEXT;
    v_exists BOOLEAN;
BEGIN
    -- Only generate if inv_number is NULL or empty
    IF NEW.inv_number IS NOT NULL AND NEW.inv_number <> '' THEN
        RETURN NEW;
    END IF;
    
    -- Get financial year
    v_fy := get_current_financial_year();
    
    -- Find matching prefix record
    -- Matches based on the prefix part of the incoming voucher_number (e.g. "INV/25-26/")
    SELECT * INTO v_prefix_record FROM voucher_prefixes 
    WHERE distributor_id = NEW.distributor_id
      AND is_active = true
      AND NEW.voucher_number LIKE CONCAT(voucher_prefix, prefix_separator, '%')
    ORDER BY is_default DESC
    LIMIT 1;
    
    IF v_prefix_record IS NULL THEN
        -- Fallback: find max and increment (legacy method / no prefix match)
        SELECT COALESCE(MAX(NULLIF(inv_number, '')::INTEGER), 0) + 1 INTO v_next_number
        FROM vouchers 
        WHERE voucher_type = NEW.voucher_type 
          AND distributor_id = NEW.distributor_id
          AND inv_number ~ '^\d+$';
        
        NEW.inv_number := COALESCE(v_next_number, 1)::TEXT;
        RETURN NEW;
    END IF;
    
    -- Build year part
    CASE v_prefix_record.year_format
        WHEN 'yy-yy' THEN v_year_part := v_fy;
        WHEN 'yy' THEN v_year_part := SPLIT_PART(v_fy, '-', 1);
        WHEN 'yyyy' THEN v_year_part := '20' || SPLIT_PART(v_fy, '-', 1) || '-20' || SPLIT_PART(v_fy, '-', 2);
        WHEN 'none' THEN v_year_part := '';
        ELSE v_year_part := v_fy;
    END CASE;
    
    -- Get current sequence number with LOCK
    SELECT last_number INTO v_next_number
    FROM voucher_number_sequences
    WHERE prefix_id = v_prefix_record.id
      AND financial_year = v_fy
    FOR UPDATE;
    
    IF v_next_number IS NULL THEN
        v_next_number := COALESCE(v_prefix_record.auto_start_no, 1) - 1;
    END IF;
    
    -- LOOP to find next available number that doesn't exist in vouchers table
    -- This handles cases where numbers might be taken by deleted/manual entries
    LOOP
        v_next_number := v_next_number + 1;
        
        -- Build candidate voucher_number
        IF v_year_part = '' THEN
            v_candidate_voucher_number := v_prefix_record.voucher_prefix || v_prefix_record.prefix_separator || v_next_number::TEXT;
        ELSE
            v_candidate_voucher_number := v_prefix_record.voucher_prefix || v_prefix_record.prefix_separator || v_year_part || v_prefix_record.prefix_separator || v_next_number::TEXT;
        END IF;
        
        -- Check if this voucher_number already exists
        SELECT EXISTS(
            SELECT 1 FROM vouchers 
            WHERE voucher_number = v_candidate_voucher_number
        ) INTO v_exists;
        
        -- If not exists, use this number
        IF NOT v_exists THEN
            EXIT;
        END IF;
        
        -- Safety: prevent infinite loop (max 10000 iterations)
        IF v_next_number > 10000 THEN
            RAISE EXCEPTION 'Could not find available invoice number after 10000 attempts';
        END IF;
    END LOOP;
    
    -- Update or insert sequence
    INSERT INTO voucher_number_sequences (prefix_id, financial_year, last_number)
    VALUES (v_prefix_record.id, v_fy, v_next_number)
    ON CONFLICT (prefix_id, financial_year) 
    DO UPDATE SET last_number = EXCLUDED.last_number, updated_at = NOW();
    
    -- Set the values
    NEW.inv_number := v_next_number::TEXT;
    NEW.voucher_number := v_candidate_voucher_number;
    
    RETURN NEW;
END;
$function$;

-- Create Trigger
DROP TRIGGER IF EXISTS trg_generate_inv_number ON public.vouchers;
CREATE TRIGGER trg_generate_inv_number BEFORE INSERT ON public.vouchers FOR EACH ROW EXECUTE FUNCTION generate_inv_number_on_insert();
