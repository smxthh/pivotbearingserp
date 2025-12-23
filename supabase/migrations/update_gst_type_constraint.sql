-- ============================================
-- UPDATE GST TYPE CONSTRAINT
-- ============================================
-- Expands the check_gst_type constraint to include both sales and purchase GST types
-- This allows all voucher dialogs to properly save their GST type
-- ============================================

-- First, drop the existing constraint
ALTER TABLE vouchers DROP CONSTRAINT IF EXISTS check_gst_type;

-- Now add the updated constraint with all valid GST types
ALTER TABLE vouchers 
ADD CONSTRAINT check_gst_type 
CHECK (
    gst_type IS NULL OR 
    gst_type IN (
        -- Sales GST Types
        'GST Local Sales',
        'GST Inter-State Sales',
        'GST Exports',
        -- Purchase GST Types  
        'GST Local Purchase',
        'GST Inter-State Purchase',
        'GST Imports',
        'Interstate Purchase',
        'Import Purchase',
        'Exempt Purchase'
    )
);

-- Add comment
COMMENT ON COLUMN vouchers.gst_type IS 'GST transaction type for both sales and purchases';

-- Success message
DO $$ 
BEGIN
    RAISE NOTICE 'check_gst_type constraint updated successfully!';
    RAISE NOTICE 'Now supports: GST Local Sales, GST Inter-State Sales, GST Exports, GST Local Purchase, GST Inter-State Purchase, GST Imports, Interstate Purchase, Import Purchase, Exempt Purchase';
END $$;
