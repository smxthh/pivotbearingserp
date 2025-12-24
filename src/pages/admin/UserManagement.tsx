import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth, AppRole } from '@/contexts/AuthContext';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Users, Shield, ShieldCheck, UserCheck, RefreshCw, Download, Database, UserPlus, Mail, Send, Trash2, UserX } from 'lucide-react';
import { PageContainer } from '@/components/shared/PageContainer';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

interface UserWithRole {
  id: string;
  email: string;
  created_at: string;
  role: AppRole | null;
  role_id: string | null;
  tenant_id: string | null;
}

interface AdminOption {
  id: string;
  email: string;
  role: AppRole;
}

interface Invitation {
  id: string;
  email: string;
  role: AppRole;
  created_at: string;
  expires_at: string;
  accepted_at: string | null;
  tenant_id: string;
}

interface SelfSignupUser {
  id: string;
  email: string;
  created_at: string;
  email_confirmed_at: string | null;
}

const ROLE_CONFIG: Record<AppRole, { label: string; icon: React.ElementType; color: string }> = {
  superadmin: { label: 'Super Admin', icon: Database, color: 'text-purple-600' },
  admin: { label: 'Admin', icon: ShieldCheck, color: 'text-red-500' },
  salesperson: { label: 'Salesperson', icon: UserCheck, color: 'text-green-500' },
};

