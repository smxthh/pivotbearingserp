import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useRealtimeSubscription } from './useRealtimeSubscription';
import { useDistributorId } from './useDistributorProfile';
import { toast } from 'sonner';

// ============================================
// TYPES
// ============================================

export type VoucherType =
    | 'purchase_invoice'
    | 'debit_note'
    | 'tax_invoice'
    | 'credit_note'
    | 'receipt_voucher'
    | 'payment_voucher'
    | 'journal_entry'
    | 'gst_payment'
    | 'tcs_tds_payment'
    | 'gst_journal'
    | 'gst_havala'
    | 'havala'
    | 'sales_enquiry'
    | 'sales_quotation'
    | 'sales_order'
    | 'delivery_challan';

export type VoucherStatus = 'draft' | 'confirmed' | 'cancelled';

export interface Voucher {
    id: string;
    distributor_id: string;
    voucher_type: VoucherType;
    voucher_number: string;
    voucher_date: string;
    party_id: string | null;
    party_name: string | null;
    reference_number: string | null;
    reference_voucher_id: string | null;
    narration: string | null;

    // Delivery Challan / PO specific
    customer_po_number: string | null;
    customer_po_date: string | null;
    transport_name: string | null;
    lr_number: string | null;
    ship_to: string | null;
    po_number: string | null; // For backward compatibility or alias

    // Amounts
    subtotal: number;
    discount_percent: number;
    discount_amount: number;
    taxable_amount: number;

    // GST
    cgst_amount: number;
    sgst_amount: number;
    igst_amount: number;
    cess_amount: number;
    total_tax: number;

    // Totals
    round_off: number;
    total_amount: number;

    // TDS/TCS
    tds_percent: number;
    tds_amount: number;
    tcs_percent: number;
    tcs_amount: number;

    // Status
    status: VoucherStatus;

    // Audit
    created_by: string | null;
    created_at: string;
    updated_at: string;

    // Joined fields
    party?: {
        id: string;
        name: string;
        gst_number: string | null;
        state: string;
    };
    items?: VoucherItem[];
}

export interface VoucherItem {
    id: string;
    voucher_id: string;
    item_id: string | null;
    item_name: string;
    item_sku: string | null;
    hsn_code: string | null;
    description: string | null;
    remarks: string | null;

    quantity: number;
    unit: string;
    rate: number;
    amount: number;

    discount_percent: number;
    discount_amount: number;
    taxable_amount: number;

    gst_percent: number;
    cgst_amount: number;
    sgst_amount: number;
    igst_amount: number;
    cess_percent: number;
    cess_amount: number;

    total_amount: number;
    line_order: number;
    created_at: string;
}

export interface VoucherInsert {
    voucher_type: VoucherType;
    voucher_number?: string;
    voucher_date: string;
    party_id?: string | null;
    party_name?: string | null;
    reference_number?: string | null;
    reference_voucher_id?: string | null;
    narration?: string | null;

    subtotal?: number;
    discount_percent?: number;
    discount_amount?: number;
    taxable_amount?: number;

    cgst_amount?: number;
    sgst_amount?: number;
    igst_amount?: number;
    cess_amount?: number;
    total_tax?: number;

    round_off?: number;
    total_amount: number;

    tds_percent?: number;
    tds_amount?: number;
    tcs_percent?: number;
    tcs_amount?: number;

    status?: VoucherStatus;
}

export interface VoucherItemInsert {
    item_id?: string | null;
    item_name: string;
    item_sku?: string | null;
    hsn_code?: string | null;
    description?: string | null;

    quantity: number;
    unit?: string;
    rate: number;
    amount: number;

    discount_percent?: number;
    discount_amount?: number;
    taxable_amount?: number;

    gst_percent?: number;
    cgst_amount?: number;
    sgst_amount?: number;
    igst_amount?: number;
    cess_percent?: number;
    cess_amount?: number;

    total_amount: number;
    line_order?: number;
}

export interface LedgerPostingItem {
    ledger_id: string;
    debit_amount: number;
    credit_amount: number;
    narration?: string;
}

// ============================================
// HOOK: useVouchers
// ============================================

interface UseVouchersOptions {
    voucherType?: VoucherType | VoucherType[];
    status?: VoucherStatus;
    partyId?: string;
    startDate?: string;
    endDate?: string;
    realtime?: boolean;
}

