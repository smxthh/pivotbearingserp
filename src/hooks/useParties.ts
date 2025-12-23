import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useRealtimeSubscription } from './useRealtimeSubscription';
import { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';
import { toast } from 'sonner';

export type Party = Tables<'parties'>;
export type PartyInsert = TablesInsert<'parties'>;
export type PartyUpdate = TablesUpdate<'parties'>;
export type PartyType = 'customer' | 'supplier' | 'both';

interface UsePartiesOptions {
    /** Filter by party type */
    type?: PartyType;
    /** Filter by active status */
    isActive?: boolean;
    /** Enable real-time subscription */
    realtime?: boolean;
}

/**
 * Hook for managing parties (customers/suppliers)
 * Provides CRUD operations with real-time sync
 */
export function useParties(options: UsePartiesOptions = { realtime: true }) {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const queryKey = ['parties', options.type || 'all', options.isActive?.toString() || 'all'];

    // Real-time subscription
    if (options.realtime !== false) {
        useRealtimeSubscription('parties', queryKey);
    }

    // Fetch all parties
    const {
        data: parties = [],
        isLoading,
        error,
        refetch,
    } = useQuery({
        queryKey,
        queryFn: async () => {
            let query = supabase
                .from('parties')
                .select('*')
                .order('name', { ascending: true });

            if (options.type) {
                query = query.eq('type', options.type);
            }

            if (options.isActive !== undefined) {
                query = query.eq('is_active', options.isActive);
            }

            const { data, error } = await query;

            if (error) {
                console.error('Error fetching parties:', error);
                throw error;
            }

            return data as Party[];
        },
        enabled: !!user,
        staleTime: 30000, // Consider data fresh for 30 seconds
    });

    // Get single party by ID
    const getPartyById = async (id: string): Promise<Party | null> => {
        const { data, error } = await supabase
            .from('parties')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            console.error('Error fetching party:', error);
            return null;
        }

        return data as Party;
    };

    // Add party mutation with auto-ledger creation
    const addParty = useMutation({
        mutationFn: async (party: Omit<PartyInsert, 'id' | 'created_at' | 'updated_at'>) => {
            // First, create the party
            const { data: partyData, error: partyError } = await supabase
                .from('parties')
                .insert({
                    ...party,
                    current_balance: party.opening_balance || 0,
                    created_by: user?.id,
                })
                .select()
                .single();

            if (partyError) {
                console.error('Error adding party:', partyError);
                throw partyError;
            }

            // Auto-create corresponding ledger account
            const groupName = party.type === 'supplier' ? 'Sundry Creditors' : 'Sundry Debtors';
            const openingBalanceType = party.type === 'supplier' ? 'Cr' : 'Dr';
            
            const { error: ledgerError } = await supabase
                .from('ledgers')
                .insert({
                    distributor_id: party.distributor_id,
                    name: partyData.name,
                    group_name: groupName,
                    party_id: partyData.id,
                    opening_balance: party.opening_balance || 0,
                    opening_balance_type: openingBalanceType,
                    closing_balance: party.opening_balance || 0,
                    is_system: false,
                    is_active: true,
                });

            if (ledgerError) {
                console.error('Error creating ledger for party:', ledgerError);
                // Don't throw - party was created successfully, ledger is secondary
                toast.error('Party created but ledger creation failed');
            }

            return partyData as Party;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['parties'] });
            queryClient.invalidateQueries({ queryKey: ['ledgers'] });
            toast.success(`${data.name} added successfully`);
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to add party');
        },
    });

    // Update party mutation
    const updateParty = useMutation({
        mutationFn: async ({ id, updates }: { id: string; updates: PartyUpdate }) => {
            const { data, error } = await supabase
                .from('parties')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) {
                console.error('Error updating party:', error);
                throw error;
            }

            return data as Party;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['parties'] });
            toast.success(`${data.name} updated successfully`);
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to update party');
        },
    });

    // Delete party mutation
    const deleteParty = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('parties')
                .delete()
                .eq('id', id);

            if (error) {
                console.error('Error deleting party:', error);
                throw error;
            }

            return id;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['parties'] });
            toast.success('Party deleted successfully');
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to delete party');
        },
    });

    // Toggle party active status
    const toggleActive = useMutation({
        mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
            const { data, error } = await supabase
                .from('parties')
                .update({ is_active: isActive })
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return data as Party;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['parties'] });
            toast.success(`${data.name} ${data.is_active ? 'activated' : 'deactivated'}`);
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to update status');
        },
    });

    // Computed values
    const customers = parties.filter(p => p.type === 'customer' || p.type === 'both');
    const suppliers = parties.filter(p => p.type === 'supplier' || p.type === 'both');
    const activeParties = parties.filter(p => p.is_active);

    return {
        // Data
        parties,
        customers,
        suppliers,
        activeParties,

        // Status
        isLoading,
        error,

        // Actions
        refetch,
        getPartyById,
        addParty,
        updateParty,
        deleteParty,
        toggleActive,

        // Mutation states
        isAdding: addParty.isPending,
        isUpdating: updateParty.isPending,
        isDeleting: deleteParty.isPending,
    };
}

/**
 * Hook to get a single party by ID with caching
 */
export function useParty(id: string | undefined) {
    const { user } = useAuth();

    return useQuery({
        queryKey: ['party', id],
        queryFn: async () => {
            if (!id) return null;

            const { data, error } = await supabase
                .from('parties')
                .select('*')
                .eq('id', id)
                .single();

            if (error) {
                console.error('Error fetching party:', error);
                throw error;
            }

            return data as Party;
        },
        enabled: !!user && !!id,
    });
}
