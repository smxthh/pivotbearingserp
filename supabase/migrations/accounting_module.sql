-- ============================================
-- ACCOUNTING MODULE - Complete Database Schema
-- ============================================
-- Creates tables for: Ledgers, Vouchers, Transactions, GST Summary
-- Implements double-entry bookkeeping with automatic balance updates
-- ============================================

-- 1. Voucher Type Enum
DO $$ BEGIN
    CREATE TYPE voucher_type AS ENUM (
        'purchase_invoice', 
        'debit_note', 
        'tax_invoice', 
        'credit_note',
        'receipt_voucher', 
        'journal_entry',
        'gst_payment', 
        'tcs_tds_payment'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Ledger Groups (Account Categories)
CREATE TABLE IF NOT EXISTS ledger_groups (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    distributor_id UUID REFERENCES distributor_profiles(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    parent_group_id UUID REFERENCES ledger_groups(id),
    nature VARCHAR(20) CHECK (nature IN ('assets', 'liabilities', 'income', 'expenses', 'capital')),
    is_system BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Ledger Accounts Master
CREATE TABLE IF NOT EXISTS ledgers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    distributor_id UUID REFERENCES distributor_profiles(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(200) NOT NULL,
    group_id UUID REFERENCES ledger_groups(id),
    group_name VARCHAR(100) NOT NULL DEFAULT 'Sundry Debtors',
    party_id UUID REFERENCES parties(id) ON DELETE SET NULL,
    opening_balance DECIMAL(15,2) DEFAULT 0,
    opening_balance_type VARCHAR(2) DEFAULT 'Dr' CHECK (opening_balance_type IN ('Dr', 'Cr')),
    closing_balance DECIMAL(15,2) DEFAULT 0,
    description TEXT,
    is_system BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Unique constraint on ledger name per distributor
CREATE UNIQUE INDEX IF NOT EXISTS idx_ledgers_name_distributor 
ON ledgers(distributor_id, name) WHERE is_active = true;

-- 4. Vouchers (All Transactions)
CREATE TABLE IF NOT EXISTS vouchers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    distributor_id UUID REFERENCES distributor_profiles(id) ON DELETE CASCADE NOT NULL,
    voucher_type voucher_type NOT NULL,
    voucher_number VARCHAR(50) NOT NULL,
    voucher_date DATE NOT NULL DEFAULT CURRENT_DATE,
    party_id UUID REFERENCES parties(id) ON DELETE SET NULL,
    party_name VARCHAR(200),
    reference_number VARCHAR(100),
    reference_voucher_id UUID REFERENCES vouchers(id),
    narration TEXT,
    
    -- Amount fields
    subtotal DECIMAL(15,2) DEFAULT 0,
    discount_percent DECIMAL(5,2) DEFAULT 0,
    discount_amount DECIMAL(15,2) DEFAULT 0,
    taxable_amount DECIMAL(15,2) DEFAULT 0,
    
    -- GST Fields
    cgst_amount DECIMAL(15,2) DEFAULT 0,
    sgst_amount DECIMAL(15,2) DEFAULT 0,
    igst_amount DECIMAL(15,2) DEFAULT 0,
    cess_amount DECIMAL(15,2) DEFAULT 0,
    total_tax DECIMAL(15,2) DEFAULT 0,
    
    -- Totals
    round_off DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    
    -- TDS/TCS fields
    tds_percent DECIMAL(5,2) DEFAULT 0,
    tds_amount DECIMAL(15,2) DEFAULT 0,
    tcs_percent DECIMAL(5,2) DEFAULT 0,
    tcs_amount DECIMAL(15,2) DEFAULT 0,
    
    -- Status
    status VARCHAR(20) DEFAULT 'confirmed' CHECK (status IN ('draft', 'confirmed', 'cancelled')),
    
    -- Audit
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Unique constraint on voucher number per type per distributor
CREATE UNIQUE INDEX IF NOT EXISTS idx_vouchers_number_type 
ON vouchers(distributor_id, voucher_type, voucher_number) WHERE status != 'cancelled';

-- 5. Voucher Line Items
CREATE TABLE IF NOT EXISTS voucher_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    voucher_id UUID REFERENCES vouchers(id) ON DELETE CASCADE NOT NULL,
    item_id UUID REFERENCES items(id) ON DELETE SET NULL,
    item_name VARCHAR(200) NOT NULL,
    item_sku VARCHAR(50),
    hsn_code VARCHAR(20),
    description TEXT,
    
    -- Quantity and rates
    quantity DECIMAL(10,3) DEFAULT 1,
    unit VARCHAR(20) DEFAULT 'PCS',
    rate DECIMAL(15,2) DEFAULT 0,
    amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    
    -- Discount
    discount_percent DECIMAL(5,2) DEFAULT 0,
    discount_amount DECIMAL(15,2) DEFAULT 0,
    taxable_amount DECIMAL(15,2) DEFAULT 0,
    
    -- GST
    gst_percent DECIMAL(5,2) DEFAULT 0,
    cgst_amount DECIMAL(15,2) DEFAULT 0,
    sgst_amount DECIMAL(15,2) DEFAULT 0,
    igst_amount DECIMAL(15,2) DEFAULT 0,
    cess_percent DECIMAL(5,2) DEFAULT 0,
    cess_amount DECIMAL(15,2) DEFAULT 0,
    
    -- Total
    total_amount DECIMAL(15,2) DEFAULT 0,
    line_order INT DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Ledger Transactions (Double-Entry Postings)
CREATE TABLE IF NOT EXISTS ledger_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    distributor_id UUID REFERENCES distributor_profiles(id) ON DELETE CASCADE NOT NULL,
    voucher_id UUID REFERENCES vouchers(id) ON DELETE CASCADE,
    ledger_id UUID REFERENCES ledgers(id) ON DELETE CASCADE NOT NULL,
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    debit_amount DECIMAL(15,2) DEFAULT 0,
    credit_amount DECIMAL(15,2) DEFAULT 0,
    narration TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster ledger balance calculations
CREATE INDEX IF NOT EXISTS idx_ledger_transactions_ledger 
ON ledger_transactions(ledger_id, transaction_date);

CREATE INDEX IF NOT EXISTS idx_ledger_transactions_voucher 
ON ledger_transactions(voucher_id);

-- 7. GST Summary Table (For returns filing)
CREATE TABLE IF NOT EXISTS gst_summary (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    distributor_id UUID REFERENCES distributor_profiles(id) ON DELETE CASCADE NOT NULL,
    period_month INT NOT NULL CHECK (period_month >= 1 AND period_month <= 12),
    period_year INT NOT NULL CHECK (period_year >= 2020),
    
    -- Output Tax (Sales)
    total_taxable_sales DECIMAL(15,2) DEFAULT 0,
    total_output_cgst DECIMAL(15,2) DEFAULT 0,
    total_output_sgst DECIMAL(15,2) DEFAULT 0,
    total_output_igst DECIMAL(15,2) DEFAULT 0,
    
    -- Input Tax (Purchases)
    total_taxable_purchases DECIMAL(15,2) DEFAULT 0,
    total_input_cgst DECIMAL(15,2) DEFAULT 0,
    total_input_sgst DECIMAL(15,2) DEFAULT 0,
    total_input_igst DECIMAL(15,2) DEFAULT 0,
    
    -- Net Payable
    net_gst_payable DECIMAL(15,2) DEFAULT 0,
    gst_paid DECIMAL(15,2) DEFAULT 0,
    gst_balance DECIMAL(15,2) DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(distributor_id, period_month, period_year)
);

-- ============================================
-- FUNCTIONS
-- ============================================

-- 8. Voucher Number Generator Function
CREATE OR REPLACE FUNCTION generate_voucher_number(
    p_distributor_id UUID,
    p_voucher_type voucher_type,
    p_prefix VARCHAR DEFAULT NULL
)
RETURNS VARCHAR AS $$
DECLARE
    v_count INT;
    v_prefix VARCHAR;
    v_number VARCHAR;
BEGIN
    -- Get count for this voucher type
    SELECT COUNT(*) + 1 INTO v_count
    FROM vouchers
    WHERE distributor_id = p_distributor_id
        AND voucher_type = p_voucher_type;
    
    -- Set prefix based on type
    v_prefix := COALESCE(p_prefix, 
        CASE p_voucher_type
            WHEN 'purchase_invoice' THEN 'PI'
            WHEN 'debit_note' THEN 'DN'
            WHEN 'tax_invoice' THEN 'TI'
            WHEN 'credit_note' THEN 'CN'
            WHEN 'receipt_voucher' THEN 'RV'
            WHEN 'journal_entry' THEN 'JE'
            WHEN 'gst_payment' THEN 'GST'
            WHEN 'tcs_tds_payment' THEN 'TDS'
        END
    );
    
    v_number := v_prefix || '-' || TO_CHAR(NOW(), 'YYMM') || '-' || LPAD(v_count::TEXT, 4, '0');
    RETURN v_number;
END;
$$ LANGUAGE plpgsql;

-- 9. Function to recalculate ledger closing balance
CREATE OR REPLACE FUNCTION recalculate_ledger_balance(p_ledger_id UUID)
RETURNS DECIMAL AS $$
DECLARE
    v_opening DECIMAL;
    v_opening_type VARCHAR(2);
    v_total_debit DECIMAL;
    v_total_credit DECIMAL;
    v_closing DECIMAL;
BEGIN
    -- Get opening balance
    SELECT opening_balance, opening_balance_type 
    INTO v_opening, v_opening_type
    FROM ledgers WHERE id = p_ledger_id;
    
    -- Adjust opening based on type
    IF v_opening_type = 'Cr' THEN
        v_opening := -v_opening;
    END IF;
    
    -- Sum all transactions
    SELECT 
        COALESCE(SUM(debit_amount), 0),
        COALESCE(SUM(credit_amount), 0)
    INTO v_total_debit, v_total_credit
    FROM ledger_transactions
    WHERE ledger_id = p_ledger_id;
    
    -- Calculate closing: Opening + Debits - Credits
    v_closing := v_opening + v_total_debit - v_total_credit;
    
    -- Update ledger
    UPDATE ledgers
    SET closing_balance = v_closing,
        updated_at = NOW()
    WHERE id = p_ledger_id;
    
    RETURN v_closing;
END;
$$ LANGUAGE plpgsql;

-- 10. Trigger to Update Ledger Closing Balance
CREATE OR REPLACE FUNCTION trg_update_ledger_closing_balance()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        PERFORM recalculate_ledger_balance(OLD.ledger_id);
        RETURN OLD;
    ELSE
        PERFORM recalculate_ledger_balance(NEW.ledger_id);
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ledger_transaction_balance ON ledger_transactions;
CREATE TRIGGER trg_ledger_transaction_balance
AFTER INSERT OR UPDATE OR DELETE ON ledger_transactions
FOR EACH ROW EXECUTE FUNCTION trg_update_ledger_closing_balance();

-- 11. Function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers
DROP TRIGGER IF EXISTS trg_ledgers_updated_at ON ledgers;
CREATE TRIGGER trg_ledgers_updated_at
BEFORE UPDATE ON ledgers
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_vouchers_updated_at ON vouchers;
CREATE TRIGGER trg_vouchers_updated_at
BEFORE UPDATE ON vouchers
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_ledger_groups_updated_at ON ledger_groups;
CREATE TRIGGER trg_ledger_groups_updated_at
BEFORE UPDATE ON ledger_groups
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE ledger_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE ledgers ENABLE ROW LEVEL SECURITY;
ALTER TABLE vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE voucher_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE ledger_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE gst_summary ENABLE ROW LEVEL SECURITY;

-- Ledger Groups RLS
DROP POLICY IF EXISTS "ledger_groups_select" ON ledger_groups;
CREATE POLICY "ledger_groups_select" ON ledger_groups
    FOR SELECT USING (
        distributor_id IS NULL OR 
        distributor_id = get_user_distributor_id() OR 
        is_admin()
    );

DROP POLICY IF EXISTS "ledger_groups_all" ON ledger_groups;
CREATE POLICY "ledger_groups_all" ON ledger_groups
    FOR ALL USING (
        distributor_id = get_user_distributor_id() OR 
        is_admin()
    );

-- Ledgers RLS
DROP POLICY IF EXISTS "ledgers_select" ON ledgers;
CREATE POLICY "ledgers_select" ON ledgers
    FOR SELECT USING (
        distributor_id = get_user_distributor_id() OR 
        is_admin()
    );

DROP POLICY IF EXISTS "ledgers_all" ON ledgers;
CREATE POLICY "ledgers_all" ON ledgers
    FOR ALL USING (
        distributor_id = get_user_distributor_id() OR 
        is_admin()
    );

-- Vouchers RLS
DROP POLICY IF EXISTS "vouchers_select" ON vouchers;
CREATE POLICY "vouchers_select" ON vouchers
    FOR SELECT USING (
        distributor_id = get_user_distributor_id() OR 
        is_admin()
    );

DROP POLICY IF EXISTS "vouchers_all" ON vouchers;
CREATE POLICY "vouchers_all" ON vouchers
    FOR ALL USING (
        distributor_id = get_user_distributor_id() OR 
        is_admin()
    );

-- Voucher Items RLS
DROP POLICY IF EXISTS "voucher_items_select" ON voucher_items;
CREATE POLICY "voucher_items_select" ON voucher_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM vouchers v 
            WHERE v.id = voucher_items.voucher_id 
            AND (v.distributor_id = get_user_distributor_id() OR is_admin())
        )
    );

DROP POLICY IF EXISTS "voucher_items_all" ON voucher_items;
CREATE POLICY "voucher_items_all" ON voucher_items
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM vouchers v 
            WHERE v.id = voucher_items.voucher_id 
            AND (v.distributor_id = get_user_distributor_id() OR is_admin())
        )
    );

