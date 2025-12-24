import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useRealtimeSubscription } from './useRealtimeSubscription';
import { useEffect } from 'react';

// ============================================================================
// RESOURCE HIERARCHY - Maps all sidebar departments and pages
// ============================================================================
export interface ResourceNode {
    id: string;
    label: string;
    icon?: string;
    children?: ResourceNode[];
}

export const RESOURCE_HIERARCHY: ResourceNode[] = [
    {
        id: 'dept:main',
        label: 'Main',
        children: [
            { id: 'page:dashboard', label: 'Dashboard' },
            { id: 'page:parties', label: 'Party Master' },
            {
                id: 'dept:item_master',
                label: 'Item Master',
                children: [
                    { id: 'page:item_categories', label: 'Item Category' },
                    { id: 'page:products', label: 'Products' },
                    { id: 'page:services', label: 'Service Items' },
                    { id: 'page:brands', label: 'Brand Master' },
                ],
            },
            {
                id: 'dept:purchase',
                label: 'Purchase',
                children: [
                    { id: 'page:purchase_orders', label: 'Purchase Order' },
                    { id: 'page:purchase_invoice', label: 'Purchase Invoice' },
                ],
            },
            {
                id: 'dept:sales',
                label: 'Sales',
                children: [
                    { id: 'page:sales_enquiry', label: 'Sales Enquiry' },
                    { id: 'page:sales_quotation', label: 'Sales Quotation' },
                    { id: 'page:sales_order', label: 'Sales Order' },
                    { id: 'page:delivery_challan', label: 'Delivery Challan' },
                    { id: 'page:tax_invoice', label: 'Tax Invoice' },
                    { id: 'page:price_structure', label: 'Price Structure' },
                    { id: 'page:sales_zones', label: 'Sales Zone' },
                ],
            },
            {
                id: 'dept:store',
                label: 'Store',
                children: [
                    { id: 'page:store_location', label: 'Store Location' },
                    { id: 'page:gate_inward', label: 'Gate Inward' },
                    { id: 'page:marking', label: 'Marking' },
                    { id: 'page:packing', label: 'Packing' },
                    { id: 'page:opening_stock', label: 'Opening Stock' },
                ],
            },
        ],
    },
    {
        id: 'dept:features',
        label: 'Features',
        children: [
            {
                id: 'dept:accounting',
                label: 'Accounting',
                children: [
                    { id: 'page:ledger', label: 'Ledger' },
                    { id: 'page:debit_note', label: 'Debit Note' },
                    { id: 'page:credit_note', label: 'Credit Note' },
                    { id: 'page:gst_expense', label: 'GST Expense' },
                    { id: 'page:gst_income', label: 'GST Income' },
                    { id: 'page:gst_payment', label: 'GST Payment' },
                    { id: 'page:tcs_tds_payment', label: 'TCS/TDS Payment' },
                    { id: 'page:journal_entry', label: 'Journal Entry' },
                    { id: 'page:payment_voucher', label: 'Payment Voucher' },
                    { id: 'page:receivables', label: 'Receivables' },
                    { id: 'page:payables', label: 'Payables' },
                ],
            },
            {
                id: 'dept:reports',
                label: 'Reports',
                children: [
                    { id: 'page:sales_report', label: 'Sales Report' },
                    { id: 'page:purchase_report', label: 'Purchase Report' },
                    { id: 'page:top_customers', label: 'Top Customers' },
                    { id: 'page:top_products', label: 'Top Products' },
                    { id: 'page:state_wise_sales', label: 'State-wise Sales' },
                ],
            },
        ],
    },
    {
        id: 'dept:configuration',
        label: 'Configuration',
        children: [
            {
                id: 'dept:config',
                label: 'Configuration',
                children: [
                    { id: 'page:terms', label: 'Terms' },
                    { id: 'page:transport', label: 'Transport' },
                    { id: 'page:hsn_master', label: 'HSN Master' },
                    { id: 'page:tax_master', label: 'Tax Master' },
                    { id: 'page:expense_master', label: 'Expense Master' },
                    { id: 'page:group_master', label: 'Group Master' },
                    { id: 'page:tax_class', label: 'Tax Class' },
                    { id: 'page:voucher_prefix', label: 'Voucher Prefix' },
                ],
            },
        ],
    },
    {
        id: 'dept:tools',
        label: 'Tools',
        children: [
            { id: 'page:user_management', label: 'User Management' },
            { id: 'page:admin_permissions', label: 'Permissions' },
            { id: 'page:data_export', label: 'Data Export' },
            { id: 'page:profile', label: 'My Profile' },
        ],
    },
];

