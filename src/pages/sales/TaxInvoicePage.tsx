import { useState } from 'react';
import { Plus, RefreshCw, Search, Eye, X, Download } from 'lucide-react';
import { PageContainer } from '@/components/shared/PageContainer';
import { DataTable, Column } from '@/components/shared/DataTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useVouchers, Voucher } from '@/hooks/useVouchers';
import { TaxInvoiceDialog } from '@/components/accounting/TaxInvoiceDialog';
import { VoucherViewDialog } from '@/components/accounting/VoucherViewDialog';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';

export default function TaxInvoicePage() {
    const { vouchers, isLoading, refetch, cancelVoucher, isCancelling, totalAmount, totalTax } = useVouchers({
        voucherType: 'tax_invoice',
        realtime: true,
    });

    const [activeTab, setActiveTab] = useState<'list' | 'cancelled'>('list');
    const [searchQuery, setSearchQuery] = useState('');
    const [rowsPerPage, setRowsPerPage] = useState(25);
    const [currentPage, setCurrentPage] = useState(1);
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
    const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
    const [selectedVoucher, setSelectedVoucher] = useState<Voucher | null>(null);

    const formatCurrency = (value: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(value);
    const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const formatDateTime = (dateString: string) => new Date(dateString).toLocaleString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

    // Filter by tab
    const activeVouchers = vouchers.filter(v => activeTab === 'list' ? v.status === 'confirmed' : v.status === 'cancelled');

    // Filter by search
    const filteredVouchers = activeVouchers.filter((v) => {
        const matchesSearch = v.voucher_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (v.party_name?.toLowerCase() || '').includes(searchQuery.toLowerCase());
        return matchesSearch;
    });

    const totalPages = Math.ceil(filteredVouchers.length / rowsPerPage);
    const paginatedVouchers = filteredVouchers.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

    const handleView = (voucher: Voucher) => { setSelectedVoucher(voucher); setIsViewDialogOpen(true); };
    const handleCancel = (voucher: Voucher) => { setSelectedVoucher(voucher); setIsCancelDialogOpen(true); };
    const confirmCancel = async () => { if (selectedVoucher) { await cancelVoucher.mutateAsync(selectedVoucher.id); setIsCancelDialogOpen(false); setSelectedVoucher(null); } };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'confirmed': return <Badge className="bg-amber-500/20 text-amber-600 border-amber-500/30">Pending</Badge>;
            case 'cancelled': return <Badge variant="destructive">Cancelled</Badge>;
            default: return <Badge variant="outline">{status}</Badge>;
        }
    };

    const columns: Column<Voucher>[] = [
        {
            key: 'actions', header: 'Action', render: (voucher) => (
                <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleView(voucher); }} className="h-8 w-8"><Eye className="h-4 w-4 text-primary" /></Button>
                    {voucher.status === 'confirmed' && <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleCancel(voucher); }} className="h-8 w-8"><X className="h-4 w-4 text-destructive" /></Button>}
                </div>
            ), className: 'w-24'
        },
        { key: 'ship_to', header: 'Ship To', render: (v: any) => v.ship_to || v.party_name?.split(' ')[0] || '-' },
        { key: 'voucher_number', header: 'Inv No.', render: (v) => <span className="font-mono font-medium text-primary">{v.voucher_number}</span> },
        { key: 'voucher_date', header: 'Inv Date', render: (v) => formatDate(v.voucher_date) },
        { key: 'party_name', header: 'Customer Name', render: (v) => v.party_name || '-' },
        { key: 'taxable_amount', header: 'Taxable Amount', render: (v) => formatCurrency(v.taxable_amount || v.subtotal || 0), className: 'text-right' },
        { key: 'total_tax', header: 'GST Amount', render: (v) => formatCurrency(v.total_tax || 0), className: 'text-right' },
        { key: 'total_amount', header: 'Net Amount', render: (v) => <span className="font-semibold">{formatCurrency(v.total_amount)}</span>, className: 'text-right' },
        { key: 'einv_ack_no', header: 'EINV ACK No.', render: (v: any) => v.einv_ack_no || '-' },
        { key: 'ewb_no', header: 'EWB No.', render: (v: any) => v.ewb_no || '-' },
        { key: 'created_at', header: 'Created By & Date', render: (v) => <div className="text-xs"><div className="text-primary font-medium">admin</div><div className="text-muted-foreground">{formatDateTime(v.created_at)}</div></div> },
    ];

    if (isLoading) return <PageContainer title="Sales Invoice"><div className="space-y-4"><Skeleton className="h-10 w-64" /><div className="bg-card rounded-xl border">{[...Array(8)].map((_, i) => <Skeleton key={i} className="h-12 m-2" />)}</div></div></PageContainer>;

    return (
        <PageContainer title="Sales Invoice">
            <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as any); setCurrentPage(1); }}>
                {/* Header with Tabs and Add Button */}
                <div className="flex items-center justify-between mb-6">
                    <TabsList>
                        <TabsTrigger value="list" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                            Invoice List
                        </TabsTrigger>
                        <TabsTrigger value="cancelled" className="data-[state=active]:bg-destructive data-[state=active]:text-destructive-foreground">
                            Cancelled Inv.
                        </TabsTrigger>
                    </TabsList>
                    <Button onClick={() => setIsCreateDialogOpen(true)}>
                        <Plus className="h-4 w-4 mr-2" />Add Invoice
                    </Button>
                </div>

                {/* Title */}
                <h2 className="text-lg font-semibold mb-4">Sales Invoice</h2>

                {/* Actions Row */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-3">
                        <Select value={rowsPerPage.toString()} onValueChange={(v) => { setRowsPerPage(Number(v)); setCurrentPage(1); }}>
                            <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="25">Show 25 rows</SelectItem>
                                <SelectItem value="50">Show 50 rows</SelectItem>
                                <SelectItem value="100">Show 100 rows</SelectItem>
                            </SelectContent>
                        </Select>
                        <Button variant="outline" size="sm">Excel</Button>
                        <Button variant="outline" onClick={() => refetch()}><RefreshCw className="h-4 w-4 mr-2" />Refresh</Button>
                    </div>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="Search...." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 w-64" />
                    </div>
                </div>

                <TabsContent value="list" className="mt-0">
                    <DataTable columns={columns} data={paginatedVouchers} keyExtractor={(v) => v.id} emptyMessage="No data available in table" onRowClick={handleView} />
                </TabsContent>

                <TabsContent value="cancelled" className="mt-0">
                    <DataTable columns={columns} data={paginatedVouchers} keyExtractor={(v) => v.id} emptyMessage="No cancelled invoices" onRowClick={handleView} />
                </TabsContent>

                {/* Pagination */}
                <div className="flex items-center justify-between mt-4">
                    <p className="text-sm text-muted-foreground">Showing {((currentPage - 1) * rowsPerPage) + 1} to {Math.min(currentPage * rowsPerPage, filteredVouchers.length)} of {filteredVouchers.length} entries</p>
                    {totalPages > 1 && (
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>Previous</Button>
                            <span className="px-3 py-1 bg-primary text-primary-foreground rounded text-sm">{currentPage}</span>
                            <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>Next</Button>
                        </div>
                    )}
                </div>
            </Tabs>

            <TaxInvoiceDialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen} />
            {selectedVoucher && <VoucherViewDialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen} voucherId={selectedVoucher.id} />}
            <ConfirmDialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen} title="Cancel Tax Invoice" description={`Cancel "${selectedVoucher?.voucher_number}"?`} cancelLabel="Go Back" confirmLabel="Yes, Cancel Invoice" onConfirm={confirmCancel} isLoading={isCancelling} variant="destructive" />
        </PageContainer>
    );
}
