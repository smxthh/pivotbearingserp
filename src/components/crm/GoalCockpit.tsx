import React from 'react';
import { GoalProgress } from '@/hooks/useBusinessIntelligence';
import { GoalTrajectory } from '@/hooks/useCRMActionPlanner';
import { Target, TrendingUp, TrendingDown, Clock, AlertTriangle, CheckCircle, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GoalCockpitProps {
  goalProgress: GoalProgress | null;
  trajectory: GoalTrajectory | null;
  onSetGoal: () => void;
}

const formatCurrency = (value: number) => {
  if (value >= 10000000) {
    return `₹${(value / 10000000).toFixed(2)}Cr`;
  }
  if (value >= 100000) {
    return `₹${(value / 100000).toFixed(1)}L`;
  }
  return `₹${(value / 1000).toFixed(0)}K`;
};

export const GoalCockpit: React.FC<GoalCockpitProps> = ({ goalProgress, trajectory, onSetGoal }) => {
  if (!goalProgress || !goalProgress.success) {
    return (
      <div className="p-8 rounded-3xl bg-card border border-border text-center">
        <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium text-foreground mb-2">No Goal Set</h3>
        <p className="text-sm text-muted-foreground mb-4">Set your yearly revenue target to start tracking</p>
        <button 
          onClick={onSetGoal}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors"
        >
          Set Revenue Goal
        </button>
      </div>
    );
  }

  const { 
    progress_percentage, 
    actual_revenue, 
    target_amount, 
    days_passed, 
    days_remaining,
    required_daily_run_rate,
    goal_achieved 
  } = goalProgress;

  const statusConfig = {
    'ahead': { color: 'text-green-500', bg: 'bg-green-500/10', icon: TrendingUp, label: 'Ahead of Target' },
    'on-track': { color: 'text-primary', bg: 'bg-primary/10', icon: CheckCircle, label: 'On Track' },
    'at-risk': { color: 'text-orange-500', bg: 'bg-orange-500/10', icon: AlertTriangle, label: 'At Risk' },
    'critical': { color: 'text-red-500', bg: 'bg-red-500/10', icon: Zap, label: 'Critical' }
  };

  const status = trajectory?.status || 'on-track';
  const config = statusConfig[status];
  const StatusIcon = config.icon;

  const trendIcons = {
    'accelerating': { icon: TrendingUp, color: 'text-green-500' },
    'steady': { icon: Target, color: 'text-primary' },
    'decelerating': { icon: TrendingDown, color: 'text-orange-500' },
    'volatile': { icon: AlertTriangle, color: 'text-yellow-500' }
  };

  const trendConfig = trajectory?.trendDirection 
    ? trendIcons[trajectory.trendDirection] 
    : trendIcons.steady;
  const TrendIcon = trendConfig.icon;

  return (
    <div className="p-6 rounded-3xl bg-card border border-border">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className={cn("p-2 rounded-xl", config.bg)}>
            <StatusIcon className={cn("h-5 w-5", config.color)} />
          </div>
          <div>
            <h3 className="text-lg font-medium text-foreground">FY {goalProgress.year} Goal</h3>
            <p className="text-sm text-muted-foreground">{config.label}</p>
          </div>
        </div>
        <button 
          onClick={onSetGoal}
          className="text-sm text-primary hover:underline"
        >
          Adjust
        </button>
      </div>

      {/* Main Progress */}
      <div className="mb-6">
        <div className="flex items-end justify-between mb-2">
          <span className="text-4xl font-light text-foreground">
            {Math.min(progress_percentage, 999).toFixed(1)}%
          </span>
          {goal_achieved && (
            <span className="px-3 py-1 bg-green-500/10 text-green-500 text-sm font-medium rounded-full">
              Goal Achieved!
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground mb-3">
          {formatCurrency(actual_revenue)} of {formatCurrency(target_amount)}
        </p>
        
        {/* Progress Bar */}
        <div className="h-3 w-full bg-muted rounded-full overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all duration-1000", 
              status === 'ahead' ? 'bg-green-500' :
              status === 'on-track' ? 'bg-primary' :
              status === 'at-risk' ? 'bg-orange-500' : 'bg-red-500'
            )}
            style={{ width: `${Math.min(progress_percentage, 100)}%` }}
          />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="p-3 rounded-xl bg-muted/50">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Days Left</p>
          <p className="text-xl font-light text-foreground">{days_remaining}</p>
        </div>
        <div className="p-3 rounded-xl bg-muted/50">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Run Rate Needed</p>
          <p className={cn("text-xl font-light", 
            status === 'critical' ? 'text-red-500' : 
            status === 'at-risk' ? 'text-orange-500' : 'text-foreground'
          )}>
            {formatCurrency(required_daily_run_rate)}/d
          </p>
        </div>
        <div className="p-3 rounded-xl bg-muted/50">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Current Pace</p>
          <p className="text-xl font-light text-foreground">
            {trajectory ? formatCurrency(trajectory.dailyRunRate) : '—'}/d
          </p>
        </div>
        <div className="p-3 rounded-xl bg-muted/50">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Trend</p>
          <div className="flex items-center gap-2">
            <TrendIcon className={cn("h-4 w-4", trendConfig.color)} />
            <span className="text-sm capitalize text-foreground">
              {trajectory?.trendDirection || 'Steady'}
            </span>
          </div>
        </div>
      </div>

      {/* Projection Alert */}
      {trajectory && !goal_achieved && (
        <div className={cn(
          "p-4 rounded-xl border",
          trajectory.shortfall > 0 
            ? "bg-orange-500/5 border-orange-500/20" 
            : "bg-green-500/5 border-green-500/20"
        )}>
          <div className="flex items-start gap-3">
            {trajectory.shortfall > 0 ? (
              <AlertTriangle className="h-5 w-5 text-orange-500 flex-shrink-0 mt-0.5" />
            ) : (
              <TrendingUp className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
            )}
            <div>
              <p className={cn("text-sm font-medium", 
                trajectory.shortfall > 0 ? "text-orange-700 dark:text-orange-300" : "text-green-700 dark:text-green-300"
              )}>
                {trajectory.shortfall > 0 
                  ? `Projected shortfall: ${formatCurrency(trajectory.shortfall)}`
                  : `On pace to exceed target by ${formatCurrency(trajectory.projectedEndRevenue - target_amount)}`
                }
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {trajectory.shortfall > 0 
                  ? `At current pace, you'll end at ${formatCurrency(trajectory.projectedEndRevenue)}. Increase daily sales by ${formatCurrency(required_daily_run_rate - trajectory.dailyRunRate)} to close the gap.`
                  : `Maintain momentum. Current trajectory: ${formatCurrency(trajectory.projectedEndRevenue)}.`
                }
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Confidence Meter */}
      {trajectory && (
        <div className="mt-4 flex items-center gap-3 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>Confidence Score: {trajectory.confidenceScore}%</span>
          <span className="text-xs">
            (based on trend consistency)
          </span>
        </div>
      )}
    </div>
  );
};