// Route to resource key mapping
export const ROUTE_TO_RESOURCE: Record<string, string> = {
    '/': 'page:dashboard',
    '/dashboard': 'page:dashboard',
    '/setup': 'page:dashboard', // Setup inherits dashboard access
    '/parties': 'page:parties',
    '/parties/new': 'page:parties',
    '/items': 'page:products', // Item list maps to products
    '/items/new': 'page:products',
    '/items/categories': 'page:item_categories',
    '/items/products': 'page:products',
    '/items/services': 'page:services',
    '/items/brands': 'page:brands',
    '/purchase-orders': 'page:purchase_orders',
    '/purchase/invoice': 'page:purchase_invoice',
    '/sales/new': 'page:sales_enquiry', // New sales maps to enquiry
    '/sales/enquiry': 'page:sales_enquiry',
    '/sales/quotation': 'page:sales_quotation',
    '/sales/order': 'page:sales_order',
    '/sales/challan': 'page:delivery_challan',
    '/sales/tax-invoice': 'page:tax_invoice',
    '/sales/price-structure': 'page:price_structure',
    '/sales/zones': 'page:sales_zones',
    '/store/location': 'page:store_location',
    '/store/gate-inward': 'page:gate_inward',
    '/store/marking': 'page:marking',
    '/store/packing': 'page:packing',
    '/store/opening-stock': 'page:opening_stock',
    '/accounting/ledger': 'page:ledger',
    '/accounting/debit-note': 'page:debit_note',
    '/accounting/credit-note': 'page:credit_note',
    '/accounting/gst-expense': 'page:gst_expense',
    '/accounting/gst-income': 'page:gst_income',
    '/accounting/gst-payment': 'page:gst_payment',
    '/accounting/tcs-tds-payment': 'page:tcs_tds_payment',
    '/accounting/journal-entry': 'page:journal_entry',
    '/accounting/payment-voucher': 'page:payment_voucher',
    '/accounting/receivables': 'page:receivables',
    '/accounting/payables': 'page:payables',
    '/reports/sales': 'page:sales_report',
    '/reports/purchase': 'page:purchase_report',
    '/reports/customers': 'page:top_customers',
    '/reports/products': 'page:top_products',
    '/reports/states': 'page:state_wise_sales',
    '/config/terms': 'page:terms',
    '/config/transport': 'page:transport',
    '/config/hsn': 'page:hsn_master',
    '/config/tax': 'page:tax_master',
    '/config/expense': 'page:expense_master',
    '/config/group': 'page:group_master',
    '/config/tax-class': 'page:tax_class',
    '/config/voucher-prefix': 'page:voucher_prefix',
    '/admin/users': 'page:user_management',
    '/admin/permissions': 'page:admin_permissions',
    '/admin/export': 'page:data_export',
    '/profile': 'page:profile',
};

