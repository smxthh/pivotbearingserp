import { ReactNode } from 'react';
import { AppHeader } from '@/components/layout/AppHeader';
import { LucideIcon } from 'lucide-react';

interface PageContainerProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  children: ReactNode;
  showRefresh?: boolean;
  onRefresh?: () => void;
  actions?: ReactNode;
}

export function PageContainer({
  title,
  description,
  icon: Icon,
  children,
  showRefresh,
  onRefresh,
  actions,
}: PageContainerProps) {
  return (
    <>
      <AppHeader title={title} showRefresh={showRefresh} onRefresh={onRefresh} />
      <div className="flex-1 p-4 md:p-6 space-y-6">
        {(description || Icon || actions) && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {Icon && (
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
              )}
              {description && (
                <p className="text-sm text-muted-foreground tracking-[-0.06em]">{description}</p>
              )}
            </div>
            {actions && (
              <div className="flex items-center gap-2">{actions}</div>
            )}
          </div>
        )}
        {children}
      </div>
    </>
  );
}
