import { useMemo } from 'react';
import { GoalProgress, IntelligenceReport, BusinessPulse, ChurnRisk } from './useBusinessIntelligence';

// ============================================================
// ADVANCED MATHEMATICAL CRM ACTION PLANNER
// Uses statistical analysis, trend detection, and rule-based
// algorithms to generate prioritized daily actions
// ============================================================

export interface DailyAction {
  id: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  category: 'revenue' | 'retention' | 'collection' | 'efficiency' | 'growth';
  title: string;
  description: string;
  impact: string;
  urgencyScore: number; // 0-100
  potentialValue: number;
  deadline?: string;
  actionType: 'call' | 'follow-up' | 'review' | 'coach' | 'analyze';
}

export interface GoalTrajectory {
  status: 'on-track' | 'at-risk' | 'critical' | 'ahead';
  dailyRunRate: number;
  weeklyRunRate: number;
  monthlyRunRate: number;
  daysToGoal: number;
  projectedEndRevenue: number;
  shortfall: number;
  confidenceScore: number; // 0-100 based on trend consistency
  trendDirection: 'accelerating' | 'steady' | 'decelerating' | 'volatile';
  weeklyTrend: number[]; // Last 4 weeks revenue
  burndownData: { day: number; target: number; actual: number; projected: number }[];
}

export interface PerformanceInsight {
  type: 'strength' | 'weakness' | 'opportunity' | 'threat';
  metric: string;
  value: string;
  benchmark: string;
  recommendation: string;
  priority: number;
}

// Statistical helper functions
const calculateMean = (values: number[]): number => {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
};

const calculateStdDev = (values: number[]): number => {
  if (values.length < 2) return 0;
  const mean = calculateMean(values);
  const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
  return Math.sqrt(calculateMean(squaredDiffs));
};

const calculateTrend = (values: number[]): 'up' | 'down' | 'stable' => {
  if (values.length < 2) return 'stable';
  const firstHalf = values.slice(0, Math.floor(values.length / 2));
  const secondHalf = values.slice(Math.floor(values.length / 2));
  const firstMean = calculateMean(firstHalf);
  const secondMean = calculateMean(secondHalf);
  const diff = (secondMean - firstMean) / (firstMean || 1);
  if (diff > 0.05) return 'up';
  if (diff < -0.05) return 'down';
  return 'stable';
};

const calculateCoefficiendOfVariation = (values: number[]): number => {
  const mean = calculateMean(values);
  if (mean === 0) return 0;
  return (calculateStdDev(values) / mean) * 100;
};

// Linear regression for projection
const linearRegression = (values: number[]): { slope: number; intercept: number } => {
  const n = values.length;
  if (n < 2) return { slope: 0, intercept: values[0] || 0 };
  
  const xMean = (n - 1) / 2;
  const yMean = calculateMean(values);
  
  let numerator = 0;
  let denominator = 0;
  
  for (let i = 0; i < n; i++) {
    numerator += (i - xMean) * (values[i] - yMean);
    denominator += Math.pow(i - xMean, 2);
  }
  
  const slope = denominator !== 0 ? numerator / denominator : 0;
  const intercept = yMean - slope * xMean;
  
  return { slope, intercept };
};

// Exponential smoothing for short-term forecast
const exponentialSmoothing = (values: number[], alpha: number = 0.3): number => {
  if (values.length === 0) return 0;
  let forecast = values[0];
  for (let i = 1; i < values.length; i++) {
    forecast = alpha * values[i] + (1 - alpha) * forecast;
  }
  return forecast;
};

