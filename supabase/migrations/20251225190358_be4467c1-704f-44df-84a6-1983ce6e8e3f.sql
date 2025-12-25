-- Fix timezone issue: Use IST (Indian Standard Time) for date calculations
CREATE OR REPLACE FUNCTION public.crm_get_yearly_goal_progress(p_year INTEGER)
RETURNS JSONB AS $$
DECLARE
    v_tenant_id UUID;
    v_target NUMERIC;
    v_actual_revenue NUMERIC;
    v_start_date DATE;
    v_end_date DATE;
    v_days_passed INTEGER;
    v_days_total INTEGER;
    v_days_remaining INTEGER;
    v_required_run_rate NUMERIC;
    v_progress_pct NUMERIC;
    v_today DATE;
BEGIN
    v_tenant_id := public.get_current_user_tenant_id();

    IF v_tenant_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'User not associated with a tenant');
    END IF;

    SELECT target_amount INTO v_target
    FROM public.crm_goals
    WHERE tenant_id = v_tenant_id AND target_year = p_year;

    IF v_target IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'No goal set for this year');
    END IF;

    -- Use IST timezone for accurate date in India
    v_today := (NOW() AT TIME ZONE 'Asia/Kolkata')::DATE;

    -- Indian Financial Year: April 1 to March 31
    v_start_date := make_date(p_year, 4, 1);
    v_end_date := make_date(p_year + 1, 3, 31);
    v_days_total := (v_end_date - v_start_date) + 1;
    
    IF v_today < v_start_date THEN
        v_days_passed := 0;
    ELSIF v_today > v_end_date THEN
        v_days_passed := v_days_total;
    ELSE
        v_days_passed := (v_today - v_start_date) + 1;
    END IF;
    
    v_days_remaining := GREATEST(v_days_total - v_days_passed, 0);

    -- Include both tax_invoice and sales_invoice, exclude drafts/cancelled
    SELECT COALESCE(SUM(total_amount), 0)
    INTO v_actual_revenue
    FROM public.vouchers 
    WHERE tenant_id = v_tenant_id 
      AND voucher_type IN ('tax_invoice', 'sales_invoice')
      AND voucher_date BETWEEN v_start_date AND v_end_date
      AND status NOT IN ('cancelled', 'draft', 'reversed');

    IF v_target > 0 THEN
        v_progress_pct := ROUND((v_actual_revenue / v_target * 100), 2);
    ELSE
        v_progress_pct := 0;
    END IF;

    IF v_days_remaining > 0 AND v_actual_revenue < v_target THEN
        v_required_run_rate := ROUND((v_target - v_actual_revenue) / v_days_remaining, 2);
    ELSE
        v_required_run_rate := 0;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'year', p_year,
        'target_amount', v_target,
        'actual_revenue', v_actual_revenue,
        'progress_percentage', LEAST(v_progress_pct, 100),
        'raw_progress_percentage', v_progress_pct,
        'days_passed', v_days_passed,
        'days_remaining', v_days_remaining,
        'days_total', v_days_total,
        'required_daily_run_rate', GREATEST(v_required_run_rate, 0),
        'goal_achieved', v_actual_revenue >= v_target,
        'goal_exceeded', v_actual_revenue > v_target,
        'fy_start', v_start_date,
        'fy_end', v_end_date,
        'server_date', v_today
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;