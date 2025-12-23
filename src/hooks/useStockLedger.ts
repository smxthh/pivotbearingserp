import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useDistributorId } from './useDistributorProfile';

export interface StockLedgerItem {
    item_id: string;
    item_name: string;
    current_stock: number;
    last_updated: string;
}

interface UseStockLedgerOptions {
    search?: string;
    page?: number;
    pageSize?: number;
    itemId?: string;
}

export function useStockLedger(options: UseStockLedgerOptions = {}) {
    const { data: distributorId } = useDistributorId();
    const { search, page = 1, pageSize = 25, itemId } = options;

    const queryKey = ['stock-ledger', distributorId, search, page, pageSize, itemId];

    const {
        data: stockData,
        isLoading,
        error,
        refetch
    } = useQuery({
        queryKey,
        queryFn: async () => {
            if (!distributorId) return { data: [], count: 0 };

            // Casting to any because view_stock_ledger is not yet in generated types
            let query = supabase
                .from('view_stock_ledger' as any)
                .select('*', { count: 'exact' })
                .eq('distributor_id', distributorId);

            if (itemId) {
                query = query.eq('item_id', itemId);
            }

            if (search) {
                query = query.ilike('item_name', `%${search}%`);
            }

            query = query.range((page - 1) * pageSize, page * pageSize - 1);

            const { data, count, error } = await query;

            if (error) throw error;

            return {
                data: (data as unknown as StockLedgerItem[]) || [],
                count: count || 0
            };
        },
        enabled: !!distributorId,
        staleTime: 1000 * 60, // 1 minute
    });

    return {
        stockItems: stockData?.data || [],
        totalCount: stockData?.count || 0,
        isLoading,
        error,
        refetch
    };
}