export function useVouchers(options: UseVouchersOptions = { realtime: true }) {
    const { user } = useAuth();
    const { data: distributorId } = useDistributorId();
    const queryClient = useQueryClient();
    const queryKey = [
        'vouchers',
        options.voucherType || 'all',
        options.status || 'all',
        options.partyId || 'all',
    ];

    // Real-time subscription (always called, enable parameter controls subscription)
    useRealtimeSubscription(
        options.realtime !== false ? 'vouchers' : '',
        queryKey as any,
        undefined,
        options.realtime !== false
    );

    // Fetch vouchers
    const {
        data: vouchers = [],
        isLoading,
        error,
        refetch,
    } = useQuery({
        queryKey,
        queryFn: async () => {
            let query = supabase
                .from('vouchers')
                .select(`
          *,
          party:parties(id, name, gst_number, state)
        `)
                .order('voucher_date', { ascending: false })
                .order('created_at', { ascending: false });

            if (options.voucherType) {
                if (Array.isArray(options.voucherType)) {
                    query = query.in('voucher_type', options.voucherType as any);
                } else {
                    query = query.eq('voucher_type', options.voucherType as any);
                }
            }
            if (options.status) {
                query = query.eq('status', options.status);
            }
            if (options.partyId) {
                query = query.eq('party_id', options.partyId);
            }
            if (options.startDate) {
                query = query.gte('voucher_date', options.startDate);
            }
            if (options.endDate) {
                query = query.lte('voucher_date', options.endDate);
            }

            const { data, error } = await query;

            if (error) {
                console.error('Error fetching vouchers:', error);
                throw error;
            }

            return data as unknown as Voucher[];
        },
        enabled: !!user,
        staleTime: 30000,
    });

    // Get voucher by ID with items
    const getVoucherById = async (id: string): Promise<Voucher | null> => {
        const { data: voucher, error: voucherError } = await supabase
            .from('vouchers')
            .select(`
        *,
        party:parties(id, name, gst_number, state)
      `)
            .eq('id', id)
            .single();

        if (voucherError) {
            console.error('Error fetching voucher:', voucherError);
            return null;
        }

        // Fetch items
        const { data: items, error: itemsError } = await supabase
            .from('voucher_items')
            .select('*')
            .eq('voucher_id', id)
            .order('line_order', { ascending: true });

        if (itemsError) {
            console.error('Error fetching voucher items:', itemsError);
        }

        return {
            ...voucher,
            items: items || [],
        } as unknown as Voucher;
    };

    // Generate voucher number
    const generateVoucherNumber = async (voucherType: VoucherType): Promise<string> => {
        if (!distributorId) throw new Error('Distributor ID not found');

        // Try RPC call (may not exist in all setups)
        try {
            const { data, error } = await supabase
                .rpc('generate_voucher_number' as any, {
                    p_distributor_id: distributorId,
                    p_voucher_type: voucherType,
                });

            if (!error && data && typeof data === 'string') {
                return data;
            }
        } catch (err) {
            console.log('RPC generate_voucher_number not available, using fallback');
        }

        // Fallback to client-side generation
        const prefixes: Record<VoucherType, string> = {
            purchase_invoice: 'PI',
            debit_note: 'DN',
            tax_invoice: 'TI',
            credit_note: 'CN',
            receipt_voucher: 'RV',
            payment_voucher: 'PV',
            journal_entry: 'JE',
            gst_payment: 'GST',
            tcs_tds_payment: 'TDS',
            gst_journal: 'GSTJV',
            gst_havala: 'GH',
            havala: 'HAV',
            sales_enquiry: 'ENQ',
            sales_quotation: 'QT',
            sales_order: 'SO',
            delivery_challan: 'DC',
        };
        const prefix = prefixes[voucherType];

        const now = new Date();
        const yymm = `${now.getFullYear().toString().slice(-2)}${(now.getMonth() + 1).toString().padStart(2, '0')}`;
        const random = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
        return `${prefix}-${yymm}-${random}`;
    };

    // Create voucher with items and ledger postings
    const createVoucher = useMutation({
        mutationFn: async ({
            voucher,
            items,
            ledgerPostings,
        }: {
            voucher: VoucherInsert;
            items: VoucherItemInsert[];
            ledgerPostings: LedgerPostingItem[];
        }) => {
            if (!distributorId) throw new Error('Distributor ID not found');

            // Generate voucher number if not provided
            let voucherNumber = (voucher as any).voucher_number;
            if (!voucherNumber) {
                voucherNumber = await generateVoucherNumber(voucher.voucher_type);
            }

            // Insert voucher
            const { data: newVoucher, error: voucherError } = await supabase
                .from('vouchers')
                .insert({
                    ...voucher,
                    distributor_id: distributorId,
                    voucher_number: voucherNumber,
                    created_by: user?.id,
                } as any)
                .select()
                .single();

            if (voucherError) {
                console.error('Error creating voucher:', voucherError);
                throw voucherError;
            }

            // Insert items
            if (items.length > 0) {
                const itemsWithVoucherId = items.map((item, index) => ({
                    ...item,
                    voucher_id: newVoucher.id,
                    line_order: index + 1,
                }));

                const { error: itemsError } = await supabase
                    .from('voucher_items')
                    .insert(itemsWithVoucherId);

                if (itemsError) {
                    console.error('Error creating voucher items:', itemsError);
                    throw itemsError;
                }
            }

            // Create ledger transactions
            if (ledgerPostings.length > 0) {
                const transactions = ledgerPostings.map(posting => ({
                    distributor_id: distributorId,
                    voucher_id: newVoucher.id,
                    ledger_id: posting.ledger_id,
                    transaction_date: voucher.voucher_date,
                    debit_amount: posting.debit_amount,
                    credit_amount: posting.credit_amount,
                    narration: posting.narration || voucher.narration,
                }));

                const { error: transactionError } = await supabase
                    .from('ledger_transactions')
                    .insert(transactions);

                if (transactionError) {
                    console.error('Error creating ledger transactions:', transactionError);
                    throw transactionError;
                }
            }

            return newVoucher as Voucher;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['vouchers'] });
            queryClient.invalidateQueries({ queryKey: ['ledgers'] });
            toast.success(`Voucher ${data.voucher_number} created successfully`);
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to create voucher');
        },
    });

    // Atomic RPC: Creates header + items in a single database transaction
    const createVoucherAtomic = useMutation({
        mutationFn: async ({ voucher, items, ledgerPostings }: { voucher: VoucherInsert; items: VoucherItemInsert[]; ledgerPostings?: LedgerPostingItem[] }) => {
            if (!distributorId) throw new Error('Distributor ID not found');

            const payload = {
                ...voucher,
                distributor_id: distributorId,
                created_by: user?.id,
            };

            const { data, error } = await (supabase.rpc as any)('create_voucher_atomic', {
                p_voucher: payload,
                p_items: items,
                p_ledgers: ledgerPostings || []
            });

            if (error) throw error;
            return data as Voucher;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['vouchers'] });
            queryClient.invalidateQueries({ queryKey: ['ledgers'] }); // Just in case
            toast.success(`Voucher ${data.voucher_number || 'created'} successfully`);
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to create voucher atomically');
        },
    });

    // Cancel voucher (reverses ledger entries)
    const cancelVoucher = useMutation({
        mutationFn: async (id: string) => {
            // Get the voucher
            const { data: voucher, error: fetchError } = await supabase
                .from('vouchers')
                .select('*')
                .eq('id', id)
                .single();

            if (fetchError) throw fetchError;

            // Delete existing ledger transactions (trigger will recalculate balances)
            const { error: deleteTransError } = await supabase
                .from('ledger_transactions')
                .delete()
                .eq('voucher_id', id);

            if (deleteTransError) {
                console.error('Error deleting ledger transactions:', deleteTransError);
                throw deleteTransError;
            }

            // Update voucher status to cancelled
            const { data, error } = await supabase
                .from('vouchers')
                .update({ status: 'cancelled' })
                .eq('id', id)
                .select()
                .single();

            if (error) {
                console.error('Error cancelling voucher:', error);
                throw error;
            }

            return data as Voucher;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['vouchers'] });
            queryClient.invalidateQueries({ queryKey: ['ledgers'] });
            toast.success(`Voucher ${data.voucher_number} cancelled`);
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to cancel voucher');
        },
    });

    // Summary calculations
    const totalAmount = vouchers
        .filter(v => v.status === 'confirmed')
        .reduce((sum, v) => sum + v.total_amount, 0);

    const totalTax = vouchers
        .filter(v => v.status === 'confirmed')
        .reduce((sum, v) => sum + v.total_tax, 0);

    const getNextVoucherNumberPreview = async (prefix: string): Promise<number> => {
        if (!distributorId) return 1;

        const { data, error } = await (supabase.rpc as any)('get_next_voucher_number_preview', {
            p_distributor_id: distributorId,
            p_prefix: prefix,
        });

        if (error) {
            console.error('Error fetching next voucher number:', error);
            return 1;
        }

        return data as number;
    };

    return {
        // Data
        vouchers,

        // Summary
        totalAmount,
        totalTax,
        count: vouchers.length,

        // Status
        isLoading,
        error,

        // Actions
        refetch,
        getVoucherById,
        generateVoucherNumber,
        getNextVoucherNumberPreview, // New preview function
        createVoucher,
        createVoucherAtomic,
        cancelVoucher,

        // Mutation states
        isCreating: createVoucher.isPending,
        isCancelling: cancelVoucher.isPending,
    };
}

// ============================================
// HOOK: useVoucher (Single voucher with items)
// ============================================

export function useVoucher(id: string | undefined) {
    const { user } = useAuth();

    // Real-time subscription
    useRealtimeSubscription('voucher_items', ['voucher', id, 'items']);

    const voucherQuery = useQuery({
        queryKey: ['voucher', id],
        queryFn: async () => {
            if (!id) return null;

            const { data: voucher, error: voucherError } = await supabase
                .from('vouchers')
                .select(`
          *,
          party:parties(id, name, gst_number, state)
        `)
                .eq('id', id)
                .single();

            if (voucherError) {
                console.error('Error fetching voucher:', voucherError);
                throw voucherError;
            }

            // Fetch items
            const { data: items } = await supabase
                .from('voucher_items')
                .select('*')
                .eq('voucher_id', id)
                .order('line_order', { ascending: true });

            return {
                ...voucher,
                items: items || [],
            } as unknown as Voucher;
        },
        enabled: !!user && !!id,
    });

    return {
        voucher: voucherQuery.data,
        isLoading: voucherQuery.isLoading,
        error: voucherQuery.error,
    };
}
