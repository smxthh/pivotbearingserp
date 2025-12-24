import { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { Shield, ChevronRight, RefreshCw, Save, Users, AlertCircle, Check, Search } from 'lucide-react';
import { PageContainer } from '@/components/shared/PageContainer';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
    useAdminUsers,
    useUserPermissionsForUser,
    useSyncUserPermissions,
    RESOURCE_HIERARCHY,
    ResourceNode,
    getAllResourceKeys,
    getChildResourceKeys,
} from '@/hooks/useUserPermissions';
import { useAuth } from '@/contexts/AuthContext';

// ============================================================================
// PERMISSION TREE COMPONENT
// ============================================================================

interface PermissionTreeProps {
    nodes: ResourceNode[];
    selectedKeys: Set<string>;
    onToggle: (key: string, include: boolean) => void;
    level?: number;
    searchQuery?: string;
}

function PermissionTree({ nodes, selectedKeys, onToggle, level = 0, searchQuery = '' }: PermissionTreeProps) {
    const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

    const toggleExpand = (nodeId: string) => {
        setExpandedNodes(prev => {
            const next = new Set(prev);
            if (next.has(nodeId)) {
                next.delete(nodeId);
            } else {
                next.add(nodeId);
            }
            return next;
        });
    };

    // Filter nodes based on search
    const filteredNodes = useMemo(() => {
        if (!searchQuery.trim()) return nodes;

        const query = searchQuery.toLowerCase();
        return nodes.filter(node => {
            const matchesNode = node.label.toLowerCase().includes(query);
            const matchesChildren = node.children?.some(child =>
                child.label.toLowerCase().includes(query) ||
                child.children?.some(subChild => subChild.label.toLowerCase().includes(query))
            );
            return matchesNode || matchesChildren;
        });
    }, [nodes, searchQuery]);

    return (
        <div className={cn('space-y-1', level > 0 && 'ml-6 mt-1')}>
            {filteredNodes.map(node => {
                const hasChildren = node.children && node.children.length > 0;
                const isExpanded = expandedNodes.has(node.id);
                const isSelected = selectedKeys.has(node.id);

                // Check if all children are selected (for partial state)
                const childKeys = hasChildren ? getAllResourceKeys(node.children!) : [];
                const selectedChildCount = childKeys.filter(k => selectedKeys.has(k)).length;
                const isPartiallySelected = hasChildren && selectedChildCount > 0 && selectedChildCount < childKeys.length;

                // Check if it's a department
                const isDepartment = node.id.startsWith('dept:');

                return (
                    <div key={node.id}>
                        <div
                            className={cn(
                                'flex items-center justify-between px-4 py-2.5 rounded-2xl',
                                isSelected && 'bg-primary/5',
                                !isSelected && 'hover:bg-slate-50'
                            )}
                        >
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                {/* Expand/Collapse Toggle */}
                                {hasChildren ? (
                                    <button
                                        onClick={() => toggleExpand(node.id)}
                                        className="p-1 hover:bg-slate-100 rounded-xl"
                                    >
                                        <ChevronRight className={cn(
                                            "w-4 h-4 text-slate-400 transition-transform",
                                            isExpanded && "rotate-90"
                                        )} />
                                    </button>
                                ) : (
                                    <div className="w-6" />
                                )}

                                {/* Selection indicator */}
                                <div className={cn(
                                    "w-5 h-5 rounded-lg flex items-center justify-center border",
                                    isSelected && "bg-primary border-primary",
                                    isPartiallySelected && !isSelected && "bg-amber-50 border-amber-300",
                                    !isSelected && !isPartiallySelected && "bg-white border-slate-200"
                                )}>
                                    {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                                    {isPartiallySelected && !isSelected && (
                                        <div className="w-2 h-0.5 bg-amber-500 rounded" />
                                    )}
                                </div>

                                {/* Node Label */}
                                <Label
                                    htmlFor={`toggle-${node.id}`}
                                    className={cn(
                                        'text-sm cursor-pointer select-none truncate',
                                        isSelected ? 'text-slate-900 font-medium' : 'text-slate-600',
                                        isDepartment && 'font-semibold'
                                    )}
                                >
                                    {node.label}
                                    {isDepartment && hasChildren && (
                                        <span className="ml-2 text-xs text-slate-400">
                                            ({node.children?.length})
                                        </span>
                                    )}
                                </Label>
                            </div>

                            {/* Toggle Switch */}
                            <Switch
                                id={`toggle-${node.id}`}
                                checked={isSelected}
                                onCheckedChange={(checked) => onToggle(node.id, checked)}
                            />
                        </div>

                        {/* Children */}
                        {hasChildren && isExpanded && (
                            <div className="ml-2 pl-4 border-l border-slate-200">
                                <PermissionTree
                                    nodes={node.children!}
                                    selectedKeys={selectedKeys}
                                    onToggle={onToggle}
                                    level={level + 1}
                                    searchQuery={searchQuery}
                                />
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================

export default function AdminPermissionsPage() {
    const { isSuperadmin } = useAuth();
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
    const [localPermissions, setLocalPermissions] = useState<Set<string>>(new Set());
    const [hasChanges, setHasChanges] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Fetch admin users for the dropdown
    const { data: adminUsers = [], isLoading: loadingUsers } = useAdminUsers();

    // Fetch permissions for selected user
    const {
        permissions: savedPermissions,
        isLoading: loadingPermissions,
        refetch: refetchPermissions,
    } = useUserPermissionsForUser(selectedUserId);

    // Sync mutation
    const syncMutation = useSyncUserPermissions();

    // Update local state when saved permissions change
    useEffect(() => {
        if (savedPermissions) {
            setLocalPermissions(new Set(savedPermissions));
            setHasChanges(false);
        }
    }, [savedPermissions]);

    // Handle toggle
    const handleToggle = (key: string, include: boolean) => {
        setLocalPermissions(prev => {
            const next = new Set(prev);

            if (include) {
                next.add(key);
                if (key.startsWith('dept:')) {
                    const childKeys = getChildResourceKeys(key, RESOURCE_HIERARCHY);
                    childKeys.forEach(k => next.add(k));
                }
            } else {
                next.delete(key);
                if (key.startsWith('dept:')) {
                    const childKeys = getChildResourceKeys(key, RESOURCE_HIERARCHY);
                    childKeys.forEach(k => next.delete(k));
                }
            }

            return next;
        });
        setHasChanges(true);
    };

    // Handle save
    const handleSave = async () => {
        if (!selectedUserId) return;

        try {
            await syncMutation.mutateAsync({
                targetUserId: selectedUserId,
                resourceKeys: Array.from(localPermissions),
            });

            toast.success('Permissions saved successfully!', {
                description: 'Changes will reflect on user\'s next page load.',
                duration: 2000,
            });
            setHasChanges(false);
        } catch (error) {
            console.error('Failed to save permissions:', error);
            toast.error('Failed to save permissions', {
                description: 'Please try again.',
            });
        }
    };

    // Handle select all / deselect all
    const handleSelectAll = () => {
        const allKeys = getAllResourceKeys(RESOURCE_HIERARCHY);
        setLocalPermissions(new Set(allKeys));
        setHasChanges(true);
    };

    const handleDeselectAll = () => {
        setLocalPermissions(new Set());
        setHasChanges(true);
    };

    // Get selected user email
    const selectedUserEmail = useMemo(() => {
        return adminUsers.find(u => u.id === selectedUserId)?.email || '';
    }, [adminUsers, selectedUserId]);

    // Check access
    if (!isSuperadmin) {
        return (
            <PageContainer
                title="Access Denied"
                description="You don't have permission to access this page"
                icon={Shield}
            >
                <div className="flex flex-col items-center justify-center py-20">
                    <div className="w-16 h-16 rounded-3xl bg-red-50 flex items-center justify-center mb-4">
                        <AlertCircle className="w-8 h-8 text-red-500" />
                    </div>
                    <h2 className="text-xl font-semibold text-slate-900 mb-2">Superadmin Access Required</h2>
                    <p className="text-slate-500 text-center max-w-md">
                        This page is only accessible to Superadmin users.
                    </p>
                </div>
            </PageContainer>
        );
    }

    return (
        <PageContainer
            title="Admin Permissions"
            description="Control access to features with granular permissions"
            icon={Shield}
            actions={
                <>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => refetchPermissions()}
                        disabled={!selectedUserId || loadingPermissions}
                        className="rounded-2xl"
                    >
                        <RefreshCw className={cn('w-4 h-4 mr-2', loadingPermissions && 'animate-spin')} />
                        Refresh
                    </Button>
                    {hasChanges && (
                        <Button
                            size="sm"
                            onClick={handleSave}
                            disabled={!selectedUserId || syncMutation.isPending}
                            className="rounded-2xl"
                        >
                            {syncMutation.isPending ? (
                                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                                <Save className="w-4 h-4 mr-2" />
                            )}
                            Save Changes
                        </Button>
                    )}
                </>
            }
        >
            {/* User Selector Card */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 mb-6">
                <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                        <Users className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1">
                        <Label className="text-sm font-medium text-slate-700 mb-1.5 block">
                            Select Admin User
                        </Label>
                        <Select
                            value={selectedUserId || ''}
                            onValueChange={(value) => {
                                setSelectedUserId(value || null);
                                setSearchQuery('');
                            }}
                            disabled={loadingUsers}
                        >
                            <SelectTrigger className="w-full max-w-md rounded-2xl">
                                <SelectValue placeholder={loadingUsers ? 'Loading users...' : 'Choose an admin to configure...'} />
                            </SelectTrigger>
                            <SelectContent className="rounded-2xl">
                                {adminUsers.map(user => (
                                    <SelectItem key={user.id} value={user.id} className="rounded-lg">
                                        {user.email}
                                    </SelectItem>
                                ))}
                                {adminUsers.length === 0 && !loadingUsers && (
                                    <div className="px-3 py-2 text-sm text-slate-500">
                                        No admin users found
                                    </div>
                                )}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Quick Actions */}
                {selectedUserId && (
                    <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleSelectAll}
                            className="rounded-xl"
                        >
                            Select All
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleDeselectAll}
                            className="rounded-xl"
                        >
                            Deselect All
                        </Button>
                        {hasChanges && (
                            <span className="text-sm text-amber-600 font-medium ml-auto">
                                Unsaved changes
                            </span>
                        )}
                    </div>
                )}
            </div>

            {/* Permission Tree */}
            {selectedUserId ? (
                <div className="bg-white border border-slate-200 rounded-3xl p-6">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-6 pb-6 border-b border-slate-100">
                        <div>
                            <h3 className="text-base font-semibold text-slate-900 mb-1">
                                Permissions for {selectedUserEmail}
                            </h3>
                            <p className="text-sm text-slate-500">
                                Toggle switches to grant or revoke access
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            {/* Search */}
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <Input
                                    placeholder="Search..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10 w-48 rounded-2xl"
                                />
                            </div>
                            {/* Counter */}
                            <div className="px-3 py-1.5 bg-slate-100 rounded-2xl text-sm font-medium text-slate-700">
                                {localPermissions.size} selected
                            </div>
                        </div>
                    </div>

                    {loadingPermissions ? (
                        <div className="flex flex-col items-center justify-center py-12">
                            <RefreshCw className="w-6 h-6 text-slate-400 animate-spin mb-2" />
                            <span className="text-sm text-slate-500">Loading permissions...</span>
                        </div>
                    ) : (
                        <PermissionTree
                            nodes={RESOURCE_HIERARCHY}
                            selectedKeys={localPermissions}
                            onToggle={handleToggle}
                            searchQuery={searchQuery}
                        />
                    )}
                </div>
            ) : (
                <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center">
                    <div className="w-16 h-16 rounded-3xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                        <Shield className="w-8 h-8 text-slate-400" />
                    </div>
                    <h3 className="text-base font-semibold text-slate-900 mb-2">
                        Select an Admin User
                    </h3>
                    <p className="text-sm text-slate-500 max-w-md mx-auto">
                        Choose an admin user from the dropdown above to manage their permissions.
                    </p>
                </div>
            )}
        </PageContainer>
    );
}
