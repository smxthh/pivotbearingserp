import { useState } from 'react';
import {
    Plus,
    Search,
    Edit2,
    Trash2,
    RefreshCw,
    FolderTree,
    FileDown,
    ChevronRight,
    ArrowLeft,
    FolderOpen,
} from 'lucide-react';
import { PageContainer } from '@/components/shared/PageContainer';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { ItemCategoryDialog } from '@/components/items/ItemCategoryDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { useCategories, Category } from '@/hooks/useCategories';

export default function ItemCategoryPage() {
    const [search, setSearch] = useState('');
    const [pageSize, setPageSize] = useState(25);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [currentParentId, setCurrentParentId] = useState<string | null>(null);
    const [breadcrumbs, setBreadcrumbs] = useState<{ id: string; name: string }[]>([]);

    const { categories, isLoading, deleteCategory, isDeleting, refetch } = useCategories({
        parentId: currentParentId === null ? null : currentParentId,
        realtime: true,
    });

    // Filter by search and parent (double check)
    const filteredCategories = categories.filter((c) => {
        // Strict parent check to prevent incorrect subcategories from showing
        const matchesParent = currentParentId
            ? c.parent_id === currentParentId
            : !c.parent_id;

        const matchesSearch =
            c.name.toLowerCase().includes(search.toLowerCase()) ||
            (c.remark?.toLowerCase() || '').includes(search.toLowerCase());

        return matchesParent && matchesSearch;
    });

    const handleAddCategory = () => {
        setEditingCategory(null);
        setDialogOpen(true);
    };

    const handleEditCategory = (category: Category) => {
        setEditingCategory(category);
        setDialogOpen(true);
    };

    const handleDelete = () => {
        if (deleteId) {
            deleteCategory.mutate(deleteId, {
                onSuccess: () => setDeleteId(null),
            });
        }
    };

    const handleDrillDown = (category: Category) => {
        setBreadcrumbs((prev) => [...prev, { id: category.id, name: category.name }]);
        setCurrentParentId(category.id);
    };

    const handleBreadcrumbClick = (index: number) => {
        if (index === -1) {
            // Root
            setBreadcrumbs([]);
            setCurrentParentId(null);
        } else {
            const newBreadcrumbs = breadcrumbs.slice(0, index + 1);
            setBreadcrumbs(newBreadcrumbs);
            setCurrentParentId(newBreadcrumbs[newBreadcrumbs.length - 1]?.id || null);
        }
    };

    // Loading skeleton
    if (isLoading) {
        return (
            <PageContainer title="Item Category">
                <div className="space-y-4">
                    <div className="flex items-center gap-4">
                        <Skeleton className="h-10 w-64" />
                        <Skeleton className="h-10 w-32" />
                        <Skeleton className="h-10 w-28 ml-auto" />
                    </div>
                    <div className="bg-card rounded-xl border overflow-hidden">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="flex items-center gap-4 p-4 border-b last:border-b-0">
                                <Skeleton className="h-5 w-40" />
                                <Skeleton className="h-5 w-32" />
                                <Skeleton className="h-5 w-20" />
                                <Skeleton className="h-5 w-20 ml-auto" />
                            </div>
                        ))}
                    </div>
                </div>
            </PageContainer>
        );
    }

    return (
        <PageContainer
            title="Item Category"
            actions={
                <Button onClick={handleAddCategory} className="rounded-lg">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Category
                </Button>
            }
        >
            {/* Breadcrumb Navigation */}
            {breadcrumbs.length > 0 && (
                <div className="flex items-center gap-2 mb-4 p-3 bg-muted/30 rounded-lg">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleBreadcrumbClick(-1)}
                        className="gap-2"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Item Category
                    </Button>
                    {breadcrumbs.map((crumb, index) => (
                        <div key={crumb.id} className="flex items-center gap-2">
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            <Button
                                variant={index === breadcrumbs.length - 1 ? 'default' : 'ghost'}
                                size="sm"
                                onClick={() => handleBreadcrumbClick(index)}
                            >
                                {crumb.name}
                            </Button>
                        </div>
                    ))}
                </div>
            )}

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
            {filteredCategories.length === 0 ? (
                <div className="bg-card rounded-xl border p-12 text-center">
                    <FolderTree className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">No categories found</h3>
                    <p className="text-muted-foreground mb-4">
                        {search
                            ? 'Try adjusting your search'
                            : currentParentId
                                ? 'No subcategories in this category'
                                : 'Get started by adding your first category'}
                    </p>
                    {!search && (
                        <Button onClick={handleAddCategory}>
                            <Plus className="h-4 w-4 mr-2" />
                            Add Category
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
                                    <th className="px-4 py-3 text-left text-sm font-medium">Category Name</th>
                                    <th className="px-4 py-3 text-left text-sm font-medium">Parent Category</th>
                                    <th className="px-4 py-3 text-left text-sm font-medium">Final Category</th>
                                    <th className="px-4 py-3 text-left text-sm font-medium">Returnable</th>
                                    <th className="px-4 py-3 text-left text-sm font-medium">Remark</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredCategories.slice(0, pageSize).map((category, index) => (
                                    <tr
                                        key={category.id}
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
                                                    <DropdownMenuItem onClick={() => handleEditCategory(category)}>
                                                        <Edit2 className="h-4 w-4 mr-2" />
                                                        Edit
                                                    </DropdownMenuItem>
                                                    {(category.children_count || 0) > 0 && (
                                                        <DropdownMenuItem onClick={() => handleDrillDown(category)}>
                                                            <FolderOpen className="h-4 w-4 mr-2" />
                                                            View Subcategories
                                                        </DropdownMenuItem>
                                                    )}
                                                    <DropdownMenuItem
                                                        className="text-destructive"
                                                        onClick={() => setDeleteId(category.id)}
                                                    >
                                                        <Trash2 className="h-4 w-4 mr-2" />
                                                        Delete
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-muted-foreground">{index + 1}</td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <FolderOpen className="h-4 w-4 text-primary" />
                                                <span
                                                    className={`font-medium ${(category.children_count || 0) > 0
                                                        ? 'text-primary hover:underline cursor-pointer'
                                                        : ''
                                                        }`}
                                                    onClick={() => {
                                                        if ((category.children_count || 0) > 0) {
                                                            handleDrillDown(category);
                                                        }
                                                    }}
                                                >
                                                    {category.name}
                                                </span>
                                                {(category.children_count || 0) > 0 && (
                                                    <Badge variant="secondary" className="text-xs">
                                                        {category.children_count} sub
                                                    </Badge>
                                                )}
                                                {(category.items_count || 0) > 0 && (
                                                    <Badge variant="outline" className="text-xs">
                                                        {category.items_count} items
                                                    </Badge>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-sm">{category.parent_name || 'NA'}</td>
                                        <td className="px-4 py-3 text-sm">
                                            <Badge variant={category.is_final ? 'default' : 'secondary'}>
                                                {category.is_final ? 'Yes' : 'No'}
                                            </Badge>
                                        </td>
                                        <td className="px-4 py-3 text-sm">
                                            <Badge variant={category.is_returnable ? 'default' : 'secondary'}>
                                                {category.is_returnable ? 'Yes' : 'No'}
                                            </Badge>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-muted-foreground">
                                            {category.remark || '-'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/20">
                        <p className="text-sm text-muted-foreground">
                            Showing 1 to {Math.min(pageSize, filteredCategories.length)} of{' '}
                            {filteredCategories.length} entries
                        </p>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" disabled>
                                Previous
                            </Button>
                            <Button variant="default" size="sm" className="px-3">
                                1
                            </Button>
                            <Button variant="outline" size="sm" disabled={filteredCategories.length <= pageSize}>
                                Next
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Category Dialog */}
            <ItemCategoryDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                category={editingCategory}
                defaultParentId={currentParentId}
                onSuccess={() => refetch()}
            />

            {/* Delete Confirmation */}
            <ConfirmDialog
                open={!!deleteId}
                onOpenChange={(open) => !open && setDeleteId(null)}
                title="Delete Category"
                description="Are you sure you want to delete this category? This action cannot be undone. Items in this category will need to be reassigned."
                confirmLabel={isDeleting ? 'Deleting...' : 'Delete'}
                onConfirm={handleDelete}
                variant="destructive"
            />
        </PageContainer>
    );
}
