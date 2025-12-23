import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useDistributorProfile } from './useDistributorProfile';
import { toast } from 'sonner';

export interface TaxClass {
    id: string;
    distributor_id: string;
    class_type: string;
    class_code: string;
    class_name: string;
    ledger_name: string | null;
    tax_name: string | null;
    expense_name: string | null;
    is_default: boolean | null;
    is_active: boolean | null;
    created_at: string | null;
    updated_at: string | null;
}

export interface CreateTaxClassData {
    class_type: string;
    class_code: string;
    class_name: string;
    ledger_name?: string;
    tax_name?: string;
    expense_name?: string;
    is_default?: boolean;
    is_active?: boolean;
}

interface UseTaxClassOptions {
    page?: number;
    pageSize?: number;
    search?: string;
}

export function useTaxClass(options: UseTaxClassOptions = {}) {
    const { page = 1, pageSize = 25, search = '' } = options;
    const queryClient = useQueryClient();
    const { profile, isLoading: isProfileLoading } = useDistributorProfile();
    const isEnabled = !!profile?.id && !isProfileLoading;

    const { data, isLoading, refetch } = useQuery({
        queryKey: ['tax_class', profile?.id, page, pageSize, search],
        queryFn: async () => {
            if (!profile?.id) return { data: [], count: 0 };

            let query = supabase
                .from('tax_class')
                .select('*', { count: 'exact' })
                .eq('distributor_id', profile.id)
                .order('created_at', { ascending: false });

            if (search) {
                query = query.or(`class_name.ilike.%${search}%,class_code.ilike.%${search}%,ledger_name.ilike.%${search}%`);
            }

            const from = (page - 1) * pageSize;
            const to = from + pageSize - 1;
            query = query.range(from, to);

            const { data, error, count } = await query;
            if (error) throw error;
            return { data: data as TaxClass[], count: count || 0 };
        },
        enabled: isEnabled,
        placeholderData: keepPreviousData,
    });

    const createTaxClass = useMutation({
        mutationFn: async (formData: CreateTaxClassData) => {
            if (!profile?.id) throw new Error('No distributor profile');

            const { data, error } = await supabase
                .from('tax_class')
                .insert([{
                    distributor_id: profile.id,
                    class_type: formData.class_type,
                    class_code: formData.class_code,
                    class_name: formData.class_name,
                    ledger_name: formData.ledger_name || null,
                    tax_name: formData.tax_name || null,
                    expense_name: formData.expense_name || null,
                    is_default: formData.is_default ?? false,
                    is_active: formData.is_active ?? true,
                }])
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tax_class'] });
            toast.success('Tax Class created successfully');
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to create tax class');
        },
    });

    const deleteTaxClass = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('tax_class')
                .delete()
                .eq('id', id);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tax_class'] });
            toast.success('Tax Class deleted successfully');
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to delete tax class');
        },
    });

    return {
        taxClassList: data?.data || [],
        totalCount: data?.count || 0,
        isLoading: isLoading || isProfileLoading,
        refetch,
        createTaxClass,
        deleteTaxClass,
        profile,
    };
}
