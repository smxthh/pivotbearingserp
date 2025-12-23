import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useDistributorProfile } from './useDistributorProfile';
import { toast } from 'sonner';

// ============================================
// TYPES
// ============================================

export interface VoucherPrefix {
    id: string;
    distributor_id: string;
    voucher_name: string;
    voucher_prefix: string;
    prefix_separator: string | null;
    year_format: string | null;
    auto_start_no: number | null;
    is_default: boolean | null;
    is_active: boolean | null;
    created_at: string | null;
    updated_at: string | null;
}

export interface CreateVoucherPrefixData {
    voucher_name: string;
    voucher_prefix: string;
    prefix_separator?: string;
    year_format?: string;
    auto_start_no?: number;
    is_default?: boolean;
    is_active?: boolean;
}

export interface UpdateVoucherPrefixData extends Partial<CreateVoucherPrefixData> {
    id: string;
}

// Voucher name options
export const VOUCHER_NAMES = [
    // Sales
    'Sales Order',
    'Sales Quotation',
    'Sales Enquiry',
    'Sales Invoice',
    'Delivery Challan',

    // Purchase
    'Purchase Order',
    'Purchase Invoice',

    // Notes
    'Debit Note',
    'Credit Note',

    // Store
    'Marking',
    'Packing',
    'Gate Inward',

    // Accounting - Vouchers
    'Receipt Voucher',
    'Payment Voucher',
    'Journal Entry',

    // Accounting - GST
    'GST Expense',
    'GST Income',
    'GST Payment',
    'GST Journal',
    'GST Havala',
    'Havala',
    'TCS/TDS Payment',
] as const;

export type VoucherName = typeof VOUCHER_NAMES[number];

// Year format options
export const YEAR_FORMATS = [
    { value: 'yy-yy', label: 'yy-yy (25-26)' },
    { value: 'yy', label: 'yy (25)' },
    { value: 'yyyy', label: 'yyyy (2025-2026)' },
    { value: 'none', label: 'None' },
] as const;

// ============================================
// DEFAULT PREFIXES (Fallback)
// ============================================
export const DEFAULT_VOUCHER_PREFIXES: Record<string, string> = {
    'Sales Order': 'SO/',
    'Sales Quotation': 'SQ/',
    'Sales Enquiry': 'SE/',
    'Sales Invoice': 'INV/',
    'Delivery Challan': 'DC/',
    'Purchase Order': 'PO/',
    'Purchase Invoice': 'PI/', // Standardized from PI/25-26/ to PI/ or similar base. Let's use PI/ as base.
    'Debit Note': 'DRN/',
    'Credit Note': 'CRN/',
    'Receipt Voucher': 'RV/',
    'Payment Voucher': 'PV/',
    'Journal Entry': 'JV/',
    'GST Expense': 'EXP/',
    'GST Income': 'INC/',
    'GST Payment': 'GPAY/',
    'GST Journal': 'GJ/',
    'GST Havala': 'GH/',
    'Havala': 'HAV/',
    'TCS/TDS Payment': 'TAX/',
    'Marking': 'MRK/',
    'Packing': 'PCK/',
    'Gate Inward': 'GI/',
};

// ============================================
// HOOK OPTIONS
// ============================================

interface UseVoucherPrefixesOptions {
    page?: number;
    pageSize?: number;
    search?: string;
    voucherName?: string;
}

// ============================================
// MAIN HOOK
// ============================================

