-- Migration: CRM Financial Roadmap
-- Description: Add RPC function to fetch comprehensive financial metrics for CRM planning

-- Create composite type for financial roadmap return data
CREATE TYPE crm_financial_roadmap AS (
    total_income_this_month NUMERIC,
    total_expense_this_month NUMERIC,
    net_profit_this_month NUMERIC,
    total_receivables NUMERIC,
    total_payables NUMERIC,
    cash_on_hand NUMERIC,
    avg_monthly_burn NUMERIC
);

-- Function to get financial roadmap metrics
CREATE OR REPLACE FUNCTION crm_get_financial_roadmap()
RETURNS SETOF crm_financial_roadmap
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_tenant_id UUID;
    v_start_month DATE := DATE_TRUNC('month', CURRENT_DATE);
    v_end_month DATE := DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day';
    
    v_income NUMERIC := 0;
    v_expense NUMERIC := 0;
    v_receivables NUMERIC := 0;
    v_payables NUMERIC := 0;
    v_cash NUMERIC := 0;
    v_burn_rate NUMERIC := 0;
BEGIN
    -- Get current user's tenant_id
    SELECT tenant_id INTO v_tenant_id FROM user_roles WHERE user_id = auth.uid() LIMIT 1;
    
    IF v_tenant_id IS NULL THEN
        RAISE EXCEPTION 'User not associated with any tenant';
    END IF;
    
    -- Calculate Total Income This Month
    -- Sum credits from Income ledgers
    SELECT COALESCE(SUM(le.credit - le.debit), 0)
    INTO v_income
    FROM ledger_entries le
    JOIN ledgers l ON le.ledger_id = l.id
    JOIN ledger_groups lg ON l.group_id = lg.id
    WHERE le.tenant_id = v_tenant_id
      AND le.entry_date >= v_start_month
      AND le.entry_date <= v_end_month
      AND lg.nature = 'Income';
    
    -- Calculate Total Expense This Month
    -- Sum debits from Expense ledgers
    SELECT COALESCE(SUM(le.debit - le.credit), 0)
    INTO v_expense
    FROM ledger_entries le
    JOIN ledgers l ON le.ledger_id = l.id
    JOIN ledger_groups lg ON l.group_id = lg.id
    WHERE le.tenant_id = v_tenant_id
      AND le.entry_date >= v_start_month
      AND le.entry_date <= v_end_month
      AND lg.nature = 'Expense';
    
    -- Calculate Total Receivables (Sundry Debtors balance)
    SELECT COALESCE(SUM(l.current_balance), 0)
    INTO v_receivables
    FROM ledgers l
    JOIN ledger_groups lg ON l.group_id = lg.id
    WHERE l.tenant_id = v_tenant_id
      AND lg.name = 'Sundry Debtors';
    
    -- Calculate Total Payables (Sundry Creditors balance)
    SELECT COALESCE(SUM(l.current_balance), 0)
    INTO v_payables
    FROM ledgers l
    JOIN ledger_groups lg ON l.group_id = lg.id
    WHERE l.tenant_id = v_tenant_id
      AND lg.name = 'Sundry Creditors';
    
    -- Calculate Cash on Hand (Cash + Bank)
    SELECT COALESCE(SUM(l.current_balance), 0)
    INTO v_cash
    FROM ledgers l
    JOIN ledger_groups lg ON l.group_id = lg.id
    WHERE l.tenant_id = v_tenant_id
      AND lg.name IN ('Cash-in-Hand', 'Bank Accounts');
    
    -- Calculate Average Monthly Burn (last 3 months expense average)
    SELECT COALESCE(AVG(monthly_expense), 0)
    INTO v_burn_rate
    FROM (
        SELECT 
            DATE_TRUNC('month', le.entry_date) as month,
            SUM(le.debit - le.credit) as monthly_expense
        FROM ledger_entries le
        JOIN ledgers l ON le.ledger_id = l.id
        JOIN ledger_groups lg ON l.group_id = lg.id
        WHERE le.tenant_id = v_tenant_id
          AND le.entry_date >= CURRENT_DATE - INTERVAL '3 months'
          AND lg.nature = 'Expense'
        GROUP BY DATE_TRUNC('month', le.entry_date)
    ) monthly_data;
    
    -- Return the result
    RETURN QUERY SELECT
        v_income,
        v_expense,
        v_income - v_expense, -- net profit
        v_receivables,
        v_payables,
        v_cash,
        v_burn_rate;
END;
$$;