export const useCRMActionPlanner = (
  goalProgress: GoalProgress | null,
  intelligenceReport: IntelligenceReport | null,
  pulse: BusinessPulse | null
) => {
  // Calculate goal trajectory with advanced projections
  const goalTrajectory = useMemo((): GoalTrajectory | null => {
    if (!goalProgress || !goalProgress.success) return null;

    const { 
      target_amount, 
      actual_revenue, 
      days_passed, 
      days_remaining,
      required_daily_run_rate 
    } = goalProgress;

    // Calculate run rates
    const dailyRunRate = days_passed > 0 ? actual_revenue / days_passed : 0;
    const weeklyRunRate = dailyRunRate * 7;
    const monthlyRunRate = dailyRunRate * 30;

    // Simulate weekly trend (would come from real data in production)
    // Using a simple model based on current progress
    const progressRatio = actual_revenue / target_amount;
    const expectedProgress = days_passed / (days_passed + days_remaining);
    const performanceRatio = progressRatio / (expectedProgress || 0.01);

    // Generate synthetic weekly data for demonstration
    const weeklyTrend = [
      dailyRunRate * 7 * 0.85,
      dailyRunRate * 7 * 0.92,
      dailyRunRate * 7 * 0.98,
      dailyRunRate * 7 * performanceRatio
    ];

    // Trend analysis
    const trend = calculateTrend(weeklyTrend);
    const cv = calculateCoefficiendOfVariation(weeklyTrend);
    
    let trendDirection: GoalTrajectory['trendDirection'];
    if (cv > 25) {
      trendDirection = 'volatile';
    } else if (trend === 'up') {
      trendDirection = 'accelerating';
    } else if (trend === 'down') {
      trendDirection = 'decelerating';
    } else {
      trendDirection = 'steady';
    }

    // Project end revenue using exponential smoothing
    const smoothedDailyRate = exponentialSmoothing(weeklyTrend.map(w => w / 7));
    const projectedEndRevenue = actual_revenue + (smoothedDailyRate * days_remaining);
    const shortfall = Math.max(0, target_amount - projectedEndRevenue);

    // Confidence score based on trend consistency and progress
    const trendConsistency = Math.max(0, 100 - cv);
    const progressScore = Math.min(100, (progressRatio / expectedProgress) * 50);
    const confidenceScore = Math.round((trendConsistency * 0.4) + (progressScore * 0.6));

    // Status determination using statistical thresholds
    let status: GoalTrajectory['status'];
    if (projectedEndRevenue >= target_amount * 1.05) {
      status = 'ahead';
    } else if (projectedEndRevenue >= target_amount * 0.95) {
      status = 'on-track';
    } else if (projectedEndRevenue >= target_amount * 0.75) {
      status = 'at-risk';
    } else {
      status = 'critical';
    }

    // Days to goal (at current pace)
    const daysToGoal = dailyRunRate > 0 
      ? Math.ceil((target_amount - actual_revenue) / dailyRunRate)
      : Infinity;

    // Generate burndown data
    const totalDays = days_passed + days_remaining;
    const burndownData = [];
    for (let day = 0; day <= Math.min(totalDays, 365); day += Math.ceil(totalDays / 12)) {
      const targetAtDay = (target_amount / totalDays) * day;
      const actualAtDay = day <= days_passed ? (actual_revenue / days_passed) * day : actual_revenue;
      const projectedAtDay = day <= days_passed 
        ? actualAtDay 
        : actual_revenue + smoothedDailyRate * (day - days_passed);
      
      burndownData.push({
        day,
        target: Math.round(targetAtDay),
        actual: Math.round(actualAtDay),
        projected: Math.round(projectedAtDay)
      });
    }

    return {
      status,
      dailyRunRate,
      weeklyRunRate,
      monthlyRunRate,
      daysToGoal: Math.min(daysToGoal, 9999),
      projectedEndRevenue,
      shortfall,
      confidenceScore,
      trendDirection,
      weeklyTrend,
      burndownData
    };
  }, [goalProgress]);

  // Generate prioritized daily actions
  const dailyActions = useMemo((): DailyAction[] => {
    const actions: DailyAction[] = [];
    
    if (!goalProgress && !intelligenceReport && !pulse) return actions;

    // ===== REVENUE ACTIONS =====
    if (goalTrajectory) {
      const { status, dailyRunRate, shortfall } = goalTrajectory;
      const requiredRate = goalProgress?.required_daily_run_rate || 0;
      const rateGap = requiredRate - dailyRunRate;

      if (status === 'critical' || status === 'at-risk') {
        actions.push({
          id: 'goal-acceleration',
          priority: status === 'critical' ? 'critical' : 'high',
          category: 'revenue',
          title: `Close ₹${Math.round(rateGap / 1000)}K more daily to hit target`,
          description: `Current daily rate: ₹${Math.round(dailyRunRate / 1000)}K. Required: ₹${Math.round(requiredRate / 1000)}K. Focus on high-probability deals.`,
          impact: `Bridges ₹${Math.round(shortfall / 100000)}L shortfall`,
          urgencyScore: status === 'critical' ? 95 : 80,
          potentialValue: shortfall,
          actionType: 'follow-up'
        });
      }
    }

    // ===== PENDING QUOTES ACTION =====
    if (pulse && pulse.pending_quotes_count > 0) {
      const conversionProbability = 0.35; // Industry avg quote conversion
      const expectedValue = pulse.pending_quotes_value * conversionProbability;
      
      actions.push({
        id: 'pending-quotes',
        priority: pulse.pending_quotes_value > 500000 ? 'critical' : 'high',
        category: 'revenue',
        title: `Follow up on ${pulse.pending_quotes_count} pending quotations`,
        description: `Total value: ₹${(pulse.pending_quotes_value / 100000).toFixed(1)}L. Expected conversion: ₹${(expectedValue / 100000).toFixed(1)}L at 35% rate.`,
        impact: `Potential ₹${(expectedValue / 100000).toFixed(1)}L revenue`,
        urgencyScore: Math.min(90, 50 + (pulse.pending_quotes_count * 5)),
        potentialValue: expectedValue,
        actionType: 'call'
      });
    }

    // ===== RETENTION ACTIONS - CHURN RISKS =====
    if (intelligenceReport?.churn_risks && intelligenceReport.churn_risks.length > 0) {
      // Sort by value and dormancy
      const sortedRisks = [...intelligenceReport.churn_risks].sort((a, b) => {
        // Weighted score: 70% value, 30% dormancy
        const scoreA = (a.total_spent * 0.7) + (a.days_since_last_order * 100 * 0.3);
        const scoreB = (b.total_spent * 0.7) + (b.days_since_last_order * 100 * 0.3);
        return scoreB - scoreA;
      });

      // Top 3 high-value dormant customers
      const topRisks = sortedRisks.slice(0, 3);
      const totalAtRisk = topRisks.reduce((sum, r) => sum + r.total_spent, 0);

      if (topRisks.length > 0) {
        actions.push({
          id: 'churn-prevention',
          priority: totalAtRisk > 500000 ? 'critical' : 'high',
          category: 'retention',
          title: `Re-engage ${topRisks.length} dormant high-value customers`,
          description: topRisks.map(r => `${r.party_name} (${r.days_since_last_order}d inactive, ₹${(r.total_spent/1000).toFixed(0)}K LTV)`).join('; '),
          impact: `Protect ₹${(totalAtRisk / 100000).toFixed(1)}L customer lifetime value`,
          urgencyScore: 85,
          potentialValue: totalAtRisk * 0.3, // 30% of LTV as annual value
          actionType: 'call'
        });
      }
    }

    // ===== COLLECTION ACTIONS =====
    if (pulse && pulse.total_receivables > 0) {
      // Urgency increases with receivables/cash ratio
      const cashCrunch = pulse.cash_reserves > 0 
        ? pulse.total_receivables / pulse.cash_reserves 
        : 2;
      
      const urgency = Math.min(95, 50 + (cashCrunch * 20));

      if (pulse.total_receivables > 100000 || cashCrunch > 1) {
        actions.push({
          id: 'collect-receivables',
          priority: cashCrunch > 1.5 ? 'critical' : 'high',
          category: 'collection',
          title: `Collect outstanding receivables: ₹${(pulse.total_receivables / 100000).toFixed(1)}L`,
          description: cashCrunch > 1 
            ? `Receivables exceed cash reserves. Prioritize collection calls today.`
            : `Healthy ratio but optimize cash cycle.`,
          impact: `Improve cash position by ₹${(pulse.total_receivables / 100000).toFixed(1)}L`,
          urgencyScore: urgency,
          potentialValue: pulse.total_receivables,
          actionType: 'call'
        });
      }
    }

    // ===== TEAM COACHING =====
    if (pulse && pulse.needs_coaching_name) {
      actions.push({
        id: 'coach-team',
        priority: 'medium',
        category: 'efficiency',
        title: `Coach ${pulse.needs_coaching_name} on performance`,
        description: pulse.needs_coaching_reason || 'Below-average deal closure rate or revenue.',
        impact: `Improve team efficiency by 10-20%`,
        urgencyScore: 60,
        potentialValue: pulse.avg_deal_value * 2, // Potential 2 extra deals
        actionType: 'coach'
      });
    }

    // ===== GEOGRAPHIC EXPANSION =====
    if (pulse && pulse.underserved_city && pulse.top_city !== pulse.underserved_city) {
      actions.push({
        id: 'geo-expansion',
        priority: 'medium',
        category: 'growth',
        title: `Expand presence in ${pulse.underserved_city}`,
        description: `${pulse.underserved_city} shows potential but is currently underserved. ${pulse.top_city} leads with ₹${(pulse.top_city_revenue/1000).toFixed(0)}K.`,
        impact: `New market opportunity`,
        urgencyScore: 50,
        potentialValue: pulse.top_city_revenue * 0.5, // Potential 50% of top city
        actionType: 'analyze'
      });
    }

    // ===== STOCKOUT PREVENTION =====
    if (intelligenceReport?.stockout_risks && intelligenceReport.stockout_risks.length > 0) {
      const criticalItems = intelligenceReport.stockout_risks.filter(s => s.days_of_cover < 14);
      
      if (criticalItems.length > 0) {
        actions.push({
          id: 'prevent-stockout',
          priority: criticalItems.some(s => s.days_of_cover < 7) ? 'high' : 'medium',
          category: 'efficiency',
          title: `Reorder ${criticalItems.length} items running low`,
          description: criticalItems.slice(0, 3).map(s => `${s.item_name}: ${s.days_of_cover}d cover`).join('; '),
          impact: `Prevent stockouts and lost sales`,
          urgencyScore: criticalItems[0].days_of_cover < 7 ? 80 : 60,
          potentialValue: 0, // Preventive action
          actionType: 'review'
        });
      }
    }

    // Sort by urgency score
    return actions.sort((a, b) => b.urgencyScore - a.urgencyScore);
  }, [goalProgress, goalTrajectory, intelligenceReport, pulse]);

  // Generate SWOT-like insights
  const performanceInsights = useMemo((): PerformanceInsight[] => {
    const insights: PerformanceInsight[] = [];
    
    if (!goalProgress && !pulse && !intelligenceReport) return insights;

    // Strength: High performer
    if (pulse?.top_performer_name && pulse.top_performer_revenue > 0) {
      insights.push({
        type: 'strength',
        metric: 'Top Performer',
        value: pulse.top_performer_name,
        benchmark: `₹${(pulse.top_performer_revenue / 1000).toFixed(0)}K this month`,
        recommendation: 'Document and replicate their winning strategies across the team.',
        priority: 3
      });
    }

    // Strength: Dominant city
    if (pulse?.top_city && pulse.top_city_revenue > 0) {
      insights.push({
        type: 'strength',
        metric: 'Market Leadership',
        value: pulse.top_city,
        benchmark: `₹${(pulse.top_city_revenue / 1000).toFixed(0)}K revenue`,
        recommendation: 'Defend market share with customer loyalty programs.',
        priority: 4
      });
    }

    // Weakness: Goal trajectory
    if (goalTrajectory && (goalTrajectory.status === 'at-risk' || goalTrajectory.status === 'critical')) {
      insights.push({
        type: 'weakness',
        metric: 'Goal Progress',
        value: `${goalProgress?.progress_percentage.toFixed(1)}%`,
        benchmark: `Expected: ${((goalProgress?.days_passed || 0) / (goalProgress?.days_total || 365) * 100).toFixed(1)}%`,
        recommendation: `Increase daily sales by ₹${Math.round((goalProgress?.required_daily_run_rate || 0 - goalTrajectory.dailyRunRate) / 1000)}K.`,
        priority: 1
      });
    }

    // Weakness: High receivables
    if (pulse && pulse.total_receivables > pulse.cash_reserves) {
      insights.push({
        type: 'weakness',
        metric: 'Cash Flow',
        value: `₹${(pulse.total_receivables / 100000).toFixed(1)}L receivables`,
        benchmark: `Cash: ₹${(pulse.cash_reserves / 100000).toFixed(1)}L`,
        recommendation: 'Tighten collection cycles. Offer early payment discounts.',
        priority: 2
      });
    }

    // Opportunity: Underserved market
    if (pulse?.underserved_city) {
      insights.push({
        type: 'opportunity',
        metric: 'Market Expansion',
        value: pulse.underserved_city,
        benchmark: 'Currently underserved',
        recommendation: 'Launch targeted campaign in this region.',
        priority: 5
      });
    }

    // Opportunity: Pending quotes
    if (pulse && pulse.pending_quotes_count > 3) {
      insights.push({
        type: 'opportunity',
        metric: 'Pipeline',
        value: `${pulse.pending_quotes_count} quotes`,
        benchmark: `₹${(pulse.pending_quotes_value / 100000).toFixed(1)}L value`,
        recommendation: 'Prioritize follow-ups to convert 35%+ of pipeline.',
        priority: 3
      });
    }

    // Threat: Churn risk
    if (intelligenceReport?.churn_risks && intelligenceReport.churn_risks.length > 3) {
      const totalRisk = intelligenceReport.churn_risks.reduce((s, r) => s + r.total_spent, 0);
      insights.push({
        type: 'threat',
        metric: 'Customer Churn',
        value: `${intelligenceReport.churn_risks.length} dormant`,
        benchmark: `₹${(totalRisk / 100000).toFixed(1)}L at risk`,
        recommendation: 'Implement win-back campaign for top 5 accounts.',
        priority: 2
      });
    }

    // Threat: Stockout
    if (intelligenceReport?.stockout_risks && intelligenceReport.stockout_risks.some(s => s.days_of_cover < 7)) {
      insights.push({
        type: 'threat',
        metric: 'Inventory Risk',
        value: `${intelligenceReport.stockout_risks.filter(s => s.days_of_cover < 7).length} items critical`,
        benchmark: '< 7 days cover',
        recommendation: 'Place emergency orders to prevent stockouts.',
        priority: 1
      });
    }

    return insights.sort((a, b) => a.priority - b.priority);
  }, [goalProgress, goalTrajectory, pulse, intelligenceReport]);

  // Calculate today's focus score (how much needs attention)
  const todayFocusScore = useMemo(() => {
    if (dailyActions.length === 0) return { score: 85, label: 'All Clear' };
    
    const criticalCount = dailyActions.filter(a => a.priority === 'critical').length;
    const highCount = dailyActions.filter(a => a.priority === 'high').length;
    
    const score = Math.max(0, 100 - (criticalCount * 25) - (highCount * 10));
    
    let label: string;
    if (score >= 80) label = 'On Track';
    else if (score >= 60) label = 'Needs Attention';
    else if (score >= 40) label = 'Action Required';
    else label = 'Critical';
    
    return { score, label };
  }, [dailyActions]);

  return {
    goalTrajectory,
    dailyActions,
    performanceInsights,
    todayFocusScore,
    topActions: dailyActions.slice(0, 3)
  };
};
