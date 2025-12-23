import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useDistributorProfile } from './useDistributorProfile';

export interface Notification {
    id: string;
    type: 'low_stock' | 'pending_order' | 'payment_due' | 'system';
    title: string;
    message: string;
    createdAt: Date;
    isRead: boolean;
    link?: string;
    severity: 'info' | 'warning' | 'error';
}

export function useNotifications() {
    const { profile } = useDistributorProfile();

    const { data: notifications = [], isLoading, refetch } = useQuery({
        queryKey: ['notifications', profile?.id],
        queryFn: async (): Promise<Notification[]> => {
            if (!profile?.id) return [];

            const allNotifications: Notification[] = [];

            // 1. Fetch OUT OF STOCK items (stock_quantity <= 0) - PRIORITY ALERT
            const { data: outOfStockItems, error: outOfStockError } = await supabase
                .from('items')
                .select('id, name, sku, stock_quantity')
                .eq('distributor_id', profile.id)
                .eq('is_active', true)
                .lte('stock_quantity', 0);

            if (!outOfStockError && outOfStockItems) {
                outOfStockItems.forEach(item => {
                    allNotifications.push({
                        id: `out_of_stock_${item.id}`,
                        type: 'low_stock',
                        title: 'Out of Stock!',
                        message: `${item.name} (${item.sku}) has ${item.stock_quantity || 0} units. Restock immediately!`,
                        createdAt: new Date(),
                        isRead: false,
                        link: '/items/products',
                        severity: 'error',
                    });
                });
            }

            // 2. Fetch LOW STOCK items (where 0 < stock_quantity < min_stock_qty)
            const { data: lowStockItems, error: lowStockError } = await supabase
                .from('items')
                .select('id, name, sku, stock_quantity, min_stock_qty')
                .eq('distributor_id', profile.id)
                .eq('is_active', true)
                .gt('stock_quantity', 0)
                .not('min_stock_qty', 'is', null);

            if (!lowStockError && lowStockItems) {
                const lowStock = lowStockItems.filter(
                    item => item.stock_quantity !== null &&
                        item.min_stock_qty !== null &&
                        item.stock_quantity < item.min_stock_qty
                );

                lowStock.forEach(item => {
                    allNotifications.push({
                        id: `low_stock_${item.id}`,
                        type: 'low_stock',
                        title: 'Low Stock Alert',
                        message: `${item.name} (${item.sku}) is running low. Current: ${item.stock_quantity}, Min: ${item.min_stock_qty}`,
                        createdAt: new Date(),
                        isRead: false,
                        link: '/items/products',
                        severity: 'warning',
                    });
                });
            }

            // 2. Fetch pending purchase orders
            const { data: pendingOrders, error: ordersError } = await supabase
                .from('purchase_orders')
                .select('id, po_number, created_at')
                .eq('distributor_id', profile.id)
                .eq('status', 'pending')
                .order('created_at', { ascending: false })
                .limit(5);

            if (!ordersError && pendingOrders) {
                pendingOrders.forEach(order => {
                    allNotifications.push({
                        id: `pending_po_${order.id}`,
                        type: 'pending_order',
                        title: 'Pending Purchase Order',
                        message: `PO ${order.po_number} is awaiting approval`,
                        createdAt: new Date(order.created_at),
                        isRead: false,
                        link: '/purchase-orders',
                        severity: 'info',
                    });
                });
            }

            // 3. Fetch overdue invoices (payment due)
            const today = new Date().toISOString().split('T')[0];
            const { data: overdueInvoices, error: invoicesError } = await supabase
                .from('invoices')
                .select('id, invoice_number, party_name, due_date, balance_due')
                .eq('distributor_id', profile.id)
                .eq('invoice_type', 'sales')
                .lt('due_date', today)
                .gt('balance_due', 0)
                .order('due_date', { ascending: true })
                .limit(5);

            if (!invoicesError && overdueInvoices) {
                overdueInvoices.forEach(invoice => {
                    allNotifications.push({
                        id: `overdue_${invoice.id}`,
                        type: 'payment_due',
                        title: 'Payment Overdue',
                        message: `Invoice ${invoice.invoice_number} from ${invoice.party_name} is overdue. Balance: ₹${invoice.balance_due?.toLocaleString('en-IN')}`,
                        createdAt: new Date(),
                        isRead: false,
                        link: '/accounting/receivables',
                        severity: 'error',
                    });
                });
            }

            // Sort by severity (error first, then warning, then info)
            const severityOrder = { error: 0, warning: 1, info: 2 };
            allNotifications.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

            return allNotifications;
        },
        enabled: !!profile?.id,
        staleTime: 1000 * 30, // 30 seconds - more real-time feel
        refetchInterval: 1000 * 60, // Refetch every 1 minute
        refetchOnWindowFocus: true, // Refetch when user returns to tab
    });

    const unreadCount = notifications.filter(n => !n.isRead).length;

    return {
        notifications,
        unreadCount,
        isLoading,
        refetch,
    };
}
