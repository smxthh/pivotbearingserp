import { useState } from 'react';
import { Plus, RefreshCw, Search, Eye, X, BookOpen } from 'lucide-react';
import { PageContainer } from '@/components/shared/PageContainer';
import { DataTable, Column } from '@/components/shared/DataTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useVouchers, Voucher } from '@/hooks/useVouchers';
import { JournalEntryDialog } from '@/components/accounting/JournalEntryDialog';
import { GSTJournalDialog } from '@/components/accounting/GSTJournalDialog';
import { GSTHavalaDialog } from '@/components/accounting/GSTHavalaDialog';
import { HavalaDialog } from '@/components/accounting/HavalaDialog';
import { VoucherViewDialog } from '@/components/accounting/VoucherViewDialog';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';

export default function JournalEntryPage() {
    const { vouchers, isLoading, refetch, cancelVoucher, isCancelling, totalAmount } = useVouchers({
        voucherType: ['journal_entry', 'gst_journal', 'gst_havala', 'havala'],
    });

    const [searchQuery, setSearchQuery] = useState('');
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
    const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
    const [selectedVoucher, setSelectedVoucher] = useState<Voucher | null>(null);
    const [isGSTJournalOpen, setIsGSTJournalOpen] = useState(false);
    const [isGSTHavalaOpen, setIsGSTHavalaOpen] = useState(false);
    const [isHavalaOpen, setIsHavalaOpen] = useState(false);

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
        switch (status) { case 'confirmed': return <Badge className="bg-success">Posted</Badge>; case 'draft': return <Badge variant="secondary">Draft</Badge>; case 'cancelled': return <Badge variant="destructive">Cancelled</Badge>; default: return <Badge variant="outline">{status}</Badge>; }
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
        { key: 'voucher_number', header: 'Journal No.', render: (v) => <span className="font-mono font-medium">{v.voucher_number}</span> },
        { key: 'voucher_date', header: 'Date', render: (v) => formatDate(v.voucher_date) },
        { key: 'narration', header: 'Narration', render: (v) => <span className="max-w-[300px] truncate block">{v.narration || '-'}</span> },
        { key: 'total_amount', header: 'Amount', render: (v) => <span className="font-semibold">{formatCurrency(v.total_amount)}</span>, className: 'text-right' },
        { key: 'status', header: 'Status', render: (v) => getStatusBadge(v.status) },
    ];

    if (isLoading) return <PageContainer title="Journal Entry"><div className="space-y-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}</div></PageContainer>;

    return (
        <PageContainer title="Journal Entry">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <Card className="p-4"><p className="text-sm text-muted-foreground">Total Journal Entries</p><p className="text-2xl font-bold">{vouchers.filter(v => v.status === 'confirmed').length}</p></Card>
                <Card className="p-4"><p className="text-sm text-muted-foreground">Total Value</p><p className="text-2xl font-bold">{formatCurrency(totalAmount)}</p></Card>
            </div>

            {/* Info Banner */}
            <div className="flex items-center gap-3 p-4 mb-6 bg-primary/5 border border-primary/20 rounded-lg">
                <BookOpen className="h-5 w-5 text-primary" />
                <p className="text-sm">Journal entries are used for adjustments, corrections, and non-standard transactions that don't fit other voucher types.</p>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between gap-4 mb-6">
                <Button variant="outline" onClick={() => refetch()}><RefreshCw className="h-4 w-4 mr-2" />Refresh</Button>
                <div className="flex items-center gap-3">
                    <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 w-64" /></div>
                    <Button variant="outline" onClick={() => setIsGSTJournalOpen(true)} className="border-primary text-primary hover:bg-primary hover:text-white"><Plus className="h-4 w-4 mr-2" />GST Journal</Button>
                    <Button variant="outline" onClick={() => setIsGSTHavalaOpen(true)} className="border-primary text-primary hover:bg-primary hover:text-white"><Plus className="h-4 w-4 mr-2" />GST Havala</Button>
                    <Button variant="outline" onClick={() => setIsHavalaOpen(true)} className="border-primary text-primary hover:bg-primary hover:text-white"><Plus className="h-4 w-4 mr-2" />Add Havala</Button>
                    <Button onClick={() => setIsCreateDialogOpen(true)}><Plus className="h-4 w-4 mr-2" />New Journal Entry</Button>
                </div>
            </div>

            <DataTable columns={columns} data={filteredVouchers} keyExtractor={(v) => v.id} emptyMessage="No journal entries found" onRowClick={handleView} />

            <JournalEntryDialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen} />
            <GSTJournalDialog open={isGSTJournalOpen} onOpenChange={setIsGSTJournalOpen} />
            <GSTHavalaDialog open={isGSTHavalaOpen} onOpenChange={setIsGSTHavalaOpen} />
            <HavalaDialog open={isHavalaOpen} onOpenChange={setIsHavalaOpen} />
            {selectedVoucher && <VoucherViewDialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen} voucherId={selectedVoucher.id} />}
            <ConfirmDialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen} title="Cancel Journal Entry" description={`Cancel "${selectedVoucher?.voucher_number}"? This will reverse all ledger postings.`} confirmLabel="Cancel" onConfirm={confirmCancel} isLoading={isCancelling} variant="destructive" />
        </PageContainer>
    );
}
