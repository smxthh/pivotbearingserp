-- ============================================
-- DEBIT NOTE FIELDS - SQL Migration
-- ============================================
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================

-- 1. Add debit note specific fields to vouchers table
ALTER TABLE vouchers 
ADD COLUMN IF NOT EXISTS dn_prefix VARCHAR(50) DEFAULT 'DRN/25-26/',
ADD COLUMN IF NOT EXISTS dn_number INTEGER,
ADD COLUMN IF NOT EXISTS dn_type VARCHAR(100),
ADD COLUMN IF NOT EXISTS inv_number VARCHAR(100),
ADD COLUMN IF NOT EXISTS inv_date DATE;

-- 2. Add comments for documentation
COMMENT ON COLUMN vouchers.dn_prefix IS 'Debit Note prefix: DRN/25-26/, PRN/25-26/, etc.';
COMMENT ON COLUMN vouchers.dn_number IS 'Debit Note sequential number';
COMMENT ON COLUMN vouchers.dn_type IS 'DN Type: Decrease Purchase, Purchase Return, Increase Sales';
COMMENT ON COLUMN vouchers.inv_number IS 'Original Invoice Number reference';
COMMENT ON COLUMN vouchers.inv_date IS 'Original Invoice Date reference';

-- 3. Create sequence for debit note numbers if not exists
CREATE SEQUENCE IF NOT EXISTS debit_note_seq START 1;

-- 4. Verify the columns were added
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'vouchers' 
AND column_name IN ('dn_prefix', 'dn_number', 'dn_type', 'inv_number', 'inv_date');
