import { useState } from 'react';
import { RefreshCw, ChevronDown, ChevronUp, Plus } from 'lucide-react';
import { PageContainer } from '@/components/shared/PageContainer';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useVouchers, Voucher } from '@/hooks/useVouchers';
import { GSTExpenseDialog } from '@/components/accounting/GSTExpenseDialog';

export default function GSTExpensePage() {
    const currentDate = new Date();
    const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
    const [expandedRates, setExpandedRates] = useState<string[]>([]);
    const [dialogOpen, setDialogOpen] = useState(false);

    const startDate = `${selectedYear}-${selectedMonth.toString().padStart(2, '0')}-01`;
    const endDate = selectedMonth === 12 ? `${selectedYear + 1}-01-01` : `${selectedYear}-${(selectedMonth + 1).toString().padStart(2, '0')}-01`;

    const { vouchers: purchaseInvoices, isLoading: loadingPurchases } = useVouchers({
        voucherType: 'purchase_invoice',
        status: 'confirmed',
        startDate,
        endDate,
    });

    const { vouchers: debitNotes, isLoading: loadingDebitNotes } = useVouchers({
        voucherType: 'debit_note',
        status: 'confirmed',
        startDate,
        endDate,
    });

    const isLoading = loadingPurchases || loadingDebitNotes;

    const formatCurrency = (value: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(value);
    const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const years = [2024, 2025, 2026];

    // Group by GST rate
    const groupByGSTRate = (vouchers: Voucher[]) => {
        const groups: Record<string, { vouchers: Voucher[]; taxable: number; cgst: number; sgst: number; igst: number; total: number }> = {};
        vouchers.forEach(v => {
            const rate = v.cgst_amount > 0 ? 'CGST+SGST' : v.igst_amount > 0 ? 'IGST' : 'NIL';
            if (!groups[rate]) groups[rate] = { vouchers: [], taxable: 0, cgst: 0, sgst: 0, igst: 0, total: 0 };
            groups[rate].vouchers.push(v);
            groups[rate].taxable += v.taxable_amount;
            groups[rate].cgst += v.cgst_amount;
            groups[rate].sgst += v.sgst_amount;
            groups[rate].igst += v.igst_amount;
            groups[rate].total += v.total_tax;
        });
        return groups;
    };

    const purchaseGroups = groupByGSTRate(purchaseInvoices);

    // Calculate totals
    const totalTaxable = purchaseInvoices.reduce((sum, v) => sum + v.taxable_amount, 0) - debitNotes.reduce((sum, v) => sum + v.taxable_amount, 0);
    const totalCGST = purchaseInvoices.reduce((sum, v) => sum + v.cgst_amount, 0) - debitNotes.reduce((sum, v) => sum + v.cgst_amount, 0);
    const totalSGST = purchaseInvoices.reduce((sum, v) => sum + v.sgst_amount, 0) - debitNotes.reduce((sum, v) => sum + v.sgst_amount, 0);
    const totalIGST = purchaseInvoices.reduce((sum, v) => sum + v.igst_amount, 0) - debitNotes.reduce((sum, v) => sum + v.igst_amount, 0);

    const totalInput = {
        taxable: totalTaxable,
        cgst: totalCGST,
        sgst: totalSGST,
        igst: totalIGST,
        total: totalCGST + totalSGST + totalIGST,
    };

    const toggleRate = (rate: string) => {
        setExpandedRates(prev => prev.includes(rate) ? prev.filter(r => r !== rate) : [...prev, rate]);
    };

    if (isLoading) return <PageContainer title="GST Expense (Input Tax)"><div className="space-y-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}</div></PageContainer>;

    return (
        <PageContainer title="GST Expense (Input Tax)">
            {/* Period Selector & Summary */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                    <Select value={selectedMonth.toString()} onValueChange={v => setSelectedMonth(Number(v))}>
                        <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
                        <SelectContent>{months.map((m, i) => <SelectItem key={i} value={(i + 1).toString()}>{m}</SelectItem>)}</SelectContent>
                    </Select>
                    <Select value={selectedYear.toString()} onValueChange={v => setSelectedYear(Number(v))}>
                        <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
                        <SelectContent>{years.map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}</SelectContent>
                    </Select>
                    <Button variant="outline" size="icon"><RefreshCw className="h-4 w-4" /></Button>
                    <Button onClick={() => setDialogOpen(true)}>
                        <Plus className="h-4 w-4 mr-2" /> Add GST Expense
                    </Button>
                </div>
                <Badge variant="outline" className="text-lg px-4 py-2">
                    Net Input GST Credit: <span className="font-bold text-success ml-2">{formatCurrency(totalInput.total)}</span>
                </Badge>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <Card className="p-4"><p className="text-sm text-muted-foreground">Total Taxable</p><p className="text-2xl font-bold">{formatCurrency(totalInput.taxable)}</p></Card>
                <Card className="p-4"><p className="text-sm text-muted-foreground">CGST Input</p><p className="text-2xl font-bold text-success">{formatCurrency(totalInput.cgst)}</p></Card>
                <Card className="p-4"><p className="text-sm text-muted-foreground">SGST Input</p><p className="text-2xl font-bold text-success">{formatCurrency(totalInput.sgst)}</p></Card>
                <Card className="p-4"><p className="text-sm text-muted-foreground">IGST Input</p><p className="text-2xl font-bold text-success">{formatCurrency(totalInput.igst)}</p></Card>
            </div>

            {/* Purchase Invoices (By Tax Rate) */}
            <h2 className="text-lg font-semibold mb-3">Purchase Invoices (Input Available) ({purchaseInvoices.length})</h2>
            <div className="space-y-4 mb-8">
                {Object.entries(purchaseGroups).map(([rate, group]) => (
                    <Collapsible key={rate} open={expandedRates.includes(rate)} onOpenChange={() => toggleRate(rate)} className="border rounded-lg bg-card">
                        <div className="flex items-center justify-between p-4 bg-muted/30">
                            <div className="flex items-center gap-4">
                                <CollapsibleTrigger asChild>
                                    <Button variant="ghost" size="sm" className="p-0">
                                        {expandedRates.includes(rate) ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                    </Button>
                                </CollapsibleTrigger>
                                <span className="font-medium">{rate}</span>
                                <Badge variant="secondary">{group.vouchers.length}</Badge>
                            </div>
                            <div className="flex items-center gap-6 text-sm">
                                <span>Taxable: <span className="font-semibold">{formatCurrency(group.taxable)}</span></span>
                                <span>Input: <span className="font-bold text-success">{formatCurrency(group.total)}</span></span>
                            </div>
                        </div>
                        <CollapsibleContent>
                            <Table>
                                <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Inv. No.</TableHead><TableHead>Supplier</TableHead><TableHead className="text-right">Taxable</TableHead><TableHead className="text-right">CGST</TableHead><TableHead className="text-right">SGST</TableHead><TableHead className="text-right">IGST</TableHead><TableHead className="text-right">Total Input</TableHead></TableRow></TableHeader>
                                <TableBody>{group.vouchers.map(v => (
                                    <TableRow key={v.id}><TableCell>{formatDate(v.voucher_date)}</TableCell><TableCell className="font-mono text-sm">{v.voucher_number}</TableCell><TableCell>{v.party_name}</TableCell><TableCell className="text-right">{formatCurrency(v.taxable_amount)}</TableCell><TableCell className="text-right text-success">{formatCurrency(v.cgst_amount)}</TableCell><TableCell className="text-right text-success">{formatCurrency(v.sgst_amount)}</TableCell><TableCell className="text-right text-success">{formatCurrency(v.igst_amount)}</TableCell><TableCell className="text-right font-bold text-success">{formatCurrency(v.total_tax)}</TableCell></TableRow>
                                ))}</TableBody>
                            </Table>
                        </CollapsibleContent>
                    </Collapsible>
                ))}
            </div>

            {/* Debit Notes */}
            {debitNotes.length > 0 && (
                <div>
                    <h2 className="text-lg font-semibold mb-3">Debit Notes (Input Reduction) ({debitNotes.length})</h2>
                    <div className="border rounded-lg overflow-hidden">
                        <Table>
                            <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Debit Note No.</TableHead><TableHead>Supplier</TableHead><TableHead className="text-right">Taxable</TableHead><TableHead className="text-right">Tax Reversed</TableHead></TableRow></TableHeader>
                            <TableBody>{debitNotes.map(v => (
                                <TableRow key={v.id}><TableCell>{formatDate(v.voucher_date)}</TableCell><TableCell className="font-mono text-sm">{v.voucher_number}</TableCell><TableCell>{v.party_name}</TableCell><TableCell className="text-right text-destructive">-{formatCurrency(v.taxable_amount)}</TableCell><TableCell className="text-right text-destructive">-{formatCurrency(v.total_tax)}</TableCell></TableRow>
                            ))}</TableBody>
                        </Table>
                    </div>
                </div>
            )}

            <GSTExpenseDialog open={dialogOpen} onOpenChange={setDialogOpen} />
        </PageContainer>
    );
}
