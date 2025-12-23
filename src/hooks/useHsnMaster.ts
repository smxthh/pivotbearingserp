import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useDistributorProfile } from './useDistributorProfile';
import { useRealtimeSubscription } from './useRealtimeSubscription';
import { toast } from 'sonner';

export interface HsnMaster {
    id: string;
    distributor_id: string;
    hsn_code: string;
    hsn_from: number;
    hsn_to: number;
    cgst: number;
    sgst: number;
    igst: number;
    gst_percent: number | null; // Legacy, kept for backward compatibility
    description: string | null;
    is_active: boolean | null;
    created_at: string | null;
    updated_at: string | null;
}

export interface CreateHsnData {
    hsn_from: number;
    hsn_to: number;
    cgst: number;
    sgst: number;
    igst: number;
    description?: string;
}

export interface ResolvedTax {
    cgst: number;
    sgst: number;
    igst: number;
    hsn_from: number;
    hsn_to: number;
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

    const queryKey = ['hsn_master', profile?.id, page, pageSize, search];

    // Realtime subscription for automatic sync
    useRealtimeSubscription('hsn_master' as any, queryKey as string[], undefined, isEnabled);

    const { data, isLoading, refetch } = useQuery({
        queryKey: ['hsn_master', profile?.id, page, pageSize, search],
        queryFn: async () => {
            if (!profile?.id) return { data: [], count: 0 };

            let query = supabase
                .from('hsn_master')
                .select('*', { count: 'exact' })
                .eq('distributor_id', profile.id)
                .order('hsn_from', { ascending: true });

            if (search) {
                // Search in hsn_code (legacy), hsn_from, hsn_to, or description
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

            // Validate CGST + SGST = IGST
            if (formData.cgst + formData.sgst !== formData.igst) {
                throw new Error('CGST + SGST must equal IGST');
            }

            const { data, error } = await supabase
                .from('hsn_master')
                .insert([{
                    distributor_id: profile.id,
                    hsn_code: formData.hsn_from.toString(), // Legacy field
                    hsn_from: formData.hsn_from,
                    hsn_to: formData.hsn_to,
                    cgst: formData.cgst,
                    sgst: formData.sgst,
                    igst: formData.igst,
                    gst_percent: formData.igst, // Legacy field for backward compat
                    description: formData.description || null,
                }])
                .select()
                .single();

            if (error) {
                // Handle overlap error more gracefully
                if (error.message.includes('no_overlapping_hsn_ranges')) {
                    throw new Error('HSN range overlaps with existing entry');
                }
                throw error;
            }
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

    const updateHsn = useMutation({
        mutationFn: async ({ id, ...formData }: CreateHsnData & { id: string }) => {
            if (!profile?.id) throw new Error('No distributor profile');

            // Validate CGST + SGST = IGST
            if (formData.cgst + formData.sgst !== formData.igst) {
                throw new Error('CGST + SGST must equal IGST');
            }

            const { data, error } = await supabase
                .from('hsn_master')
                .update({
                    hsn_code: formData.hsn_from.toString(),
                    hsn_from: formData.hsn_from,
                    hsn_to: formData.hsn_to,
                    cgst: formData.cgst,
                    sgst: formData.sgst,
                    igst: formData.igst,
                    gst_percent: formData.igst,
                    description: formData.description || null,
                })
                .eq('id', id)
                .select()
                .single();

            if (error) {
                if (error.message.includes('no_overlapping_hsn_ranges')) {
                    throw new Error('HSN range overlaps with existing entry');
                }
                throw error;
            }
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['hsn_master'] });
            queryClient.invalidateQueries({ queryKey: ['hsn-codes'] });
            toast.success('HSN updated successfully');
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to update HSN');
        },
    });

    const deleteHsn = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('hsn_master')
                .delete()
                .eq('id', id);

            if (error) {
                // Handle "in use" error gracefully
                if (error.message.includes('products/services are using')) {
                    throw new Error(error.message);
                }
                throw error;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['hsn_master'] });
            queryClient.invalidateQueries({ queryKey: ['hsn-codes'] });
            toast.success('HSN deleted successfully');
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to delete HSN');
        },
    });

    // Resolve tax for a given HSN code - THE AUTHORITATIVE TAX RESOLUTION
    const resolveHsnTax = async (hsnCode: number): Promise<ResolvedTax | null> => {
        if (!profile?.id) return null;

        // Use raw fetch to call the RPC function (bypasses generated types)
        const { data, error } = await supabase
            .rpc('resolve_hsn_tax' as any, {
                p_distributor_id: profile.id,
                p_hsn_code: hsnCode,
            });

        if (error) {
            console.error('Error resolving HSN tax:', error);
            return null;
        }

        if (data && Array.isArray(data) && data.length > 0) {
            return data[0] as ResolvedTax;
        }
        return null;
    };

    return {
        hsnList: data?.data || [],
        totalCount: data?.count || 0,
        isLoading: isLoading || isProfileLoading,
        refetch,
        createHsn,
        updateHsn,
        deleteHsn,
        resolveHsnTax,
        profile,
    };
}

