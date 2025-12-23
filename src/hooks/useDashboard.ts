import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useRealtimeSubscription } from './useRealtimeSubscription';

interface DashboardStats {
    totalRevenue: number;
    totalExpense: number;
    todayRevenue: number;
    todayOrders: number;
    outstandingReceivable: number;
    outstandingPayable: number;
    totalParties: number;
    totalItems: number;
    totalSalesInvoices: number;
    totalPurchaseInvoices: number;
}

interface TopItem {
    name: string;
    value: number;
    secondary?: number;
}

// Indian FY months in order (April to March)
const FY_MONTHS = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];

// Helper to parse FY string "2024-25" -> { start: '2024-04-01', end: '2025-03-31' }
function getFyDates(fyString?: string) {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    // Default to current FY if not provided
    const startYear = fyString ? parseInt(fyString.split('-')[0]) : (currentMonth < 3 ? currentYear - 1 : currentYear);
    const endYear = startYear + 1;

    return {
        startDate: `${startYear}-04-01`,
        endDate: `${endYear}-03-31`
    };
}

export function useDashboard(selectedFy?: string) {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const queryKey = ['dashboard', selectedFy || 'current'];

    // Subscribe to real-time updates for vouchers table (where real data lives)
    useRealtimeSubscription('vouchers', queryKey);
    useRealtimeSubscription('voucher_items', queryKey);
    useRealtimeSubscription('parties', queryKey);

    const { startDate, endDate } = getFyDates(selectedFy);

    // Fetch dashboard stats from VOUCHERS table
    const {
        data: stats,
        isLoading: isLoadingStats,
        error,
        refetch,
    } = useQuery({
        queryKey: [...queryKey, 'stats'],
        queryFn: async (): Promise<DashboardStats> => {
            const today = new Date().toISOString().split('T')[0];

            // Fetch all VOUCHERS for the selected FY (Tax Invoices = Sales, Purchase Invoices = Expense)
            const { data: vouchers } = await supabase
                .from('vouchers')
                .select('voucher_type, total_amount, voucher_date, status')
                .eq('status', 'confirmed')
                .gte('voucher_date', startDate)
                .lte('voucher_date', endDate);

            // Calculate revenue (tax_invoice) and expense (purchase_invoice)
            const salesVouchers = vouchers?.filter(v => v.voucher_type === 'tax_invoice') || [];
            const purchaseVouchers = vouchers?.filter(v => v.voucher_type === 'purchase_invoice') || [];

            const totalRevenue = salesVouchers.reduce((sum, v) => sum + (v.total_amount || 0), 0);
            const totalExpense = purchaseVouchers.reduce((sum, v) => sum + (v.total_amount || 0), 0);

            const todaySales = salesVouchers.filter(v => v.voucher_date === today);
            const todayRevenue = todaySales.reduce((sum, v) => sum + (v.total_amount || 0), 0);
            const todayOrders = todaySales.length;

            // Party balances
            const { data: parties } = await supabase
                .from('parties')
                .select('current_balance, type');

            const outstandingReceivable = parties
                ?.filter(p => p.current_balance > 0)
                .reduce((sum, p) => sum + p.current_balance, 0) || 0;

            const outstandingPayable = parties
                ?.filter(p => p.current_balance < 0)
                .reduce((sum, p) => sum + Math.abs(p.current_balance), 0) || 0;

            // Counts
            const { count: totalParties } = await supabase.from('parties').select('*', { count: 'exact', head: true });
            const { count: totalItems } = await supabase.from('items').select('*', { count: 'exact', head: true });

            return {
                totalRevenue,
                totalExpense,
                todayRevenue,
                todayOrders,
                outstandingReceivable,
                outstandingPayable,
                totalParties: totalParties || 0,
                totalItems: totalItems || 0,
                totalSalesInvoices: salesVouchers.length,
                totalPurchaseInvoices: purchaseVouchers.length,
            };
        },
        enabled: !!user,
        staleTime: 30000, // Reduced for more frequent updates
    });

    // Fetch top customers from VOUCHERS (FY filtered)
    const { data: topCustomers = [] } = useQuery({
        queryKey: [...queryKey, 'topCustomers'],
        queryFn: async (): Promise<TopItem[]> => {
            const { data: vouchers } = await supabase
                .from('vouchers')
                .select('party_name, total_amount')
                .eq('voucher_type', 'tax_invoice')
                .eq('status', 'confirmed')
                .gte('voucher_date', startDate)
                .lte('voucher_date', endDate);

            if (!vouchers) return [];

            const customerMap = new Map<string, { revenue: number; orders: number }>();
            vouchers.forEach(v => {
                const name = v.party_name || 'Unknown';
                const existing = customerMap.get(name) || { revenue: 0, orders: 0 };
                customerMap.set(name, {
                    revenue: existing.revenue + (v.total_amount || 0),
                    orders: existing.orders + 1,
                });
            });

            return Array.from(customerMap.entries())
                .map(([name, data]) => ({ name, value: data.revenue, secondary: data.orders }))
                .sort((a, b) => b.value - a.value)
                .slice(0, 5);
        },
        enabled: !!user,
        staleTime: 30000,
    });

    // Fetch top products from VOUCHER_ITEMS (FY filtered)
    const { data: topProducts = [] } = useQuery({
        queryKey: [...queryKey, 'topProducts'],
        queryFn: async (): Promise<TopItem[]> => {
            const { data: items } = await supabase
                .from('voucher_items')
                .select(`item_name, quantity, total_amount, voucher:vouchers!inner(voucher_type, status, voucher_date)`)
                .eq('voucher.voucher_type', 'tax_invoice')
                .eq('voucher.status', 'confirmed')
                .gte('voucher.voucher_date', startDate)
                .lte('voucher.voucher_date', endDate);

            if (!items) return [];

            const productMap = new Map<string, { revenue: number; quantity: number }>();
            items.forEach(item => {
                const name = item.item_name || 'Unknown';
                const existing = productMap.get(name) || { revenue: 0, quantity: 0 };
                productMap.set(name, {
                    revenue: existing.revenue + (item.total_amount || 0),
                    quantity: existing.quantity + (item.quantity || 0),
                });
            });

            return Array.from(productMap.entries())
                .map(([name, data]) => ({ name, value: data.revenue, secondary: data.quantity }))
                .sort((a, b) => b.value - a.value)
                .slice(0, 5);
        },
        enabled: !!user,
        staleTime: 30000,
    });

    // Fetch top states/categories from VOUCHERS (FY filtered) - lookup state from parties
    const { data: topStates = [] } = useQuery({
        queryKey: [...queryKey, 'topStates'],
        queryFn: async (): Promise<TopItem[]> => {
            // Get vouchers with party_name
            const { data: vouchers } = await supabase
                .from('vouchers')
                .select('party_name, total_amount')
                .eq('voucher_type', 'tax_invoice')
                .eq('status', 'confirmed')
                .gte('voucher_date', startDate)
                .lte('voucher_date', endDate);

            if (!vouchers || vouchers.length === 0) return [];

            // Get unique party names
            const partyNames = [...new Set(vouchers.map(v => v.party_name).filter(Boolean))];

            // Fetch party states
            const { data: parties } = await supabase
                .from('parties')
                .select('name, state')
                .in('name', partyNames);

            // Create a map of party name to state
            const partyStateMap = new Map<string, string>();
            parties?.forEach(p => {
                if (p.state) partyStateMap.set(p.name.toLowerCase(), p.state);
            });

            // Aggregate by state (or party name if no state)
            const stateMap = new Map<string, number>();
            vouchers.forEach(v => {
                const partyName = v.party_name?.toLowerCase() || '';
                const stateName = partyStateMap.get(partyName) || v.party_name || 'Unknown';
                const existing = stateMap.get(stateName) || 0;
                stateMap.set(stateName, existing + (v.total_amount || 0));
            });

            return Array.from(stateMap.entries())
                .map(([name, value]) => ({ name, value }))
                .sort((a, b) => b.value - a.value)
                .slice(0, 5);
        },
        enabled: !!user,
        staleTime: 30000,
    });

    // Fetch monthly data for chart from VOUCHERS
    const { data: monthlyData = [] } = useQuery({
        queryKey: [...queryKey, 'monthlyData'],
        queryFn: async () => {
            const { data: vouchers } = await supabase
                .from('vouchers')
                .select('voucher_type, total_amount, voucher_date')
                .eq('status', 'confirmed')
                .gte('voucher_date', startDate)
                .lte('voucher_date', endDate);

            if (!vouchers) return FY_MONTHS.map(month => ({ month, income: 0, expense: 0 }));

            const monthMap = new Map<string, { income: number; expense: number }>();
            FY_MONTHS.forEach(m => monthMap.set(m, { income: 0, expense: 0 }));
            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

            vouchers.forEach(v => {
                const date = new Date(v.voucher_date);
                const monthName = monthNames[date.getMonth()];
                const existing = monthMap.get(monthName) || { income: 0, expense: 0 };

                if (v.voucher_type === 'tax_invoice') {
                    monthMap.set(monthName, { ...existing, income: existing.income + (v.total_amount || 0) });
                } else if (v.voucher_type === 'purchase_invoice') {
                    monthMap.set(monthName, { ...existing, expense: existing.expense + (v.total_amount || 0) });
                }
            });

            return FY_MONTHS.map(month => ({
                month,
                ...monthMap.get(month)!,
            }));
        },
        enabled: !!user,
        staleTime: 30000,
    });

    // Fetch recent vouchers (Tax Invoices) - show all recent invoices regardless of status
    const { data: recentInvoices = [], isLoading: isLoadingRecentInvoices } = useQuery({
        queryKey: [...queryKey, 'recentInvoices'],
        queryFn: async () => {
            try {
                const { data: vouchers, error } = await supabase
                    .from('vouchers')
                    .select('id, voucher_number, voucher_date, party_name, total_amount, status')
                    .eq('voucher_type', 'tax_invoice')
                    .order('created_at', { ascending: false })
                    .limit(10);

                if (error) {
                    console.error('Error fetching recent invoices:', error);
                    return [];
                }

                // Map to expected format for RecentActivity component
                return (vouchers || []).map(v => ({
                    id: v.id || '',
                    invoice_number: v.voucher_number || '',
                    invoice_date: v.voucher_date || '',
                    party_name: v.party_name || 'Unknown',
                    grand_total: v.total_amount || 0,
                    status: v.status || 'draft',
                }));
            } catch (err) {
                console.error('Error in recentInvoices query:', err);
                return [];
            }
        },
        enabled: !!user,
        staleTime: 30000,
    });

    return {
        stats: stats || {
            totalRevenue: 0,
            totalExpense: 0,
            todayRevenue: 0,
            todayOrders: 0,
            outstandingReceivable: 0,
            outstandingPayable: 0,
            totalParties: 0,
            totalItems: 0,
            totalSalesInvoices: 0,
            totalPurchaseInvoices: 0,
        },
        topCustomers,
        topProducts,
        topStates,
        monthlyData,
        recentInvoices,
        isLoading: isLoadingStats,
        isLoadingRecentInvoices,
        error,
        refetch: async () => {
            await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
        },
    };
}