export function useVoucherPrefixes(options: UseVoucherPrefixesOptions = {}) {
    const { page = 1, pageSize = 25, search = '', voucherName } = options;
    const queryClient = useQueryClient();
    const { profile, isLoading: isProfileLoading } = useDistributorProfile();
    const isEnabled = !!profile?.id && !isProfileLoading;

    // ========================================
    // FETCH PREFIXES
    // ========================================
    const { data, isLoading, refetch } = useQuery({
        queryKey: ['voucher_prefixes', profile?.id, page, pageSize, search, voucherName],
        queryFn: async () => {
            if (!profile?.id) return { data: [], count: 0 };

            let query = supabase
                .from('voucher_prefixes')
                .select('*', { count: 'exact' })
                .eq('distributor_id', profile.id)
                .order('voucher_name', { ascending: true })
                .order('is_default', { ascending: false });

            if (search) {
                query = query.or(`voucher_name.ilike.%${search}%,voucher_prefix.ilike.%${search}%`);
            }

            if (voucherName) {
                query = query.eq('voucher_name', voucherName);
            }

            const from = (page - 1) * pageSize;
            const to = from + pageSize - 1;
            query = query.range(from, to);

            const { data, error, count } = await query;
            if (error) throw error;
            return { data: data as VoucherPrefix[], count: count || 0 };
        },
        enabled: isEnabled,
        placeholderData: keepPreviousData,
    });

    // ========================================
    // SEED DEFAULTS (if empty)
    // ========================================
    const seedDefaults = useMutation({
        mutationFn: async () => {
            if (!profile?.id) throw new Error('No distributor profile');

            const { error } = await (supabase as any)
                .rpc('seed_default_voucher_prefixes', {
                    p_distributor_id: profile.id
                });

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['voucher_prefixes'] });
            toast.success('Default prefixes seeded successfully');
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to seed defaults');
        },
    });

    // ========================================
    // CREATE PREFIX
    // ========================================
    const createPrefix = useMutation({
        mutationFn: async (formData: CreateVoucherPrefixData) => {
            if (!profile?.id) throw new Error('No distributor profile');

            // If setting as default, unset other defaults for this voucher name
            if (formData.is_default) {
                await supabase
                    .from('voucher_prefixes')
                    .update({ is_default: false })
                    .eq('distributor_id', profile.id)
                    .eq('voucher_name', formData.voucher_name);
            }

            const { data, error } = await supabase
                .from('voucher_prefixes')
                .insert([{
                    distributor_id: profile.id,
                    voucher_name: formData.voucher_name,
                    voucher_prefix: formData.voucher_prefix.toUpperCase(),
                    prefix_separator: formData.prefix_separator || '/',
                    year_format: formData.year_format || 'yy-yy',
                    auto_start_no: formData.auto_start_no || 1,
                    is_default: formData.is_default ?? false,
                    is_active: formData.is_active ?? true,
                }])
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['voucher_prefixes'] });
            toast.success('Prefix created successfully');
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to create prefix');
        },
    });

    // ========================================
    // UPDATE PREFIX
    // ========================================
    const updatePrefix = useMutation({
        mutationFn: async ({ id, ...formData }: UpdateVoucherPrefixData) => {
            if (!profile?.id) throw new Error('No distributor profile');

            // If setting as default, unset other defaults for this voucher name
            if (formData.is_default && formData.voucher_name) {
                await supabase
                    .from('voucher_prefixes')
                    .update({ is_default: false })
                    .eq('distributor_id', profile.id)
                    .eq('voucher_name', formData.voucher_name)
                    .neq('id', id);
            }

            const updateData: Record<string, any> = {};
            if (formData.voucher_name !== undefined) updateData.voucher_name = formData.voucher_name;
            if (formData.voucher_prefix !== undefined) updateData.voucher_prefix = formData.voucher_prefix.toUpperCase();
            if (formData.prefix_separator !== undefined) updateData.prefix_separator = formData.prefix_separator;
            if (formData.year_format !== undefined) updateData.year_format = formData.year_format;
            if (formData.auto_start_no !== undefined) updateData.auto_start_no = formData.auto_start_no;
            if (formData.is_default !== undefined) updateData.is_default = formData.is_default;
            if (formData.is_active !== undefined) updateData.is_active = formData.is_active;

            const { data, error } = await supabase
                .from('voucher_prefixes')
                .update(updateData)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['voucher_prefixes'] });
            toast.success('Prefix updated successfully');
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to update prefix');
        },
    });

    // ========================================
    // DELETE PREFIX
    // ========================================
    const deletePrefix = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('voucher_prefixes')
                .delete()
                .eq('id', id);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['voucher_prefixes'] });
            toast.success('Prefix deleted successfully');
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to delete prefix');
        },
    });

    // ========================================
    // CHECK IF EMPTY AND SEED
    // ========================================
    const checkAndSeedDefaults = async () => {
        if (data?.count === 0 && profile?.id) {
            await seedDefaults.mutateAsync();
        }
    };

    return {
        prefixList: data?.data || [],
        totalCount: data?.count || 0,
        isLoading: isLoading || isProfileLoading,
        refetch,
        createPrefix,
        updatePrefix,
        deletePrefix,
        seedDefaults,
        checkAndSeedDefaults,
        profile,
    };
}

