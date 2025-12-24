import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

type TableName =
    | 'parties'
    | 'items'
    | 'invoices'
    | 'invoice_items'
    | 'payments'
    | 'categories'
    | 'ledger_entries'
    | 'stock_movements'
    | 'distributor_profiles'
    | 'salespersons'
    | 'financial_years'
    | 'settings'
    | 'purchase_orders'
    | 'purchase_order_items'
    // Accounting module tables
    | 'ledgers'
    | 'ledger_groups'
    | 'vouchers'
    | 'voucher_items'
    | 'ledger_transactions'
    | 'gst_summary'
    // Permissions
    | 'user_permissions'
    | ''; // Empty string for disabled subscriptions

interface UseRealtimeOptions {
    /** Column to filter on (e.g., 'distributor_id') */
    filterColumn?: string;
    /** Value to filter by */
    filterValue?: string;
    /** Callback when data changes */
    onDataChange?: (payload: RealtimePostgresChangesPayload<{ [key: string]: unknown }>) => void;
}

/**
 * Hook to subscribe to real-time changes on a Supabase table
 * Automatically invalidates React Query cache when changes occur
 */
export function useRealtimeSubscription(
    table: TableName,
    queryKey: string[],
    options?: UseRealtimeOptions,
    enabled: boolean = true
) {
    const queryClient = useQueryClient();

    // Use a stable key for the effect dependency
    const stableQueryKey = JSON.stringify(queryKey);

    useEffect(() => {
        // Don't subscribe if disabled or empty table name
        if (!enabled || !table) {
            return;
        }

        const channelName = `${table}_changes_${stableQueryKey}`;

        const channel = supabase
            .channel(channelName)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: table,
                    filter: options?.filterColumn && options?.filterValue
                        ? `${options.filterColumn}=eq.${options.filterValue}`
                        : undefined,
                },
                (payload) => {
                    console.log(`[Realtime] ${table} change:`, payload.eventType, payload);

                    // Call custom callback if provided
                    if (options?.onDataChange) {
                        options.onDataChange(payload);
                    }

                    // Invalidate and refetch queries
                    queryClient.invalidateQueries({ queryKey });
                }
            )
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    console.log(`[Realtime] Subscribed to ${table}`);
                }
            });

        return () => {
            console.log(`[Realtime] Unsubscribing from ${table}`);
            supabase.removeChannel(channel);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [table, stableQueryKey, options?.filterColumn, options?.filterValue, queryClient, enabled]);
}

/**
 * Hook to subscribe to multiple tables at once
 */
export function useMultiTableSubscription(
    tables: { table: TableName; queryKey: string[] }[]
) {
    const queryClient = useQueryClient();

    useEffect(() => {
        const channels = tables.map(({ table, queryKey }) => {
            const channelName = `multi_${table}_${queryKey.join('_')}`;

            return supabase
                .channel(channelName)
                .on(
                    'postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: table,
                    },
                    (payload) => {
                        console.log(`[Realtime Multi] ${table} change:`, payload.eventType);
                        queryClient.invalidateQueries({ queryKey });
                    }
                )
                .subscribe();
        });

        return () => {
            channels.forEach(channel => {
                supabase.removeChannel(channel);
            });
        };
    }, [tables.map(t => t.table).join(','), queryClient]);
}
