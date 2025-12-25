import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useDistributorProfile } from './useDistributorProfile';
import { useRealtimeSubscription } from './useRealtimeSubscription';
import { toast } from 'sonner';

export interface Packing {
    id: string;
    distributor_id: string;
    pck_number: number;
    pck_full_number?: string;
    pck_date: string;
    item_id: string;
    location_id: string;
    quantity: number;
    employee_id: string | null;
    remark: string | null;
    created_at: string;
    updated_at: string;
    created_by: string | null;
    // Joined data
    items?: { name: string; sku: string } | null;
    store_locations?: { store_name: string; location: string } | null;
    profiles?: { email: string } | null;
}

export interface PackingBatch {
    id?: string;
    packing_id?: string;
    location_id: string;
    batch_number: string;
    stock_quantity: number;
    quantity: number;
    // Display fields
    location_name?: string;
}

export interface CreatePackingData {
    pck_date: string;
    item_id: string;
    location_id: string;
    quantity: number;
    employee_id?: string | null;
    remark?: string | null;
    pck_number?: number;
    pck_full_number?: string;
    batches: Omit<PackingBatch, 'id' | 'packing_id' | 'location_name'>[];
}

export function usePacking({ page = 1, pageSize = 25, search = '' }: { page?: number; pageSize?: number; search?: string } = {}) {
    const queryClient = useQueryClient();
    const { profile, isLoading: isProfileLoading } = useDistributorProfile();

    // Fix: Only enable query if profile explicitly exists
    const isEnabled = !!profile?.id && !isProfileLoading;

    const queryKey = ['packing', profile?.id, page, pageSize, search];

    // Realtime subscription for automatic sync
    useRealtimeSubscription('packing', queryKey as string[], undefined, isEnabled);

    // Fetch all packing records with pagination and search
    const { data, isLoading, refetch } = useQuery({
        queryKey,
        queryFn: async () => {
            if (!profile?.id) return { data: [], count: 0 };

            let query = supabase
                .from('packing')
                .select(`
                    id,
                    pck_number,
                    pck_full_number,
                    pck_date,
                    quantity,
                    distributor_id,
                    items:item_id (name),
                    store_locations:location_id (store_name, location),
                    profiles:employee_id (email)
                `, { count: 'exact' });

            if (search) {
                query = query.ilike('pck_full_number', `%${search}%`);
            }

            const { data, error, count } = await query
                .eq('distributor_id', profile.id)
                .order('pck_date', { ascending: false })
                .range((page - 1) * pageSize, page * pageSize - 1);

            if (error) throw error;
            return { data: data as unknown as Packing[], count: count || 0 };
        },
        enabled: isEnabled,
        placeholderData: keepPreviousData,
    });

    // Fetch batches for a specific packing
    const fetchBatches = async (packingId: string): Promise<PackingBatch[]> => {
        const { data, error } = await supabase
            .from('packing_batches')
            .select(`
                *,
                store_locations:location_id (store_name, location)
            `)
            .eq('packing_id', packingId);

        if (error) throw error;

        return (data || []).map((batch: any) => ({
            ...batch,
            location_name: batch.store_locations
                ? `${batch.store_locations.store_name} - ${batch.store_locations.location}`
                : '',
        }));
    };

    // Create packing
    const createPacking = useMutation({
        mutationFn: async (data: CreatePackingData) => {
            if (!profile?.id) throw new Error('No distributor profile found');

            // Insert packing header
            const { data: packingData, error: packingError } = await supabase
                .from('packing')
                .insert([{
                    distributor_id: profile.id,
                    pck_prefix: 'PCK/',
                    pck_number: data.pck_number, // Use provided number
                    pck_full_number: data.pck_full_number, // Use provided full number
                    pck_date: data.pck_date,
                    item_id: data.item_id,
                    location_id: data.location_id,
                    quantity: data.quantity,
                    employee_id: data.employee_id || null,
                    remark: data.remark || null,
                    created_by: profile.user_id,
                }])
                .select()
                .single();

            if (packingError) throw packingError;

            // Insert batches if provided
            if (data.batches && data.batches.length > 0) {
                const batchesWithPackingId = data.batches.map(batch => ({
                    ...batch,
                    packing_id: packingData.id,
                }));

                const { error: batchError } = await supabase
                    .from('packing_batches')
                    .insert(batchesWithPackingId);

                if (batchError) throw batchError;
            }

            return packingData;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['packing'] });
            toast.success('Packing created successfully');
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to create packing');
        },
    });

    // Delete packing
    const deletePacking = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('packing')
                .delete()
                .eq('id', id);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['packing'] });
            toast.success('Packing deleted successfully');
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to delete packing');
        },
    });

    return {
        profile,
        packings: data?.data ?? [],
        totalCount: data?.count ?? 0,
        // Only show loading if query is enabled and loading, OR if profile is still loading
        isLoading: (isEnabled && isLoading) || isProfileLoading,
        refetch,
        fetchBatches,
        createPacking,
        deletePacking,
    };
}
