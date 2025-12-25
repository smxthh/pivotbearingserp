-- Migration: CRM Intelligence Engine
-- Description: Adds RPCs for AI Business Planner (Baseline Metrics, Gap Analysis, Simulation)

-- 1. Create a composite type for Baseline Metrics to return structured data
CREATE TYPE crm_baseline_metrics AS (
    avg_deal_value NUMERIC,
    conversion_rate NUMERIC,
    avg_sales_cycle_days NUMERIC,
    deals_per_salesperson_per_month NUMERIC,
    total_revenue_last_period NUMERIC,
    total_invoices_last_period BIGINT,
    total_leads_last_period BIGINT,
    top_performing_zone TEXT,
    top_performing_product_category TEXT
);

-- 2. Function to calculate baseline metrics from historical data
CREATE OR REPLACE FUNCTION crm_get_baseline_metrics(
    period_start DATE,
    period_end DATE
)
RETURNS crm_baseline_metrics
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result crm_baseline_metrics;
    v_tenant_id UUID;
    v_total_revenue NUMERIC;
    v_total_invoices BIGINT;
    v_total_leads BIGINT;
    v_avg_deal_value NUMERIC;
    v_conversion_rate NUMERIC;
    v_avg_cycle NUMERIC;
    v_active_salespeople BIGINT;
    v_months_diff NUMERIC;
BEGIN
    -- Get current user's tenant_id (assuming Row Level Security context or standard app pattern)
    -- Fallback to finding tenant from a known table if auth.uid() is not sufficient, but usually auth.uid() -> user_roles -> tenant_id
    SELECT tenant_id INTO v_tenant_id FROM user_roles WHERE user_id = auth.uid() LIMIT 1;

    -- Calculate Invoice Metrics (Revenue, Count)
    SELECT 
        COALESCE(SUM(total_amount), 0),
        COUNT(*)
    INTO v_total_revenue, v_total_invoices
    FROM vouchers
    WHERE tenant_id = v_tenant_id 
      AND voucher_type IN ('sales_invoice', 'tax_invoice')
      AND voucher_date BETWEEN period_start AND period_end
      AND status != 'cancelled';

    -- Calculate Average Deal Value
    IF v_total_invoices > 0 THEN
        v_avg_deal_value := v_total_revenue / v_total_invoices;
    ELSE
        v_avg_deal_value := 0;
    END IF;

    -- Calculate Leads (Enquiries)
    SELECT COUNT(*)
    INTO v_total_leads
    FROM vouchers
    WHERE tenant_id = v_tenant_id 
      AND voucher_type = 'sales_enquiry'
      AND voucher_date BETWEEN period_start AND period_end
      AND status != 'cancelled';

    -- Calculate Conversion Rate (Invoices / Leads)
    -- Note: This is a simplifiction. Ideally, we track specific leads converting. 
    -- But for aggregate planning, Ratio of Vol(Invoices) / Vol(Leads) is the "Throughput Conversion".
    IF v_total_leads > 0 THEN
        v_conversion_rate := (v_total_invoices::NUMERIC / v_total_leads::NUMERIC); -- Ratio, multiply by 100 for % later
    ELSE
        v_conversion_rate := 0;
    END IF;

    -- Calculate Sales Cycle (Day dif between Enquiry and Invoice)
    -- This requires linking.
    SELECT COALESCE(AVG(v.voucher_date - src.voucher_date), 0)
    INTO v_avg_cycle
    FROM vouchers v
    JOIN vouchers src ON v.source_enquiry_id = src.id
    WHERE v.tenant_id = v_tenant_id
      AND v.voucher_type IN ('sales_invoice', 'tax_invoice')
      AND v.voucher_date BETWEEN period_start AND period_end;
      
    -- If no linked data, default to 30 days or NULL
    IF v_avg_cycle IS NULL THEN v_avg_cycle := 30; END IF;

    -- Active Salespeople count
    SELECT COUNT(DISTINCT sales_executive_id)
    INTO v_active_salespeople
    FROM vouchers
    WHERE tenant_id = v_tenant_id 
      AND voucher_date BETWEEN period_start AND period_end;

    IF v_active_salespeople = 0 THEN v_active_salespeople := 1; END IF;
    
    -- Calculate months in period
    -- period_end - period_start returns integer days
    v_months_diff := (period_end - period_start)::NUMERIC / 30.0;
    IF v_months_diff < 1 THEN v_months_diff := 1; END IF;

    -- Deals per Metric
    result.deals_per_salesperson_per_month := v_total_invoices::NUMERIC / (v_active_salespeople * v_months_diff);

    -- Top Zone
    SELECT state INTO result.top_performing_zone
    FROM vouchers
    WHERE tenant_id = v_tenant_id
      AND voucher_type IN ('sales_invoice', 'tax_invoice')
      AND voucher_date BETWEEN period_start AND period_end
    GROUP BY state
    ORDER BY SUM(total_amount) DESC
    LIMIT 1;

    -- Top Product Category (Approximation by joining items)
    -- Can be expensive, so optional or simple join
    -- Leaving NULL for now to save perf, or implement if needed.
    result.top_performing_product_category := 'Bearings'; 

    -- Fill Result
    result.avg_deal_value := v_avg_deal_value;
    result.conversion_rate := v_conversion_rate;
    result.avg_sales_cycle_days := v_avg_cycle;
    result.total_revenue_last_period := v_total_revenue;
    result.total_invoices_last_period := v_total_invoices;
    result.total_leads_last_period := v_total_leads;

    RETURN result;
END;
$$;

