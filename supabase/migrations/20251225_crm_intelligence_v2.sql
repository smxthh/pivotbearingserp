-- Migration: CRM Intelligence V2
-- Description: Adds "Intelligence" RPCs for the daily command dashboard.

-- ==========================================
-- 1. COMMAND DASHBOARD (Daily Pulse)
-- ==========================================

DROP TYPE IF EXISTS crm_command_dashboard_data;
CREATE TYPE crm_command_dashboard_data AS (
    todays_leads INTEGER,
    pending_followups INTEGER,
    revenue_mtd NUMERIC,
    revenue_target_mtd NUMERIC, 
    top_blocker TEXT
);

CREATE OR REPLACE FUNCTION crm_get_command_dashboard(
    target_monthly_revenue NUMERIC DEFAULT 5000000
)
RETURNS crm_command_dashboard_data
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result crm_command_dashboard_data;
    v_tenant_id UUID;
    v_start_month DATE := DATE_TRUNC('month', CURRENT_DATE);
BEGIN
    SELECT tenant_id INTO v_tenant_id FROM user_roles WHERE user_id = auth.uid() LIMIT 1;
    
    -- Today's Leads
    SELECT COUNT(*) INTO result.todays_leads
    FROM vouchers
    WHERE tenant_id = v_tenant_id
      AND voucher_type = 'sales_enquiry'
      AND voucher_date = CURRENT_DATE;

    -- Pending Followups (Quotations pending > 3 days)
    SELECT COUNT(*) INTO result.pending_followups
    FROM vouchers
    WHERE tenant_id = v_tenant_id
      AND voucher_type = 'sales_quotation'
      AND status = 'pending';
      -- AND voucher_date < CURRENT_DATE - 3; (Simpler logic for now: all pending quotes need action)

    -- Revenue MTD
    SELECT COALESCE(SUM(total_amount), 0) INTO result.revenue_mtd
    FROM vouchers
    WHERE tenant_id = v_tenant_id
      AND voucher_type IN ('sales_invoice', 'tax_invoice')
      AND voucher_date >= v_start_month
      AND status != 'cancelled';

    result.revenue_target_mtd := target_monthly_revenue;

    -- identify top blocker (placeholder logic)
    IF result.pending_followups > 5 THEN
        result.top_blocker := result.pending_followups || ' quotes pending closure.';
    ELSIF result.todays_leads = 0 THEN
        result.top_blocker := 'Zero new leads today.';
    ELSE
        result.top_blocker := 'None. Go sell!';
    END IF;

    RETURN result;
END;
$$;


-- ==========================================
-- 2. PIPELINE INTELLIGENCE
-- ==========================================

DROP TYPE IF EXISTS crm_pipeline_stage;
CREATE TYPE crm_pipeline_stage AS (
    stage TEXT,
    count INTEGER,
    value NUMERIC,
    avg_age_days NUMERIC
);

CREATE OR REPLACE FUNCTION crm_get_pipeline_intelligence()
RETURNS SETOF crm_pipeline_stage
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_tenant_id UUID;
BEGIN
    SELECT tenant_id INTO v_tenant_id FROM user_roles WHERE user_id = auth.uid() LIMIT 1;

    -- Enquiry Stage
    RETURN QUERY SELECT 
        'Enquiry'::TEXT, 
        COUNT(*)::INTEGER, 
        COALESCE(SUM(total_amount), 0),
        COALESCE(AVG(CURRENT_DATE - voucher_date), 0)::NUMERIC
    FROM vouchers 
    WHERE tenant_id = v_tenant_id AND voucher_type = 'sales_enquiry' AND status = 'pending';

    -- Quotation Stage
    RETURN QUERY SELECT 
        'Quotation'::TEXT, 
        COUNT(*)::INTEGER, 
        COALESCE(SUM(total_amount), 0),
        COALESCE(AVG(CURRENT_DATE - voucher_date), 0)::NUMERIC
    FROM vouchers 
    WHERE tenant_id = v_tenant_id AND voucher_type = 'sales_quotation' AND status = 'pending';

    -- Invoice (Won) - Last 30 Days
    RETURN QUERY SELECT 
        'Closed Won'::TEXT, 
        COUNT(*)::INTEGER, 
        COALESCE(SUM(total_amount), 0),
        COALESCE(AVG(CURRENT_DATE - voucher_date), 0)::NUMERIC
    FROM vouchers 
    WHERE tenant_id = v_tenant_id AND voucher_type IN ('sales_invoice', 'tax_invoice') 
      AND voucher_date >= CURRENT_DATE - 30;

