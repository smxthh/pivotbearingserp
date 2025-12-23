import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useDistributorProfile } from './useDistributorProfile';
import { toast } from 'sonner';

export interface HsnMaster {
    id: string;
    distributor_id: string;
    hsn_code: string;
    gst_percent: number | null;
    description: string | null;
    is_active: boolean | null;
    created_at: string | null;
    updated_at: string | null;
}

export interface CreateHsnData {
    hsn_code: string;
    gst_percent?: number;
    description?: string;
}

interface UseHsnMasterOptions {
    page?: number;
    pageSize?: number;
    search?: string;
}

export function useHsnMaster(options: UseHsnMasterOptions = {}) {
    const { page = 1, pageSize = 25, search = '' } = options;
    const queryClient = useQueryClient();
    const { profile, isLoading: isProfileLoading } = useDistributorProfile();
    const isEnabled = !!profile?.id && !isProfileLoading;

    const { data, isLoading, refetch } = useQuery({
        queryKey: ['hsn_master', profile?.id, page, pageSize, search],
        queryFn: async () => {
            if (!profile?.id) return { data: [], count: 0 };

            let query = supabase
                .from('hsn_master')
                .select('*', { count: 'exact' })
                .eq('distributor_id', profile.id)
                .order('created_at', { ascending: false });

            if (search) {
                query = query.or(`hsn_code.ilike.%${search}%,description.ilike.%${search}%`);
            }

            const from = (page - 1) * pageSize;
            const to = from + pageSize - 1;
            query = query.range(from, to);

            const { data, error, count } = await query;
            if (error) throw error;
            return { data: data as HsnMaster[], count: count || 0 };
        },
        enabled: isEnabled,
        placeholderData: keepPreviousData,
    });

    const createHsn = useMutation({
        mutationFn: async (formData: CreateHsnData) => {
            if (!profile?.id) throw new Error('No distributor profile');

            const { data, error } = await supabase
                .from('hsn_master')
                .insert([{
                    distributor_id: profile.id,
                    hsn_code: formData.hsn_code,
                    gst_percent: formData.gst_percent || 0,
                    description: formData.description || null,
                }])
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['hsn_master'] });
            toast.success('HSN created successfully');
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to create HSN');
        },
    });

    const deleteHsn = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('hsn_master')
                .delete()
                .eq('id', id);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['hsn_master'] });
            toast.success('HSN deleted successfully');
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to delete HSN');
        },
    });

    return {
        hsnList: data?.data || [],
        totalCount: data?.count || 0,
        isLoading: isLoading || isProfileLoading,
        refetch,
        createHsn,
        deleteHsn,
        profile,
    };
}