// Sidebar nav item ID to resource key mapping
export const NAV_ITEM_TO_RESOURCE: Record<string, string> = {
    'Dashboard': 'page:dashboard',
    'Party Master': 'page:parties',
    'Item Master': 'dept:item_master',
    'Item Category': 'page:item_categories',
    'Products': 'page:products',
    'Service Items': 'page:services',
    'Brand Master': 'page:brands',
    'Purchase': 'dept:purchase',
    'Purchase Order': 'page:purchase_orders',
    'Purchase Invoice': 'page:purchase_invoice',
    'Sales': 'dept:sales',
    'Sales Enquiry': 'page:sales_enquiry',
    'Sales Quotation': 'page:sales_quotation',
    'Sales Order': 'page:sales_order',
    'Delivery Challan': 'page:delivery_challan',
    'Tax Invoice': 'page:tax_invoice',
    'Price Structure': 'page:price_structure',
    'Sales Zone': 'page:sales_zones',
    'Store': 'dept:store',
    'Store Location': 'page:store_location',
    'Gate Inward': 'page:gate_inward',
    'Marking': 'page:marking',
    'Packing': 'page:packing',
    'Opening Stock': 'page:opening_stock',
    'Accounting': 'dept:accounting',
    'Ledger': 'page:ledger',
    'Debit Note': 'page:debit_note',
    'Credit Note': 'page:credit_note',
    'GST Expense': 'page:gst_expense',
    'GST Income': 'page:gst_income',
    'GST Payment': 'page:gst_payment',
    'TCS/TDS Payment': 'page:tcs_tds_payment',
    'Journal Entry': 'page:journal_entry',
    'Payment Voucher': 'page:payment_voucher',
    'Receivables': 'page:receivables',
    'Payables': 'page:payables',
    'Reports': 'dept:reports',
    'Sales Report': 'page:sales_report',
    'Purchase Report': 'page:purchase_report',
    'Top Customers': 'page:top_customers',
    'Top Products': 'page:top_products',
    'State-wise Sales': 'page:state_wise_sales',
    'Configuration': 'dept:config',
    'Terms': 'page:terms',
    'Transport': 'page:transport',
    'HSN Master': 'page:hsn_master',
    'Tax Master': 'page:tax_master',
    'Expense Master': 'page:expense_master',
    'Group Master': 'page:group_master',
    'Tax Class': 'page:tax_class',
    'Voucher Prefix': 'page:voucher_prefix',
    'User Management': 'page:user_management',
    'Permissions': 'page:admin_permissions',
    'Data Export': 'page:data_export',
    'My Profile': 'page:profile',
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get all resource keys from a node and its children (flattened)
 */
export function getAllResourceKeys(nodes: ResourceNode[]): string[] {
    const keys: string[] = [];

    function traverse(node: ResourceNode) {
        keys.push(node.id);
        if (node.children) {
            node.children.forEach(traverse);
        }
    }

    nodes.forEach(traverse);
    return keys;
}

/**
 * Get all child resource keys for a parent node
 */
export function getChildResourceKeys(parentId: string, nodes: ResourceNode[]): string[] {
    const keys: string[] = [];

    function findAndCollect(nodes: ResourceNode[]): boolean {
        for (const node of nodes) {
            if (node.id === parentId) {
                // Found the parent, collect all children
                if (node.children) {
                    node.children.forEach(child => {
                        keys.push(child.id);
                        if (child.children) {
                            keys.push(...getAllResourceKeys(child.children));
                        }
                    });
                }
                return true;
            }
            if (node.children && findAndCollect(node.children)) {
                return true;
            }
        }
        return false;
    }

    findAndCollect(nodes);
    return keys;
}

// ============================================================================
// HOOKS
// ============================================================================

interface UserPermission {
    resource_key: string;
    access_level?: string;
}

/**
 * Hook to get the current user's permissions
 */
export function useUserPermissions() {
    const { user, isSuperadmin } = useAuth();
    const queryClient = useQueryClient();

    const queryKey = ['user_permissions', user?.id];

    const { data: permissions = [], isLoading, error } = useQuery({
        queryKey,
        queryFn: async () => {
            if (!user?.id) return [];

            // Use the RPC to get accessible resources
            const { data, error } = await (supabase.rpc as any)('get_user_accessible_resources', {
                p_user_id: user.id,
            });

            if (error) {
                console.error('Error fetching user permissions:', error);
                throw error;
            }

            const resourceKeys = (data as { resource_key: string }[])?.map(d => d.resource_key) || [];
            console.log('[useUserPermissions] Loaded permissions for user:', {
                userId: user.id,
                permissions: resourceKeys,
                count: resourceKeys.length
            });

            return resourceKeys;
        },
        enabled: !!user?.id,
        staleTime: 5 * 60 * 1000, // 5 minutes
    });

    // Real-time subscription for permissions changes
    useEffect(() => {
        if (!user?.id) return;

        const channel = supabase
            .channel(`user_permissions_${user.id}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'user_permissions',
                    filter: `user_id=eq.${user.id}`,
                },
                (payload) => {
                    console.log('[Realtime] User permissions changed:', payload.eventType);
                    queryClient.invalidateQueries({ queryKey });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user?.id, queryClient, queryKey]);

    // Check if resource is accessible
    const hasAccess = (resourceKey: string): boolean => {
        // Superadmin has access to everything
        if (isSuperadmin) return true;

        // Check for wildcard (returned for superadmin by RPC)
        if (permissions.includes('*')) return true;

        // Check exact match
        if (permissions.includes(resourceKey)) return true;

        return false;
    };

    // Check if user has any permissions (not completely empty)
    const hasAnyPermissions = isSuperadmin || permissions.length > 0;

    return {
        permissions,
        isLoading,
        error,
        hasAccess,
        hasAnyPermissions,
        isSuperadmin,
    };
}

/**
 * Hook to get permissions for a specific user (for admin management)
 */
export function useUserPermissionsForUser(userId: string | null) {
    const queryClient = useQueryClient();

    const queryKey = ['user_permissions_admin', userId];

    const { data: permissions = [], isLoading, error, refetch } = useQuery({
        queryKey,
        queryFn: async () => {
            if (!userId) return [];

            // Use type assertion since user_permissions is a new table not yet in generated types
            const { data, error } = await (supabase
                .from('user_permissions' as any)
                .select('resource_key, access_level')
                .eq('user_id', userId)) as any;

            if (error) {
                console.error('Error fetching user permissions:', error);
                throw error;
            }

            return (data as UserPermission[])?.map((d: UserPermission) => d.resource_key) || [];
        },
        enabled: !!userId,
        staleTime: 30 * 1000, // 30 seconds for admin view
    });

    // Real-time subscription for specific user's permissions
    useEffect(() => {
        if (!userId) return;

        const channel = supabase
            .channel(`admin_user_permissions_${userId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'user_permissions',
                    filter: `user_id=eq.${userId}`,
                },
                (payload) => {
                    console.log('[Realtime] Admin view - User permissions changed:', payload.eventType);
                    queryClient.invalidateQueries({ queryKey });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [userId, queryClient]);

    return {
        permissions,
        isLoading,
        error,
        refetch,
    };
}

/**
 * Hook to sync (save) user permissions
 */
export function useSyncUserPermissions() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            targetUserId,
            resourceKeys,
        }: {
            targetUserId: string;
            resourceKeys: string[];
        }) => {
            const { data, error } = await (supabase.rpc as any)('sync_user_permissions', {
                target_user_id: targetUserId,
                resource_keys: resourceKeys,
            });

            if (error) {
                console.error('Error syncing permissions:', error);
                throw error;
            }

            return data;
        },
        onSuccess: (_, variables) => {
            // Invalidate both the admin view and the user's own permissions cache
            queryClient.invalidateQueries({ queryKey: ['user_permissions_admin', variables.targetUserId] });
            queryClient.invalidateQueries({ queryKey: ['user_permissions', variables.targetUserId] });
        },
    });
}

/**
 * Hook to get list of admin users for the dropdown
 */
export function useAdminUsers() {
    return useQuery({
        queryKey: ['admin_users_for_permissions'],
        queryFn: async () => {
            // Get users with admin role (not superadmin)
            const { data: roles, error: rolesError } = await supabase
                .from('user_roles')
                .select('user_id, role')
                .eq('role', 'admin');

            if (rolesError) throw rolesError;

            const userIds = roles?.map(r => r.user_id) || [];

            if (userIds.length === 0) return [];

            const { data: profiles, error: profilesError } = await supabase
                .from('profiles')
                .select('id, email')
                .in('id', userIds);

            if (profilesError) throw profilesError;

            return profiles || [];
        },
        staleTime: 60 * 1000, // 1 minute
    });
}
