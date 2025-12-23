-- ============================================
-- MARKING MODULE - Complete Schema & Logic
-- ============================================
-- Idempotent: Safe to run multiple times.
-- Tables are created IF NOT EXISTS, preserving data.
-- Functions/Triggers are DROP/CREATE to update logic.
-- ============================================

-- ============================================
-- 0. CLEANUP (Functions & Triggers Only)
-- ============================================
DROP TRIGGER IF EXISTS trg_marking_set_full_number ON public.marking;
DROP TRIGGER IF EXISTS trg_marking_updated_at ON public.marking;

DROP FUNCTION IF EXISTS fn_get_next_mrk_number(UUID, VARCHAR) CASCADE;
DROP FUNCTION IF EXISTS fn_set_marking_full_number() CASCADE;
DROP FUNCTION IF EXISTS fn_update_marking_timestamp() CASCADE;

-- ============================================
-- 1. MARKING TABLE (Header)
-- ============================================
CREATE TABLE IF NOT EXISTS public.marking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    distributor_id UUID NOT NULL REFERENCES distributor_profiles(id) ON DELETE CASCADE,
    
    -- Marking Number
    mrk_prefix VARCHAR(20) DEFAULT 'MRK/',
    mrk_number INTEGER NOT NULL,
    mrk_full_number VARCHAR(50) NOT NULL,
    
    -- Core Details
    mrk_date DATE NOT NULL DEFAULT CURRENT_DATE,
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
    UNIQUE(distributor_id, mrk_full_number)
);

-- ============================================
-- 2. MARKING BATCHES TABLE (Line Items)
-- ============================================
CREATE TABLE IF NOT EXISTS public.marking_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    marking_id UUID NOT NULL REFERENCES marking(id) ON DELETE CASCADE,
    
    -- Batch Information
    location_id UUID NOT NULL REFERENCES store_locations(id) ON DELETE RESTRICT,
    batch_number VARCHAR(100) NOT NULL,
    
    -- Stock Information
    stock_quantity NUMERIC(12,3) NOT NULL DEFAULT 0,
    quantity NUMERIC(12,3) NOT NULL DEFAULT 0,
    
    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT marking_batches_qty_positive CHECK (quantity > 0),
    CONSTRAINT marking_batches_qty_lte_stock CHECK (quantity <= stock_quantity)
);

-- ============================================
-- 3. INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_marking_distributor ON marking(distributor_id);
CREATE INDEX IF NOT EXISTS idx_marking_item ON marking(item_id);
CREATE INDEX IF NOT EXISTS idx_marking_location ON marking(location_id);
CREATE INDEX IF NOT EXISTS idx_marking_date ON marking(mrk_date DESC);
CREATE INDEX IF NOT EXISTS idx_marking_full_number ON marking(mrk_full_number);
CREATE INDEX IF NOT EXISTS idx_marking_batches_marking ON marking_batches(marking_id);

-- ============================================
-- 4. ROW LEVEL SECURITY
-- ============================================
ALTER TABLE marking ENABLE ROW LEVEL SECURITY;
ALTER TABLE marking_batches ENABLE ROW LEVEL SECURITY;

-- Marking Policies
DROP POLICY IF EXISTS "marking_select_policy" ON marking;
CREATE POLICY "marking_select_policy" ON marking FOR SELECT
    USING (distributor_id IN (SELECT id FROM distributor_profiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "marking_insert_policy" ON marking;
CREATE POLICY "marking_insert_policy" ON marking FOR INSERT
    WITH CHECK (distributor_id IN (SELECT id FROM distributor_profiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "marking_update_policy" ON marking;
CREATE POLICY "marking_update_policy" ON marking FOR UPDATE
    USING (distributor_id IN (SELECT id FROM distributor_profiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "marking_delete_policy" ON marking;
CREATE POLICY "marking_delete_policy" ON marking FOR DELETE
    USING (distributor_id IN (SELECT id FROM distributor_profiles WHERE user_id = auth.uid()));

-- Marking Batches Policies
DROP POLICY IF EXISTS "marking_batches_select_policy" ON marking_batches;
CREATE POLICY "marking_batches_select_policy" ON marking_batches FOR SELECT
    USING (marking_id IN (SELECT id FROM marking));

DROP POLICY IF EXISTS "marking_batches_insert_policy" ON marking_batches;
CREATE POLICY "marking_batches_insert_policy" ON marking_batches FOR INSERT
    WITH CHECK (marking_id IN (SELECT id FROM marking));

DROP POLICY IF EXISTS "marking_batches_update_policy" ON marking_batches;
CREATE POLICY "marking_batches_update_policy" ON marking_batches FOR UPDATE
    USING (marking_id IN (SELECT id FROM marking));

DROP POLICY IF EXISTS "marking_batches_delete_policy" ON marking_batches;
CREATE POLICY "marking_batches_delete_policy" ON marking_batches FOR DELETE
    USING (marking_id IN (SELECT id FROM marking));

-- ============================================
-- 5. FUNCTION: Get Next Marking Number
-- ============================================
CREATE OR REPLACE FUNCTION fn_get_next_mrk_number(
    p_distributor_id UUID,
    p_prefix VARCHAR DEFAULT 'MRK/'
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_next INTEGER;
BEGIN
    SELECT COALESCE(MAX(mrk_number), 0) + 1 INTO v_next
    FROM marking
    WHERE distributor_id = p_distributor_id
      AND mrk_prefix = p_prefix;
    
    RETURN v_next;
END;
$$;

-- ============================================
-- 6. FUNCTION: Auto-set mrk_full_number
-- ============================================
CREATE OR REPLACE FUNCTION fn_set_marking_full_number()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_fy VARCHAR(10);
BEGIN
    -- Calculate Financial Year (April to March)
    IF EXTRACT(MONTH FROM NEW.mrk_date) >= 4 THEN
        v_fy := TO_CHAR(NEW.mrk_date, 'YY') || '-' || TO_CHAR(NEW.mrk_date + INTERVAL '1 year', 'YY');
    ELSE
        v_fy := TO_CHAR(NEW.mrk_date - INTERVAL '1 year', 'YY') || '-' || TO_CHAR(NEW.mrk_date, 'YY');
    END IF;
    
    -- Build full number: MRK/24-25/1
    IF NEW.mrk_full_number IS NULL OR NEW.mrk_full_number = '' THEN
        NEW.mrk_full_number := NEW.mrk_prefix || v_fy || '/' || NEW.mrk_number::TEXT;
    END IF;
    
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_marking_set_full_number
    BEFORE INSERT ON marking
    FOR EACH ROW
    EXECUTE FUNCTION fn_set_marking_full_number();

-- ============================================
-- 7. FUNCTION: Auto-update timestamp
-- ============================================
CREATE OR REPLACE FUNCTION fn_update_marking_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_marking_updated_at
    BEFORE UPDATE ON marking
    FOR EACH ROW
    EXECUTE FUNCTION fn_update_marking_timestamp();

-- ============================================
-- 8. GRANTS
-- ============================================
GRANT SELECT, INSERT, UPDATE, DELETE ON marking TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON marking_batches TO authenticated;
GRANT EXECUTE ON FUNCTION fn_get_next_mrk_number(UUID, VARCHAR) TO authenticated;

-- ============================================
-- END OF MARKING MODULE
-- ============================================
