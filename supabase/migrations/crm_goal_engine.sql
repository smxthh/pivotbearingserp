-- CRM Goal Engine: Fixed with Tax Invoice support and Indian Financial Year logic
-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view their tenant goals" ON public.crm_goals;
DROP POLICY IF EXISTS "Users can manage their tenant goals" ON public.crm_goals;

-- Create crm_goals table
CREATE TABLE IF NOT EXISTS public.crm_goals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID NOT NULL,
    target_year INTEGER NOT NULL,
    target_amount NUMERIC(20, 2) NOT NULL DEFAULT 0,
    breakdown_json JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    UNIQUE(tenant_id, target_year)
);

-- Enable RLS
ALTER TABLE public.crm_goals ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user's tenant_id
CREATE OR REPLACE FUNCTION public.get_current_user_tenant_id()
RETURNS UUID AS $$
    SELECT tenant_id FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

-- RLS Policy
CREATE POLICY "Users can view their tenant goals" ON public.crm_goals
    FOR SELECT USING (tenant_id = public.get_current_user_tenant_id());

CREATE POLICY "Users can manage their tenant goals" ON public.crm_goals
    FOR ALL USING (tenant_id = public.get_current_user_tenant_id());

-- RPC to set yearly goal
CREATE OR REPLACE FUNCTION public.crm_set_yearly_goal(
    p_year INTEGER,
    p_amount NUMERIC,
    p_breakdown JSONB DEFAULT '{}'::JSONB
) RETURNS JSONB AS $$
DECLARE
    v_tenant_id UUID;
    v_goal_id UUID;
BEGIN
    v_tenant_id := public.get_current_user_tenant_id();

    IF v_tenant_id IS NULL THEN
        RAISE EXCEPTION 'User not associated with a tenant';
    END IF;

    INSERT INTO public.crm_goals (tenant_id, target_year, target_amount, breakdown_json, created_by, updated_at)
    VALUES (v_tenant_id, p_year, p_amount, p_breakdown, auth.uid(), NOW())
    ON CONFLICT (tenant_id, target_year)
    DO UPDATE SET
        target_amount = EXCLUDED.target_amount,
        breakdown_json = EXCLUDED.breakdown_json,
        updated_at = NOW()
    RETURNING id INTO v_goal_id;

    RETURN jsonb_build_object(
        'success', true,
        'goal_id', v_goal_id,
        'year', p_year,
        'target', p_amount
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC to get goal progress (Fixed: Uses tax_invoice + Indian FY April-March)
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

    -- Indian Financial Year: April 1 to March 31
    v_start_date := make_date(p_year, 4, 1);
    v_end_date := make_date(p_year + 1, 3, 31);
    v_days_total := (v_end_date - v_start_date) + 1;
    
    IF CURRENT_DATE < v_start_date THEN
        v_days_passed := 0;
    ELSIF CURRENT_DATE > v_end_date THEN
        v_days_passed := v_days_total;
    ELSE
        v_days_passed := (CURRENT_DATE - v_start_date) + 1;
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
        'fy_end', v_end_date
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
