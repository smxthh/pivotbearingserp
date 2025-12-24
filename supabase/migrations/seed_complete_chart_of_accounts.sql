-- ============================================================================
-- COMPLETE CHART OF ACCOUNTS SEEDING
-- Creates all necessary ledger groups and ledgers for ERP
-- Based on standard Indian accounting practices
-- ============================================================================

DO $$
DECLARE
    v_tenant_id uuid;
    
    -- Root Groups
    g_liab uuid; g_asset uuid; g_inc uuid; g_exp uuid;
    
    -- Sub Groups - Liabilities
    g_cur_liab uuid; g_duties uuid; g_sundry_cr uuid; g_capital uuid;
    
    -- Sub Groups - Assets
    g_cur_asset uuid; g_sundry_dr uuid; g_bank uuid; g_cash_grp uuid;
    
    -- Sub Groups - Income
    g_sales uuid; g_ind_inc uuid;
    
    -- Sub Groups - Expenses
    g_pur uuid; g_dir_exp uuid; g_ind_exp uuid;
    
BEGIN
    -- Get tenant ID (from logged-in user or first distributor)
    SELECT user_id INTO v_tenant_id FROM distributor_profiles LIMIT 1;
    
    IF v_tenant_id IS NULL THEN
        RAISE EXCEPTION 'No distributor found. Please create a distributor profile first.';
    END IF;
    
    -- ========================================================================
    -- PART 1: CREATE ROOT GROUPS (if not exists)
    -- ========================================================================
    
    -- Liabilities
    SELECT id INTO g_liab FROM ledger_groups WHERE tenant_id = v_tenant_id AND name = 'Liabilities';
    IF g_liab IS NULL THEN
        INSERT INTO ledger_groups (tenant_id, name, nature, code, is_system) 
        VALUES (v_tenant_id, 'Liabilities', 'Liability', 'LIAB', true) RETURNING id INTO g_liab;
    END IF;
    
    -- Assets
    SELECT id INTO g_asset FROM ledger_groups WHERE tenant_id = v_tenant_id AND name = 'Assets';
    IF g_asset IS NULL THEN
        INSERT INTO ledger_groups (tenant_id, name, nature, code, is_system) 
        VALUES (v_tenant_id, 'Assets', 'Asset', 'ASST', true) RETURNING id INTO g_asset;
    END IF;
    
    -- Income
    SELECT id INTO g_inc FROM ledger_groups WHERE tenant_id = v_tenant_id AND name = 'Income';
    IF g_inc IS NULL THEN
        INSERT INTO ledger_groups (tenant_id, name, nature, code, is_system) 
        VALUES (v_tenant_id, 'Income', 'Income', 'INC', true) RETURNING id INTO g_inc;
    END IF;
    
    -- Expenses
    SELECT id INTO g_exp FROM ledger_groups WHERE tenant_id = v_tenant_id AND name = 'Expenses';
    IF g_exp IS NULL THEN
        INSERT INTO ledger_groups (tenant_id, name, nature, code, is_system) 
        VALUES (v_tenant_id, 'Expenses', 'Expense', 'EXP', true) RETURNING id INTO g_exp;
    END IF;
    
    -- ========================================================================
    -- PART 2: CREATE SUB-GROUPS (Liabilities)
    -- ========================================================================
    
    SELECT id INTO g_cur_liab FROM ledger_groups WHERE tenant_id = v_tenant_id AND name = 'Current Liabilities';
    IF g_cur_liab IS NULL THEN
        INSERT INTO ledger_groups (tenant_id, name, nature, parent_group_id, code, is_system) 
        VALUES (v_tenant_id, 'Current Liabilities', 'Liability', g_liab, 'L-CUR', true) RETURNING id INTO g_cur_liab;
    END IF;
    
    SELECT id INTO g_duties FROM ledger_groups WHERE tenant_id = v_tenant_id AND name = 'Duties & Taxes';
    IF g_duties IS NULL THEN
        INSERT INTO ledger_groups (tenant_id, name, nature, parent_group_id, code, is_system) 
        VALUES (v_tenant_id, 'Duties & Taxes', 'Liability', g_cur_liab, 'L-DUT', true) RETURNING id INTO g_duties;
    END IF;
    
    SELECT id INTO g_sundry_cr FROM ledger_groups WHERE tenant_id = v_tenant_id AND name = 'Sundry Creditors';
    IF g_sundry_cr IS NULL THEN
        INSERT INTO ledger_groups (tenant_id, name, nature, parent_group_id, code, is_system) 
        VALUES (v_tenant_id, 'Sundry Creditors', 'Liability', g_cur_liab, 'L-SUN', true) RETURNING id INTO g_sundry_cr;
    END IF;
    
    SELECT id INTO g_capital FROM ledger_groups WHERE tenant_id = v_tenant_id AND name = 'Capital Account';
    IF g_capital IS NULL THEN
        INSERT INTO ledger_groups (tenant_id, name, nature, parent_group_id, code, is_system) 
        VALUES (v_tenant_id, 'Capital Account', 'Liability', g_liab, 'L-CAP', true) RETURNING id INTO g_capital;
    END IF;
    
    -- ========================================================================
    -- PART 3: CREATE SUB-GROUPS (Assets)
    -- ========================================================================
    
    SELECT id INTO g_cur_asset FROM ledger_groups WHERE tenant_id = v_tenant_id AND name = 'Current Assets';
    IF g_cur_asset IS NULL THEN
        INSERT INTO ledger_groups (tenant_id, name, nature, parent_group_id, code, is_system) 
        VALUES (v_tenant_id, 'Current Assets', 'Asset', g_asset, 'A-CUR', true) RETURNING id INTO g_cur_asset;
    END IF;
    
    SELECT id INTO g_sundry_dr FROM ledger_groups WHERE tenant_id = v_tenant_id AND name = 'Sundry Debtors';
    IF g_sundry_dr IS NULL THEN
        INSERT INTO ledger_groups (tenant_id, name, nature, parent_group_id, code, is_system) 
        VALUES (v_tenant_id, 'Sundry Debtors', 'Asset', g_cur_asset, 'A-SUN', true) RETURNING id INTO g_sundry_dr;
    END IF;
    
    SELECT id INTO g_bank FROM ledger_groups WHERE tenant_id = v_tenant_id AND name = 'Bank Accounts';
    IF g_bank IS NULL THEN
        INSERT INTO ledger_groups (tenant_id, name, nature, parent_group_id, code, is_system) 
        VALUES (v_tenant_id, 'Bank Accounts', 'Asset', g_cur_asset, 'A-BNK', true) RETURNING id INTO g_bank;
    END IF;
    
    SELECT id INTO g_cash_grp FROM ledger_groups WHERE tenant_id = v_tenant_id AND name = 'Cash-in-Hand';
    IF g_cash_grp IS NULL THEN
        INSERT INTO ledger_groups (tenant_id, name, nature, parent_group_id, code, is_system) 
        VALUES (v_tenant_id, 'Cash-in-Hand', 'Asset', g_cur_asset, 'A-CSH', true) RETURNING id INTO g_cash_grp;
    END IF;
    
    -- ========================================================================
    -- PART 4: CREATE SUB-GROUPS (Income)
    -- ========================================================================
    
    SELECT id INTO g_sales FROM ledger_groups WHERE tenant_id = v_tenant_id AND name = 'Sales Account';
    IF g_sales IS NULL THEN
        INSERT INTO ledger_groups (tenant_id, name, nature, parent_group_id, code, is_system) 
        VALUES (v_tenant_id, 'Sales Account', 'Income', g_inc, 'I-SAL', true) RETURNING id INTO g_sales;
    END IF;
    
    SELECT id INTO g_ind_inc FROM ledger_groups WHERE tenant_id = v_tenant_id AND name = 'Indirect Income';
    IF g_ind_inc IS NULL THEN
        INSERT INTO ledger_groups (tenant_id, name, nature, parent_group_id, code, is_system) 
        VALUES (v_tenant_id, 'Indirect Income', 'Income', g_inc, 'I-IND', true) RETURNING id INTO g_ind_inc;
    END IF;
    
    -- ========================================================================
    -- PART 5: CREATE SUB-GROUPS (Expenses)
    -- ========================================================================
    
    SELECT id INTO g_pur FROM ledger_groups WHERE tenant_id = v_tenant_id AND name = 'Purchase Account';
    IF g_pur IS NULL THEN
        INSERT INTO ledger_groups (tenant_id, name, nature, parent_group_id, code, is_system) 
        VALUES (v_tenant_id, 'Purchase Account', 'Expense', g_exp, 'E-PUR', true) RETURNING id INTO g_pur;
    END IF;
    
    SELECT id INTO g_dir_exp FROM ledger_groups WHERE tenant_id = v_tenant_id AND name = 'Direct Expenses';
    IF g_dir_exp IS NULL THEN
        INSERT INTO ledger_groups (tenant_id, name, nature, parent_group_id, code, is_system) 
        VALUES (v_tenant_id, 'Direct Expenses', 'Expense', g_exp, 'E-DIR', true) RETURNING id INTO g_dir_exp;
    END IF;
    
    SELECT id INTO g_ind_exp FROM ledger_groups WHERE tenant_id = v_tenant_id AND name = 'Indirect Expenses';
    IF g_ind_exp IS NULL THEN
        INSERT INTO ledger_groups (tenant_id, name, nature, parent_group_id, code, is_system) 
        VALUES (v_tenant_id, 'Indirect Expenses', 'Expense', g_exp, 'E-IND', true) RETURNING id INTO g_ind_exp;
    END IF;
    
    -- ========================================================================
    -- PART 6: CREATE LEDGERS (SALES ACCOUNTS)
    -- ========================================================================
    
    -- Sales Account (Main)
    INSERT INTO ledgers (tenant_id, name, group_id, is_system)
    SELECT v_tenant_id, 'Sales Account', g_sales, true
    WHERE NOT EXISTS (SELECT 1 FROM ledgers WHERE tenant_id = v_tenant_id AND name = 'Sales Account');
    
    -- Sales Account GST
    INSERT INTO ledgers (tenant_id, name, group_id, is_system)
    SELECT v_tenant_id, 'Sales Account GST', g_sales, true
    WHERE NOT EXISTS (SELECT 1 FROM ledgers WHERE tenant_id = v_tenant_id AND name = 'Sales Account GST');
    
    -- Sales Account IGST
    INSERT INTO ledgers (tenant_id, name, group_id, is_system)
    SELECT v_tenant_id, 'Sales Account IGST', g_sales, true
    WHERE NOT EXISTS (SELECT 1 FROM ledgers WHERE tenant_id = v_tenant_id AND name = 'Sales Account IGST');
    
    -- Sales Account Tax Free
    INSERT INTO ledgers (tenant_id, name, group_id, is_system)
    SELECT v_tenant_id, 'Sales Account Tax Free', g_sales, true
    WHERE NOT EXISTS (SELECT 1 FROM ledgers WHERE tenant_id = v_tenant_id AND name = 'Sales Account Tax Free');
    
    -- Exempted Sales (Nill Rated)
    INSERT INTO ledgers (tenant_id, name, group_id, is_system)
    SELECT v_tenant_id, 'Exempted Sales (Nill Rated)', g_sales, true
    WHERE NOT EXISTS (SELECT 1 FROM ledgers WHERE tenant_id = v_tenant_id AND name = 'Exempted Sales (Nill Rated)');
    
    -- Sales Account GST JOBWORK
    INSERT INTO ledgers (tenant_id, name, group_id, is_system)
    SELECT v_tenant_id, 'Sales Account GST JOBWORK', g_sales, true
    WHERE NOT EXISTS (SELECT 1 FROM ledgers WHERE tenant_id = v_tenant_id AND name = 'Sales Account GST JOBWORK');
    
    -- Sales Account IGST JOBWORK
    INSERT INTO ledgers (tenant_id, name, group_id, is_system)
    SELECT v_tenant_id, 'Sales Account IGST JOBWORK', g_sales, true
    WHERE NOT EXISTS (SELECT 1 FROM ledgers WHERE tenant_id = v_tenant_id AND name = 'Sales Account IGST JOBWORK');
    
    -- Export With Payment
    INSERT INTO ledgers (tenant_id, name, group_id, is_system)
    SELECT v_tenant_id, 'Export With Payment', g_sales, true
    WHERE NOT EXISTS (SELECT 1 FROM ledgers WHERE tenant_id = v_tenant_id AND name = 'Export With Payment');
    
    -- Export Without Payment
    INSERT INTO ledgers (tenant_id, name, group_id, is_system)
    SELECT v_tenant_id, 'Export Without Payment', g_sales, true
    WHERE NOT EXISTS (SELECT 1 FROM ledgers WHERE tenant_id = v_tenant_id AND name = 'Export Without Payment');
    
    -- SEZ Supplies With Payment
    INSERT INTO ledgers (tenant_id, name, group_id, is_system)
    SELECT v_tenant_id, 'SEZ Supplies With Payment', g_sales, true
    WHERE NOT EXISTS (SELECT 1 FROM ledgers WHERE tenant_id = v_tenant_id AND name = 'SEZ Supplies With Payment');
    
    -- SEZ Supplies Without Payment
    INSERT INTO ledgers (tenant_id, name, group_id, is_system)
    SELECT v_tenant_id, 'SEZ Supplies Without Payment', g_sales, true
    WHERE NOT EXISTS (SELECT 1 FROM ledgers WHERE tenant_id = v_tenant_id AND name = 'SEZ Supplies Without Payment');
    
    -- Deemed Export
    INSERT INTO ledgers (tenant_id, name, group_id, is_system)
    SELECT v_tenant_id, 'Deemed Export', g_sales, true
    WHERE NOT EXISTS (SELECT 1 FROM ledgers WHERE tenant_id = v_tenant_id AND name = 'Deemed Export');
    
    -- ========================================================================
    -- PART 7: CREATE LEDGERS (DUTIES & TAXES - OUTPUT)
    -- ========================================================================
    
    -- Output CGST
    INSERT INTO ledgers (tenant_id, name, group_id, is_system)
    SELECT v_tenant_id, 'CGST (O/P)', g_duties, true
    WHERE NOT EXISTS (SELECT 1 FROM ledgers WHERE tenant_id = v_tenant_id AND name = 'CGST (O/P)');
    
    INSERT INTO ledgers (tenant_id, name, group_id, is_system)
    SELECT v_tenant_id, 'Output CGST', g_duties, true
    WHERE NOT EXISTS (SELECT 1 FROM ledgers WHERE tenant_id = v_tenant_id AND name = 'Output CGST');
    
    -- Output SGST
    INSERT INTO ledgers (tenant_id, name, group_id, is_system)
    SELECT v_tenant_id, 'SGST (O/P)', g_duties, true
    WHERE NOT EXISTS (SELECT 1 FROM ledgers WHERE tenant_id = v_tenant_id AND name = 'SGST (O/P)');
    
    INSERT INTO ledgers (tenant_id, name, group_id, is_system)
    SELECT v_tenant_id, 'Output SGST', g_duties, true
    WHERE NOT EXISTS (SELECT 1 FROM ledgers WHERE tenant_id = v_tenant_id AND name = 'Output SGST');
    
    -- Output IGST
    INSERT INTO ledgers (tenant_id, name, group_id, is_system)
    SELECT v_tenant_id, 'IGST (O/P)', g_duties, true
    WHERE NOT EXISTS (SELECT 1 FROM ledgers WHERE tenant_id = v_tenant_id AND name = 'IGST (O/P)');
    
    INSERT INTO ledgers (tenant_id, name, group_id, is_system)
    SELECT v_tenant_id, 'Output IGST', g_duties, true
    WHERE NOT EXISTS (SELECT 1 FROM ledgers WHERE tenant_id = v_tenant_id AND name = 'Output IGST');
    
    -- UTGST
    INSERT INTO ledgers (tenant_id, name, group_id, is_system)
    SELECT v_tenant_id, 'UTGST (O/P)', g_duties, true
    WHERE NOT EXISTS (SELECT 1 FROM ledgers WHERE tenant_id = v_tenant_id AND name = 'UTGST (O/P)');
    
    -- CESS
    INSERT INTO ledgers (tenant_id, name, group_id, is_system)
    SELECT v_tenant_id, 'CESS (O/P)', g_duties, true
    WHERE NOT EXISTS (SELECT 1 FROM ledgers WHERE tenant_id = v_tenant_id AND name = 'CESS (O/P)');
    
    -- TCS ON SALES
    INSERT INTO ledgers (tenant_id, name, group_id, is_system)
    SELECT v_tenant_id, 'TCS ON SALES PAYABLE A/C(206CR-SALES)', g_duties, true
    WHERE NOT EXISTS (SELECT 1 FROM ledgers WHERE tenant_id = v_tenant_id AND name = 'TCS ON SALES PAYABLE A/C(206CR-SALES)');
    
    -- ========================================================================
    -- PART 8: CREATE LEDGERS (DUTIES & TAXES - INPUT)
    -- ========================================================================
    
    -- Input CGST
    INSERT INTO ledgers (tenant_id, name, group_id, is_system)
    SELECT v_tenant_id, 'Input CGST', g_duties, true
    WHERE NOT EXISTS (SELECT 1 FROM ledgers WHERE tenant_id = v_tenant_id AND name = 'Input CGST');
    
    -- Input SGST
    INSERT INTO ledgers (tenant_id, name, group_id, is_system)
    SELECT v_tenant_id, 'Input SGST', g_duties, true
    WHERE NOT EXISTS (SELECT 1 FROM ledgers WHERE tenant_id = v_tenant_id AND name = 'Input SGST');
    
    -- Input IGST
    INSERT INTO ledgers (tenant_id, name, group_id, is_system)
    SELECT v_tenant_id, 'Input IGST', g_duties, true
    WHERE NOT EXISTS (SELECT 1 FROM ledgers WHERE tenant_id = v_tenant_id AND name = 'Input IGST');
    
    -- ========================================================================
    -- PART 9: CREATE LEDGERS (PURCHASE ACCOUNTS)
    -- ========================================================================
    
    -- Purchase Account (Main)
    INSERT INTO ledgers (tenant_id, name, group_id, is_system)
    SELECT v_tenant_id, 'Purchase Account', g_pur, true
    WHERE NOT EXISTS (SELECT 1 FROM ledgers WHERE tenant_id = v_tenant_id AND name = 'Purchase Account');
    
    -- Purchase Account GST
    INSERT INTO ledgers (tenant_id, name, group_id, is_system)
    SELECT v_tenant_id, 'Purchase Account GST', g_pur, true
    WHERE NOT EXISTS (SELECT 1 FROM ledgers WHERE tenant_id = v_tenant_id AND name = 'Purchase Account GST');
    
    -- Purchase Account IGST
    INSERT INTO ledgers (tenant_id, name, group_id, is_system)
    SELECT v_tenant_id, 'Purchase Account IGST', g_pur, true
    WHERE NOT EXISTS (SELECT 1 FROM ledgers WHERE tenant_id = v_tenant_id AND name = 'Purchase Account IGST');
    
    -- Purchase Account URD GST
    INSERT INTO ledgers (tenant_id, name, group_id, is_system)
    SELECT v_tenant_id, 'Purchase Account URD GST', g_pur, true
    WHERE NOT EXISTS (SELECT 1 FROM ledgers WHERE tenant_id = v_tenant_id AND name = 'Purchase Account URD GST');
    
    -- Purchase Account URD IGST  
    INSERT INTO ledgers (tenant_id, name, group_id, is_system)
    SELECT v_tenant_id, 'Purchase Account URD IGST', g_pur, true
    WHERE NOT EXISTS (SELECT 1 FROM ledgers WHERE tenant_id = v_tenant_id AND name = 'Purchase Account URD IGST');
    
    -- Purchase Account Tax Free
    INSERT INTO ledgers (tenant_id, name, group_id, is_system)
    SELECT v_tenant_id, 'Purchase Account Tax Free', g_pur, true
    WHERE NOT EXISTS (SELECT 1 FROM ledgers WHERE tenant_id = v_tenant_id AND name = 'Purchase Account Tax Free');
    
    -- Exempted Purchase (Nill Rated)
    INSERT INTO ledgers (tenant_id, name, group_id, is_system)
    SELECT v_tenant_id, 'Exempted Purchase (Nill Rated)', g_pur, true
    WHERE NOT EXISTS (SELECT 1 FROM ledgers WHERE tenant_id = v_tenant_id AND name = 'Exempted Purchase (Nill Rated)');
    
    -- ========================================================================
    -- PART 10: CREATE COMMON LEDGERS
    -- ========================================================================
    
    -- Cash
    INSERT INTO ledgers (tenant_id, name, group_id, is_system)
    SELECT v_tenant_id, 'Cash', g_cash_grp, true
    WHERE NOT EXISTS (SELECT 1 FROM ledgers WHERE tenant_id = v_tenant_id AND name = 'Cash');
    
    -- Round Off
    INSERT INTO ledgers (tenant_id, name, group_id, is_system)
    SELECT v_tenant_id, 'Round Off', g_ind_exp, true
    WHERE NOT EXISTS (SELECT 1 FROM ledgers WHERE tenant_id = v_tenant_id AND name = 'Round Off');
    
    -- Discount Allowed
    INSERT INTO ledgers (tenant_id, name, group_id, is_system)
    SELECT v_tenant_id, 'Discount Allowed', g_ind_exp, true
    WHERE NOT EXISTS (SELECT 1 FROM ledgers WHERE tenant_id = v_tenant_id AND name = 'Discount Allowed');
    
    -- Discount Received
    INSERT INTO ledgers (tenant_id, name, group_id, is_system)
    SELECT v_tenant_id, 'Discount Received', g_ind_inc, true
    WHERE NOT EXISTS (SELECT 1 FROM ledgers WHERE tenant_id = v_tenant_id AND name = 'Discount Received');
    
    -- Bank Charges
    INSERT INTO ledgers (tenant_id, name, group_id, is_system)
    SELECT v_tenant_id, 'Bank Charges', g_ind_exp, true
    WHERE NOT EXISTS (SELECT 1 FROM ledgers WHERE tenant_id = v_tenant_id AND name = 'Bank Charges');
    
    RAISE NOTICE 'Successfully created complete Chart of Accounts for tenant: %', v_tenant_id;
    
END;
$$;
