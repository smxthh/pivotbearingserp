-- Migration: Fix Sequence Update on Explicit Insert (Re-apply)
-- Problem: When inv_number is provided, the trigger was skipping the sequence update.
-- Fix: If inv_number provided, find prefix and update sequence if new > old.

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
    v_manual_number INTEGER;
BEGIN
    -- Get financial year (needed for both manual and auto paths)
    v_fy := get_current_financial_year();

    -- Find matching prefix record based on voucher_number pattern
    SELECT * INTO v_prefix_record FROM voucher_prefixes 
    WHERE distributor_id = NEW.distributor_id
      AND is_active = true
      AND NEW.voucher_number LIKE CONCAT(voucher_prefix, prefix_separator, '%')
    ORDER BY is_default DESC
    LIMIT 1;

    -- ============================================================
    -- PATH 1: MANUAL / EXPLICIT NUMBER PROVIDED
    -- ============================================================
    IF NEW.inv_number IS NOT NULL AND NEW.inv_number <> '' THEN
        -- Try to parse the manual number
        BEGIN
            v_manual_number := NEW.inv_number::INTEGER;
            
            -- If we found a prefix record, ensure sequence is updated
            IF v_prefix_record IS NOT NULL THEN
                -- Upsert sequence: only update if new number is greater than current last_number
                INSERT INTO voucher_number_sequences (prefix_id, financial_year, last_number)
                VALUES (v_prefix_record.id, v_fy, v_manual_number)
                ON CONFLICT (prefix_id, financial_year) 
                DO UPDATE SET last_number = GREATEST(voucher_number_sequences.last_number, EXCLUDED.last_number), updated_at = NOW();
            END IF;
        EXCEPTION WHEN OTHERS THEN
            NULL;
        END;

        RETURN NEW;
    END IF;
    
    -- ============================================================
    -- PATH 2: AUTO GENERATION
    -- ============================================================
    
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