-- Ledger Transactions RLS
DROP POLICY IF EXISTS "ledger_transactions_select" ON ledger_transactions;
CREATE POLICY "ledger_transactions_select" ON ledger_transactions
    FOR SELECT USING (
        distributor_id = get_user_distributor_id() OR 
        is_admin()
    );

DROP POLICY IF EXISTS "ledger_transactions_all" ON ledger_transactions;
CREATE POLICY "ledger_transactions_all" ON ledger_transactions
    FOR ALL USING (
        distributor_id = get_user_distributor_id() OR 
        is_admin()
    );

-- GST Summary RLS
DROP POLICY IF EXISTS "gst_summary_select" ON gst_summary;
CREATE POLICY "gst_summary_select" ON gst_summary
    FOR SELECT USING (
        distributor_id = get_user_distributor_id() OR 
        is_admin()
    );

DROP POLICY IF EXISTS "gst_summary_all" ON gst_summary;
CREATE POLICY "gst_summary_all" ON gst_summary
    FOR ALL USING (
        distributor_id = get_user_distributor_id() OR 
        is_admin()
    );

-- ============================================
-- DEFAULT LEDGER GROUPS (System Groups)
-- ============================================
-- Note: These are inserted without distributor_id so they're shared across all distributors

INSERT INTO ledger_groups (name, nature, is_system, distributor_id) VALUES
    ('Sales Account', 'income', true, NULL),
    ('Purchase Account', 'expenses', true, NULL),
    ('Sundry Debtors', 'assets', true, NULL),
    ('Sundry Creditors', 'liabilities', true, NULL),
    ('Bank Accounts', 'assets', true, NULL),
    ('Cash-in-Hand', 'assets', true, NULL),
    ('Duties & Taxes', 'liabilities', true, NULL),
    ('Direct Expenses', 'expenses', true, NULL),
    ('Indirect Expenses', 'expenses', true, NULL),
    ('Fixed Assets', 'assets', true, NULL),
    ('Capital Account', 'capital', true, NULL),
    ('Loans (Liability)', 'liabilities', true, NULL),
    ('Current Assets', 'assets', true, NULL),
    ('Current Liabilities', 'liabilities', true, NULL)
ON CONFLICT DO NOTHING;

-- ============================================
-- GRANT PERMISSIONS
-- ============================================

GRANT ALL ON ledger_groups TO authenticated;
GRANT ALL ON ledgers TO authenticated;
GRANT ALL ON vouchers TO authenticated;
GRANT ALL ON voucher_items TO authenticated;
GRANT ALL ON ledger_transactions TO authenticated;
GRANT ALL ON gst_summary TO authenticated;
