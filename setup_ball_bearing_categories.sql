-- ============================================
-- SETUP CATEGORY HIERARCHY FOR BALL BEARINGS
-- ============================================
-- Run this in: Supabase Dashboard > SQL Editor
-- This creates a 3-level hierarchy:
-- Products (root) → Ball Bearing → Specific Types

DO $$
DECLARE
  v_distributor_id uuid;
  v_products_id uuid;
  v_ball_bearing_id uuid;
BEGIN
  -- Get the distributor ID automatically
  SELECT id INTO v_distributor_id FROM distributor_profiles LIMIT 1;
  
  IF v_distributor_id IS NULL THEN
    RAISE EXCEPTION 'No distributor profile found. Please create a distributor profile first.';
  END IF;
  
  RAISE NOTICE 'Using distributor ID: %', v_distributor_id;
  
  -- LEVEL 1: Create "Products" root category
  INSERT INTO categories (distributor_id, name, parent_id, is_final, is_active, category_type)
  VALUES (v_distributor_id, 'Products', NULL, false, true, 'product')
  ON CONFLICT DO NOTHING;
  
  SELECT id INTO v_products_id FROM categories 
  WHERE name = 'Products' AND parent_id IS NULL AND distributor_id = v_distributor_id;
  
  RAISE NOTICE 'Products category ID: %', v_products_id;
  
  -- LEVEL 2: Create "Ball Bearing" under Products
  -- is_final = false because it will have children
  INSERT INTO categories (distributor_id, name, parent_id, is_final, is_active, category_type)
  VALUES (v_distributor_id, 'Ball Bearing', v_products_id, false, true, 'product')
  ON CONFLICT DO NOTHING;
  
  SELECT id INTO v_ball_bearing_id FROM categories 
  WHERE name = 'Ball Bearing' AND parent_id = v_products_id AND distributor_id = v_distributor_id;
  
  RAISE NOTICE 'Ball Bearing category ID: %', v_ball_bearing_id;
  
  -- LEVEL 3: Create specific Ball Bearing types (FINAL - products go here)
  INSERT INTO categories (distributor_id, name, parent_id, is_final, is_active, category_type)
  VALUES 
    (v_distributor_id, 'Deep Groove Ball Bearing', v_ball_bearing_id, true, true, 'product'),
    (v_distributor_id, 'Angular Contact Ball Bearing', v_ball_bearing_id, true, true, 'product'),
    (v_distributor_id, 'Thrust Ball Bearing', v_ball_bearing_id, true, true, 'product'),
    (v_distributor_id, 'Self-Aligning Ball Bearing', v_ball_bearing_id, true, true, 'product')
  ON CONFLICT DO NOTHING;
  
  RAISE NOTICE '✓ Category hierarchy created successfully!';
  RAISE NOTICE '✓ You can now add products under:';
  RAISE NOTICE '  - Deep Groove Ball Bearing';
  RAISE NOTICE '  - Angular Contact Ball Bearing';
  RAISE NOTICE '  - Thrust Ball Bearing';
  RAISE NOTICE '  - Self-Aligning Ball Bearing';
END $$;

-- Verify the hierarchy
SELECT 
  CASE 
    WHEN parent_id IS NULL THEN name
    ELSE '  → ' || name
  END as category_tree,
  is_final,
  is_active
FROM categories
WHERE is_active = true
ORDER BY 
  COALESCE(parent_id, id),
  name;
