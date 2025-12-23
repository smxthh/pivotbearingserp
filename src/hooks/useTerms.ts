import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useDistributorProfile } from './useDistributorProfile';
import { toast } from 'sonner';

export interface Term {
    id: string;
    distributor_id: string;
    title: string;
    conditions: string;
    type: string | null;
    is_default: boolean | null;
    is_active: boolean | null;
    created_at: string | null;
    updated_at: string | null;
}

export interface CreateTermData {
    title: string;
    conditions: string;
    type?: string | null;
    is_default?: boolean;
}

interface UseTermsOptions {
    page?: number;
    pageSize?: number;
    search?: string;
}

export function useTerms(options: UseTermsOptions = {}) {
    const { page = 1, pageSize = 25, search = '' } = options;
    const queryClient = useQueryClient();
    const { profile, isLoading: isProfileLoading } = useDistributorProfile();
    const isEnabled = !!profile?.id && !isProfileLoading;

    const { data, isLoading, refetch } = useQuery({
        queryKey: ['terms', profile?.id, page, pageSize, search],
        queryFn: async () => {
            if (!profile?.id) return { data: [], count: 0 };

            let query = supabase
                .from('terms')
                .select('*', { count: 'exact' })
                .eq('distributor_id', profile.id)
                .order('created_at', { ascending: false });

            if (search) {
                query = query.or(`title.ilike.%${search}%,conditions.ilike.%${search}%`);
            }

            const from = (page - 1) * pageSize;
            const to = from + pageSize - 1;
            query = query.range(from, to);

            const { data, error, count } = await query;
            if (error) throw error;
            return { data: data as Term[], count: count || 0 };
        },
        enabled: isEnabled,
        placeholderData: keepPreviousData,
    });

    const createTerm = useMutation({
        mutationFn: async (formData: CreateTermData) => {
            if (!profile?.id) throw new Error('No distributor profile');

            const { data, error } = await supabase
                .from('terms')
                .insert([{
                    distributor_id: profile.id,
                    title: formData.title,
                    conditions: formData.conditions,
                    type: formData.type || null,
                    is_default: formData.is_default || false,
                }])
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['terms'] });
            toast.success('Term created successfully');
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to create term');
        },
    });

    const deleteTerm = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('terms')
                .delete()
                .eq('id', id);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['terms'] });
            toast.success('Term deleted successfully');
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to delete term');
        },
    });

    return {
        terms: data?.data || [],
        totalCount: data?.count || 0,
        isLoading: isLoading || isProfileLoading,
        refetch,
        createTerm,
        deleteTerm,
        profile,
    };
}
