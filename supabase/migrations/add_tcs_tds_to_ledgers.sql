-- Add TCS/TDS columns to ledgers table
ALTER TABLE ledgers 
ADD COLUMN IF NOT EXISTS tcs_applicable BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS tds_applicable BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS tcs_rate DECIMAL(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS tds_rate DECIMAL(5,2) DEFAULT 0;

-- Add comments for documentation
COMMENT ON COLUMN ledgers.tcs_applicable IS 'Whether TCS (Tax Collected at Source) is applicable for this ledger';
COMMENT ON COLUMN ledgers.tds_applicable IS 'Whether TDS (Tax Deducted at Source) is applicable for this ledger';
COMMENT ON COLUMN ledgers.tcs_rate IS 'TCS rate percentage (e.g., 0.1 for 0.1%)';
COMMENT ON COLUMN ledgers.tds_rate IS 'TDS rate percentage (e.g., 1.0 for 1%)';
