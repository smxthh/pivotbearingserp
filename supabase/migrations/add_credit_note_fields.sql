-- ============================================
-- CREDIT NOTE MODULE ENHANCEMENT
-- ============================================
-- Adds all necessary fields for comprehensive Credit Note functionality
-- Ensures vouchers table supports all Credit Note requirements
-- ============================================

-- Add Credit Note specific fields to vouchers table if they don't exist
DO $$ 
BEGIN
    -- Add cn_type field (Sales Credit Note / Purchase Credit Note)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'vouchers' AND column_name = 'cn_type'
    ) THEN
        ALTER TABLE vouchers 
        ADD COLUMN cn_type VARCHAR(50);
    END IF;

    -- Add memo_type field (Credit / Debit)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'vouchers' AND column_name = 'memo_type'
    ) THEN
        ALTER TABLE vouchers 
        ADD COLUMN memo_type VARCHAR(20) DEFAULT 'Credit';
    END IF;

    -- Add gst_type field (GST Local Sales / GST Inter-State Sales / GST Exports)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'vouchers' AND column_name = 'gst_type'
    ) THEN
        ALTER TABLE vouchers 
        ADD COLUMN gst_type VARCHAR(50);
    END IF;

    -- Add eligibility_itc field (Input / Input Services / Capital Goods)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'vouchers' AND column_name = 'eligibility_itc'
    ) THEN
        ALTER TABLE vouchers 
        ADD COLUMN eligibility_itc VARCHAR(50) DEFAULT 'Input';
    END IF;

    -- Add invoice_number field (Reference to original invoice)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'vouchers' AND column_name = 'invoice_number'
    ) THEN
        ALTER TABLE vouchers 
        ADD COLUMN invoice_number VARCHAR(100);
    END IF;

    -- Add invoice_date field (Reference invoice date)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'vouchers' AND column_name = 'invoice_date'
    ) THEN
        ALTER TABLE vouchers 
        ADD COLUMN invoice_date DATE;
    END IF;

    -- Add apply_round_off field (Boolean for round-off calculation)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'vouchers' AND column_name = 'apply_round_off'
    ) THEN
        ALTER TABLE vouchers 
        ADD COLUMN apply_round_off BOOLEAN DEFAULT true;
    END IF;

    -- Add doc_prefix field (Document prefix like CN/25-26/)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'vouchers' AND column_name = 'doc_prefix'
    ) THEN
        ALTER TABLE vouchers 
        ADD COLUMN doc_prefix VARCHAR(50);
    END IF;

    -- Add doc_number field (Numeric document number)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'vouchers' AND column_name = 'doc_number'
    ) THEN
        ALTER TABLE vouchers 
        ADD COLUMN doc_number INTEGER;
    END IF;

    -- Add party_gstin field (Party's GST number)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'vouchers' AND column_name = 'party_gstin'
    ) THEN
        ALTER TABLE vouchers 
        ADD COLUMN party_gstin VARCHAR(20);
    END IF;

    -- Add party_balance field (Closing balance of party at time of transaction)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'vouchers' AND column_name = 'party_balance'
    ) THEN
        ALTER TABLE vouchers 
        ADD COLUMN party_balance DECIMAL(15,2) DEFAULT 0;
    END IF;

    -- Add party_turnover field (Turnover of party)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'vouchers' AND column_name = 'party_turnover'
    ) THEN
        ALTER TABLE vouchers 
        ADD COLUMN party_turnover DECIMAL(15,2) DEFAULT 0;
    END IF;

END $$;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_vouchers_cn_type 
ON vouchers(cn_type) WHERE voucher_type = 'credit_note';

CREATE INDEX IF NOT EXISTS idx_vouchers_gst_type 
ON vouchers(gst_type) WHERE voucher_type = 'credit_note';

CREATE INDEX IF NOT EXISTS idx_vouchers_invoice_number 
ON vouchers(invoice_number) WHERE voucher_type = 'credit_note';

CREATE INDEX IF NOT EXISTS idx_vouchers_doc_prefix_number 
ON vouchers(doc_prefix, doc_number) WHERE voucher_type = 'credit_note';

-- Add check constraints
DO $$
BEGIN
    -- CLEANUP INVALID DATA FIRST
    -- Set gst_type to NULL if it contains invalid values (safe cleanup)
    UPDATE vouchers 
    SET gst_type = NULL 
    WHERE gst_type NOT IN ('GST Local Sales', 'GST Inter-State Sales', 'GST Exports');

    -- Set eligibility_itc to NULL if invalid
    UPDATE vouchers 
    SET eligibility_itc = NULL 
    WHERE eligibility_itc NOT IN ('Input', 'Input Services', 'Capital Goods');

    -- Set cn_type to NULL if invalid
    UPDATE vouchers 
    SET cn_type = NULL 
    WHERE cn_type NOT IN ('Sales Credit Note', 'Purchase Credit Note');

    -- Constraint for CN Type
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'check_cn_type'
    ) THEN
        ALTER TABLE vouchers 
        ADD CONSTRAINT check_cn_type 
        CHECK (
            cn_type IS NULL OR 
            cn_type IN ('Sales Credit Note', 'Purchase Credit Note')
        );
    END IF;

    -- Constraint for Memo Type
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'check_memo_type'
    ) THEN
        ALTER TABLE vouchers 
        ADD CONSTRAINT check_memo_type 
        CHECK (
            memo_type IS NULL OR 
            memo_type IN ('Credit', 'Debit')
        );
    END IF;

    -- Constraint for GST Type
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'check_gst_type'
    ) THEN
        ALTER TABLE vouchers 
        ADD CONSTRAINT check_gst_type 
        CHECK (
            gst_type IS NULL OR 
            gst_type IN ('GST Local Sales', 'GST Inter-State Sales', 'GST Exports')
        );
    END IF;

    -- Constraint for Eligibility ITC
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'check_eligibility_itc'
    ) THEN
        ALTER TABLE vouchers 
        ADD CONSTRAINT check_eligibility_itc 
        CHECK (
            eligibility_itc IS NULL OR 
            eligibility_itc IN ('Input', 'Input Services', 'Capital Goods')
        );
    END IF;
