import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useRealtimeSubscription } from './useRealtimeSubscription';
import { useDistributorId } from './useDistributorProfile';
import { toast } from 'sonner';

// ============================================
// TYPES
// ============================================

export interface LedgerGroup {
    id: string;
    distributor_id: string | null;
    name: string;
    parent_group_id: string | null;
    nature: 'assets' | 'liabilities' | 'income' | 'expenses' | 'capital';
    is_system: boolean;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface Ledger {
    id: string;
    distributor_id: string;
    name: string;
    group_id: string | null;
    group_name: string;
    party_id: string | null;
    opening_balance: number;
    opening_balance_type: 'Dr' | 'Cr';
    current_balance?: number; // Added for new accounting schema (optional for backward compatibility)
    closing_balance: number;
    description: string | null;
    is_system: boolean;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    // Joined fields
    party?: {
        id: string;
        name: string;
    };
    group?: LedgerGroup;
}

export interface LedgerInsert {
    name: string;
    group_id?: string | null;
    group_name: string;
    party_id?: string | null;
    opening_balance?: number;
    opening_balance_type?: 'Dr' | 'Cr';
    description?: string | null;
}

export interface LedgerUpdate {
    name?: string;
    group_id?: string | null;
    group_name?: string;
    party_id?: string | null;
    opening_balance?: number;
    opening_balance_type?: 'Dr' | 'Cr';
    closing_balance?: number;
    description?: string | null;
    is_active?: boolean;
}

export interface LedgerTransaction {
    id: string;
    distributor_id: string;
    voucher_id: string | null;
    ledger_id: string;
    transaction_date: string;
    debit_amount: number;
    credit_amount: number;
    narration: string | null;
    created_at: string;
    // Joined fields
    voucher?: {
        id: string;
        voucher_type: string;
        voucher_number: string;
        party_name: string | null;
    };
}

export interface OpeningBalanceUpdate {
    ledger_id: string;
    opening_balance: number;
    opening_balance_type: 'Dr' | 'Cr';
}

// ============================================
// HOOK: useLedgerGroups
// ============================================

export function useLedgerGroups() {
    const { user } = useAuth();
    const queryKey = ['ledger-groups'];

    // Real-time subscription
    useRealtimeSubscription('ledger_groups', queryKey);

    const { data: groups = [], isLoading, error, refetch } = useQuery({
        queryKey,
        queryFn: async () => {
            const { data, error } = await supabase
                .from('ledger_groups')
                .select('*')
                .order('name', { ascending: true });

            if (error) {
                console.error('Error fetching ledger groups:', error);
                throw error;
            }

            return data as LedgerGroup[];
        },
        enabled: !!user,
    });

    return {
        groups,
        isLoading,
        error,
        refetch,
    };
}

// ============================================
// HOOK: useLedgers
// ============================================

interface UseLedgersOptions {
    groupName?: string;
    isActive?: boolean;
    realtime?: boolean;
}

export function useLedgers(options: UseLedgersOptions = { realtime: true }) {
    const { user } = useAuth();
    const { data: distributorId } = useDistributorId();
    const queryClient = useQueryClient();
    const queryKey = ['ledgers', options.groupName || 'all', options.isActive?.toString() || 'all'];

    // Real-time subscription (always called, enable parameter controls subscription)
    useRealtimeSubscription(
        options.realtime !== false ? 'ledgers' : '',
        queryKey,
        undefined,
        options.realtime !== false
    );

    // Fetch all ledgers
    const {
        data: ledgers = [],
        isLoading,
        error,
        refetch,
    } = useQuery({
        queryKey,
        queryFn: async () => {
            let query = supabase
                .from('ledgers')
                .select(`
          *,
          group:ledger_groups!group_id(id, name, nature)
        `)
                .order('name', { ascending: true });

            // Note: group_name doesn't exist in new schema, we join to ledger_groups
            // If filtering by group name is needed, we'll do it client-side

            if (options.isActive !== undefined) {
                query = query.eq('is_system', options.isActive);
            }

            const { data, error } = await query;

            if (error) {
                console.error('Error fetching ledgers:', error);
                throw error;
            }

            // Map to expected format with group_name
            const mappedData = (data || []).map((ledger: any) => ({
                ...ledger,
                group_name: ledger.group?.name || 'Uncategorized',
                distributor_id: ledger.tenant_id, // For backward compatibility
            }));

            // Client-side filter by group name if specified
            if (options.groupName) {
                return mappedData.filter((l: any) => l.group_name === options.groupName);
            }

            return mappedData as unknown as Ledger[];
        },
        enabled: !!user,
    });

    // Get ledger by ID with transactions
    const getLedgerById = async (id: string): Promise<Ledger | null> => {
        const { data, error } = await supabase
            .from('ledgers')
            .select(`
        *,
        party:parties(id, name),
        group:ledger_groups(id, name, nature)
      `)
            .eq('id', id)
            .single();

        if (error) {
            console.error('Error fetching ledger:', error);
            return null;
        }

        return data as unknown as Ledger;
    };

    // Get ledger transactions
    const getLedgerTransactions = async (ledgerId: string): Promise<LedgerTransaction[]> => {
        // Cast to any to avoid "excessively deep type instantiation" error with complex select
        const client: any = supabase;
        const { data, error } = await client
            .from('ledger_entries')
            .select(`
                id,
                distributor_id:tenant_id,
                voucher_id:transaction_id,
                ledger_id,
                transaction_date:entry_date,
                debit_amount:debit,
                credit_amount:credit,
                narration:description,
                created_at,
                voucher:vouchers!transaction_id(id, voucher_type, voucher_number, party_name)
            `)
            .eq('ledger_id', ledgerId)
            .order('entry_date', { ascending: false })
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching ledger transactions:', error);
            return [];
        }

        return data as unknown as LedgerTransaction[];
    };

