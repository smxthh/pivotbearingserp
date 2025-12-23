import { useState } from 'react';
import { RefreshCw, ChevronDown, ChevronUp, Receipt, Plus } from 'lucide-react';
import { PageContainer } from '@/components/shared/PageContainer';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useVouchers, Voucher } from '@/hooks/useVouchers';
import { GSTIncomeDialog } from '@/components/accounting/GSTIncomeDialog';

export default function GSTIncomePage() {
    const currentDate = new Date();
    const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
    const [expandedRates, setExpandedRates] = useState<string[]>([]);
    const [dialogOpen, setDialogOpen] = useState(false);

    const startDate = `${selectedYear}-${selectedMonth.toString().padStart(2, '0')}-01`;
    const endDate = selectedMonth === 12 ? `${selectedYear + 1}-01-01` : `${selectedYear}-${(selectedMonth + 1).toString().padStart(2, '0')}-01`;

    const { vouchers: taxInvoices, isLoading: loadingSales } = useVouchers({
        voucherType: 'tax_invoice',
        status: 'confirmed',
        startDate,
        endDate,
    });

    const { vouchers: creditNotes, isLoading: loadingCreditNotes } = useVouchers({
        voucherType: 'credit_note',
        status: 'confirmed',
        startDate,
        endDate,
    });

    const isLoading = loadingSales || loadingCreditNotes;

    const formatCurrency = (value: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(value);
    const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const years = [2024, 2025, 2026];

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

    const salesGroups = groupByGSTRate(taxInvoices);

    const totalTaxable = taxInvoices.reduce((sum, v) => sum + v.taxable_amount, 0) - creditNotes.reduce((sum, v) => sum + v.taxable_amount, 0);
    const totalCGST = taxInvoices.reduce((sum, v) => sum + v.cgst_amount, 0) - creditNotes.reduce((sum, v) => sum + v.cgst_amount, 0);
    const totalSGST = taxInvoices.reduce((sum, v) => sum + v.sgst_amount, 0) - creditNotes.reduce((sum, v) => sum + v.sgst_amount, 0);
    const totalIGST = taxInvoices.reduce((sum, v) => sum + v.igst_amount, 0) - creditNotes.reduce((sum, v) => sum + v.igst_amount, 0);

    const totalOutput = {
        taxable: totalTaxable,
        cgst: totalCGST,
        sgst: totalSGST,
        igst: totalIGST,
        total: totalCGST + totalSGST + totalIGST,
    };

    const toggleRate = (rate: string) => setExpandedRates(prev => prev.includes(rate) ? prev.filter(r => r !== rate) : [...prev, rate]);

    if (isLoading) return <PageContainer title="GST Income (Output Tax)"><div className="space-y-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}</div></PageContainer>;

    return (
        <PageContainer title="GST Income (Output Tax)">
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
                        <Plus className="h-4 w-4 mr-2" /> Add GST Income
                    </Button>
                </div>
                <Badge variant="outline" className="text-lg px-4 py-2">
                    Net Output GST Liability: <span className="font-bold text-destructive ml-2">{formatCurrency(totalOutput.total)}</span>
                </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <Card className="p-4"><p className="text-sm text-muted-foreground">Total Taxable Sales</p><p className="text-2xl font-bold">{formatCurrency(totalOutput.taxable)}</p></Card>
                <Card className="p-4"><p className="text-sm text-muted-foreground">CGST Output</p><p className="text-2xl font-bold text-destructive">{formatCurrency(totalOutput.cgst)}</p></Card>
                <Card className="p-4"><p className="text-sm text-muted-foreground">SGST Output</p><p className="text-2xl font-bold text-destructive">{formatCurrency(totalOutput.sgst)}</p></Card>
                <Card className="p-4"><p className="text-sm text-muted-foreground">IGST Output</p><p className="text-2xl font-bold text-destructive">{formatCurrency(totalOutput.igst)}</p></Card>
            </div>

            <div className="mb-6">
                <h2 className="text-lg font-semibold mb-3">Tax Invoices ({taxInvoices.length})</h2>
                {Object.entries(salesGroups).map(([rate, group]) => (
                    <Collapsible key={rate} open={expandedRates.includes(`sales-${rate}`)} className="mb-2">
                        <CollapsibleTrigger onClick={() => toggleRate(`sales-${rate}`)} className="w-full">
                            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
                                <div className="flex items-center gap-3">
                                    {expandedRates.includes(`sales-${rate}`) ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                    <Badge variant="secondary">{rate}</Badge>
                                    <span className="text-sm text-muted-foreground">{group.vouchers.length} invoice(s)</span>
                                </div>
                                <span className="font-semibold text-destructive">{formatCurrency(group.total)}</span>
                            </div>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="mt-2">
                            <div className="border rounded-lg overflow-hidden">
                                <Table>
                                    <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Invoice No.</TableHead><TableHead>Customer</TableHead><TableHead className="text-right">Taxable</TableHead><TableHead className="text-right">CGST</TableHead><TableHead className="text-right">SGST</TableHead><TableHead className="text-right">IGST</TableHead></TableRow></TableHeader>
                                    <TableBody>{group.vouchers.map(v => (
                                        <TableRow key={v.id}><TableCell>{formatDate(v.voucher_date)}</TableCell><TableCell className="font-mono text-sm">{v.voucher_number}</TableCell><TableCell>{v.party_name}</TableCell><TableCell className="text-right">{formatCurrency(v.taxable_amount)}</TableCell><TableCell className="text-right">{formatCurrency(v.cgst_amount)}</TableCell><TableCell className="text-right">{formatCurrency(v.sgst_amount)}</TableCell><TableCell className="text-right">{formatCurrency(v.igst_amount)}</TableCell></TableRow>
                                    ))}</TableBody>
                                </Table>
                            </div>
                        </CollapsibleContent>
                    </Collapsible>
                ))}
                {taxInvoices.length === 0 && <div className="text-center py-8 text-muted-foreground border rounded-lg"><Receipt className="h-12 w-12 mx-auto mb-2 opacity-50" />No tax invoices for this period</div>}
            </div>

            {creditNotes.length > 0 && (
                <div>
                    <h2 className="text-lg font-semibold mb-3">Credit Notes (Output Reduction) ({creditNotes.length})</h2>
                    <div className="border rounded-lg overflow-hidden">
                        <Table>
                            <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Credit Note No.</TableHead><TableHead>Customer</TableHead><TableHead className="text-right">Taxable</TableHead><TableHead className="text-right">Tax Reversed</TableHead></TableRow></TableHeader>
                            <TableBody>{creditNotes.map(v => (
                                <TableRow key={v.id}><TableCell>{formatDate(v.voucher_date)}</TableCell><TableCell className="font-mono text-sm">{v.voucher_number}</TableCell><TableCell>{v.party_name}</TableCell><TableCell className="text-right text-success">-{formatCurrency(v.taxable_amount)}</TableCell><TableCell className="text-right text-success">-{formatCurrency(v.total_tax)}</TableCell></TableRow>
                            ))}</TableBody>
                        </Table>
                    </div>
                </div>
            )}

            <GSTIncomeDialog open={dialogOpen} onOpenChange={setDialogOpen} />
        </PageContainer>
    );
}
