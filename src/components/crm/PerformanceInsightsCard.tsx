import React from 'react';
import { PerformanceInsight } from '@/hooks/useCRMActionPlanner';
import { 
  TrendingUp, 
  TrendingDown, 
  Lightbulb, 
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  Shield
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface PerformanceInsightsCardProps {
  insights: PerformanceInsight[];
}

const typeConfig = {
  'strength': {
    icon: TrendingUp,
    label: 'Strength',
    bg: 'bg-green-500/10',
    border: 'border-green-500/20',
    iconColor: 'text-green-500',
    labelColor: 'text-green-600 dark:text-green-400'
  },
  'weakness': {
    icon: TrendingDown,
    label: 'Weakness',
    bg: 'bg-red-500/10',
    border: 'border-red-500/20',
    iconColor: 'text-red-500',
    labelColor: 'text-red-600 dark:text-red-400'
  },
  'opportunity': {
    icon: Lightbulb,
    label: 'Opportunity',
    bg: 'bg-primary/10',
    border: 'border-primary/20',
    iconColor: 'text-primary',
    labelColor: 'text-primary'
  },
  'threat': {
    icon: AlertTriangle,
    label: 'Threat',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/20',
    iconColor: 'text-orange-500',
    labelColor: 'text-orange-600 dark:text-orange-400'
  }
};

export const PerformanceInsightsCard: React.FC<PerformanceInsightsCardProps> = ({ insights }) => {
  // Group insights by type
  const grouped = {
    strength: insights.filter(i => i.type === 'strength'),
    weakness: insights.filter(i => i.type === 'weakness'),
    opportunity: insights.filter(i => i.type === 'opportunity'),
    threat: insights.filter(i => i.type === 'threat')
  };

  return (
    <div className="p-6 rounded-3xl bg-card border border-border">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-medium text-foreground">Performance Analysis</h3>
          <p className="text-sm text-muted-foreground">SWOT-based insights</p>
        </div>
        <div className="flex gap-1">
          {Object.entries(grouped).map(([type, items]) => (
            items.length > 0 && (
              <span 
                key={type}
                className={cn(
                  "w-2 h-2 rounded-full",
                  type === 'strength' ? 'bg-green-500' :
                  type === 'weakness' ? 'bg-red-500' :
                  type === 'opportunity' ? 'bg-primary' : 'bg-orange-500'
                )}
              />
            )
          ))}
        </div>
      </div>

      {insights.length === 0 ? (
        <div className="text-center py-8">
          <Shield className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No insights available yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {insights.slice(0, 6).map((insight, index) => {
            const config = typeConfig[insight.type];
            const Icon = config.icon;

            return (
              <div 
                key={index}
                className={cn(
                  "p-4 rounded-xl border",
                  config.bg,
                  config.border
                )}
              >
                <div className="flex items-start gap-3">
                  <div className={cn("p-1.5 rounded-lg", config.bg)}>
                    <Icon className={cn("h-4 w-4", config.iconColor)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={cn("text-xs font-medium uppercase tracking-wide", config.labelColor)}>
                        {config.label}
                      </span>
                      <span className="text-xs text-muted-foreground">•</span>
                      <span className="text-xs text-muted-foreground">{insight.metric}</span>
                    </div>
                    <div className="flex items-baseline gap-2 mb-2">
                      <span className="text-sm font-medium text-foreground">{insight.value}</span>
                      <span className="text-xs text-muted-foreground">vs {insight.benchmark}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      💡 {insight.recommendation}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
