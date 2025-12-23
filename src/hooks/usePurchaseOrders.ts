/* eslint-disable @typescript-eslint/no-explicit-any */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useDistributorId } from '@/hooks/useDistributorProfile';
import { toast } from 'sonner';

export interface PurchaseOrderItem {
    id?: string;
    purchase_order_id?: string;
    item_id: string | null;
    item_name: string;
    hsn_code: string;
    quantity: number;
    unit: string;
    price: number;
    discount_percent: number;
    discount_amount: number;
    gst_percent: number;
    cgst_percent: number;
    sgst_percent: number;
    igst_percent: number;
    cgst_amount: number;
    sgst_amount: number;
    igst_amount: number;
    taxable_amount: number;
    net_amount: number;
    remark: string;
    sort_order: number;
}

export interface PurchaseOrder {
    id: string;
    distributor_id: string;
    po_prefix: string;
    po_number: number;
    po_full_number: string;
    po_date: string;
    party_id: string;
    party_gstin: string | null;
    transport_name: string | null;
    contact_person: string | null;
    contact_number: string | null;
    delivery_address: string | null;
    taxable_amount: number;
    cgst_amount: number;
    sgst_amount: number;
    igst_amount: number;
    round_off_amount: number;
    net_amount: number;
    gst_type: number;
    status: 'pending' | 'completed' | 'cancelled';
    remark: string | null;
    terms_conditions: any[];
    created_at: string;
    updated_at: string;
    // Joined data
    party_name?: string;
    items?: PurchaseOrderItem[];
}

export interface CreatePurchaseOrderData {
    po_prefix: string;
    po_number: number;
    po_full_number: string;
    po_date: string;
    party_id: string;
    party_gstin?: string;
    transport_name?: string;
    contact_person?: string;
    contact_number?: string;
    delivery_address?: string;
    taxable_amount: number;
    cgst_amount: number;
    sgst_amount: number;
    igst_amount: number;
    round_off_amount: number;
    net_amount: number;
    gst_type: number;
    remark?: string;
    terms_conditions?: any[];
    items: Omit<PurchaseOrderItem, 'id' | 'purchase_order_id' | 'sort_order'>[];
}

// Get current financial year prefix (e.g., "PO/25-26/")
export function getCurrentFYPrefix(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1; // 0-indexed

    // Financial year starts in April
    if (month >= 4) {
        const startYear = year % 100;
        const endYear = (year + 1) % 100;
        return `PO/${startYear}-${endYear}/`;
    } else {
        const startYear = (year - 1) % 100;
        const endYear = year % 100;
        return `PO/${startYear}-${endYear}/`;
    }
}

