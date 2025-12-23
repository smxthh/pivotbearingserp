-- Seed default GST and Accounting ledger accounts
-- This creates system ledgers that are required for proper double-entry accounting

-- Create a function to seed default ledgers for a distributor
CREATE OR REPLACE FUNCTION public.seed_default_ledgers(p_distributor_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Sales Account
    INSERT INTO ledgers (distributor_id, name, group_name, opening_balance, opening_balance_type, closing_balance, is_system, is_active)
    VALUES (p_distributor_id, 'Sales Account', 'Sales Account', 0, 'Cr', 0, true, true)
    ON CONFLICT DO NOTHING;

    -- Purchase Account
    INSERT INTO ledgers (distributor_id, name, group_name, opening_balance, opening_balance_type, closing_balance, is_system, is_active)
    VALUES (p_distributor_id, 'Purchase Account', 'Purchase Account', 0, 'Dr', 0, true, true)
    ON CONFLICT DO NOTHING;

    -- GST Output Accounts (Liabilities - what we owe to government)
    INSERT INTO ledgers (distributor_id, name, group_name, opening_balance, opening_balance_type, closing_balance, is_system, is_active)
    VALUES 
        (p_distributor_id, 'CGST Output', 'Duties & Taxes', 0, 'Cr', 0, true, true),
        (p_distributor_id, 'SGST Output', 'Duties & Taxes', 0, 'Cr', 0, true, true),
        (p_distributor_id, 'IGST Output', 'Duties & Taxes', 0, 'Cr', 0, true, true)
    ON CONFLICT DO NOTHING;

    -- GST Input Accounts (Assets - what government owes us)
    INSERT INTO ledgers (distributor_id, name, group_name, opening_balance, opening_balance_type, closing_balance, is_system, is_active)
    VALUES 
        (p_distributor_id, 'CGST Input', 'Duties & Taxes', 0, 'Dr', 0, true, true),
        (p_distributor_id, 'SGST Input', 'Duties & Taxes', 0, 'Dr', 0, true, true),
        (p_distributor_id, 'IGST Input', 'Duties & Taxes', 0, 'Dr', 0, true, true)
    ON CONFLICT DO NOTHING;

    -- Cash & Bank Accounts
    INSERT INTO ledgers (distributor_id, name, group_name, opening_balance, opening_balance_type, closing_balance, is_system, is_active)
    VALUES 
        (p_distributor_id, 'Cash Account', 'Cash-in-Hand', 0, 'Dr', 0, true, true),
        (p_distributor_id, 'Bank Account', 'Bank Accounts', 0, 'Dr', 0, true, true)
    ON CONFLICT DO NOTHING;

    -- TCS/TDS Accounts
    INSERT INTO ledgers (distributor_id, name, group_name, opening_balance, opening_balance_type, closing_balance, is_system, is_active)
    VALUES 
        (p_distributor_id, 'TCS Payable', 'Duties & Taxes', 0, 'Cr', 0, true, true),
        (p_distributor_id, 'TDS Payable', 'Duties & Taxes', 0, 'Cr', 0, true, true)
    ON CONFLICT DO NOTHING;

    -- Round Off Account
    INSERT INTO ledgers (distributor_id, name, group_name, opening_balance, opening_balance_type, closing_balance, is_system, is_active)
    VALUES (p_distributor_id, 'Round Off', 'Indirect Expenses', 0, 'Dr', 0, true, true)
    ON CONFLICT DO NOTHING;

    -- Discount Accounts
    INSERT INTO ledgers (distributor_id, name, group_name, opening_balance, opening_balance_type, closing_balance, is_system, is_active)
    VALUES 
        (p_distributor_id, 'Discount Allowed', 'Indirect Expenses', 0, 'Dr', 0, true, true),
        (p_distributor_id, 'Discount Received', 'Indirect Income', 0, 'Cr', 0, true, true)
    ON CONFLICT DO NOTHING;
END;
$$;

-- Seed default ledgers for all existing distributors
DO $$
DECLARE
    dist_record RECORD;
BEGIN
    FOR dist_record IN SELECT id FROM distributor_profiles
    LOOP
        PERFORM seed_default_ledgers(dist_record.id);
    END LOOP;
END $$;

-- Create a trigger to auto-seed ledgers when a new distributor is created
CREATE OR REPLACE FUNCTION public.auto_seed_ledgers_on_distributor_create()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    PERFORM seed_default_ledgers(NEW.id);
    RETURN NEW;
END;
$$;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS trigger_seed_default_ledgers ON distributor_profiles;
CREATE TRIGGER trigger_seed_default_ledgers
    AFTER INSERT ON distributor_profiles
    FOR EACH ROW
    EXECUTE FUNCTION auto_seed_ledgers_on_distributor_create();