import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useDistributorProfile } from './useDistributorProfile';
import { useRealtimeSubscription } from './useRealtimeSubscription';
import { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';
import { toast } from 'sonner';

export type GateInward = Tables<'gate_inwards'> & {
    parties?: { name: string } | null;
    purchase_orders?: { po_number: number } | null;
    gate_inward_items?: {
        item_id: string;
        quantity: number;
        items?: { name: string; sku: string } | null;
    }[];
};
export type GateInwardInsert = TablesInsert<'gate_inwards'>;
export type GateInwardUpdate = TablesUpdate<'gate_inwards'>;

export type GateInwardItem = Tables<'gate_inward_items'> & {
    items?: { name: string; sku: string } | null;
    location?: { store_name: string; location: string } | null;
};
export type GateInwardItemInsert = TablesInsert<'gate_inward_items'>;
export type GateInwardItemUpdate = TablesUpdate<'gate_inward_items'>;

export function useGateInward(id?: string) {
    const queryClient = useQueryClient();
    const { profile, isLoading: isProfileLoading } = useDistributorProfile();
    const isEnabled = !!profile?.id && !isProfileLoading && !id;

    const queryKey = ['gate-inwards', profile?.id];

    // Realtime subscription for automatic sync
    useRealtimeSubscription('gate_inwards', queryKey as string[], undefined, isEnabled);

    const { data: gateInwards = [], isLoading, refetch } = useQuery({
        queryKey,
        queryFn: async () => {
            if (!profile?.id) return [];

            const { data, error } = await supabase
                .from('gate_inwards')
                .select(`
                    *,
                    parties:party_id (name),
                    purchase_orders:purchase_order_id (po_number),
                    gate_inward_items (
                        item_id,
                        quantity,
                        items:item_id (name, sku)
                    )
                `)
                .eq('distributor_id', profile.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data as unknown as GateInward[];
        },
        enabled: isEnabled,
    });

    const { data: gateInward, isLoading: isDetailsLoading } = useQuery({
        queryKey: ['gate-inward', id],
        queryFn: async () => {
            if (!id) return null;
            const { data, error } = await supabase
                .from('gate_inwards')
                .select(`
                    *,
                    parties:party_id (name),
                    purchase_orders:purchase_order_id (po_number)
                `)
                .eq('id', id)
                .single();

            if (error) throw error;
            return data as unknown as GateInward;
        },
        enabled: !!id,
    });

    const { data: gateInwardItems = [], isLoading: isItemsLoading } = useQuery({
        queryKey: ['gate-inward-items', id],
        queryFn: async () => {
            if (!id) return [];
            const { data, error } = await supabase
                .from('gate_inward_items')
                .select(`
                    *,
                    items:item_id (name, sku),
                    store_locations:location_id (store_name, location)
                `)
                .eq('gate_inward_id', id);

            if (error) throw error;
            return data as unknown as GateInwardItem[];
        },
        enabled: !!id,
    });

    const createGateInward = useMutation({
        mutationFn: async (data: Omit<GateInwardInsert, 'distributor_id' | 'created_by'>) => {
            if (!profile?.id) throw new Error('No distributor profile found');

            const { data: inserted, error } = await supabase
                .from('gate_inwards')
                .insert([{
                    ...data,
                    distributor_id: profile.id,
                    created_by: profile.user_id
                }])
                .select()
                .single();

            if (error) throw error;
            return inserted;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['gate-inwards'] });
            toast.success('Gate Inward created successfully');
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to create Gate Inward');
        }
    });

    // Atomic RPC: Creates header + items in a single database transaction
    const createGateInwardAtomic = useMutation({
        mutationFn: async (params: { header: Omit<GateInwardInsert, 'distributor_id' | 'created_by'>; items: GateInwardItemInsert[] }) => {
            if (!profile?.id) throw new Error('No distributor profile found');

            const headerData = {
                ...params.header,
                distributor_id: profile.id,
            };

            const { data, error } = await (supabase.rpc as any)('create_gate_inward_atomic', {
                p_header: headerData,
                p_items: params.items
            });

            if (error) throw error;
            return data as { id: string; gi_number: string; items_count: number };
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['gate-inwards'] });
            toast.success(`Gate Inward ${data.gi_number} created successfully`);
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to create Gate Inward');
        }
    });

    const updateGateInward = useMutation({
        mutationFn: async ({ id, ...updates }: GateInwardUpdate & { id: string }) => {
            const { data, error } = await supabase
                .from('gate_inwards')
                .update({ ...updates, updated_at: new Date().toISOString() })
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['gate-inwards'] });
            queryClient.invalidateQueries({ queryKey: ['gate-inward', id] });
            toast.success('Gate Inward updated successfully');
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to update Gate Inward');
        }
    });

    const deleteGateInward = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('gate_inwards')
                .delete()
                .eq('id', id);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['gate-inwards'] });
            toast.success('Gate Inward deleted successfully');
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to delete Gate Inward');
        }
    });

    // Items Mutations
    const createItem = useMutation({
        mutationFn: async (item: GateInwardItemInsert) => {
            const { data, error } = await supabase
                .from('gate_inward_items')
                .insert([item])
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['gate-inward-items', id] });
            toast.success('Item added successfully');
        },
    });

    const deleteItem = useMutation({
        mutationFn: async (itemId: string) => {
            const { error } = await supabase
                .from('gate_inward_items')
                .delete()
                .eq('id', itemId);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['gate-inward-items', id] });
            toast.success('Item removed successfully');
        },
    });

    const getNextGINumber = async (prefix: string): Promise<number> => {
        if (!profile?.id) return 1;

        const { data, error } = await (supabase.rpc as any)('get_next_gi_number_preview', {
            p_distributor_id: profile.id,
            p_prefix: prefix,
        });

        if (error) {
            console.error('Error fetching next GI number:', error);
            // Fallback
            return 1;
        }

        return data as number;
    };

    return {
        gateInwards,
        gateInward,
        gateInwardItems,
        isLoading: isLoading || isProfileLoading || isDetailsLoading || isItemsLoading,
        refetch,
        createGateInward,
        createGateInwardAtomic, // Atomic transaction-safe creation
        updateGateInward,
        deleteGateInward,
        createItem,
        deleteItem,
        getNextGINumber // Preview function
    };
}
