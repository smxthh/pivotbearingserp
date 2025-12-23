-- ============================================================
-- SUPERADMIN ROLLOUT - PART 2: POLICIES & UPDATE
-- ============================================================
-- RUN THIS FILE SECOND (After PART_1_enum.sql).

-- 1. Assign Superadmin Role
DO $$
DECLARE
    target_email TEXT := 'smitmodi416@gmail.com';
    target_user_id UUID;
BEGIN
    SELECT id INTO target_user_id FROM auth.users WHERE email = target_email;
    
    IF target_user_id IS NOT NULL THEN
        -- Insert superadmin role
        INSERT INTO user_roles (user_id, role)
        VALUES (target_user_id, 'superadmin')
        ON CONFLICT (user_id, role) DO NOTHING;
        
        RAISE NOTICE 'Promoted % to superadmin', target_email;
    ELSE
        RAISE WARNING 'User % not found', target_email;
    END IF;
END $$;

-- 2. Update RLS Policies

-- TABLE: distributor_profiles
DROP POLICY IF EXISTS "Admins can view all distributor profiles" ON distributor_profiles;
DROP POLICY IF EXISTS "Users can view their own distributor profile" ON distributor_profiles;
DROP POLICY IF EXISTS "Admins can insert distributor profiles" ON distributor_profiles;
DROP POLICY IF EXISTS "Admins can update their own distributor profile" ON distributor_profiles;
DROP POLICY IF EXISTS "Users can insert their own distributor profile" ON distributor_profiles;
DROP POLICY IF EXISTS "Superadmin view all profiles" ON distributor_profiles;
DROP POLICY IF EXISTS "Admin/User view own profile" ON distributor_profiles;
DROP POLICY IF EXISTS "Superadmin manage all profiles" ON distributor_profiles;
DROP POLICY IF EXISTS "Users insert own profile" ON distributor_profiles;
DROP POLICY IF EXISTS "Users update own profile" ON distributor_profiles;

CREATE POLICY "Superadmin view all profiles"
ON distributor_profiles FOR SELECT
USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'superadmin')
);

CREATE POLICY "Admin/User view own profile"
ON distributor_profiles FOR SELECT
USING (
  user_id = auth.uid()
);

CREATE POLICY "Superadmin manage all profiles"
ON distributor_profiles FOR ALL
USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'superadmin')
)
WITH CHECK (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'superadmin')
);

CREATE POLICY "Users insert own profile"
ON distributor_profiles FOR INSERT
WITH CHECK (
    auth.uid() = user_id
);

CREATE POLICY "Users update own profile"
ON distributor_profiles FOR UPDATE
USING ( user_id = auth.uid() );


-- TABLE: parties
DROP POLICY IF EXISTS "Admins can view all parties" ON parties;
DROP POLICY IF EXISTS "Admins can insert parties" ON parties;
DROP POLICY IF EXISTS "Admins can update all parties" ON parties;
DROP POLICY IF EXISTS "Admins can delete all parties" ON parties;
DROP POLICY IF EXISTS "Distributors can view their own parties" ON parties;
DROP POLICY IF EXISTS "Superadmin full access parties" ON parties;
DROP POLICY IF EXISTS "Distributors view own parties" ON parties;
DROP POLICY IF EXISTS "Distributors insert own parties" ON parties;
DROP POLICY IF EXISTS "Distributors update own parties" ON parties;
DROP POLICY IF EXISTS "Distributors delete own parties" ON parties;

CREATE POLICY "Superadmin full access parties"
ON parties FOR ALL
USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'superadmin')
)
WITH CHECK (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'superadmin')
);

CREATE POLICY "Distributors view own parties"
ON parties FOR SELECT
USING (
    distributor_id IN (
        SELECT id FROM distributor_profiles WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Distributors insert own parties"
ON parties FOR INSERT
WITH CHECK (
    distributor_id IN (
        SELECT id FROM distributor_profiles WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Distributors update own parties"
ON parties FOR UPDATE
USING (
    distributor_id IN (
        SELECT id FROM distributor_profiles WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Distributors delete own parties"
ON parties FOR DELETE
USING (
    distributor_id IN (
        SELECT id FROM distributor_profiles WHERE user_id = auth.uid()
    )
);


-- TABLE: invoices
DROP POLICY IF EXISTS "Distributors can view their own invoices" ON invoices;
DROP POLICY IF EXISTS "Superadmin full access invoices" ON invoices;
DROP POLICY IF EXISTS "Distributors view own invoices" ON invoices;
DROP POLICY IF EXISTS "Distributors manage own invoices" ON invoices;

CREATE POLICY "Superadmin full access invoices"
ON invoices FOR ALL
USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'superadmin')
);

CREATE POLICY "Distributors view own invoices"
ON invoices FOR SELECT
USING (
    distributor_id IN (
        SELECT id FROM distributor_profiles WHERE user_id = auth.uid()
    )
    OR
    salesperson_id IN (
        SELECT id FROM salespersons WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Distributors manage own invoices"
ON invoices FOR ALL
USING (
    distributor_id IN (
        SELECT id FROM distributor_profiles WHERE user_id = auth.uid()
    )
);


-- TABLE: items
DROP POLICY IF EXISTS "Distributors can view their own items" ON items;
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
    distributor_id IN (
        SELECT id FROM distributor_profiles WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Distributors manage own items"
ON items FOR ALL
USING (
    distributor_id IN (
        SELECT id FROM distributor_profiles WHERE user_id = auth.uid()
    )
);


-- TABLE: gst_summary
DROP POLICY IF EXISTS "Distributors can view their own gst_summary" ON gst_summary;
DROP POLICY IF EXISTS "Superadmin full access gst_summary" ON gst_summary;
DROP POLICY IF EXISTS "Distributors view own gst_summary" ON gst_summary;

CREATE POLICY "Superadmin full access gst_summary"
ON gst_summary FOR ALL
USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'superadmin')
);

CREATE POLICY "Distributors view own gst_summary"
ON gst_summary FOR SELECT
USING (
    distributor_id IN (
        SELECT id FROM distributor_profiles WHERE user_id = auth.uid()
    )
);
