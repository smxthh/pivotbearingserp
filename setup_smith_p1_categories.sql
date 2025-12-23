-- ============================================
-- CREATE MULTI-LEVEL CATEGORY STRUCTURE
-- ============================================
-- This sets up: Products > Smith > p1
-- You'll be able to add products to "p1"

DO $$
DECLARE
  v_distributor_id uuid;
  v_products_id uuid;
  v_smith_id uuid;
  v_p1_id uuid;
BEGIN
  -- Get distributor ID
  SELECT id INTO v_distributor_id FROM distributor_profiles LIMIT 1;
  
  IF v_distributor_id IS NULL THEN
    RAISE EXCEPTION 'No distributor profile found';
  END IF;
  
  -- Ensure "Products" root exists
  INSERT INTO categories (distributor_id, name, parent_id, is_final, is_active, category_type)
  VALUES (v_distributor_id, 'Products', NULL, false, true, 'product')
  ON CONFLICT DO NOTHING;
  
  SELECT id INTO v_products_id FROM categories 
  WHERE name = 'Products' AND parent_id IS NULL AND distributor_id = v_distributor_id;
  
  -- Create "Smith" under Products
  INSERT INTO categories (distributor_id, name, parent_id, is_final, is_active, category_type)
  VALUES (v_distributor_id, 'Smith', v_products_id, false, true, 'product')
  ON CONFLICT DO NOTHING;
  
  SELECT id INTO v_smith_id FROM categories 
  WHERE name = 'Smith' AND parent_id = v_products_id AND distributor_id = v_distributor_id;
  
  -- Create "p1" under Smith (FINAL - you can add products here)
  INSERT INTO categories (distributor_id, name, parent_id, is_final, is_active, category_type)
  VALUES (v_distributor_id, 'p1', v_smith_id, true, true, 'product')
  ON CONFLICT DO NOTHING;
  
  RAISE NOTICE '✓ Category hierarchy created:';
  RAISE NOTICE '  Products → Smith → p1';
  RAISE NOTICE '  You can now add products under "p1"';
END $$;

-- View the full hierarchy
WITH RECURSIVE category_tree AS (
  SELECT 
    id, 
    name, 
    parent_id,
    name as path,
    0 as level,
    is_final
  FROM categories 
  WHERE parent_id IS NULL AND is_active = true
  
  UNION ALL
  
  SELECT 
    c.id, 
    c.name, 
    c.parent_id,
    ct.path || ' → ' || c.name,
    ct.level + 1,
    c.is_final
  FROM categories c
  INNER JOIN category_tree ct ON c.parent_id = ct.id
  WHERE c.is_active = true
)
SELECT 
  REPEAT('  ', level) || name as "Category Hierarchy",
  CASE WHEN is_final THEN '✓ Can add products' ELSE '✗ Parent only' END as "Status"
FROM category_tree
ORDER BY path;
