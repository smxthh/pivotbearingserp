-- ============================================================
-- FINAL FIX: REMOVE GHOST TRIGGERS & CLEANUP DUPLICATES
-- ============================================================

-- 1. DROP *ALL* TRIGGERS ON voucher_items EXCEPT OURS
-- This removes any hidden/legacy triggers causing double counting
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT trigger_name 
        FROM information_schema.triggers 
        WHERE event_object_table = 'voucher_items' 
        AND trigger_name != 'trigger_stock_movement_on_voucher_item'
        AND trigger_schema = 'public'
    LOOP
        EXECUTE 'DROP TRIGGER IF EXISTS ' || quote_ident(r.trigger_name) || ' ON voucher_items';
        RAISE NOTICE 'Dropped ghost trigger: %', r.trigger_name;
    END LOOP;
END $$;

-- 2. CLEANUP LEGACY HEADER-LEVEL STOCK MOVEMENTS
-- If specific triggers were inserting stock stats linked to Voucher ID instead of Item ID,
-- we remove them to prevent double counting.
DELETE FROM stock_movements
WHERE reference_id IN (
    SELECT id FROM vouchers 
    WHERE voucher_type IN ('purchase_invoice', 'tax_invoice')
);

-- 3. CLEANUP DUPLICATE ITEM-LEVEL MOVEMENTS
-- Keep only the latest movement for each voucher item
DELETE FROM stock_movements
WHERE id IN (
    SELECT id FROM (
        SELECT id, ROW_NUMBER() OVER (PARTITION BY reference_id ORDER BY created_at DESC) as rn
        FROM stock_movements
        WHERE reference_id IN (SELECT id FROM voucher_items)
    ) sub
    WHERE rn > 1
);

-- 4. CLEANUP ORPHANED MOVEMENTS
-- Remove movements where the source voucher item was deleted
DELETE FROM stock_movements sm
WHERE reference_id IS NOT NULL 
  AND notes LIKE '%Invoice%' -- target invoice movements
  AND NOT EXISTS (SELECT 1 FROM voucher_items vi WHERE vi.id = sm.reference_id)
  AND NOT EXISTS (SELECT 1 FROM vouchers v WHERE v.id = sm.reference_id);

-- 5. RECALCULATE ALL ITEM STOCK
-- Force update to ensure items match the clean stock_movements
UPDATE items i
SET stock_quantity = (
    SELECT COALESCE(SUM(
        CASE 
            WHEN movement_type IN ('in', 'opening', 'adjustment_in') THEN quantity 
            WHEN movement_type IN ('out', 'adjustment_out') THEN -quantity 
            ELSE 0 
        END
    ), 0)
    FROM stock_movements sm
    WHERE sm.item_id = i.id
);

-- ============================================================
-- RE-VERIFY TRIGGERS (Safe Re-apply)
-- ============================================================

CREATE OR REPLACE FUNCTION reverse_stock_on_voucher_cancel()
RETURNS TRIGGER AS $$
DECLARE
    v_item RECORD;
    v_reversal_exists BOOLEAN;
    v_movement_type TEXT;
    v_narration TEXT;
    v_current_stock NUMERIC;
    v_new_stock NUMERIC;
