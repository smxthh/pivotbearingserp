-- Migration: CRM Business Intelligence Engine
-- Description: Comprehensive real-time business analysis RPC

-- Create composite types for structured returns

-- Salesperson performance data
DROP TYPE IF EXISTS crm_salesperson_performance CASCADE;
CREATE TYPE crm_salesperson_performance AS (
    salesperson_id UUID,
    salesperson_name TEXT,
    total_revenue NUMERIC,
    total_deals INTEGER,
    avg_deal_value NUMERIC,
    avg_days_to_close NUMERIC,
    deals_this_month INTEGER,
    revenue_this_month NUMERIC
);

-- City/Region breakdown
DROP TYPE IF EXISTS crm_city_performance CASCADE;
CREATE TYPE crm_city_performance AS (
    city TEXT,
    state TEXT,
    total_revenue NUMERIC,
    customer_count INTEGER,
    deal_count INTEGER
);

-- Main business pulse response
DROP TYPE IF EXISTS crm_business_pulse CASCADE;
CREATE TYPE crm_business_pulse AS (
    -- Targets
    monthly_sales_target NUMERIC,
    daily_sales_target NUMERIC,
    
    -- Current Performance
    revenue_mtd NUMERIC,
    revenue_today NUMERIC,
    customers_this_month INTEGER,
    customers_today INTEGER,
    deals_this_month INTEGER,
    deals_today INTEGER,
    avg_deal_value NUMERIC,
    
    -- Velocity
    avg_days_to_close NUMERIC,
    pending_quotes_count INTEGER,
    pending_quotes_value NUMERIC,
    
    -- Financial Health
    total_receivables NUMERIC,
    total_payables NUMERIC,
    cash_reserves NUMERIC,
    monthly_burn_rate NUMERIC,
    
    -- Insights (JSON arrays stored as TEXT for compatibility)
    top_city TEXT,
    top_city_revenue NUMERIC,
    underserved_city TEXT,
    top_performer_name TEXT,
    top_performer_revenue NUMERIC,
    needs_coaching_name TEXT,
    needs_coaching_reason TEXT
);

-- Main function: Get comprehensive business pulse
CREATE OR REPLACE FUNCTION crm_get_business_pulse()
RETURNS crm_business_pulse
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result crm_business_pulse;
    v_tenant_id UUID;
    v_start_month DATE := DATE_TRUNC('month', CURRENT_DATE);
    v_today DATE := CURRENT_DATE;
    v_historical_avg NUMERIC;
    v_working_days INTEGER := 22; -- Approximate working days per month