export default function UserManagement() {
  const { user: currentUser, isSuperadmin, tenantId } = useAuth();
  const [allUsers, setAllUsers] = useState<UserWithRole[]>([]);
  const [admins, setAdmins] = useState<AdminOption[]>([]);
  const [selectedAdminId, setSelectedAdminId] = useState<string>('all');
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePassword, setInvitePassword] = useState('');
  const [inviting, setInviting] = useState(false);
  const [selfSignupUsers, setSelfSignupUsers] = useState<SelfSignupUser[]>([]);
  const [deletingUser, setDeletingUser] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // Fetch ALL user roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('id, user_id, role, tenant_id');

      if (rolesError) throw rolesError;

      // Get all user IDs
      const userIds = roles?.map(r => r.user_id) || [];

      if (userIds.length === 0) {
        setAllUsers([]);
        setAdmins([]);
        setLoading(false);
        return;
      }

      // Fetch all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, created_at')
        .in('id', userIds)
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Combine data with tenant_id
      const usersWithRoles: UserWithRole[] = (profiles || [])
        .map(profile => {
          const userRole = roles?.find(r => r.user_id === profile.id);
          return {
            id: profile.id,
            email: profile.email,
            created_at: profile.created_at,
            role: userRole?.role as AppRole | null,
            role_id: userRole?.id || null,
            tenant_id: userRole?.tenant_id || null,
          };
        })
        .filter(u => u.role !== null);

      setAllUsers(usersWithRoles);

      // Extract admins (admin and superadmin) for the dropdown
      const adminUsers = usersWithRoles
        .filter(u => u.role === 'admin' || u.role === 'superadmin')
        .map(u => ({ id: u.id, email: u.email, role: u.role as AppRole }));
      setAdmins(adminUsers);

      // Fetch pending invitations
      const { data: invites, error: invitesError } = await supabase
        .from('user_invitations')
        .select('*')
        .is('accepted_at', null)
        .order('created_at', { ascending: false });

      if (!invitesError && invites) {
        setInvitations(invites as Invitation[]);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    if (isSuperadmin) {
      fetchSelfSignupUsers();
    }
  }, [isSuperadmin]);

  const handleDownloadData = async () => {
    if (!isSuperadmin) return;

    const toastId = toast.loading('Exporting all system data...');
    try {
      const wb = XLSX.utils.book_new();

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

  const fetchSelfSignupUsers = async () => {
    if (!isSuperadmin) return;

    try {
      // Use type assertion since this RPC is new and not yet in generated types
      const { data, error } = await (supabase.rpc as any)('get_self_signup_users');

      if (error) {
        console.error('Error fetching self-signup users:', error);
        return;
      }

      setSelfSignupUsers((data as SelfSignupUser[]) || []);
    } catch (error) {
      console.error('Error fetching self-signup users:', error);
    }
  };

  const permanentlyDeleteUser = async (userId: string, email: string) => {
    if (!isSuperadmin) return;

    if (!confirm(`⚠️ PERMANENT DELETE\n\nAre you sure you want to permanently delete "${email}"?\n\nThis user will:\n• Be removed from the authentication system\n• NOT be able to log in again with the same credentials\n• This action CANNOT be undone!`)) {
      return;
    }

    setDeletingUser(userId);
    try {
      const { data, error } = await supabase.functions.invoke('delete-user', {
        body: { userId },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success(`User ${email} permanently deleted. They cannot log in again.`);
      fetchSelfSignupUsers();
      fetchUsers();
    } catch (error: unknown) {
      console.error('Error permanently deleting user:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete user';
      toast.error(errorMessage);
    } finally {
      setDeletingUser(null);
    }
  };

  const handleInviteSalesperson = async () => {
    if (!inviteEmail || !invitePassword || !tenantId) return;

    if (invitePassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setInviting(true);
    try {
      const emailLower = inviteEmail.toLowerCase().trim();

      // Get company name for the notification
      const { data: distributorProfile } = await supabase
        .from('distributor_profiles')
        .select('company_name')
        .eq('user_id', tenantId)
        .single();

      const companyName = distributorProfile?.company_name || 'the company';

      // Call edge function to create salesperson with password and role
      const { data, error } = await supabase.functions.invoke('create-salesperson', {
        body: {
          email: emailLower,
          password: invitePassword,
          tenantId: tenantId,
          companyName: companyName,
          inviterEmail: currentUser?.email,
        },
      });

      if (error) {
        console.error('Edge function error:', error);
        throw error;
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      toast.success(
        `Salesperson account created for ${inviteEmail}. Share the login credentials with them.`,
        { duration: 6000 }
      );

      setInviteEmail('');
      setInvitePassword('');
      setInviteDialogOpen(false);
      fetchUsers();
    } catch (error: unknown) {
      console.error('Error creating salesperson:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create salesperson';
      toast.error(errorMessage);
    } finally {
      setInviting(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: AppRole | 'none') => {
    setUpdating(userId);
    try {
      const userToUpdate = allUsers.find(u => u.id === userId);

      if (newRole === 'none') {
        if (userToUpdate?.role_id) {
          const { error } = await supabase
            .from('user_roles')
            .delete()
            .eq('id', userToUpdate.role_id);

          if (error) throw error;
        }
      } else if (userToUpdate?.role_id) {
        // For admins assigning salesperson role, ensure tenant_id is set
        const updateData: any = { role: newRole };
        if (!isSuperadmin && newRole === 'salesperson') {
          updateData.tenant_id = tenantId;
        }

        const { error } = await supabase
          .from('user_roles')
          .update(updateData)
          .eq('id', userToUpdate.role_id);

        if (error) throw error;
      } else {
        // Insert new role with tenant_id
        const insertData: any = {
          user_id: userId,
          role: newRole,
        };

        // Set tenant_id based on role
        if (newRole === 'superadmin' || newRole === 'admin') {
          insertData.tenant_id = userId; // Their own tenant
        } else if (newRole === 'salesperson') {
          insertData.tenant_id = tenantId; // Current admin's tenant
        }

        const { error } = await supabase
          .from('user_roles')
          .insert(insertData);

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

  const cancelInvitation = async (invitationId: string) => {
    try {
      const { error } = await supabase
        .from('user_invitations')
        .delete()
        .eq('id', invitationId);

      if (error) throw error;
      toast.success('Invitation cancelled');
      fetchUsers();
    } catch (error) {
      console.error('Error cancelling invitation:', error);
      toast.error('Failed to cancel invitation');
    }
  };

  const deleteUser = async (userId: string, email: string) => {
    if (!isSuperadmin) return;

    if (!confirm(`Are you sure you want to delete user "${email}"? This action cannot be undone.`)) {
      return;
    }

    try {
      // First delete any user_roles
      await supabase.from('user_roles').delete().eq('user_id', userId);

      // Delete profile
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);

      if (profileError) throw profileError;

      toast.success(`User ${email} deleted successfully`);
      fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Failed to delete user. The user may need to be deleted from Supabase Auth directly.');
    }
  };

  // Filter users based on selected admin (for superadmin view) or tenant (for admin view)
  const getFilteredUsers = () => {
    if (!isSuperadmin) {
      // Admin view: only show users in their tenant
      return allUsers.filter(u => u.tenant_id === tenantId);
    }

    // Superadmin view: filter by selected admin
    if (selectedAdminId === 'all') {
      return allUsers;
    }
    return allUsers.filter(u => u.tenant_id === selectedAdminId);
  };

  const filteredUsers = getFilteredUsers();
  const assignedUsers = filteredUsers.filter(u => u.role);
  const unassignedUsers = allUsers.filter(u => !u.role);

  // Get admin name for display
  const getAdminName = (adminId: string) => {
    const admin = admins.find(a => a.id === adminId);
    return admin?.email || 'Unknown Admin';
  };

  // Filter invitations based on selected admin
  const filteredInvitations = isSuperadmin && selectedAdminId !== 'all'
    ? invitations.filter(i => i.tenant_id === selectedAdminId)
    : !isSuperadmin && tenantId
      ? invitations.filter(i => i.tenant_id === tenantId)
      : invitations;

  return (
    <PageContainer
      title="User Management"
      description={`Manage your team members and their roles`}
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
          <Button
            variant="default"
            size="sm"
            onClick={() => {
              setInviteEmail('');
              setInvitePassword('');
              setInviteDialogOpen(true);
            }}
            className="tracking-[-0.06em]"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Add Salesperson
          </Button>
          {isSuperadmin && (
            <Button
              variant="secondary"
              size="sm"
              onClick={handleDownloadData}
              className="tracking-[-0.06em]"
            >
              <Download className="w-4 h-4 mr-2" />
              Export Data
            </Button>
          )}
        </>
      }
    >
      {/* Admin Filter Dropdown - Only for Superadmin */}
      {isSuperadmin && admins.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-3">
            <Label className="text-sm font-medium whitespace-nowrap">Filter by Admin:</Label>
            <Select value={selectedAdminId} onValueChange={setSelectedAdminId}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Select admin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users ({allUsers.length})</SelectItem>
                {admins.map(admin => {
                  const teamCount = allUsers.filter(u => u.tenant_id === admin.id).length;
                  return (
                    <SelectItem key={admin.id} value={admin.id}>
                      {admin.email} ({teamCount})
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Pending Invitations */}
      {filteredInvitations.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-foreground tracking-[-0.06em] mb-4 flex items-center gap-2">
            <Mail className="w-5 h-5 text-amber-500" />
            Pending Invitations ({filteredInvitations.length})
          </h2>
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="divide-y divide-border">
              {filteredInvitations.map((invite) => (
                <div key={invite.id} className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
                      <Send className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate tracking-[-0.06em]">
                        {invite.email}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Invited as {ROLE_CONFIG[invite.role].label} • Expires {new Date(invite.expires_at).toLocaleDateString()}
                        {isSuperadmin && invite.tenant_id && (
                          <span className="ml-2">• Admin: {getAdminName(invite.tenant_id)}</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => cancelInvitation(invite.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    Cancel
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Assigned Users Section */}
      <div>
        <h2 className="text-lg font-semibold text-foreground tracking-[-0.06em] mb-4">
          Team Members ({assignedUsers.length})
        </h2>
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {assignedUsers.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No team members yet. Invite salespersons to get started.</p>
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
                  onDelete={deleteUser}
                  admins={admins}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Self-Signup Users Section - Only visible to Superadmin */}
      {isSuperadmin && selfSignupUsers.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-foreground tracking-[-0.06em] mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-amber-500" />
            Self-Signup Users ({selfSignupUsers.length})
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            Users who signed up without invitation. Assign a role or permanently delete.
          </p>
          <div className="bg-card border border-amber-500/30 rounded-xl overflow-hidden">
            <div className="divide-y divide-border">
              {selfSignupUsers.map((user) => (
                <div key={user.id} className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
                      <UserX className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate tracking-[-0.06em]">
                        {user.email}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Signed up: {new Date(user.created_at).toLocaleDateString()}
                        {user.email_confirmed_at && ' • Email confirmed'}
                        {!user.email_confirmed_at && ' • Email not confirmed'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Assign Role */}
                    <Select
                      onValueChange={(value) => handleRoleChange(user.id, value as AppRole)}
                      disabled={updating === user.id}
                    >
                      <SelectTrigger className="w-36 h-9 text-sm tracking-[-0.06em]">
                        <SelectValue placeholder="Assign role..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="superadmin">Super Admin</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="salesperson">Salesperson</SelectItem>
                      </SelectContent>
                    </Select>

                    {/* Permanent Delete */}
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => permanentlyDeleteUser(user.id, user.email)}
                      disabled={deletingUser === user.id}
                      className="h-9"
                    >
                      {deletingUser === user.id ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Trash2 className="w-4 h-4 mr-1" />
                          Delete
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Unassigned Users Section - Only visible to Superadmin */}
      {isSuperadmin && unassignedUsers.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-foreground tracking-[-0.06em] mb-4 flex items-center gap-2">
            <UserX className="w-5 h-5 text-destructive" />
            Unassigned Users ({unassignedUsers.length})
          </h2>
          <div className="bg-card border border-destructive/20 rounded-xl overflow-hidden">
            <div className="divide-y divide-border">
              {unassignedUsers.map((user) => (
                <UserRow
                  key={user.id}
                  user={user}
                  currentUserId={currentUser?.id}
                  updating={updating}
                  onRoleChange={handleRoleChange}
                  onDelete={deleteUser}
                  admins={admins}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Invite Dialog */}
      <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Salesperson</DialogTitle>
            <DialogDescription>
              Create a salesperson account. They will be automatically assigned to your company and can log in immediately with the provided credentials.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="salesperson-email">Email Address</Label>
              <Input
                id="salesperson-email"
                name="salesperson-new-email"
                type="email"
                autoComplete="off"
                placeholder="salesperson@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="salesperson-password">Password</Label>
              <Input
                id="salesperson-password"
                name="salesperson-new-password"
                type="password"
                autoComplete="new-password"
                placeholder="Enter password (min 6 characters)"
                value={invitePassword}
                onChange={(e) => setInvitePassword(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Share this password with the salesperson so they can log in.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleInviteSalesperson}
              disabled={!inviteEmail || !invitePassword || invitePassword.length < 6 || inviting}
            >
              {inviting ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <UserPlus className="w-4 h-4 mr-2" />}
              Create Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}

function UserRow({
  user,
  currentUserId,
  updating,
  onRoleChange,
  onDelete,
  admins,
}: {
  user: UserWithRole;
  currentUserId?: string;
  updating: string | null;
  onRoleChange: (userId: string, role: AppRole | 'none') => void;
  onDelete: (userId: string, email: string) => void;
  admins: AdminOption[];
}) {
  const { isSuperadmin } = useAuth();
  const isCurrentUser = user.id === currentUserId;
  const RoleIcon = user.role ? ROLE_CONFIG[user.role].icon : UserX;
  const roleColor = user.role ? ROLE_CONFIG[user.role].color : 'text-destructive';

  // Get admin name for salespersons
  const getAdminEmail = () => {
    if (user.role !== 'salesperson' || !user.tenant_id) return null;
    const admin = admins.find(a => a.id === user.tenant_id);
    return admin?.email;
  };
  const adminEmail = getAdminEmail();

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
            {user.role ? ROLE_CONFIG[user.role].label : 'No Role Assigned'} • Joined {new Date(user.created_at).toLocaleDateString()}
            {isSuperadmin && adminEmail && user.role === 'salesperson' && (
              <span className="ml-1">• of {adminEmail}</span>
            )}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Only superadmin can change roles */}
        {isSuperadmin && !isCurrentUser && (
          <Select
            value={user.role || 'none'}
            onValueChange={(value) => onRoleChange(user.id, value as AppRole | 'none')}
            disabled={updating === user.id}
          >
            <SelectTrigger className="w-36 h-9 text-sm tracking-[-0.06em]">
              <SelectValue placeholder="Select role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none" className="text-muted-foreground">
                No Role
              </SelectItem>
              <SelectItem value="superadmin">Super Admin</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="salesperson">Salesperson</SelectItem>
            </SelectContent>
          </Select>
        )}

        {/* Delete button for superadmin */}
        {isSuperadmin && !isCurrentUser && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDelete(user.id, user.email)}
            className="h-9 w-9 text-destructive hover:text-destructive hover:bg-destructive/10"
            title="Delete user"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        )}

        {updating === user.id && (
          <RefreshCw className="w-4 h-4 animate-spin text-muted-foreground" />
        )}
      </div>
    </div>
  );
}
