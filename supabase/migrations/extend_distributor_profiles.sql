-- ============================================================
-- EXTEND DISTRIBUTOR_PROFILES TABLE WITH COMPANY INFO FIELDS
-- ============================================================
-- This migration adds all the company information fields to match
-- the Configuration page company info form

-- Add new columns to distributor_profiles table
ALTER TABLE distributor_profiles
ADD COLUMN IF NOT EXISTS company_alias VARCHAR(200),
ADD COLUMN IF NOT EXISTS company_email VARCHAR(255),
ADD COLUMN IF NOT EXISTS company_slogan TEXT,
ADD COLUMN IF NOT EXISTS contact_person VARCHAR(200),
ADD COLUMN IF NOT EXISTS company_country VARCHAR(100) DEFAULT 'India',
ADD COLUMN IF NOT EXISTS company_district VARCHAR(100),
ADD COLUMN IF NOT EXISTS msme_reg_no VARCHAR(50),
ADD COLUMN IF NOT EXISTS pan_number VARCHAR(10),
ADD COLUMN IF NOT EXISTS lic_no VARCHAR(50),
ADD COLUMN IF NOT EXISTS bank_name VARCHAR(200),
ADD COLUMN IF NOT EXISTS bank_branch VARCHAR(200),
ADD COLUMN IF NOT EXISTS account_name VARCHAR(200),
ADD COLUMN IF NOT EXISTS account_no VARCHAR(50),
ADD COLUMN IF NOT EXISTS ifsc_code VARCHAR(11),
ADD COLUMN IF NOT EXISTS swift_code VARCHAR(11),
ADD COLUMN IF NOT EXISTS company_logo_url TEXT;

-- Add comments for documentation
COMMENT ON COLUMN distributor_profiles.company_alias IS 'Short name or alias for the company';
COMMENT ON COLUMN distributor_profiles.company_email IS 'Primary company email address';
COMMENT ON COLUMN distributor_profiles.company_slogan IS 'Company tagline or slogan';
COMMENT ON COLUMN distributor_profiles.contact_person IS 'Primary contact person name';
COMMENT ON COLUMN distributor_profiles.company_country IS 'Company registered country';
COMMENT ON COLUMN distributor_profiles.company_district IS 'Company district/region';
COMMENT ON COLUMN distributor_profiles.msme_reg_no IS 'MSME registration number';
COMMENT ON COLUMN distributor_profiles.pan_number IS 'Company PAN number';
COMMENT ON COLUMN distributor_profiles.lic_no IS 'License number if applicable';
COMMENT ON COLUMN distributor_profiles.bank_name IS 'Primary bank name';
COMMENT ON COLUMN distributor_profiles.bank_branch IS 'Bank branch name';
COMMENT ON COLUMN distributor_profiles.account_name IS 'Bank account holder name';
COMMENT ON COLUMN distributor_profiles.account_no IS 'Bank account number';
COMMENT ON COLUMN distributor_profiles.ifsc_code IS 'Bank IFSC code';
COMMENT ON COLUMN distributor_profiles.swift_code IS 'Bank SWIFT code for international transfers';
COMMENT ON COLUMN distributor_profiles.company_logo_url IS 'URL to company logo image';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_distributor_profiles_gst ON distributor_profiles(gst_number) WHERE gst_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_distributor_profiles_pan ON distributor_profiles(pan_number) WHERE pan_number IS NOT NULL;

-- ============================================================
-- UPDATE RLS POLICIES (if needed)
-- ============================================================
-- The existing RLS policies should still work, but let's ensure they're correct

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own distributor profile" ON distributor_profiles;
DROP POLICY IF EXISTS "Users can update their own distributor profile" ON distributor_profiles;
DROP POLICY IF EXISTS "Users can insert their own distributor profile" ON distributor_profiles;
DROP POLICY IF EXISTS "Admins can view all distributor profiles" ON distributor_profiles;

-- Recreate policies with proper permissions
CREATE POLICY "Users can view their own distributor profile"
ON distributor_profiles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own distributor profile"
ON distributor_profiles FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own distributor profile"
ON distributor_profiles FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all distributor profiles"
ON distributor_profiles FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

CREATE POLICY "Admins can update all distributor profiles"
ON distributor_profiles FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- ============================================================
-- GRANT PERMISSIONS
-- ============================================================
-- Ensure authenticated users can access the table
GRANT SELECT, INSERT, UPDATE ON distributor_profiles TO authenticated;

-- ============================================================
-- NOTES
-- ============================================================
-- After running this migration:
-- 1. The Configuration page will be able to save all company info fields
-- 2. Existing distributor profiles will have NULL values for new fields
-- 3. Users can update their profiles with the new information
-- 4. RLS policies ensure users can only access their own data (except admins)
