import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth, AppRole } from '@/contexts/AuthContext';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Users, Shield, ShieldCheck, UserCheck, Trash2, RefreshCw, Download, Database } from 'lucide-react';
import { PageContainer } from '@/components/shared/PageContainer';

interface UserWithRole {
  id: string;
  email: string;
  created_at: string;
  role: AppRole | null;
  role_id: string | null;
}

const ROLE_CONFIG: Record<AppRole, { label: string; icon: React.ElementType; color: string }> = {
  superadmin: { label: 'Super Admin', icon: Database, color: 'text-purple-600' },
  admin: { label: 'Admin', icon: ShieldCheck, color: 'text-red-500' },
  distributor: { label: 'Distributor', icon: Shield, color: 'text-blue-500' },
  salesperson: { label: 'Salesperson', icon: UserCheck, color: 'text-green-500' },
};

export default function UserManagement() {
  const { user: currentUser, isSuperadmin } = useAuth();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // Fetch all profiles (admin can see all)
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, created_at')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch all user roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('id, user_id, role');

      if (rolesError) throw rolesError;

      // Combine data
      const usersWithRoles: UserWithRole[] = (profiles || []).map(profile => {
        const userRole = roles?.find(r => r.user_id === profile.id);
        return {
          id: profile.id,
          email: profile.email,
          created_at: profile.created_at,
          role: userRole?.role as AppRole | null,
          role_id: userRole?.id || null,
        };
      });

      setUsers(usersWithRoles);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleDownloadData = async () => {
    if (!isSuperadmin) return;

    const toastId = toast.loading('Exporting all system data...');
    try {
      const wb = XLSX.utils.book_new();

      // Define tables to export
      const tables = [
        'distributor_profiles',
        'parties',
        'invoices',
        'items',
        'salespersons',
        'brands',
        'categories'
      ];

      for (const table of tables) {
        const { data, error } = await supabase.from(table as any).select('*');
        if (error) throw error;

        if (data && data.length > 0) {
          const ws = XLSX.utils.json_to_sheet(data);
          XLSX.utils.book_append_sheet(wb, ws, table);
        }
      }

      XLSX.writeFile(wb, `ERP_Full_Backup_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success('Data exported successfully', { id: toastId });
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Failed to export data', { id: toastId });
    }
  };

  const handleRoleChange = async (userId: string, newRole: AppRole | 'none') => {
    setUpdating(userId);
    try {
      const userToUpdate = users.find(u => u.id === userId);

      if (newRole === 'none') {
        // Remove role
        if (userToUpdate?.role_id) {
          const { error } = await supabase
            .from('user_roles')
            .delete()
            .eq('id', userToUpdate.role_id);

          if (error) throw error;
        }
      } else if (userToUpdate?.role_id) {
        // Update existing role
        const { error } = await supabase
          .from('user_roles')
          .update({ role: newRole as any })
          .eq('id', userToUpdate.role_id);

        if (error) throw error;
      } else {
        // Insert new role
        const { error } = await supabase
          .from('user_roles')
          .insert({ user_id: userId, role: newRole as any });

        if (error) throw error;
      }

      toast.success(`Role ${newRole === 'none' ? 'removed' : 'updated'} successfully`);
      await fetchUsers();
    } catch (error) {
      console.error('Error updating role:', error);
      toast.error('Failed to update role');
    } finally {
      setUpdating(null);
    }
  };

  const pendingUsers = users.filter(u => !u.role);
  const assignedUsers = users.filter(u => u.role);

  return (
    <PageContainer
      title="User Management"
      description={`Manage user roles and permissions (Current Role: ${currentUser?.email} - ${isSuperadmin ? 'Superadmin' : 'Admin'})`}
      icon={Users}
      actions={
        <>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchUsers}
            disabled={loading}
            className="tracking-[-0.06em]"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {isSuperadmin && (
            <Button
              variant="default"
              size="sm"
              onClick={handleDownloadData}
              className="tracking-[-0.06em]"
            >
              <Download className="w-4 h-4 mr-2" />
              Download All Data
            </Button>
          )}
        </>
      }
    >
      {/* Pending Verification Section */}
      {
        pendingUsers.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-foreground tracking-[-0.06em] mb-4 flex items-center gap-2">
              <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
              Pending Verification ({pendingUsers.length})
            </h2>
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="divide-y divide-border">
                {pendingUsers.map((user) => (
                  <UserRow
                    key={user.id}
                    user={user}
                    currentUserId={currentUser?.id}
                    updating={updating}
                    onRoleChange={handleRoleChange}
                  />
                ))}
              </div>
            </div>
          </div>
        )
      }

      {/* Assigned Users Section */}
      <div>
        <h2 className="text-lg font-semibold text-foreground tracking-[-0.06em] mb-4">
          Assigned Users ({assignedUsers.length})
        </h2>
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {assignedUsers.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No users with assigned roles</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {assignedUsers.map((user) => (
                <UserRow
                  key={user.id}
                  user={user}
                  currentUserId={currentUser?.id}
                  updating={updating}
                  onRoleChange={handleRoleChange}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </PageContainer >
  );
}

function UserRow({
  user,
  currentUserId,
  updating,
  onRoleChange,
}: {
  user: UserWithRole;
  currentUserId?: string;
  updating: string | null;
  onRoleChange: (userId: string, role: AppRole | 'none') => void;
}) {
  const { isSuperadmin } = useAuth();
  const isCurrentUser = user.id === currentUserId;
  const RoleIcon = user.role ? ROLE_CONFIG[user.role].icon : Users;
  const roleColor = user.role ? ROLE_CONFIG[user.role].color : 'text-muted-foreground';

  return (
    <div className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
      <div className="flex items-center gap-4 min-w-0 flex-1">
        <div className={`w-10 h-10 rounded-full bg-muted flex items-center justify-center ${roleColor}`}>
          <RoleIcon className="w-5 h-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground truncate tracking-[-0.06em]">
            {user.email}
            {isCurrentUser && (
              <span className="ml-2 text-xs text-muted-foreground">(You)</span>
            )}
          </p>
          <p className="text-xs text-muted-foreground">
            Joined {new Date(user.created_at).toLocaleDateString()}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Select
          value={user.role || 'none'}
          onValueChange={(value) => onRoleChange(user.id, value as AppRole | 'none')}
          disabled={updating === user.id || isCurrentUser}
        >
          <SelectTrigger className="w-36 h-9 text-sm tracking-[-0.06em]">
            <SelectValue placeholder="Select role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none" className="text-muted-foreground">
              No Role
            </SelectItem>
            {isSuperadmin && <SelectItem value="superadmin">Super Admin</SelectItem>}
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="distributor">Distributor</SelectItem>
            <SelectItem value="salesperson">Salesperson</SelectItem>
          </SelectContent>
        </Select>

        {updating === user.id && (
          <RefreshCw className="w-4 h-4 animate-spin text-muted-foreground" />
        )}
      </div>
    </div>
  );
}
