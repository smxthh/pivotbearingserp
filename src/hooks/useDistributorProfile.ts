import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';
import { toast } from 'sonner';

export type DistributorProfile = Tables<'distributor_profiles'>;
export type DistributorProfileInsert = TablesInsert<'distributor_profiles'>;
export type DistributorProfileUpdate = TablesUpdate<'distributor_profiles'>;

/**
 * Hook for managing distributor profile
 * Used for company settings, invoice prefix, etc.
 * For salespersons: Returns their admin's profile via tenantId
 */
export function useDistributorProfile() {
    const { user, role, tenantId } = useAuth();
    const queryClient = useQueryClient();
    const queryKey = ['distributor_profile', user?.id, role, tenantId];

    // Fetch distributor profile
    const {
        data: profile,
        isLoading,
        error,
        refetch,
    } = useQuery({
        queryKey,
        queryFn: async () => {
            if (!user) return null;

            // For salespersons, fetch admin's profile using tenantId
            if (role === 'salesperson') {
                if (!tenantId) {
                    console.error('Salesperson has no tenant_id assigned');
                    return null;
                }

                const { data, error } = await supabase
                    .from('distributor_profiles')
                    .select('*')
                    .eq('user_id', tenantId)
                    .maybeSingle();

                if (error) {
                    console.error('Error fetching admin distributor profile for salesperson:', error);
                    // Don't throw - return null to allow virtual fallbacks
                    return null;
                }

                return data as DistributorProfile | null;
            }

            // For admin/superadmin, fetch their own profile
            const { data, error } = await supabase
                .from('distributor_profiles')
                .select('*')
                .eq('user_id', user.id)
                .maybeSingle();

            if (error) {
                console.error('Error fetching distributor profile:', error);
                throw error;
            }

            return data as DistributorProfile | null;
        },
        enabled: !!user && !!role, // Enable for ALL roles including salesperson
        staleTime: 10 * 60 * 1000, // 10 minutes
        gcTime: 30 * 60 * 1000, // 30 minutes
        refetchOnWindowFocus: false,
    });

    // Create or update profile
    const saveProfile = useMutation({
        mutationFn: async (data: Omit<DistributorProfileInsert, 'user_id'>) => {
            if (!user) throw new Error('Not authenticated');

            // Check if profile exists
            const { data: existing } = await supabase
                .from('distributor_profiles')
                .select('id')
                .eq('user_id', user.id)
                .maybeSingle();

            if (existing) {
                // Update
                const { data: updated, error } = await supabase
                    .from('distributor_profiles')
                    .update(data)
                    .eq('id', existing.id)
                    .select()
                    .single();

                if (error) throw error;
                return updated as DistributorProfile;
            } else {
                // Insert
                const { data: created, error } = await supabase
                    .from('distributor_profiles')
                    .insert({
                        ...data,
                        user_id: user.id,
                    })
                    .select()
                    .single();

                if (error) throw error;
                return created as DistributorProfile;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey });
            toast.success('Profile saved successfully');
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to save profile');
        },
    });

    // Update invoice prefix
    const updateInvoicePrefix = useMutation({
        mutationFn: async (prefix: string) => {
            if (!profile) throw new Error('Profile not found');

            const { data, error } = await supabase
                .from('distributor_profiles')
                .update({ invoice_prefix: prefix })
                .eq('id', profile.id)
                .select()
                .single();

            if (error) throw error;
            return data as DistributorProfile;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey });
            toast.success('Invoice prefix updated');
        },
    });

    return {
        profile,
        role, // Include role for consumers to avoid duplicate useAuth calls
        isLoading,
        error,
        refetch,
        saveProfile,
        updateInvoicePrefix,
        hasProfile: !!profile,
        isSaving: saveProfile.isPending,
    };
}

/**
 * Get the current user's distributor ID for API calls
 * For admins: Creates or fetches their own distributor profile
 * For salespersons: Returns their ADMIN's distributor_id via tenant_id
 */
export function useDistributorId() {
    const { user, role, tenantId } = useAuth();

    return useQuery({
        queryKey: ['distributor_id', user?.id, role, tenantId],
        queryFn: async () => {
            if (!user) return null;

            if (role === 'admin' || role === 'superadmin') {
                // Admins and Superadmins get their own distributor profile (create if doesn't exist)
                const { data: existing } = await supabase
                    .from('distributor_profiles')
                    .select('id')
                    .eq('user_id', user.id)
                    .maybeSingle();

                if (existing) {
                    return existing.id;
                }

                // Create a default distributor profile for admin
                const { data: created, error } = await supabase
                    .from('distributor_profiles')
                    .insert({
                        user_id: user.id,
                        company_name: role === 'superadmin' ? 'Superadmin Company' : 'Admin Company',
                        invoice_prefix: 'INV',
                    })
                    .select('id')
                    .single();

                if (error) {
                    console.error('Error creating admin distributor profile:', error);
                    return null;
                }

                return created?.id || null;
            }

            if (role === 'salesperson') {
                // For salesperson: Get distributor_id from their ADMIN's profile using tenant_id
                // tenant_id is the admin's user_id, so we look up distributor_profiles.user_id = tenant_id
                if (!tenantId) {
                    console.error('Salesperson has no tenant_id assigned');
                    return null;
                }

                const { data, error } = await supabase
                    .from('distributor_profiles')
                    .select('id')
                    .eq('user_id', tenantId)
                    .maybeSingle();

                if (error) {
                    console.error('Error fetching admin distributor profile for salesperson:', error);
                    return null;
                }

                if (!data) {
                    console.error('No distributor profile found for tenant:', tenantId);
                    return null;
                }

                return data.id;
            }

            return null;
        },
        enabled: !!user && !!role,
        staleTime: 5 * 60 * 1000, // Cache for 5 minutes
        gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
        refetchOnMount: false, // Don't refetch on every mount
        refetchOnWindowFocus: false, // Don't refetch when window regains focus
        retry: 1,
    });
}
