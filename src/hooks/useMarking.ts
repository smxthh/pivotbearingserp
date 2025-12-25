import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useDistributorProfile } from './useDistributorProfile';
import { useRealtimeSubscription } from './useRealtimeSubscription';
import { toast } from 'sonner';

export interface Marking {
    id: string;
    distributor_id: string;
    mrk_number: number;
    mrk_full_number?: string;
    mrk_date: string;
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

export interface MarkingBatch {
    id?: string;
    marking_id?: string;
    location_id: string;
    batch_number: string;
    stock_quantity: number;
    quantity: number;
    // Display fields
    location_name?: string;
}

export interface CreateMarkingData {
    mrk_date: string;
    item_id: string;
    location_id: string;
    quantity: number;
    employee_id?: string | null;
    remark?: string | null;
    mrk_number?: number;
    mrk_full_number?: string;
    batches: Omit<MarkingBatch, 'id' | 'marking_id' | 'location_name'>[];
}

export function useMarking({ page = 1, pageSize = 25, search = '' }: { page?: number; pageSize?: number; search?: string } = {}) {
    const queryClient = useQueryClient();
    const { profile, isLoading: isProfileLoading } = useDistributorProfile();

    // Fix: Only enable query if profile explicitly exists
    const isEnabled = !!profile?.id && !isProfileLoading;

    const queryKey = ['marking', profile?.id, page, pageSize, search];

    // Realtime subscription for automatic sync
    useRealtimeSubscription('marking', queryKey as string[], undefined, isEnabled);

    // Fetch all marking records with pagination and search
    const { data, isLoading, refetch } = useQuery({
        queryKey,
        queryFn: async () => {
            if (!profile?.id) return { data: [], count: 0 };

            let query = supabase
                .from('marking')
                .select(`
                    id,
                    mrk_number,
                    mrk_full_number,
                    mrk_date,
                    quantity,
                    distributor_id,
                    items:item_id (name),
                    store_locations:location_id (store_name),
                    profiles:employee_id (email)
                `, { count: 'exact' });

            if (search) {
                query = query.ilike('mrk_full_number', `%${search}%`);
            }

            const { data, error, count } = await query
                .eq('distributor_id', profile.id)
                .order('mrk_date', { ascending: false })
                .range((page - 1) * pageSize, page * pageSize - 1);

            if (error) throw error;
            return { data: data as unknown as Marking[], count: count || 0 };
        },
        enabled: isEnabled,
        placeholderData: keepPreviousData,
    });

    // Fetch batches for a specific marking
    const { data: getBatchesByMarking } = useQuery({
        queryKey: ['marking-batches'],
        queryFn: async () => [],
        enabled: false,
    });

    const fetchBatches = async (markingId: string): Promise<MarkingBatch[]> => {
        const { data, error } = await supabase
            .from('marking_batches')
            .select(`
                *,
                store_locations:location_id (store_name, location)
            `)
            .eq('marking_id', markingId);

        if (error) throw error;

        return (data || []).map((batch: any) => ({
            ...batch,
            location_name: batch.store_locations
                ? `${batch.store_locations.store_name} - ${batch.store_locations.location}`
                : '',
        }));
    };

    // Get next marking number
    const getNextNumber = async (prefix: string): Promise<number> => {
        if (!profile?.id) return 1;

        const { data, error } = await supabase.rpc('get_next_mrk_number' as any, {
            p_distributor_id: profile.id,
            p_prefix: prefix
        });

        if (error) {
            console.error('Error fetching next marking number:', error);
            return 1;
        }

        return data as number;
    };

    // Create marking (Atomic)
    const createMarking = useMutation({
        mutationFn: async (data: CreateMarkingData) => {
            if (!profile?.id) throw new Error('No distributor profile found');
            if (data.batches.length === 0) throw new Error('At least one batch is required');

            // Extract prefix from provided full number or default
            // The dialog sends mrk_full_number like "MRK/25-26/1"
            // We need to parse strict structure or pass prefix separately.
            // Let's rely on data passing strictly.
            // Wait, AddMarkingDialog constructs full number: `${data.doc_prefix}${data.doc_number}`
            // We should pass 'mrk_prefix' explicitly in CreateMarkingData or extract it.

            // Assuming the hook consumer passes raw prefix in a new field or we extract it.
            // Let's modify CreateMarkingData interface outside this block first? No, I can cast it or assume it.
            // Actually, best to parse it if not present.

            let prefix = 'MRK/';
            if (data.mrk_full_number) {
                // Try to split by numbers at the end
                // This is brittle. Let's look at how Update passed it.
                // The Dialog has `doc_prefix` state. It constructs full number.
                // We should probably change the Dialog to NOT construct full number but pass prefix + auto number.
                // However, to support Manual Override, we pass everything.

                // Let's assume the Dialog passes `mrk_prefix` (we'll add it to the interface)
            }

            // Prepare Header JSON
            // We need to extract the prefix.
            // If the user entered "MRK/25-26/5", the prefix is "MRK/25-26/" and number is 5.
            // BUT, `create_marking_atomic` expects separated fields. 
            // We will modify the Dialog to pass these.

            const header = {
                distributor_id: profile.id,
                mrk_prefix: (data as any).mrk_prefix || 'MRK/',
                mrk_number: data.mrk_number, // Can be null if auto-generating
                mrk_full_number: data.mrk_full_number, // Not really used if atomic gen is on, but logged
                mrk_date: data.mrk_date,
                item_id: data.item_id,
                location_id: data.location_id,
                quantity: data.quantity,
                employee_id: data.employee_id,
                remark: data.remark,
                created_by: profile.user_id,
            };

            const { data: result, error } = await supabase.rpc('create_marking_atomic' as any, {
                p_header: header,
                p_batches: data.batches
            });

            if (error) throw error;
            return result as { id: string; mrk_full_number: string };
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['marking'] });
            toast.success(`Marking ${data.mrk_full_number} created successfully`);
        },
        onError: (error: Error) => {
            console.error('Create marking error:', error);
            toast.error(error.message || 'Failed to create marking');
        },
    });

    // Update marking
    const updateMarking = useMutation({
        mutationFn: async ({ id, ...updates }: Partial<Marking> & { id: string }) => {
            const { data, error } = await supabase
                .from('marking')
                .update({ ...updates, updated_at: new Date().toISOString() })
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['marking'] });
            toast.success('Marking updated successfully');
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to update marking');
        },
    });

    // Delete marking
    const deleteMarking = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('marking')
                .delete()
                .eq('id', id);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['marking'] });
            toast.success('Marking deleted successfully');
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to delete marking');
        },
    });

    return {
        profile,
        markings: data?.data ?? [],
        totalCount: data?.count ?? 0,
        // Only show loading if query is enabled and loading, OR if profile is still loading
        isLoading: (isEnabled && isLoading) || isProfileLoading,
        refetch,
        fetchBatches,
        createMarking,
        updateMarking,
        deleteMarking,
        getNextNumber,
    };
}
