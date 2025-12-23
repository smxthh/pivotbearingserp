import { useState } from 'react';
import { Plus, Search, Edit2, Trash2, Filter, RefreshCw, Package, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PageContainer } from '@/components/shared/PageContainer';
import { DataTable, Column } from '@/components/shared/DataTable';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
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
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useItems, Item, useCategories } from '@/hooks/useItems';
import { formatCurrency } from '@/lib/constants';

export default function ItemList() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'out'>('all');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { items, isLoading, deleteItem, isDeleting, refetch, lowStockItems, outOfStockItems } = useItems();
  const { categories } = useCategories();

  // Filter items
  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.sku.toLowerCase().includes(search.toLowerCase()) ||
      (item.hsn_code?.toLowerCase() || '').includes(search.toLowerCase());

    const matchesCategory = categoryFilter === 'all' || item.category_id === categoryFilter;

    let matchesStock = true;
    if (stockFilter === 'low') {
      matchesStock = item.stock_quantity <= item.min_stock_level && item.stock_quantity > 0;
    } else if (stockFilter === 'out') {
      matchesStock = item.stock_quantity <= 0;
    }

    return matchesSearch && matchesCategory && matchesStock;
  });

  const handleDelete = () => {
    if (deleteId) {
      deleteItem.mutate(deleteId, {
        onSuccess: () => setDeleteId(null),
      });
    }
  };

  const getStockStatus = (item: Item) => {
    if (item.stock_quantity <= 0) {
      return { label: 'Out of Stock', variant: 'destructive' as const };
    }
    if (item.stock_quantity <= item.min_stock_level) {
      return { label: 'Low Stock', variant: 'secondary' as const };
    }
    return { label: 'In Stock', variant: 'default' as const };
  };

  const columns: Column<Item & { category: { id: string; name: string } | null }>[] = [
    {
      key: 'name',
      header: 'Item',
      render: (item) => (
        <div>
          <p className="font-medium">{item.name}</p>
          <p className="text-xs text-muted-foreground">SKU: {item.sku}</p>
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      render: (item) => (
        item.category ? (
          <Badge variant="outline">{item.category.name}</Badge>
        ) : (
          <span className="text-muted-foreground">-</span>
        )
      ),
    },
    {
      key: 'hsn_code',
      header: 'HSN',
      render: (item) => item.hsn_code || <span className="text-muted-foreground">-</span>,
    },
    {
      key: 'sale_price',
      header: 'Sale Price',
      render: (item) => formatCurrency(item.sale_price),
      className: 'text-right',
    },
    {
      key: 'purchase_price',
      header: 'Purchase Price',
      render: (item) => formatCurrency(item.purchase_price),
      className: 'text-right',
    },
    {
      key: 'gst_percent',
      header: 'GST',
      render: (item) => `${item.gst_percent}%`,
      className: 'text-right',
    },
    {
      key: 'stock_quantity',
      header: 'Stock',
      render: (item) => {
        const status = getStockStatus(item);
        return (
          <div className="flex items-center gap-2 justify-end">
            {status.label !== 'In Stock' && (
              <Tooltip>
                <TooltipTrigger>
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                </TooltipTrigger>
                <TooltipContent>{status.label}</TooltipContent>
              </Tooltip>
            )}
            <span className={item.stock_quantity <= item.min_stock_level ? 'text-destructive font-medium' : ''}>
              {item.stock_quantity} {item.unit}
            </span>
          </div>
        );
      },
      className: 'text-right',
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (item) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/items/${item.id}`);
            }}
          >
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={(e) => {
              e.stopPropagation();
              setDeleteId(item.id);
            }}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ),
      className: 'w-[100px]',
    },
  ];

  // Loading skeleton
  if (isLoading) {
    return (
      <PageContainer title="Item Master">
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
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-5 w-16 ml-auto" />
              </div>
            ))}
          </div>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="Item Master"
      description={`${items.length} items`}
      actions={
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => refetch()}
            className="h-9 w-9"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button onClick={() => navigate('/items/new')} className="rounded-lg">
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </Button>
        </div>
      }
    >
      {/* Stats Cards */}
      {(lowStockItems.length > 0 || outOfStockItems.length > 0) && (
        <div className="grid grid-cols-2 gap-4 mb-6">
          {lowStockItems.length > 0 && (
            <div
              className="bg-amber-50 border border-amber-200 rounded-xl p-4 cursor-pointer hover:bg-amber-100 transition-colors"
              onClick={() => setStockFilter('low')}
            >
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                <div>
                  <p className="font-medium text-amber-900">{lowStockItems.length} Low Stock</p>
                  <p className="text-xs text-amber-700">Items below minimum level</p>
                </div>
              </div>
            </div>
          )}
          {outOfStockItems.length > 0 && (
            <div
              className="bg-red-50 border border-red-200 rounded-xl p-4 cursor-pointer hover:bg-red-100 transition-colors"
              onClick={() => setStockFilter('out')}
            >
              <div className="flex items-center gap-3">
                <Package className="h-5 w-5 text-red-600" />
                <div>
                  <p className="font-medium text-red-900">{outOfStockItems.length} Out of Stock</p>
                  <p className="text-xs text-red-700">Items need restocking</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, SKU, HSN..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 rounded-lg"
          />
        </div>
        <Select
          value={categoryFilter}
          onValueChange={setCategoryFilter}
        >
          <SelectTrigger className="w-[160px] rounded-lg">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={stockFilter}
          onValueChange={(v) => setStockFilter(v as 'all' | 'low' | 'out')}
        >
          <SelectTrigger className="w-[140px] rounded-lg">
            <SelectValue placeholder="Stock" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stock</SelectItem>
            <SelectItem value="low">Low Stock</SelectItem>
            <SelectItem value="out">Out of Stock</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Data Table */}
      {filteredItems.length === 0 ? (
        <div className="bg-card rounded-xl border p-12 text-center">
          <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No items found</h3>
          <p className="text-muted-foreground mb-4">
            {search || categoryFilter !== 'all' || stockFilter !== 'all'
              ? 'Try adjusting your filters'
              : 'Get started by adding your first item'}
          </p>
          {!search && categoryFilter === 'all' && stockFilter === 'all' && (
            <Button onClick={() => navigate('/items/new')}>
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          )}
        </div>
      ) : (
        <div className="bg-card rounded-xl border overflow-hidden">
          <DataTable
            columns={columns}
            data={filteredItems as (Item & { category: { id: string; name: string } | null })[]}
            keyExtractor={(item) => item.id}
            onRowClick={(item) => navigate(`/items/${item.id}`)}
          />
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete Item"
        description="Are you sure you want to delete this item? Stock movements and invoice history will remain but reference will be lost."
        confirmLabel={isDeleting ? 'Deleting...' : 'Delete'}
        onConfirm={handleDelete}
        variant="destructive"
      />
    </PageContainer>
  );
}
