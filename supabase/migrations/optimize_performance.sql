-- ============================================
-- PERFORMANCE OPTIMIZATION
-- ============================================
-- Add composite indexes for common query patterns in Marking and Packing modules

-- Marking: Filter by distributor + sort by date
CREATE INDEX IF NOT EXISTS idx_marking_distributor_date ON marking(distributor_id, mrk_date DESC);

-- Packing: Filter by distributor + sort by date
CREATE INDEX IF NOT EXISTS idx_packing_distributor_date ON packing(distributor_id, pck_date DESC);

-- Add indexes for joined columns if they don't exist
CREATE INDEX IF NOT EXISTS idx_marking_item_id ON marking(item_id);
CREATE INDEX IF NOT EXISTS idx_marking_location_id ON marking(location_id);
CREATE INDEX IF NOT EXISTS idx_packing_item_id ON packing(item_id);
CREATE INDEX IF NOT EXISTS idx_packing_location_id ON packing(location_id);
