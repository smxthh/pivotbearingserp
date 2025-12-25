import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useDistributorId } from './useDistributorProfile';
import { useRealtimeSubscription } from './useRealtimeSubscription';
import { toast } from 'sonner';

// Types
export interface Brand {
    id: string;
    distributor_id: string;
    name: string;
    description?: string;
    logo_url?: string;
    is_active: boolean;
    sort_order: number;
    created_at: string;
    updated_at?: string;
}

export interface BrandInsert {
    name: string;
    description?: string;
    logo_url?: string;
}

export interface BrandUpdate {
    name?: string;
    description?: string;
    logo_url?: string;
    is_active?: boolean;
    sort_order?: number;
}

export function useBrands() {
    const queryClient = useQueryClient();
    const { data: distributorId } = useDistributorId();
    const isEnabled = !!distributorId;

    const queryKey = ['brands', distributorId];

    // Realtime subscription for automatic sync
    useRealtimeSubscription('brands', queryKey as string[], undefined, isEnabled);

    // Fetch brands - temporarily return empty array until migration runs
    const { data: brands = [], isLoading, error, refetch } = useQuery({
        queryKey,
        queryFn: async (): Promise<Brand[]> => {
            if (!distributorId) return [];

            // Try to fetch brands table, return empty if it doesn't exist
            try {
                const { data, error } = await (supabase as any)
                    .from('brands')
                    .select('*')
                    .eq('distributor_id', distributorId)
                    .order('sort_order', { ascending: true })
                    .order('name', { ascending: true });

                if (error) {
                    // Table doesn't exist yet, return empty
                    console.log('Brands table not available yet:', error.message);
                    return [];
                }

                return (data || []) as Brand[];
            } catch (e) {
                console.log('Brands table not available yet');
                return [];
            }
        },
        enabled: !!distributorId,
    });

    // Add brand mutation
    const addBrand = useMutation({
        mutationFn: async (brand: BrandInsert) => {
            if (!distributorId) throw new Error('Distributor ID not found');

            const { data, error } = await (supabase as any)
                .from('brands')
                .insert({
                    ...brand,
                    distributor_id: distributorId,
                })
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            toast.success('Brand added successfully');
            queryClient.invalidateQueries({ queryKey: ['brands'] });
        },
        onError: (error: Error) => {
            toast.error(`Failed to add brand: ${error.message}`);
        },
    });

    // Update brand mutation
    const updateBrand = useMutation({
        mutationFn: async ({ id, updates }: { id: string; updates: BrandUpdate }) => {
            const { data, error } = await (supabase as any)
                .from('brands')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            toast.success('Brand updated successfully');
            queryClient.invalidateQueries({ queryKey: ['brands'] });
        },
        onError: (error: Error) => {
            toast.error(`Failed to update brand: ${error.message}`);
        },
    });

    // Delete brand mutation (soft delete)
    const deleteBrand = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await (supabase as any)
                .from('brands')
                .update({ is_active: false })
                .eq('id', id);

            if (error) throw error;
        },
        onSuccess: () => {
            toast.success('Brand deleted successfully');
            queryClient.invalidateQueries({ queryKey: ['brands'] });
        },
        onError: (error: Error) => {
            toast.error(`Failed to delete brand: ${error.message}`);
        },
    });

    return {
        brands,
        isLoading,
        error,
        refetch,
        addBrand,
        updateBrand,
        deleteBrand,
        isAdding: addBrand.isPending,
        isUpdating: updateBrand.isPending,
        isDeleting: deleteBrand.isPending,
    };
}

// Hook for brand dropdown options
export function useBrandDropdown() {
    const { brands, isLoading } = useBrands();

    const options = brands.map((brand) => ({
        value: brand.id,
        label: brand.name,
    }));

    return { options, isLoading };
}
