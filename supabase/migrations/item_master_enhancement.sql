-- ============================================================
-- ITEM MASTER ENHANCEMENT - COMPLETE SQL MIGRATION
-- ============================================================
-- This migration creates a comprehensive hierarchical inventory
-- management system with categories, subcategories, brands,
-- HSN codes, products, and service items.
-- ============================================================

-- ============================================================
-- 1. CATEGORY TYPE ENUM
-- ============================================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'category_type') THEN
        CREATE TYPE category_type AS ENUM ('product', 'service', 'both');
    END IF;
END$$;

-- ============================================================
-- 2. ITEM TYPE ENUM
-- ============================================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'item_type') THEN
        CREATE TYPE item_type AS ENUM ('product', 'service');
    END IF;
END$$;

-- ============================================================
-- 3. ENHANCE CATEGORIES TABLE
-- ============================================================
-- Add hierarchical support and additional fields

-- Add parent_id for hierarchy (self-referencing)
ALTER TABLE categories ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES categories(id) ON DELETE SET NULL;

-- Add category type
ALTER TABLE categories ADD COLUMN IF NOT EXISTS category_type category_type DEFAULT 'product';

-- Add is_final (can items be added to this category?)
ALTER TABLE categories ADD COLUMN IF NOT EXISTS is_final BOOLEAN DEFAULT false;

-- Add is_returnable
ALTER TABLE categories ADD COLUMN IF NOT EXISTS is_returnable BOOLEAN DEFAULT false;

-- Add remark
ALTER TABLE categories ADD COLUMN IF NOT EXISTS remark TEXT;

-- Add sort order for display
ALTER TABLE categories ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- Add is_active
ALTER TABLE categories ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Create index for hierarchy queries
CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_categories_distributor_parent ON categories(distributor_id, parent_id);
CREATE INDEX IF NOT EXISTS idx_categories_is_final ON categories(is_final) WHERE is_final = true;

-- ============================================================
-- 4. BRANDS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS brands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    distributor_id UUID NOT NULL REFERENCES distributor_profiles(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    logo_url TEXT,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Unique brand name per distributor
    CONSTRAINT unique_brand_per_distributor UNIQUE (distributor_id, name)
);

COMMENT ON TABLE brands IS 'Brand master for products';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_brands_distributor_id ON brands(distributor_id);
CREATE INDEX IF NOT EXISTS idx_brands_name ON brands(name);

-- ============================================================
-- 5. HSN CODES TABLE (Master Data)
-- ============================================================
CREATE TABLE IF NOT EXISTS hsn_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(10) NOT NULL UNIQUE,
    description TEXT,
    gst_rate DECIMAL(5, 2) DEFAULT 18.00,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE hsn_codes IS 'HSN (Harmonized System of Nomenclature) codes for products';

-- Create index
CREATE INDEX IF NOT EXISTS idx_hsn_codes_code ON hsn_codes(code);

-- Insert common HSN codes for bearings business
INSERT INTO hsn_codes (code, description, gst_rate) VALUES
    ('8482', 'Ball or roller bearings', 18.00),
    ('84821010', 'Ball bearings', 18.00),
    ('84821020', 'Tapered roller bearings', 18.00),
    ('84821030', 'Spherical roller bearings', 18.00),
    ('84821040', 'Needle roller bearings', 18.00),
    ('84822010', 'Tapered roller bearings, including cone and tapered roller assemblies', 18.00),
    ('84823000', 'Spherical roller bearings', 18.00),
    ('84824000', 'Needle roller bearings', 18.00),
    ('84825000', 'Cylindrical roller bearings', 18.00),
    ('8483', 'Transmission shafts and cranks', 18.00),
    ('8484', 'Gaskets and similar joints', 18.00),
    ('8487', 'Machinery parts', 18.00),
    ('4016', 'Rubber articles', 18.00),
    ('7318', 'Screws, bolts, nuts', 18.00),
    ('7326', 'Iron or steel articles', 18.00),
    ('3403', 'Lubricating preparations', 18.00),
    ('9988', 'Manufacturing services', 18.00),
    ('9987', 'Other business services', 18.00),
    ('9983', 'Leasing or rental services', 18.00),
    ('9985', 'Support services', 18.00)
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- 6. SAC CODES TABLE (for Services)
-- ============================================================
CREATE TABLE IF NOT EXISTS sac_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(10) NOT NULL UNIQUE,
    description TEXT,
    gst_rate DECIMAL(5, 2) DEFAULT 18.00,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE sac_codes IS 'SAC (Service Accounting Codes) for services';

-- Create index
CREATE INDEX IF NOT EXISTS idx_sac_codes_code ON sac_codes(code);

