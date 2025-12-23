import { useState } from 'react';
import { Plus, RefreshCw, Search, Eye, X } from 'lucide-react';
import { PageContainer } from '@/components/shared/PageContainer';
import { DataTable, Column } from '@/components/shared/DataTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useVouchers, Voucher } from '@/hooks/useVouchers';
import { useGSTSummary } from '@/hooks/useGSTSummary';
import { GSTPaymentDialog } from '@/components/accounting/GSTPaymentDialog';
import { VoucherViewDialog } from '@/components/accounting/VoucherViewDialog';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';

export default function GSTPaymentPage() {
    const currentDate = new Date();
    const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());

    const { vouchers, isLoading, refetch, cancelVoucher, isCancelling, totalAmount } = useVouchers({
        voucherType: 'gst_payment',
    });

    const { summary, isLoading: loadingSummary } = useGSTSummary({ month: selectedMonth, year: selectedYear });

    const [searchQuery, setSearchQuery] = useState('');
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
    const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
    const [selectedVoucher, setSelectedVoucher] = useState<Voucher | null>(null);

    const formatCurrency = (value: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(value);
    const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const years = [2024, 2025, 2026];

    const filteredVouchers = vouchers.filter((v) => v.voucher_number.toLowerCase().includes(searchQuery.toLowerCase()));

    const handleView = (voucher: Voucher) => { setSelectedVoucher(voucher); setIsViewDialogOpen(true); };
    const handleCancel = (voucher: Voucher) => { setSelectedVoucher(voucher); setIsCancelDialogOpen(true); };
    const confirmCancel = async () => { if (selectedVoucher) { await cancelVoucher.mutateAsync(selectedVoucher.id); setIsCancelDialogOpen(false); setSelectedVoucher(null); } };

    const getStatusBadge = (status: string) => {
        switch (status) { case 'confirmed': return <Badge className="bg-success">Paid</Badge>; case 'cancelled': return <Badge variant="destructive">Cancelled</Badge>; default: return <Badge variant="outline">{status}</Badge>; }
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
        { key: 'voucher_number', header: 'Payment No.', render: (v) => <span className="font-mono font-medium">{v.voucher_number}</span> },
        { key: 'voucher_date', header: 'Date', render: (v) => formatDate(v.voucher_date) },
        { key: 'narration', header: 'Period', render: (v) => v.narration || '-' },
        { key: 'total_amount', header: 'Amount Paid', render: (v) => <span className="font-semibold">{formatCurrency(v.total_amount)}</span>, className: 'text-right' },
        { key: 'status', header: 'Status', render: (v) => getStatusBadge(v.status) },
    ];

    if (isLoading || loadingSummary) return <PageContainer title="GST Payment"><div className="space-y-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}</div></PageContainer>;

    const netPayable = summary?.net.payable || 0;
    const totalPaid = vouchers.filter(v => v.status === 'confirmed').reduce((sum, v) => sum + v.total_amount, 0);
    const balance = netPayable - totalPaid;

    return (
        <PageContainer title="GST Payment">
            {/* Period Selector */}
            <div className="flex items-center gap-3 mb-6">
                <Select value={selectedMonth.toString()} onValueChange={v => setSelectedMonth(Number(v))}>
                    <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
                    <SelectContent>{months.map((m, i) => <SelectItem key={i} value={(i + 1).toString()}>{m}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={selectedYear.toString()} onValueChange={v => setSelectedYear(Number(v))}>
                    <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
                    <SelectContent>{years.map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}</SelectContent>
                </Select>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <Card className="p-4"><p className="text-sm text-muted-foreground">Output GST (Sales)</p><p className="text-2xl font-bold text-destructive">{formatCurrency(summary?.sales.total || 0)}</p></Card>
                <Card className="p-4"><p className="text-sm text-muted-foreground">Input GST (Purchases)</p><p className="text-2xl font-bold text-success">{formatCurrency(summary?.purchases.total || 0)}</p></Card>
                <Card className="p-4"><p className="text-sm text-muted-foreground">Net GST Payable</p><p className={`text-2xl font-bold ${netPayable > 0 ? 'text-destructive' : 'text-success'}`}>{formatCurrency(netPayable)}</p></Card>
                <Card className="p-4"><p className="text-sm text-muted-foreground">Balance Due</p><p className={`text-2xl font-bold ${balance > 0 ? 'text-warning' : 'text-success'}`}>{formatCurrency(balance)}</p></Card>
            </div>

            {/* GST Breakdown */}
            <div className="grid grid-cols-3 gap-4 mb-6 p-4 bg-muted/30 rounded-lg">
                <div className="text-center"><p className="text-sm text-muted-foreground">CGST Net</p><p className={`text-lg font-semibold ${(summary?.net.cgst || 0) > 0 ? 'text-destructive' : 'text-success'}`}>{formatCurrency(summary?.net.cgst || 0)}</p></div>
                <div className="text-center"><p className="text-sm text-muted-foreground">SGST Net</p><p className={`text-lg font-semibold ${(summary?.net.sgst || 0) > 0 ? 'text-destructive' : 'text-success'}`}>{formatCurrency(summary?.net.sgst || 0)}</p></div>
                <div className="text-center"><p className="text-sm text-muted-foreground">IGST Net</p><p className={`text-lg font-semibold ${(summary?.net.igst || 0) > 0 ? 'text-destructive' : 'text-success'}`}>{formatCurrency(summary?.net.igst || 0)}</p></div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                    <Button variant="outline" onClick={() => refetch()}><RefreshCw className="h-4 w-4 mr-2" />Refresh</Button>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 w-64" /></div>
                    <Button onClick={() => setIsCreateDialogOpen(true)} disabled={balance <= 0}><Plus className="h-4 w-4 mr-2" />Record GST Payment</Button>
                </div>
            </div>

            <DataTable columns={columns} data={filteredVouchers} keyExtractor={(v) => v.id} emptyMessage="No GST payments recorded" onRowClick={handleView} />

            <GSTPaymentDialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen} summary={summary} />
            {selectedVoucher && <VoucherViewDialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen} voucherId={selectedVoucher.id} />}
            <ConfirmDialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen} title="Cancel Payment" description={`Cancel "${selectedVoucher?.voucher_number}"?`} confirmLabel="Cancel" onConfirm={confirmCancel} isLoading={isCancelling} variant="destructive" />
        </PageContainer>
    );
}
