-- 1. Add batch_number and location_id to stock_movements
ALTER TABLE stock_movements
ADD COLUMN IF NOT EXISTS batch_number text,
ADD COLUMN IF NOT EXISTS location_id uuid;

-- 2. Create index for performance
CREATE INDEX IF NOT EXISTS idx_stock_movements_batch 
ON stock_movements(item_id, batch_number, location_id);

-- 3. Backfill from Opening Stock
UPDATE stock_movements sm
SET 
    batch_number = os.batch_number,
    location_id = os.location_id
FROM opening_stock os
WHERE sm.reference_id = os.id 
  AND sm.movement_type = 'opening';

-- 4. Backfill from Gate Inward Items (Need to handle joined trigger logic correctly)
-- Since stock_movements for GI are currently inserted by 'sync_voucher_to_stock' which might not capture batch/location...
-- Wait, does 'gate_inward' use 'sync_voucher_to_stock'?
-- If GI uses 'gate_inward_items' table, it likely has its own trigger or RPC.
-- I need to check how GI inserts into stock_movements. 
-- Checking 'dc_stock_sync_trigger.sql' (Step 883 View):
-- "IF TG_OP = 'INSERT' AND NEW.voucher_type = 'gate_inward' THEN ..."
-- It uses (TG_ARGV[1])::uuid for item_id. 
-- It does NOT seem to access batch/location arguments.
-- I will need to Update 'sync_voucher_to_stock' (or creating a new one for GI Items) to pass location/batch.

-- 5. Create Marking Sync Function
CREATE OR REPLACE FUNCTION sync_marking_to_stock()
RETURNS TRIGGER AS $$
DECLARE
    v_distributor_id uuid;
    v_item_id uuid;
    v_date date;
BEGIN
    -- Get Marking Header Info
    SELECT distributor_id, item_id, mrk_date INTO v_distributor_id, v_item_id, v_date
    FROM marking WHERE id = NEW.marking_id;

    IF TG_OP = 'INSERT' THEN
        INSERT INTO stock_movements (
            id, distributor_id, item_id, movement_type, reference_id, reference_number, quantity, 
            created_at, notes, batch_number, location_id
        ) VALUES (
            gen_random_uuid(),
            v_distributor_id,
            v_item_id,
            'out', -- Marking consumes the raw batch
            NEW.marking_id,
            'MRK-' || NEW.batch_number,
            NEW.quantity, -- Marking Batch Qty
            v_date,
            'Marking Consumption: ' || NEW.batch_number,
            NEW.batch_number,
            NEW.location_id
        );
    ELSIF TG_OP = 'DELETE' THEN
        DELETE FROM stock_movements 
        WHERE reference_id = OLD.marking_id 
          AND batch_number = OLD.batch_number 
          AND movement_type = 'out';
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Trigger for Marking Batches
DROP TRIGGER IF EXISTS trg_marking_stock_sync ON marking_batches;
CREATE TRIGGER trg_marking_stock_sync
AFTER INSERT OR DELETE ON marking_batches
FOR EACH ROW EXECUTE FUNCTION sync_marking_to_stock();

-- 7. Create Batch Stock Ledger View
CREATE OR REPLACE VIEW view_batch_stock_ledger AS
SELECT 
    sm.item_id,
    sm.batch_number,
    sm.location_id,
    sm.distributor_id,
    SUM(
        CASE 
            WHEN movement_type IN ('in', 'adjustment_in', 'opening', 'purchase_return') THEN quantity
            WHEN movement_type IN ('out', 'adjustment_out', 'sale', 'purchase', 'sale_return') THEN -quantity
            ELSE 0 
        END
    ) as quantity
FROM stock_movements sm
WHERE sm.batch_number IS NOT NULL AND sm.location_id IS NOT NULL
GROUP BY sm.item_id, sm.batch_number, sm.location_id, sm.distributor_id;
