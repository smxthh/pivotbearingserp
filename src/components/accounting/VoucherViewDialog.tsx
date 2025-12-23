import { useEffect } from 'react';
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
import { Separator } from '@/components/ui/separator';
import { useVoucher } from '@/hooks/useVouchers';
import { Download, Printer, FileText } from 'lucide-react';

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

    // Format date
    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        });
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
                    </DialogHeader>
                    <div className="text-center py-8 text-muted-foreground">
                        <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>The requested voucher could not be found.</p>
                    </div>
                </DialogContent>
            </Dialog>
        );
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-auto">
                <DialogHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <DialogTitle className="text-xl">
                                {getVoucherTypeLabel(voucher.voucher_type)}
                            </DialogTitle>
                            <div className="flex items-center gap-3 mt-1">
                                <span className="font-mono text-sm text-muted-foreground">
                                    {voucher.voucher_number}
                                </span>
                                {getStatusBadge(voucher.status)}
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={handlePrint}>
                                <Printer className="h-4 w-4 mr-2" />
                                Print
                            </Button>
                        </div>
                    </div>
                </DialogHeader>

                {/* Voucher Details */}
                <div className="grid grid-cols-3 gap-6 py-4">
                    <div className="space-y-2">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Date:</span>
                            <span className="font-medium">{formatDate(voucher.voucher_date)}</span>
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
                                <span className="font-mono text-sm">{voucher.party.gst_number}</span>
                            </div>
                        )}
                        {(voucher.customer_po_number || voucher.po_number) && (
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">PO No:</span>
                                <span>{voucher.customer_po_number || voucher.po_number}</span>
                            </div>
                        )}
                    </div>
                    <div className="space-y-2">
                        {voucher.customer_po_date && (
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">PO Date:</span>
                                <span>{formatDate(voucher.customer_po_date)}</span>
                            </div>
                        )}
                        {voucher.reference_number && (
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Reference:</span>
                                <span>{voucher.reference_number}</span>
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
                    <div className="space-y-2">
                        {voucher.ship_to && (
                            <div className="flex flex-col">
                                <span className="text-muted-foreground">Ship To:</span>
                                <span className="text-sm">{voucher.ship_to}</span>
                            </div>
                        )}
                    </div>
                </div>

                <Separator />

                {/* Items Table */}
                {voucher.items && voucher.items.length > 0 && (
                    <div className="border rounded-lg overflow-hidden">
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
                                    {voucher.voucher_type === 'delivery_challan' && voucher.items.some(i => (i.discount_percent || 0) > 0) && (
                                        <TableHead className="w-16 text-right">Disc%</TableHead>
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
                                        {voucher.voucher_type === 'delivery_challan' && voucher.items.some(i => (i.discount_percent || 0) > 0) && (
                                            <TableCell className="text-right">{item.discount_percent || 0}%</TableCell>
                                        )}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}

                <Separator />

                {/* Totals - hide for delivery challan */}
                {voucher.voucher_type !== 'delivery_challan' && (
                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            {voucher.narration && (
                                <div>
                                    <span className="text-sm text-muted-foreground">Narration:</span>
                                    <p className="mt-1">{voucher.narration}</p>
                                </div>
                            )}
                        </div>
                        <div className="bg-muted/30 rounded-lg p-4 space-y-2">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Subtotal:</span>
                                <span>{formatCurrency(voucher.taxable_amount)}</span>
                            </div>
                            {voucher.cgst_amount > 0 && (
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">CGST:</span>
                                    <span>{formatCurrency(voucher.cgst_amount)}</span>
                                </div>
                            )}
                            {voucher.sgst_amount > 0 && (
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">SGST:</span>
                                    <span>{formatCurrency(voucher.sgst_amount)}</span>
                                </div>
                            )}
                            {voucher.igst_amount > 0 && (
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">IGST:</span>
                                    <span>{formatCurrency(voucher.igst_amount)}</span>
                                </div>
                            )}
                            {voucher.round_off !== 0 && (
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Round Off:</span>
                                    <span>{formatCurrency(voucher.round_off)}</span>
                                </div>
                            )}
                            <Separator />
                            <div className="flex justify-between">
                                <span className="font-semibold">Grand Total:</span>
                                <span className="font-bold text-lg">{formatCurrency(voucher.total_amount)}</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Narration only for delivery challan */}
                {voucher.voucher_type === 'delivery_challan' && voucher.narration && (
                    <div>
                        <span className="text-sm text-muted-foreground">Narration:</span>
                        <p className="mt-1">{voucher.narration}</p>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
