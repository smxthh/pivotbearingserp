-- ================================================================
-- STOCK LEDGER VIEW
-- Aggregates all stock movements to show "Live Stock"
-- ================================================================

CREATE OR REPLACE VIEW view_stock_ledger AS
SELECT 
    sm.item_id,
    i.name as item_name,
    sm.distributor_id,
    SUM(
        CASE 
            WHEN sm.movement_type IN ('in', 'opening', 'adjustment_in') THEN sm.quantity 
            WHEN sm.movement_type IN ('out', 'adjustment_out') THEN -sm.quantity 
            ELSE 0 
        END
    ) as current_stock,
    MAX(sm.created_at) as last_updated
FROM stock_movements sm
JOIN items i ON sm.item_id = i.id
GROUP BY sm.item_id, i.name, sm.distributor_id;

-- Grant access
GRANT SELECT ON view_stock_ledger TO authenticated;
