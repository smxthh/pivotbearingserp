import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useDistributorProfile } from './useDistributorProfile';
import { toast } from 'sonner';

export interface Transport {
    id: string;
    distributor_id: string;
    transport_name: string;
    transport_id: string;
    address: string | null;
    is_active: boolean | null;
    created_at: string | null;
    updated_at: string | null;
}

export interface CreateTransportData {
    transport_name: string;
    transport_id: string;
    address?: string;
}

interface UseTransportsOptions {
    page?: number;
    pageSize?: number;
    search?: string;
}

export function useTransports(options: UseTransportsOptions = {}) {
    const { page = 1, pageSize = 25, search = '' } = options;
    const queryClient = useQueryClient();
    const { profile, isLoading: isProfileLoading } = useDistributorProfile();
    const isEnabled = !!profile?.id && !isProfileLoading;

    const { data, isLoading, refetch } = useQuery({
        queryKey: ['transports', profile?.id, page, pageSize, search],
        queryFn: async () => {
            if (!profile?.id) return { data: [], count: 0 };

            let query = supabase
                .from('transports')
                .select('*', { count: 'exact' })
                .eq('distributor_id', profile.id)
                .order('created_at', { ascending: false });

            if (search) {
                query = query.or(`transport_name.ilike.%${search}%,transport_id.ilike.%${search}%,address.ilike.%${search}%`);
            }

            const from = (page - 1) * pageSize;
            const to = from + pageSize - 1;
            query = query.range(from, to);

            const { data, error, count } = await query;
            if (error) throw error;
            return { data: data as Transport[], count: count || 0 };
        },
        enabled: isEnabled,
        placeholderData: keepPreviousData,
    });

    const createTransport = useMutation({
        mutationFn: async (formData: CreateTransportData) => {
            if (!profile?.id) throw new Error('No distributor profile');

            const { data, error } = await supabase
                .from('transports')
                .insert([{
                    distributor_id: profile.id,
                    transport_name: formData.transport_name,
                    transport_id: formData.transport_id,
                    address: formData.address || null,
                }])
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['transports'] });
            toast.success('Transport created successfully');
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to create transport');
        },
    });

    const deleteTransport = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('transports')
                .delete()
                .eq('id', id);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['transports'] });
            toast.success('Transport deleted successfully');
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to delete transport');
        },
    });

    const updateTransport = useMutation({
        mutationFn: async (formData: CreateTransportData & { id: string }) => {
            const { id, ...updateData } = formData;
            const { data, error } = await supabase
                .from('transports')
                .update({
                    transport_name: updateData.transport_name,
                    transport_id: updateData.transport_id,
                    address: updateData.address || null,
                })
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['transports'] });
            toast.success('Transport updated successfully');
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to update transport');
        },
    });

    return {
        transports: data?.data || [],
        totalCount: data?.count || 0,
        isLoading: isLoading || isProfileLoading,
        refetch,
        createTransport,
        updateTransport,
        deleteTransport,
        profile,
    };
}
