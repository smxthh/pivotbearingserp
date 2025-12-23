import { useState, useMemo } from 'react';
import { Plus, RefreshCw, Download, Search, Eye, X } from 'lucide-react';
import { PageContainer } from '@/components/shared/PageContainer';
import { DataTable, Column } from '@/components/shared/DataTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useVouchers, Voucher } from '@/hooks/useVouchers';
import { PaymentVoucherDialog } from '@/components/accounting/PaymentVoucherDialog';
import { VoucherViewDialog } from '@/components/accounting/VoucherViewDialog';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';

export default function PaymentVoucherPage() {
    // State
    const [activeTab, setActiveTab] = useState<'payment' | 'receipt'>('payment');
    const [searchQuery, setSearchQuery] = useState('');
    const [rowsPerPage, setRowsPerPage] = useState(25);
    const [currentPage, setCurrentPage] = useState(1);

    // Dialog states
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
    const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
    const [selectedVoucher, setSelectedVoucher] = useState<Voucher | null>(null);

    // Fetch BOTH types of data with optimized caching
    const {
        vouchers: paymentVouchers,
        isLoading: isLoadingPayment,
        refetch: refetchPayment,
        cancelVoucher: cancelPaymentVoucher,
        isCancelling: isCancellingPayment,
        totalAmount: totalPayment,
    } = useVouchers({
        voucherType: 'payment_voucher' as any,
        realtime: true,
    });

    const {
        vouchers: receiptVouchers,
        isLoading: isLoadingReceipt,
        refetch: refetchReceipt,
        cancelVoucher: cancelReceiptVoucher,
        isCancelling: isCancellingReceipt,
        totalAmount: totalReceipt,
    } = useVouchers({
        voucherType: 'receipt_voucher',
        realtime: true,
    });

    // Memoize active data to prevent recalculation
    const activeData = useMemo(() => {
        if (activeTab === 'payment') {
            return {
                vouchers: paymentVouchers,
                isLoading: isLoadingPayment,
                refetch: refetchPayment,
                cancelVoucher: cancelPaymentVoucher,
                isCancelling: isCancellingPayment,
                totalAmount: totalPayment,
            };
        }
        return {
            vouchers: receiptVouchers,
            isLoading: isLoadingReceipt,
            refetch: refetchReceipt,
            cancelVoucher: cancelReceiptVoucher,
            isCancelling: isCancellingReceipt,
            totalAmount: totalReceipt,
        };
    }, [
        activeTab,
        paymentVouchers,
        receiptVouchers,
        isLoadingPayment,
        isLoadingReceipt,
        totalPayment,
        totalReceipt,
    ]);

    const { vouchers, isLoading, refetch, cancelVoucher, isCancelling, totalAmount } = activeData;

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

    // Filter vouchers - memoized to prevent recalculation
    const filteredVouchers = useMemo(() =>
        vouchers.filter((v) =>
            v.voucher_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (v.party_name?.toLowerCase() || '').includes(searchQuery.toLowerCase())
        ), [vouchers, searchQuery]
    );

    // Pagination - memoized
    const { totalPages, paginatedVouchers } = useMemo(() => {
        const total = Math.ceil(filteredVouchers.length / rowsPerPage);
        const paginated = filteredVouchers.slice(
            (currentPage - 1) * rowsPerPage,
            currentPage * rowsPerPage
        );
        return { totalPages: total, paginatedVouchers: paginated };
    }, [filteredVouchers, rowsPerPage, currentPage]);

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
        const headers = ['#', 'Voucher No.', 'Date', 'Party Name', 'Bank/Cash', 'Amount', 'Doc. No.', 'Note'];
        const rows = filteredVouchers.map((v, index) => [
            index + 1,
            v.voucher_number,
            formatDate(v.voucher_date),
            v.party_name || '-',
            v.reference_number ? 'Bank' : 'Cash',
            v.total_amount,
            v.reference_number || '-',
            v.narration || '-',
        ]);

        const csvContent = [
            `${activeTab === 'payment' ? 'Payment' : 'Receipt'} Vouchers Report`,
            `Generated: ${new Date().toLocaleDateString()}`,
            '',
            headers.join(','),
            ...rows.map((row) => row.join(',')),
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${activeTab}_vouchers_${new Date().toISOString().split('T')[0]}.csv`;
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

    // Table columns - memoized
    const columns: Column<Voucher>[] = useMemo(() => [
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
            header: 'Voucher No.',
            render: (v) => (
                <span className="font-mono font-medium">{v.voucher_number}</span>
            ),
        },
        {
            key: 'voucher_date',
            header: 'Voucher Date',
            render: (v) => formatDate(v.voucher_date),
        },
        {
            key: 'party_name',
            header: 'Party Name',
            render: (v) => v.party_name || '-',
        },
        {
            key: 'payment_mode',
            header: 'Bank/Cash',
            render: (v) => (
                <Badge variant={v.reference_number ? 'default' : 'secondary'}>
                    {v.reference_number ? 'Bank' : 'Cash'}
                </Badge>
            ),
        },
        {
            key: 'total_amount',
            header: 'Amount',
            render: (v) => (
                <span className="font-semibold">{formatCurrency(v.total_amount)}</span>
            ),
            className: 'text-right',
        },
        {
            key: 'reference_number',
            header: 'Doc. No.',
            render: (v) => v.reference_number || '-',
        },
        {
            key: 'narration',
            header: 'Note',
            render: (v) => (
                <span className="text-sm text-muted-foreground truncate max-w-[200px]">
                    {v.narration || '-'}
                </span>
            ),
        },
    ], [currentPage, rowsPerPage]);

    // Loading skeleton
    if (isLoadingPayment && isLoadingReceipt) {
        return (
            <PageContainer title="Payment Voucher">
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
        <PageContainer title="Payment Voucher">
            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'payment' | 'receipt')} className="mb-6">
                <TabsList className="grid w-[400px] grid-cols-2">
                    <TabsTrigger value="payment">Payment Voucher</TabsTrigger>
                    <TabsTrigger value="receipt">Receipt Voucher</TabsTrigger>
                </TabsList>

                {/* Summary Cards - outside tabs to prevent remount */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-6">
                    <div className="bg-card rounded-xl border p-4">
                        <p className="text-sm text-muted-foreground">
                            Total {activeTab === 'payment' ? 'Payments' : 'Receipts'}
                        </p>
                        <p className="text-2xl font-bold">
                            {vouchers.filter(v => v.status === 'confirmed').length}
                        </p>
                    </div>
                    <div className="bg-card rounded-xl border p-4">
                        <p className="text-sm text-muted-foreground">Total Amount</p>
                        <p className="text-2xl font-bold text-primary">{formatCurrency(totalAmount)}</p>
                    </div>
                    <div className="bg-card rounded-xl border p-4">
                        <p className="text-sm text-muted-foreground">Average Amount</p>
                        <p className="text-2xl font-bold">
                            {formatCurrency(vouchers.length > 0 ? totalAmount / vouchers.length : 0)}
                        </p>
                    </div>
                </div>

                {/* Header Actions - outside tabs */}
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

                        <Button onClick={() => setIsCreateDialogOpen(true)}>
                            <Plus className="h-4 w-4 mr-2" />
                            Add Voucher
                        </Button>
                    </div>
                </div>

                {/* Data Table - inside TabsContent but data is pre-loaded */}
                <TabsContent value={activeTab} className="mt-0">
                    <DataTable
                        columns={columns}
                        data={paginatedVouchers}
                        keyExtractor={(v) => v.id}
                        emptyMessage={`No ${activeTab} vouchers found`}
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
                </TabsContent>
            </Tabs>

            {/* Dialogs - outside tabs to preserve state */}
            <PaymentVoucherDialog
                open={isCreateDialogOpen}
                onOpenChange={setIsCreateDialogOpen}
                voucherType={activeTab}
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
                title="Cancel Voucher"
                description={`Are you sure you want to cancel voucher "${selectedVoucher?.voucher_number}"? This will reverse all ledger entries.`}
                confirmLabel="Cancel Voucher"
                onConfirm={confirmCancel}
                isLoading={isCancelling}
                variant="destructive"
            />
        </PageContainer>
    );
}