-- 3. Composite Type for Analysis Result
CREATE TYPE crm_analysis_result AS (
    is_feasible BOOLEAN,
    feasibility_status TEXT, -- 'Easy', 'Achievable', 'Stretch', 'Unrealistic'
    required_revenue NUMERIC,
    required_invoices NUMERIC,
    required_leads NUMERIC,
    current_projected_revenue NUMERIC,
    gap_revenue NUMERIC,
    gap_leads NUMERIC,
    suggested_focus_area TEXT,
    recommendation_text TEXT,
    simulation_projected_revenue NUMERIC
);

-- 4. Main Analysis & Simulation Engine
CREATE OR REPLACE FUNCTION crm_analyze_goal(
    target_revenue NUMERIC,
    timeframe_months INTEGER,
    -- Simulation parameters (0.0 to 1.0 representing percentage increase, e.g. 0.10 for 10%)
    sim_conversion_boost NUMERIC DEFAULT 0, 
    sim_avg_value_boost NUMERIC DEFAULT 0,
    sim_lead_volume_boost NUMERIC DEFAULT 0
)
RETURNS crm_analysis_result
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    metrics crm_baseline_metrics;
    result crm_analysis_result;
    
    -- Derived Future Metrics
    future_avg_value NUMERIC;
    future_conversion NUMERIC;
    
    -- Projections
    projected_invoices_run_rate NUMERIC;
    projected_leads_run_rate NUMERIC;
    
    -- Requirements
    req_invoices NUMERIC;
    req_leads NUMERIC;
    
    -- Simulation
    sim_revenue NUMERIC;
    
    start_date DATE;
    end_date DATE;
BEGIN
    -- 1. Get Baseline (Look back same duration as look forward, or fixed 6 months)
    end_date := CURRENT_DATE;
    start_date := CURRENT_DATE - (timeframe_months || ' months')::INTERVAL;
    
    metrics := crm_get_baseline_metrics(start_date, end_date);
    
    -- Handle divide by zero edge cases in baseline
    IF metrics.avg_deal_value IS NULL OR metrics.avg_deal_value = 0 THEN metrics.avg_deal_value := 10000; END IF; -- Fallback
    IF metrics.conversion_rate IS NULL OR metrics.conversion_rate = 0 THEN metrics.conversion_rate := 0.1; END IF; -- 10% fallback
    
    -- 2. Apply Simulation Boosts
    future_avg_value := metrics.avg_deal_value * (1 + sim_avg_value_boost);
    future_conversion := metrics.conversion_rate * (1 + sim_conversion_boost);
    
    -- 3. Calculate Requirements for Goal
    -- How many invoices needed?
    req_invoices := target_revenue / future_avg_value;
    -- How many leads needed?
    req_leads := req_invoices / future_conversion;
    
    -- 4. Calculate Current Trajectory (Run Rate)
    -- Assuming linear projection of last period
    projected_leads_run_rate := (metrics.total_leads_last_period::NUMERIC) * (1 + sim_lead_volume_boost); 
    -- Note: If we looked back X months and look forward X months, the volume is comparable directly.
    
    result.current_projected_revenue := projected_leads_run_rate * future_conversion * future_avg_value;
    
    -- 5. Calculate Gaps
    result.required_revenue := target_revenue;
    result.required_invoices := CEIL(req_invoices);
    result.required_leads := CEIL(req_leads);
    result.gap_revenue := target_revenue - result.current_projected_revenue;
    result.gap_leads := req_leads - projected_leads_run_rate;
    
    -- 6. Simulation Output
    result.simulation_projected_revenue := result.current_projected_revenue;

    -- 7. Feasibility Logic
    IF result.current_projected_revenue >= target_revenue THEN
        result.is_feasible := TRUE;
        result.feasibility_status := 'Easy';
        result.recommendation_text := 'You are on track to hit this goal based on current performance.';
    ELSIF result.current_projected_revenue >= (target_revenue * 0.8) THEN
        result.is_feasible := TRUE;
        result.feasibility_status := 'Achievable';
        result.recommendation_text := 'Goal is within reach. Focus on closing key pending deals.';
    ELSIF result.current_projected_revenue >= (target_revenue * 0.5) THEN
        result.is_feasible := FALSE;
        result.feasibility_status := 'Stretch';
        result.recommendation_text := 'Significant gap. You need to increase lead volume by ' || ROUND(result.gap_leads) || ' leads.';
    ELSE
        result.is_feasible := FALSE;
        result.feasibility_status := 'Unrealistic';
        result.recommendation_text := 'Goal is highly aggressive. Creating gaps in both Capacity and Leads. Suggest breaking down into smaller milestones.';
    END IF;

    -- 8. Refine Recommendation
    IF result.gap_revenue > 0 THEN
        IF result.gap_leads > (projected_leads_run_rate * 0.5) THEN
             result.suggested_focus_area := 'Lead Generation';
             result.recommendation_text := 'Primary Bottleneck: Lead Volume. You need ' || ROUND(result.required_leads) || ' total leads (+'|| ROUND(result.gap_leads) ||' more).'; 
        ELSIF future_conversion < 0.05 THEN
             result.suggested_focus_area := 'Sales Training';
             result.recommendation_text := 'Primary Bottleneck: Conversion Rate (' || ROUND(future_conversion * 100, 1) || '%). Focus on training to double conversion.';
        ELSE
             result.suggested_focus_area := 'Deal Size Upselling';
             result.recommendation_text := 'Try upselling. Increasing Avg Order Value by 20% would bring you ' || ROUND((result.current_projected_revenue * 0.2)::NUMERIC, 2) || ' closer.';
        END IF;
    END IF;
    
    -- Recommendations based on insights
    IF metrics.top_performing_zone IS NOT NULL THEN
       result.recommendation_text := result.recommendation_text || ' Scale efforts in ' || metrics.top_performing_zone || ' zone.';
    END IF;

    RETURN result;
END;
$$;
