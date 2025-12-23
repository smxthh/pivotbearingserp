import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useDistributorId } from './useDistributorProfile';
import { useRealtimeSubscription } from './useRealtimeSubscription';

export interface ReceivablePayable {
    party_id: string;
    party_name: string;
    party_type: string;
    phone: string | null;
    state: string;
    gst_number: string | null;
    opening_balance: number;
    total_invoiced: number;
    total_paid: number;
    total_credit_notes: number;
    outstanding_balance: number;
    last_transaction_date: string | null;
    earliest_due_date: string | null;
    invoice_count: number;
}

/**
 * Hook to fetch Receivables (amounts owed by customers)
 * With real-time updates when vouchers change
 */
export function useReceivables() {
    const { user } = useAuth();
    const { data: distributorId } = useDistributorId();
    const queryKey = ['receivables', distributorId];

    // Real-time subscriptions for vouchers and parties
    useRealtimeSubscription('vouchers', queryKey, undefined, !!distributorId);
    useRealtimeSubscription('parties', queryKey, undefined, !!distributorId);

    const { data: receivables = [], isLoading, error, refetch } = useQuery({
        queryKey,
        queryFn: async () => {
            if (!distributorId) return [];
            return await fetchReceivables(distributorId);
        },
        enabled: !!user && !!distributorId,
        staleTime: 30000, // Reduced stale time for more responsive updates
    });

    const totalReceivable = receivables.reduce((sum, r) => sum + Math.max(0, r.outstanding_balance), 0);
    const partyCount = receivables.filter(r => r.outstanding_balance > 0).length;

    return {
        receivables,
        totalReceivable,
        partyCount,
        isLoading,
        error,
        refetch,
    };
}

/**
 * Hook to fetch Payables (amounts we owe to suppliers)
 * With real-time updates when vouchers change
 */
export function usePayables() {
    const { user } = useAuth();
    const { data: distributorId } = useDistributorId();
    const queryKey = ['payables', distributorId];

    // Real-time subscriptions for vouchers and parties
    useRealtimeSubscription('vouchers', queryKey, undefined, !!distributorId);
    useRealtimeSubscription('parties', queryKey, undefined, !!distributorId);

    const { data: payables = [], isLoading, error, refetch } = useQuery({
        queryKey,
        queryFn: async () => {
            if (!distributorId) return [];
            return await fetchPayables(distributorId);
        },
        enabled: !!user && !!distributorId,
        staleTime: 30000, // Reduced stale time for more responsive updates
    });

    const totalPayable = payables.reduce((sum, p) => sum + Math.max(0, p.outstanding_balance), 0);
    const partyCount = payables.filter(p => p.outstanding_balance > 0).length;

    return {
        payables,
        totalPayable,
        partyCount,
        isLoading,
        error,
        refetch,
    };
}

// Fetch receivables from customers
async function fetchReceivables(distributorId: string): Promise<ReceivablePayable[]> {
    // Get all customer parties
    const { data: parties, error: partiesError } = await supabase
        .from('parties')
        .select('id, name, type, phone, state, gst_number, opening_balance, current_balance')
        .eq('distributor_id', distributorId)
        .in('type', ['customer', 'both']);

    if (partiesError) {
        console.error('Error fetching parties:', partiesError);
        throw partiesError;
    }

    if (!parties || parties.length === 0) {
        return [];
    }

    const partyIds = parties.map(p => p.id);

    // Get all relevant vouchers for these parties (only confirmed)
    const { data: vouchers, error: vouchersError } = await supabase
        .from('vouchers')
        .select('party_id, voucher_type, total_amount, voucher_date, due_date, status')
        .eq('distributor_id', distributorId)
        .eq('status', 'confirmed') // Only include confirmed vouchers
        .in('party_id', partyIds)
        .in('voucher_type', ['tax_invoice', 'credit_note', 'receipt_voucher'] as any);

    if (vouchersError) {
        console.error('Error fetching vouchers:', vouchersError);
        throw vouchersError;
    }

    // Calculate balances per party
    const balanceMap = new Map<string, {
        invoiced: number;
        paid: number;
        credits: number;
        lastDate: string | null;
        earliestDueDate: string | null;
        count: number;
    }>();

    vouchers?.forEach(v => {
        if (!v.party_id) return;

        const current = balanceMap.get(v.party_id) || {
            invoiced: 0,
            paid: 0,
            credits: 0,
            lastDate: null,
            earliestDueDate: null,
            count: 0,
        };

        const amount = v.total_amount || 0;
        
        if (v.voucher_type === 'tax_invoice') {
            current.invoiced += amount;
            current.count += 1;
            // Track earliest due date for unpaid invoices
            if (v.due_date) {
                if (!current.earliestDueDate || v.due_date < current.earliestDueDate) {
                    current.earliestDueDate = v.due_date;
                }
            }
        } else if (v.voucher_type === 'receipt_voucher') {
            current.paid += amount;
        } else if (v.voucher_type === 'credit_note') {
            current.credits += amount;
        }

        if (!current.lastDate || v.voucher_date > current.lastDate) {
            current.lastDate = v.voucher_date;
        }

        balanceMap.set(v.party_id, current);
    });

    // Build result array
    const result: ReceivablePayable[] = [];
    parties.forEach(party => {
        const balance = balanceMap.get(party.id);
        const openingBalance = Number(party.opening_balance) || 0;
        
        if (balance || openingBalance !== 0) {
            const invoiced = balance?.invoiced || 0;
            const paid = balance?.paid || 0;
            const credits = balance?.credits || 0;
            const outstanding = openingBalance + invoiced - paid - credits;

            result.push({
                party_id: party.id,
                party_name: party.name,
                party_type: party.type,
                phone: party.phone,
                state: party.state,
                gst_number: party.gst_number,
                opening_balance: openingBalance,
                total_invoiced: invoiced,
                total_paid: paid,
                total_credit_notes: credits,
                outstanding_balance: outstanding,
                last_transaction_date: balance?.lastDate || null,
                earliest_due_date: balance?.earliestDueDate || null,
                invoice_count: balance?.count || 0,
            });
        }
    });

    return result.sort((a, b) => b.outstanding_balance - a.outstanding_balance);
}

