import { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  TrendingDown,
  IndianRupee,
  Package,
  Bell,
  Search,
  ChevronDown,
  LogOut,
  User,
  AlertTriangle,
  AlertCircle,
  Info,
  X,
} from 'lucide-react';
import { PageContainer } from '@/components/shared/PageContainer';
import { KPICard } from '@/components/dashboard/KPICard';
import { IncomeExpenseChart } from '@/components/dashboard/IncomeExpenseChart';
import { DonutChart } from '@/components/dashboard/DonutChart';
import { RecentActivity } from '@/components/dashboard/RecentActivity';
import { TopProductsTable } from '@/components/dashboard/TopProductsTable';
import { DailyQuote } from '@/components/dashboard/DailyQuote';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useDashboard } from '@/hooks/useDashboard';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/hooks/useNotifications';
import { searchPages, SearchablePage } from '@/lib/searchable-pages';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

function getFYOptions() {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  const fyStartYear = currentMonth < 3 ? currentYear - 1 : currentYear;

  return [
    { value: `${fyStartYear}-${(fyStartYear + 1).toString().slice(-2)}`, label: `FY ${fyStartYear}-${(fyStartYear + 1).toString().slice(-2)}` },
    { value: `${fyStartYear - 1}-${fyStartYear.toString().slice(-2)}`, label: `FY ${fyStartYear - 1}-${fyStartYear.toString().slice(-2)}` },
  ];
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const fyOptions = useMemo(() => getFYOptions(), []);
  const [selectedFY, setSelectedFY] = useState(fyOptions[0].value);

  const {
    stats,
    topProducts,
    topStates,
    monthlyData,
    recentInvoices,
    isLoading,
    isLoadingRecentInvoices,
    refetch,
  } = useDashboard(selectedFY);

  // Notifications
  const { notifications, unreadCount, isLoading: notificationsLoading } = useNotifications();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [selectedSearchIndex, setSelectedSearchIndex] = useState(-1);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Instant search results using useMemo - computed synchronously with zero delay
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return searchPages(searchQuery);
  }, [searchQuery]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setTimeout(() => setIsRefreshing(false), 600);
  };

  // Keyboard shortcut for search (Ctrl+K or Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Handle click outside to close search dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsSearchFocused(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reset selected index when search query changes.
  useEffect(() => {
    setSelectedSearchIndex(-1);
  }, [searchQuery]);

  // Handle search keyboard navigation
  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedSearchIndex(prev => Math.min(prev + 1, searchResults.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedSearchIndex(prev => Math.max(prev - 1, -1));
    } else if (e.key === 'Enter' && selectedSearchIndex >= 0) {
      e.preventDefault();
      const selectedPage = searchResults[selectedSearchIndex];
      if (selectedPage) {
        navigate(selectedPage.href);
        setSearchQuery('');
        setIsSearchFocused(false);
      }
    } else if (e.key === 'Escape') {
      setIsSearchFocused(false);
      setSearchQuery('');
    }
  };

  // Handle page selection from search---
  const handlePageSelect = (page: SearchablePage) => {
    navigate(page.href);
    setSearchQuery('');
    setIsSearchFocused(false);
  };

  // Handle sign out
  const handleSignOut = async () => {
    await signOut();
  };

  // Navigate to profile
  const handleProfileClick = () => {
    navigate('/profile');
  };

  // User initials for avatar
  const userInitials = user?.email?.charAt(0).toUpperCase() || 'U';

  // Get notification icon based on severity
  const getNotificationIcon = (severity: string) => {
    switch (severity) {
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      default:
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  // Define Header Controls to pass to PageContainer
  const headerActions = (
    <div className="flex items-center gap-4">
      {/* Notification Bell with Popover */}
      <Popover>
        <PopoverTrigger asChild>
          <button
            className={cn(
              "relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors",
              unreadCount > 0 && "text-gray-700"
            )}
            aria-label="Notifications"
          >
            <Bell className={cn("h-5 w-5", unreadCount > 0 && "animate-wiggle")} />
            {unreadCount > 0 && (
              <>
                {/* Ping animation behind the badge */}
                <span className="absolute -top-1 -right-1 flex h-5 w-5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                </span>
                {/* Badge itself */}
                <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[20px] h-[20px] px-1 text-[10px] font-bold text-white bg-red-500 rounded-full shadow-sm">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              </>
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-80 p-0">
          <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
            <h3 className="font-semibold text-sm text-gray-900">Notifications</h3>
            <span className="text-xs text-gray-500">{unreadCount} unread</span>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notificationsLoading ? (
              <div className="p-4 text-center text-sm text-gray-500">Loading...</div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No notifications</p>
              </div>
            ) : (
              <div className="divide-y">
                {notifications.slice(0, 10).map((notification) => (
                  <button
                    key={notification.id}
                    onClick={() => notification.link && navigate(notification.link)}
                    className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors flex items-start gap-3"
                  >
                    <div className="flex-shrink-0 mt-0.5">
                      {getNotificationIcon(notification.severity)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {notification.title}
                      </p>
                      <p className="text-xs text-gray-500 line-clamp-2">
                        {notification.message}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
          {notifications.length > 0 && (
            <div className="px-4 py-2 border-t bg-gray-50">
              <button
                className="text-xs text-primary hover:underline w-full text-center"
                onClick={() => navigate('/items/products')}
              >
                View all notifications
              </button>
            </div>
          )}
        </PopoverContent>
      </Popover>

      {/* Divider */}
      <div className="h-6 w-px bg-gray-200"></div>

      {/* Search Bar - Minimalistic & Curved with Dropdown */}
      <div className="relative" ref={searchContainerRef}>
        <div className={cn(
          "flex items-center bg-gray-100/80 rounded-full px-4 py-2 gap-2 min-w-[200px] transition-all",
          isSearchFocused && "ring-2 ring-primary/20 bg-white shadow-sm"
        )}>
          <Search className="h-4 w-4 text-gray-400 flex-shrink-0" />
          <input
            ref={searchInputRef}
            id="dashboard-search"
            type="text"
            placeholder="Search anything"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            onKeyDown={handleSearchKeyDown}
            className="bg-transparent border-none outline-none text-sm text-gray-600 placeholder:text-gray-400 w-full"
          />
          {searchQuery ? (
            <button
              onClick={() => setSearchQuery('')}
              className="p-0.5 hover:bg-gray-200 rounded-full transition-colors"
            >
              <X className="h-3 w-3 text-gray-400" />
            </button>
          ) : (
            <div className="hidden sm:flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 text-[10px] font-semibold text-gray-500 bg-white rounded border border-gray-300 shadow-sm">
                Ctrl
              </kbd>
              <kbd className="px-1.5 py-0.5 text-[10px] font-semibold text-gray-500 bg-white rounded border border-gray-300 shadow-sm">
                K
              </kbd>
            </div>
          )}
        </div>

        {/* Search Results Dropdown */}
        {isSearchFocused && searchResults.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden z-50">
            <div className="py-1">
              {searchResults.map((page, index) => {
                const PageIcon = page.icon;
                return (
                  <button
                    key={page.href}
                    onClick={() => handlePageSelect(page)}
                    className={cn(
                      "w-full px-4 py-2.5 flex items-center gap-3 text-left transition-colors",
                      index === selectedSearchIndex
                        ? "bg-primary/5 text-primary"
                        : "hover:bg-gray-50 text-gray-700"
                    )}
                  >
                    <PageIcon className={cn(
                      "h-4 w-4 flex-shrink-0",
                      index === selectedSearchIndex ? "text-primary" : "text-gray-400"
                    )} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{page.title}</p>
                      <p className="text-xs text-gray-400">{page.category}</p>
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="px-4 py-2 border-t bg-gray-50 text-xs text-gray-400">
              <span>↑↓ to navigate</span>
              <span className="mx-2">•</span>
              <span>↵ to select</span>
              <span className="mx-2">•</span>
              <span>esc to close</span>
            </div>
          </div>
        )}

        {/* No Results Message */}
        {isSearchFocused && searchQuery && searchResults.length === 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden z-50">
            <div className="px-4 py-6 text-center">
              <Search className="h-6 w-6 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No pages found for "{searchQuery}"</p>
            </div>
          </div>
        )}
      </div>

      {/* Profile Avatar with Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2 p-1 rounded-full hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-medium text-sm shadow-sm overflow-hidden">
              {user?.user_metadata?.avatar_url ? (
                <img
                  src={user.user_metadata.avatar_url}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="h-5 w-5" />
              )}
            </div>
            <ChevronDown className="h-4 w-4 text-gray-400" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <div className="px-3 py-3 border-b">
            <p className="text-sm font-medium text-gray-900">
              {user?.user_metadata?.full_name || 'User'}
            </p>
            <p className="text-xs text-gray-500 truncate mt-0.5">{user?.email}</p>
          </div>
          <div className="py-1">
            <DropdownMenuItem onClick={handleProfileClick} className="cursor-pointer">
              <User className="h-4 w-4 mr-2 text-gray-400" />
              My Profile
            </DropdownMenuItem>
          </div>
          <DropdownMenuSeparator />
          <div className="py-1">
            <DropdownMenuItem
              onClick={handleSignOut}
              className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </DropdownMenuItem>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Divider */}
      <div className="h-6 w-px bg-gray-200"></div>

      {/* FY Selector (Keeping existing functionality) */}
      <Select value={selectedFY} onValueChange={setSelectedFY}>
        <SelectTrigger className="w-[140px] bg-white border-gray-200 rounded-lg h-9 text-sm focus:ring-1 focus:ring-indigo-500">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {fyOptions.map(fy => (
            <SelectItem key={fy.value} value={fy.value}>{fy.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        variant="outline"
        size="sm"
        onClick={handleRefresh}
        disabled={isRefreshing}
        className="h-9 bg-white border-gray-200 hover:bg-gray-50 text-gray-700"
      >
        {isRefreshing ? 'Refreshing...' : 'Refresh'}
      </Button>
    </div>
  );

  if (isLoading) {
    return (
      <PageContainer title="Dashboard">
        <div className="space-y-6 animate-pulse">
          <div className="h-10 bg-gray-100 rounded-lg w-full mb-8"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <div className="lg:col-span-2"><Skeleton className="h-80 rounded-2xl" /></div>
            <div><Skeleton className="h-80 rounded-2xl" /></div>
          </div>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer title="Dashboard" actions={headerActions}>
      <div className="pb-10">
        {/* Row 1: KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <KPICard
            title="Total Products"
            value={stats.totalItems}
            icon={Package}
            variant="default" // Blue
          />
          <KPICard
            title="Total Sales"
            value={stats.totalSalesInvoices}
            icon={IndianRupee}
            variant="indian-flag" // Tricolor
          />
          <KPICard
            title="Total Income"
            value={stats.totalRevenue}
            icon={TrendingUp}
            variant="success" // Green
            isCurrency
          />
          <KPICard
            title="Total Expenses"
            value={stats.totalExpense}
            icon={TrendingDown}
            variant="warning" // Red
            isCurrency
          />
        </div>

        {/* Row 2: Charts (Sales Revenue & Donut) - Fills remaining viewport */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-16 min-h-[calc(100vh-280px)]">
          <div className="lg:col-span-2 h-full min-h-[500px]">
            <IncomeExpenseChart data={monthlyData} />
          </div>
          <div className="h-full min-h-[500px]">
            <DonutChart
              title="Top Categories"
              data={topStates.slice(0, 5)}
              totalLabel="Total Sales"
            />
          </div>
        </div>

        {/* Row 3: Bottom Section (Recent Activity & Top Products) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="h-full">
            <RecentActivity activities={recentInvoices} isLoading={isLoadingRecentInvoices} />
          </div>
          <div className="lg:col-span-2 h-full">
            <TopProductsTable products={topProducts} />
          </div>
        </div>

        {/* Row 4: Daily Quote */}
        <div className="mt-8">
          <DailyQuote />
        </div>
      </div>
    </PageContainer>
  );
}
