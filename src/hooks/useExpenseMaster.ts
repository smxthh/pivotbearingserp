import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useDistributorProfile } from './useDistributorProfile';
import { toast } from 'sonner';

export interface ExpenseMaster {
    id: string;
    distributor_id: string;
    expense_name: string;
    entry_type: string;
    ledger_name: string | null;
    calculation_type: string;
    default_percent: number | null;
    calculation_on: string | null;
    amount_effect: string | null;
    position: string | null;
    sequence: number | null;
    is_active: boolean | null;
    created_at: string | null;
    updated_at: string | null;
}

export interface CreateExpenseData {
    expense_name: string;
    entry_type: string;
    ledger_name?: string;
    calculation_type: string;
    default_percent?: number;
    calculation_on?: string;
    amount_effect?: string;
    position?: string;
    sequence?: number;
    is_active?: boolean;
}

interface UseExpenseMasterOptions {
    page?: number;
    pageSize?: number;
    search?: string;
}

export function useExpenseMaster(options: UseExpenseMasterOptions = {}) {
    const { page = 1, pageSize = 25, search = '' } = options;
    const queryClient = useQueryClient();
    const { profile, isLoading: isProfileLoading } = useDistributorProfile();
    const isEnabled = !!profile?.id && !isProfileLoading;

    const { data, isLoading, refetch } = useQuery({
        queryKey: ['expense_master', profile?.id, page, pageSize, search],
        queryFn: async () => {
            if (!profile?.id) return { data: [], count: 0 };

            let query = supabase
                .from('expense_master')
                .select('*', { count: 'exact' })
                .eq('distributor_id', profile.id)
                .order('sequence', { ascending: true });

            if (search) {
                query = query.or(`expense_name.ilike.%${search}%,entry_type.ilike.%${search}%,ledger_name.ilike.%${search}%`);
            }

            const from = (page - 1) * pageSize;
            const to = from + pageSize - 1;
            query = query.range(from, to);

            const { data, error, count } = await query;
            if (error) throw error;
            return { data: data as ExpenseMaster[], count: count || 0 };
        },
        enabled: isEnabled,
        placeholderData: keepPreviousData,
    });

    const createExpense = useMutation({
        mutationFn: async (formData: CreateExpenseData) => {
            if (!profile?.id) throw new Error('No distributor profile');

            const { data, error } = await supabase
                .from('expense_master')
                .insert([{
                    distributor_id: profile.id,
                    expense_name: formData.expense_name,
                    entry_type: formData.entry_type,
                    ledger_name: formData.ledger_name || null,
                    calculation_type: formData.calculation_type,
                    default_percent: formData.default_percent || 0,
                    calculation_on: formData.calculation_on || null,
                    amount_effect: formData.amount_effect || 'add',
                    position: formData.position || 'after_tax',
                    sequence: formData.sequence || 0,
                    is_active: formData.is_active ?? true,
                }])
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['expense_master'] });
            toast.success('Expense created successfully');
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to create expense');
        },
    });

    const deleteExpense = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('expense_master')
                .delete()
                .eq('id', id);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['expense_master'] });
            toast.success('Expense deleted successfully');
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to delete expense');
        },
    });

    return {
        expenseList: data?.data || [],
        totalCount: data?.count || 0,
        isLoading: isLoading || isProfileLoading,
        refetch,
        createExpense,
        deleteExpense,
        profile,
    };
}
