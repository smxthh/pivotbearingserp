-- Enhanced CRM Intelligence Report
-- Includes Salesman Performance, Product Profitability, and Gap Analysis

CREATE OR REPLACE FUNCTION public.crm_get_intelligence_report()
RETURNS JSONB AS $$
DECLARE
    v_tenant_id UUID;
    v_intelligence_data JSONB;
    v_dormant_customers JSONB;
    v_stockout_risk JSONB;
    v_highest_selling_products JSONB;
    v_city_performance JSONB;
    v_salesman_performance JSONB;
    v_product_matrix JSONB;
    v_gap_analysis JSONB;
BEGIN
    -- Use the helper function which is SECURITY DEFINER
    v_tenant_id := public.get_current_user_tenant_id();
    
    -- Graceful degradation instead of hard error
    IF v_tenant_id IS NULL THEN
        RETURN jsonb_build_object(
            'churn_risks', '[]'::jsonb,
            'stockout_risks', '[]'::jsonb,
            'top_products', '[]'::jsonb,
            'geo_insights', '[]'::jsonb,
            'salesman_performance', '[]'::jsonb,
            'product_matrix', '[]'::jsonb,
            'gap_analysis', '[]'::jsonb
        );
    END IF;

    -- 1. Dormant High-Value Customers (Churn Risk)
    -- Logic: Spent > 50k lifetime, but no order in last 90 days
    SELECT jsonb_agg(t) INTO v_dormant_customers
    FROM (
        SELECT 
            p.party_name,
            p.phone,
            p.city,
            MAX(v.voucher_date) as last_order_date,
            SUM(v.total_amount) as total_spent,
            CURRENT_DATE - MAX(v.voucher_date) as days_since_last_order
        FROM public.vouchers v
        JOIN public.parties p ON v.party_id = p.id
        WHERE v.tenant_id = v_tenant_id 
          AND v.voucher_type IN ('tax_invoice', 'sales_invoice')
          AND v.status NOT IN ('cancelled', 'draft', 'reversed')
        GROUP BY p.id, p.party_name, p.phone, p.city
        HAVING MAX(v.voucher_date) < (CURRENT_DATE - INTERVAL '90 days')
           AND SUM(v.total_amount) > 50000
        ORDER BY total_spent DESC
        LIMIT 5
    ) t;

    -- 2. Stockout Risks (Supply Chain)
    -- Logic: Sales velocity (30 days) vs Current Stock. Report if coverage < 10 days
    SELECT jsonb_agg(t) INTO v_stockout_risk
    FROM (
        SELECT 
            i.item_name,
            i.current_stock,
            COALESCE(sales_30d.qty_sold, 0) as velocity_30d,
            CASE WHEN sales_30d.qty_sold > 0 THEN ROUND(i.current_stock / sales_30d.qty_sold, 1) ELSE 999 END as days_of_cover
        FROM public.items i
        LEFT JOIN (
            SELECT vi.item_id, SUM(vi.quantity) as qty_sold
            FROM public.voucher_items vi
            JOIN public.vouchers v ON vi.voucher_id = v.id
            WHERE v.tenant_id = v_tenant_id
              AND v.voucher_date > (CURRENT_DATE - INTERVAL '30 days')
              AND v.status NOT IN ('cancelled', 'draft', 'reversed')
            GROUP BY vi.item_id
        ) sales_30d ON i.id = sales_30d.item_id
        WHERE i.tenant_id = v_tenant_id
          AND i.current_stock > 0
          AND COALESCE(sales_30d.qty_sold, 0) > 0
          AND (i.current_stock / sales_30d.qty_sold) < 10
        ORDER BY days_of_cover ASC
        LIMIT 5
    ) t;

    -- 3. Top Products (30 Days)
    SELECT jsonb_agg(t) INTO v_highest_selling_products
    FROM (
        SELECT 
            vi.item_name, 
            SUM(vi.amount) as revenue,
            SUM(vi.quantity) as total_qty
        FROM public.voucher_items vi
        JOIN public.vouchers v ON vi.voucher_id = v.id
        WHERE v.tenant_id = v_tenant_id 
          AND v.voucher_type IN ('tax_invoice', 'sales_invoice')
          AND v.voucher_date > (CURRENT_DATE - INTERVAL '30 days')
          AND v.status NOT IN ('cancelled', 'draft', 'reversed')
        GROUP BY vi.item_name
        ORDER BY revenue DESC
        LIMIT 3
    ) t;

    -- 4. Geographic Performance (City wise)
    SELECT jsonb_agg(t) INTO v_city_performance
    FROM (
        SELECT 
            p.city as city_name,
            COUNT(DISTINCT v.id) as deal_count,
            SUM(v.total_amount) as total_revenue
        FROM public.vouchers v
        JOIN public.parties p ON v.party_id = p.id
        WHERE v.tenant_id = v_tenant_id 
          AND v.voucher_type IN ('tax_invoice', 'sales_invoice')
          AND v.voucher_date > (CURRENT_DATE - INTERVAL '90 days')
          AND v.status NOT IN ('cancelled', 'draft', 'reversed')
          AND p.city IS NOT NULL
        GROUP BY p.city
        ORDER BY total_revenue DESC
        LIMIT 5
    ) t;

    -- 5. Salesman Leaderboard (Performance)
    -- Logic: Revenue by Created By (User) or Sales Executive ID
    SELECT jsonb_agg(t) INTO v_salesman_performance
    FROM (
        SELECT 
            COALESCE(u.email, 'Unknown Agent') as agent_name,
            COUNT(v.id) as deals_closed,
            SUM(v.total_amount) as total_revenue,
            ROUND(AVG(v.total_amount), 2) as avg_ticket_value
        FROM public.vouchers v
        LEFT JOIN auth.users u ON (v.sales_executive_id = u.id OR v.created_by = u.id)
        WHERE v.tenant_id = v_tenant_id 
          AND v.voucher_type IN ('tax_invoice', 'sales_invoice')
          AND v.voucher_date > (CURRENT_DATE - INTERVAL '30 days')
          AND v.status NOT IN ('cancelled', 'draft', 'reversed')
        GROUP BY COALESCE(u.email, 'Unknown Agent')
        ORDER BY total_revenue DESC
        LIMIT 5
    ) t;

    -- 6. Product Profitability Matrix (Win/Loss)
    -- Logic: Margin vs Volume. Uses Item Cost Price vs Sales Amount
    SELECT jsonb_agg(t) INTO v_product_matrix
    FROM (
        SELECT 
            vi.item_name,
            SUM(vi.amount) as revenue,
            SUM(vi.quantity) as volume,
            SUM(vi.amount - (COALESCE(i.cost_price, 0) * vi.quantity)) as estimated_profit,
            CASE 
                WHEN SUM(vi.amount) > 0 THEN 
                    ROUND((SUM(vi.amount - (COALESCE(i.cost_price, 0) * vi.quantity)) / SUM(vi.amount)) * 100, 2)
                ELSE 0 
            END as margin_pct
        FROM public.voucher_items vi
        JOIN public.vouchers v ON vi.voucher_id = v.id
        JOIN public.items i ON vi.item_id = i.id
        WHERE v.tenant_id = v_tenant_id 
          AND v.voucher_type IN ('tax_invoice', 'sales_invoice')
          AND v.voucher_date > (CURRENT_DATE - INTERVAL '90 days')
          AND v.status NOT IN ('cancelled', 'draft', 'reversed')
        GROUP BY vi.item_id, vi.item_name
        ORDER BY revenue DESC
    ) t;

    -- 7. Gap Analysis (Unsold Inventory with High Value)
    SELECT jsonb_agg(t) INTO v_gap_analysis
    FROM (
        SELECT 
            i.item_name,
            i.current_stock,
            i.sku,
            (i.current_stock * i.sale_price) as tied_capital_value
        FROM public.items i
        WHERE i.tenant_id = v_tenant_id
          AND i.current_stock > 10
          AND i.id NOT IN (
              SELECT DISTINCT vi.item_id
              FROM public.voucher_items vi
              JOIN public.vouchers v ON vi.voucher_id = v.id
              WHERE v.tenant_id = v_tenant_id
                AND v.voucher_date > (CURRENT_DATE - INTERVAL '30 days')
          )
        ORDER BY tied_capital_value DESC
        LIMIT 5
    ) t;

    v_intelligence_data := jsonb_build_object(
        'churn_risks', COALESCE(v_dormant_customers, '[]'::jsonb),
        'stockout_risks', COALESCE(v_stockout_risk, '[]'::jsonb),
        'top_products', COALESCE(v_highest_selling_products, '[]'::jsonb),
        'geo_insights', COALESCE(v_city_performance, '[]'::jsonb),
        'salesman_performance', COALESCE(v_salesman_performance, '[]'::jsonb),
        'product_matrix', COALESCE(v_product_matrix, '[]'::jsonb),
        'gap_analysis', COALESCE(v_gap_analysis, '[]'::jsonb)
    );

    RETURN v_intelligence_data;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