export function usePurchaseOrders() {
    const { data: distributorId } = useDistributorId();
    const queryClient = useQueryClient();

    // Fetch all purchase orders
    const { data: purchaseOrders = [], isLoading, refetch } = useQuery({
        queryKey: ['purchase_orders', distributorId],
        queryFn: async () => {
            if (!distributorId) return [];

            const { data, error } = await (supabase as any)
                .from('purchase_orders')
                .select(`
                    *,
                    parties:party_id (name)
                `)
                .eq('distributor_id', distributorId)
                .order('po_date', { ascending: false })
                .order('po_number', { ascending: false });

            if (error) {
                console.error('Error fetching purchase orders:', error);
                return [];
            }

            return (data || []).map((po: any) => ({
                ...po,
                party_name: po.parties?.name || 'Unknown',
            })) as PurchaseOrder[];
        },
        enabled: !!distributorId,
    });

    // Get next PO number
    const getNextPoNumber = async (prefix: string): Promise<number> => {
        if (!distributorId) return 1;

        const { data, error } = await (supabase as any)
            .rpc('get_next_po_number', {
                p_distributor_id: distributorId,
                p_prefix: prefix,
            });

        if (error) {
            console.error('Error getting next PO number:', error);
            // Fallback: manually calculate
            const existing = purchaseOrders.filter(po => po.po_prefix === prefix);
            return existing.length > 0
                ? Math.max(...existing.map(po => po.po_number)) + 1
                : 1;
        }

        return data || 1;
    };

    // Create purchase order
    const createPurchaseOrder = useMutation({
        mutationFn: async (orderData: CreatePurchaseOrderData) => {
            if (!distributorId) throw new Error('Distributor not found');

            const { items, ...headerData } = orderData;

            // Insert header
            const { data: poData, error: poError } = await (supabase as any)
                .from('purchase_orders')
                .insert({
                    distributor_id: distributorId,
                    ...headerData,
                    status: 'pending',
                })
                .select()
                .single();

            if (poError) throw poError;

            // Insert items
            if (items.length > 0) {
                const itemsWithPoId = items.map((item, index) => ({
                    ...item,
                    purchase_order_id: poData.id,
                    sort_order: index,
                }));

                const { error: itemsError } = await (supabase as any)
                    .from('purchase_order_items')
                    .insert(itemsWithPoId);

                if (itemsError) throw itemsError;
            }

            return poData;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['purchase_orders'] });
            toast.success('Purchase Order created successfully');
        },
        onError: (error: any) => {
            console.error('Error creating purchase order:', error);
            toast.error(`Failed to create purchase order: ${error.message}`);
        },
    });

    // Atomic Purchase Order Creation
    const createPurchaseOrderAtomic = useMutation({
        mutationFn: async (orderData: CreatePurchaseOrderData) => {
            if (!distributorId) throw new Error('Distributor not found');

            const { items, ...headerData } = orderData;

            // Generate full number explicitly if not present
            const poFullNumber = headerData.po_full_number || `${headerData.po_prefix}${headerData.po_number}`;

            const payload = {
                ...headerData,
                po_full_number: poFullNumber,
                distributor_id: distributorId,
                created_by: (await supabase.auth.getUser()).data.user?.id
            };

            const { data, error } = await (supabase.rpc as any)('create_purchase_order_atomic', {
                p_header: payload,
                p_items: items
            });

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['purchase_orders'] });
            toast.success('Purchase Order created successfully');
        },
        onError: (error: any) => {
            console.error('Error creating purchase order atomically:', error);
            toast.error(`Failed to create purchase order: ${error.message}`);
        },
    });

    // Update purchase order
    const updatePurchaseOrder = useMutation({
        mutationFn: async ({ id, data }: { id: string; data: Partial<CreatePurchaseOrderData> }) => {
            const { items, ...headerData } = data;

            // Update header
            const { error: poError } = await (supabase as any)
                .from('purchase_orders')
                .update(headerData)
                .eq('id', id);

            if (poError) throw poError;

            // Update items if provided
            if (items) {
                // Delete existing items
                await (supabase as any)
                    .from('purchase_order_items')
                    .delete()
                    .eq('purchase_order_id', id);

                // Insert new items
                if (items.length > 0) {
                    const itemsWithPoId = items.map((item, index) => ({
                        ...item,
                        purchase_order_id: id,
                        sort_order: index,
                    }));

                    const { error: itemsError } = await (supabase as any)
                        .from('purchase_order_items')
                        .insert(itemsWithPoId);

                    if (itemsError) throw itemsError;
                }
            }

            return { id };
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['purchase_orders'] });
            toast.success('Purchase Order updated successfully');
        },
        onError: (error: any) => {
            console.error('Error updating purchase order:', error);
            toast.error(`Failed to update purchase order: ${error.message}`);
        },
    });

    // Update status only
    const updateStatus = useMutation({
        mutationFn: async ({ id, status }: { id: string; status: 'pending' | 'completed' | 'cancelled' }) => {
            const { error } = await (supabase as any)
                .from('purchase_orders')
                .update({ status })
                .eq('id', id);

            if (error) throw error;
            return { id, status };
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['purchase_orders'] });
            queryClient.invalidateQueries({ queryKey: ['notifications'] }); // Sync notifications immediately
            toast.success(`Purchase Order marked as ${variables.status}`);
        },
        onError: (error: any) => {
            toast.error(`Failed to update status: ${error.message}`);
        },
    });

    // Delete purchase order
    const deletePurchaseOrder = useMutation({
        mutationFn: async (id: string) => {
            // Items are deleted via CASCADE
            const { error } = await (supabase as any)
                .from('purchase_orders')
                .delete()
                .eq('id', id);

            if (error) throw error;
            return id;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['purchase_orders'] });
            toast.success('Purchase Order deleted successfully');
        },
        onError: (error: any) => {
            toast.error(`Failed to delete purchase order: ${error.message}`);
        },
    });

    // Get single purchase order with items
    const getPurchaseOrderWithItems = async (id: string): Promise<PurchaseOrder | null> => {
        const { data: po, error: poError } = await (supabase as any)
            .from('purchase_orders')
            .select(`
                *,
                parties:party_id (name)
            `)
            .eq('id', id)
            .single();

        if (poError) {
            console.error('Error fetching purchase order:', poError);
            return null;
        }

        const { data: items, error: itemsError } = await (supabase as any)
            .from('purchase_order_items')
            .select('*')
            .eq('purchase_order_id', id)
            .order('sort_order', { ascending: true });

        if (itemsError) {
            console.error('Error fetching purchase order items:', itemsError);
        }

        return {
            ...po,
            party_name: po.parties?.name || 'Unknown',
            items: items || [],
        };
    };

    return {
        purchaseOrders,
        isLoading,
        refetch,
        getNextPoNumber,
        createPurchaseOrder,
        createPurchaseOrderAtomic,
        updatePurchaseOrder,
        updateStatus,
        deletePurchaseOrder,
        getPurchaseOrderWithItems,
    };
}

// Hook to get suppliers only (party_type = 'supplier' or 'both')
export function useSuppliers() {
    const { data: distributorId } = useDistributorId();

    const { data: suppliers = [], isLoading } = useQuery({
        queryKey: ['suppliers', distributorId],
        queryFn: async () => {
            if (!distributorId) return [];

            const { data, error } = await supabase
                .from('parties')
                .select('id, name, gst_number, city, state, type')
                .eq('distributor_id', distributorId)
                .eq('is_active', true)
                .order('name');

            if (error) {
                console.error('Error fetching suppliers:', error);
                return [];
            }

            // Return all parties - can filter by type client-side if needed
            return data || [];
        },
        enabled: !!distributorId,
    });

    return { suppliers, isLoading };
}