-- Insert common SAC codes
INSERT INTO sac_codes (code, description, gst_rate) VALUES
    ('998714', 'Installation services', 18.00),
    ('998715', 'Maintenance and repair services', 18.00),
    ('998729', 'Consulting services', 18.00),
    ('998731', 'Engineering services', 18.00),
    ('997212', 'Transportation services', 18.00),
    ('998599', 'Other support services', 18.00)
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- 7. ENHANCE ITEMS TABLE
-- ============================================================

-- Add item type
ALTER TABLE items ADD COLUMN IF NOT EXISTS item_type item_type DEFAULT 'product';

-- Add item code (unique per distributor)
ALTER TABLE items ADD COLUMN IF NOT EXISTS item_code VARCHAR(50);

-- Add HSN/SAC code references
ALTER TABLE items ADD COLUMN IF NOT EXISTS hsn_code_id UUID REFERENCES hsn_codes(id) ON DELETE SET NULL;
ALTER TABLE items ADD COLUMN IF NOT EXISTS sac_code_id UUID REFERENCES sac_codes(id) ON DELETE SET NULL;

-- Add brand reference
ALTER TABLE items ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES brands(id) ON DELETE SET NULL;

-- Add MRP (Maximum Retail Price - inclusive of tax)
ALTER TABLE items ADD COLUMN IF NOT EXISTS mrp DECIMAL(12, 2);

-- Add weight
ALTER TABLE items ADD COLUMN IF NOT EXISTS weight_kg DECIMAL(10, 3);

-- Add stock limits
ALTER TABLE items ADD COLUMN IF NOT EXISTS min_stock_qty INTEGER DEFAULT 0;
ALTER TABLE items ADD COLUMN IF NOT EXISTS max_stock_qty INTEGER DEFAULT 0;

-- Add product description
ALTER TABLE items ADD COLUMN IF NOT EXISTS product_description TEXT;

-- Add product image
ALTER TABLE items ADD COLUMN IF NOT EXISTS product_image_url TEXT;

-- Add is_returnable
ALTER TABLE items ADD COLUMN IF NOT EXISTS is_returnable BOOLEAN DEFAULT true;

-- Add application users (JSON array for multi-select)
ALTER TABLE items ADD COLUMN IF NOT EXISTS application_users TEXT[];

