-- ================================================================
-- FIX: Gate Inward Delete -> Stock Sync
-- Handle cascade deletion where parent GI is already gone
-- ================================================================

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
        
        -- Get current stock calculation (read from stock_movements mostly for history, 
        -- but items.stock_quantity is now the fast path. We stick to movement sum for consistency)
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
            created_at,
            batch_number,
            location_id
        ) VALUES (
            gen_random_uuid(),
            v_gi_record.distributor_id,
            NEW.item_id,
            'in',
            NEW.id,
            v_gi_record.gi_number,
            NEW.quantity,
            v_current_stock,
            v_new_stock,
            NEW.price,
            'Auto-created from Gate Inward: ' || v_gi_record.gi_number,
            NOW(),
            NEW.batch_number,
            NEW.location_id
        );
        
        RETURN NEW;
    END IF;
    
    -- Handle DELETE: Reverse stock or Clean up
    IF TG_OP = 'DELETE' THEN
        -- Try to find parent
        SELECT gi.distributor_id, gi.gi_number 
        INTO v_gi_record 
        FROM gate_inwards gi 
        WHERE gi.id = OLD.gate_inward_id;
        
        IF v_gi_record IS NOT NULL THEN
            -- Parent exists: Single item deletion or manual removal.
            -- Add a REVERSAL entry (Audit trail preferable here)
            
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
                created_at,
                batch_number,
                location_id
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
                NOW(),
                OLD.batch_number,
                OLD.location_id
            );
        ELSE
            -- Parent is GONE (Cascade Delete):
            -- We cannot add a reliable reversal because we lack distributor_id/gi_number.
            -- Instead, we clean up the ORIGINAL 'in' movement. 
            -- This makes it as if the entry never happened.
            -- The trigger on stock_movements (delete) will fire and update item stock.
            
            DELETE FROM stock_movements 
            WHERE reference_id = OLD.id 
              AND movement_type = 'in';
              
        END IF;
        
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$function$;
