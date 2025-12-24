import { useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
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
import { Separator } from '@/components/ui/separator';
import { useVoucher, useVouchers } from '@/hooks/useVouchers';
import { Download, Printer, FileText, BookOpen } from 'lucide-react';

interface VoucherViewDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    voucherId: string;
}

export function VoucherViewDialog({ open, onOpenChange, voucherId }: VoucherViewDialogProps) {
    const { voucher, isLoading } = useVoucher(open ? voucherId : undefined);

    // Format currency
    const formatCurrency = (value: number) =>
        new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 2,
        }).format(value);

    // Format date time
    const formatDateTime = (dateString: string) => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-IN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
            timeZone: 'Asia/Kolkata'
        }).replace(',', '');
    };

    // Get voucher type label
    const getVoucherTypeLabel = (type: string) => {
        const labels: Record<string, string> = {
            purchase_invoice: 'Purchase Invoice',
            debit_note: 'Debit Note',
            tax_invoice: 'Tax Invoice',
            credit_note: 'Credit Note',
            receipt_voucher: 'Receipt Voucher',
            journal_entry: 'Journal Entry',
            gst_payment: 'GST Payment',
            tcs_tds_payment: 'TCS/TDS Payment',
            sales_order: 'Sales Order',
            delivery_challan: 'Delivery Challan',
            sales_quotation: 'Sales Quotation',
            sales_enquiry: 'Sales Enquiry',
        };
        return labels[type] || type;
    };

    // Get status badge
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

    // Handle print
    const handlePrint = () => {
        window.print();
    };

    if (isLoading) {
        return (
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-[800px]">
                    <DialogHeader>
                        <Skeleton className="h-6 w-48" />
                        <DialogDescription className="sr-only">Loading voucher details</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <Skeleton className="h-20" />
                        <Skeleton className="h-40" />
                        <Skeleton className="h-20" />
                    </div>
                </DialogContent>
            </Dialog>
        );
    }

    if (!voucher) {
        return (
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-[800px]">
                    <DialogHeader>
                        <DialogTitle>Voucher Not Found</DialogTitle>
                        <DialogDescription className="sr-only">The requested voucher could not be found</DialogDescription>
                    </DialogHeader>
                    <div className="text-center py-8 text-muted-foreground">
                        <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>The requested voucher could not be found.</p>
                    </div>
                </DialogContent>
            </Dialog>
        );
    }

    // Calculate subtotal from items if taxable_amount is 0
    const calculatedSubtotal = voucher.taxable_amount ||
        voucher.items?.reduce((sum, item) => sum + (item.quantity * item.rate * (1 - (item.discount_percent || 0) / 100)), 0) || 0;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[900px] p-4">
                <DialogHeader className="pb-2">
                    <div className="flex items-center justify-between">
                        <div>
                            <DialogTitle className="text-lg font-semibold">
                                {getVoucherTypeLabel(voucher.voucher_type)}
                            </DialogTitle>
                            <DialogDescription className="sr-only">
                                View details for {voucher.voucher_number}
                            </DialogDescription>
                            <div className="flex items-center gap-3 mt-1">
                                <span className="font-mono text-sm text-muted-foreground">
                                    {voucher.voucher_number}
                                </span>
                                {getStatusBadge(voucher.status)}
                                {voucher.status === 'cancelled' && voucher.cancelled_at && (
                                    <span className="text-xs text-destructive font-medium">
                                        Cancelled: {formatDateTime(voucher.cancelled_at)}
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={handlePrint}>
                                <Printer className="h-4 w-4 mr-2" />
                                Print
                            </Button>
                        </div>
                    </div>
                </DialogHeader>

                {/* Voucher Details - Compact inline */}
                <div className="grid grid-cols-2 gap-x-6 gap-y-1 py-2 text-sm border-b">
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Date:</span>
                        <span className="font-medium">{formatDateTime(voucher.voucher_date)}</span>
                    </div>
                    {voucher.party_name && (
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Party:</span>
                            <span className="font-medium">{voucher.party_name}</span>
                        </div>
                    )}
                    {voucher.party?.gst_number && (
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">GSTIN:</span>
                            <span className="font-mono">{voucher.party.gst_number}</span>
                        </div>
                    )}
                    {voucher.reference_number && (
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Reference:</span>
                            <span>{voucher.reference_number}</span>
                        </div>
                    )}
                    {(voucher.customer_po_number || voucher.po_number) && (
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">PO No:</span>
                            <span>{voucher.customer_po_number || voucher.po_number}</span>
                        </div>
                    )}
                    {voucher.transport_name && (
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Transport:</span>
                            <span>{voucher.transport_name}</span>
                        </div>
                    )}
                    {voucher.lr_number && (
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">LR No:</span>
                            <span>{voucher.lr_number}</span>
                        </div>
                    )}
                </div>

                {/* Items Table */}
                {voucher.items && voucher.items.length > 0 && (
                    <div className="border rounded-lg overflow-hidden my-2">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/50">
                                    <TableHead className="w-10">#</TableHead>
                                    <TableHead>Item</TableHead>
                                    {voucher.voucher_type !== 'delivery_challan' && (
                                        <TableHead className="w-20">HSN</TableHead>
                                    )}
                                    <TableHead className="w-16 text-right">Qty</TableHead>
                                    <TableHead className="w-16">Unit</TableHead>
                                    {voucher.voucher_type !== 'delivery_challan' && (
                                        <>
                                            <TableHead className="w-24 text-right">Rate</TableHead>
                                            <TableHead className="w-16 text-right">Disc%</TableHead>
                                            <TableHead className="w-16 text-right">GST%</TableHead>
                                            <TableHead className="w-24 text-right">Tax</TableHead>
                                            <TableHead className="w-28 text-right">Total</TableHead>
                                        </>
                                    )}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {voucher.items.map((item, index) => (
                                    <TableRow key={item.id}>
                                        <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                                        <TableCell className="font-medium">
                                            {item.item_name}
                                            {item.remarks && <p className="text-xs text-muted-foreground">{item.remarks}</p>}
                                        </TableCell>
                                        {voucher.voucher_type !== 'delivery_challan' && (
                                            <TableCell className="text-muted-foreground">{item.hsn_code || '-'}</TableCell>
                                        )}
                                        <TableCell className="text-right">{item.quantity}</TableCell>
                                        <TableCell>{item.unit}</TableCell>
                                        {voucher.voucher_type !== 'delivery_challan' && (
                                            <>
                                                <TableCell className="text-right">{formatCurrency(item.rate)}</TableCell>
                                                <TableCell className="text-right">{item.discount_percent || 0}%</TableCell>
                                                <TableCell className="text-right">{item.gst_percent || 0}%</TableCell>
                                                <TableCell className="text-right">
                                                    {formatCurrency((item.cgst_amount || 0) + (item.sgst_amount || 0) + (item.igst_amount || 0))}
                                                </TableCell>
                                                <TableCell className="text-right font-medium">
                                                    {formatCurrency(item.total_amount)}
                                                </TableCell>
                                            </>
                                        )}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}

                {/* Totals Section */}
                {voucher.voucher_type !== 'delivery_challan' && (
                    <div className="grid grid-cols-2 gap-4 pt-2">
                        <div>
                            {voucher.narration && (
                                <div className="bg-muted/30 rounded-lg p-3">
                                    <span className="text-xs font-medium">Narration:</span>
                                    <p className="text-xs text-muted-foreground mt-0.5">{voucher.narration}</p>
                                </div>
                            )}
                        </div>
                        <div className="bg-muted/30 rounded-lg p-3 space-y-1">
                            <div className="flex justify-between text-xs">
                                <span className="text-muted-foreground">Subtotal:</span>
                                <span className="font-medium">{formatCurrency(calculatedSubtotal)}</span>
                            </div>
                            {voucher.cgst_amount > 0 && (
                                <div className="flex justify-between text-xs">
                                    <span className="text-muted-foreground">CGST:</span>
                                    <span>{formatCurrency(voucher.cgst_amount)}</span>
                                </div>
                            )}
                            {voucher.sgst_amount > 0 && (
                                <div className="flex justify-between text-xs">
                                    <span className="text-muted-foreground">SGST:</span>
                                    <span>{formatCurrency(voucher.sgst_amount)}</span>
                                </div>
                            )}
                            {voucher.igst_amount > 0 && (
                                <div className="flex justify-between text-xs">
                                    <span className="text-muted-foreground">IGST:</span>
                                    <span>{formatCurrency(voucher.igst_amount)}</span>
                                </div>
                            )}
                            {voucher.round_off !== 0 && (
                                <div className="flex justify-between text-xs">
                                    <span className="text-muted-foreground">Round Off:</span>
                                    <span>{formatCurrency(voucher.round_off)}</span>
                                </div>
                            )}
                            <Separator className="my-1" />
                            <div className="flex justify-between">
                                <span className="font-semibold text-sm">Grand Total:</span>
                                <span className="font-bold text-base text-primary">{formatCurrency(voucher.total_amount)}</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Narration only for delivery challan */}
                {voucher.voucher_type === 'delivery_challan' && voucher.narration && (
                    <div className="bg-muted/30 rounded-lg p-4 mt-4">
                        <span className="text-sm font-medium">Narration:</span>
                        <p className="text-sm text-muted-foreground mt-1">{voucher.narration}</p>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}


