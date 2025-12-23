-- ================================================================
-- STOCK SYNCHRONIZATION: stock_movements -> items.stock_quantity
-- Automatically update item master stock when movements occur
-- ================================================================

CREATE OR REPLACE FUNCTION public.update_item_stock_from_movement()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    v_item_id UUID;
    v_total_stock NUMERIC;
BEGIN
    IF TG_OP = 'DELETE' THEN
        v_item_id := OLD.item_id;
    ELSE
        v_item_id := NEW.item_id;
    END IF;

    -- Calculate total stock for this specific item
    -- COALESCE ensures we return 0 instead of NULL if no movements exist
    SELECT COALESCE(SUM(
        CASE 
            WHEN movement_type IN ('in', 'opening', 'adjustment_in') THEN quantity 
            WHEN movement_type IN ('out', 'adjustment_out') THEN -quantity 
            ELSE 0 
        END
    ), 0) INTO v_total_stock
    FROM stock_movements
    WHERE item_id = v_item_id;

    -- Update item master with the calculated total
    UPDATE items 
    SET stock_quantity = v_total_stock,
        updated_at = NOW()
    WHERE id = v_item_id;

    RETURN NULL;
END;
$function$;

-- Create trigger on stock_movements
DROP TRIGGER IF EXISTS trg_update_item_stock ON public.stock_movements;
CREATE TRIGGER trg_update_item_stock
    AFTER INSERT OR UPDATE OR DELETE ON public.stock_movements
    FOR EACH ROW
    EXECUTE FUNCTION update_item_stock_from_movement();

-- Backfill: Recalculate stock for ALL items to ensure consistency
-- This fixes any existing discrepancies
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