END $$;

-- Add comments for documentation
COMMENT ON COLUMN vouchers.cn_type IS 'Type of credit note: Sales Credit Note or Purchase Credit Note';
COMMENT ON COLUMN vouchers.memo_type IS 'Memo type: Credit or Debit';
COMMENT ON COLUMN vouchers.gst_type IS 'GST transaction type: Local, Inter-State, or Exports';
COMMENT ON COLUMN vouchers.eligibility_itc IS 'Input Tax Credit eligibility type';
COMMENT ON COLUMN vouchers.invoice_number IS 'Reference to original invoice number';
COMMENT ON COLUMN vouchers.invoice_date IS 'Date of original invoice';
COMMENT ON COLUMN vouchers.apply_round_off IS 'Whether to apply round-off to total amount';
COMMENT ON COLUMN vouchers.doc_prefix IS 'Document number prefix (e.g., CN/25-26/)';
COMMENT ON COLUMN vouchers.doc_number IS 'Numeric document number';
COMMENT ON COLUMN vouchers.party_gstin IS 'GST Identification Number of the party';
COMMENT ON COLUMN vouchers.party_balance IS 'Closing balance of party at time of transaction';
COMMENT ON COLUMN vouchers.party_turnover IS 'Total turnover with the party';

-- ============================================
-- ENHANCED VOUCHER NUMBER GENERATOR FOR CREDIT NOTES
-- ============================================

CREATE OR REPLACE FUNCTION generate_credit_note_number(
    p_distributor_id UUID,
    p_prefix VARCHAR DEFAULT 'CN/25-26/'
)
RETURNS TABLE(full_number VARCHAR, doc_number INTEGER) AS $$
DECLARE
    v_count INTEGER;
    v_number VARCHAR;
BEGIN
    -- Get count for credit notes with this prefix
    SELECT COUNT(*) + 1 INTO v_count
    FROM vouchers
    WHERE distributor_id = p_distributor_id
        AND voucher_type = 'credit_note'
        AND doc_prefix = p_prefix
        AND status != 'cancelled';
    
    -- Generate full number
    v_number := p_prefix || v_count::TEXT;
    
    RETURN QUERY SELECT v_number, v_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- VIEW FOR CREDIT NOTE SUMMARY
-- ============================================

CREATE OR REPLACE VIEW credit_note_summary AS
SELECT 
    v.distributor_id,
    v.cn_type,
    v.gst_type,
    DATE_TRUNC('month', v.voucher_date) as month,
    COUNT(*) as total_credit_notes,
    SUM(v.subtotal) as total_subtotal,
    SUM(v.cgst_amount) as total_cgst,
    SUM(v.sgst_amount) as total_sgst,
    SUM(v.igst_amount) as total_igst,
    SUM(v.total_tax) as total_tax,
    SUM(v.total_amount) as total_amount,
    SUM(v.round_off) as total_round_off
FROM vouchers v
WHERE v.voucher_type = 'credit_note'
    AND v.status = 'confirmed'
GROUP BY 
    v.distributor_id,
    v.cn_type,
    v.gst_type,
    DATE_TRUNC('month', v.voucher_date);

-- Grant access to the view
GRANT SELECT ON credit_note_summary TO authenticated;

-- ============================================
-- FUNCTION TO GET PARTY BALANCE
-- ============================================

CREATE OR REPLACE FUNCTION get_party_closing_balance(
    p_party_id UUID
)
RETURNS DECIMAL AS $$
DECLARE
    v_balance DECIMAL;
BEGIN
    SELECT COALESCE(closing_balance, 0) INTO v_balance
    FROM ledgers
    WHERE party_id = p_party_id
    LIMIT 1;
    
    RETURN COALESCE(v_balance, 0);
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- FUNCTION TO GET PARTY TURNOVER
-- ============================================

CREATE OR REPLACE FUNCTION get_party_turnover(
    p_party_id UUID,
    p_distributor_id UUID
)
RETURNS DECIMAL AS $$
DECLARE
    v_turnover DECIMAL;
BEGIN
    SELECT COALESCE(SUM(total_amount), 0) INTO v_turnover
    FROM vouchers
    WHERE party_id = p_party_id
        AND distributor_id = p_distributor_id
        AND status = 'confirmed'
        AND voucher_type IN ('tax_invoice', 'purchase_invoice');
    
    RETURN COALESCE(v_turnover, 0);
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- COMPLETED
-- ============================================

-- Success message
DO $$ 
BEGIN
    RAISE NOTICE 'Credit Note module enhancement completed successfully!';
    RAISE NOTICE 'Added fields: cn_type, memo_type, gst_type, eligibility_itc, invoice_number, invoice_date';
    RAISE NOTICE 'Added helper functions for party balance and turnover';
    RAISE NOTICE 'Created credit_note_summary view for reporting';
END $$;
