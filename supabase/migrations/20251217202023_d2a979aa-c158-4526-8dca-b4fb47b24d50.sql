-- Add new voucher types for sales documents
ALTER TYPE voucher_type ADD VALUE IF NOT EXISTS 'sales_enquiry';
ALTER TYPE voucher_type ADD VALUE IF NOT EXISTS 'sales_quotation';
ALTER TYPE voucher_type ADD VALUE IF NOT EXISTS 'sales_order';
ALTER TYPE voucher_type ADD VALUE IF NOT EXISTS 'delivery_challan';

-- Add new columns to vouchers table for sales documents
ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS contact_person VARCHAR(255);
ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(50);
ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS contact_email VARCHAR(255);
ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS reference_by VARCHAR(255);

-- Date fields
ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS valid_till DATE;
ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS delivery_date DATE;
ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS customer_po_date DATE;
ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS customer_po_number VARCHAR(100);

-- Document linkage fields
ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS parent_voucher_id UUID REFERENCES vouchers(id);
ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS source_enquiry_id UUID REFERENCES vouchers(id);

-- Delivery/Transport fields
ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS transport_name VARCHAR(255);
ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS lr_number VARCHAR(100);

-- Sales fields
ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS sales_executive_id UUID REFERENCES salespersons(id);

-- Extended address fields
ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS country VARCHAR(100) DEFAULT 'India';
ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS pincode VARCHAR(20);
ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS city VARCHAR(255);
ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS state VARCHAR(255);

-- Terms and conditions
ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS terms_conditions JSONB DEFAULT '[]'::jsonb;

-- Add enquiry-specific columns to voucher_items for bearing-specific data
ALTER TABLE voucher_items ADD COLUMN IF NOT EXISTS application TEXT;
ALTER TABLE voucher_items ADD COLUMN IF NOT EXISTS shaft_housing TEXT;
ALTER TABLE voucher_items ADD COLUMN IF NOT EXISTS fitment_tools TEXT;
ALTER TABLE voucher_items ADD COLUMN IF NOT EXISTS place_of_fitment TEXT;
ALTER TABLE voucher_items ADD COLUMN IF NOT EXISTS notes TEXT;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_vouchers_parent_voucher_id ON vouchers(parent_voucher_id);
CREATE INDEX IF NOT EXISTS idx_vouchers_source_enquiry_id ON vouchers(source_enquiry_id);
CREATE INDEX IF NOT EXISTS idx_vouchers_sales_executive_id ON vouchers(sales_executive_id);