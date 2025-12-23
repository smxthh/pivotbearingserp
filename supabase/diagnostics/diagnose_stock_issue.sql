-- Diagnostic Queries for Gate Inward Stock Issue
-- Run these in Supabase SQL Editor

-- 1. Check if the trigger exists
SELECT 
    tgname AS trigger_name,
    tgenabled AS enabled,
    proname AS function_name
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE tgrelid = 'gate_inward_items'::regclass;

-- 2. Check if the function exists
SELECT proname, prosrc 
FROM pg_proc 
WHERE proname = 'sync_gate_inward_to_stock';

-- 3. Check gate_inward_items for GI/25-26/7 and GI/25-26/8
SELECT 
    gi.gi_number,
    gi.id as gi_id,
    gii.id as item_id,
    gii.item_id as product_id,
    gii.quantity,
    gii.created_at
FROM gate_inwards gi
JOIN gate_inward_items gii ON gi.id = gii.gate_inward_id
WHERE gi.gi_number IN ('GI/25-26/7', 'GI/25-26/8')
ORDER BY gi.created_at DESC;

-- 4. Check if stock_movements were created for these GI entries
SELECT 
    sm.*,
    i.name as item_name
FROM stock_movements sm
LEFT JOIN items i ON sm.item_id = i.id
WHERE sm.reference_number IN ('GI/25-26/7', 'GI/25-26/8')
ORDER BY sm.created_at DESC;

-- 5. Check current stock levels
SELECT 
    i.sku,
    i.name,
    COALESCE(SUM(
        CASE 
            WHEN sm.movement_type IN ('in', 'opening', 'adjustment_in') THEN sm.quantity
            WHEN sm.movement_type IN ('out', 'adjustment_out') THEN -sm.quantity
            ELSE 0
        END
    ), 0) as current_stock
FROM items i
LEFT JOIN stock_movements sm ON i.id = sm.item_id
GROUP BY i.id, i.sku, i.name
ORDER BY i.name;

-- 6. Check if there are any errors in gate_inward creation
SELECT * FROM gate_inwards 
WHERE gi_number IN ('GI/25-26/7', 'GI/25-26/8')
ORDER BY created_at DESC;
