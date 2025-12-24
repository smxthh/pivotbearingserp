import { useState, useCallback } from 'react';
import { RefreshCw, FileDown, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface TableToolbarProps {
  onRefresh: () => unknown;
  onExport?: () => void;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  pageSize?: number;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
  isRefreshing?: boolean;
  children?: React.ReactNode;
  className?: string;
}

export function TableToolbar({
  onRefresh,
  onExport,
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search...',
  pageSize = 25,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
  isRefreshing: externalIsRefreshing,
  children,
  className,
}: TableToolbarProps) {
  const [internalIsRefreshing, setInternalIsRefreshing] = useState(false);
  const isRefreshing = externalIsRefreshing ?? internalIsRefreshing;

  const handleRefresh = useCallback(async () => {
    setInternalIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      // Add a minimum animation duration for smooth UX
      setInternalIsRefreshing(false);
    }
  }, [onRefresh]);

  return (
    <div className={cn('flex flex-wrap items-center gap-3 mb-4 p-3 bg-muted/30 rounded-lg border', className)}>
      {onPageSizeChange && (
        <Select
          value={pageSize.toString()}
          onValueChange={(v) => onPageSizeChange(Number(v))}
        >
          <SelectTrigger className="w-[130px] rounded-lg bg-background">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {pageSizeOptions.map((size) => (
              <SelectItem key={size} value={size.toString()}>
                Show {size} rows
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {onExport && (
        <Button
          variant="outline"
          size="sm"
          onClick={onExport}
          className="rounded-lg"
        >
          <FileDown className="h-4 w-4 mr-2" />
          Excel
        </Button>
      )}

      <Button
        variant="outline"
        size="sm"
        onClick={handleRefresh}
        disabled={isRefreshing}
        className="rounded-lg"
      >
        <RefreshCw
          className={cn(
            'h-4 w-4 mr-2 transition-transform duration-500',
            isRefreshing && 'animate-[spin_0.8s_linear_infinite]'
          )}
        />
        Refresh
      </Button>

      {children}

      <div className="flex-1" />

      {onSearchChange !== undefined && (
        <div className="relative max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 rounded-lg bg-background w-64"
          />
        </div>
      )}
    </div>
  );
}
