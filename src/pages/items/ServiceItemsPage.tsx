import { useState } from 'react';
import {
    Plus,
    Search,
    Edit2,
    Trash2,
    RefreshCw,
    Wrench,
    FileDown,
} from 'lucide-react';
import { PageContainer } from '@/components/shared/PageContainer';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { ServiceItemDialog } from '@/components/items/ServiceItemDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

export default function ServiceItemsPage() {
    const [search, setSearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState<string>('all');
    const [pageSize, setPageSize] = useState(25);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingService, setEditingService] = useState<Item | null>(null);
    const [deleteId, setDeleteId] = useState<string | null>(null);

    const { items, isLoading, deleteItem, isDeleting, refetch } = useItems();
    const { finalOptions: categoryOptions } = useCategoryDropdown('service');
    const { getServiceCategoryIds, isLoading: isCatsLoading } = useCategories({ realtime: false });

    // Filter services only
    const serviceCategoryIds = getServiceCategoryIds();
    const services = items.filter((i) => {
        if (isCatsLoading) return false;
        return i.category_id && serviceCategoryIds.has(i.category_id);
    });

    // Apply search and category filter
    const filteredServices = services.filter((s) => {
        const matchesSearch =
            s.name.toLowerCase().includes(search.toLowerCase()) ||
            ((s as any).item_code?.toLowerCase() || '').includes(search.toLowerCase());

        const matchesCategory =
            categoryFilter === 'all' || s.category_id === categoryFilter;

        return matchesSearch && matchesCategory;
    });

    const handleAddService = () => {
        setEditingService(null);
        setDialogOpen(true);
    };

    const handleEditService = (service: Item) => {
        setEditingService(service);
        setDialogOpen(true);
    };

    const handleDelete = () => {
        if (deleteId) {
            deleteItem.mutate(deleteId, {
                onSuccess: () => setDeleteId(null),
            });
        }
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
            <PageContainer title="Service Items">
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
            title="Service Items"
            actions={
                <Button onClick={handleAddService} className="rounded-lg">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Service
                </Button>
            }
        >
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

                <Button variant="outline" size="sm" onClick={() => refetch()} className="rounded-lg">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                </Button>

                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-[180px] rounded-lg bg-white">
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

                <div className="flex-1" />

                <div className="relative max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by code or name..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9 rounded-lg bg-white"
                    />
                </div>
            </div>

            {/* Data Table */}
            {filteredServices.length === 0 ? (
                <div className="bg-card rounded-xl border p-12 text-center">
                    <Wrench className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">No services found</h3>
                    <p className="text-muted-foreground mb-4">
                        {search || categoryFilter !== 'all'
                            ? 'Try adjusting your filters'
                            : 'Get started by adding your first service'}
                    </p>
                    {!search && categoryFilter === 'all' && (
                        <Button onClick={handleAddService}>
                            <Plus className="h-4 w-4 mr-2" />
                            Add Service
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
                                    <th className="px-4 py-3 text-left text-sm font-medium">Service Code</th>
                                    <th className="px-4 py-3 text-left text-sm font-medium">Service Name</th>
                                    <th className="px-4 py-3 text-left text-sm font-medium">Category</th>
                                    <th className="px-4 py-3 text-right text-sm font-medium">Price</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredServices.slice(0, pageSize).map((service, index) => (
                                    <tr
                                        key={service.id}
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
                                                    <DropdownMenuItem onClick={() => handleEditService(service)}>
                                                        <Edit2 className="h-4 w-4 mr-2" />
                                                        Edit
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        className="text-destructive"
                                                        onClick={() => setDeleteId(service.id)}
                                                    >
                                                        <Trash2 className="h-4 w-4 mr-2" />
                                                        Delete
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-muted-foreground">{index + 1}</td>
                                        <td className="px-4 py-3 text-sm font-mono">
                                            {service.sku || '-'}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span
                                                className="font-medium text-primary hover:underline cursor-pointer"
                                                onClick={() => handleEditService(service)}
                                            >
                                                {service.name}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-sm">
                                            {getCategoryName(service.category_id)}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-right font-medium">
                                            {formatCurrency(service.sale_price || 0)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/20">
                        <p className="text-sm text-muted-foreground">
                            Showing 1 to {Math.min(pageSize, filteredServices.length)} of{' '}
                            {filteredServices.length} entries
                        </p>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" disabled>
                                Previous
                            </Button>
                            <Button variant="default" size="sm" className="px-3">
                                1
                            </Button>
                            <Button variant="outline" size="sm" disabled={filteredServices.length <= pageSize}>
                                Next
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Service Dialog */}
            <ServiceItemDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                service={editingService as any}
                onSuccess={() => refetch()}
            />

            {/* Delete Confirmation */}
            <ConfirmDialog
                open={!!deleteId}
                onOpenChange={(open) => !open && setDeleteId(null)}
                title="Delete Service"
                description="Are you sure you want to delete this service? This action cannot be undone."
                confirmLabel={isDeleting ? 'Deleting...' : 'Delete'}
                onConfirm={handleDelete}
                variant="destructive"
            />
        </PageContainer>
    );
}
