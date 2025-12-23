import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useDistributorProfile } from './useDistributorProfile';
import { toast } from 'sonner';

export interface TaxMaster {
    id: string;
    distributor_id: string;
    tax_name: string;
    tax_type: string;
    calculation_type: string;
    ledger_name: string | null;
    is_active: boolean | null;
    add_deduct: string | null;
    created_at: string | null;
    updated_at: string | null;
}

export interface CreateTaxData {
    tax_name: string;
    tax_type: string;
    calculation_type: string;
    ledger_name?: string;
    is_active?: boolean;
    add_deduct?: string;
}

interface UseTaxMasterOptions {
    page?: number;
    pageSize?: number;
    search?: string;
}

export function useTaxMaster(options: UseTaxMasterOptions = {}) {
    const { page = 1, pageSize = 25, search = '' } = options;
    const queryClient = useQueryClient();
    const { profile, isLoading: isProfileLoading } = useDistributorProfile();
    const isEnabled = !!profile?.id && !isProfileLoading;

    const { data, isLoading, refetch } = useQuery({
        queryKey: ['tax_master', profile?.id, page, pageSize, search],
        queryFn: async () => {
            if (!profile?.id) return { data: [], count: 0 };

            let query = supabase
                .from('tax_master')
                .select('*', { count: 'exact' })
                .eq('distributor_id', profile.id)
                .order('created_at', { ascending: false });

            if (search) {
                query = query.or(`tax_name.ilike.%${search}%,tax_type.ilike.%${search}%,ledger_name.ilike.%${search}%`);
            }

            const from = (page - 1) * pageSize;
            const to = from + pageSize - 1;
            query = query.range(from, to);

            const { data, error, count } = await query;
            if (error) throw error;
            return { data: data as TaxMaster[], count: count || 0 };
        },
        enabled: isEnabled,
        placeholderData: keepPreviousData,
    });

    const createTax = useMutation({
        mutationFn: async (formData: CreateTaxData) => {
            if (!profile?.id) throw new Error('No distributor profile');

            const { data, error } = await supabase
                .from('tax_master')
                .insert([{
                    distributor_id: profile.id,
                    tax_name: formData.tax_name,
                    tax_type: formData.tax_type,
                    calculation_type: formData.calculation_type,
                    ledger_name: formData.ledger_name || null,
                    is_active: formData.is_active ?? true,
                    add_deduct: formData.add_deduct || 'add',
                }])
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tax_master'] });
            toast.success('Tax created successfully');
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to create tax');
        },
    });

    const deleteTax = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('tax_master')
                .delete()
                .eq('id', id);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tax_master'] });
            toast.success('Tax deleted successfully');
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to delete tax');
        },
    });

    return {
        taxList: data?.data || [],
        totalCount: data?.count || 0,
        isLoading: isLoading || isProfileLoading,
        refetch,
        createTax,
        deleteTax,
        profile,
    };
}
