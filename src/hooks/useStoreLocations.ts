import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useDistributorProfile } from './useDistributorProfile';
import { toast } from 'sonner';

import { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

export interface StoreLocation {
    id: string;
    distributor_id: string;
    store_name: string;
    location: string;
    store_level: number;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    is_final_location: boolean;
    parent_store_id?: string | null;
    remark?: string | null;
}

export type CreateStoreLocation = Omit<StoreLocation, 'id' | 'created_at' | 'updated_at' | 'is_active'> & { is_active?: boolean };
export type UpdateStoreLocation = Partial<CreateStoreLocation>;

export function useStoreLocations() {
    const queryClient = useQueryClient();
    const { profile, isLoading: isProfileLoading } = useDistributorProfile();

    const { data: storeLocations = [], isLoading, error, refetch } = useQuery({
        queryKey: ['store-locations', profile?.id],
        queryFn: async () => {
            if (!profile?.id) return [];

            const { data, error } = await supabase
                .from('store_locations')
                .select('*')
                .eq('distributor_id', profile.id)
                .order('store_level', { ascending: true });

            if (error) throw error;
            return data as StoreLocation[];
        },
        enabled: !!profile?.id && !isProfileLoading,
    });

    const createLocation = useMutation({
        mutationFn: async (location: Omit<CreateStoreLocation, 'distributor_id'>) => {
            if (!profile?.id) throw new Error('No distributor profile found');

            const { data, error } = await supabase
                .from('store_locations')
                .insert([{ ...location, distributor_id: profile.id }])
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['store-locations'] });
            toast.success('Store location created successfully');
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to create store location');
        },
    });

    const updateLocation = useMutation({
        mutationFn: async ({ id, ...updates }: UpdateStoreLocation & { id: string }) => {
            const { data, error } = await supabase
                .from('store_locations')
                .update({ ...updates, updated_at: new Date().toISOString() })
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['store-locations'] });
            toast.success('Store location updated successfully');
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to update store location');
        },
    });

    const deleteLocation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('store_locations')
                .delete()
                .eq('id', id);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['store-locations'] });
            toast.success('Store location deleted successfully');
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to delete store location');
        },
    });

    return {
        storeLocations,
        isLoading: isLoading || isProfileLoading,
        error,
        refetch,
        createLocation,
        updateLocation,
        deleteLocation,
        isCreating: createLocation.isPending,
        isUpdating: updateLocation.isPending,
        isDeleting: deleteLocation.isPending,
    };
}
