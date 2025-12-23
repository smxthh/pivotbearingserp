import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth, AppRole } from '@/contexts/AuthContext';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Users, Shield, ShieldCheck, UserCheck, RefreshCw, Download, Database, UserPlus, Mail, Send } from 'lucide-react';
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
}

interface Invitation {
  id: string;
  email: string;
  role: AppRole;
  created_at: string;
  expires_at: string;
  accepted_at: string | null;
}

const ROLE_CONFIG: Record<AppRole, { label: string; icon: React.ElementType; color: string }> = {
  superadmin: { label: 'Super Admin', icon: Database, color: 'text-purple-600' },
  admin: { label: 'Admin', icon: ShieldCheck, color: 'text-red-500' },
  salesperson: { label: 'Salesperson', icon: UserCheck, color: 'text-green-500' },
};

export default function UserManagement() {
  const { user: currentUser, isSuperadmin, tenantId } = useAuth();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // Fetch profiles - RLS will filter based on tenant for admins
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, created_at')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch user roles - RLS filters by tenant for admins
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('id, user_id, role');

      if (rolesError) throw rolesError;

      // Combine data - only show users that have roles visible to current user
      const usersWithRoles: UserWithRole[] = (profiles || [])
        .map(profile => {
          const userRole = roles?.find(r => r.user_id === profile.id);
          return {
            id: profile.id,
            email: profile.email,
            created_at: profile.created_at,
            role: userRole?.role as AppRole | null,
            role_id: userRole?.id || null,
          };
        })
        // For admins, only show users with roles (their tenant users)
        // Superadmin sees all
        .filter(u => isSuperadmin || u.role !== null);

      setUsers(usersWithRoles);

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
  }, []);

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

  const handleInviteSalesperson = async () => {
    if (!inviteEmail || !tenantId) return;

    setInviting(true);
    try {
      // First, create the invitation record
      const { data: invitation, error } = await supabase
        .from('user_invitations')
        .insert({
          email: inviteEmail.toLowerCase().trim(),
          role: 'salesperson',
          inviter_id: currentUser?.id,
          tenant_id: tenantId,
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          toast.error('This email has already been invited');
        } else {
          throw error;
        }
        return;
      }

      // Get inviter name and company name for the email
      const { data: inviterProfile } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', currentUser?.id)
        .single();

      const { data: distributorProfile } = await supabase
        .from('distributor_profiles')
        .select('company_name')
        .eq('user_id', tenantId)
        .single();

      const inviterName = inviterProfile?.email || 'Your admin';
      const companyName = distributorProfile?.company_name || 'the company';
      
      // Build the signup URL with invitation token
      const signupUrl = `${window.location.origin}/auth?invitation=${invitation.id}`;

      // Send invitation email via edge function
      const { data: emailResult, error: emailError } = await supabase.functions.invoke('send-invitation', {
        body: {
          email: inviteEmail.toLowerCase().trim(),
          inviterName,
          companyName,
          signupUrl,
        },
      });

      if (emailError) {
        console.error('Error sending invitation email:', emailError);
        toast.warning(`Invitation created but email failed to send. The user can still sign up using this link: ${signupUrl}`);
      } else if (emailResult?.success) {
        toast.success(`Invitation email sent to ${inviteEmail}`);
      } else {
        console.error('Email send failed:', emailResult);
        toast.warning(`Invitation created but email may not have been sent. Share this link with them: ${signupUrl}`);
      }

      setInviteEmail('');
      setInviteDialogOpen(false);
      fetchUsers();
    } catch (error) {
      console.error('Error sending invitation:', error);
      toast.error('Failed to send invitation');
    } finally {
      setInviting(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: AppRole | 'none') => {
    setUpdating(userId);
    try {
      const userToUpdate = users.find(u => u.id === userId);

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

  const assignedUsers = users.filter(u => u.role);

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
            onClick={() => setInviteDialogOpen(true)}
            className="tracking-[-0.06em]"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Invite Salesperson
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
      {/* Pending Invitations */}
      {invitations.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-foreground tracking-[-0.06em] mb-4 flex items-center gap-2">
            <Mail className="w-5 h-5 text-amber-500" />
            Pending Invitations ({invitations.length})
          </h2>
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="divide-y divide-border">
              {invitations.map((invite) => (
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
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Invite Dialog */}
      <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Invite Salesperson</DialogTitle>
            <DialogDescription>
              Send an invitation email to add a new salesperson to your team. They will be automatically assigned to your company when they sign up.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="salesperson@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleInviteSalesperson} disabled={!inviteEmail || inviting}>
              {inviting ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
              Send Invitation
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
            {user.role ? ROLE_CONFIG[user.role].label : 'No Role'} • Joined {new Date(user.created_at).toLocaleDateString()}
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

        {updating === user.id && (
          <RefreshCw className="w-4 h-4 animate-spin text-muted-foreground" />
        )}
      </div>
    </div>
  );
}
