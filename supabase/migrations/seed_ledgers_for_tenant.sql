-- DIRECT SEED FOR EXISTING TENANT
-- Run this in Supabase SQL Editor

DO $$
DECLARE
    target_tenant_id uuid;
    g_exp uuid;
    g_pur uuid;
    g_duties uuid;
    g_cur_liab uuid;
    g_liab uuid;
BEGIN
    -- Get your tenant ID
    SELECT user_id INTO target_tenant_id FROM distributor_profiles LIMIT 1;
    
    IF target_tenant_id IS NULL THEN
        RAISE EXCEPTION 'No distributor found';
    END IF;
    
    -- Check if groups exist
    IF NOT EXISTS (SELECT 1 FROM ledger_groups WHERE tenant_id = target_tenant_id LIMIT 1) THEN
        -- Create root groups
        INSERT INTO ledger_groups (tenant_id, name, nature, code, is_system) VALUES 
        (target_tenant_id, 'Expenses', 'Expense', 'EXP', true) RETURNING id INTO g_exp;
        
        INSERT INTO ledger_groups (tenant_id, name, nature, code, is_system) VALUES 
        (target_tenant_id, 'Liabilities', 'Liability', 'LIAB', true) RETURNING id INTO g_liab;
        
        -- Create sub-groups
        INSERT INTO ledger_groups (tenant_id, name, nature, parent_group_id, code, is_system) VALUES 
        (target_tenant_id, 'Purchase Accounts', 'Expense', g_exp, 'E-PUR', true) RETURNING id INTO g_pur;
        
        INSERT INTO ledger_groups (tenant_id, name, nature, parent_group_id, code, is_system) VALUES 
        (target_tenant_id, 'Current Liabilities', 'Liability', g_liab, 'L-CUR', true) RETURNING id INTO g_cur_liab;
        
        INSERT INTO ledger_groups (tenant_id, name, nature, parent_group_id, code, is_system) VALUES 
        (target_tenant_id, 'Duties & Taxes', 'Liability', g_cur_liab, 'L-DUT', true) RETURNING id INTO g_duties;
        
        -- Create default ledgers
        INSERT INTO ledgers (tenant_id, name, group_id, is_system) VALUES 
        (target_tenant_id, 'Purchase Account', g_pur, true),
        (target_tenant_id, 'Input CGST', g_duties, true),
        (target_tenant_id, 'Input SGST', g_duties, true),
        (target_tenant_id, 'Input IGST', g_duties, true),
        (target_tenant_id, 'Output CGST', g_duties, true),
        (target_tenant_id, 'Output SGST', g_duties, true),
        (target_tenant_id, 'Output IGST', g_duties, true);
        
        RAISE NOTICE 'Created ledger groups and ledgers for tenant: %', target_tenant_id;
    ELSE
        -- Groups exist, just ensure Purchase Account and Input GST ledgers exist
        SELECT id INTO g_pur FROM ledger_groups WHERE tenant_id = target_tenant_id AND name = 'Purchase Accounts' LIMIT 1;
        SELECT id INTO g_duties FROM ledger_groups WHERE tenant_id = target_tenant_id AND name = 'Duties & Taxes' LIMIT 1;
        
        -- Create Purchase Account if missing
        IF g_pur IS NOT NULL AND NOT EXISTS (SELECT 1 FROM ledgers WHERE tenant_id = target_tenant_id AND name = 'Purchase Account') THEN
            INSERT INTO ledgers (tenant_id, name, group_id, is_system) VALUES (target_tenant_id, 'Purchase Account', g_pur, true);
            RAISE NOTICE 'Created Purchase Account ledger';
        END IF;
        
        -- Create Input GST ledgers if missing
        IF g_duties IS NOT NULL THEN
            IF NOT EXISTS (SELECT 1 FROM ledgers WHERE tenant_id = target_tenant_id AND name = 'Input CGST') THEN
                INSERT INTO ledgers (tenant_id, name, group_id, is_system) VALUES (target_tenant_id, 'Input CGST', g_duties, true);
            END IF;
            IF NOT EXISTS (SELECT 1 FROM ledgers WHERE tenant_id = target_tenant_id AND name = 'Input SGST') THEN
                INSERT INTO ledgers (tenant_id, name, group_id, is_system) VALUES (target_tenant_id, 'Input SGST', g_duties, true);
            END IF;
            IF NOT EXISTS (SELECT 1 FROM ledgers WHERE tenant_id = target_tenant_id AND name = 'Input IGST') THEN
                INSERT INTO ledgers (tenant_id, name, group_id, is_system) VALUES (target_tenant_id, 'Input IGST', g_duties, true);
            END IF;
            RAISE NOTICE 'Ensured Input GST ledgers exist';
        END IF;
    END IF;
    
    RAISE NOTICE 'Done! Tenant ID: %', target_tenant_id;
END;
$$;