    // Add ledger mutation
    const addLedger = useMutation({
        mutationFn: async (ledger: LedgerInsert) => {
            if (!distributorId) throw new Error('Distributor ID not found');

            const { data, error } = await supabase
                .from('ledgers')
                .insert({
                    ...ledger,
                    tenant_id: distributorId,
                    current_balance: ledger.opening_balance || 0,
                } as any) // Type assertion needed until types are regenerated
                .select()
                .single();

            if (error) {
                console.error('Error adding ledger:', error);
                throw error;
            }

            return data as Ledger;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['ledgers'] });
            toast.success(`${data.name} added successfully`);
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to add ledger');
        },
    });

    // Update ledger mutation
    const updateLedger = useMutation({
        mutationFn: async ({ id, updates }: { id: string; updates: LedgerUpdate }) => {
            const { data, error } = await supabase
                .from('ledgers')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) {
                console.error('Error updating ledger:', error);
                throw error;
            }

            return data as Ledger;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['ledgers'] });
            toast.success(`${data.name} updated successfully`);
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to update ledger');
        },
    });

    // Bulk update opening balances
    const updateOpeningBalances = useMutation({
        mutationFn: async (updates: OpeningBalanceUpdate[]) => {
            const results = [];

            for (const update of updates) {
                const { data, error } = await supabase
                    .from('ledgers')
                    .update({
                        opening_balance: update.opening_balance,
                        opening_balance_type: update.opening_balance_type,
                    })
                    .eq('id', update.ledger_id)
                    .select()
                    .single();

                if (error) {
                    console.error('Error updating opening balance:', error);
                    throw error;
                }

                results.push(data);
            }

            return results;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['ledgers'] });
            toast.success('Opening balances updated successfully');
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to update opening balances');
        },
    });

    // Delete ledger (soft delete)
    const deleteLedger = useMutation({
        mutationFn: async (id: string) => {
            const { data, error } = await supabase
                .from('ledgers')
                .update({ is_active: false })
                .eq('id', id)
                .select()
                .single();

            if (error) {
                console.error('Error deleting ledger:', error);
                throw error;
            }

            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['ledgers'] });
            toast.success('Ledger deleted successfully');
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to delete ledger');
        },
    });

    // Toggle ledger active status
    const toggleActive = useMutation({
        mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
            const { data, error } = await supabase
                .from('ledgers')
                .update({ is_active: isActive })
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return data as Ledger;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['ledgers'] });
            toast.success(`${data.name} ${data.is_active ? 'activated' : 'deactivated'}`);
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to update status');
        },
    });

    // Computed values
    const activeLedgers = ledgers.filter(l => l.is_active);
    const debtorLedgers = ledgers.filter(l => l.group_name === 'Sundry Debtors');
    const creditorLedgers = ledgers.filter(l => l.group_name === 'Sundry Creditors');

    // Summary calculations
    const totalDebitBalance = activeLedgers
        .filter(l => l.closing_balance > 0)
        .reduce((sum, l) => sum + l.closing_balance, 0);

    const totalCreditBalance = activeLedgers
        .filter(l => l.closing_balance < 0)
        .reduce((sum, l) => sum + Math.abs(l.closing_balance), 0);

    return {
        // Data
        ledgers,
        activeLedgers,
        debtorLedgers,
        creditorLedgers,

        // Summary
        totalDebitBalance,
        totalCreditBalance,

        // Status
        isLoading,
        error,

        // Actions
        refetch,
        getLedgerById,
        getLedgerTransactions,
        addLedger,
        updateLedger,
        updateOpeningBalances,
        deleteLedger,
        toggleActive,

        // Mutation states
        isAdding: addLedger.isPending,
        isUpdating: updateLedger.isPending,
        isDeleting: deleteLedger.isPending,
    };
}

// ============================================
// HOOK: useLedger (Single ledger with transactions)
// ============================================

export function useLedger(id: string | undefined) {
    const { user } = useAuth();

    // Real-time subscription for transactions
    useRealtimeSubscription('ledger_transactions', ['ledger', id, 'transactions']);

    const ledgerQuery = useQuery({
        queryKey: ['ledger', id],
        queryFn: async () => {
            if (!id) return null;

            const { data, error } = await supabase
                .from('ledgers')
                .select(`
          *,
          party:parties(id, name),
          group:ledger_groups(id, name, nature)
        `)
                .eq('id', id)
                .single();

            if (error) {
                console.error('Error fetching ledger:', error);
                throw error;
            }

            return data as unknown as Ledger;
        },
        enabled: !!user && !!id,
    });

    const transactionsQuery = useQuery({
        queryKey: ['ledger', id, 'transactions'],
        queryFn: async () => {
            if (!id) return [];

            const client: any = supabase;
            const { data, error } = await client
                .from('ledger_entries')
                .select(`
                    id,
                    distributor_id:tenant_id,
                    voucher_id:transaction_id,
                    ledger_id,
                    transaction_date:entry_date,
                    debit_amount:debit,
                    credit_amount:credit,
                    narration:description,
                    created_at,
                    voucher:vouchers!transaction_id(id, voucher_type, voucher_number, party_name)
                `)
                .eq('ledger_id', id)
                .order('entry_date', { ascending: false })
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching transactions:', error);
                throw error;
            }

            return data as unknown as LedgerTransaction[];
        },
        enabled: !!user && !!id,
    });

    return {
        ledger: ledgerQuery.data,
        transactions: transactionsQuery.data || [],
        isLoading: ledgerQuery.isLoading || transactionsQuery.isLoading,
        error: ledgerQuery.error || transactionsQuery.error,
    };
}
