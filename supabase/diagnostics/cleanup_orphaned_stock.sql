-- ================================================================
-- CLEANUP: Remove orphaned stock movements (Zombie Stock)
-- Removes stock 'in' records where the parent GI item no longer exists
-- ================================================================

DELETE FROM stock_movements
WHERE id IN (
    SELECT sm.id
    FROM stock_movements sm
    LEFT JOIN gate_inward_items gii ON sm.reference_id = gii.id
    WHERE sm.movement_type = 'in'
      AND gii.id IS NULL
      AND sm.notes LIKE 'Auto-created from Gate Inward%'
);
