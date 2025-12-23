import { useState } from 'react';
import {
    Plus,
    Edit2,
    Trash2,
    Package,
} from 'lucide-react';
import { PageContainer } from '@/components/shared/PageContainer';
import { TableToolbar } from '@/components/shared/TableToolbar';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { ProductDialog } from '@/components/items/ProductDialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
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
import { useItems, Item } from '@/hooks/useItems';
import { useCategoryDropdown, useCategories } from '@/hooks/useCategories';
import { formatCurrency } from '@/lib/constants';
import { exportToCSV, formatCurrencyForExport } from '@/lib/exportUtils';

export default function ProductsPage() {
    const [search, setSearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState<string>('all');
    const [pageSize, setPageSize] = useState(25);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Item | null>(null);
    const [deleteId, setDeleteId] = useState<string | null>(null);

    const { items, isLoading, deleteItem, isDeleting, refetch } = useItems();
    const { options: categoryOptions } = useCategoryDropdown('product'); // Show ALL categories
    const { getProductCategoryIds, isLoading: isCatsLoading } = useCategories({ realtime: true });

    // Filter products only (under "Products" category hierarchy)
    const productCategoryIds = getProductCategoryIds();
    const products = items.filter((i) => {
        // If category matching is still loading, show all or none? Show none to avoid flicker
        if (isCatsLoading) return false;
        // If item has no category, show it? Maybe strict "under product" means has id?
        // Let's assume if category_id matches one of the product categories
        return i.category_id && productCategoryIds.has(i.category_id);
    });

    // Apply search and category filter
    const filteredProducts = products.filter((p) => {
        const matchesSearch =
            p.name.toLowerCase().includes(search.toLowerCase()) ||
            ((p as any).item_code?.toLowerCase() || '').includes(search.toLowerCase());

        const matchesCategory =
            categoryFilter === 'all' || p.category_id === categoryFilter;

        return matchesSearch && matchesCategory;
    });

    const handleAddProduct = () => {
        setEditingProduct(null);
        setDialogOpen(true);
    };

    const handleEditProduct = (product: Item) => {
        setEditingProduct(product);
        setDialogOpen(true);
    };

    const handleDelete = () => {
        if (deleteId) {
            deleteItem.mutate(deleteId, {
                onSuccess: () => setDeleteId(null),
            });
        }
    };

    const handleExport = () => {
        exportToCSV(
            filteredProducts,
            [
                { key: 'sku', header: 'Item Code', render: (p) => p.sku || '-' },
                { key: 'name', header: 'Item Name' },
                { key: 'category', header: 'Category', render: (p) => getCategoryName(p.category_id) },
                { key: 'sale_price', header: 'Sale Price', render: (p) => formatCurrencyForExport(p.sale_price || 0) },
                { key: 'purchase_price', header: 'Purchase Price', render: (p) => formatCurrencyForExport(p.purchase_price || 0) },
                { key: 'stock_quantity', header: 'Stock', render: (p) => String(p.stock_quantity || 0) },
                { key: 'hsn_code', header: 'HSN Code', render: (p) => p.hsn_code || '-' },
            ],
            'products',
            'Products Report'
        );
    };

    // Get category name by ID
    const getCategoryName = (categoryId?: string) => {
        if (!categoryId) return '-';
        const cat = categoryOptions.find((c) => c.value === categoryId);
        return cat?.label || '-';
    };

    // Loading skeleton
    if (isLoading) {
        return (
            <PageContainer title="Products">
                <div className="space-y-4">
                    <div className="flex items-center gap-4">
                        <Skeleton className="h-10 w-64" />
                        <Skeleton className="h-10 w-32" />
                        <Skeleton className="h-10 w-28 ml-auto" />
                    </div>
                    <div className="bg-card rounded-xl border overflow-hidden">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="flex items-center gap-4 p-4 border-b last:border-b-0">
                                <Skeleton className="h-5 w-20" />
                                <Skeleton className="h-5 w-40" />
                                <Skeleton className="h-5 w-32" />
                                <Skeleton className="h-5 w-24 ml-auto" />
                            </div>
                        ))}
                    </div>
                </div>
            </PageContainer>
        );
    }

    return (
        <PageContainer
            title="Finish Goods"
            actions={
                <Button onClick={handleAddProduct} className="rounded-lg">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Product
                </Button>
            }
        >
            {/* Controls Row */}
            <TableToolbar
                onRefresh={refetch}
                onExport={handleExport}
                searchValue={search}
                onSearchChange={setSearch}
                searchPlaceholder="Search by code or name..."
                pageSize={pageSize}
                onPageSizeChange={setPageSize}
            >
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-[180px] rounded-lg bg-background">
                        <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {categoryOptions.map((cat) => (
                            <SelectItem key={cat.value} value={cat.value}>
                                {cat.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </TableToolbar>

            {/* Data Table */}
            {filteredProducts.length === 0 ? (
                <div className="bg-card rounded-xl border p-12 text-center">
                    <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">No products found</h3>
                    <p className="text-muted-foreground mb-4">
                        {search || categoryFilter !== 'all'
                            ? 'Try adjusting your filters'
                            : 'Get started by adding your first product'}
                    </p>
                    {!search && categoryFilter === 'all' && (
                        <Button onClick={handleAddProduct}>
                            <Plus className="h-4 w-4 mr-2" />
                            Add Product
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
                                    <th className="px-4 py-3 text-left text-sm font-medium">Item Code</th>
                                    <th className="px-4 py-3 text-left text-sm font-medium">Item Name</th>
                                    <th className="px-4 py-3 text-left text-sm font-medium">HSN Code</th>
                                    <th className="px-4 py-3 text-left text-sm font-medium">Category Name</th>
                                    <th className="px-4 py-3 text-right text-sm font-medium">Price</th>
                                    <th className="px-4 py-3 text-center text-sm font-medium">Stock</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredProducts.slice(0, pageSize).map((product, index) => (
                                    <tr
                                        key={product.id}
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
                                                    <DropdownMenuItem onClick={() => handleEditProduct(product)}>
                                                        <Edit2 className="h-4 w-4 mr-2" />
                                                        Edit
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        className="text-destructive"
                                                        onClick={() => setDeleteId(product.id)}
                                                    >
                                                        <Trash2 className="h-4 w-4 mr-2" />
                                                        Delete
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-muted-foreground">{index + 1}</td>
                                        <td className="px-4 py-3 text-sm font-mono">
                                            {product.sku || '-'}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span
                                                className="font-medium text-primary hover:underline cursor-pointer"
                                                onClick={() => handleEditProduct(product)}
                                            >
                                                {product.name}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-sm font-mono text-muted-foreground">
                                            {product.hsn_code || '-'}
                                        </td>
                                        <td className="px-4 py-3 text-sm">
                                            {getCategoryName(product.category_id)}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-right font-medium">
                                            {formatCurrency(product.sale_price || 0)}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <Badge
                                                variant={
                                                    product.stock_quantity <= product.min_stock_level
                                                        ? 'destructive'
                                                        : 'secondary'
                                                }
                                            >
                                                {product.stock_quantity}
                                            </Badge>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/20">
                        <p className="text-sm text-muted-foreground">
                            Showing 1 to {Math.min(pageSize, filteredProducts.length)} of{' '}
                            {filteredProducts.length} entries
                        </p>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" disabled>
                                Previous
                            </Button>
                            <Button variant="default" size="sm" className="px-3">
                                1
                            </Button>
                            <Button variant="outline" size="sm" disabled={filteredProducts.length <= pageSize}>
                                Next
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Product Dialog */}
            <ProductDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                product={editingProduct as any}
                onSuccess={() => refetch()}
            />

            {/* Delete Confirmation */}
            <ConfirmDialog
                open={!!deleteId}
                onOpenChange={(open) => !open && setDeleteId(null)}
                title="Delete Product"
                description="Are you sure you want to delete this product? This action cannot be undone."
                confirmLabel={isDeleting ? 'Deleting...' : 'Delete'}
                onConfirm={handleDelete}
                variant="destructive"
            />
        </PageContainer>
    );
}
