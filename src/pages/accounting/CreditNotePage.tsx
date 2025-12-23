import { useState } from 'react';
import { Plus, RefreshCw, Search, Eye, X } from 'lucide-react';
import { PageContainer } from '@/components/shared/PageContainer';
import { DataTable, Column } from '@/components/shared/DataTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useVouchers, Voucher } from '@/hooks/useVouchers';
import { CreditNoteDialog } from '@/components/accounting/CreditNoteDialog';
import { VoucherViewDialog } from '@/components/accounting/VoucherViewDialog';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';

export default function CreditNotePage() {
    const { vouchers, isLoading, refetch, cancelVoucher, isCancelling, totalAmount } = useVouchers({
        voucherType: 'credit_note',
    });

    const [searchQuery, setSearchQuery] = useState('');
    const [rowsPerPage, setRowsPerPage] = useState(25);
    const [currentPage, setCurrentPage] = useState(1);
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
    const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
    const [selectedVoucher, setSelectedVoucher] = useState<Voucher | null>(null);

    const formatCurrency = (value: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(value);
    const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

    const filteredVouchers = vouchers.filter((v) => v.voucher_number.toLowerCase().includes(searchQuery.toLowerCase()) || (v.party_name?.toLowerCase() || '').includes(searchQuery.toLowerCase()));
    const totalPages = Math.ceil(filteredVouchers.length / rowsPerPage);
    const paginatedVouchers = filteredVouchers.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

    const handleView = (voucher: Voucher) => { setSelectedVoucher(voucher); setIsViewDialogOpen(true); };
    const handleCancel = (voucher: Voucher) => { setSelectedVoucher(voucher); setIsCancelDialogOpen(true); };
    const confirmCancel = async () => { if (selectedVoucher) { await cancelVoucher.mutateAsync(selectedVoucher.id); setIsCancelDialogOpen(false); setSelectedVoucher(null); } };

    const getStatusBadge = (status: string) => {
        switch (status) { case 'confirmed': return <Badge className="bg-success">Confirmed</Badge>; case 'cancelled': return <Badge variant="destructive">Cancelled</Badge>; default: return <Badge variant="outline">{status}</Badge>; }
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
        { key: 'index', header: '#', render: (_, index) => (currentPage - 1) * rowsPerPage + (index || 0) + 1, className: 'w-12' },
        { key: 'voucher_number', header: 'Credit Note No.', render: (v) => <span className="font-mono font-medium">{v.voucher_number}</span> },
        { key: 'voucher_date', header: 'Date', render: (v) => formatDate(v.voucher_date) },
        { key: 'party_name', header: 'Customer', render: (v) => v.party_name || '-' },
        { key: 'reference_number', header: 'Ref. Invoice', render: (v) => v.reference_number || '-' },
        { key: 'total_amount', header: 'Amount', render: (v) => <span className="font-semibold text-destructive">{formatCurrency(v.total_amount)}</span>, className: 'text-right' },
        { key: 'status', header: 'Status', render: (v) => getStatusBadge(v.status) },
    ];

    if (isLoading) return <PageContainer title="Credit Note"><div className="space-y-4"><Skeleton className="h-10 w-64" /><div className="bg-card rounded-xl border">{[...Array(8)].map((_, i) => <Skeleton key={i} className="h-12 m-2" />)}</div></div></PageContainer>;

    return (
        <PageContainer title="Credit Note">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="bg-card rounded-xl border p-4"><p className="text-sm text-muted-foreground">Total Credit Notes</p><p className="text-2xl font-bold">{vouchers.filter(v => v.status === 'confirmed').length}</p></div>
                <div className="bg-card rounded-xl border p-4"><p className="text-sm text-muted-foreground">Total Returns</p><p className="text-2xl font-bold text-destructive">{formatCurrency(totalAmount)}</p></div>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                    <Select value={rowsPerPage.toString()} onValueChange={(v) => { setRowsPerPage(Number(v)); setCurrentPage(1); }}><SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="25">Show 25 rows</SelectItem><SelectItem value="50">Show 50 rows</SelectItem></SelectContent></Select>
                    <Button variant="outline" onClick={() => refetch()}><RefreshCw className="h-4 w-4 mr-2" />Refresh</Button>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 w-64" /></div>
                    <Button onClick={() => setIsCreateDialogOpen(true)}><Plus className="h-4 w-4 mr-2" />New Credit Note</Button>
                </div>
            </div>

            <DataTable columns={columns} data={paginatedVouchers} keyExtractor={(v) => v.id} emptyMessage="No credit notes found" onRowClick={handleView} />
            {totalPages > 1 && <div className="flex items-center justify-end gap-2 mt-4"><Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>Previous</Button><Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>Next</Button></div>}

            <CreditNoteDialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen} />
            {selectedVoucher && <VoucherViewDialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen} voucherId={selectedVoucher.id} />}
            <ConfirmDialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen} title="Cancel Credit Note" description={`Cancel "${selectedVoucher?.voucher_number}"?`} confirmLabel="Cancel" onConfirm={confirmCancel} isLoading={isCancelling} variant="destructive" />
        </PageContainer>
    );
}
