import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

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

// HSN Code type
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

// Common HSN codes for bearings (hardcoded for now until migration runs)
const COMMON_HSN_CODES: HsnCode[] = [
    { id: 'hsn-1', code: '8482', description: 'Ball or roller bearings', gst_rate: 18, is_active: true },
    { id: 'hsn-2', code: '84821010', description: 'Ball bearings - Deep groove ball bearings', gst_rate: 18, is_active: true },
    { id: 'hsn-3', code: '84821020', description: 'Ball bearings - Angular contact ball bearings', gst_rate: 18, is_active: true },
    { id: 'hsn-4', code: '84821090', description: 'Ball bearings - Other', gst_rate: 18, is_active: true },
    { id: 'hsn-5', code: '84822010', description: 'Tapered roller bearings', gst_rate: 18, is_active: true },
    { id: 'hsn-6', code: '84822090', description: 'Roller bearings - Other', gst_rate: 18, is_active: true },
    { id: 'hsn-7', code: '84823000', description: 'Spherical roller bearings', gst_rate: 18, is_active: true },
    { id: 'hsn-8', code: '84824000', description: 'Needle roller bearings', gst_rate: 18, is_active: true },
    { id: 'hsn-9', code: '84825000', description: 'Cylindrical roller bearings', gst_rate: 18, is_active: true },
    { id: 'hsn-10', code: '84828000', description: 'Other roller bearings', gst_rate: 18, is_active: true },
];

// Common SAC codes for services (hardcoded for now)
const COMMON_SAC_CODES: SacCode[] = [
    { id: 'sac-1', code: '9987', description: 'Repair & maintenance services', gst_rate: 18, is_active: true },
    { id: 'sac-2', code: '998714', description: 'Maintenance and repair of machinery', gst_rate: 18, is_active: true },
    { id: 'sac-3', code: '998799', description: 'Other repair services', gst_rate: 18, is_active: true },
    { id: 'sac-4', code: '9988', description: 'Manufacturing services on physical inputs', gst_rate: 18, is_active: true },
    { id: 'sac-5', code: '9971', description: 'Financial services', gst_rate: 18, is_active: true },
];

// Hook to fetch HSN codes
export function useHsnCodes(search?: string) {
    const { data, isLoading, error, refetch } = useQuery({
        queryKey: ['hsn-codes', search],
        queryFn: async (): Promise<HsnCode[]> => {
            // Try to fetch from database
            try {
                const { data, error } = await (supabase as any)
                    .from('hsn_codes')
                    .select('*')
                    .eq('is_active', true)
                    .order('code');

                if (error) {
                    // Table doesn't exist yet, return hardcoded
                    return COMMON_HSN_CODES;
                }

                return (data || []) as HsnCode[];
            } catch (e) {
                // Return hardcoded values
                return COMMON_HSN_CODES;
            }
        },
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
        label: `${hsn.code} - ${hsn.description || 'N/A'}`,
        code: hsn.code,
        gstRate: hsn.gst_rate,
    }));

    return {
        hsnCodes: data || [],
        options,
        isLoading,
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
