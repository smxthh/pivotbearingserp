-- ============================================
-- TAX INVOICE (SALES INVOICE) FIELDS - SQL Migration
-- ============================================
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================

-- 1. Add tax invoice specific fields to vouchers table
ALTER TABLE vouchers 
ADD COLUMN IF NOT EXISTS inv_prefix VARCHAR(50) DEFAULT 'RM/25-26/',
ADD COLUMN IF NOT EXISTS inv_number INTEGER,
ADD COLUMN IF NOT EXISTS ship_to VARCHAR(500),
ADD COLUMN IF NOT EXISTS po_number VARCHAR(100),
ADD COLUMN IF NOT EXISTS einv_ack_no VARCHAR(100),
ADD COLUMN IF NOT EXISTS ewb_no VARCHAR(100),
ADD COLUMN IF NOT EXISTS ewb_date DATE;

-- 2. Add comments for documentation
COMMENT ON COLUMN vouchers.inv_prefix IS 'Tax Invoice prefix: RM/25-26/, etc.';
COMMENT ON COLUMN vouchers.inv_number IS 'Tax Invoice sequential number';
COMMENT ON COLUMN vouchers.ship_to IS 'Ship To address for delivery';
COMMENT ON COLUMN vouchers.po_number IS 'Customer Purchase Order number';
COMMENT ON COLUMN vouchers.einv_ack_no IS 'E-Invoice Acknowledgement Number';
COMMENT ON COLUMN vouchers.ewb_no IS 'E-Way Bill Number';
COMMENT ON COLUMN vouchers.ewb_date IS 'E-Way Bill Date';

-- 3. Create sequence for tax invoice numbers if not exists
CREATE SEQUENCE IF NOT EXISTS tax_invoice_seq START 1;

-- 4. Verify the columns were added
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'vouchers' 
AND column_name IN ('inv_prefix', 'inv_number', 'ship_to', 'po_number', 'einv_ack_no', 'ewb_no', 'ewb_date');
