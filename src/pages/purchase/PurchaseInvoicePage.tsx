import { useState } from 'react';
import { Plus, RefreshCw, Download, Search, Eye, X, FileText } from 'lucide-react';
import { PageContainer } from '@/components/shared/PageContainer';
import { DataTable, Column } from '@/components/shared/DataTable';
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
import { useVouchers, Voucher } from '@/hooks/useVouchers';
import { PurchaseInvoiceDialog } from '@/components/accounting/PurchaseInvoiceDialog';
import { VoucherViewDialog } from '@/components/accounting/VoucherViewDialog';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';

export default function PurchaseInvoicePage() {
    const { vouchers, isLoading, refetch, cancelVoucher, isCancelling, totalAmount, totalTax } = useVouchers({
        voucherType: 'purchase_invoice',
    });

    // State
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [rowsPerPage, setRowsPerPage] = useState(25);
    const [currentPage, setCurrentPage] = useState(1);

    // Dialog states
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
    const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
    const [selectedVoucher, setSelectedVoucher] = useState<Voucher | null>(null);

    // Format currency
    const formatCurrency = (value: number) =>
        new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 2,
        }).format(value);

    // Format date
    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        });
    };

    // Filter vouchers
    const filteredVouchers = vouchers.filter((v) => {
        const matchesSearch =
            v.voucher_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (v.party_name?.toLowerCase() || '').includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === 'all' || v.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    // Pagination
    const totalPages = Math.ceil(filteredVouchers.length / rowsPerPage);
    const paginatedVouchers = filteredVouchers.slice(
        (currentPage - 1) * rowsPerPage,
        currentPage * rowsPerPage
    );

    // Handle actions
    const handleView = (voucher: Voucher) => {
        setSelectedVoucher(voucher);
        setIsViewDialogOpen(true);
    };

    const handleCancel = (voucher: Voucher) => {
        setSelectedVoucher(voucher);
        setIsCancelDialogOpen(true);
    };

    const confirmCancel = async () => {
        if (selectedVoucher) {
            await cancelVoucher.mutateAsync(selectedVoucher.id);
            setIsCancelDialogOpen(false);
            setSelectedVoucher(null);
        }
    };

    // Export to Excel
    const handleExport = () => {
        const headers = ['#', 'Invoice No.', 'Date', 'Supplier', 'Taxable', 'Tax', 'Total', 'Status'];
        const rows = filteredVouchers.map((v, index) => [
            index + 1,
            v.voucher_number,
            formatDate(v.voucher_date),
            v.party_name || '-',
            v.taxable_amount,
            v.total_tax,
            v.total_amount,
            v.status,
        ]);

        const csvContent = [
            'Purchase Invoices Report',
            `Generated: ${new Date().toLocaleDateString()}`,
            '',
            headers.join(','),
            ...rows.map((row) => row.join(',')),
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `purchase_invoices_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    // Get status badge variant
    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'confirmed':
                return <Badge className="bg-success">Confirmed</Badge>;
            case 'draft':
                return <Badge variant="secondary">Draft</Badge>;
            case 'cancelled':
                return <Badge variant="destructive">Cancelled</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    // Table columns
    const columns: Column<Voucher>[] = [
        {
            key: 'actions',
            header: 'Action',
            render: (voucher) => (
                <div className="flex items-center gap-1">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleView(voucher);
                        }}
                        className="h-8 w-8"
                    >
                        <Eye className="h-4 w-4 text-primary" />
                    </Button>
                    {voucher.status === 'confirmed' && (
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleCancel(voucher);
                            }}
                            className="h-8 w-8"
                        >
                            <X className="h-4 w-4 text-destructive" />
                        </Button>
                    )}
                </div>
            ),
            className: 'w-24',
        },
        {
            key: 'index',
            header: '#',
            render: (_, index) => (currentPage - 1) * rowsPerPage + (index || 0) + 1,
            className: 'w-12',
        },
        {
            key: 'voucher_number',
            header: 'Invoice No.',
            render: (v) => (
                <span className="font-mono font-medium">{v.voucher_number}</span>
            ),
        },
        {
            key: 'voucher_date',
            header: 'Date',
            render: (v) => formatDate(v.voucher_date),
        },
        {
            key: 'party_name',
            header: 'Supplier',
            render: (v) => v.party_name || '-',
        },
        {
            key: 'taxable_amount',
            header: 'Taxable',
            render: (v) => formatCurrency(v.taxable_amount),
            className: 'text-right',
        },
        {
            key: 'total_tax',
            header: 'Tax',
            render: (v) => formatCurrency(v.total_tax),
            className: 'text-right',
        },
        {
            key: 'total_amount',
            header: 'Total',
            render: (v) => (
                <span className="font-semibold">{formatCurrency(v.total_amount)}</span>
            ),
            className: 'text-right',
        },
        {
            key: 'status',
            header: 'Status',
            render: (v) => getStatusBadge(v.status),
        },
    ];

    // Loading skeleton
    if (isLoading) {
        return (
            <PageContainer title="Purchase Invoice">
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <Skeleton className="h-10 w-64" />
                        <Skeleton className="h-10 w-32" />
                    </div>
                    <div className="bg-card rounded-xl border">
                        {[...Array(10)].map((_, i) => (
                            <Skeleton key={i} className="h-12 m-2" />
                        ))}
                    </div>
                </div>
            </PageContainer>
        );
    }

    return (
        <PageContainer title="Purchase Invoice">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-card rounded-xl border p-4">
                    <p className="text-sm text-muted-foreground">Total Invoices</p>
                    <p className="text-2xl font-bold">{vouchers.filter(v => v.status === 'confirmed').length}</p>
                </div>
                <div className="bg-card rounded-xl border p-4">
                    <p className="text-sm text-muted-foreground">Total Taxable Amount</p>
                    <p className="text-2xl font-bold">{formatCurrency(totalAmount - totalTax)}</p>
                </div>
                <div className="bg-card rounded-xl border p-4">
                    <p className="text-sm text-muted-foreground">Total GST</p>
                    <p className="text-2xl font-bold text-primary">{formatCurrency(totalTax)}</p>
                </div>
            </div>

            {/* Header Actions */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                    <Select
                        value={rowsPerPage.toString()}
                        onValueChange={(v) => {
                            setRowsPerPage(Number(v));
                            setCurrentPage(1);
                        }}
                    >
                        <SelectTrigger className="w-[130px]">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="25">Show 25 rows</SelectItem>
                            <SelectItem value="50">Show 50 rows</SelectItem>
                            <SelectItem value="100">Show 100 rows</SelectItem>
                        </SelectContent>
                    </Select>

                    <Button variant="outline" onClick={handleExport}>
                        <Download className="h-4 w-4 mr-2" />
                        Excel
                    </Button>

                    <Button variant="outline" onClick={() => refetch()}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Refresh
                    </Button>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 w-64"
                        />
                    </div>

                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-[150px]">
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Status</SelectItem>
                            <SelectItem value="confirmed">Confirmed</SelectItem>
                            <SelectItem value="draft">Draft</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                    </Select>

                    <Button onClick={() => setIsCreateDialogOpen(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        New Invoice
                    </Button>
                </div>
            </div>

            {/* Data Table */}
            <DataTable
                columns={columns}
                data={paginatedVouchers}
                keyExtractor={(v) => v.id}
                emptyMessage="No purchase invoices found"
                onRowClick={handleView}
            />

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-end gap-2 mt-4">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                    >
                        Previous
                    </Button>
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        const page = currentPage <= 3 ? i + 1 : currentPage + i - 2;
                        if (page > totalPages || page < 1) return null;
                        return (
                            <Button
                                key={page}
                                variant={currentPage === page ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setCurrentPage(page)}
                            >
                                {page}
                            </Button>
                        );
                    })}
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                    >
                        Next
                    </Button>
                </div>
            )}

            {/* Dialogs */}
            <PurchaseInvoiceDialog
                open={isCreateDialogOpen}
                onOpenChange={setIsCreateDialogOpen}
            />

            {selectedVoucher && (
                <VoucherViewDialog
                    open={isViewDialogOpen}
                    onOpenChange={setIsViewDialogOpen}
                    voucherId={selectedVoucher.id}
                />
            )}

            <ConfirmDialog
                open={isCancelDialogOpen}
                onOpenChange={setIsCancelDialogOpen}
                title="Cancel Invoice"
                description={`Are you sure you want to cancel invoice "${selectedVoucher?.voucher_number}"? This will reverse all ledger entries.`}
                confirmLabel="Cancel Invoice"
                onConfirm={confirmCancel}
                isLoading={isCancelling}
                variant="destructive"
            />
        </PageContainer>
    );
}
