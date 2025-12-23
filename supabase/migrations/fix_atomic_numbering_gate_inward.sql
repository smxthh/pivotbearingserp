-- ================================================================
-- ATOMIC NUMBERING FOR GATE INWARD
-- Creates a trigger similar to vouchers for the gate_inwards table
-- ================================================================

-- Function to atomically generate gi_number on insert
CREATE OR REPLACE FUNCTION public.generate_gi_number_on_insert()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
    v_next_number INTEGER;
    v_fy TEXT;
    v_prefix_record RECORD;
    v_year_part TEXT := '';
    v_candidate_gi_number TEXT;
    v_exists BOOLEAN;
    v_prefix TEXT;
    v_separator TEXT;
BEGIN
    -- Only generate if gi_number is NULL or empty
    IF NEW.gi_number IS NOT NULL AND NEW.gi_number <> '' THEN
        -- Check if gi_number already ends with a number (fully formed)
        IF NEW.gi_number ~ '\d+$' THEN
            RETURN NEW;
        END IF;
        -- Otherwise, it's just a prefix - we need to append a number
        v_prefix := TRIM(TRAILING '/' FROM NEW.gi_number);
    ELSE
        v_prefix := NULL;
    END IF;
    
    -- Get financial year
    v_fy := get_current_financial_year();
    
    -- Find matching prefix record for Gate Inward
    IF v_prefix IS NOT NULL THEN
        SELECT * INTO v_prefix_record FROM voucher_prefixes 
        WHERE distributor_id = NEW.distributor_id
          AND voucher_name = 'Gate Inward'
          AND is_active = true
          AND NEW.gi_number LIKE CONCAT(voucher_prefix, prefix_separator, '%')
        ORDER BY is_default DESC
        LIMIT 1;
    ELSE
        SELECT * INTO v_prefix_record FROM voucher_prefixes 
        WHERE distributor_id = NEW.distributor_id
          AND voucher_name = 'Gate Inward'
          AND is_active = true
          AND is_default = true
        LIMIT 1;
    END IF;
    
    IF v_prefix_record IS NULL THEN
        -- Fallback: find max existing gi_number and increment
        SELECT COALESCE(MAX(
            CASE 
                WHEN gi_number ~ '\d+$' 
                THEN SUBSTRING(gi_number FROM '\d+$')::INTEGER 
                ELSE 0 
            END
        ), 0) + 1 INTO v_next_number
        FROM gate_inwards 
        WHERE distributor_id = NEW.distributor_id;
        
        IF NEW.gi_number IS NULL OR NEW.gi_number = '' THEN
            NEW.gi_number := 'GI/' || COALESCE(v_next_number, 1)::TEXT;
        ELSE
            NEW.gi_number := NEW.gi_number || COALESCE(v_next_number, 1)::TEXT;
        END IF;
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
    
    -- Get current sequence number with lock
    SELECT last_number INTO v_next_number
    FROM voucher_number_sequences
    WHERE prefix_id = v_prefix_record.id
      AND financial_year = v_fy
    FOR UPDATE;
    
    IF v_next_number IS NULL THEN
        v_next_number := COALESCE(v_prefix_record.auto_start_no, 1) - 1;
    END IF;
    
    -- Loop to find next available number
    LOOP
        v_next_number := v_next_number + 1;
        
        -- Build candidate gi_number
        IF v_year_part = '' THEN
            v_candidate_gi_number := v_prefix_record.voucher_prefix || v_prefix_record.prefix_separator || v_next_number::TEXT;
        ELSE
            v_candidate_gi_number := v_prefix_record.voucher_prefix || v_prefix_record.prefix_separator || v_year_part || v_prefix_record.prefix_separator || v_next_number::TEXT;
        END IF;
        
        -- Check if this gi_number already exists
        SELECT EXISTS(
            SELECT 1 FROM gate_inwards 
            WHERE gi_number = v_candidate_gi_number
        ) INTO v_exists;
        
        -- If not exists, use this number
        IF NOT v_exists THEN
            EXIT;
        END IF;
        
        -- Safety: prevent infinite loop
        IF v_next_number > 10000 THEN
            RAISE EXCEPTION 'Could not find available GI number after 10000 attempts';
        END IF;
    END LOOP;
    
    -- Update or insert sequence
    INSERT INTO voucher_number_sequences (prefix_id, financial_year, last_number)
    VALUES (v_prefix_record.id, v_fy, v_next_number)
    ON CONFLICT (prefix_id, financial_year) 
    DO UPDATE SET last_number = EXCLUDED.last_number, updated_at = NOW();
    
    -- Set the gi_number
    NEW.gi_number := v_candidate_gi_number;
    
    RETURN NEW;
END;
$function$;

-- Create trigger on gate_inwards table
DROP TRIGGER IF EXISTS trg_generate_gi_number ON public.gate_inwards;
CREATE TRIGGER trg_generate_gi_number 
    BEFORE INSERT ON public.gate_inwards 
    FOR EACH ROW 
    EXECUTE FUNCTION generate_gi_number_on_insert();
