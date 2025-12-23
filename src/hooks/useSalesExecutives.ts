import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface SalesExecutive {
    id: string;
    email: string;
    name?: string;
}

export function useSalesExecutives() {
    const { data: salesExecutives = [], isLoading, error, refetch } = useQuery({
        queryKey: ['sales-executives'],
        queryFn: async () => {
            // Fetch user_roles with salesperson role
            const { data: roles, error: rolesError } = await supabase
                .from('user_roles')
                .select('user_id')
                .eq('role', 'salesperson');

            if (rolesError) throw rolesError;

            if (!roles || roles.length === 0) return [];

            const userIds = roles.map(r => r.user_id);

            // Fetch profiles for these users
            const { data: profiles, error: profilesError } = await supabase
                .from('profiles')
                .select('id, email')
                .in('id', userIds);

            if (profilesError) throw profilesError;

            return (profiles || []).map(profile => ({
                id: profile.id,
                email: profile.email,
                name: profile.email.split('@')[0], // Use email prefix as name
            }));
        },
    });

    return {
        salesExecutives,
        isLoading,
        error,
        refetch,
    };
}
