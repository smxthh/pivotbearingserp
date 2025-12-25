import React, { useEffect, useState } from 'react';
import { useBusinessIntelligence } from '@/hooks/useBusinessIntelligence';
import { useCRMActionPlanner } from '@/hooks/useCRMActionPlanner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Package, MapPin, Users, TrendingUp, TrendingDown, MoreVertical, RefreshCw, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GoalCockpit } from '@/components/crm/GoalCockpit';
import { DailyActionPanel } from '@/components/crm/DailyActionPanel';
import { PerformanceInsightsCard } from '@/components/crm/PerformanceInsightsCard';

const formatCurrency = (value: number) => {
  if (value >= 10000000) return `₹${(value / 10000000).toFixed(2)}Cr`;
  if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
  return new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 0,
    style: 'currency',
    currency: 'INR'
  }).format(value);
};

export const CRMIntelligence = () => {
  const currentYear = new Date().getFullYear();

  const {
    intelligenceReport,
    goalProgress,
    pulse,
    isLoading,
    fetchIntelligenceReport,
    fetchGoalProgress,
    fetchBusinessPulse,
    setYearlyGoal
  } = useBusinessIntelligence(currentYear);

  const {
    goalTrajectory,
    dailyActions,
    performanceInsights,
    todayFocusScore
  } = useCRMActionPlanner(goalProgress, intelligenceReport, pulse);

  const [isSetGoalOpen, setIsSetGoalOpen] = useState(false);
  const [newTarget, setNewTarget] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    fetchIntelligenceReport();
    fetchGoalProgress(currentYear);
    fetchBusinessPulse();
  }, [fetchIntelligenceReport, fetchGoalProgress, fetchBusinessPulse, currentYear]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([
      fetchIntelligenceReport(),
      fetchGoalProgress(currentYear),
      fetchBusinessPulse()
    ]);
    setIsRefreshing(false);
    toast.success('Data refreshed');
  };

  const handleSetGoal = async () => {
    const amount = parseFloat(newTarget);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    try {
      await setYearlyGoal(currentYear, amount);
      setIsSetGoalOpen(false);
      setNewTarget('');
      toast.success("Goal updated");
    } catch (err: any) {
      toast.error(err.message || "Failed to set goal");
    }
  };

  if (isLoading && !intelligenceReport && !goalProgress) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 text-primary animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading intelligence...</p>
        </div>
      </div>
    );
  }

  const cardClass = "p-6 rounded-3xl bg-card border border-border shadow-sm hover:shadow-md transition-all";
  const textPrimary = "text-foreground";
  const textSecondary = "text-muted-foreground";
  const headingClass = "text-lg font-medium text-foreground";

  return (
    <div className="min-h-screen bg-background p-6 overflow-y-auto">
      <div className="max-w-[1600px] mx-auto space-y-6">

        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-medium text-foreground">Strategic Intelligence</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Mathematical analysis & daily action guidance for {currentYear}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="rounded-xl"
            >
              <RefreshCw className={cn("h-4 w-4 mr-2", isRefreshing && "animate-spin")} />
              Refresh
            </Button>
            <Dialog open={isSetGoalOpen} onOpenChange={setIsSetGoalOpen}>
              <DialogTrigger asChild>
                <Button variant="default" size="sm" className="rounded-xl">
                  {goalProgress?.success ? 'Adjust Goal' : 'Set Target'}
                </Button>
              </DialogTrigger>
              <DialogContent className="rounded-3xl">
                <DialogHeader>
                  <DialogTitle>Yearly Revenue Goal</DialogTitle>
                  <DialogDescription>Set target for FY {currentYear}</DialogDescription>
                </DialogHeader>
                <div className="py-4">
                  <Label htmlFor="target">Annual Target (₹)</Label>
                  <Input
                    id="target"
                    type="number"
                    value={newTarget}
                    onChange={(e) => setNewTarget(e.target.value)}
                    placeholder="5000000"
                    className="mt-2 rounded-xl"
                  />
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsSetGoalOpen(false)} className="rounded-xl">
                    Cancel
                  </Button>
                  <Button onClick={handleSetGoal} className="rounded-xl">
                    Save Goal
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Primary Zone: Goal Cockpit + Daily Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7">
            <GoalCockpit 
              goalProgress={goalProgress} 
              trajectory={goalTrajectory}
              onSetGoal={() => setIsSetGoalOpen(true)}
            />
          </div>
          <div className="lg:col-span-5">
            <DailyActionPanel 
              actions={dailyActions}
              focusScore={todayFocusScore}
            />
          </div>
        </div>

        {/* Secondary Zone: Insights + Alerts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Performance Insights */}
          <PerformanceInsightsCard insights={performanceInsights} />

          {/* Retention Alert */}
          <div className={cardClass}>
            <div className="flex justify-between items-start mb-6">
              <h3 className={headingClass}>Retention Alert</h3>
              <button className={textSecondary}><MoreVertical size={16} /></button>
            </div>

            {intelligenceReport?.churn_risks && intelligenceReport.churn_risks.length > 0 ? (
              <div className="space-y-4">
                {intelligenceReport.churn_risks.slice(0, 4).map((risk: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 group-hover:bg-red-500/20 transition-colors">
                        <Users size={18} />
                      </div>
                      <div>
                        <p className={cn("text-sm font-medium", textPrimary)}>{risk.party_name}</p>
                        <p className={cn("text-xs", textSecondary)}>{risk.days_since_last_order} days inactive</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={cn("text-sm font-medium", textPrimary)}>{formatCurrency(risk.total_spent)}</p>
                      <p className="text-xs text-red-500">At Risk</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center">
                <Users className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className={textSecondary}>No dormant high-value customers</p>
              </div>
            )}
          </div>
        </div>

        {/* Tertiary Zone: Stock + Performance */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Stock Velocity */}
          <div className={cardClass}>
            <div className="flex justify-between items-start mb-6">
              <h3 className={headingClass}>Stock Velocity</h3>
              <button className={textSecondary}><MoreVertical size={16} /></button>
            </div>

            {intelligenceReport?.stockout_risks && intelligenceReport.stockout_risks.length > 0 ? (
              <div className="space-y-4">
                {intelligenceReport.stockout_risks.slice(0, 4).map((risk: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-500">
                        <Package size={18} />
                      </div>
                      <div>
                        <p className={cn("text-sm font-medium", textPrimary)}>{risk.item_name}</p>
                        <p className={cn("text-xs", textSecondary)}>{risk.velocity_30d} units/mo</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={cn("text-sm font-medium", risk.days_of_cover < 7 ? "text-red-500" : "text-orange-500")}>
                        {risk.days_of_cover} Days
                      </p>
                      <p className={cn("text-xs", textSecondary)}>Cover</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center">
                <Package className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className={textSecondary}>Inventory levels appear healthy</p>
              </div>
            )}
          </div>

          {/* Top Performers */}
          <div className={cardClass}>
            <div className="flex justify-between items-start mb-6">
              <h3 className={headingClass}>Top Performers</h3>
            </div>
            {intelligenceReport?.salesman_performance && intelligenceReport.salesman_performance.length > 0 ? (
              <div className="space-y-4">
                {intelligenceReport.salesman_performance.slice(0, 5).map((agent: any, idx: number) => (
                  <div key={idx}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className={textPrimary}>{agent.salesman_name || agent.agent_name}</span>
                      <span className="font-medium text-primary">{formatCurrency(agent.total_revenue)}</span>
                    </div>
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${(agent.total_revenue / intelligenceReport.salesman_performance[0].total_revenue) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center">
                <Users className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className={textSecondary}>No performance data available</p>
              </div>
            )}
          </div>
        </div>

        {/* Territory Performance */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className={cardClass}>
            <div className="flex justify-between items-start mb-6">
              <h3 className={headingClass}>Territory Performance</h3>
            </div>
            {intelligenceReport?.geo_insights && intelligenceReport.geo_insights.length > 0 ? (
              <div className="space-y-3">
                {intelligenceReport.geo_insights.slice(0, 6).map((geo: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between border-b last:border-0 border-border pb-3 last:pb-0">
                    <div className="flex items-center gap-3">
                      <MapPin size={16} className="text-primary" />
                      <span className={cn("text-sm", textPrimary)}>{geo.city_name}</span>
                    </div>
                    <div className="text-right">
                      <span className={cn("text-sm block font-medium", textPrimary)}>{formatCurrency(geo.total_revenue)}</span>
                      <span className="text-xs text-primary">{geo.deal_count} deals</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center">
                <MapPin className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className={textSecondary}>No territory data available</p>
              </div>
            )}
          </div>

          {/* Product Matrix */}
          {intelligenceReport?.product_matrix && intelligenceReport.product_matrix.length > 0 && (
            <div className={cardClass}>
              <div className="flex justify-between items-start mb-6">
                <h3 className={headingClass}>Product Matrix</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wider border-b border-border text-muted-foreground">
                      <th className="pb-3 font-medium pl-2">Product</th>
                      <th className="pb-3 font-medium text-right">Revenue</th>
                      <th className="pb-3 font-medium text-right pr-2">Margin</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm text-foreground">
                    {intelligenceReport.product_matrix.slice(0, 5).map((product: any, idx: number) => (
                      <tr key={idx} className="border-b last:border-0 border-border hover:bg-muted/50 transition-colors">
                        <td className="py-3 pl-2">{product.item_name}</td>
                        <td className="py-3 text-right">{formatCurrency(product.revenue)}</td>
                        <td className="py-3 text-right pr-2">
                          <span className={cn(
                            "px-2 py-1 rounded-lg text-xs font-medium",
                            product.margin_pct > 20 ? "bg-green-500/10 text-green-600" : "bg-muted text-muted-foreground"
                          )}>
                            {product.margin_pct?.toFixed(1) || 0}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Gap Analysis */}
        {intelligenceReport?.gap_analysis && intelligenceReport.gap_analysis.length > 0 && (
          <div className={cardClass}>
            <div className="flex justify-between items-start mb-6">
              <h3 className={headingClass}>Unsold Inventory (Capital Lock)</h3>
              <span className="text-xs px-2 py-1 rounded bg-orange-500/10 text-orange-600">Needs Action</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {intelligenceReport.gap_analysis.slice(0, 8).map((item: any, idx: number) => (
                <div key={idx} className="p-4 rounded-2xl bg-orange-500/5 border border-orange-500/10">
                  <p className={cn("text-sm font-medium mb-1 truncate", textPrimary)} title={item.item_name}>
                    {item.item_name}
                  </p>
                  <div className="flex justify-between items-end">
                    <div>
                      <p className={cn("text-xs mb-0.5", textSecondary)}>Stock</p>
                      <p className={cn("text-sm", textPrimary)}>{item.current_stock}</p>
                    </div>
                    <div className="text-right">
                      <p className={cn("text-xs mb-0.5", textSecondary)}>Capital</p>
                      <p className="text-sm font-medium text-orange-600">
                        {formatCurrency(item.tied_capital_value || 0)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default CRMIntelligence;
