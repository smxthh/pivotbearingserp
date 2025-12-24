import { useState, useEffect, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { DatePicker } from '@/components/ui/date-picker';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Plus, Trash2, Edit2, Upload } from 'lucide-react';
import { useVouchers, VoucherItemInsert, LedgerPostingItem } from '@/hooks/useVouchers';
import { useLedgers } from '@/hooks/useLedgers';
import { useParties } from '@/hooks/useParties';
import { SearchablePartySelect } from '@/components/shared/SearchablePartySelect';
import { ItemSelectionDialog, InvoiceItem } from '@/components/accounting/ItemSelectionDialog';
import * as SelectPrimitive from '@radix-ui/react-select';
import { useVoucherPrefixesForType } from '@/hooks/useVoucherPrefixes';
import { useDocumentNumber } from '@/hooks/useDocumentNumber';

// Form schema
const formSchema = z.object({
    doc_prefix: z.string().default('PI/25-26/'),
    doc_number: z.coerce.number().min(1, 'Required'),
    invoice_number: z.string().min(1, 'Invoice number is required'),
    voucher_date: z.string().min(1, 'Required'),
    due_date: z.string().optional(),
    party_id: z.string().min(1, 'Required'),
    memo_type: z.string().default('Debit'),
    gst_type: z.string().min(1, 'Required'),
    eligibility_itc: z.string().default('Inputs'),
    po_challan_number: z.string().optional(),
    apply_round_off: z.boolean().default(true),
    narration: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface PurchaseInvoiceDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function PurchaseInvoiceDialog({ open, onOpenChange }: PurchaseInvoiceDialogProps) {
    const { createVoucher, createVoucherAtomic, isCreating } = useVouchers({ realtime: false });
    const { parties } = useParties({ realtime: true });
    const { ledgers } = useLedgers({ realtime: true });

    // Fetch prefixes from centralized system
    const { prefixes: dbPrefixes, defaultPrefix } = useVoucherPrefixesForType('Purchase Invoice');

    // Format prefixes for dropdown
    // Format prefixes for dropdown
    const prefixes = useMemo(() => {
        return dbPrefixes.map(p => `${p.voucher_prefix}${p.prefix_separator}`);
    }, [dbPrefixes]);

    // State
    const [items, setItems] = useState<InvoiceItem[]>([]);
    const [isItemDialogOpen, setIsItemDialogOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<InvoiceItem | null>(null);
    const [editingIndex, setEditingIndex] = useState<number>(-1);

    const {
        register,
        control,
        handleSubmit,
        reset,
        setValue,
        watch,
        formState: { errors, dirtyFields },
    } = useForm<FormData>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            doc_prefix: 'PI/25-26/',
            doc_number: 1,
            invoice_number: '',
            voucher_date: new Date().toISOString().split('T')[0],
            due_date: '',
            party_id: '',
            memo_type: 'Debit',
            gst_type: '',
            eligibility_itc: 'Inputs',
            po_challan_number: '',
            apply_round_off: true,
            narration: '',
        },
    });

    const watchedPartyId = watch('party_id');
    const watchedPrefix = watch('doc_prefix');

    // Document Numbering
    const { previewNumber, incrementNumber, refetchPreview } = useDocumentNumber({
        voucherName: 'Purchase Invoice',
        prefix: watchedPrefix
    });

    // Auto-populate document number from preview if not set manually
    const watchedDocNumber = watch('doc_number');
    useEffect(() => {
        if (open && previewNumber && !dirtyFields.doc_number) {
            // Updated to handle multiple separators: / or - or space
            const parts = previewNumber.split(/[/ -]/);
            const numStr = parts[parts.length - 1];
            const num = parseInt(numStr);
            if (!isNaN(num)) {
                setValue('doc_number', num);
            }
        }
    }, [open, previewNumber, watchedDocNumber, setValue, dirtyFields.doc_number]);

    // Get selected party
    const selectedParty = parties.find(p => p.id === watchedPartyId);

    // Calculate totals
    const totals = useMemo(() => {
        let subtotal = 0;
        let totalCGST = 0;
        let totalSGST = 0;

        items.forEach(item => {
            subtotal += item.amount - (item.amount * item.discount_percent / 100);
            totalCGST += item.cgst_amount;
            totalSGST += item.sgst_amount;
        });

        const beforeRoundOff = subtotal + totalCGST + totalSGST;
        const roundOff = Math.round(beforeRoundOff) - beforeRoundOff;
        const netAmount = beforeRoundOff + roundOff;

        return { subtotal, totalCGST, totalSGST, roundOff, netAmount };
    }, [items]);

    // Format currency
    const formatCurrency = (value: number) =>
        new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 2,
        }).format(value);

    // Reset form when dialog opens
    useEffect(() => {
        if (open) {
            const defaultPre = defaultPrefix
                ? `${defaultPrefix.voucher_prefix}${defaultPrefix.prefix_separator}`
                : prefixes[0] || 'PI/';

            reset({
                doc_prefix: defaultPre,
                doc_number: 1,
                invoice_number: '',
                voucher_date: new Date().toISOString().split('T')[0],
                party_id: '',
                memo_type: 'Debit',
                gst_type: '',
                eligibility_itc: 'Inputs',
                po_challan_number: '',
                apply_round_off: true,
                narration: '',
            });
            setItems([]);

            // Force fetch latest number
            refetchPreview();
        }
    }, [open, reset, defaultPrefix, prefixes, refetchPreview]);

    // Handle item save (add more)
    const handleItemSave = (item: InvoiceItem) => {
        if (editingIndex >= 0) {
            const newItems = [...items];
            newItems[editingIndex] = item;
            setItems(newItems);
            setEditingIndex(-1);
        } else {
            setItems([...items, item]);
        }
        setEditingItem(null);
    };

    // Handle item save and close
    const handleItemSaveAndClose = (item: InvoiceItem) => {
        handleItemSave(item);
        setIsItemDialogOpen(false);
    };

    // Edit item
    const handleEditItem = (item: InvoiceItem, index: number) => {
        setEditingItem(item);
        setEditingIndex(index);
        setIsItemDialogOpen(true);
    };

    // Delete item
    const handleDeleteItem = (index: number) => {
        setItems(items.filter((_, i) => i !== index));
    };

    // Submit handler
    const onSubmit = async (data: FormData) => {
        if (items.length === 0) return;

        try {
            // Use manually entered invoice number
            const voucherNumber = `${data.doc_prefix}${data.doc_number}`;

            const ledgerPostings: LedgerPostingItem[] = [];

            // Debit: Purchase Account (taxable amount only)
            const purchaseLedger = ledgers.find(l => l.name === 'Purchase Account' || l.group_name === 'Purchase Account');
            if (purchaseLedger) {
                ledgerPostings.push({
                    ledger_id: purchaseLedger.id,
                    debit_amount: totals.subtotal,
                    credit_amount: 0,
                    narration: `Purchase from ${selectedParty?.name || 'Supplier'}`,
                });
            }

            // Debit: CGST Input (if local purchase)
            if (totals.totalCGST > 0) {
                const cgstInputLedger = ledgers.find(l => l.name === 'CGST Input' || l.name === 'Input CGST');
                if (cgstInputLedger) {
                    ledgerPostings.push({
                        ledger_id: cgstInputLedger.id,
                        debit_amount: totals.totalCGST,
                        credit_amount: 0,
                        narration: 'CGST on Purchase',
                    });
                }
            }

            // Debit: SGST Input (if local purchase)
            if (totals.totalSGST > 0) {
                const sgstInputLedger = ledgers.find(l => l.name === 'SGST Input' || l.name === 'Input SGST');
                if (sgstInputLedger) {
                    ledgerPostings.push({
                        ledger_id: sgstInputLedger.id,
                        debit_amount: totals.totalSGST,
                        credit_amount: 0,
                        narration: 'SGST on Purchase',
                    });
                }
            }

            // Debit: IGST Input (if interstate purchase)
            const totalIGST = items.reduce((sum, item) => sum + (item.igst_amount || 0), 0);
            if (totalIGST > 0) {
                const igstInputLedger = ledgers.find(l => l.name === 'IGST Input' || l.name === 'Input IGST');
                if (igstInputLedger) {
                    ledgerPostings.push({
                        ledger_id: igstInputLedger.id,
                        debit_amount: totalIGST,
                        credit_amount: 0,
                        narration: 'IGST on Purchase',
                    });
                }
            }

            // Credit: Supplier Ledger (total amount including GST)
            const supplierLedger = ledgers.find(l => l.party_id === data.party_id);
            if (supplierLedger) {
                ledgerPostings.push({
                    ledger_id: supplierLedger.id,
                    debit_amount: 0,
                    credit_amount: totals.netAmount,
                    narration: 'Purchase Invoice',
                });
            }

            // Prepare voucher items
            const voucherItems: VoucherItemInsert[] = items.map((item, index) => ({
                item_id: item.item_id || undefined,
                item_name: item.item_name,
                hsn_code: item.hsn_code,
                quantity: item.quantity,
                unit: item.unit,
                rate: item.rate,
                amount: item.amount,
                discount_percent: item.discount_percent,
                discount_amount: (item.amount * item.discount_percent) / 100,
                taxable_amount: item.amount - (item.amount * item.discount_percent) / 100,
                gst_percent: item.gst_percent,
                cgst_amount: item.cgst_amount,
                sgst_amount: item.sgst_amount,
                total_amount: item.total_amount,
                line_order: index + 1,
                remarks: item.remark,
            }));

            await createVoucherAtomic.mutateAsync({
                voucher: {
                    voucher_type: 'purchase_invoice',
                    voucher_number: voucherNumber, // Manual entry
                    inv_number: data.doc_number.toString(), // Explicitly pass number for sequence tracking
                    reference_number: data.invoice_number,
                    voucher_date: data.voucher_date,
                    due_date: data.due_date || null,
                    party_id: data.party_id,
                    party_name: selectedParty?.name || '',
                    narration: data.narration,
                    subtotal: totals.subtotal,
                    cgst_amount: totals.totalCGST,
                    sgst_amount: totals.totalSGST,
                    total_tax: totals.totalCGST + totals.totalSGST,
                    round_off: totals.roundOff,
                    total_amount: totals.netAmount,
                    status: 'confirmed',
                    memo_type: data.memo_type,
                    gst_type: data.gst_type,
                    eligibility_itc: data.eligibility_itc,
                    po_challan_number: data.po_challan_number,
                    apply_round_off: data.apply_round_off,
                } as any,
                items: voucherItems,
                ledgerPostings,
            });

            onOpenChange(false);
        } catch (error) {
            console.error('Error creating purchase invoice:', error);
        }
    };

    const gstTypes = ['GST Local Purchase', 'Interstate Purchase', 'Import Purchase', 'Exempt Purchase'];

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-semibold">Purchase Invoice</DialogTitle>
                        <DialogDescription className="sr-only">
                            Create a new purchase invoice by entering supplier details, items, and tax information.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                        {/* Row 1: Invoice No, Date, Party, GST No */}
                        <div className="grid grid-cols-4 gap-4">

                            <div className="space-y-2">
                                <Label className="text-sm">Voucher No.</Label>
                                <div className="flex gap-1">
                                    <Select value={watchedPrefix} onValueChange={v => setValue('doc_prefix', v)}>
                                        <SelectTrigger className="w-24 text-xs px-2">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectPrimitive.Portal>
                                            <SelectContent>
                                                {prefixes.map(p => (
                                                    <SelectItem key={p} value={p} className="text-xs">{p}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </SelectPrimitive.Portal>
                                    </Select>
                                    <Input type="number" {...register('doc_number')} className="flex-1 text-xs" min={1} />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-sm">
                                    Supplier Inv. No. <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    {...register('invoice_number')}
                                    placeholder="Enter Invoice No."
                                    className={errors.invoice_number ? 'border-destructive' : ''}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-sm">
                                    Inv. Date <span className="text-destructive">*</span>
                                </Label>
                                <Controller
                                    control={control}
                                    name="voucher_date"
                                    render={({ field }) => (
                                        <DatePicker
                                            value={field.value}
                                            onChange={(date) => field.onChange(date ? format(date, 'yyyy-MM-dd') : '')}
                                        />
                                    )}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-sm">Due Date</Label>
                                <Controller
                                    control={control}
                                    name="due_date"
                                    render={({ field }) => (
                                        <DatePicker
                                            value={field.value}
                                            onChange={(date) => field.onChange(date ? format(date, 'yyyy-MM-dd') : '')}
                                        />
                                    )}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-sm">
                                    Supplier Name <span className="text-destructive">*</span>
                                </Label>
                                <SearchablePartySelect
                                    value={watchedPartyId}
                                    onChange={(v) => setValue('party_id', v)}
                                    partyType="supplier"
                                    placeholder="Select Party"
                                    error={!!errors.party_id}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-sm">GST No.</Label>
                                <Input
                                    value={selectedParty?.gst_number || ''}
                                    disabled
                                    className="bg-muted"
                                />
                            </div>
                        </div>

                        {/* Row 2: Memo Type, GST Type, Eligibility ITC, PO/Challan, Round Off */}
                        <div className="grid grid-cols-5 gap-4">
                            <div className="space-y-2">
                                <Label className="text-sm">Memo Type</Label>
                                <Select value={watch('memo_type')} onValueChange={v => setValue('memo_type', v)}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectPrimitive.Portal>
                                        <SelectContent>
                                            <SelectItem value="Debit">Debit</SelectItem>
                                            <SelectItem value="Credit">Credit</SelectItem>
                                        </SelectContent>
                                    </SelectPrimitive.Portal>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-sm">
                                    GST Type <span className="text-destructive">*</span>
                                </Label>
                                <Select value={watch('gst_type')} onValueChange={v => setValue('gst_type', v)}>
                                    <SelectTrigger className={errors.gst_type ? 'border-destructive' : ''}>
                                        <SelectValue placeholder="Select GST Type" />
                                    </SelectTrigger>
                                    <SelectPrimitive.Portal>
                                        <SelectContent>
                                            {gstTypes.map(t => (
                                                <SelectItem key={t} value={t}>{t}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </SelectPrimitive.Portal>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-sm">Eligibility For ITC</Label>
                                <Select value={watch('eligibility_itc')} onValueChange={v => setValue('eligibility_itc', v)}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectPrimitive.Portal>
                                        <SelectContent>
                                            <SelectItem value="Inputs">Inputs</SelectItem>
                                            <SelectItem value="Capital Goods">Capital Goods</SelectItem>
                                            <SelectItem value="Input Services">Input Services</SelectItem>
                                            <SelectItem value="Ineligible">Ineligible</SelectItem>
                                        </SelectContent>
                                    </SelectPrimitive.Portal>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-sm">P.O. No./Challan No.</Label>
                                <Input
                                    {...register('po_challan_number')}
                                    placeholder="Enter Challan No."
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-sm">Apply Round Off</Label>
                                <Select
                                    value={watch('apply_round_off') ? 'Yes' : 'No'}
                                    onValueChange={v => setValue('apply_round_off', v === 'Yes')}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectPrimitive.Portal>
                                        <SelectContent>
                                            <SelectItem value="Yes">Yes</SelectItem>
                                            <SelectItem value="No">No</SelectItem>
                                        </SelectContent>
                                    </SelectPrimitive.Portal>
                                </Select>
                            </div>
                        </div>

                        {/* Item Details Section */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <Label className="text-sm font-medium">Item Details :</Label>
                                <Button
                                    type="button"
                                    size="sm"
                                    onClick={() => {
                                        setEditingItem(null);
                                        setEditingIndex(-1);
                                        setIsItemDialogOpen(true);
                                    }}
                                >
                                    <Plus className="h-4 w-4 mr-1" />
                                    Add Item
                                </Button>
                            </div>

                            <div className="border rounded-lg overflow-hidden">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-primary hover:bg-primary">
                                            <TableHead className="text-primary-foreground text-xs w-10">#</TableHead>
                                            <TableHead className="text-primary-foreground text-xs">Item Name</TableHead>
                                            <TableHead className="text-primary-foreground text-xs">HSN Code</TableHead>
                                            <TableHead className="text-primary-foreground text-xs text-right">Qty</TableHead>
                                            <TableHead className="text-primary-foreground text-xs">UOM</TableHead>
                                            <TableHead className="text-primary-foreground text-xs text-right">Price</TableHead>
                                            <TableHead className="text-primary-foreground text-xs text-right">Amount</TableHead>
                                            <TableHead className="text-primary-foreground text-xs w-20">Action</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {items.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-8">
                                                    No data available in table
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            items.map((item, index) => (
                                                <TableRow key={index} className="hover:bg-muted/50">
                                                    <TableCell className="text-xs">{index + 1}</TableCell>
                                                    <TableCell className="text-xs font-medium">{item.item_name}</TableCell>
                                                    <TableCell className="text-xs">{item.hsn_code || '-'}</TableCell>
                                                    <TableCell className="text-xs text-right">{item.quantity}</TableCell>
                                                    <TableCell className="text-xs">{item.unit}</TableCell>
                                                    <TableCell className="text-xs text-right">{formatCurrency(item.rate)}</TableCell>
                                                    <TableCell className="text-xs text-right font-medium">{formatCurrency(item.total_amount)}</TableCell>
                                                    <TableCell>
                                                        <div className="flex gap-1">
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-7 w-7"
                                                                onClick={() => handleEditItem(item, index)}
                                                            >
                                                                <Edit2 className="h-3 w-3" />
                                                            </Button>
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-7 w-7 text-destructive"
                                                                onClick={() => handleDeleteItem(index)}
                                                            >
                                                                <Trash2 className="h-3 w-3" />
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>

                        {/* Summary Section */}
                        <div className="grid grid-cols-3 gap-6">
                            <div className="col-span-2 space-y-3">
                                <div className="space-y-2">
                                    <Label className="text-sm">Remark</Label>
                                    <Textarea {...register('narration')} placeholder="Remark" rows={2} />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="bg-primary text-primary-foreground px-3 py-2 rounded-lg text-xs font-semibold">
                                    Description
                                </div>
                                <div className="space-y-1 text-xs">
                                    <div className="flex justify-between py-1 border-b">
                                        <span className="text-muted-foreground">Sub Total</span>
                                        <span className="font-medium">{formatCurrency(totals.subtotal)}</span>
                                    </div>
                                    <div className="flex justify-between py-1 border-b">
                                        <span className="text-muted-foreground">CGST</span>
                                        <span className="font-medium">{formatCurrency(totals.totalCGST)}</span>
                                    </div>
                                    <div className="flex justify-between py-1 border-b">
                                        <span className="text-muted-foreground">SGST</span>
                                        <span className="font-medium">{formatCurrency(totals.totalSGST)}</span>
                                    </div>
                                    <div className="flex justify-between py-1 border-b">
                                        <span className="text-muted-foreground">ROUNDED OFF</span>
                                        <span className="font-medium">{formatCurrency(totals.roundOff)}</span>
                                    </div>
                                    <div className="bg-primary text-primary-foreground px-2 py-2 rounded flex justify-between mt-2">
                                        <span className="font-semibold">Net. Amount</span>
                                        <span className="font-bold">{formatCurrency(totals.netAmount)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isCreating || createVoucherAtomic.isPending || items.length === 0}>
                                {isCreating || createVoucherAtomic.isPending ? 'Saving...' : 'Save'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Item Selection Dialog */}
            <ItemSelectionDialog
                open={isItemDialogOpen}
                onOpenChange={setIsItemDialogOpen}
                onSave={handleItemSave}
                onSaveAndClose={handleItemSaveAndClose}
                editItem={editingItem}
            />
        </>
    );
}
