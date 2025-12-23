-- ================================================================
-- CLEAN FIX: Remove ALL duplicate functions and recreate correctly
-- ================================================================
-- This fixes the PGRST203 "Could not choose the best candidate function" error
-- ================================================================

-- Drop ALL possible versions of the functions (text, varchar, character varying)
DROP FUNCTION IF EXISTS public.preview_next_document_number(uuid, text, text) CASCADE;
DROP FUNCTION IF EXISTS public.preview_next_document_number(uuid, character varying, character varying) CASCADE;
DROP FUNCTION IF EXISTS public.preview_next_document_number(uuid, varchar, varchar) CASCADE;

DROP FUNCTION IF EXISTS public.get_next_document_number(uuid, text, text) CASCADE;
DROP FUNCTION IF EXISTS public.get_next_document_number(uuid, character varying, character varying) CASCADE;
DROP FUNCTION IF EXISTS public.get_next_document_number(uuid, varchar, varchar) CASCADE;

-- ================================================================
-- RECREATE: preview_next_document_number (PREVIEW ONLY)
-- Using explicit TEXT type to avoid ambiguity
-- ================================================================
CREATE OR REPLACE FUNCTION public.preview_next_document_number(
    p_distributor_id uuid,
    p_voucher_name text,
    p_prefix text DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_prefix_record RECORD;
    v_next_number integer;
    v_year_part text;
    v_full_number text;
BEGIN
    -- Get active prefix configuration
    IF p_prefix IS NOT NULL THEN
        SELECT * INTO v_prefix_record
        FROM public.voucher_prefixes
        WHERE distributor_id = p_distributor_id
          AND voucher_name = p_voucher_name
          AND CONCAT(voucher_prefix, prefix_separator) = p_prefix
          AND is_active = true
        LIMIT 1;
    ELSE
        SELECT * INTO v_prefix_record
        FROM public.voucher_prefixes
        WHERE distributor_id = p_distributor_id
          AND voucher_name = p_voucher_name
          AND is_default = true
          AND is_active = true
        LIMIT 1;
    END IF;

    IF v_prefix_record IS NULL THEN
        RAISE EXCEPTION 'No active prefix found for voucher type: %', p_voucher_name;
    END IF;

    -- Get current number (PREVIEW ONLY - don't increment)
    v_next_number := COALESCE(v_prefix_record.auto_start_no, 1);

    -- Build year part
    CASE v_prefix_record.year_format
        WHEN 'yy-yy' THEN
            IF EXTRACT(MONTH FROM CURRENT_DATE) >= 4 THEN
                v_year_part := TO_CHAR(CURRENT_DATE, 'YY') || '-' || TO_CHAR(CURRENT_DATE + INTERVAL '1 year', 'YY');
            ELSE
                v_year_part := TO_CHAR(CURRENT_DATE - INTERVAL '1 year', 'YY') || '-' || TO_CHAR(CURRENT_DATE, 'YY');
            END IF;
        WHEN 'yy' THEN
            v_year_part := TO_CHAR(CURRENT_DATE, 'YY');
        WHEN 'yyyy' THEN
            v_year_part := TO_CHAR(CURRENT_DATE, 'YYYY');
        WHEN 'none' THEN
            v_year_part := NULL;
        ELSE
            v_year_part := NULL;
    END CASE;

    -- Construct full number
    IF v_year_part IS NOT NULL THEN
        v_full_number := v_prefix_record.voucher_prefix || v_prefix_record.prefix_separator || 
                        v_year_part || v_prefix_record.prefix_separator || v_next_number;
    ELSE
        v_full_number := v_prefix_record.voucher_prefix || v_prefix_record.prefix_separator || v_next_number;
    END IF;

    RETURN v_full_number;
END;
$$;

-- ================================================================
-- RECREATE: get_next_document_number (INCREMENTS COUNTER)
-- Using explicit TEXT type to avoid ambiguity
-- ================================================================
CREATE OR REPLACE FUNCTION public.get_next_document_number(
    p_distributor_id uuid,
    p_voucher_name text,
    p_prefix text DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_prefix_record RECORD;
    v_next_number integer;
    v_year_part text;
    v_full_number text;
BEGIN
    -- Get active prefix configuration (WITH ROW LOCK)
    IF p_prefix IS NOT NULL THEN
        SELECT * INTO v_prefix_record
        FROM public.voucher_prefixes
        WHERE distributor_id = p_distributor_id
          AND voucher_name = p_voucher_name
          AND CONCAT(voucher_prefix, prefix_separator) = p_prefix
          AND is_active = true
        FOR UPDATE  -- LOCK to prevent race conditions
        LIMIT 1;
    ELSE
        SELECT * INTO v_prefix_record
        FROM public.voucher_prefixes
        WHERE distributor_id = p_distributor_id
          AND voucher_name = p_voucher_name
          AND is_default = true
          AND is_active = true
        FOR UPDATE  -- LOCK to prevent race conditions
        LIMIT 1;
    END IF;

    IF v_prefix_record IS NULL THEN
        RAISE EXCEPTION 'No active prefix found for voucher type: %', p_voucher_name;
    END IF;

    -- Get current number and use it
    v_next_number := COALESCE(v_prefix_record.auto_start_no, 1);

    -- INCREMENT the counter for next time
    UPDATE public.voucher_prefixes
    SET auto_start_no = v_next_number + 1,
        updated_at = NOW()
    WHERE id = v_prefix_record.id;

    -- Build year part
    CASE v_prefix_record.year_format
        WHEN 'yy-yy' THEN
            IF EXTRACT(MONTH FROM CURRENT_DATE) >= 4 THEN
                v_year_part := TO_CHAR(CURRENT_DATE, 'YY') || '-' || TO_CHAR(CURRENT_DATE + INTERVAL '1 year', 'YY');
            ELSE
                v_year_part := TO_CHAR(CURRENT_DATE - INTERVAL '1 year', 'YY') || '-' || TO_CHAR(CURRENT_DATE, 'YY');
            END IF;
        WHEN 'yy' THEN
            v_year_part := TO_CHAR(CURRENT_DATE, 'YY');
        WHEN 'yyyy' THEN
            v_year_part := TO_CHAR(CURRENT_DATE, 'YYYY');
        WHEN 'none' THEN
            v_year_part := NULL;
        ELSE
            v_year_part := NULL;
    END CASE;

    -- Construct full number
    IF v_year_part IS NOT NULL THEN
        v_full_number := v_prefix_record.voucher_prefix || v_prefix_record.prefix_separator || 
                        v_year_part || v_prefix_record.prefix_separator || v_next_number;
    ELSE
        v_full_number := v_prefix_record.voucher_prefix || v_prefix_record.prefix_separator || v_next_number;
    END IF;

    RETURN v_full_number;
END;
$$;

-- ================================================================
-- GRANT PERMISSIONS
-- ================================================================
GRANT EXECUTE ON FUNCTION public.preview_next_document_number(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_next_document_number(uuid, text, text) TO authenticated;

-- ================================================================
-- VERIFICATION - Check that only ONE version of each function exists
-- ================================================================
SELECT 
    proname as function_name,
    pg_get_function_arguments(oid) as parameters
FROM pg_proc
WHERE proname IN ('preview_next_document_number', 'get_next_document_number')
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
ORDER BY proname;

-- You should see EXACTLY 2 functions (one preview, one get_next)
