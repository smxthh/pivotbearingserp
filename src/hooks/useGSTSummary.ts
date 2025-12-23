import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface GSTSummary {
    id: string;
    distributor_id: string;
    period_month: number;
    period_year: number;
    total_taxable_sales: number;
    total_output_cgst: number;
    total_output_sgst: number;
    total_output_igst: number;
    total_taxable_purchases: number;
    total_input_cgst: number;
    total_input_sgst: number;
    total_input_igst: number;
    net_gst_payable: number;
    gst_paid: number;
    gst_balance: number;
    created_at: string;
    updated_at: string;
}

interface UseGSTSummaryOptions {
    month?: number;
    year?: number;
}

export function useGSTSummary(options?: UseGSTSummaryOptions) {
    const { user } = useAuth();
    const currentDate = new Date();
    const month = options?.month || currentDate.getMonth() + 1;
    const year = options?.year || currentDate.getFullYear();

    const queryKey = ['gst-summary', month, year];

    const { data, isLoading, error, refetch } = useQuery({
        queryKey,
        queryFn: async () => {
            // Get Output GST from Tax Invoices
            const { data: salesVouchers, error: salesError } = await supabase
                .from('vouchers')
                .select('cgst_amount, sgst_amount, igst_amount, taxable_amount')
                .eq('voucher_type', 'tax_invoice')
                .eq('status', 'confirmed')
                .gte('voucher_date', `${year}-${month.toString().padStart(2, '0')}-01`)
                .lt('voucher_date', month === 12
                    ? `${year + 1}-01-01`
                    : `${year}-${(month + 1).toString().padStart(2, '0')}-01`
                );

            if (salesError) throw salesError;

            // Get Credit Notes (reduce output GST)
            const { data: creditNotes, error: cnError } = await supabase
                .from('vouchers')
                .select('cgst_amount, sgst_amount, igst_amount, taxable_amount')
                .eq('voucher_type', 'credit_note')
                .eq('status', 'confirmed')
                .gte('voucher_date', `${year}-${month.toString().padStart(2, '0')}-01`)
                .lt('voucher_date', month === 12
                    ? `${year + 1}-01-01`
                    : `${year}-${(month + 1).toString().padStart(2, '0')}-01`
                );

            if (cnError) throw cnError;

            // Get Input GST from Purchase Invoices
            const { data: purchaseVouchers, error: purchaseError } = await supabase
                .from('vouchers')
                .select('cgst_amount, sgst_amount, igst_amount, taxable_amount')
                .eq('voucher_type', 'purchase_invoice')
                .eq('status', 'confirmed')
                .gte('voucher_date', `${year}-${month.toString().padStart(2, '0')}-01`)
                .lt('voucher_date', month === 12
                    ? `${year + 1}-01-01`
                    : `${year}-${(month + 1).toString().padStart(2, '0')}-01`
                );

            if (purchaseError) throw purchaseError;

            // Get Debit Notes (reduce input GST)
            const { data: debitNotes, error: dnError } = await supabase
                .from('vouchers')
                .select('cgst_amount, sgst_amount, igst_amount, taxable_amount')
                .eq('voucher_type', 'debit_note')
                .eq('status', 'confirmed')
                .gte('voucher_date', `${year}-${month.toString().padStart(2, '0')}-01`)
                .lt('voucher_date', month === 12
                    ? `${year + 1}-01-01`
                    : `${year}-${(month + 1).toString().padStart(2, '0')}-01`
                );

            if (dnError) throw dnError;

            // Calculate Output GST (Sales - Credit Notes)
            const totalSales = salesVouchers?.reduce((sum, v) => sum + (v.taxable_amount || 0), 0) || 0;
            const creditNoteReduction = creditNotes?.reduce((sum, v) => sum + (v.taxable_amount || 0), 0) || 0;

            const outputCgst = (salesVouchers?.reduce((sum, v) => sum + (v.cgst_amount || 0), 0) || 0) -
                (creditNotes?.reduce((sum, v) => sum + (v.cgst_amount || 0), 0) || 0);
            const outputSgst = (salesVouchers?.reduce((sum, v) => sum + (v.sgst_amount || 0), 0) || 0) -
                (creditNotes?.reduce((sum, v) => sum + (v.sgst_amount || 0), 0) || 0);
            const outputIgst = (salesVouchers?.reduce((sum, v) => sum + (v.igst_amount || 0), 0) || 0) -
                (creditNotes?.reduce((sum, v) => sum + (v.igst_amount || 0), 0) || 0);

            // Calculate Input GST (Purchases - Debit Notes)
            const totalPurchases = purchaseVouchers?.reduce((sum, v) => sum + (v.taxable_amount || 0), 0) || 0;
            const debitNoteReduction = debitNotes?.reduce((sum, v) => sum + (v.taxable_amount || 0), 0) || 0;

            const inputCgst = (purchaseVouchers?.reduce((sum, v) => sum + (v.cgst_amount || 0), 0) || 0) -
                (debitNotes?.reduce((sum, v) => sum + (v.cgst_amount || 0), 0) || 0);
            const inputSgst = (purchaseVouchers?.reduce((sum, v) => sum + (v.sgst_amount || 0), 0) || 0) -
                (debitNotes?.reduce((sum, v) => sum + (v.sgst_amount || 0), 0) || 0);
            const inputIgst = (purchaseVouchers?.reduce((sum, v) => sum + (v.igst_amount || 0), 0) || 0) -
                (debitNotes?.reduce((sum, v) => sum + (v.igst_amount || 0), 0) || 0);

            // Net Payable
            const netCgst = outputCgst - inputCgst;
            const netSgst = outputSgst - inputSgst;
            const netIgst = outputIgst - inputIgst;
            const netPayable = netCgst + netSgst + netIgst;

            return {
                period: { month, year },
                sales: {
                    taxable: totalSales - creditNoteReduction,
                    cgst: outputCgst,
                    sgst: outputSgst,
                    igst: outputIgst,
                    total: outputCgst + outputSgst + outputIgst,
                },
                purchases: {
                    taxable: totalPurchases - debitNoteReduction,
                    cgst: inputCgst,
                    sgst: inputSgst,
                    igst: inputIgst,
                    total: inputCgst + inputSgst + inputIgst,
                },
                net: {
                    cgst: netCgst,
                    sgst: netSgst,
                    igst: netIgst,
                    payable: netPayable,
                },
                invoiceCounts: {
                    sales: salesVouchers?.length || 0,
                    creditNotes: creditNotes?.length || 0,
                    purchases: purchaseVouchers?.length || 0,
                    debitNotes: debitNotes?.length || 0,
                },
            };
        },
        enabled: !!user,
    });

    return {
        summary: data,
        isLoading,
        error,
        refetch,
    };
}
