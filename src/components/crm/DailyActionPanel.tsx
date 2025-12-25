import React from 'react';
import { DailyAction } from '@/hooks/useCRMActionPlanner';
import { 
  Phone, 
  Mail, 
  Eye, 
  Users, 
  BarChart3, 
  ArrowRight,
  Zap,
  AlertCircle,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface DailyActionPanelProps {
  actions: DailyAction[];
  focusScore: { score: number; label: string };
}

const formatCurrency = (value: number) => {
  if (value >= 10000000) return `₹${(value / 10000000).toFixed(1)}Cr`;
  if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
  if (value >= 1000) return `₹${(value / 1000).toFixed(0)}K`;
  return `₹${value.toFixed(0)}`;
};

const actionTypeIcons = {
  'call': Phone,
  'follow-up': Mail,
  'review': Eye,
  'coach': Users,
  'analyze': BarChart3
};

const priorityConfig = {
  'critical': { 
    bg: 'bg-red-500/10', 
    border: 'border-red-500/20', 
    text: 'text-red-600 dark:text-red-400',
    badge: 'bg-red-500 text-white'
  },
  'high': { 
    bg: 'bg-orange-500/10', 
    border: 'border-orange-500/20', 
    text: 'text-orange-600 dark:text-orange-400',
    badge: 'bg-orange-500 text-white'
  },
  'medium': { 
    bg: 'bg-primary/10', 
    border: 'border-primary/20', 
    text: 'text-primary',
    badge: 'bg-primary text-primary-foreground'
  },
  'low': { 
    bg: 'bg-muted', 
    border: 'border-border', 
    text: 'text-muted-foreground',
    badge: 'bg-muted-foreground text-white'
  }
};

const categoryLabels = {
  'revenue': 'Revenue',
  'retention': 'Retention',
  'collection': 'Collection',
  'efficiency': 'Efficiency',
  'growth': 'Growth'
};

export const DailyActionPanel: React.FC<DailyActionPanelProps> = ({ actions, focusScore }) => {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-primary';
    if (score >= 40) return 'text-orange-500';
    return 'text-red-500';
  };

  const getScoreIcon = (score: number) => {
    if (score >= 80) return CheckCircle2;
    if (score >= 60) return Clock;
    if (score >= 40) return AlertCircle;
    return Zap;
  };

  const ScoreIcon = getScoreIcon(focusScore.score);

  return (
    <div className="p-6 rounded-3xl bg-card border border-border h-full">
      {/* Header with Focus Score */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-medium text-foreground">Today's Priorities</h3>
          <p className="text-sm text-muted-foreground">AI-prioritized actions</p>
        </div>
        <div className="flex items-center gap-2">
          <ScoreIcon className={cn("h-5 w-5", getScoreColor(focusScore.score))} />
          <span className={cn("text-sm font-medium", getScoreColor(focusScore.score))}>
            {focusScore.label}
          </span>
        </div>
      </div>

      {/* Actions List */}
      {actions.length === 0 ? (
        <div className="text-center py-8">
          <CheckCircle2 className="h-10 w-10 text-green-500 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No urgent actions today</p>
        </div>
      ) : (
        <div className="space-y-3">
          {actions.slice(0, 5).map((action, index) => {
            const config = priorityConfig[action.priority];
            const ActionIcon = actionTypeIcons[action.actionType];

            return (
              <div 
                key={action.id}
                className={cn(
                  "p-4 rounded-xl border transition-all hover:shadow-sm cursor-pointer group",
                  config.bg,
                  config.border
                )}
              >
                <div className="flex items-start gap-3">
                  {/* Priority Number */}
                  <div className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0",
                    config.badge
                  )}>
                    {index + 1}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={cn("text-xs font-medium uppercase tracking-wide", config.text)}>
                        {categoryLabels[action.category]}
                      </span>
                      {action.priority === 'critical' && (
                        <span className="text-xs px-1.5 py-0.5 bg-red-500 text-white rounded">
                          URGENT
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-medium text-foreground mb-1 line-clamp-1">
                      {action.title}
                    </p>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {action.description}
                    </p>
                    {action.potentialValue > 0 && (
                      <p className="text-xs text-primary mt-2 font-medium">
                        Potential: {formatCurrency(action.potentialValue)}
                      </p>
                    )}
                  </div>

                  {/* Action Icon */}
                  <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="p-2 rounded-lg bg-primary text-primary-foreground">
                      <ActionIcon className="h-4 w-4" />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* View All Link */}
      {actions.length > 5 && (
        <div className="mt-4 text-center">
          <button className="text-sm text-primary hover:underline inline-flex items-center gap-1">
            View all {actions.length} actions
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
};
