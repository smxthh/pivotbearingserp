-- ============================================
-- CONFIGURATION MODULE - Terms & Transport
-- ============================================
-- Idempotent: Safe to run multiple times.
-- ============================================

-- ============================================
-- 1. TERMS TABLE (Terms & Conditions)
-- ============================================
CREATE TABLE IF NOT EXISTS public.terms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    distributor_id UUID NOT NULL REFERENCES distributor_profiles(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    conditions TEXT NOT NULL,
    type VARCHAR(50) DEFAULT NULL, -- 'purchase', 'sales', 'both'
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_terms_distributor ON terms(distributor_id);
CREATE INDEX IF NOT EXISTS idx_terms_type ON terms(type);

-- RLS
ALTER TABLE terms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "terms_select_policy" ON terms;
CREATE POLICY "terms_select_policy" ON terms FOR SELECT
    USING (distributor_id IN (SELECT id FROM distributor_profiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "terms_insert_policy" ON terms;
CREATE POLICY "terms_insert_policy" ON terms FOR INSERT
    WITH CHECK (distributor_id IN (SELECT id FROM distributor_profiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "terms_update_policy" ON terms;
CREATE POLICY "terms_update_policy" ON terms FOR UPDATE
    USING (distributor_id IN (SELECT id FROM distributor_profiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "terms_delete_policy" ON terms;
CREATE POLICY "terms_delete_policy" ON terms FOR DELETE
    USING (distributor_id IN (SELECT id FROM distributor_profiles WHERE user_id = auth.uid()));

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON terms TO authenticated;

-- ============================================
-- 2. TRANSPORTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.transports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    distributor_id UUID NOT NULL REFERENCES distributor_profiles(id) ON DELETE CASCADE,
    transport_name VARCHAR(255) NOT NULL,
    transport_id VARCHAR(100) NOT NULL,
    address TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(distributor_id, transport_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_transports_distributor ON transports(distributor_id);

-- RLS
ALTER TABLE transports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "transports_select_policy" ON transports;
CREATE POLICY "transports_select_policy" ON transports FOR SELECT
    USING (distributor_id IN (SELECT id FROM distributor_profiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "transports_insert_policy" ON transports;
CREATE POLICY "transports_insert_policy" ON transports FOR INSERT
    WITH CHECK (distributor_id IN (SELECT id FROM distributor_profiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "transports_update_policy" ON transports;
CREATE POLICY "transports_update_policy" ON transports FOR UPDATE
    USING (distributor_id IN (SELECT id FROM distributor_profiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "transports_delete_policy" ON transports;
CREATE POLICY "transports_delete_policy" ON transports FOR DELETE
    USING (distributor_id IN (SELECT id FROM distributor_profiles WHERE user_id = auth.uid()));

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON transports TO authenticated;

-- ============================================
-- 3. AUTO-UPDATE TIMESTAMPS
-- ============================================
CREATE OR REPLACE FUNCTION fn_update_config_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_terms_updated_at ON terms;
CREATE TRIGGER trg_terms_updated_at
    BEFORE UPDATE ON terms
    FOR EACH ROW
    EXECUTE FUNCTION fn_update_config_timestamp();

DROP TRIGGER IF EXISTS trg_transports_updated_at ON transports;
CREATE TRIGGER trg_transports_updated_at
    BEFORE UPDATE ON transports
    FOR EACH ROW
    EXECUTE FUNCTION fn_update_config_timestamp();

-- ============================================
-- 4. HSN MASTER TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.hsn_master (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    distributor_id UUID NOT NULL REFERENCES distributor_profiles(id) ON DELETE CASCADE,
    hsn_code VARCHAR(20) NOT NULL,
    gst_percent DECIMAL(5,2) DEFAULT 0,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(distributor_id, hsn_code)
);

CREATE INDEX IF NOT EXISTS idx_hsn_master_distributor ON hsn_master(distributor_id);

ALTER TABLE hsn_master ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "hsn_master_select_policy" ON hsn_master;
CREATE POLICY "hsn_master_select_policy" ON hsn_master FOR SELECT
    USING (distributor_id IN (SELECT id FROM distributor_profiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "hsn_master_insert_policy" ON hsn_master;
CREATE POLICY "hsn_master_insert_policy" ON hsn_master FOR INSERT
    WITH CHECK (distributor_id IN (SELECT id FROM distributor_profiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "hsn_master_update_policy" ON hsn_master;
CREATE POLICY "hsn_master_update_policy" ON hsn_master FOR UPDATE
    USING (distributor_id IN (SELECT id FROM distributor_profiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "hsn_master_delete_policy" ON hsn_master;
CREATE POLICY "hsn_master_delete_policy" ON hsn_master FOR DELETE
    USING (distributor_id IN (SELECT id FROM distributor_profiles WHERE user_id = auth.uid()));

GRANT SELECT, INSERT, UPDATE, DELETE ON hsn_master TO authenticated;

DROP TRIGGER IF EXISTS trg_hsn_master_updated_at ON hsn_master;
CREATE TRIGGER trg_hsn_master_updated_at
    BEFORE UPDATE ON hsn_master
    FOR EACH ROW
    EXECUTE FUNCTION fn_update_config_timestamp();

-- ============================================
-- 5. TAX MASTER TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.tax_master (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    distributor_id UUID NOT NULL REFERENCES distributor_profiles(id) ON DELETE CASCADE,
    tax_name VARCHAR(100) NOT NULL,
    tax_type VARCHAR(50) NOT NULL, -- 'purchase', 'sales'
    calculation_type VARCHAR(50) NOT NULL, -- 'basic_amount', 'net_amount', 'total_qty'
    ledger_name VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    add_deduct VARCHAR(20) DEFAULT 'add', -- 'add', 'deduct'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tax_master_distributor ON tax_master(distributor_id);
CREATE INDEX IF NOT EXISTS idx_tax_master_type ON tax_master(tax_type);

ALTER TABLE tax_master ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tax_master_select_policy" ON tax_master;
CREATE POLICY "tax_master_select_policy" ON tax_master FOR SELECT
    USING (distributor_id IN (SELECT id FROM distributor_profiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "tax_master_insert_policy" ON tax_master;
CREATE POLICY "tax_master_insert_policy" ON tax_master FOR INSERT
    WITH CHECK (distributor_id IN (SELECT id FROM distributor_profiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "tax_master_update_policy" ON tax_master;
CREATE POLICY "tax_master_update_policy" ON tax_master FOR UPDATE
    USING (distributor_id IN (SELECT id FROM distributor_profiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "tax_master_delete_policy" ON tax_master;
CREATE POLICY "tax_master_delete_policy" ON tax_master FOR DELETE
    USING (distributor_id IN (SELECT id FROM distributor_profiles WHERE user_id = auth.uid()));

GRANT SELECT, INSERT, UPDATE, DELETE ON tax_master TO authenticated;

DROP TRIGGER IF EXISTS trg_tax_master_updated_at ON tax_master;
CREATE TRIGGER trg_tax_master_updated_at
    BEFORE UPDATE ON tax_master
    FOR EACH ROW
    EXECUTE FUNCTION fn_update_config_timestamp();

-- ============================================
-- 6. EXPENSE MASTER TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.expense_master (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    distributor_id UUID NOT NULL REFERENCES distributor_profiles(id) ON DELETE CASCADE,
    expense_name VARCHAR(100) NOT NULL,
    entry_type VARCHAR(50) NOT NULL, -- 'purchase', 'sales'
    ledger_name VARCHAR(100),
    calculation_type VARCHAR(50) NOT NULL, -- 'fixed', 'percentage'
    default_percent DECIMAL(5,2) DEFAULT 0,
    calculation_on VARCHAR(50), -- 'basic_amount', 'total_qty', 'net_amount'
    amount_effect VARCHAR(50) DEFAULT 'add', -- 'add', 'deduct'
    position VARCHAR(50) DEFAULT 'after_tax', -- 'before_tax', 'after_tax'
    sequence INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expense_master_distributor ON expense_master(distributor_id);
CREATE INDEX IF NOT EXISTS idx_expense_master_entry_type ON expense_master(entry_type);

ALTER TABLE expense_master ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "expense_master_select_policy" ON expense_master;
CREATE POLICY "expense_master_select_policy" ON expense_master FOR SELECT
    USING (distributor_id IN (SELECT id FROM distributor_profiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "expense_master_insert_policy" ON expense_master;
CREATE POLICY "expense_master_insert_policy" ON expense_master FOR INSERT
    WITH CHECK (distributor_id IN (SELECT id FROM distributor_profiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "expense_master_update_policy" ON expense_master;
CREATE POLICY "expense_master_update_policy" ON expense_master FOR UPDATE
    USING (distributor_id IN (SELECT id FROM distributor_profiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "expense_master_delete_policy" ON expense_master;
CREATE POLICY "expense_master_delete_policy" ON expense_master FOR DELETE
    USING (distributor_id IN (SELECT id FROM distributor_profiles WHERE user_id = auth.uid()));

GRANT SELECT, INSERT, UPDATE, DELETE ON expense_master TO authenticated;

DROP TRIGGER IF EXISTS trg_expense_master_updated_at ON expense_master;
CREATE TRIGGER trg_expense_master_updated_at
    BEFORE UPDATE ON expense_master
    FOR EACH ROW
    EXECUTE FUNCTION fn_update_config_timestamp();

-- ============================================
-- 7. GROUP MASTER TABLE (Accounting Groups)
-- ============================================
CREATE TABLE IF NOT EXISTS public.group_master (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    distributor_id UUID NOT NULL REFERENCES distributor_profiles(id) ON DELETE CASCADE,
    group_code VARCHAR(20) NOT NULL,
    group_name VARCHAR(100) NOT NULL,
    parent_group_id UUID REFERENCES group_master(id) ON DELETE SET NULL,
    nature VARCHAR(50), -- 'liabilities', 'assets', 'income', 'expenses'
    effect_in VARCHAR(50), -- 'balance_sheet', 'trading_account', 'profit_loss_account'
    sequence INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(distributor_id, group_code)
);

CREATE INDEX IF NOT EXISTS idx_group_master_distributor ON group_master(distributor_id);
CREATE INDEX IF NOT EXISTS idx_group_master_parent ON group_master(parent_group_id);

ALTER TABLE group_master ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "group_master_select_policy" ON group_master;
CREATE POLICY "group_master_select_policy" ON group_master FOR SELECT
    USING (distributor_id IN (SELECT id FROM distributor_profiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "group_master_insert_policy" ON group_master;
CREATE POLICY "group_master_insert_policy" ON group_master FOR INSERT
    WITH CHECK (distributor_id IN (SELECT id FROM distributor_profiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "group_master_update_policy" ON group_master;
CREATE POLICY "group_master_update_policy" ON group_master FOR UPDATE
    USING (distributor_id IN (SELECT id FROM distributor_profiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "group_master_delete_policy" ON group_master;
CREATE POLICY "group_master_delete_policy" ON group_master FOR DELETE
    USING (distributor_id IN (SELECT id FROM distributor_profiles WHERE user_id = auth.uid()));

GRANT SELECT, INSERT, UPDATE, DELETE ON group_master TO authenticated;

DROP TRIGGER IF EXISTS trg_group_master_updated_at ON group_master;
CREATE TRIGGER trg_group_master_updated_at
    BEFORE UPDATE ON group_master
    FOR EACH ROW
    EXECUTE FUNCTION fn_update_config_timestamp();

-- ============================================
-- 8. TAX CLASS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.tax_class (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    distributor_id UUID NOT NULL REFERENCES distributor_profiles(id) ON DELETE CASCADE,
    class_type VARCHAR(50) NOT NULL, -- 'purchase', 'sales'
    class_code VARCHAR(20) NOT NULL,
    class_name VARCHAR(100) NOT NULL,
    ledger_name VARCHAR(100),
    tax_name VARCHAR(100),
    expense_name VARCHAR(100),
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(distributor_id, class_code)
);

CREATE INDEX IF NOT EXISTS idx_tax_class_distributor ON tax_class(distributor_id);
CREATE INDEX IF NOT EXISTS idx_tax_class_type ON tax_class(class_type);

ALTER TABLE tax_class ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tax_class_select_policy" ON tax_class;
CREATE POLICY "tax_class_select_policy" ON tax_class FOR SELECT
    USING (distributor_id IN (SELECT id FROM distributor_profiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "tax_class_insert_policy" ON tax_class;
CREATE POLICY "tax_class_insert_policy" ON tax_class FOR INSERT
    WITH CHECK (distributor_id IN (SELECT id FROM distributor_profiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "tax_class_update_policy" ON tax_class;
CREATE POLICY "tax_class_update_policy" ON tax_class FOR UPDATE
    USING (distributor_id IN (SELECT id FROM distributor_profiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "tax_class_delete_policy" ON tax_class;
CREATE POLICY "tax_class_delete_policy" ON tax_class FOR DELETE
    USING (distributor_id IN (SELECT id FROM distributor_profiles WHERE user_id = auth.uid()));

GRANT SELECT, INSERT, UPDATE, DELETE ON tax_class TO authenticated;

DROP TRIGGER IF EXISTS trg_tax_class_updated_at ON tax_class;
CREATE TRIGGER trg_tax_class_updated_at
    BEFORE UPDATE ON tax_class
    FOR EACH ROW
    EXECUTE FUNCTION fn_update_config_timestamp();

-- ============================================
-- END OF CONFIGURATION MODULE
-- ============================================