// Fetch payables to suppliers
async function fetchPayables(distributorId: string): Promise<ReceivablePayable[]> {
    // Get all supplier parties
    const { data: parties, error: partiesError } = await supabase
        .from('parties')
        .select('id, name, type, phone, state, gst_number, opening_balance, current_balance')
        .eq('distributor_id', distributorId)
        .in('type', ['supplier', 'both']);

    if (partiesError) {
        console.error('Error fetching parties:', partiesError);
        throw partiesError;
    }

    if (!parties || parties.length === 0) {
        return [];
    }

    const partyIds = parties.map(p => p.id);

    // Get all relevant vouchers for these parties (only confirmed)
    const { data: vouchers, error: vouchersError } = await supabase
        .from('vouchers')
        .select('party_id, voucher_type, total_amount, voucher_date, due_date, status')
        .eq('distributor_id', distributorId)
        .eq('status', 'confirmed') // Only include confirmed vouchers
        .in('party_id', partyIds)
        .in('voucher_type', ['purchase_invoice', 'debit_note', 'payment_voucher'] as any);

    if (vouchersError) {
        console.error('Error fetching vouchers:', vouchersError);
        throw vouchersError;
    }

    // Calculate balances per party
    const balanceMap = new Map<string, {
        billed: number;
        paid: number;
        debits: number;
        lastDate: string | null;
        earliestDueDate: string | null;
        count: number;
    }>();

    vouchers?.forEach(v => {
        if (!v.party_id) return;

        const current = balanceMap.get(v.party_id) || {
            billed: 0,
            paid: 0,
            debits: 0,
            lastDate: null,
            earliestDueDate: null,
            count: 0,
        };

        const amount = v.total_amount || 0;

        if ((v.voucher_type as string) === 'purchase_invoice') {
            current.billed += amount;
            current.count += 1;
            // Track earliest due date for unpaid invoices
            if (v.due_date) {
                if (!current.earliestDueDate || v.due_date < current.earliestDueDate) {
                    current.earliestDueDate = v.due_date;
                }
            }
        } else if ((v.voucher_type as string) === 'payment_voucher') {
            current.paid += amount;
        } else if ((v.voucher_type as string) === 'debit_note') {
            current.debits += amount;
        }

        if (!current.lastDate || v.voucher_date > current.lastDate) {
            current.lastDate = v.voucher_date;
        }

        balanceMap.set(v.party_id, current);
    });

    // Build result array
    const result: ReceivablePayable[] = [];
    parties.forEach(party => {
        const balance = balanceMap.get(party.id);
        const openingBalance = -(Number(party.opening_balance) || 0);
        
        if (balance || openingBalance !== 0) {
            const billed = balance?.billed || 0;
            const paid = balance?.paid || 0;
            const debits = balance?.debits || 0;
            const outstanding = openingBalance + billed - paid - debits;

            result.push({
                party_id: party.id,
                party_name: party.name,
                party_type: party.type,
                phone: party.phone,
                state: party.state,
                gst_number: party.gst_number,
                opening_balance: openingBalance,
                total_invoiced: billed,
                total_paid: paid,
                total_credit_notes: debits,
                outstanding_balance: outstanding,
                last_transaction_date: balance?.lastDate || null,
                earliest_due_date: balance?.earliestDueDate || null,
                invoice_count: balance?.count || 0,
            });
        }
    });

    return result.sort((a, b) => b.outstanding_balance - a.outstanding_balance);
}
