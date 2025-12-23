import { useMutation, useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useDistributorProfile } from './useDistributorProfile';
import { VoucherName } from './useVoucherPrefixes';

// ============================================
// HOOK: useDocumentNumber
// Get next document number from centralized prefix system
// ============================================

interface UseDocumentNumberOptions {
    voucherName: VoucherName | string;
    prefix?: string; // Optional: override default prefix
}

export function useDocumentNumber(options: UseDocumentNumberOptions) {
    const { voucherName, prefix } = options;
    const { profile, isLoading: isProfileLoading } = useDistributorProfile();

    // ========================================
    // PREVIEW NEXT NUMBER (Read-Only)
    // ========================================
    const { data: previewNumber, isLoading: isPreviewLoading, refetch: refetchPreview } = useQuery({
        queryKey: ['preview_document_number', profile?.id, voucherName, prefix],
        queryFn: async () => {
            if (!profile?.id) return null;

            const { data, error } = await (supabase as any)
                .rpc('preview_next_document_number', {
                    p_distributor_id: profile.id,
                    p_voucher_name: voucherName,
                    p_prefix: prefix || null,
                });

            if (error) {
                console.warn('Preview number RPC failed:', error);
                return null;
            }

            return data as string | null;
        },
        enabled: !!profile?.id && !!voucherName,
        staleTime: 0, // Always fetch fresh
        gcTime: 0 // Don't cache
    });

    // ========================================
    // REALTIME SUBSCRIPTION
    // ========================================
    useEffect(() => {
        if (!profile?.id) return;

        const channel = supabase
            .channel('document-number-changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'voucher_number_sequences'
                },
                () => {
                    refetchPreview();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [profile?.id, refetchPreview]);

    // ========================================
    // INCREMENT NUMBER (Write-Only)
    // ========================================
    const incrementNumber = useMutation({
        mutationFn: async () => {
            if (!profile?.id) throw new Error('No distributor profile');

            const { error } = await (supabase as any)
                .rpc('increment_document_number', {
                    p_distributor_id: profile.id,
                    p_voucher_name: voucherName,
                    p_prefix: prefix || null,
                });

            if (error) throw error;
        },
        onSuccess: () => {
            // Refetch preview to show updated number for NEXT time
            refetchPreview();
        },
    });

    return {
        previewNumber,
        isLoading: isProfileLoading || isPreviewLoading,
        incrementNumber,
        refetchPreview,
    };
}

// ============================================
// UTILITY: Format Document Number Client-Side
// Fallback when RPC is not available
// ============================================

export function formatDocumentNumber(
    prefix: string,
    separator: string,
    yearFormat: string,
    number: number
): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    // Calculate financial year
    let startYear: number, endYear: number;
    if (month >= 4) {
        startYear = year;
        endYear = year + 1;
    } else {
        startYear = year - 1;
        endYear = year;
    }

    let yearPart: string;
    switch (yearFormat) {
        case 'yy-yy':
            yearPart = `${startYear % 100}-${endYear % 100}`;
            break;
        case 'yy':
            yearPart = `${startYear % 100}`;
            break;
        case 'yyyy':
            yearPart = `${startYear}-${endYear}`;
            break;
        case 'none':
            yearPart = '';
            break;
        default:
            yearPart = `${startYear % 100}-${endYear % 100}`;
    }

    if (yearPart === '') {
        return `${prefix}${separator}${number}`;
    }
    return `${prefix}${separator}${yearPart}${separator}${number}`;
}

// ============================================
// UTILITY: Get Current Financial Year
// ============================================

export function getCurrentFinancialYear(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    if (month >= 4) {
        return `${year % 100}-${(year + 1) % 100}`;
    } else {
        return `${(year - 1) % 100}-${year % 100}`;
    }
}
