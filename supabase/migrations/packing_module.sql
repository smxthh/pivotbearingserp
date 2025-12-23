-- ============================================
-- PACKING MODULE - Complete Schema & Logic
-- ============================================
-- Idempotent: Safe to run multiple times.
-- Tables are created IF NOT EXISTS, preserving data.
-- Functions/Triggers are DROP/CREATE to update logic.
-- ============================================

-- ============================================
-- 0. CLEANUP (Functions & Triggers Only)
-- ============================================
DROP TRIGGER IF EXISTS trg_packing_set_full_number ON public.packing;
DROP TRIGGER IF EXISTS trg_packing_updated_at ON public.packing;

DROP FUNCTION IF EXISTS fn_get_next_pck_number(UUID, VARCHAR) CASCADE;
DROP FUNCTION IF EXISTS fn_set_packing_full_number() CASCADE;
DROP FUNCTION IF EXISTS fn_update_packing_timestamp() CASCADE;

-- ============================================
-- 1. PACKING TABLE (Header)
-- ============================================
CREATE TABLE IF NOT EXISTS public.packing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    distributor_id UUID NOT NULL REFERENCES distributor_profiles(id) ON DELETE CASCADE,
    
    -- Packing Number
    pck_prefix VARCHAR(20) DEFAULT 'PCK/',
    pck_number INTEGER NOT NULL,
    pck_full_number VARCHAR(50) NOT NULL,
    
    -- Core Details
    pck_date DATE NOT NULL DEFAULT CURRENT_DATE,
    item_id UUID NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
    location_id UUID NOT NULL REFERENCES store_locations(id) ON DELETE RESTRICT,
    quantity NUMERIC(12,3) NOT NULL DEFAULT 0,
    
    -- Employee (Optional)
    employee_id UUID REFERENCES salespersons(id) ON DELETE SET NULL,
    
    -- Remark
    remark TEXT,
    
    -- Status: pending, completed, cancelled
    status VARCHAR(20) DEFAULT 'pending',
    
    -- Audit
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(distributor_id, pck_full_number)
);

-- ============================================
-- 2. PACKING BATCHES TABLE (Line Items)
-- ============================================
CREATE TABLE IF NOT EXISTS public.packing_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    packing_id UUID NOT NULL REFERENCES packing(id) ON DELETE CASCADE,
    
    -- Batch Information
    location_id UUID NOT NULL REFERENCES store_locations(id) ON DELETE RESTRICT,
    batch_number VARCHAR(100) NOT NULL,
    
    -- Stock Information
    stock_quantity NUMERIC(12,3) NOT NULL DEFAULT 0,
    quantity NUMERIC(12,3) NOT NULL DEFAULT 0,
    
    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT packing_batches_qty_positive CHECK (quantity > 0),
    CONSTRAINT packing_batches_qty_lte_stock CHECK (quantity <= stock_quantity)
);

-- ============================================
-- 3. INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_packing_distributor ON packing(distributor_id);
CREATE INDEX IF NOT EXISTS idx_packing_item ON packing(item_id);
CREATE INDEX IF NOT EXISTS idx_packing_location ON packing(location_id);
CREATE INDEX IF NOT EXISTS idx_packing_date ON packing(pck_date DESC);
CREATE INDEX IF NOT EXISTS idx_packing_full_number ON packing(pck_full_number);
CREATE INDEX IF NOT EXISTS idx_packing_batches_packing ON packing_batches(packing_id);

-- ============================================
-- 4. ROW LEVEL SECURITY
-- ============================================
ALTER TABLE packing ENABLE ROW LEVEL SECURITY;
ALTER TABLE packing_batches ENABLE ROW LEVEL SECURITY;

