-- ================================================================
-- FIX: Allow Product Deletion by Adding CASCADE Delete
-- ================================================================
-- This updates foreign key constraints to automatically delete
-- related entries when a product is deleted
-- ================================================================

-- Step 1: Fix price_structure_items table
ALTER TABLE price_structure_items
DROP CONSTRAINT IF EXISTS price_structure_items_item_id_fkey;

ALTER TABLE price_structure_items
ADD CONSTRAINT price_structure_items_item_id_fkey
FOREIGN KEY (item_id)
REFERENCES items(id)
ON DELETE CASCADE;  -- Automatically delete price entries when product is deleted

-- Step 2: Fix voucher_items (set to NULL to preserve history)
ALTER TABLE voucher_items
DROP CONSTRAINT IF EXISTS voucher_items_item_id_fkey;

ALTER TABLE voucher_items
ADD CONSTRAINT voucher_items_item_id_fkey
FOREIGN KEY (item_id)
REFERENCES items(id)
ON DELETE SET NULL;  -- Allow delete, just set item_id to NULL in vouchers

-- Step 3: Fix purchase_order_items (set to NULL)
ALTER TABLE purchase_order_items
DROP CONSTRAINT IF EXISTS purchase_order_items_item_id_fkey;

ALTER TABLE purchase_order_items
ADD CONSTRAINT purchase_order_items_item_id_fkey
FOREIGN KEY (item_id)
REFERENCES items(id)
ON DELETE SET NULL;  -- Preserve order history

-- ================================================================
-- VERIFICATION
-- ================================================================
-- Check all foreign keys pointing to items table
SELECT
    tc.table_name,
    kcu.column_name,
    rc.delete_rule
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.referential_constraints rc
    ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND kcu.table_schema = 'public'
  AND rc.unique_constraint_schema = 'public'
  AND EXISTS (
      SELECT 1
      FROM information_schema.key_column_usage kcu2
      WHERE kcu2.constraint_name = rc.unique_constraint_name
        AND kcu2.table_name = 'items'
  )
ORDER BY tc.table_name;
