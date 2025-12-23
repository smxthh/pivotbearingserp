-- ============================================================
-- PARTY DELIVERY ADDRESSES TABLE
-- ============================================================
-- This migration creates a table to store multiple delivery addresses
-- for each party, enabling shipping to different locations

CREATE TABLE IF NOT EXISTS party_delivery_addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    party_id UUID NOT NULL REFERENCES parties(id) ON DELETE CASCADE,
    distributor_id UUID NOT NULL REFERENCES distributor_profiles(id) ON DELETE CASCADE,
    
    -- Delivery location details
    ship_to VARCHAR(200), -- City/Village name for quick reference
    country VARCHAR(100) DEFAULT 'India',
    state VARCHAR(100) NOT NULL,
    district VARCHAR(100),
    city VARCHAR(200),
    address TEXT NOT NULL,
    pincode VARCHAR(6),
    
    -- Additional fields
    distance_km DECIMAL(10, 2) DEFAULT 0,
    is_default BOOLEAN DEFAULT false,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add comments
COMMENT ON TABLE party_delivery_addresses IS 'Stores multiple delivery addresses for parties';
COMMENT ON COLUMN party_delivery_addresses.ship_to IS 'Quick reference city/village name';
COMMENT ON COLUMN party_delivery_addresses.distance_km IS 'Distance from company location in kilometers';
COMMENT ON COLUMN party_delivery_addresses.is_default IS 'Whether this is the default delivery address';

-- Create indexes for performance
CREATE INDEX idx_party_delivery_addresses_party_id ON party_delivery_addresses(party_id);
CREATE INDEX idx_party_delivery_addresses_distributor_id ON party_delivery_addresses(distributor_id);
CREATE INDEX idx_party_delivery_addresses_default ON party_delivery_addresses(party_id, is_default) WHERE is_default = true;

-- ============================================================
-- RLS POLICIES
-- ============================================================

ALTER TABLE party_delivery_addresses ENABLE ROW LEVEL SECURITY;

-- Distributors can view their own party delivery addresses
CREATE POLICY "Distributors can view their party delivery addresses"
ON party_delivery_addresses FOR SELECT
USING (
    distributor_id IN (
        SELECT id FROM distributor_profiles WHERE user_id = auth.uid()
    )
);

-- Salespersons can view their distributor's party delivery addresses
CREATE POLICY "Salespersons can view party delivery addresses"
ON party_delivery_addresses FOR SELECT
USING (
    distributor_id IN (
        SELECT distributor_id FROM salespersons WHERE user_id = auth.uid()
    )
);

-- Admins can view all party delivery addresses
CREATE POLICY "Admins can view all party delivery addresses"
ON party_delivery_addresses FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'admin'
    )
);

-- Distributors can insert their own party delivery addresses
CREATE POLICY "Distributors can insert party delivery addresses"
ON party_delivery_addresses FOR INSERT
WITH CHECK (
    distributor_id IN (
        SELECT id FROM distributor_profiles WHERE user_id = auth.uid()
    )
);

-- Salespersons can insert party delivery addresses for their distributor
CREATE POLICY "Salespersons can insert party delivery addresses"
ON party_delivery_addresses FOR INSERT
WITH CHECK (
    distributor_id IN (
        SELECT distributor_id FROM salespersons WHERE user_id = auth.uid()
    )
);

-- Admins can insert any party delivery addresses
CREATE POLICY "Admins can insert party delivery addresses"
ON party_delivery_addresses FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'admin'
    )
);

-- Distributors can update their own party delivery addresses
CREATE POLICY "Distributors can update party delivery addresses"
ON party_delivery_addresses FOR UPDATE
USING (
    distributor_id IN (
        SELECT id FROM distributor_profiles WHERE user_id = auth.uid()
    )
);

-- Salespersons can update party delivery addresses for their distributor
CREATE POLICY "Salespersons can update party delivery addresses"
ON party_delivery_addresses FOR UPDATE
USING (
    distributor_id IN (
        SELECT distributor_id FROM salespersons WHERE user_id = auth.uid()
    )
);

-- Admins can update all party delivery addresses
CREATE POLICY "Admins can update all party delivery addresses"
ON party_delivery_addresses FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'admin'
    )
);

-- Distributors can delete their own party delivery addresses
CREATE POLICY "Distributors can delete party delivery addresses"
ON party_delivery_addresses FOR DELETE
USING (
    distributor_id IN (
        SELECT id FROM distributor_profiles WHERE user_id = auth.uid()
    )
);

-- Salespersons can delete party delivery addresses for their distributor
CREATE POLICY "Salespersons can delete party delivery addresses"
ON party_delivery_addresses FOR DELETE
USING (
    distributor_id IN (
        SELECT distributor_id FROM salespersons WHERE user_id = auth.uid()
    )
);

-- Admins can delete all party delivery addresses
CREATE POLICY "Admins can delete all party delivery addresses"
ON party_delivery_addresses FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'admin'
    )
);

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_party_delivery_addresses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_party_delivery_addresses_updated_at
BEFORE UPDATE ON party_delivery_addresses
FOR EACH ROW
EXECUTE FUNCTION update_party_delivery_addresses_updated_at();

-- Ensure only one default address per party
CREATE OR REPLACE FUNCTION ensure_single_default_delivery_address()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_default = true THEN
        UPDATE party_delivery_addresses
        SET is_default = false
        WHERE party_id = NEW.party_id
        AND id != NEW.id
        AND is_default = true;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ensure_single_default_delivery_address
BEFORE INSERT OR UPDATE ON party_delivery_addresses
FOR EACH ROW
EXECUTE FUNCTION ensure_single_default_delivery_address();

-- ============================================================
-- GRANT PERMISSIONS
-- ============================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON party_delivery_addresses TO authenticated;

-- ============================================================
-- NOTES
-- ============================================================
-- After running this migration:
-- 1. Parties can have multiple delivery addresses
-- 2. Each delivery address is linked to a party and distributor
-- 3. One address can be marked as default per party
-- 4. RLS policies ensure data isolation per distributor
-- 5. Admins have full access to all delivery addresses
