-- ============================================
-- VOUCHER PREFIX CONFIGURATION MODULE
-- Thread-safe document numbering system
-- ============================================

-- ============================================
-- 1. VOUCHER PREFIXES TABLE
-- Stores prefix configurations per distributor
-- ============================================
CREATE TABLE IF NOT EXISTS public.voucher_prefixes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    distributor_id UUID NOT NULL REFERENCES distributor_profiles(id) ON DELETE CASCADE,
    voucher_name VARCHAR(50) NOT NULL,      -- 'Sales Order', 'Purchase Invoice', etc.
    voucher_prefix VARCHAR(20) NOT NULL,    -- 'SO', 'PO', 'PINV'
    prefix_separator VARCHAR(5) DEFAULT '/',
    year_format VARCHAR(20) DEFAULT 'yy-yy', -- 'yy-yy', 'yy', 'yyyy', 'none'
    auto_start_no INTEGER DEFAULT 1,
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(distributor_id, voucher_name, voucher_prefix)
);

CREATE INDEX IF NOT EXISTS idx_voucher_prefixes_distributor ON voucher_prefixes(distributor_id);
CREATE INDEX IF NOT EXISTS idx_voucher_prefixes_voucher_name ON voucher_prefixes(distributor_id, voucher_name);
CREATE INDEX IF NOT EXISTS idx_voucher_prefixes_default ON voucher_prefixes(distributor_id, voucher_name, is_default) WHERE is_default = true;

-- ============================================
-- 2. VOUCHER NUMBER SEQUENCES TABLE
-- Thread-safe sequence tracking per prefix per FY
-- ============================================
CREATE TABLE IF NOT EXISTS public.voucher_number_sequences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prefix_id UUID NOT NULL REFERENCES voucher_prefixes(id) ON DELETE CASCADE,
    financial_year VARCHAR(10) NOT NULL,    -- '25-26'
    last_number INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(prefix_id, financial_year)
);

CREATE INDEX IF NOT EXISTS idx_voucher_sequences_prefix ON voucher_number_sequences(prefix_id);

-- ============================================
-- 3. RLS POLICIES
-- ============================================
ALTER TABLE voucher_prefixes ENABLE ROW LEVEL SECURITY;
ALTER TABLE voucher_number_sequences ENABLE ROW LEVEL SECURITY;

