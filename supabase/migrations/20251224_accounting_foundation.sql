-- ==============================================================================
-- ACCOUNTING FOUNDATION MIGRATION
-- Created: 2025-12-24
-- Purpose: Implements Double-Entry Accounting System core tables and automation
-- ==============================================================================

-- 1. LEDGER GROUPS TABLE
------------
CREATE TABLE IF NOT EXISTS public.ledger_groups (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id uuid NOT NULL, -- The company this group belongs to
    name text NOT NULL,
    parent_group_id uuid REFERENCES public.ledger_groups(id),
    nature text NOT NULL CHECK (nature IN ('Asset', 'Liability', 'Income', 'Expense')),
    code text, -- e.g., 'LIAB', 'A-CUR'
    is_system boolean DEFAULT false, -- If true, cannot be deleted/edited
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE public.ledger_groups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their tenant's ledger groups" ON public.ledger_groups;
CREATE POLICY "Users can view their tenant's ledger groups"
    ON public.ledger_groups FOR SELECT
    USING (tenant_id = public.get_user_tenant_id());

DROP POLICY IF EXISTS "Admins can manage their tenant's ledger groups" ON public.ledger_groups;
CREATE POLICY "Admins can manage their tenant's ledger groups"
    ON public.ledger_groups FOR ALL
    USING (tenant_id = public.get_user_tenant_id())
    WITH CHECK (tenant_id = public.get_user_tenant_id());

-- 2. LEDGERS TABLE
------------
CREATE TABLE IF NOT EXISTS public.ledgers (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id uuid NOT NULL,
    name text NOT NULL,
    group_id uuid NOT NULL REFERENCES public.ledger_groups(id),
    opening_balance numeric DEFAULT 0.00,
    opening_balance_type text DEFAULT 'Dr' CHECK (opening_balance_type IN ('Dr', 'Cr')), -- For UI compatibility
    current_balance numeric DEFAULT 0.00, -- Cached balance (signed: Positive=Dr, Negative=Cr)
    is_system boolean DEFAULT false,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE public.ledgers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their tenant's ledgers" ON public.ledgers;
CREATE POLICY "Users can view their tenant's ledgers"
    ON public.ledgers FOR SELECT
    USING (tenant_id = public.get_user_tenant_id());

DROP POLICY IF EXISTS "Admins can manage their tenant's ledgers" ON public.ledgers;
CREATE POLICY "Admins can manage their tenant's ledgers"
    ON public.ledgers FOR ALL
    USING (tenant_id = public.get_user_tenant_id())
    WITH CHECK (tenant_id = public.get_user_tenant_id());


-- 3. LEDGER ENTRIES TABLE (THE JOURNAL)
------------
CREATE TABLE IF NOT EXISTS public.ledger_entries (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id uuid NOT NULL,
    transaction_id uuid NOT NULL, -- Reference to InvoiceID, PaymentID, etc.
    transaction_type text NOT NULL, -- 'SALES', 'PURCHASE', 'RECEIPT', 'PAYMENT', 'JOURNAL'
    ledger_id uuid NOT NULL REFERENCES public.ledgers(id),
    debit numeric DEFAULT 0.00 CHECK (debit >= 0),
    credit numeric DEFAULT 0.00 CHECK (credit >= 0),
    entry_date date NOT NULL DEFAULT CURRENT_DATE,
    description text,
    created_at timestamptz DEFAULT now(),
    created_by uuid REFERENCES auth.users(id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ledger_entries_tenant ON public.ledger_entries(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_ledger ON public.ledger_entries(ledger_id);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_transaction ON public.ledger_entries(transaction_id);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_date ON public.ledger_entries(entry_date);

-- RLS
ALTER TABLE public.ledger_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their tenant's entries" ON public.ledger_entries;
CREATE POLICY "Users can view their tenant's entries"
    ON public.ledger_entries FOR SELECT
    USING (tenant_id = public.get_user_tenant_id());

DROP POLICY IF EXISTS "Admins can insert entries" ON public.ledger_entries;
CREATE POLICY "Admins can insert entries"
    ON public.ledger_entries FOR INSERT
    WITH CHECK (tenant_id = public.get_user_tenant_id());

-- 4. FISCAL YEARS TABLE
------------
CREATE TABLE IF NOT EXISTS public.fiscal_years (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id uuid NOT NULL,
    name text NOT NULL, -- 'FY 2024-25'
    start_date date NOT NULL,
    end_date date NOT NULL,
    is_locked boolean DEFAULT false,
    created_at timestamptz DEFAULT now()
);

ALTER TABLE public.fiscal_years ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view fiscal years" ON public.fiscal_years;
CREATE POLICY "Users can view fiscal years"
    ON public.fiscal_years FOR SELECT
    USING (tenant_id = public.get_user_tenant_id());

DROP POLICY IF EXISTS "Admins can manage fiscal years" ON public.fiscal_years;
CREATE POLICY "Admins can manage fiscal years"
    ON public.fiscal_years FOR ALL
    USING (tenant_id = public.get_user_tenant_id());


-- ==============================================================================
-- AUTOMATION: SEEDING FUNCTION
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.initialize_tenant_ledgers(target_tenant_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    -- Group IDs
    g_liab uuid; g_asset uuid; g_inc uuid; g_exp uuid;
    g_cur_liab uuid; g_duties uuid; g_sundry_cr uuid; g_capital uuid;
    g_cur_asset uuid; g_sundry_dr uuid; g_bank uuid; g_cash_grp uuid;
    g_sales uuid; g_ind_inc uuid;
    g_pur uuid; g_dir_exp uuid; g_ind_exp uuid;
BEGIN
    -- 1. CREATE ROOT GROUPS
    INSERT INTO ledger_groups (tenant_id, name, nature, code, is_system) VALUES 
    (target_tenant_id, 'Liabilities', 'Liability', 'LIAB', true) RETURNING id INTO g_liab;
    
    INSERT INTO ledger_groups (tenant_id, name, nature, code, is_system) VALUES 
    (target_tenant_id, 'Assets', 'Asset', 'ASST', true) RETURNING id INTO g_asset;
    
    INSERT INTO ledger_groups (tenant_id, name, nature, code, is_system) VALUES 
    (target_tenant_id, 'Income', 'Income', 'INC', true) RETURNING id INTO g_inc;
    
    INSERT INTO ledger_groups (tenant_id, name, nature, code, is_system) VALUES 
    (target_tenant_id, 'Expenses', 'Expense', 'EXP', true) RETURNING id INTO g_exp;

    -- 2. CREATE SUB-GROUPS (Liabilities)
    INSERT INTO ledger_groups (tenant_id, name, nature, parent_group_id, code, is_system) VALUES 
    (target_tenant_id, 'Current Liabilities', 'Liability', g_liab, 'L-CUR', true) RETURNING id INTO g_cur_liab;
    
    INSERT INTO ledger_groups (tenant_id, name, nature, parent_group_id, code, is_system) VALUES 
    (target_tenant_id, 'Duties & Taxes', 'Liability', g_cur_liab, 'L-DUT', true) RETURNING id INTO g_duties;
    
    INSERT INTO ledger_groups (tenant_id, name, nature, parent_group_id, code, is_system) VALUES 
    (target_tenant_id, 'Sundry Creditors', 'Liability', g_cur_liab, 'L-SUN', true) RETURNING id INTO g_sundry_cr;
    
    INSERT INTO ledger_groups (tenant_id, name, nature, parent_group_id, code, is_system) VALUES 
    (target_tenant_id, 'Capital Account', 'Liability', g_liab, 'L-CAP', true) RETURNING id INTO g_capital;

    -- 3. CREATE SUB-GROUPS (Assets)
    INSERT INTO ledger_groups (tenant_id, name, nature, parent_group_id, code, is_system) VALUES 
    (target_tenant_id, 'Current Assets', 'Asset', g_asset, 'A-CUR', true) RETURNING id INTO g_cur_asset;
    
    INSERT INTO ledger_groups (tenant_id, name, nature, parent_group_id, code, is_system) VALUES 
    (target_tenant_id, 'Sundry Debtors', 'Asset', g_cur_asset, 'A-SUN', true) RETURNING id INTO g_sundry_dr;
    
    INSERT INTO ledger_groups (tenant_id, name, nature, parent_group_id, code, is_system) VALUES 
    (target_tenant_id, 'Bank Accounts', 'Asset', g_cur_asset, 'A-BNK', true) RETURNING id INTO g_bank;
    
    INSERT INTO ledger_groups (tenant_id, name, nature, parent_group_id, code, is_system) VALUES 
    (target_tenant_id, 'Cash-in-Hand', 'Asset', g_cur_asset, 'A-CSH', true) RETURNING id INTO g_cash_grp;

    -- 4. CREATE SUB-GROUPS (Income)
    INSERT INTO ledger_groups (tenant_id, name, nature, parent_group_id, code, is_system) VALUES 
    (target_tenant_id, 'Sales Accounts', 'Income', g_inc, 'I-SAL', true) RETURNING id INTO g_sales;
    
    INSERT INTO ledger_groups (tenant_id, name, nature, parent_group_id, code, is_system) VALUES 
    (target_tenant_id, 'Indirect Income', 'Income', g_inc, 'I-IND', true) RETURNING id INTO g_ind_inc;

    -- 5. CREATE SUB-GROUPS (Expense)
    INSERT INTO ledger_groups (tenant_id, name, nature, parent_group_id, code, is_system) VALUES 
    (target_tenant_id, 'Purchase Accounts', 'Expense', g_exp, 'E-PUR', true) RETURNING id INTO g_pur;
    
    INSERT INTO ledger_groups (tenant_id, name, nature, parent_group_id, code, is_system) VALUES 
    (target_tenant_id, 'Direct Expenses', 'Expense', g_exp, 'E-DIR', true) RETURNING id INTO g_dir_exp;
    
    INSERT INTO ledger_groups (tenant_id, name, nature, parent_group_id, code, is_system) VALUES 
    (target_tenant_id, 'Indirect Expenses', 'Expense', g_exp, 'E-IND', true) RETURNING id INTO g_ind_exp;

    -- 6. CREATE DEFAULT LEDGERS
    -- Cash
    INSERT INTO ledgers (tenant_id, name, group_id, is_system) VALUES 
    (target_tenant_id, 'Cash', g_cash_grp, true);
    
    -- Sales
    INSERT INTO ledgers (tenant_id, name, group_id, is_system) VALUES 
    (target_tenant_id, 'Sales Account', g_sales, true);
    
    -- Purchase
    INSERT INTO ledgers (tenant_id, name, group_id, is_system) VALUES 
    (target_tenant_id, 'Purchase Account', g_pur, true);

    -- Duties & Taxes (Standard GST Ledges)
    -- Output
    INSERT INTO ledgers (tenant_id, name, group_id, is_system) VALUES 
    (target_tenant_id, 'Output CGST', g_duties, true),
    (target_tenant_id, 'Output SGST', g_duties, true),
    (target_tenant_id, 'Output IGST', g_duties, true);
    
    -- Input (Technically Asset, but usually grouped under Duties & Taxes in many ERPs for netting off. 
    -- However, standard accounting says Input Credit is Current Asset. 
    -- Let's put Input GST under Duties & Taxes for standard auto-netting visibility widely used in India Tally/Zoho pattern, 
    -- OR under Current Assets. Let's stick to Duties & Taxes for simplicity of "Tax Payable" calculation)
    INSERT INTO ledgers (tenant_id, name, group_id, is_system) VALUES 
    (target_tenant_id, 'Input CGST', g_duties, true),
    (target_tenant_id, 'Input SGST', g_duties, true),
    (target_tenant_id, 'Input IGST', g_duties, true);

    -- Common Expenses
    INSERT INTO ledgers (tenant_id, name, group_id, is_system) VALUES 
    (target_tenant_id, 'Discount Allowed', g_ind_exp, true),
    (target_tenant_id, 'Discount Received', g_ind_inc, true),
    (target_tenant_id, 'Round Off', g_ind_exp, true),
    (target_tenant_id, 'Bank Charges', g_ind_exp, true);

END;
$$;


-- TRIGGER TO AUTO-SEED ON NEW DISTRIBUTOR PROFILE
CREATE OR REPLACE FUNCTION public.handle_new_distributor_accounting()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- user_id in distributor_profiles IS the tenant_id concept for that company
    PERFORM public.initialize_tenant_ledgers(NEW.user_id);
    RETURN NEW;
END;
$$;

-- Drop trigger if exists to avoid conflict on re-run
DROP TRIGGER IF EXISTS on_distributor_created_seed_accounting ON public.distributor_profiles;

CREATE TRIGGER on_distributor_created_seed_accounting
    AFTER INSERT ON public.distributor_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_distributor_accounting();

-- SEED EXISTING TENANTS (One-time shim)
-- This block will run once to backfill existing companies
DO $$
DECLARE
    distributor RECORD;
BEGIN
    FOR distributor IN SELECT user_id FROM distributor_profiles
    LOOP
        -- Check if groups already exist to avoid duplicates
        IF NOT EXISTS (SELECT 1 FROM ledger_groups WHERE tenant_id = distributor.user_id LIMIT 1) THEN
            PERFORM public.initialize_tenant_ledgers(distributor.user_id);
            RAISE NOTICE 'Seeded ledgers for tenant: %', distributor.user_id;
        END IF;
    END LOOP;
END;
$$;
