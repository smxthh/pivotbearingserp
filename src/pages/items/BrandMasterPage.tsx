import { useState } from 'react';
import {
    Plus,
    Search,
    Edit2,
    Trash2,
    RefreshCw,
    Tag,
    FileDown,
    RotateCcw,
    TrendingUp,
    TrendingDown,
    DollarSign,
    Package,
    BarChart3,
} from 'lucide-react';
import { PageContainer } from '@/components/shared/PageContainer';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { BrandDialog } from '@/components/items/BrandDialog';
import { BrandDetailDialog } from '@/components/items/BrandDetailDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useBrands, Brand } from '@/hooks/useBrands';
import { useBrandAnalytics, BrandAnalytics } from '@/hooks/useBrandAnalytics';
import { formatCurrency } from '@/lib/constants';

export default function BrandMasterPage() {
    const [search, setSearch] = useState('');
    const [pageSize, setPageSize] = useState(25);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [showInactive, setShowInactive] = useState(false);
    const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);
    const [detailDialogOpen, setDetailDialogOpen] = useState(false);

    const { brands, isLoading, deleteBrand, updateBrand, isDeleting, refetch } = useBrands();
    const { brandAnalytics, summary, isLoading: isLoadingAnalytics, refetch: refetchAnalytics } = useBrandAnalytics();

    // Create a map for quick analytics lookup
    const analyticsMap = new Map<string, BrandAnalytics>();
    brandAnalytics.forEach(a => analyticsMap.set(a.brand_id, a));

    // Filter by search and active status
    const filteredBrands = brands.filter((b) => {
        const matchesSearch =
            b.name.toLowerCase().includes(search.toLowerCase()) ||
            (b.description?.toLowerCase() || '').includes(search.toLowerCase());

        // If showing inactive, show ONLY inactive; otherwise show ONLY active
        const matchesStatus = showInactive ? !b.is_active : b.is_active;

        return matchesSearch && matchesStatus;
    });

    const handleAddBrand = () => {
        setEditingBrand(null);
        setDialogOpen(true);
    };

    const handleEditBrand = (brand: Brand) => {
        setEditingBrand(brand);
        setDialogOpen(true);
    };

    const handleDelete = () => {
        if (deleteId) {
            deleteBrand.mutate(deleteId, {
                onSuccess: () => setDeleteId(null),
            });
        }
    };

    const handleReactivate = (brandId: string) => {
        updateBrand.mutate(
            { id: brandId, updates: { is_active: true } },
            {
                onSuccess: () => refetch(),
            }
        );
    };

    const handleRefresh = async () => {
        await Promise.all([refetch(), refetchAnalytics()]);
    };

    // Loading skeleton
    if (isLoading) {
        return (
            <PageContainer title="Brand Master">
                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        {[...Array(4)].map((_, i) => (
                            <Skeleton key={i} className="h-24 rounded-xl" />
                        ))}
                    </div>
                    <div className="flex items-center gap-4">
                        <Skeleton className="h-10 w-64" />
                        <Skeleton className="h-10 w-32" />
                        <Skeleton className="h-10 w-28 ml-auto" />
                    </div>
                    <div className="bg-card rounded-xl border overflow-hidden">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="flex items-center gap-4 p-4 border-b last:border-b-0">
                                <Skeleton className="h-5 w-40" />
                                <Skeleton className="h-5 w-64" />
                            </div>
                        ))}
                    </div>
                </div>
            </PageContainer>
        );
    }

    return (
        <PageContainer
            title="Brand Master"
            actions={
                <Button onClick={handleAddBrand} className="rounded-lg">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Brand
                </Button>
            }
        >
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {/* Total Sales */}
                <div className="bg-white rounded-xl border p-4 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                            <TrendingUp className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Total Sales</p>
                            <p className="text-xl font-bold text-green-600">
                                {formatCurrency(summary.total_sales)}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Total Purchases */}
                <div className="bg-white rounded-xl border p-4 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center">
                            <TrendingDown className="h-5 w-5 text-orange-600" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Total Purchases</p>
                            <p className="text-xl font-bold text-orange-600">
                                {formatCurrency(summary.total_purchases)}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Net Profit */}
                <div className="bg-white rounded-xl border p-4 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className={`h-10 w-10 rounded-full ${summary.total_profit >= 0 ? 'bg-blue-100' : 'bg-red-100'} flex items-center justify-center`}>
                            <DollarSign className={`h-5 w-5 ${summary.total_profit >= 0 ? 'text-blue-600' : 'text-red-600'}`} />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Net Profit</p>
                            <p className={`text-xl font-bold ${summary.total_profit >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                                {formatCurrency(summary.total_profit)}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Top Brand */}
                <div className="bg-white rounded-xl border p-4 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                            <BarChart3 className="h-5 w-5 text-purple-600" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Top Brand</p>
                            <p className="text-lg font-bold text-purple-600 truncate">
                                {summary.top_brand || 'N/A'}
                            </p>
                            {summary.top_brand && (
                                <p className="text-xs text-muted-foreground">
                                    {formatCurrency(summary.top_brand_sales)}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Controls Row */}
            <div className="flex flex-wrap items-center gap-4 mb-4 p-3 bg-muted/30 rounded-lg border">
                <Select
                    value={pageSize.toString()}
                    onValueChange={(v) => setPageSize(Number(v))}
                >
                    <SelectTrigger className="w-[140px] rounded-lg bg-white">
                        <SelectValue placeholder="Show rows" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="10">Show 10 rows</SelectItem>
                        <SelectItem value="25">Show 25 rows</SelectItem>
                        <SelectItem value="50">Show 50 rows</SelectItem>
                        <SelectItem value="100">Show 100 rows</SelectItem>
                    </SelectContent>
                </Select>

                <Button variant="outline" size="sm" className="rounded-lg">
                    <FileDown className="h-4 w-4 mr-2" />
                    Excel
                </Button>

                <Button variant="outline" size="sm" onClick={handleRefresh} className="rounded-lg">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                </Button>

                <div className="flex items-center gap-2">
                    <input
                        type="checkbox"
                        id="show-inactive"
                        checked={showInactive}
                        onChange={(e) => setShowInactive(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300"
                    />
                    <label htmlFor="show-inactive" className="text-sm cursor-pointer">
                        Show Inactive
                    </label>
                </div>

                <div className="flex-1" />

                <div className="relative max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9 rounded-lg bg-white"
                    />
                </div>
            </div>

            {/* Data Table */}
            {filteredBrands.length === 0 ? (
                <div className="bg-card rounded-xl border p-12 text-center">
                    <Tag className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">No brands found</h3>
                    <p className="text-muted-foreground mb-4">
                        {search
                            ? 'Try adjusting your search'
                            : 'Get started by adding your first brand'}
                    </p>
                    {!search && (
                        <Button onClick={handleAddBrand}>
                            <Plus className="h-4 w-4 mr-2" />
                            Add Brand
                        </Button>
                    )}
                </div>
            ) : (
                <div className="bg-card rounded-xl border overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-primary/90 text-primary-foreground">
                                <tr>
                                    <th className="px-4 py-3 text-left text-sm font-medium w-[60px]">Action</th>
                                    <th className="px-4 py-3 text-left text-sm font-medium w-[50px]">#</th>
                                    <th className="px-4 py-3 text-left text-sm font-medium">Brand Name</th>
                                    <th className="px-4 py-3 text-right text-sm font-medium">Products</th>
                                    <th className="px-4 py-3 text-right text-sm font-medium">Total Sales</th>
                                    <th className="px-4 py-3 text-right text-sm font-medium">Total Purchase</th>
                                    <th className="px-4 py-3 text-right text-sm font-medium">Gross Profit</th>
                                    <th className="px-4 py-3 text-right text-sm font-medium">Units Sold</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredBrands.slice(0, pageSize).map((brand, index) => {
                                    const analytics = analyticsMap.get(brand.id);
                                    const grossProfit = analytics?.gross_profit || 0;

                                    return (
                                        <tr
                                            key={brand.id}
                                            className="border-b last:border-b-0 hover:bg-muted/30 transition-colors"
                                        >
                                            <td className="px-4 py-3">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 rounded-full bg-primary/10 hover:bg-primary/20"
                                                        >
                                                            <Plus className="h-4 w-4 text-primary" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="start" className="w-40">
                                                        <DropdownMenuItem onClick={() => {
                                                            setSelectedBrand(brand);
                                                            setDetailDialogOpen(true);
                                                        }}>
                                                            <BarChart3 className="h-4 w-4 mr-2" />
                                                            View Details
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => handleEditBrand(brand)}>
                                                            <Edit2 className="h-4 w-4 mr-2" />
                                                            Edit
                                                        </DropdownMenuItem>
                                                        {!brand.is_active ? (
                                                            <DropdownMenuItem
                                                                className="text-green-600"
                                                                onClick={() => handleReactivate(brand.id)}
                                                            >
                                                                <RotateCcw className="h-4 w-4 mr-2" />
                                                                Reactivate
                                                            </DropdownMenuItem>
                                                        ) : (
                                                            <DropdownMenuItem
                                                                className="text-destructive"
                                                                onClick={() => setDeleteId(brand.id)}
                                                            >
                                                                <Trash2 className="h-4 w-4 mr-2" />
                                                                Deactivate
                                                            </DropdownMenuItem>
                                                        )}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-muted-foreground">{index + 1}</td>
                                            <td className="px-4 py-3">
                                                <span
                                                    className="font-medium text-primary hover:underline cursor-pointer"
                                                    onClick={() => handleEditBrand(brand)}
                                                >
                                                    {brand.name}
                                                </span>
                                                {brand.description && (
                                                    <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                                                        {brand.description}
                                                    </p>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <Badge variant="secondary" className="font-mono">
                                                    {analytics?.product_count || 0}
                                                </Badge>
                                            </td>
                                            <td className="px-4 py-3 text-right font-medium text-green-600">
                                                {formatCurrency(analytics?.net_sales || 0)}
                                            </td>
                                            <td className="px-4 py-3 text-right font-medium text-orange-600">
                                                {formatCurrency(analytics?.net_purchases || 0)}
                                            </td>
                                            <td className={`px-4 py-3 text-right font-bold ${grossProfit >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                                                {formatCurrency(grossProfit)}
                                            </td>
                                            <td className="px-4 py-3 text-right text-sm">
                                                {analytics?.units_sold || 0}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/20">
                        <p className="text-sm text-muted-foreground">
                            Showing 1 to {Math.min(pageSize, filteredBrands.length)} of{' '}
                            {filteredBrands.length} entries
                        </p>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" disabled>
                                Previous
                            </Button>
                            <Button variant="default" size="sm" className="px-3">
                                1
                            </Button>
                            <Button variant="outline" size="sm" disabled={filteredBrands.length <= pageSize}>
                                Next
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Brand Dialog */}
            <BrandDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                brand={editingBrand}
                onSuccess={() => {
                    refetch();
                    refetchAnalytics();
                }}
            />

            {/* Delete/Deactivate Confirmation */}
            <ConfirmDialog
                open={!!deleteId}
                onOpenChange={(open) => !open && setDeleteId(null)}
                title="Deactivate Brand"
                description="Are you sure you want to deactivate this brand? You can reactivate it later by checking 'Show Inactive'."
                confirmLabel={isDeleting ? 'Deactivating...' : 'Deactivate'}
                onConfirm={handleDelete}
                variant="destructive"
            />

            {/* Brand Detail Dialog */}
            <BrandDetailDialog
                open={detailDialogOpen}
                onOpenChange={setDetailDialogOpen}
                brand={selectedBrand}
                analytics={selectedBrand ? analyticsMap.get(selectedBrand.id) : undefined}
            />
        </PageContainer>
    );
}
