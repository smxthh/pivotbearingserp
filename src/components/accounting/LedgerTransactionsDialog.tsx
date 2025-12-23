import { useEffect, useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useLedger, Ledger, LedgerTransaction } from '@/hooks/useLedgers';
import { Download, FileText } from 'lucide-react';

interface LedgerTransactionsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    ledger: Ledger;
}

export function LedgerTransactionsDialog({
    open,
    onOpenChange,
    ledger,
}: LedgerTransactionsDialogProps) {
    const { ledger: ledgerDetails, transactions, isLoading } = useLedger(open ? ledger.id : undefined);

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

    // Calculate running balance
    const getTransactionsWithBalance = () => {
        let balance = ledger.opening_balance_type === 'Cr'
            ? -ledger.opening_balance
            : ledger.opening_balance;

        // Add opening balance entry
        const entries: Array<{
            id: string;
            date: string;
            particulars: string;
            voucherNumber: string;
            voucherType: string;
            debit: number;
            credit: number;
            balance: number;
        }> = [
                {
                    id: 'opening',
                    date: '-',
                    particulars: 'Opening Balance',
                    voucherNumber: '-',
                    voucherType: '-',
                    debit: ledger.opening_balance_type === 'Dr' ? ledger.opening_balance : 0,
                    credit: ledger.opening_balance_type === 'Cr' ? ledger.opening_balance : 0,
                    balance,
                },
            ];

        // Add transactions in chronological order
        const sortedTransactions = [...transactions].sort((a, b) =>
            new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime()
        );

        for (const txn of sortedTransactions) {
            balance = balance + txn.debit_amount - txn.credit_amount;
            entries.push({
                id: txn.id,
                date: txn.transaction_date,
                particulars: txn.narration || '-',
                voucherNumber: txn.voucher?.voucher_number || '-',
                voucherType: txn.voucher?.voucher_type || '-',
                debit: txn.debit_amount,
                credit: txn.credit_amount,
                balance,
            });
        }

        return entries;
    };

    const entriesWithBalance = getTransactionsWithBalance();

    // Export to Excel
    const handleExport = () => {
        const headers = ['Date', 'Particulars', 'Voucher No.', 'Type', 'Debit', 'Credit', 'Balance'];
        const rows = entriesWithBalance.map((e) => [
            e.date,
            e.particulars,
            e.voucherNumber,
            e.voucherType,
            e.debit || '',
            e.credit || '',
            `${Math.abs(e.balance)} ${e.balance >= 0 ? 'Dr' : 'Cr'}`,
        ]);

        const csvContent = [
            `Ledger: ${ledger.name}`,
            `Group: ${ledger.group_name}`,
            '',
            headers.join(','),
            ...rows.map((row) => row.join(',')),
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${ledger.name.replace(/\s+/g, '_')}_ledger_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    // Get voucher type label
    const getVoucherTypeLabel = (type: string) => {
        const labels: Record<string, string> = {
            purchase_invoice: 'Purchase',
            debit_note: 'Debit Note',
            tax_invoice: 'Tax Invoice',
            credit_note: 'Credit Note',
            receipt_voucher: 'Receipt',
            journal_entry: 'Journal',
            gst_payment: 'GST Payment',
            tcs_tds_payment: 'TDS/TCS',
        };
        return labels[type] || type;
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[1000px] max-h-[90vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <DialogTitle className="text-xl">{ledger.name}</DialogTitle>
                            <div className="flex items-center gap-2 mt-1">
                                <Badge variant="secondary">{ledger.group_name}</Badge>
                                <span className="text-sm text-muted-foreground">
                                    Closing Balance:{' '}
                                    <span className={ledger.closing_balance >= 0 ? 'text-success font-semibold' : 'text-destructive font-semibold'}>
                                        {formatCurrency(Math.abs(ledger.closing_balance))} {ledger.closing_balance >= 0 ? 'Dr' : 'Cr'}
                                    </span>
                                </span>
                            </div>
                        </div>
                        <Button variant="outline" size="sm" onClick={handleExport}>
                            <Download className="h-4 w-4 mr-2" />
                            Export
                        </Button>
                    </div>
                </DialogHeader>

                {/* Transactions Table */}
                <div className="flex-1 overflow-auto border rounded-lg">
                    {isLoading ? (
                        <div className="p-4 space-y-2">
                            {[...Array(5)].map((_, i) => (
                                <Skeleton key={i} className="h-10" />
                            ))}
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow className="sticky top-0 bg-background">
                                    <TableHead className="w-28">Date</TableHead>
                                    <TableHead>Particulars</TableHead>
                                    <TableHead className="w-32">Voucher No.</TableHead>
                                    <TableHead className="w-24">Type</TableHead>
                                    <TableHead className="w-28 text-right">Debit</TableHead>
                                    <TableHead className="w-28 text-right">Credit</TableHead>
                                    <TableHead className="w-36 text-right">Balance</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {entriesWithBalance.map((entry) => (
                                    <TableRow
                                        key={entry.id}
                                        className={entry.id === 'opening' ? 'bg-muted/30 font-medium' : ''}
                                    >
                                        <TableCell>
                                            {entry.date === '-' ? '-' : formatDate(entry.date)}
                                        </TableCell>
                                        <TableCell className="max-w-[200px] truncate">
                                            {entry.particulars}
                                        </TableCell>
                                        <TableCell>
                                            {entry.voucherNumber !== '-' && (
                                                <span className="font-mono text-xs">{entry.voucherNumber}</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {entry.voucherType !== '-' && (
                                                <Badge variant="outline" className="text-xs">
                                                    {getVoucherTypeLabel(entry.voucherType)}
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right text-success">
                                            {entry.debit > 0 ? formatCurrency(entry.debit) : '-'}
                                        </TableCell>
                                        <TableCell className="text-right text-destructive">
                                            {entry.credit > 0 ? formatCurrency(entry.credit) : '-'}
                                        </TableCell>
                                        <TableCell className="text-right font-medium">
                                            <span className={entry.balance >= 0 ? 'text-success' : 'text-destructive'}>
                                                {formatCurrency(Math.abs(entry.balance))} {entry.balance >= 0 ? 'Dr' : 'Cr'}
                                            </span>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {entriesWithBalance.length === 1 && (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                                            <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                                            No transactions recorded yet
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    )}
                </div>

                {/* Totals */}
                <div className="flex items-center justify-between px-4 py-3 bg-muted/30 rounded-lg">
                    <div className="flex items-center gap-6">
                        <div>
                            <span className="text-sm text-muted-foreground">Total Debit:</span>
                            <span className="ml-2 font-semibold text-success">
                                {formatCurrency(entriesWithBalance.reduce((sum, e) => sum + e.debit, 0))}
                            </span>
                        </div>
                        <div>
                            <span className="text-sm text-muted-foreground">Total Credit:</span>
                            <span className="ml-2 font-semibold text-destructive">
                                {formatCurrency(entriesWithBalance.reduce((sum, e) => sum + e.credit, 0))}
                            </span>
                        </div>
                    </div>
                    <div>
                        <span className="text-sm text-muted-foreground">Closing Balance:</span>
                        <span className={`ml-2 font-bold ${ledger.closing_balance >= 0 ? 'text-success' : 'text-destructive'}`}>
                            {formatCurrency(Math.abs(ledger.closing_balance))} {ledger.closing_balance >= 0 ? 'Dr' : 'Cr'}
                        </span>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
