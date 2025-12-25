import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useDistributorProfile } from './useDistributorProfile';
import { useRealtimeSubscription } from './useRealtimeSubscription';
import { toast } from 'sonner';

export interface OpeningStock {
    id: string;
    distributor_id: string;
    item_id: string;
    location_id: string;
    batch_number: string | null;
    quantity: number;
    cost_price: number | null;
    created_at: string;
    updated_at: string;
    created_by: string | null;
    // Joined data
    items?: { name: string; sku: string } | null;
    store_locations?: { store_name: string; location: string } | null;
}

export interface CreateOpeningStockData {
    item_id: string;
    location_id: string;
    batch_number?: string | null;
    quantity: number;
    cost_price?: number | null;
}

export function useOpeningStock({ page = 1, pageSize = 25, search = '' }: { page?: number; pageSize?: number; search?: string } = {}) {
    const queryClient = useQueryClient();
    const { profile, isLoading: isProfileLoading } = useDistributorProfile();

    const isEnabled = !!profile?.id && !isProfileLoading;

    const queryKey = ['opening_stock', profile?.id, page, pageSize, search];

    // Realtime subscription for automatic sync
    useRealtimeSubscription('opening_stock', queryKey as string[], undefined, isEnabled);

    // Fetch all opening stock records with pagination and search
    const { data, isLoading, refetch } = useQuery({
        queryKey,
        queryFn: async () => {
            if (!profile?.id) return { data: [], count: 0 };

            let query = supabase
                .from('opening_stock')
                .select(`
                    id,
                    item_id,
                    location_id,
                    batch_number,
                    quantity,
                    cost_price,
                    distributor_id,
                    items:item_id (name, sku),
                    store_locations:location_id (store_name, location)
                `, { count: 'exact' });

            if (search) {
                query = query.or(`batch_number.ilike.%${search}%,items.name.ilike.%${search}%`);
            }

            const { data, error, count } = await query
                .eq('distributor_id', profile.id)
                .order('created_at', { ascending: false })
                .range((page - 1) * pageSize, page * pageSize - 1);

            if (error) throw error;
            return { data: data as unknown as OpeningStock[], count: count || 0 };
        },
        enabled: isEnabled,
        placeholderData: keepPreviousData,
    });

    // Create opening stock
    const createOpeningStock = useMutation({
        mutationFn: async (formData: CreateOpeningStockData) => {
            if (!profile?.id) throw new Error('No distributor profile found');

            const { data, error } = await supabase
                .from('opening_stock')
                .insert([{
                    distributor_id: profile.id,
                    item_id: formData.item_id,
                    location_id: formData.location_id,
                    batch_number: formData.batch_number || null,
                    quantity: formData.quantity,
                    cost_price: formData.cost_price || 0,
                    created_by: profile.user_id,
                }])
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['opening_stock'] });
            toast.success('Opening stock added successfully');
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to add opening stock');
        },
    });

    // Update opening stock
    const updateOpeningStock = useMutation({
        mutationFn: async ({ id, ...updates }: Partial<OpeningStock> & { id: string }) => {
            const { data, error } = await supabase
                .from('opening_stock')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['opening_stock'] });
            toast.success('Opening stock updated successfully');
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to update opening stock');
        },
    });

    // Delete opening stock
    const deleteOpeningStock = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('opening_stock')
                .delete()
                .eq('id', id);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['opening_stock'] });
            toast.success('Opening stock deleted successfully');
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to delete opening stock');
        },
    });

    return {
        profile,
        openingStocks: data?.data ?? [],
        totalCount: data?.count ?? 0,
        isLoading: (isEnabled && isLoading) || isProfileLoading,
        refetch,
        createOpeningStock,
        updateOpeningStock,
        deleteOpeningStock,
    };
}