// ============================================
// HOOK: Get Prefixes for a Specific Voucher Type
// ============================================

export function useVoucherPrefixesForType(voucherName: string) {
    const { profile, isLoading: isProfileLoading } = useDistributorProfile();
    const isEnabled = !!profile?.id && !isProfileLoading && !!voucherName;

    const { data, isLoading } = useQuery({
        queryKey: ['voucher_prefixes_for_type', profile?.id, voucherName],
        queryFn: async () => {
            if (!profile?.id) return [];

            const { data, error } = await supabase
                .from('voucher_prefixes')
                .select('*')
                .eq('distributor_id', profile.id)
                .eq('voucher_name', voucherName)
                .eq('is_active', true)
                .order('is_default', { ascending: false });

            if (error) throw error;
            return data as VoucherPrefix[];
        },
        enabled: isEnabled,
    });

    const queryClient = useQueryClient();

    // Determine return values
    let prefixes = data || [];
    let defaultPrefix = prefixes.find(p => p.is_default) || prefixes[0];

    // --- FALLBACK & AUTO-CREATE LOGIC ---
    // If no prefixes found, generate a virtual one AND auto-create it in DB
    const [isCreating, setIsCreating] = useState(false);

    useEffect(() => {
        if (!isLoading && isEnabled && prefixes.length === 0 && voucherName && DEFAULT_VOUCHER_PREFIXES[voucherName] && !isCreating) {
            const createDefault = async () => {
                setIsCreating(true);
                console.log(`Auto-creating default prefix for ${voucherName}...`);

                try {
                    const defaultVal = DEFAULT_VOUCHER_PREFIXES[voucherName];
                    const cleanPrefix = defaultVal.replace(/[\/-]$/, ''); // Remove trailing separator

                    const { error } = await supabase
                        .from('voucher_prefixes')
                        .insert([{
                            distributor_id: profile?.id,
                            voucher_name: voucherName,
                            voucher_prefix: cleanPrefix,
                            prefix_separator: '/',
                            year_format: 'yy-yy',
                            auto_start_no: 1,
                            is_default: true,
                            is_active: true,
                        }]);

                    if (error) {
                        console.error('Failed to auto-create prefix:', error);
                    } else {
                        console.log('Successfully auto-created prefix');
                        queryClient.invalidateQueries({ queryKey: ['voucher_prefixes_for_type'] });
                        queryClient.invalidateQueries({ queryKey: ['voucher_prefixes'] });
                    }
                } catch (err) {
                    console.error('Error in auto-create:', err);
                }
            };

            createDefault();
        }
    }, [isLoading, isEnabled, prefixes.length, voucherName, profile?.id, queryClient, isCreating]);

    // virtual fallback while creating or if creation failed
    if (prefixes.length === 0 && voucherName && DEFAULT_VOUCHER_PREFIXES[voucherName]) {
        const virtualPrefix: VoucherPrefix = {
            id: 'virtual-default',
            distributor_id: profile?.id || '',
            voucher_name: voucherName,
            voucher_prefix: DEFAULT_VOUCHER_PREFIXES[voucherName].replace(/[\/-]$/, ''),
            prefix_separator: '/',
            year_format: 'yy-yy',
            auto_start_no: 1,
            is_default: true,
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        };

        prefixes = [virtualPrefix];
        defaultPrefix = virtualPrefix;
    }

    return {
        prefixes,
        defaultPrefix,
        isLoading: isLoading || isProfileLoading,
    };
}
