-- ============================================
-- PURCHASE INVOICE FIELDS - SQL Migration
-- ============================================
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================

-- 1. Add additional fields to vouchers table for Purchase Invoice
ALTER TABLE vouchers 
ADD COLUMN IF NOT EXISTS memo_type VARCHAR(50) DEFAULT 'Debit',
ADD COLUMN IF NOT EXISTS gst_type VARCHAR(100),
ADD COLUMN IF NOT EXISTS eligibility_itc VARCHAR(50) DEFAULT 'Inputs',
ADD COLUMN IF NOT EXISTS po_challan_number VARCHAR(100),
ADD COLUMN IF NOT EXISTS apply_round_off BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS attachment_url TEXT;

-- 2. Add remark field to voucher_items if not exists
ALTER TABLE voucher_items
ADD COLUMN IF NOT EXISTS remarks TEXT;

-- 3. Add comments for documentation
COMMENT ON COLUMN vouchers.memo_type IS 'Memo type: Debit or Credit';
COMMENT ON COLUMN vouchers.gst_type IS 'GST Type: GST Local Purchase, Interstate Purchase, Import, Exempt';
COMMENT ON COLUMN vouchers.eligibility_itc IS 'Eligibility for ITC: Inputs, Capital Goods, Input Services, Ineligible';
COMMENT ON COLUMN vouchers.po_challan_number IS 'Purchase Order or Challan reference number';
COMMENT ON COLUMN vouchers.apply_round_off IS 'Whether to apply round-off to final amount';
COMMENT ON COLUMN vouchers.attachment_url IS 'URL to uploaded invoice attachment/document';
COMMENT ON COLUMN voucher_items.remarks IS 'Item-specific remarks or notes';

-- 4. Verify the columns were added
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'vouchers' 
AND column_name IN ('memo_type', 'gst_type', 'eligibility_itc', 'po_challan_number', 'apply_round_off', 'attachment_url');
