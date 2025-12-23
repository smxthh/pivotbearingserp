import { useMemo } from 'react';

interface TopListItem {
  name: string;
  value: string | number;
  secondary?: string | number;
}

interface TopListCardProps {
  title: string;
  items: TopListItem[];
  valueLabel?: string;
  secondaryLabel?: string;
  emptyMessage?: string;
  showProgressBar?: boolean;
}

export function TopListCard({
  title,
  items,
  valueLabel = 'Value',
  secondaryLabel,
  emptyMessage = 'No data yet',
  showProgressBar = true
}: TopListCardProps) {

  // Calculate max value for progress bar
  const maxValue = useMemo(() => {
    if (!showProgressBar || items.length === 0) return 1;
    const values = items.map(item => typeof item.value === 'number' ? item.value : 0);
    return Math.max(...values, 1);
  }, [items, showProgressBar]);

  const formatValue = (value: string | number) => {
    if (typeof value === 'number') {
      return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        notation: 'compact',
        maximumFractionDigits: 1,
      }).format(value);
    }
    return value;
  };

  // Rank badge colors
  const getRankColor = (index: number) => {
    switch (index) {
      case 0: return 'bg-amber-100 text-amber-700 border-amber-200';
      case 1: return 'bg-gray-100 text-gray-600 border-gray-200';
      case 2: return 'bg-orange-100 text-orange-700 border-orange-200';
      default: return 'bg-primary/10 text-primary border-primary/20';
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-shadow duration-200">
      <h3 className="text-lg font-semibold tracking-tight text-foreground mb-5">{title}</h3>

      {items.length > 0 ? (
        <div className="space-y-3">
          {items.map((item, index) => {
            const numericValue = typeof item.value === 'number' ? item.value : 0;
            const progressWidth = showProgressBar ? (numericValue / maxValue) * 100 : 0;

            return (
              <div
                key={item.name}
                className="group relative overflow-hidden rounded-xl bg-gray-50/80 hover:bg-gray-100/80 transition-colors duration-150"
              >
                {/* Progress bar background */}
                {showProgressBar && (
                  <div
                    className="absolute inset-y-0 left-0 bg-primary/5 transition-all duration-300 group-hover:bg-primary/10"
                    style={{ width: `${progressWidth}%` }}
                  />
                )}

                {/* Content */}
                <div className="relative flex items-center justify-between p-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Rank badge */}
                    <span className={`
                      flex-shrink-0 w-7 h-7 rounded-full border 
                      text-xs font-semibold flex items-center justify-center
                      ${getRankColor(index)}
                    `}>
                      {index + 1}
                    </span>

                    {/* Name */}
                    <span className="text-sm font-medium text-foreground truncate max-w-[140px]">
                      {item.name}
                    </span>
                  </div>

                  {/* Values */}
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-semibold tabular-nums text-foreground">
                      {formatValue(item.value)}
                    </p>
                    {item.secondary !== undefined && secondaryLabel && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {secondaryLabel}: {typeof item.secondary === 'number'
                          ? new Intl.NumberFormat('en-IN').format(item.secondary)
                          : item.secondary
                        }
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-40 text-center">
          <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center mb-3">
            <svg className="w-6 h-6 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        </div>
      )}
    </div>
  );
}
