import { useState } from 'react';
import { Plus, Eye, X } from 'lucide-react';
import { PageContainer } from '@/components/shared/PageContainer';
import { TableToolbar } from '@/components/shared/TableToolbar';
import { DataTable, Column } from '@/components/shared/DataTable';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useVouchers, Voucher } from '@/hooks/useVouchers';
import { SalesEnquiryDialog } from '@/components/sales/SalesEnquiryDialog';
import { VoucherViewDialog } from '@/components/accounting/VoucherViewDialog';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { exportToCSV, formatDateForExport, formatCurrencyForExport } from '@/lib/exportUtils';

export default function SalesEnquiryPage() {
    const { vouchers, isLoading, refetch, cancelVoucher, isCancelling } = useVouchers({
        voucherType: 'sales_enquiry',
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

    const activeVouchers = vouchers.filter(v => activeTab === 'list' ? v.status === 'confirmed' : v.status === 'cancelled');

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

    const handleExport = () => {
        exportToCSV(
            filteredVouchers,
            [
                { key: 'voucher_number', header: 'Enquiry No.' },
                { key: 'voucher_date', header: 'Date', render: (v) => formatDateForExport(v.voucher_date) },
                { key: 'party_name', header: 'Customer Name', render: (v) => v.party_name || '-' },
                { key: 'contact_person', header: 'Contact Person', render: (v: any) => v.contact_person || '-' },
                { key: 'contact_phone', header: 'Phone', render: (v: any) => v.contact_phone || '-' },
                { key: 'state', header: 'State', render: (v: any) => v.state || '-' },
                { key: 'total_amount', header: 'Amount', render: (v) => formatCurrencyForExport(v.total_amount) },
                { key: 'status', header: 'Status', render: (v) => v.status || 'draft' },
            ],
            'sales_enquiries',
            'Sales Enquiry Report'
        );
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'confirmed': return <Badge className="bg-emerald-500/20 text-emerald-600 border-emerald-500/30">Active</Badge>;
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
        { key: 'voucher_number', header: 'Enquiry No.', render: (v) => <span className="font-mono font-medium text-primary">{v.voucher_number}</span> },
        { key: 'voucher_date', header: 'Date', render: (v) => formatDate(v.voucher_date) },
        { key: 'party_name', header: 'Customer Name', render: (v) => v.party_name || '-' },
        { key: 'contact_person', header: 'Contact Person', render: (v: any) => v.contact_person || '-' },
        { key: 'contact_phone', header: 'Phone', render: (v: any) => v.contact_phone || '-' },
        { key: 'state', header: 'State', render: (v: any) => v.state || '-' },
        { key: 'reference_by', header: 'Reference By', render: (v: any) => v.reference_by || '-' },
        { key: 'status', header: 'Status', render: (v) => getStatusBadge(v.status || 'draft') },
        { key: 'created_at', header: 'Created', render: (v) => <div className="text-xs text-muted-foreground">{formatDateTime(v.created_at)}</div> },
    ];

    if (isLoading) return <PageContainer title="Sales Enquiry"><div className="space-y-4"><Skeleton className="h-10 w-64" /><div className="bg-card rounded-xl border">{[...Array(8)].map((_, i) => <Skeleton key={i} className="h-12 m-2" />)}</div></div></PageContainer>;

    return (
        <PageContainer title="Sales Enquiry">
            <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as any); setCurrentPage(1); }}>
                <div className="flex items-center justify-between mb-6">
                    <TabsList>
                        <TabsTrigger value="list" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                            Enquiry List
                        </TabsTrigger>
                        <TabsTrigger value="cancelled" className="data-[state=active]:bg-destructive data-[state=active]:text-destructive-foreground">
                            Cancelled
                        </TabsTrigger>
                    </TabsList>
                    <Button onClick={() => setIsCreateDialogOpen(true)}>
                        <Plus className="h-4 w-4 mr-2" />Add Enquiry
                    </Button>
                </div>

                <h2 className="text-lg font-semibold mb-4">Sales Enquiry</h2>

                <TableToolbar
                    onRefresh={refetch}
                    onExport={handleExport}
                    searchValue={searchQuery}
                    onSearchChange={setSearchQuery}
                    searchPlaceholder="Search..."
                    pageSize={rowsPerPage}
                    onPageSizeChange={(v) => { setRowsPerPage(v); setCurrentPage(1); }}
                />

                <TabsContent value="list" className="mt-0">
                    <DataTable columns={columns} data={paginatedVouchers} keyExtractor={(v) => v.id} emptyMessage="No data available in table" onRowClick={handleView} />
                </TabsContent>

                <TabsContent value="cancelled" className="mt-0">
                    <DataTable columns={columns} data={paginatedVouchers} keyExtractor={(v) => v.id} emptyMessage="No cancelled enquiries" onRowClick={handleView} />
                </TabsContent>

                <div className="flex items-center justify-between mt-4">
                    <p className="text-sm text-muted-foreground">Showing {filteredVouchers.length === 0 ? 0 : ((currentPage - 1) * rowsPerPage) + 1} to {Math.min(currentPage * rowsPerPage, filteredVouchers.length)} of {filteredVouchers.length} entries</p>
                    {totalPages > 1 && (
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>Previous</Button>
                            <span className="px-3 py-1 bg-primary text-primary-foreground rounded text-sm">{currentPage}</span>
                            <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>Next</Button>
                        </div>
                    )}
                </div>
            </Tabs>

            <SalesEnquiryDialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen} />
            {selectedVoucher && <VoucherViewDialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen} voucherId={selectedVoucher.id} />}
            <ConfirmDialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen} title="Cancel Sales Enquiry" description={`Cancel "${selectedVoucher?.voucher_number}"?`} confirmLabel="Cancel" onConfirm={confirmCancel} isLoading={isCancelling} variant="destructive" />
        </PageContainer>
    );
}
