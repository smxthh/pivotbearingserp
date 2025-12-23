import { useState } from 'react';
import { Plus, RefreshCw, Search, Eye, X } from 'lucide-react';
import { PageContainer } from '@/components/shared/PageContainer';
import { DataTable, Column } from '@/components/shared/DataTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useVouchers, Voucher } from '@/hooks/useVouchers';
// Dialog for recording TCS/TDS payments
import { TCSTDSPaymentDialog } from '@/components/accounting/TCSTDSPaymentDialog';
import { VoucherViewDialog } from '@/components/accounting/VoucherViewDialog';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';

export default function TCSTDSPaymentPage() {
    const { vouchers, isLoading, refetch, cancelVoucher, isCancelling, totalAmount } = useVouchers({
        voucherType: 'tcs_tds_payment',
    });

    const [searchQuery, setSearchQuery] = useState('');
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
    const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
    const [selectedVoucher, setSelectedVoucher] = useState<Voucher | null>(null);

    const formatCurrency = (value: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(value);
    const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

    const filteredVouchers = vouchers.filter((v) =>
        v.voucher_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (v.narration?.toLowerCase() || '').includes(searchQuery.toLowerCase())
    );

    const handleView = (voucher: Voucher) => { setSelectedVoucher(voucher); setIsViewDialogOpen(true); };
    const handleCancel = (voucher: Voucher) => { setSelectedVoucher(voucher); setIsCancelDialogOpen(true); };
    const confirmCancel = async () => { if (selectedVoucher) { await cancelVoucher.mutateAsync(selectedVoucher.id); setIsCancelDialogOpen(false); setSelectedVoucher(null); } };

    const getStatusBadge = (status: string) => {
        switch (status) { case 'confirmed': return <Badge className="bg-success">Paid</Badge>; case 'cancelled': return <Badge variant="destructive">Cancelled</Badge>; default: return <Badge variant="outline">{status}</Badge>; }
    };

    // Separate TCS and TDS
    const tdsPayments = vouchers.filter(v => v.status === 'confirmed' && v.tds_amount > 0);
    const tcsPayments = vouchers.filter(v => v.status === 'confirmed' && v.tcs_amount > 0);
    const totalTDS = tdsPayments.reduce((sum, v) => sum + v.tds_amount, 0);
    const totalTCS = tcsPayments.reduce((sum, v) => sum + v.tcs_amount, 0);

    const columns: Column<Voucher>[] = [
        {
            key: 'actions', header: 'Action', render: (voucher) => (
                <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleView(voucher); }} className="h-8 w-8"><Eye className="h-4 w-4 text-primary" /></Button>
                    {voucher.status === 'confirmed' && <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleCancel(voucher); }} className="h-8 w-8"><X className="h-4 w-4 text-destructive" /></Button>}
                </div>
            ), className: 'w-24'
        },
        { key: 'voucher_number', header: 'Payment No.', render: (v) => <span className="font-mono font-medium">{v.voucher_number}</span> },
        { key: 'voucher_date', header: 'Date', render: (v) => formatDate(v.voucher_date) },
        { key: 'type', header: 'Type', render: (v) => v.tds_amount > 0 ? <Badge variant="outline">TDS</Badge> : <Badge variant="secondary">TCS</Badge> },
        { key: 'narration', header: 'Description', render: (v) => v.narration || '-' },
        { key: 'tds_amount', header: 'TDS', render: (v) => v.tds_amount > 0 ? formatCurrency(v.tds_amount) : '-', className: 'text-right' },
        { key: 'tcs_amount', header: 'TCS', render: (v) => v.tcs_amount > 0 ? formatCurrency(v.tcs_amount) : '-', className: 'text-right' },
        { key: 'total_amount', header: 'Total', render: (v) => <span className="font-semibold">{formatCurrency(v.total_amount)}</span>, className: 'text-right' },
        { key: 'status', header: 'Status', render: (v) => getStatusBadge(v.status) },
    ];

    if (isLoading) return <PageContainer title="TCS/TDS Payment"><div className="space-y-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}</div></PageContainer>;

    return (
        <PageContainer title="TCS/TDS Payment">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card className="p-4"><p className="text-sm text-muted-foreground">Total TDS Paid</p><p className="text-2xl font-bold text-primary">{formatCurrency(totalTDS)}</p><p className="text-xs text-muted-foreground">{tdsPayments.length} payment(s)</p></Card>
                <Card className="p-4"><p className="text-sm text-muted-foreground">Total TCS Collected</p><p className="text-2xl font-bold text-success">{formatCurrency(totalTCS)}</p><p className="text-xs text-muted-foreground">{tcsPayments.length} payment(s)</p></Card>
                <Card className="p-4"><p className="text-sm text-muted-foreground">Total Payments</p><p className="text-2xl font-bold">{formatCurrency(totalAmount)}</p><p className="text-xs text-muted-foreground">{vouchers.filter(v => v.status === 'confirmed').length} payment(s)</p></Card>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between gap-4 mb-6">
                <Button variant="outline" onClick={() => refetch()}><RefreshCw className="h-4 w-4 mr-2" />Refresh</Button>
                <div className="flex items-center gap-3">
                    <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 w-64" /></div>
                    <Button onClick={() => setIsCreateDialogOpen(true)}><Plus className="h-4 w-4 mr-2" />Record Payment</Button>
                </div>
            </div>

            <DataTable columns={columns} data={filteredVouchers} keyExtractor={(v) => v.id} emptyMessage="No TCS/TDS payments recorded" onRowClick={handleView} />

            <TCSTDSPaymentDialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen} />
            {selectedVoucher && <VoucherViewDialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen} voucherId={selectedVoucher.id} />}
            <ConfirmDialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen} title="Cancel Payment" description={`Cancel "${selectedVoucher?.voucher_number}"?`} confirmLabel="Cancel" onConfirm={confirmCancel} isLoading={isCancelling} variant="destructive" />
        </PageContainer>
    );
}
