-- ================================================================
-- INVENTORY INTEGRATION: Gate Inward -> Stock Movements
-- Automatically update stock when Gate Inward items are added/deleted
-- ================================================================

-- Function to add stock movement when gate_inward_item is inserted
CREATE OR REPLACE FUNCTION public.sync_gate_inward_to_stock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    v_gi_record RECORD;
    v_current_stock NUMERIC;
    v_new_stock NUMERIC;
BEGIN
    -- Handle INSERT: Add stock
    IF TG_OP = 'INSERT' THEN
        -- Get parent gate_inward info
        SELECT gi.distributor_id, gi.gi_number 
        INTO v_gi_record 
        FROM gate_inwards gi 
        WHERE gi.id = NEW.gate_inward_id;
        
        IF v_gi_record IS NULL THEN
            RAISE EXCEPTION 'Gate Inward record not found for id: %', NEW.gate_inward_id;
        END IF;
        
        -- Get current stock for this item (sum of all movements)
        SELECT COALESCE(SUM(
            CASE 
                WHEN movement_type IN ('in', 'opening', 'adjustment_in') THEN quantity 
                WHEN movement_type IN ('out', 'adjustment_out') THEN -quantity 
                ELSE 0 
            END
        ), 0) INTO v_current_stock
        FROM stock_movements
        WHERE item_id = NEW.item_id 
          AND distributor_id = v_gi_record.distributor_id;
        
        v_new_stock := v_current_stock + NEW.quantity;
        
        -- Insert stock movement record
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
            v_gi_record.distributor_id,
            NEW.item_id,
            'in',  -- Gate Inward = Stock IN
            NEW.id,  -- Reference to gate_inward_item
            v_gi_record.gi_number,
            NEW.quantity,
            v_current_stock,
            v_new_stock,
            NEW.price,
            'Auto-created from Gate Inward: ' || v_gi_record.gi_number,
            NOW()
        );
        
        RETURN NEW;
    END IF;
    
    -- Handle DELETE: Reverse stock
    IF TG_OP = 'DELETE' THEN
        -- Get parent gate_inward info
        SELECT gi.distributor_id, gi.gi_number 
        INTO v_gi_record 
        FROM gate_inwards gi 
        WHERE gi.id = OLD.gate_inward_id;
        
        IF v_gi_record IS NOT NULL THEN
            -- Get current stock
            SELECT COALESCE(SUM(
                CASE 
                    WHEN movement_type IN ('in', 'opening', 'adjustment_in') THEN quantity 
                    WHEN movement_type IN ('out', 'adjustment_out') THEN -quantity 
                    ELSE 0 
                END
            ), 0) INTO v_current_stock
            FROM stock_movements
            WHERE item_id = OLD.item_id 
              AND distributor_id = v_gi_record.distributor_id;
            
            v_new_stock := v_current_stock - OLD.quantity;
            
            -- Insert reversal movement
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
                v_gi_record.distributor_id,
                OLD.item_id,
                'out',  -- Reversal = Stock OUT
                OLD.id,
                v_gi_record.gi_number || ' (Reversed)',
                OLD.quantity,
                v_current_stock,
                v_new_stock,
                OLD.price,
                'Auto-reversed: Gate Inward item deleted',
                NOW()
            );
        END IF;
        
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$function$;

-- Create trigger on gate_inward_items
DROP TRIGGER IF EXISTS trg_gate_inward_stock_sync ON public.gate_inward_items;
CREATE TRIGGER trg_gate_inward_stock_sync
    AFTER INSERT OR DELETE ON public.gate_inward_items
    FOR EACH ROW
    EXECUTE FUNCTION sync_gate_inward_to_stock();
