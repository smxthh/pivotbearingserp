import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useApp } from '@/contexts/AppContext';
import { financialYears } from '@/lib/mock-data';
import { cn } from '@/lib/utils';

interface AppHeaderProps {
  title: string;
  showRefresh?: boolean;
  onRefresh?: () => void;
}

export function AppHeader({ title, showRefresh, onRefresh }: AppHeaderProps) {
  const { sidebarCollapsed } = useApp();

  return (
    <header className={cn(
      "sticky top-0 z-30 flex items-center justify-between h-16 px-4 md:px-6 bg-card border-b transition-all duration-200 bg-slate-50",
      sidebarCollapsed && "lg:pl-20"
    )}>
      <div className="flex items-center gap-4">
        {title !== 'Dashboard' && (
          <h1 className="text-xl font-semibold text-foreground">{title}</h1>
        )}
      </div>

      <div className="flex items-center gap-3">
        {showRefresh && (
          <Button variant="outline" size="sm" onClick={onRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        )}
      </div>
    </header>
  );
}