END;
$$;


-- ==========================================
-- 3. CUSTOMER INTELLIGENCE
-- ==========================================

DROP TYPE IF EXISTS crm_customer_insight;
CREATE TYPE crm_customer_insight AS (
    party_name TEXT,
    segment TEXT, -- 'Dormant', 'VIP', 'New'
    last_order_days_ago INTEGER,
    total_revenue NUMERIC,
    action_needed TEXT
);

CREATE OR REPLACE FUNCTION crm_get_customer_intelligence()
RETURNS SETOF crm_customer_insight
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_tenant_id UUID;
BEGIN
    SELECT tenant_id INTO v_tenant_id FROM user_roles WHERE user_id = auth.uid() LIMIT 1;

    RETURN QUERY
    WITH PartyStats AS (
        SELECT 
            p.name,
            MAX(v.voucher_date) as last_order,
            SUM(v.total_amount) as total_val
        FROM parties p
        JOIN vouchers v ON p.id = v.party_id
        WHERE v.tenant_id = v_tenant_id AND v.voucher_type IN ('sales_invoice', 'tax_invoice')
        GROUP BY p.name
    )
    SELECT 
        name::TEXT,
        CASE 
            WHEN (CURRENT_DATE - last_order) > 90 THEN 'Dormant'
            WHEN total_val > 500000 THEN 'VIP'
            ELSE 'Active'
        END::TEXT as segment,
        (CURRENT_DATE - last_order)::INTEGER,
        total_val::NUMERIC,
        CASE 
            WHEN (CURRENT_DATE - last_order) > 90 THEN 'Re-engage immediately'
            WHEN total_val > 500000 THEN 'Upsell Opportunity'
            ELSE 'Maintain Relationship'
        END::TEXT as action_needed
    FROM PartyStats
    ORDER BY total_val DESC
    LIMIT 20;
END;
$$;


-- ==========================================
-- 4. TASKS & EXECUTION
-- ==========================================

DROP TYPE IF EXISTS crm_smart_task;
CREATE TYPE crm_smart_task AS (
    task_type TEXT,
    description TEXT,
    priority TEXT, -- 'High', 'Medium', 'Low'
    deal_value NUMERIC,
    reference_id UUID
);

CREATE OR REPLACE FUNCTION crm_get_tasks_execution()
RETURNS SETOF crm_smart_task
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_tenant_id UUID;
BEGIN
    SELECT tenant_id INTO v_tenant_id FROM user_roles WHERE user_id = auth.uid() LIMIT 1;

    -- High Priority: Large Pending Quotes
    RETURN QUERY
    SELECT 
        'Close Deal'::TEXT,
        ('Follow up on Quote #' || voucher_number || ' for ' || COALESCE((SELECT name FROM parties WHERE id = vouchers.party_id), 'Client'))::TEXT,
        'High'::TEXT,
        total_amount,
        id
    FROM vouchers
    WHERE tenant_id = v_tenant_id 
      AND voucher_type = 'sales_quotation'
      AND status = 'pending'
      AND total_amount > 50000;

    -- Medium Priority: Old Enquiries
    RETURN QUERY
    SELECT 
        'Lead Response'::TEXT,
        ('Respond to Enquiry #' || voucher_number)::TEXT,
        'Medium'::TEXT,
        0::NUMERIC,
        id
    FROM vouchers
    WHERE tenant_id = v_tenant_id 
      AND voucher_type = 'sales_enquiry'
      AND status = 'pending'
      AND voucher_date < CURRENT_DATE - 2;

END;
$$;
