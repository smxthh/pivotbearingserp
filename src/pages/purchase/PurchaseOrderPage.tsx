import { useState } from 'react';
import {
    Plus,
    Search,
    RefreshCw,
    FileDown,
    Edit2,
    Eye,
    Trash2,
    CheckCircle,
} from 'lucide-react';
import { PageContainer } from '@/components/shared/PageContainer';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { PurchaseOrderDialog } from '@/components/purchase/PurchaseOrderDialog';
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
import { usePurchaseOrders, PurchaseOrder } from '@/hooks/usePurchaseOrders';
import { Calendar as CalendarIcon, X } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Calendar } from '@/components/ui/calendar';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';

export default function PurchaseOrderPage() {
    const [search, setSearch] = useState('');
    const [pageSize, setPageSize] = useState(25);
    const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed'>('pending');
    const [dateFilter, setDateFilter] = useState<Date | undefined>(undefined);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingOrder, setEditingOrder] = useState<PurchaseOrder | null>(null);
    const [deleteId, setDeleteId] = useState<string | null>(null);

    const {
        purchaseOrders,
        isLoading,
        refetch,
        deletePurchaseOrder,
        updateStatus,
    } = usePurchaseOrders();

    // Filter by status and search
    const filteredOrders = purchaseOrders.filter((po) => {
        const matchesSearch =
            po.po_full_number.toLowerCase().includes(search.toLowerCase()) ||
            (po.party_name?.toLowerCase() || '').includes(search.toLowerCase()) ||
            (po.remark?.toLowerCase() || '').includes(search.toLowerCase());

        const matchesStatus =
            statusFilter === 'all' || po.status === statusFilter;

        const matchesDate = !dateFilter || (po.po_date && new Date(po.po_date).toDateString() === dateFilter.toDateString());

        return matchesSearch && matchesStatus && matchesDate;
    });

    const formatCurrency = (value: number) =>
        new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 2,
        }).format(value);

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-IN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        });
    };

    const handleAddOrder = () => {
        setEditingOrder(null);
        setDialogOpen(true);
    };

    const handleEditOrder = (order: PurchaseOrder) => {
        setEditingOrder(order);
        setDialogOpen(true);
    };

    const handleDelete = () => {
        if (deleteId) {
            deletePurchaseOrder.mutate(deleteId, {
                onSuccess: () => setDeleteId(null),
            });
        }
    };

    const handleMarkCompleted = (orderId: string) => {
        updateStatus.mutate({ id: orderId, status: 'completed' });
    };

    const handleExportExcel = () => {
        const headers = ['#', 'PO No.', 'PO Date', 'Party Name', 'Net Amount', 'Status', 'Remark'];
        const rows = filteredOrders.map((order, index) => [
            index + 1,
            order.po_full_number,
            formatDate(order.po_date),
            order.party_name || '-',
            formatCurrency(order.net_amount),
            order.status,
            order.remark || '-'
        ]);

        const csvContent = [
            'Purchase Orders Report',
            `Generated: ${new Date().toLocaleDateString()}`,
            '',
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `purchase_orders_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    // Loading skeleton
    if (isLoading) {
        return (
            <PageContainer title="Purchase Order">
                <div className="space-y-4">
                    <div className="flex items-center gap-4">
                        <Skeleton className="h-10 w-32" />
                        <Skeleton className="h-10 w-32" />
                        <Skeleton className="h-10 w-28 ml-auto" />
                    </div>
                    <div className="bg-card rounded-xl border overflow-hidden">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="flex items-center gap-4 p-4 border-b last:border-b-0">
                                <Skeleton className="h-5 w-24" />
                                <Skeleton className="h-5 w-24" />
                                <Skeleton className="h-5 w-40" />
                                <Skeleton className="h-5 w-24" />
                            </div>
                        ))}
                    </div>
                </div>
            </PageContainer>
        );
    }

    return (
        <PageContainer
            title="Purchase Order"
            actions={
                <Button onClick={handleAddOrder} className="rounded-lg">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Order
                </Button>
            }
        >
            {/* Status Tabs */}
            <div className="flex gap-2 mb-4">
                <Button
                    variant={statusFilter === 'pending' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setStatusFilter('pending')}
                    className={
                        statusFilter === 'pending'
                            ? 'rounded-lg bg-orange-100 text-orange-700 hover:bg-orange-200 border-orange-200'
                            : 'rounded-lg text-muted-foreground hover:text-orange-700'
                    }
                >
                    Pending
                </Button>
                <Button
                    variant={statusFilter === 'completed' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setStatusFilter('completed')}
                    className={
                        statusFilter === 'completed'
                            ? 'rounded-lg bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-emerald-200'
                            : 'rounded-lg text-muted-foreground hover:text-emerald-700'
                    }
                >
                    Completed
                </Button>
                {statusFilter !== 'all' && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setStatusFilter('all')}
                        className="rounded-lg"
                    >
                        Show All
                    </Button>
                )}
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

                <Button variant="outline" size="sm" onClick={handleExportExcel} className="rounded-lg">
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
            {filteredOrders.length === 0 ? (
                <div className="bg-card rounded-xl border p-12 text-center">
                    <div className="h-12 w-12 mx-auto text-muted-foreground mb-4">📦</div>
                    <h3 className="text-lg font-medium mb-2">No purchase orders found</h3>
                    <p className="text-muted-foreground mb-4">
                        {search
                            ? 'Try adjusting your search'
                            : 'Get started by creating your first purchase order'}
                    </p>
                    {!search && (
                        <Button onClick={handleAddOrder}>
                            <Plus className="h-4 w-4 mr-2" />
                            Add Order
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
                                    <th className="px-4 py-3 text-left text-sm font-medium">PO. No.</th>
                                    <th className="px-4 py-3 text-left text-sm font-medium">PO. Date</th>
                                    <th className="px-4 py-3 text-left text-sm font-medium">Party Name</th>
                                    <th className="px-4 py-3 text-right text-sm font-medium">Net Amount</th>
                                    <th className="px-4 py-3 text-left text-sm font-medium">Remark</th>
                                </tr>
                            </thead>
                            <tbody>
                                {/* Search Row */}
                                <tr className="bg-muted/30 border-b">
                                    <td className="px-4 py-2"></td>
                                    <td className="px-4 py-2"></td>
                                    <td className="px-4 py-2">
                                        <Input placeholder="Search PO. No." className="h-8 text-xs" />
                                    </td>
                                    <td className="px-4 py-2">
                                        <div className="relative">
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <Button
                                                        variant={"outline"}
                                                        className={cn(
                                                            "w-full h-8 justify-start text-left font-normal text-xs px-2 rounded-lg bg-white border-dashed border-gray-300 hover:border-primary hover:bg-primary/5 transition-all text-muted-foreground",
                                                            dateFilter && "text-foreground border-solid border-primary/50 bg-primary/5"
                                                        )}
                                                    >
                                                        <CalendarIcon className={cn("mr-2 h-3.5 w-3.5", dateFilter ? "text-primary" : "text-muted-foreground")} />
                                                        {dateFilter ? (
                                                            <span className="truncate">{format(dateFilter, "PP")}</span>
                                                        ) : (
                                                            <span>Pick date</span>
                                                        )}
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0" align="start">
                                                    <Calendar
                                                        mode="single"
                                                        selected={dateFilter}
                                                        onSelect={setDateFilter}
                                                        initialFocus
                                                        className="rounded-lg border shadow-lg"
                                                    />
                                                </PopoverContent>
                                            </Popover>
                                            {dateFilter && (
                                                <button
                                                    onClick={() => setDateFilter(undefined)}
                                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 hover:bg-gray-200 rounded-full text-muted-foreground hover:text-destructive transition-colors"
                                                >
                                                    <X className="h-3 w-3" />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 py-2">
                                        <Input placeholder="Search Party Name" className="h-8 text-xs" />
                                    </td>
                                    <td className="px-4 py-2">
                                        <Input placeholder="Search Net Amount" className="h-8 text-xs" />
                                    </td>
                                    <td className="px-4 py-2">
                                        <Input placeholder="Search Remark" className="h-8 text-xs" />
                                    </td>
                                </tr>

                                {filteredOrders.slice(0, pageSize).map((order, index) => (
                                    <tr
                                        key={order.id}
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
                                                <DropdownMenuContent align="start" className="w-44">
                                                    <DropdownMenuItem onClick={() => handleEditOrder(order)}>
                                                        <Eye className="h-4 w-4 mr-2" />
                                                        View / Edit
                                                    </DropdownMenuItem>
                                                    {order.status === 'pending' && (
                                                        <DropdownMenuItem
                                                            className="text-green-600"
                                                            onClick={() => handleMarkCompleted(order.id)}
                                                        >
                                                            <CheckCircle className="h-4 w-4 mr-2" />
                                                            Mark Completed
                                                        </DropdownMenuItem>
                                                    )}
                                                    <DropdownMenuItem
                                                        className="text-destructive"
                                                        onClick={() => setDeleteId(order.id)}
                                                    >
                                                        <Trash2 className="h-4 w-4 mr-2" />
                                                        Delete
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-muted-foreground">{index + 1}</td>
                                        <td className="px-4 py-3">
                                            <span
                                                className="font-medium text-primary hover:underline cursor-pointer"
                                                onClick={() => handleEditOrder(order)}
                                            >
                                                {order.po_full_number}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-sm">{formatDate(order.po_date)}</td>
                                        <td className="px-4 py-3 text-sm font-medium">{order.party_name}</td>
                                        <td className="px-4 py-3 text-sm text-right font-medium">
                                            {formatCurrency(order.net_amount)}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-muted-foreground">
                                            {order.remark || '-'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/20">
                        <p className="text-sm text-muted-foreground">
                            Showing 1 to {Math.min(pageSize, filteredOrders.length)} of{' '}
                            {filteredOrders.length} entries
                        </p>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" disabled>
                                Previous
                            </Button>
                            <Button variant="default" size="sm" className="px-3">
                                1
                            </Button>
                            <Button variant="outline" size="sm" disabled={filteredOrders.length <= pageSize}>
                                Next
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Purchase Order Dialog */}
            <PurchaseOrderDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                order={editingOrder}
                onSuccess={() => refetch()}
            />

            {/* Delete Confirmation */}
            <ConfirmDialog
                open={!!deleteId}
                onOpenChange={(open) => !open && setDeleteId(null)}
                title="Delete Purchase Order"
                description="Are you sure you want to delete this purchase order? This action cannot be undone."
                confirmLabel={deletePurchaseOrder.isPending ? 'Deleting...' : 'Delete'}
                onConfirm={handleDelete}
                variant="destructive"
            />
        </PageContainer>
    );
}
