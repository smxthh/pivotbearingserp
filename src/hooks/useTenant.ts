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

      const { data, error } = await supabase
        .from('user_roles')
        .select(`
          user_id,
          role,
          created_at,
          profiles!inner(email)
        `)
        .eq('tenant_id', tenantId);

      if (error) {
        console.error('Error fetching tenant users:', error);
        return [];
      }

      return data?.map((item: any) => ({
        user_id: item.user_id,
        email: item.profiles?.email || 'Unknown',
        role: item.role,
        created_at: item.created_at,
      })) || [];
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
