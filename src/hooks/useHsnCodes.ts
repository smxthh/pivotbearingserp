import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useDistributorProfile } from './useDistributorProfile';
import { useRealtimeSubscription } from './useRealtimeSubscription';

// GST Rate options (as numbers for easy comparison)
export const GST_RATES = [0, 5, 12, 18, 28];

// Unit options
export const UNITS = [
    { value: 'NOS', label: 'NOS - Numbers' },
    { value: 'PCS', label: 'PCS - Pieces' },
    { value: 'SET', label: 'SET - Set' },
    { value: 'BOX', label: 'BOX - Box' },
    { value: 'KG', label: 'KG - Kilograms' },
    { value: 'MTR', label: 'MTR - Meters' },
    { value: 'LTR', label: 'LTR - Liters' },
    { value: 'JOB', label: 'JOB - Job Work' },
    { value: 'HRS', label: 'HRS - Hours' },
];

// HSN Code type (from hsn_master table)
export interface HsnCode {
    id: string;
    code: string;
    description?: string;
    gst_rate: number;
    is_active: boolean;
}

// SAC Code type
export interface SacCode {
    id: string;
    code: string;
    description?: string;
    gst_rate: number;
    is_active: boolean;
}

// Common SAC codes for services (hardcoded for now)
const COMMON_SAC_CODES: SacCode[] = [
    { id: 'sac-1', code: '9987', description: 'Repair & maintenance services', gst_rate: 18, is_active: true },
    { id: 'sac-2', code: '998714', description: 'Maintenance and repair of machinery', gst_rate: 18, is_active: true },
    { id: 'sac-3', code: '998799', description: 'Other repair services', gst_rate: 18, is_active: true },
    { id: 'sac-4', code: '9988', description: 'Manufacturing services on physical inputs', gst_rate: 18, is_active: true },
    { id: 'sac-5', code: '9971', description: 'Financial services', gst_rate: 18, is_active: true },
];

// Hook to fetch HSN codes from hsn_master (BACKEND-DRIVEN)
export function useHsnCodes(search?: string) {
    const { profile, isLoading: isProfileLoading } = useDistributorProfile();
    const isEnabled = !!profile?.id && !isProfileLoading;

    const queryKey = ['hsn-codes', profile?.id, search];

    // Realtime subscription for automatic sync
    useRealtimeSubscription('hsn_master' as any, queryKey as string[], undefined, isEnabled);

    const { data, isLoading, error, refetch } = useQuery({
        queryKey,
        queryFn: async (): Promise<HsnCode[]> => {
            if (!profile?.id) return [];

            // Fetch from hsn_master table (THE AUTHORITATIVE SOURCE)
            const { data, error } = await supabase
                .from('hsn_master')
                .select('*')
                .eq('distributor_id', profile.id)
                .eq('is_active', true)
                .order('hsn_from');

            if (error) {
                console.error('Error fetching HSN codes:', error);
                return [];
            }

            // Transform hsn_master records to HsnCode format
            return (data || []).map((hsn: any) => ({
                id: hsn.id,
                code: String(hsn.hsn_from),
                description: hsn.description || (hsn.hsn_from === hsn.hsn_to
                    ? `HSN ${hsn.hsn_from}`
                    : `HSN ${hsn.hsn_from} - ${hsn.hsn_to}`),
                gst_rate: hsn.igst || 0,
                is_active: hsn.is_active ?? true,
            }));
        },
        enabled: isEnabled,
    });

    // Filter by search
    const filteredData = search
        ? (data || []).filter(
            (hsn) =>
                hsn.code.toLowerCase().includes(search.toLowerCase()) ||
                (hsn.description?.toLowerCase() || '').includes(search.toLowerCase())
        )
        : data || [];

    // Build dropdown options
    const options = filteredData.map((hsn) => ({
        value: hsn.id,
        label: `${hsn.code} - ${hsn.description || 'N/A'} (${hsn.gst_rate}%)`,
        code: hsn.code,
        gstRate: hsn.gst_rate,
    }));

    return {
        hsnCodes: data || [],
        options,
        isLoading: isLoading || isProfileLoading,
        error,
        refetch,
    };
}

// Hook to fetch SAC codes
export function useSacCodes(search?: string) {
    const { data, isLoading, error, refetch } = useQuery({
        queryKey: ['sac-codes', search],
        queryFn: async (): Promise<SacCode[]> => {
            // Try to fetch from database
            try {
                const { data, error } = await (supabase as any)
                    .from('sac_codes')
                    .select('*')
                    .eq('is_active', true)
                    .order('code');

                if (error) {
                    // Table doesn't exist yet, return hardcoded
                    return COMMON_SAC_CODES;
                }

                return (data || []) as SacCode[];
            } catch (e) {
                // Return hardcoded values
                return COMMON_SAC_CODES;
            }
        },
    });

    // Filter by search
    const filteredData = search
        ? (data || []).filter(
            (sac) =>
                sac.code.toLowerCase().includes(search.toLowerCase()) ||
                (sac.description?.toLowerCase() || '').includes(search.toLowerCase())
        )
        : data || [];

    // Build dropdown options
    const options = filteredData.map((sac) => ({
        value: sac.id,
        label: `${sac.code} - ${sac.description || 'N/A'}`,
        code: sac.code,
        gstRate: sac.gst_rate,
    }));

    return {
        sacCodes: data || [],
        options,
        isLoading,
        error,
        refetch,
    };
}

// Combined hook for getting tax codes based on item type
export function useTaxCodes(itemType: 'product' | 'service') {
    const hsnHook = useHsnCodes();
    const sacHook = useSacCodes();

    if (itemType === 'product') {
        return {
            taxCodes: hsnHook.hsnCodes,
            options: hsnHook.options,
            isLoading: hsnHook.isLoading,
            error: hsnHook.error,
        };
    }

    return {
        taxCodes: sacHook.sacCodes,
        options: sacHook.options,
        isLoading: sacHook.isLoading,
        error: sacHook.error,
    };
}
