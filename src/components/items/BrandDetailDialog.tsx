import { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
    BarChart3,
    TrendingUp,
    TrendingDown,
    Package,
    DollarSign,
    FileDown,
    X,
} from 'lucide-react';
import { BrandAnalytics } from '@/hooks/useBrandAnalytics';
import { Brand } from '@/hooks/useBrands';
import { formatCurrency } from '@/lib/constants';
import { Badge } from '@/components/ui/badge';

interface BrandDetailDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    brand: Brand | null;
    analytics: BrandAnalytics | undefined;
}

export function BrandDetailDialog({
    open,
    onOpenChange,
    brand,
    analytics,
}: BrandDetailDialogProps) {
    if (!brand) return null;

    const profit = (analytics?.total_sales || 0) - (analytics?.total_purchases || 0);
    const profitMargin = analytics?.total_sales
        ? ((profit / analytics.total_sales) * 100).toFixed(2)
        : '0.00';

    const handleExport = () => {
        // Create CSV data
        const csvData = [
            ['Brand Details'],
            [''],
            ['Brand Name', brand.name],
            ['Description', brand.description || '-'],
            ['Status', brand.is_active ? 'Active' : 'Inactive'],
            [''],
            ['Sales Metrics'],
            ['Total Sales', analytics?.total_sales || 0],
            ['Net Sales (After Credits)', analytics?.net_sales || 0],
            ['Units Sold', analytics?.units_sold || 0],
            [''],
            ['Purchase Metrics'],
            ['Total Purchases', analytics?.total_purchases || 0],
            ['Net Purchases (With Debits)', analytics?.net_purchases || 0],
            [''],
            ['Profitability'],
            ['Gross Profit', analytics?.gross_profit || 0],
            ['Profit Margin', `${analytics?.profit_margin?.toFixed(2) || '0.00'}%`],
            [''],
            ['Tax Information'],
            ['GST Collected (Output GST)', analytics?.gst_collected || 0],
            ['GST Paid (Input GST)', analytics?.gst_paid || 0],
            [''],
            ['Product Information'],
            ['Number of Products', analytics?.product_count || 0],
        ];

        const csvContent = csvData.map(row => row.join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${brand.name.replace(/\s+/g, '_')}_Analytics.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                                <BarChart3 className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <DialogTitle className="text-xl font-bold">{brand.name}</DialogTitle>
                                <p className="text-sm text-muted-foreground mt-0.5">
                                    {brand.description || 'No description'}
                                </p>
                            </div>
                        </div>
                        <Badge variant={brand.is_active ? 'default' : 'secondary'}>
                            {brand.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                    </div>
                </DialogHeader>

                <div className="space-y-6 mt-4">
                    {/* Export Button */}
                    <div className="flex justify-end">
                        <Button variant="outline" size="sm" onClick={handleExport}>
                            <FileDown className="h-4 w-4 mr-2" />
                            Export to Excel
                        </Button>
                    </div>

                    {/* Sales Metrics */}
                    <div>
                        <h3 className="text-sm font-semibold text-muted-foreground mb-3">
                            <TrendingUp className="h-4 w-4 inline mr-2" />
                            Sales Performance
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-green-50 rounded-lg border border-green-200 p-4">
                                <p className="text-xs text-green-600 font-medium mb-1">
                                    Total Sales Revenue
                                </p>
                                <p className="text-2xl font-bold text-green-700">
                                    {formatCurrency(analytics?.total_sales || 0)}
                                </p>
                            </div>
                            <div className="bg-green-50 rounded-lg border border-green-200 p-4">
                                <p className="text-xs text-green-600 font-medium mb-1">
                                    Units Sold
                                </p>
                                <p className="text-2xl font-bold text-green-700">
                                    {analytics?.units_sold || 0}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Purchase Metrics */}
                    <div>
                        <h3 className="text-sm font-semibold text-muted-foreground mb-3">
                            <TrendingDown className="h-4 w-4 inline mr-2" />
                            Purchase Activity
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-orange-50 rounded-lg border border-orange-200 p-4">
                                <p className="text-xs text-orange-600 font-medium mb-1">
                                    Total Purchases
                                </p>
                                <p className="text-2xl font-bold text-orange-700">
                                    {formatCurrency(analytics?.total_purchases || 0)}
                                </p>
                            </div>
                            <div className="bg-orange-50 rounded-lg border border-orange-200 p-4">
                                <p className="text-xs text-orange-600 font-medium mb-1">
                                    Number of Products
                                </p>
                                <p className="text-2xl font-bold text-orange-700">
                                    {analytics?.product_count || 0}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Profitability */}
                    <div>
                        <h3 className="text-sm font-semibold text-muted-foreground mb-3">
                            <DollarSign className="h-4 w-4 inline mr-2" />
                            Profitability Analysis
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className={`${profit >= 0 ? 'bg-blue-50 border-blue-200' : 'bg-red-50 border-red-200'} rounded-lg border p-4`}>
                                <p className={`text-xs ${profit >= 0 ? 'text-blue-600' : 'text-red-600'} font-medium mb-1`}>
                                    Net Profit/Loss
                                </p>
                                <p className={`text-2xl font-bold ${profit >= 0 ? 'text-blue-700' : 'text-red-700'}`}>
                                    {formatCurrency(profit)}
                                </p>
                            </div>
                            <div className={`${profit >= 0 ? 'bg-blue-50 border-blue-200' : 'bg-red-50 border-red-200'} rounded-lg border p-4`}>
                                <p className={`text-xs ${profit >= 0 ? 'text-blue-600' : 'text-red-600'} font-medium mb-1`}>
                                    Profit Margin
                                </p>
                                <p className={`text-2xl font-bold ${profit >= 0 ? 'text-blue-700' : 'text-red-700'}`}>
                                    {profitMargin}%
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* GST Information */}
                    <div>
                        <h3 className="text-sm font-semibold text-muted-foreground mb-3">
                            <Package className="h-4 w-4 inline mr-2" />
                            GST Summary
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-purple-50 rounded-lg border border-purple-200 p-4">
                                <p className="text-xs text-purple-600 font-medium mb-1">
                                    GST Collected
                                </p>
                                <p className="text-2xl font-bold text-purple-700">
                                    {formatCurrency(analytics?.gst_collected || 0)}
                                </p>
                            </div>
                            <div className="bg-purple-50 rounded-lg border border-purple-200 p-4">
                                <p className="text-xs text-purple-600 font-medium mb-1">
                                    GST Paid
                                </p>
                                <p className="text-2xl font-bold text-purple-700">
                                    {formatCurrency(analytics?.gst_paid || 0)}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Summary Table */}
                    <div>
                        <h3 className="text-sm font-semibold text-muted-foreground mb-3">
                            Data Summary
                        </h3>
                        <div className="bg-gray-50 rounded-lg border overflow-hidden">
                            <table className="w-full text-sm">
                                <tbody>
                                    <tr className="border-b">
                                        <td className="p-3 font-medium text-gray-600">Sales Revenue</td>
                                        <td className="p-3 text-right font-semibold">
                                            {formatCurrency(analytics?.total_sales || 0)}
                                        </td>
                                    </tr>
                                    <tr className="border-b">
                                        <td className="p-3 font-medium text-gray-600">Purchase Cost</td>
                                        <td className="p-3 text-right font-semibold">
                                            {formatCurrency(analytics?.total_purchases || 0)}
                                        </td>
                                    </tr>
                                    <tr className="border-b">
                                        <td className="p-3 font-medium text-gray-600">Net Profit</td>
                                        <td className={`p-3 text-right font-bold ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            {formatCurrency(profit)}
                                        </td>
                                    </tr>
                                    <tr className="border-b">
                                        <td className="p-3 font-medium text-gray-600">Profit Margin</td>
                                        <td className={`p-3 text-right font-bold ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            {profitMargin}%
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="p-3 font-medium text-gray-600">Product Count</td>
                                        <td className="p-3 text-right font-semibold">
                                            {analytics?.product_count || 0}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