BEGIN
    -- Get tenant
    SELECT tenant_id INTO v_tenant_id FROM user_roles WHERE user_id = auth.uid() LIMIT 1;
    
    IF v_tenant_id IS NULL THEN
        RAISE EXCEPTION 'User not associated with any tenant';
    END IF;
    
    -- Calculate Monthly Target (average of last 3 months revenue)
    SELECT COALESCE(AVG(monthly_rev), 500000) INTO v_historical_avg
    FROM (
        SELECT DATE_TRUNC('month', voucher_date) as month, SUM(total_amount) as monthly_rev
        FROM vouchers
        WHERE tenant_id = v_tenant_id
          AND voucher_type IN ('sales_invoice', 'tax_invoice')
          AND status != 'cancelled'
          AND voucher_date >= CURRENT_DATE - INTERVAL '3 months'
        GROUP BY DATE_TRUNC('month', voucher_date)
    ) monthly_data;
    
    result.monthly_sales_target := v_historical_avg * 1.1; -- 10% growth target
    result.daily_sales_target := result.monthly_sales_target / v_working_days;
    
    -- Revenue MTD
    SELECT COALESCE(SUM(total_amount), 0) INTO result.revenue_mtd
    FROM vouchers
    WHERE tenant_id = v_tenant_id
      AND voucher_type IN ('sales_invoice', 'tax_invoice')
      AND voucher_date >= v_start_month
      AND status != 'cancelled';
    
    -- Revenue Today
    SELECT COALESCE(SUM(total_amount), 0) INTO result.revenue_today
    FROM vouchers
    WHERE tenant_id = v_tenant_id
      AND voucher_type IN ('sales_invoice', 'tax_invoice')
      AND voucher_date = v_today
      AND status != 'cancelled';
    
    -- Unique customers this month
    SELECT COUNT(DISTINCT party_id) INTO result.customers_this_month
    FROM vouchers
    WHERE tenant_id = v_tenant_id
      AND voucher_type IN ('sales_invoice', 'tax_invoice')
      AND voucher_date >= v_start_month
      AND status != 'cancelled';
    
    -- Unique customers today
    SELECT COUNT(DISTINCT party_id) INTO result.customers_today
    FROM vouchers
    WHERE tenant_id = v_tenant_id
      AND voucher_type IN ('sales_invoice', 'tax_invoice')
      AND voucher_date = v_today
      AND status != 'cancelled';
    
    -- Deals this month
    SELECT COUNT(*) INTO result.deals_this_month
    FROM vouchers
    WHERE tenant_id = v_tenant_id
      AND voucher_type IN ('sales_invoice', 'tax_invoice')
      AND voucher_date >= v_start_month
      AND status != 'cancelled';
    
    -- Deals today
    SELECT COUNT(*) INTO result.deals_today
    FROM vouchers
    WHERE tenant_id = v_tenant_id
      AND voucher_type IN ('sales_invoice', 'tax_invoice')
      AND voucher_date = v_today
      AND status != 'cancelled';
    
    -- Average deal value
    IF result.deals_this_month > 0 THEN
        result.avg_deal_value := result.revenue_mtd / result.deals_this_month;
    ELSE
        result.avg_deal_value := 0;
    END IF;
    
    -- Velocity: Average days to close (from enquiry to invoice)
    SELECT COALESCE(AVG(v.voucher_date - src.voucher_date), 7)
    INTO result.avg_days_to_close
    FROM vouchers v
    JOIN vouchers src ON v.source_enquiry_id = src.id
    WHERE v.tenant_id = v_tenant_id
      AND v.voucher_type IN ('sales_invoice', 'tax_invoice')
      AND v.voucher_date >= v_start_month;
    
    -- Pending quotes
    SELECT COUNT(*), COALESCE(SUM(total_amount), 0)
    INTO result.pending_quotes_count, result.pending_quotes_value
    FROM vouchers
    WHERE tenant_id = v_tenant_id
      AND voucher_type = 'sales_quotation'
      AND status = 'pending';
    
    -- Financial Health: Receivables (Sundry Debtors)
    SELECT COALESCE(SUM(l.current_balance), 0) INTO result.total_receivables
    FROM ledgers l
    JOIN ledger_groups lg ON l.group_id = lg.id
    WHERE l.tenant_id = v_tenant_id AND lg.name = 'Sundry Debtors';
    
    -- Payables (Sundry Creditors)
    SELECT COALESCE(SUM(l.current_balance), 0) INTO result.total_payables
    FROM ledgers l
    JOIN ledger_groups lg ON l.group_id = lg.id
    WHERE l.tenant_id = v_tenant_id AND lg.name = 'Sundry Creditors';
    
    -- Cash Reserves
    SELECT COALESCE(SUM(l.current_balance), 0) INTO result.cash_reserves
    FROM ledgers l
    JOIN ledger_groups lg ON l.group_id = lg.id
    WHERE l.tenant_id = v_tenant_id AND lg.name IN ('Cash-in-Hand', 'Bank Accounts');
    
    -- Monthly Burn Rate
    SELECT COALESCE(AVG(monthly_exp), 0) INTO result.monthly_burn_rate
    FROM (
        SELECT DATE_TRUNC('month', le.entry_date) as month, SUM(le.debit - le.credit) as monthly_exp
        FROM ledger_entries le
        JOIN ledgers l ON le.ledger_id = l.id
        JOIN ledger_groups lg ON l.group_id = lg.id
        WHERE le.tenant_id = v_tenant_id
          AND lg.nature = 'Expense'
          AND le.entry_date >= CURRENT_DATE - INTERVAL '3 months'
        GROUP BY DATE_TRUNC('month', le.entry_date)
    ) expense_data;
    
    -- Top performing city
    SELECT city, SUM(total_amount)
    INTO result.top_city, result.top_city_revenue
    FROM vouchers
    WHERE tenant_id = v_tenant_id
      AND voucher_type IN ('sales_invoice', 'tax_invoice')
      AND voucher_date >= v_start_month
      AND status != 'cancelled'
      AND city IS NOT NULL
    GROUP BY city
    ORDER BY SUM(total_amount) DESC
    LIMIT 1;
    
    -- Underserved city (least orders but has at least 1)
    SELECT city INTO result.underserved_city
    FROM vouchers
    WHERE tenant_id = v_tenant_id
      AND voucher_type IN ('sales_invoice', 'tax_invoice')
      AND voucher_date >= CURRENT_DATE - INTERVAL '3 months'
      AND status != 'cancelled'
      AND city IS NOT NULL
    GROUP BY city
    HAVING COUNT(*) >= 1
    ORDER BY SUM(total_amount) ASC
    LIMIT 1;
    
    -- Top performer (salesperson with highest revenue this month)
    SELECT s.name, SUM(v.total_amount)
    INTO result.top_performer_name, result.top_performer_revenue
    FROM vouchers v
    JOIN salespersons s ON v.sales_executive_id = s.id
    WHERE v.tenant_id = v_tenant_id
      AND v.voucher_type IN ('sales_invoice', 'tax_invoice')
      AND v.voucher_date >= v_start_month
      AND v.status != 'cancelled'
    GROUP BY s.id, s.name
    ORDER BY SUM(v.total_amount) DESC
    LIMIT 1;
    
    -- Needs coaching (salesperson with slowest velocity or lowest deals)
    SELECT s.name, 'Slow deal closure - avg ' || ROUND(COALESCE(AVG(v.voucher_date - src.voucher_date), 0)) || ' days'
    INTO result.needs_coaching_name, result.needs_coaching_reason
    FROM vouchers v
    JOIN salespersons s ON v.sales_executive_id = s.id
    LEFT JOIN vouchers src ON v.source_enquiry_id = src.id
    WHERE v.tenant_id = v_tenant_id
      AND v.voucher_type IN ('sales_invoice', 'tax_invoice')
      AND v.voucher_date >= v_start_month
      AND v.status != 'cancelled'
    GROUP BY s.id, s.name
    HAVING COUNT(*) >= 1
    ORDER BY COALESCE(AVG(v.voucher_date - src.voucher_date), 999) DESC
    LIMIT 1;
    
    RETURN result;
