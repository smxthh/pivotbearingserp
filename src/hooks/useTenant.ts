import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface TenantUser {
  user_id: string;
  email: string;
  role: string;
  created_at: string;
}

export function useTenant() {
  const { user, role, tenantId } = useAuth();

  // Fetch all users in the current tenant (for superadmin/admin)
  const { data: tenantUsers, isLoading: isLoadingUsers, refetch: refetchUsers } = useQuery({
    queryKey: ['tenant-users', tenantId],
    queryFn: async () => {
      if (!tenantId || (role !== 'superadmin' && role !== 'admin')) {
        return [];
      }

      // First get user_roles
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role, created_at')
        .eq('tenant_id', tenantId);

      if (rolesError) {
        console.error('Error fetching tenant user roles:', rolesError);
        return [];
      }

      if (!userRoles || userRoles.length === 0) {
        return [];
      }

      // Then get profiles for these users
      const userIds = userRoles.map(ur => ur.user_id);
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email')
        .in('id', userIds);

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
      }

      // Combine the data
      return userRoles.map((userRole) => {
        const profile = profiles?.find(p => p.id === userRole.user_id);
        return {
          user_id: userRole.user_id,
          email: profile?.email || 'Unknown',
          role: userRole.role,
          created_at: userRole.created_at,
        };
      });
    },
    enabled: !!tenantId && (role === 'superadmin' || role === 'admin'),
  });

  // Check if current user is the tenant owner (superadmin)
  const isTenantOwner = role === 'superadmin';

  // Check if user can manage other users
  const canManageUsers = role === 'superadmin' || role === 'admin';

  // Check if user can download data (superadmin only)
  const canDownloadData = role === 'superadmin';

  return {
    tenantId,
    tenantUsers: tenantUsers || [],
    isLoadingUsers,
    refetchUsers,
    isTenantOwner,
    canManageUsers,
    canDownloadData,
  };
}
