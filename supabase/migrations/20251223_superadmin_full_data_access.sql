-- ============================================================
-- COMPREHENSIVE SUPERADMIN DATA ACCESS FIX
-- ============================================================
-- This script ensures Superadmin can see ALL data in all major tables.

-- ==================== ITEMS TABLE ====================
DROP POLICY IF EXISTS "Superadmin full access items" ON items;
DROP POLICY IF EXISTS "Distributors view own items" ON items;
DROP POLICY IF EXISTS "Distributors manage own items" ON items;

CREATE POLICY "Superadmin full access items"
ON items FOR ALL
USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'superadmin')
);

CREATE POLICY "Distributors view own items"
ON items FOR SELECT
USING (
    distributor_id IN (SELECT id FROM distributor_profiles WHERE user_id = auth.uid())
);

CREATE POLICY "Distributors manage own items"
ON items FOR ALL
USING (
    distributor_id IN (SELECT id FROM distributor_profiles WHERE user_id = auth.uid())
);

-- ==================== BRANDS TABLE ====================
DROP POLICY IF EXISTS "Superadmin full access brands" ON brands;
DROP POLICY IF EXISTS "Distributors view own brands" ON brands;
DROP POLICY IF EXISTS "Distributors manage own brands" ON brands;

CREATE POLICY "Superadmin full access brands"
ON brands FOR ALL
USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'superadmin')
);

CREATE POLICY "Distributors view own brands"
ON brands FOR SELECT
USING (
    distributor_id IN (SELECT id FROM distributor_profiles WHERE user_id = auth.uid())
);

CREATE POLICY "Distributors manage own brands"
ON brands FOR ALL
USING (
    distributor_id IN (SELECT id FROM distributor_profiles WHERE user_id = auth.uid())
);

-- ==================== CATEGORIES TABLE ====================
DROP POLICY IF EXISTS "Superadmin full access categories" ON categories;
DROP POLICY IF EXISTS "Distributors view own categories" ON categories;
DROP POLICY IF EXISTS "Distributors manage own categories" ON categories;

CREATE POLICY "Superadmin full access categories"
ON categories FOR ALL
USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'superadmin')
);

CREATE POLICY "Distributors view own categories"
ON categories FOR SELECT
USING (
    distributor_id IN (SELECT id FROM distributor_profiles WHERE user_id = auth.uid())
);

CREATE POLICY "Distributors manage own categories"
ON categories FOR ALL
USING (
    distributor_id IN (SELECT id FROM distributor_profiles WHERE user_id = auth.uid())
);

-- ==================== SALESPERSONS TABLE ====================
DROP POLICY IF EXISTS "Superadmin full access salespersons" ON salespersons;
DROP POLICY IF EXISTS "Distributors view own salespersons" ON salespersons;
DROP POLICY IF EXISTS "Distributors manage own salespersons" ON salespersons;

CREATE POLICY "Superadmin full access salespersons"
ON salespersons FOR ALL
USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'superadmin')
);

CREATE POLICY "Distributors view own salespersons"
ON salespersons FOR SELECT
USING (
    distributor_id IN (SELECT id FROM distributor_profiles WHERE user_id = auth.uid())
);

CREATE POLICY "Distributors manage own salespersons"
ON salespersons FOR ALL
USING (
    distributor_id IN (SELECT id FROM distributor_profiles WHERE user_id = auth.uid())
);

-- ==================== PROFILES TABLE ====================
DROP POLICY IF EXISTS "Superadmin full access profiles" ON profiles;
DROP POLICY IF EXISTS "Users view own profile" ON profiles;

CREATE POLICY "Superadmin full access profiles"
ON profiles FOR ALL
USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'superadmin')
);

CREATE POLICY "Users view own profile"
ON profiles FOR SELECT
USING (id = auth.uid());
