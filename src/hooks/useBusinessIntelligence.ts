import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Types for the business intelligence data
export interface BusinessPulse {
    monthly_sales_target: number;
    daily_sales_target: number;
    revenue_mtd: number;
    revenue_today: number;
    customers_this_month: number;
    customers_today: number;
    deals_this_month: number;
    deals_today: number;
    avg_deal_value: number;
    avg_days_to_close: number;
    pending_quotes_count: number;
    pending_quotes_value: number;
    total_receivables: number;
    total_payables: number;
    cash_reserves: number;
    monthly_burn_rate: number;
    top_city: string | null;
    top_city_revenue: number;
    underserved_city: string | null;
    top_performer_name: string | null;
    top_performer_revenue: number;
    needs_coaching_name: string | null;
    needs_coaching_reason: string | null;
}

export interface SalespersonPerformance {
    salesperson_id: string;
    salesperson_name: string;
    total_revenue: number;
    total_deals: number;
    avg_deal_value: number;
    avg_days_to_close: number;
    deals_this_month: number;
    revenue_this_month: number;
}
// New Interfaces for Deep Insights
export interface SalesmanPerformance {
    salesman_name: string;
    deals_closed: number;
    total_revenue: number;
    avg_ticket_value: number;
}

export interface ProductMatrix {
    item_name: string;
    revenue: number;
    volume: number;
    estimated_profit: number;
    margin_pct: number;
}

export interface GapAnalysis {
    item_name: string;
    current_stock: number;
    sku: string;
    tied_captial_value: number;
}

export interface ChurnRisk {
    party_name: string;
    phone: string;
    city: string;
    last_order_date: string;
    total_spent: number;
    days_since_last_order: number;
}

export interface StockoutRisk {
    item_name: string;
    current_stock: number;
    velocity_30d: number;
    days_of_cover: number;
}

export interface TopProduct {
    item_name: string;
    total_qty: number;
    revenue: number;
}

export interface GeoInsight {
    city_name: string;
    deal_count: number;
    total_revenue: number;
}

export interface IntelligenceReport {
    churn_risks: ChurnRisk[];
    stockout_risks: StockoutRisk[];
    top_products: TopProduct[];
    geo_insights: GeoInsight[];
    salesman_performance?: SalesmanPerformance[];
    product_matrix?: ProductMatrix[];
    gap_analysis?: GapAnalysis[];
}

export interface GoalProgress {
    success: boolean;
    message?: string;
    year: number;
    target_amount: number;
    actual_revenue: number;
    progress_percentage: number;
    raw_progress_percentage: number;
    days_passed: number;
    days_remaining: number;
    days_total: number;
    required_daily_run_rate: number;
    goal_achieved: boolean;
    goal_exceeded: boolean;
    fy_start: string;
    fy_end: string;
}

