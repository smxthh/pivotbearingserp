-- ============================================
-- OPENING STOCK MODULE - Complete Schema
-- ============================================
-- Idempotent: Safe to run multiple times.
-- Tables are created IF NOT EXISTS, preserving data.
-- Functions/Triggers are DROP/CREATE to update logic.
-- ============================================

-- ============================================
-- 1. OPENING STOCK TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.opening_stock (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    distributor_id UUID NOT NULL REFERENCES distributor_profiles(id) ON DELETE CASCADE,
    
    -- Item Details
    item_id UUID NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
    location_id UUID NOT NULL REFERENCES store_locations(id) ON DELETE RESTRICT,
    batch_number VARCHAR(100),
    quantity NUMERIC(12,3) NOT NULL DEFAULT 0 CHECK (quantity >= 0),
    cost_price NUMERIC(12,2) DEFAULT 0,
    
    -- Audit
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(distributor_id, item_id, location_id, batch_number)
);

-- ============================================
-- 2. INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_opening_stock_distributor ON opening_stock(distributor_id);
CREATE INDEX IF NOT EXISTS idx_opening_stock_item ON opening_stock(item_id);
CREATE INDEX IF NOT EXISTS idx_opening_stock_location ON opening_stock(location_id);

-- ============================================
-- 3. ROW LEVEL SECURITY
-- ============================================
ALTER TABLE opening_stock ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "opening_stock_select_policy" ON opening_stock;
CREATE POLICY "opening_stock_select_policy" ON opening_stock FOR SELECT
    USING (distributor_id IN (SELECT id FROM distributor_profiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "opening_stock_insert_policy" ON opening_stock;
CREATE POLICY "opening_stock_insert_policy" ON opening_stock FOR INSERT
    WITH CHECK (distributor_id IN (SELECT id FROM distributor_profiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "opening_stock_update_policy" ON opening_stock;
CREATE POLICY "opening_stock_update_policy" ON opening_stock FOR UPDATE
    USING (distributor_id IN (SELECT id FROM distributor_profiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "opening_stock_delete_policy" ON opening_stock;
CREATE POLICY "opening_stock_delete_policy" ON opening_stock FOR DELETE
    USING (distributor_id IN (SELECT id FROM distributor_profiles WHERE user_id = auth.uid()));

-- ============================================
-- 4. FUNCTION & TRIGGER: Auto-update timestamp
-- ============================================
CREATE OR REPLACE FUNCTION fn_update_opening_stock_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_opening_stock_updated_at ON opening_stock;
CREATE TRIGGER trg_opening_stock_updated_at
    BEFORE UPDATE ON opening_stock
    FOR EACH ROW
    EXECUTE FUNCTION fn_update_opening_stock_timestamp();

-- ============================================
-- 5. GRANTS
-- ============================================
GRANT SELECT, INSERT, UPDATE, DELETE ON opening_stock TO authenticated;

-- ============================================
-- END OF OPENING STOCK MODULE
-- ============================================