END;
$$;

-- Function: Get salesperson performance rankings
CREATE OR REPLACE FUNCTION crm_get_salesperson_rankings()
RETURNS SETOF crm_salesperson_performance
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_tenant_id UUID;
    v_start_month DATE := DATE_TRUNC('month', CURRENT_DATE);
BEGIN
    SELECT tenant_id INTO v_tenant_id FROM user_roles WHERE user_id = auth.uid() LIMIT 1;
    
    RETURN QUERY
    SELECT 
        s.id,
        s.name::TEXT,
        COALESCE(SUM(v.total_amount), 0)::NUMERIC as total_revenue,
        COUNT(v.id)::INTEGER as total_deals,
        CASE WHEN COUNT(v.id) > 0 THEN (SUM(v.total_amount) / COUNT(v.id))::NUMERIC ELSE 0 END as avg_deal_value,
        COALESCE(AVG(v.voucher_date - src.voucher_date), 7)::NUMERIC as avg_days_to_close,
        COUNT(CASE WHEN v.voucher_date >= v_start_month THEN 1 END)::INTEGER as deals_this_month,
        COALESCE(SUM(CASE WHEN v.voucher_date >= v_start_month THEN v.total_amount ELSE 0 END), 0)::NUMERIC as revenue_this_month
    FROM salespersons s
    LEFT JOIN vouchers v ON s.id = v.sales_executive_id 
        AND v.tenant_id = v_tenant_id
        AND v.voucher_type IN ('sales_invoice', 'tax_invoice')
        AND v.status != 'cancelled'
    LEFT JOIN vouchers src ON v.source_enquiry_id = src.id
    WHERE s.distributor_id IN (SELECT id FROM distributor_profiles WHERE user_id = v_tenant_id)
       OR s.tenant_id = v_tenant_id
    GROUP BY s.id, s.name
    ORDER BY COALESCE(SUM(CASE WHEN v.voucher_date >= v_start_month THEN v.total_amount ELSE 0 END), 0) DESC;
END;
$$;

-- Function: Get city/region performance
CREATE OR REPLACE FUNCTION crm_get_city_performance()
RETURNS SETOF crm_city_performance
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_tenant_id UUID;
BEGIN
    SELECT tenant_id INTO v_tenant_id FROM user_roles WHERE user_id = auth.uid() LIMIT 1;
    
    RETURN QUERY
    SELECT 
        COALESCE(v.city, 'Unknown')::TEXT as city,
        COALESCE(v.state, 'Unknown')::TEXT as state,
        SUM(v.total_amount)::NUMERIC as total_revenue,
        COUNT(DISTINCT v.party_id)::INTEGER as customer_count,
        COUNT(v.id)::INTEGER as deal_count
    FROM vouchers v
    WHERE v.tenant_id = v_tenant_id
      AND v.voucher_type IN ('sales_invoice', 'tax_invoice')
      AND v.status != 'cancelled'
      AND v.voucher_date >= DATE_TRUNC('month', CURRENT_DATE)
    GROUP BY v.city, v.state
    ORDER BY SUM(v.total_amount) DESC
    LIMIT 10;
END;
$$;