export const useBusinessIntelligence = (realtimeYear?: number) => {
    const [isLoading, setIsLoading] = useState(false);
    const [pulse, setPulse] = useState<BusinessPulse | null>(null);
    const [salespersonRankings, setSalespersonRankings] = useState<SalespersonPerformance[]>([]);
    const [cityPerformance, setCityPerformance] = useState<GeoInsight[]>([]);
    const [intelligenceReport, setIntelligenceReport] = useState<IntelligenceReport | null>(null);
    const [goalProgress, setGoalProgress] = useState<GoalProgress | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    const fetchBusinessPulse = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            // Fetch all data in parallel
            const results = await Promise.allSettled([
                supabase.rpc('crm_get_business_pulse' as any),
                supabase.rpc('crm_get_salesperson_rankings' as any),
                supabase.rpc('crm_get_city_performance' as any),
                supabase.rpc('crm_get_intelligence_report' as any)
            ]);

            const [pulseResult, rankingsResult, cityResult, reportResult] = results;

            if (pulseResult.status === 'fulfilled' && !pulseResult.value.error) {
                setPulse(pulseResult.value.data as unknown as BusinessPulse);
            } else {
                console.error('Failed to fetch business pulse');
            }

            if (rankingsResult.status === 'fulfilled' && !rankingsResult.value.error) {
                setSalespersonRankings((rankingsResult.value.data || []) as unknown as SalespersonPerformance[]);
            }

            if (cityResult.status === 'fulfilled' && !cityResult.value.error) {
                setCityPerformance((cityResult.value.data || []) as unknown as GeoInsight[]);
            }

            if (reportResult.status === 'fulfilled' && !reportResult.value.error) {
                setIntelligenceReport(reportResult.value.data as unknown as IntelligenceReport);
            }
            setLastUpdated(new Date());

        } catch (err: any) {
            console.error('Error fetching business intelligence:', err);
            setError(err.message || 'Failed to fetch business intelligence');
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Generate AI-like insight text
    const generateInsights = useCallback((): string[] => {
        if (!pulse) return [];

        const insights: string[] = [];
        const workingDaysRemaining = Math.max(1, 22 - new Date().getDate());
        const dailyTargetNeeded = (pulse.monthly_sales_target - pulse.revenue_mtd) / workingDaysRemaining;

        // Target progress
        const progressPercent = pulse.monthly_sales_target > 0
            ? Math.round((pulse.revenue_mtd / pulse.monthly_sales_target) * 100)
            : 0;

        if (progressPercent >= 100) {
            insights.push(`🎯 You've exceeded your monthly target by ₹${((pulse.revenue_mtd - pulse.monthly_sales_target) / 1000).toFixed(0)}K. Outstanding performance.`);
        } else if (progressPercent >= 80) {
            insights.push(`📈 You're at ${progressPercent}% of target. Need ₹${(dailyTargetNeeded / 1000).toFixed(0)}K/day to close the gap.`);
        } else {
            insights.push(`⚡ Currently at ${progressPercent}% of target. Accelerate to ₹${(dailyTargetNeeded / 1000).toFixed(0)}K/day to hit goal.`);
        }

        // Deal velocity
        if (pulse.avg_deal_value > 0) {
            const dealsNeeded = Math.ceil((pulse.monthly_sales_target - pulse.revenue_mtd) / pulse.avg_deal_value);
            insights.push(`You need ${dealsNeeded} more deals at ₹${(pulse.avg_deal_value / 1000).toFixed(0)}K avg to hit target.`);
        }

        // Pending quotes
        if (pulse.pending_quotes_count > 0) {
            insights.push(`${pulse.pending_quotes_count} quotes worth ₹${(pulse.pending_quotes_value / 100000).toFixed(1)}L pending closure.`);
        }

        // Geographic insights
        if (pulse.top_city) {
            insights.push(`Top city: ${pulse.top_city} (₹${(pulse.top_city_revenue / 1000).toFixed(0)}K this month).`);
        }
        if (pulse.underserved_city && pulse.underserved_city !== pulse.top_city) {
            insights.push(`Opportunity: ${pulse.underserved_city} is underserved - consider targeted outreach.`);
        }

        // Team insights
        if (pulse.top_performer_name) {
            insights.push(`Top performer: ${pulse.top_performer_name} with ₹${(pulse.top_performer_revenue / 1000).toFixed(0)}K revenue.`);
        }
        if (pulse.needs_coaching_name && pulse.needs_coaching_name !== pulse.top_performer_name) {
            insights.push(`Coaching needed: ${pulse.needs_coaching_name} - ${pulse.needs_coaching_reason}`);
        }

        // Cash flow
        if (pulse.total_receivables > pulse.cash_reserves) {
            insights.push(`⚠️ Receivables (₹${(pulse.total_receivables / 100000).toFixed(1)}L) exceed cash. Prioritize collections.`);
        }

        return insights;
    }, [pulse]);

    // Generate priority actions
    const generateActions = useCallback((): { priority: number; action: string; type: 'urgent' | 'growth' | 'efficiency' }[] => {
        if (!pulse) return [];

        const actions: { priority: number; action: string; type: 'urgent' | 'growth' | 'efficiency' }[] = [];
        let priority = 1;

        // Pending quotes action
        if (pulse.pending_quotes_count > 0) {
            actions.push({
                priority: priority++,
                action: `Follow up on ${pulse.pending_quotes_count} pending quotes (₹${(pulse.pending_quotes_value / 100000).toFixed(1)}L value)`,
                type: 'urgent'
            });
        }

        // Receivables action
        if (pulse.total_receivables > 50000) {
            actions.push({
                priority: priority++,
                action: `Collect outstanding receivables of ₹${(pulse.total_receivables / 100000).toFixed(1)}L`,
                type: 'urgent'
            });
        }

        // Underserved region
        if (pulse.underserved_city) {
            actions.push({
                priority: priority++,
                action: `Expand in ${pulse.underserved_city} - currently underserved market`,
                type: 'growth'
            });
        }

        // Coaching action
        if (pulse.needs_coaching_name) {
            actions.push({
                priority: priority++,
                action: `Coach ${pulse.needs_coaching_name} on faster deal closure`,
                type: 'efficiency'
            });
        }

        // Daily target reminder
        const targetGap = pulse.monthly_sales_target - pulse.revenue_mtd;
        if (targetGap > 0) {
            actions.push({
                priority: priority++,
                action: `Close ₹${(pulse.daily_sales_target / 1000).toFixed(0)}K today to stay on track`,
                type: 'growth'
            });
        }

        return actions;
    }, [pulse]);

    const setMonthlyTarget = useCallback(async (amount: number) => {
        try {
            const { error } = await supabase.rpc('crm_set_monthly_target' as any, {
                p_target_amount: amount
            } as any);
            if (error) throw error;
            await fetchBusinessPulse();
            return true;
        } catch (err: any) {
            console.error('Error setting target:', err);
            throw err;
        }
    }, [fetchBusinessPulse]);

    const fetchIntelligenceReport = useCallback(async () => {
        try {
            console.log('Calling crm_get_intelligence_report...');
            const { data, error } = await supabase.rpc('crm_get_intelligence_report' as any);
            console.log('RPC Response:', { data, error });
            if (error) {
                console.error('RPC Error Details:', JSON.stringify(error, null, 2));
                throw error;
            }
            setIntelligenceReport(data as unknown as IntelligenceReport);
        } catch (err: any) {
            console.error('Error fetching intelligence:', err);
        }
    }, []);

    const fetchGoalProgress = useCallback(async (year: number) => {
        try {
            const { data, error } = await supabase.rpc('crm_get_yearly_goal_progress' as any, { p_year: year });
            if (error) throw error;
            setGoalProgress(data as unknown as GoalProgress);
        } catch (err: any) {
            console.error('Error fetching goal progress:', err);
        }
    }, []);

    const setYearlyGoal = useCallback(async (year: number, amount: number) => {
        try {
            const { error } = await supabase.rpc('crm_set_yearly_goal' as any, {
                p_year: year,
                p_amount: amount,
                p_breakdown: {}
            });
            if (error) throw error;
            await fetchGoalProgress(year);
            return true;
        } catch (err: any) {
            console.error('Error setting yearly goal:', err);
            throw err;
        }
    }, [fetchGoalProgress]);

    // Realtime Subscription
    useEffect(() => {
        if (!realtimeYear) return;

        const channel = supabase
            .channel('crm-realtime')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'vouchers' },
                () => {
                    fetchBusinessPulse();
                    fetchIntelligenceReport();
                    fetchGoalProgress(realtimeYear);
                }
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'crm_goals' },
                () => {
                    fetchGoalProgress(realtimeYear);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [realtimeYear, fetchBusinessPulse, fetchIntelligenceReport, fetchGoalProgress]);

    return {
        isLoading,
        error,
        pulse,
        salespersonRankings,
        cityPerformance,
        intelligenceReport,
        goalProgress,
        lastUpdated,
        fetchBusinessPulse,
        fetchIntelligenceReport,
        fetchGoalProgress,
        setMonthlyTarget,
        setYearlyGoal,
        generateInsights,
        generateActions
    };
};
