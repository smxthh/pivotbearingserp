-- ============================================
-- FIX ALL VOUCHER CONSTRAINTS
-- ============================================
-- 1. Drops mismatched constraints
-- 2. Re-creates them with ALL valid values used in the frontend
-- ============================================

-- Fix GST Type Constraint
ALTER TABLE vouchers DROP CONSTRAINT IF EXISTS check_gst_type;
ALTER TABLE vouchers 
ADD CONSTRAINT check_gst_type 
CHECK (
    gst_type IS NULL OR 
    gst_type IN (
        -- Sales Types
        'GST Local Sales', 'GST Inter-State Sales', 'GST Exports',
        -- Purchase Types
        'GST Local Purchase', 'GST Inter-State Purchase', 'GST Imports', 
        'Interstate Purchase', 'Import Purchase', 'Exempt Purchase',
        'Tax Free Purchase Local', 'Exempted (Nill Rated)', 'Jobwork Local', 'Jobwork Central',
        'URD Local Purchase', 'URD Central Purchase'
    )
);

-- Fix Memo Type Constraint
ALTER TABLE vouchers DROP CONSTRAINT IF EXISTS check_memo_type;
ALTER TABLE vouchers 
ADD CONSTRAINT check_memo_type 
CHECK (
    memo_type IS NULL OR 
    memo_type IN ('Credit', 'Debit', 'Cash', 'Other')
);

-- Success Confirmation
DO $$ 
BEGIN
    RAISE NOTICE 'Constraints updated successfully for gst_type and memo_type';
END $$;