BEGIN
    -- Only process if status is changing TO 'cancelled'
    IF NEW.status = 'cancelled' AND (OLD.status IS NULL OR OLD.status != 'cancelled') THEN
        
        -- Handle Purchase Invoice cancellation (reverse the stock-in)
        IF NEW.voucher_type = 'purchase_invoice' THEN
            v_movement_type := 'out';
            v_narration := 'STOCK_REVERSAL: Purchase Invoice cancelled';
            
        -- Handle Tax Invoice cancellation (reverse the stock-out, i.e., restore stock)
        ELSIF NEW.voucher_type = 'tax_invoice' THEN
            v_movement_type := 'in';
            v_narration := 'STOCK_REVERSAL: Tax Invoice cancelled';
            
        ELSE
            -- Other voucher types don't affect stock
            RETURN NEW;
        END IF;
        
        -- Process each item in the voucher
        FOR v_item IN 
            SELECT 
                vi.id as voucher_item_id,
                vi.item_id,
                vi.quantity,
                vi.item_name,
                vi.rate,
                i.sku
            FROM voucher_items vi
            LEFT JOIN items i ON i.id = vi.item_id
            WHERE vi.voucher_id = NEW.id
              AND vi.item_id IS NOT NULL
        LOOP
            -- Check if reversal already exists (idempotent check)
            SELECT EXISTS (
                SELECT 1 
                FROM stock_movements 
                WHERE reference_id = v_item.voucher_item_id
                  AND item_id = v_item.item_id
                  AND movement_type = v_movement_type
                  AND notes LIKE 'STOCK_REVERSAL:%'
            ) INTO v_reversal_exists;
            
            IF NOT v_reversal_exists THEN
                -- Get current stock
                SELECT COALESCE(SUM(
                    CASE 
                        WHEN movement_type IN ('in', 'opening', 'adjustment_in') THEN quantity 
                        WHEN movement_type IN ('out', 'adjustment_out') THEN -quantity 
                        ELSE 0 
                    END
                ), 0) INTO v_current_stock
                FROM stock_movements
                WHERE item_id = v_item.item_id 
                  AND distributor_id = NEW.distributor_id;
                
                -- Calculate new stock
                IF v_movement_type = 'out' THEN
                    v_new_stock := v_current_stock - v_item.quantity;
                ELSE
                    v_new_stock := v_current_stock + v_item.quantity;
                END IF;
                
                INSERT INTO stock_movements (
                    id,
                    distributor_id,
                    item_id,
                    movement_type,
                    reference_id,
                    reference_number,
                    quantity,
                    previous_stock,
                    new_stock,
                    rate,
                    notes,
                    created_at
                ) VALUES (
                    gen_random_uuid(),
                    NEW.distributor_id,
                    v_item.item_id,
                    v_movement_type,
                    v_item.voucher_item_id,
                    NEW.voucher_number || ' (Reversed)',
                    v_item.quantity,
                    v_current_stock,
                    v_new_stock,
                    v_item.rate,
                    v_narration || ' - ' || COALESCE(v_item.sku, '') || ' ' || COALESCE(v_item.item_name, ''),
                    NOW()
                );
            END IF;
        END LOOP;
        
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for Cancellation
DROP TRIGGER IF EXISTS trigger_reverse_stock_on_cancel ON vouchers;
CREATE TRIGGER trigger_reverse_stock_on_cancel
    AFTER UPDATE ON vouchers
    FOR EACH ROW
    WHEN (NEW.status = 'cancelled' AND OLD.status != 'cancelled')
    EXECUTE FUNCTION reverse_stock_on_voucher_cancel();

-- Function to handle stock movement on creation
CREATE OR REPLACE FUNCTION create_stock_movement_on_voucher_item()
RETURNS TRIGGER AS $$
DECLARE
    v_voucher RECORD;
    v_current_stock NUMERIC;
    v_new_stock NUMERIC;
    v_movement_type TEXT;
    v_notes TEXT;
BEGIN
    -- Only process if item_id is present
    IF NEW.item_id IS NULL THEN
        RETURN NEW;
    END IF;
    
    -- Get voucher details
    SELECT * INTO v_voucher 
    FROM vouchers 
    WHERE id = NEW.voucher_id;
    
    -- Determine movement type
    IF v_voucher.voucher_type = 'purchase_invoice' THEN
        v_movement_type := 'in';
        v_notes := 'Purchase Invoice: Stock In - ' || COALESCE(NEW.item_name, '');
    ELSIF v_voucher.voucher_type = 'tax_invoice' THEN
        v_movement_type := 'out';
        v_notes := 'Tax Invoice: Stock Out - ' || COALESCE(NEW.item_name, '');
    ELSE
        RETURN NEW;
    END IF;
    
    -- Idempotent check: Check if ANY movement exists for this line item
    IF EXISTS (
        SELECT 1 FROM stock_movements 
        WHERE reference_id = NEW.id
    ) THEN
        RETURN NEW;
    END IF;
    
    -- Get current stock
    SELECT COALESCE(SUM(
        CASE 
            WHEN movement_type IN ('in', 'opening', 'adjustment_in') THEN quantity 
            WHEN movement_type IN ('out', 'adjustment_out') THEN -quantity 
            ELSE 0 
        END
    ), 0) INTO v_current_stock
    FROM stock_movements
    WHERE item_id = NEW.item_id 
      AND distributor_id = v_voucher.distributor_id;
    
    -- Calculate new stock
    IF v_movement_type = 'in' THEN
        v_new_stock := v_current_stock + NEW.quantity;
    ELSE
        v_new_stock := v_current_stock - NEW.quantity;
    END IF;
    
    -- Insert stock movement
    INSERT INTO stock_movements (
        id,
        distributor_id,
        item_id,
        movement_type,
        reference_id,
        reference_number,
        quantity,
        previous_stock,
        new_stock,
        rate,
        notes,
        created_at
    ) VALUES (
        gen_random_uuid(),
        v_voucher.distributor_id,
        NEW.item_id,
        v_movement_type,
        NEW.id,
        v_voucher.voucher_number,
        NEW.quantity,
        v_current_stock,
        v_new_stock,
        NEW.rate,
        v_notes,
        NOW()
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop and Recreate Unified Trigger
DROP TRIGGER IF EXISTS trigger_stock_movement_on_voucher_item ON voucher_items;
CREATE TRIGGER trigger_stock_movement_on_voucher_item
    AFTER INSERT ON voucher_items
    FOR EACH ROW
    EXECUTE FUNCTION create_stock_movement_on_voucher_item();