-- Packing Policies
DROP POLICY IF EXISTS "packing_select_policy" ON packing;
CREATE POLICY "packing_select_policy" ON packing FOR SELECT
    USING (distributor_id IN (SELECT id FROM distributor_profiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "packing_insert_policy" ON packing;
CREATE POLICY "packing_insert_policy" ON packing FOR INSERT
    WITH CHECK (distributor_id IN (SELECT id FROM distributor_profiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "packing_update_policy" ON packing;
CREATE POLICY "packing_update_policy" ON packing FOR UPDATE
    USING (distributor_id IN (SELECT id FROM distributor_profiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "packing_delete_policy" ON packing;
CREATE POLICY "packing_delete_policy" ON packing FOR DELETE
    USING (distributor_id IN (SELECT id FROM distributor_profiles WHERE user_id = auth.uid()));

-- Packing Batches Policies
DROP POLICY IF EXISTS "packing_batches_select_policy" ON packing_batches;
CREATE POLICY "packing_batches_select_policy" ON packing_batches FOR SELECT
    USING (packing_id IN (SELECT id FROM packing));

DROP POLICY IF EXISTS "packing_batches_insert_policy" ON packing_batches;
CREATE POLICY "packing_batches_insert_policy" ON packing_batches FOR INSERT
    WITH CHECK (packing_id IN (SELECT id FROM packing));

DROP POLICY IF EXISTS "packing_batches_update_policy" ON packing_batches;
CREATE POLICY "packing_batches_update_policy" ON packing_batches FOR UPDATE
    USING (packing_id IN (SELECT id FROM packing));

DROP POLICY IF EXISTS "packing_batches_delete_policy" ON packing_batches;
CREATE POLICY "packing_batches_delete_policy" ON packing_batches FOR DELETE
    USING (packing_id IN (SELECT id FROM packing));

-- ============================================
-- 5. FUNCTION: Get Next Packing Number
-- ============================================
CREATE OR REPLACE FUNCTION fn_get_next_pck_number(
    p_distributor_id UUID,
    p_prefix VARCHAR DEFAULT 'PCK/'
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_next INTEGER;
BEGIN
    SELECT COALESCE(MAX(pck_number), 0) + 1 INTO v_next
    FROM packing
    WHERE distributor_id = p_distributor_id
      AND pck_prefix = p_prefix;
    
    RETURN v_next;
END;
$$;

-- ============================================
-- 6. FUNCTION: Auto-set pck_full_number
-- ============================================
CREATE OR REPLACE FUNCTION fn_set_packing_full_number()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_fy VARCHAR(10);
BEGIN
    -- Calculate Financial Year (April to March)
    IF EXTRACT(MONTH FROM NEW.pck_date) >= 4 THEN
        v_fy := TO_CHAR(NEW.pck_date, 'YY') || '-' || TO_CHAR(NEW.pck_date + INTERVAL '1 year', 'YY');
    ELSE
        v_fy := TO_CHAR(NEW.pck_date - INTERVAL '1 year', 'YY') || '-' || TO_CHAR(NEW.pck_date, 'YY');
    END IF;
    
    -- Build full number: PCK/24-25/1
    IF NEW.pck_full_number IS NULL OR NEW.pck_full_number = '' THEN
        NEW.pck_full_number := NEW.pck_prefix || v_fy || '/' || NEW.pck_number::TEXT;
    END IF;
    
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_packing_set_full_number
    BEFORE INSERT ON packing
    FOR EACH ROW
    EXECUTE FUNCTION fn_set_packing_full_number();

-- ============================================
-- 7. FUNCTION: Auto-update timestamp
-- ============================================
CREATE OR REPLACE FUNCTION fn_update_packing_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_packing_updated_at
    BEFORE UPDATE ON packing
    FOR EACH ROW
    EXECUTE FUNCTION fn_update_packing_timestamp();

-- ============================================
-- 8. GRANTS
-- ============================================
GRANT SELECT, INSERT, UPDATE, DELETE ON packing TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON packing_batches TO authenticated;
GRANT EXECUTE ON FUNCTION fn_get_next_pck_number(UUID, VARCHAR) TO authenticated;

-- ============================================
-- END OF PACKING MODULE
-- ============================================