-- Indexes
CREATE INDEX IF NOT EXISTS idx_items_item_type ON items(item_type);
CREATE INDEX IF NOT EXISTS idx_items_item_code ON items(item_code);
CREATE INDEX IF NOT EXISTS idx_items_brand_id ON items(brand_id);
CREATE INDEX IF NOT EXISTS idx_items_hsn_code_id ON items(hsn_code_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_items_unique_code_per_distributor ON items(distributor_id, item_code) WHERE item_code IS NOT NULL;

-- ============================================================
-- 8. RLS POLICIES FOR BRANDS
-- ============================================================
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;

-- Select policies
CREATE POLICY "Distributors can view their brands"
ON brands FOR SELECT
USING (
    distributor_id IN (
        SELECT id FROM distributor_profiles WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Salespersons can view their distributor brands"
ON brands FOR SELECT
USING (
    distributor_id IN (
        SELECT distributor_id FROM salespersons WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Admins can view all brands"
ON brands FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'admin'
    )
);

-- Insert policies
CREATE POLICY "Distributors can insert their brands"
ON brands FOR INSERT
WITH CHECK (
    distributor_id IN (
        SELECT id FROM distributor_profiles WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Admins can insert brands"
ON brands FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'admin'
    )
);

-- Update policies
CREATE POLICY "Distributors can update their brands"
ON brands FOR UPDATE
USING (
    distributor_id IN (
        SELECT id FROM distributor_profiles WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Admins can update all brands"
ON brands FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'admin'
    )
);

-- Delete policies
CREATE POLICY "Distributors can delete their brands"
ON brands FOR DELETE
USING (
    distributor_id IN (
        SELECT id FROM distributor_profiles WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Admins can delete all brands"
ON brands FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'admin'
    )
);

-- ============================================================
-- 9. RLS POLICIES FOR HSN CODES (Read-only for all)
-- ============================================================
ALTER TABLE hsn_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view HSN codes"
ON hsn_codes FOR SELECT
USING (true);

-- ============================================================
-- 10. RLS POLICIES FOR SAC CODES (Read-only for all)
-- ============================================================
ALTER TABLE sac_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view SAC codes"
ON sac_codes FOR SELECT
USING (true);

-- ============================================================
-- 11. TRIGGERS FOR AUTO-UPDATE TIMESTAMPS
-- ============================================================

-- Brands updated_at trigger
CREATE OR REPLACE FUNCTION update_brands_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_brands_updated_at ON brands;
CREATE TRIGGER update_brands_updated_at
BEFORE UPDATE ON brands
FOR EACH ROW
EXECUTE FUNCTION update_brands_updated_at();

-- ============================================================
-- 12. ITEM CODE GENERATION FUNCTION
-- ============================================================
CREATE OR REPLACE FUNCTION generate_item_code(
    p_distributor_id UUID,
    p_item_type item_type,
    p_category_id UUID DEFAULT NULL
)
RETURNS TEXT AS $$
DECLARE
    v_prefix TEXT;
    v_count INTEGER;
    v_code TEXT;
    v_category_code TEXT;
BEGIN
    -- Determine prefix based on item type
    IF p_item_type = 'product' THEN
        v_prefix := 'PRD';
    ELSE
        v_prefix := 'SRV';
    END IF;
    
    -- Get category short code if category provided
    IF p_category_id IS NOT NULL THEN
        SELECT LEFT(UPPER(REGEXP_REPLACE(name, '[^A-Za-z]', '', 'g')), 3)
        INTO v_category_code
        FROM categories
        WHERE id = p_category_id;
        
        IF v_category_code IS NOT NULL AND v_category_code != '' THEN
            v_prefix := v_category_code;
        END IF;
    END IF;
    
    -- Count existing items with this prefix for this distributor
    SELECT COUNT(*) + 1 INTO v_count
    FROM items
    WHERE distributor_id = p_distributor_id
    AND item_code LIKE v_prefix || '%';
    
    -- Generate code with padding
    v_code := v_prefix || LPAD(v_count::TEXT, 4, '0');
    
    RETURN v_code;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 13. GET CATEGORY HIERARCHY FUNCTION
-- ============================================================
CREATE OR REPLACE FUNCTION get_category_hierarchy(p_category_id UUID)
RETURNS TABLE (
    id UUID,
    name TEXT,
    level INTEGER
) AS $$
WITH RECURSIVE category_tree AS (
    -- Base case: the category itself
    SELECT c.id, c.name, 0 AS level
    FROM categories c
    WHERE c.id = p_category_id
    
    UNION ALL
    
    -- Recursive case: parent categories
    SELECT c.id, c.name, ct.level + 1
    FROM categories c
    INNER JOIN category_tree ct ON c.id = (
        SELECT parent_id FROM categories WHERE id = ct.id
    )
    WHERE c.id IS NOT NULL
)
SELECT * FROM category_tree ORDER BY level DESC;
$$ LANGUAGE sql;

-- ============================================================
-- 14. GET CATEGORY CHILDREN FUNCTION
-- ============================================================
CREATE OR REPLACE FUNCTION get_category_children(p_parent_id UUID)
RETURNS TABLE (
    id UUID,
    name TEXT,
    parent_id UUID,
    is_final BOOLEAN,
    is_returnable BOOLEAN,
    category_type category_type,
    remark TEXT,
    children_count BIGINT,
    items_count BIGINT
) AS $$
SELECT 
    c.id,
    c.name,
    c.parent_id,
    c.is_final,
    c.is_returnable,
    c.category_type,
    c.remark,
    (SELECT COUNT(*) FROM categories sc WHERE sc.parent_id = c.id) AS children_count,
    (SELECT COUNT(*) FROM items i WHERE i.category_id = c.id) AS items_count
FROM categories c
WHERE c.parent_id = p_parent_id OR (p_parent_id IS NULL AND c.parent_id IS NULL)
ORDER BY c.sort_order, c.name;
$$ LANGUAGE sql;

-- ============================================================
-- 15. GRANT PERMISSIONS
-- ============================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON brands TO authenticated;
GRANT SELECT ON hsn_codes TO authenticated;
GRANT SELECT ON sac_codes TO authenticated;
GRANT EXECUTE ON FUNCTION generate_item_code TO authenticated;
GRANT EXECUTE ON FUNCTION get_category_hierarchy TO authenticated;
GRANT EXECUTE ON FUNCTION get_category_children TO authenticated;

-- ============================================================
-- MIGRATION COMPLETE
-- ============================================================
-- After running this migration:
-- 1. Categories now support parent/child hierarchy
-- 2. Brands table created for brand management
-- 3. HSN codes pre-populated for bearings business
-- 4. SAC codes pre-populated for services
-- 5. Items enhanced with code generation, brand, HSN/SAC links
-- 6. RLS policies ensure proper access control
-- 7. Helper functions for hierarchy navigation