-- Voucher Prefixes Policies
DROP POLICY IF EXISTS "voucher_prefixes_select_policy" ON voucher_prefixes;
CREATE POLICY "voucher_prefixes_select_policy" ON voucher_prefixes FOR SELECT
    USING (distributor_id IN (SELECT id FROM distributor_profiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "voucher_prefixes_insert_policy" ON voucher_prefixes;
CREATE POLICY "voucher_prefixes_insert_policy" ON voucher_prefixes FOR INSERT
    WITH CHECK (distributor_id IN (SELECT id FROM distributor_profiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "voucher_prefixes_update_policy" ON voucher_prefixes;
CREATE POLICY "voucher_prefixes_update_policy" ON voucher_prefixes FOR UPDATE
    USING (distributor_id IN (SELECT id FROM distributor_profiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "voucher_prefixes_delete_policy" ON voucher_prefixes;
CREATE POLICY "voucher_prefixes_delete_policy" ON voucher_prefixes FOR DELETE
    USING (distributor_id IN (SELECT id FROM distributor_profiles WHERE user_id = auth.uid()));

-- Sequences Policies (accessed via prefix)
DROP POLICY IF EXISTS "voucher_sequences_select_policy" ON voucher_number_sequences;
CREATE POLICY "voucher_sequences_select_policy" ON voucher_number_sequences FOR SELECT
    USING (prefix_id IN (
        SELECT id FROM voucher_prefixes 
        WHERE distributor_id IN (SELECT id FROM distributor_profiles WHERE user_id = auth.uid())
    ));

DROP POLICY IF EXISTS "voucher_sequences_insert_policy" ON voucher_number_sequences;
CREATE POLICY "voucher_sequences_insert_policy" ON voucher_number_sequences FOR INSERT
    WITH CHECK (prefix_id IN (
        SELECT id FROM voucher_prefixes 
        WHERE distributor_id IN (SELECT id FROM distributor_profiles WHERE user_id = auth.uid())
    ));

DROP POLICY IF EXISTS "voucher_sequences_update_policy" ON voucher_number_sequences;
CREATE POLICY "voucher_sequences_update_policy" ON voucher_number_sequences FOR UPDATE
    USING (prefix_id IN (
        SELECT id FROM voucher_prefixes 
        WHERE distributor_id IN (SELECT id FROM distributor_profiles WHERE user_id = auth.uid())
    ));

-- ============================================
-- 4. GRANTS
-- ============================================
GRANT SELECT, INSERT, UPDATE, DELETE ON voucher_prefixes TO authenticated;
GRANT SELECT, INSERT, UPDATE ON voucher_number_sequences TO authenticated;

-- ============================================
-- 5. UPDATE TRIGGER
-- ============================================
DROP TRIGGER IF EXISTS trg_voucher_prefixes_updated_at ON voucher_prefixes;
CREATE TRIGGER trg_voucher_prefixes_updated_at
    BEFORE UPDATE ON voucher_prefixes
    FOR EACH ROW
    EXECUTE FUNCTION fn_update_config_timestamp();

DROP TRIGGER IF EXISTS trg_voucher_sequences_updated_at ON voucher_number_sequences;
CREATE TRIGGER trg_voucher_sequences_updated_at
    BEFORE UPDATE ON voucher_number_sequences
    FOR EACH ROW
    EXECUTE FUNCTION fn_update_config_timestamp();

-- ============================================
-- 6. HELPER FUNCTION: Get Current Financial Year
-- ============================================
CREATE OR REPLACE FUNCTION get_current_financial_year()
RETURNS VARCHAR(10)
LANGUAGE plpgsql
AS $$
DECLARE
    v_now DATE := CURRENT_DATE;
    v_year INTEGER := EXTRACT(YEAR FROM v_now);
    v_month INTEGER := EXTRACT(MONTH FROM v_now);
BEGIN
    -- Financial year starts in April
    IF v_month >= 4 THEN
        RETURN (v_year % 100)::TEXT || '-' || ((v_year + 1) % 100)::TEXT;
    ELSE
        RETURN ((v_year - 1) % 100)::TEXT || '-' || (v_year % 100)::TEXT;
    END IF;
END;
$$;

-- ============================================
-- 7. CORE FUNCTION: Get Next Document Number
-- Thread-safe with row-level locking
-- ============================================
CREATE OR REPLACE FUNCTION get_next_document_number(
    p_distributor_id UUID,
    p_voucher_name VARCHAR,
    p_prefix VARCHAR DEFAULT NULL  -- If null, uses default prefix
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_prefix_record RECORD;
    v_sequence_id UUID;
    v_last_number INTEGER;
    v_new_number INTEGER;
    v_fy VARCHAR(10);
    v_formatted_number TEXT;
    v_year_part TEXT;
BEGIN
    -- Get current financial year
    v_fy := get_current_financial_year();
    
    -- Find the prefix configuration
    IF p_prefix IS NULL THEN
        -- Get default prefix for this voucher name
        SELECT * INTO v_prefix_record
        FROM voucher_prefixes
        WHERE distributor_id = p_distributor_id
          AND voucher_name = p_voucher_name
          AND is_default = true
          AND is_active = true
        LIMIT 1;
    ELSE
        -- Get specific prefix
        SELECT * INTO v_prefix_record
        FROM voucher_prefixes
        WHERE distributor_id = p_distributor_id
          AND voucher_name = p_voucher_name
          AND voucher_prefix = p_prefix
          AND is_active = true
        LIMIT 1;
    END IF;
    
    -- If no prefix found, create a sensible default
    IF v_prefix_record IS NULL THEN
        RAISE EXCEPTION 'No active prefix found for voucher type: %', p_voucher_name;
    END IF;
    
    -- Get or create sequence for this prefix + FY with locking
    SELECT id, last_number INTO v_sequence_id, v_last_number
    FROM voucher_number_sequences
    WHERE prefix_id = v_prefix_record.id
      AND financial_year = v_fy
    FOR UPDATE;
    
    IF v_sequence_id IS NULL THEN
        -- Create new sequence starting from auto_start_no
        v_new_number := v_prefix_record.auto_start_no;
        
        INSERT INTO voucher_number_sequences (prefix_id, financial_year, last_number)
        VALUES (v_prefix_record.id, v_fy, v_new_number)
        RETURNING id INTO v_sequence_id;
    ELSE
        -- Increment existing sequence
        v_new_number := v_last_number + 1;
        
        UPDATE voucher_number_sequences
        SET last_number = v_new_number,
            updated_at = NOW()
        WHERE id = v_sequence_id;
    END IF;
    
    -- Format the year part based on year_format setting
    CASE v_prefix_record.year_format
        WHEN 'yy-yy' THEN
            v_year_part := v_fy;
        WHEN 'yy' THEN
            v_year_part := SPLIT_PART(v_fy, '-', 1);
        WHEN 'yyyy' THEN
            -- Convert 25-26 to 2025-2026
            v_year_part := '20' || SPLIT_PART(v_fy, '-', 1) || '-20' || SPLIT_PART(v_fy, '-', 2);
        WHEN 'none' THEN
            v_year_part := '';
        ELSE
            v_year_part := v_fy;
    END CASE;
    
    -- Build formatted document number
    -- Format: PREFIX + SEPARATOR + YEAR + SEPARATOR + NUMBER
    IF v_year_part = '' THEN
        v_formatted_number := v_prefix_record.voucher_prefix || 
                              v_prefix_record.prefix_separator || 
                              v_new_number::TEXT;
    ELSE
        v_formatted_number := v_prefix_record.voucher_prefix || 
                              v_prefix_record.prefix_separator || 
                              v_year_part || 
                              v_prefix_record.prefix_separator || 
                              v_new_number::TEXT;
    END IF;
    
    RETURN v_formatted_number;
END;
$$;

-- ============================================
-- 8. FUNCTION: Preview Next Number (No Increment)
-- ============================================
CREATE OR REPLACE FUNCTION preview_next_document_number(
    p_distributor_id UUID,
    p_voucher_name VARCHAR,
    p_prefix VARCHAR DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v_prefix_record RECORD;
    v_last_number INTEGER;
    v_next_number INTEGER;
    v_fy VARCHAR(10);
    v_formatted_number TEXT;
    v_year_part TEXT;
BEGIN
    v_fy := get_current_financial_year();
    
    -- Find the prefix configuration
    IF p_prefix IS NULL THEN
        SELECT * INTO v_prefix_record
        FROM voucher_prefixes
        WHERE distributor_id = p_distributor_id
          AND voucher_name = p_voucher_name
          AND is_default = true
          AND is_active = true
        LIMIT 1;
    ELSE
        SELECT * INTO v_prefix_record
        FROM voucher_prefixes
        WHERE distributor_id = p_distributor_id
          AND voucher_name = p_voucher_name
          AND voucher_prefix = p_prefix
          AND is_active = true
        LIMIT 1;
    END IF;
    
    IF v_prefix_record IS NULL THEN
        RETURN NULL;
    END IF;
    
    -- Get current sequence
    SELECT last_number INTO v_last_number
    FROM voucher_number_sequences
    WHERE prefix_id = v_prefix_record.id
      AND financial_year = v_fy;
    
    IF v_last_number IS NULL THEN
        v_next_number := v_prefix_record.auto_start_no;
    ELSE
        v_next_number := v_last_number + 1;
    END IF;
    
    -- Format year part
    CASE v_prefix_record.year_format
        WHEN 'yy-yy' THEN v_year_part := v_fy;
        WHEN 'yy' THEN v_year_part := SPLIT_PART(v_fy, '-', 1);
        WHEN 'yyyy' THEN v_year_part := '20' || SPLIT_PART(v_fy, '-', 1) || '-20' || SPLIT_PART(v_fy, '-', 2);
        WHEN 'none' THEN v_year_part := '';
        ELSE v_year_part := v_fy;
    END CASE;
    
    IF v_year_part = '' THEN
        v_formatted_number := v_prefix_record.voucher_prefix || 
                              v_prefix_record.prefix_separator || 
                              v_next_number::TEXT;
    ELSE
        v_formatted_number := v_prefix_record.voucher_prefix || 
                              v_prefix_record.prefix_separator || 
                              v_year_part || 
                              v_prefix_record.prefix_separator || 
                              v_next_number::TEXT;
    END IF;
    
    RETURN v_formatted_number;
END;
$$;

-- ============================================
-- 9. FUNCTION: Seed Default Prefixes for New Distributor
-- ============================================
CREATE OR REPLACE FUNCTION seed_default_voucher_prefixes(p_distributor_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    -- Only seed if no prefixes exist for this distributor
    IF EXISTS (SELECT 1 FROM voucher_prefixes WHERE distributor_id = p_distributor_id) THEN
        RETURN;
    END IF;
    
    INSERT INTO voucher_prefixes (distributor_id, voucher_name, voucher_prefix, prefix_separator, year_format, auto_start_no, is_default, is_active) VALUES
    -- Sales
    (p_distributor_id, 'Sales Order', 'SO', '/', 'yy-yy', 1, true, true),
    (p_distributor_id, 'Sales Quotation', 'SQ', '/', 'yy-yy', 1, true, true),
    (p_distributor_id, 'Sales Enquiry', 'SE', '/', 'yy-yy', 1, true, true),
    (p_distributor_id, 'Sales Invoice', 'RM', '/', 'yy-yy', 1, true, true),
    (p_distributor_id, 'Sales Invoice', 'TR', '/', 'yy-yy', 1, false, true),
    (p_distributor_id, 'Delivery Challan', 'DC', '/', 'yy-yy', 1, true, true),
    
    -- Purchase
    (p_distributor_id, 'Purchase Order', 'PO', '/', 'yy-yy', 1, true, true),
    (p_distributor_id, 'Purchase Invoice', 'PINV', '/', 'yy-yy', 1, true, true),
    
    -- Notes
    (p_distributor_id, 'Debit Note', 'DRN', '/', 'yy-yy', 1, true, true),
    (p_distributor_id, 'Debit Note', 'PRN', '/', 'yy-yy', 1, false, true),
    (p_distributor_id, 'Credit Note', 'CRN', '/', 'yy-yy', 1, true, true),
    (p_distributor_id, 'Credit Note', 'SRN', '/', 'yy-yy', 1, false, true),
    
    -- Store
    (p_distributor_id, 'Marking', 'MRK', '/', 'yy-yy', 1, true, true),
    (p_distributor_id, 'Packing', 'PCK', '/', 'yy-yy', 1, true, true),
    (p_distributor_id, 'Gate Inward', 'GI', '/', 'yy-yy', 1, true, true),
    
    -- Accounting - Vouchers
    (p_distributor_id, 'Receipt Voucher', 'RV', '/', 'yy-yy', 1, true, true),
    (p_distributor_id, 'Payment Voucher', 'PV', '/', 'yy-yy', 1, true, true),
    (p_distributor_id, 'Journal Entry', 'JV', '/', 'yy-yy', 1, true, true),
    
    -- Accounting - GST
    (p_distributor_id, 'GST Expense', 'EXP', '/', 'yy-yy', 1, true, true),
    (p_distributor_id, 'GST Income', 'INC', '/', 'yy-yy', 1, true, true),
    (p_distributor_id, 'GST Payment', 'GSTPMT', '/', 'yy-yy', 1, true, true),
    (p_distributor_id, 'GST Journal', 'GSTJV', '/', 'yy-yy', 1, true, true),
    (p_distributor_id, 'GST Havala', 'GH', '/', 'yy-yy', 1, true, true),
    (p_distributor_id, 'Havala', 'HAV', '/', 'yy-yy', 1, true, true),
    (p_distributor_id, 'TCS/TDS Payment', 'TDSPMT', '/', 'yy-yy', 1, true, true);
END;
$$;

-- ============================================
-- 10. FUNCTION: Get All Prefixes for Voucher Type
-- ============================================
CREATE OR REPLACE FUNCTION get_voucher_prefixes_for_type(
    p_distributor_id UUID,
    p_voucher_name VARCHAR
)
RETURNS TABLE (
    id UUID,
    voucher_prefix VARCHAR,
    prefix_separator VARCHAR,
    year_format VARCHAR,
    is_default BOOLEAN,
    next_number TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        vp.id,
        vp.voucher_prefix,
        vp.prefix_separator,
        vp.year_format,
        vp.is_default,
        preview_next_document_number(p_distributor_id, p_voucher_name, vp.voucher_prefix) as next_number
    FROM voucher_prefixes vp
    WHERE vp.distributor_id = p_distributor_id
      AND vp.voucher_name = p_voucher_name
      AND vp.is_active = true
    ORDER BY vp.is_default DESC, vp.voucher_prefix;
END;
$$;

-- ============================================
-- END OF VOUCHER PREFIX MODULE
-- ============================================
