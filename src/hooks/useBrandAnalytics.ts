import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useDistributorId } from './useDistributorProfile';

export interface BrandAnalytics {
    brand_id: string;
    brand_name: string;
    total_sales: number;
    total_purchases: number;
    credit_notes: number;
    debit_notes: number;
    net_sales: number; // Sales - Credit Notes
    net_purchases: number; // Purchases + Debit Notes
    gross_profit: number; // Net Sales - Net Purchases
    profit_margin: number; // (Gross Profit / Net Sales) * 100
    units_sold: number;
    gst_collected: number; // Output GST
    gst_paid: number; // Input GST
    product_count: number;
}

export interface BrandAnalyticsSummary {
    total_sales: number;
    total_purchases: number;
    total_profit: number;
    top_brand: string | null;
    top_brand_sales: number;
}

interface UseBrandAnalyticsOptions {
    startDate?: string;
    endDate?: string;
}

/**
 * Hook to calculate brand-level analytics by aggregating voucher data
 * 
 * Data Flow:
 * brands → items.brand_id → voucher_items.item_id → vouchers
 */
export function useBrandAnalytics(options: UseBrandAnalyticsOptions = {}) {
    const { data: distributorId } = useDistributorId();

    const { data, isLoading, error, refetch } = useQuery({
        queryKey: ['brand-analytics', distributorId, options.startDate, options.endDate],
        queryFn: async (): Promise<{ brands: BrandAnalytics[]; summary: BrandAnalyticsSummary }> => {
            if (!distributorId) {
                return { brands: [], summary: { total_sales: 0, total_purchases: 0, total_profit: 0, top_brand: null, top_brand_sales: 0 } };
            }

            // Step 1: Get all brands
            const { data: brandsData, error: brandsError } = await supabase
                .from('brands')
                .select('id, name')
                .eq('distributor_id', distributorId)
                .eq('is_active', true);

            if (brandsError) throw brandsError;
            if (!brandsData || brandsData.length === 0) {
                return { brands: [], summary: { total_sales: 0, total_purchases: 0, total_profit: 0, top_brand: null, top_brand_sales: 0 } };
            }

            // Step 2: Get all items with their brand_id
            const { data: itemsData, error: itemsError } = await supabase
                .from('items')
                .select('id, brand_id, name')
                .eq('distributor_id', distributorId)
                .not('brand_id', 'is', null);

            if (itemsError) throw itemsError;

            // Create a map of item_id -> brand_id
            const itemToBrandMap = new Map<string, string>();
            (itemsData || []).forEach((item: any) => {
                if (item.brand_id) {
                    itemToBrandMap.set(item.id, item.brand_id);
                }
            });

            // Step 3: Get vouchers with their items
            let vouchersQuery = supabase
                .from('vouchers')
                .select(`
                    id,
                    voucher_type,
                    voucher_date,
                    total_amount,
                    cgst_amount,
                    sgst_amount,
                    igst_amount,
                    status,
                    voucher_items (
                        item_id,
                        quantity,
                        total_amount,
                        cgst_amount,
                        sgst_amount,
                        igst_amount
                    )
                `)
                .eq('distributor_id', distributorId)
                .eq('status', 'confirmed')
                .in('voucher_type', ['tax_invoice', 'purchase_invoice', 'credit_note', 'debit_note']);

            // Apply date filters
            if (options.startDate) {
                vouchersQuery = vouchersQuery.gte('voucher_date', options.startDate);
            }
            if (options.endDate) {
                vouchersQuery = vouchersQuery.lte('voucher_date', options.endDate);
            }

            const { data: vouchersData, error: vouchersError } = await vouchersQuery;

            if (vouchersError) throw vouchersError;

            // Step 4: Aggregate by brand
            const brandStats = new Map<string, {
                sales: number;
                purchases: number;
                creditNotes: number;
                debitNotes: number;
                unitsSold: number;
                gstCollected: number;
                gstPaid: number;
            }>();

            // Initialize stats for all brands
            brandsData.forEach((brand: any) => {
                brandStats.set(brand.id, {
                    sales: 0,
                    purchases: 0,
                    creditNotes: 0,
                    debitNotes: 0,
                    unitsSold: 0,
                    gstCollected: 0,
                    gstPaid: 0,
                });
            });

            // Process vouchers
            (vouchersData || []).forEach((voucher: any) => {
                const voucherItems = voucher.voucher_items || [];

                voucherItems.forEach((item: any) => {
                    if (!item.item_id) return;

                    const brandId = itemToBrandMap.get(item.item_id);
                    if (!brandId) return;

                    const stats = brandStats.get(brandId);
                    if (!stats) return;

                    const amount = item.total_amount || 0;
                    const gst = (item.cgst_amount || 0) + (item.sgst_amount || 0) + (item.igst_amount || 0);
                    const qty = item.quantity || 0;

                    switch (voucher.voucher_type) {
                        case 'tax_invoice':
                            stats.sales += amount;
                            stats.unitsSold += qty;
                            stats.gstCollected += gst;
                            break;
                        case 'purchase_invoice':
                            stats.purchases += amount;
                            stats.gstPaid += gst;
                            break;
                        case 'credit_note':
                            stats.creditNotes += amount;
                            stats.gstCollected -= gst; // Reduce collected GST
                            break;
                        case 'debit_note':
                            stats.debitNotes += amount;
                            stats.gstPaid -= gst; // Reduce paid GST
                            break;
                    }
                });
            });

            // Step 5: Count products per brand
            const productCountByBrand = new Map<string, number>();
            (itemsData || []).forEach((item: any) => {
                if (item.brand_id) {
                    productCountByBrand.set(item.brand_id, (productCountByBrand.get(item.brand_id) || 0) + 1);
                }
            });

            // Step 6: Build final analytics array
            const analytics: BrandAnalytics[] = brandsData.map((brand: any) => {
                const stats = brandStats.get(brand.id)!;
                const netSales = stats.sales - stats.creditNotes;
                const netPurchases = stats.purchases + stats.debitNotes;
                const grossProfit = netSales - netPurchases;
                const profitMargin = netSales > 0 ? (grossProfit / netSales) * 100 : 0;

                return {
                    brand_id: brand.id,
                    brand_name: brand.name,
                    total_sales: stats.sales,
                    total_purchases: stats.purchases,
                    credit_notes: stats.creditNotes,
                    debit_notes: stats.debitNotes,
                    net_sales: netSales,
                    net_purchases: netPurchases,
                    gross_profit: grossProfit,
                    profit_margin: profitMargin,
                    units_sold: stats.unitsSold,
                    gst_collected: stats.gstCollected,
                    gst_paid: stats.gstPaid,
                    product_count: productCountByBrand.get(brand.id) || 0,
                };
            });

            // Sort by sales descending
            analytics.sort((a, b) => b.total_sales - a.total_sales);

            // Calculate summary
            const summary: BrandAnalyticsSummary = {
                total_sales: analytics.reduce((sum, b) => sum + b.net_sales, 0),
                total_purchases: analytics.reduce((sum, b) => sum + b.net_purchases, 0),
                total_profit: analytics.reduce((sum, b) => sum + b.gross_profit, 0),
                top_brand: analytics.length > 0 ? analytics[0].brand_name : null,
                top_brand_sales: analytics.length > 0 ? analytics[0].net_sales : 0,
            };

            return { brands: analytics, summary };
        },
        enabled: !!distributorId,
        staleTime: 60000, // 1 minute
    });

    return {
        brandAnalytics: data?.brands || [],
        summary: data?.summary || { total_sales: 0, total_purchases: 0, total_profit: 0, top_brand: null, top_brand_sales: 0 },
        isLoading,
        error,
        refetch,
    };
}

/**
 * Get analytics for a single brand (for detailed report)
 */
export function useSingleBrandAnalytics(brandId: string | undefined, options: UseBrandAnalyticsOptions = {}) {
    const { brandAnalytics, isLoading } = useBrandAnalytics(options);

    const brandData = brandId ? brandAnalytics.find(b => b.brand_id === brandId) : null;

    return {
        brandData,
        isLoading,
    };
}
