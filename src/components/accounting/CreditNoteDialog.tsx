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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Trash2, Edit2 } from 'lucide-react';
import * as SelectPrimitive from '@radix-ui/react-select';
import { useVouchers, VoucherItemInsert, LedgerPostingItem } from '@/hooks/useVouchers';
import { useLedgers } from '@/hooks/useLedgers';
import { useParties } from '@/hooks/useParties';
import { useItems } from '@/hooks/useItems';
import { useDistributorProfile } from '@/hooks/useDistributorProfile';
import { useVoucherPrefixesForType } from '@/hooks/useVoucherPrefixes';
import { SearchablePartySelect } from '@/components/shared/SearchablePartySelect';
import { ItemSelectionDialog, InvoiceItem } from '@/components/accounting/ItemSelectionDialog';

// Item Schema (matching ItemSelectionDialog)
const itemSchema = z.object({
    item_id: z.string().optional(),
    item_name: z.string().min(1, 'Required'),
    hsn_code: z.string().optional(),
    quantity: z.coerce.number().min(0.001),
    unit: z.string().default('PCS'),
    rate: z.coerce.number().min(0),
    discount_percent: z.coerce.number().min(0).max(100).default(0),
    gst_percent: z.coerce.number().min(0).max(100).default(18),
    remark: z.string().optional(),
});

// Form Schema
const formSchema = z.object({
    cn_type: z.string().min(1, 'Required'),
    doc_prefix: z.string().default('CN/25-26/'),
    doc_number: z.coerce.number().min(1, 'Required'),
    doc_date: z.string().min(1, 'Required'),
    party_id: z.string().min(1, 'Required'),
    gst_type: z.string().min(1, 'Required'),
    memo_type: z.string().default('Credit'),
    eligibility_itc: z.string().default('Input'),
    apply_round_off: z.boolean().default(true),
    invoice_number: z.string().optional(),
    invoice_date: z.string().optional(),
    notes: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

type CreditNoteItem = InvoiceItem & {
    cgst_percent: number;
    sgst_percent: number;
    igst_percent: number;
};

interface CreditNoteDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function CreditNoteDialog({ open, onOpenChange }: CreditNoteDialogProps) {
    const { createVoucher, isCreating } = useVouchers({ realtime: false });
    const { parties } = useParties({ realtime: true });
    const { ledgers } = useLedgers({ realtime: true });
    const { items: masterItems } = useItems({ realtime: true });
    const { profile } = useDistributorProfile();

    // Local State
    const [items, setItems] = useState<CreditNoteItem[]>([]);
    const [isItemDialogOpen, setIsItemDialogOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<InvoiceItem | null>(null);
    const [editingIndex, setEditingIndex] = useState<number>(-1);
    // Fetch prefixes from centralized system
    const { prefixes: dbPrefixes, defaultPrefix } = useVoucherPrefixesForType('Credit Note');

    // Format prefixes for dropdown
    // Format prefixes for dropdown
    const prefixes = useMemo(() => {
        return dbPrefixes.map(p => `${p.voucher_prefix}${p.prefix_separator}`);
    }, [dbPrefixes]);

    const cnTypes = ['Sales Credit Note', 'Purchase Credit Note'];
    const gstTypes = ['GST Local Sales', 'GST Inter-State Sales', 'GST Exports'];
    const memoTypes = ['Credit', 'Debit'];
    const itcTypes = ['Input', 'Input Services', 'Capital Goods'];

    const {
        register,
        control,
        handleSubmit,
        reset,
        setValue,
        watch,
        formState: { errors },
    } = useForm<FormData>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            cn_type: 'Sales Credit Note',
            doc_prefix: 'CN/25-26/',
            doc_number: 1,
            doc_date: new Date().toISOString().split('T')[0],
            party_id: '',
            gst_type: 'GST Local Sales',
            memo_type: 'Credit',
            eligibility_itc: 'Input',
            apply_round_off: true,
            invoice_number: '',
            invoice_date: '',
            notes: '',
        },
    });

    const watchedPrefix = watch('doc_prefix');

    // Document number is now manually entered by user
    const watchedCNType = watch('cn_type');
    const watchedPartyId = watch('party_id');
    const watchedGSTType = watch('gst_type');
    const watchedApplyRoundOff = watch('apply_round_off');

    const selectedParty = useMemo(
        () => parties.find((p) => p.id === watchedPartyId),
        [parties, watchedPartyId]
    );

    const isInterState = useMemo(() => {
        return watchedGSTType === 'GST Inter-State Sales';
    }, [watchedGSTType]);

    // Fetch next document number on mount
    useEffect(() => {
        if (open) {
            const defaultPre = defaultPrefix
                ? `${defaultPrefix.voucher_prefix}${defaultPrefix.prefix_separator}`
                : prefixes[0] || 'CRN/';
            // Reset form with fresh document number
            reset({
                cn_type: 'Sales Credit Note',
                doc_prefix: defaultPre,
                doc_number: 1,
                doc_date: new Date().toISOString().split('T')[0],
                party_id: '',
                gst_type: 'GST Local Sales',
                memo_type: 'Credit',
                eligibility_itc: 'Input',
                apply_round_off: true,
                invoice_number: '',
                invoice_date: '',
                notes: '',
            });
            setItems([]);
        }
    }, [open, reset, defaultPrefix, prefixes]);

    // Real-time Calculation
    const totals = useMemo(() => {
        let subtotal = 0;
        let totalCGST = 0;
        let totalSGST = 0;
        let totalIGST = 0;

        items.forEach((item) => {
            const baseAmount = item.quantity * item.rate;
            const discountAmount = baseAmount * (item.discount_percent / 100);
            const taxableAmount = baseAmount - discountAmount;

            subtotal += baseAmount;
            totalCGST += item.cgst_amount;
            totalSGST += item.sgst_amount;
            totalIGST += item.igst_amount;
        });

        const beforeRoundOff = subtotal + totalCGST + totalSGST + totalIGST;
        const roundOff = watchedApplyRoundOff
            ? Math.round(beforeRoundOff) - beforeRoundOff
            : 0;
        const netAmount = beforeRoundOff + roundOff;

        return {
            subtotal,
            totalCGST,
            totalSGST,
            totalIGST,
            roundOff,
            netAmount,
        };
    }, [items, watchedApplyRoundOff]);

    // Item Handlers
    const handleSaveItem = (itemData: InvoiceItem) => {
        // Add to list without closing dialog
        const newItem: CreditNoteItem = {
            ...itemData,
            cgst_percent: isInterState ? 0 : itemData.gst_percent / 2,
            sgst_percent: isInterState ? 0 : itemData.gst_percent / 2,
            igst_percent: isInterState ? itemData.gst_percent : 0,
        };

        if (editingIndex >= 0) {
            const updatedItems = [...items];
            updatedItems[editingIndex] = newItem;
            setItems(updatedItems);
        } else {
            setItems([...items, newItem]);
        }
    };

    const handleSaveAndCloseItem = (itemData: InvoiceItem) => {
        handleSaveItem(itemData);
        setIsItemDialogOpen(false);
        setEditingItem(null);
        setEditingIndex(-1);
    };

    const handleEditItem = (item: InvoiceItem, index: number) => {
        setEditingItem(item);
        setEditingIndex(index);
        setIsItemDialogOpen(true);
    };

    const handleDeleteItem = (index: number) => {
        setItems(items.filter((_, i) => i !== index));
    };

    // Find Ledger Helper
    const findLedger = (name: string, groupName: string) => {
        return ledgers.find(
            (l) =>
                l.name.toLowerCase() === name.toLowerCase() ||
                l.group_name === groupName
        )?.id;
    };

    // Form Submission
    const onSubmit = async (data: FormData) => {
        if (items.length === 0) {
            alert('Please add at least one item');
            return;
        }
        try {
            // Use manually entered credit note number
            const party = parties.find((p) => p.id === data.party_id);
            const voucherNumber = `${data.doc_prefix}${data.doc_number}`;

            const voucherItems: VoucherItemInsert[] = items.map((item, index) => ({
                item_id: item.item_id,
                item_name: item.item_name,
                hsn_code: item.hsn_code,
                quantity: item.quantity,
                unit: item.unit,
                rate: item.rate,
                amount: item.amount,
                discount_percent: item.discount_percent,
                discount_amount: item.amount * (item.discount_percent / 100),
                taxable_amount:
                    item.amount - item.amount * (item.discount_percent / 100),
                gst_percent: isInterState
                    ? item.igst_percent
                    : item.cgst_percent + item.sgst_percent,
                cgst_amount: item.cgst_amount,
                sgst_amount: item.sgst_amount,
                igst_amount: item.igst_amount,
                total_amount:
                    item.amount + item.cgst_amount + item.sgst_amount + item.igst_amount,
                line_order: index + 1,
            }));

            // Ledger Postings
            const ledgerPostings: LedgerPostingItem[] = [];

            // Sales Credit Note: Debit Sales, Credit Customer, Debit GST Output (reverse output tax)
            if (data.cn_type === 'Sales Credit Note') {
                // Debit Sales Account (reverse the sale)
                const salesLedgerId = findLedger('Sales Account', 'Sales Account');
                if (salesLedgerId) {
                    ledgerPostings.push({
                        ledger_id: salesLedgerId,
                        debit_amount: totals.subtotal,
                        credit_amount: 0,
                        narration: `Sales return from ${party?.name || 'Customer'}`,
                    });
                }

                // Debit GST Output accounts (reverse output tax liability)
                if (totals.totalCGST > 0) {
                    const cgstOutputId = findLedger('CGST Output', 'Duties & Taxes');
                    if (cgstOutputId) {
                        ledgerPostings.push({
                            ledger_id: cgstOutputId,
                            debit_amount: totals.totalCGST,
                            credit_amount: 0,
                            narration: 'CGST reversal on sales return',
                        });
                    }
                }
                if (totals.totalSGST > 0) {
                    const sgstOutputId = findLedger('SGST Output', 'Duties & Taxes');
                    if (sgstOutputId) {
                        ledgerPostings.push({
                            ledger_id: sgstOutputId,
                            debit_amount: totals.totalSGST,
                            credit_amount: 0,
                            narration: 'SGST reversal on sales return',
                        });
                    }
                }
                if (totals.totalIGST > 0) {
                    const igstOutputId = findLedger('IGST Output', 'Duties & Taxes');
                    if (igstOutputId) {
                        ledgerPostings.push({
                            ledger_id: igstOutputId,
                            debit_amount: totals.totalIGST,
                            credit_amount: 0,
                            narration: 'IGST reversal on sales return',
                        });
                    }
                }

                // Credit Customer Ledger (reduce receivable)
                let customerLedgerId = party?.id
                    ? ledgers.find((l) => l.party_id === party.id)?.id
                    : undefined;
                if (customerLedgerId) {
                    ledgerPostings.push({
                        ledger_id: customerLedgerId,
                        debit_amount: 0,
                        credit_amount: totals.netAmount,
                        narration: `Credit note issued to ${party?.name || 'Customer'}`,
                    });
                }
            } else {
                // Purchase Credit Note: Credit Purchase, Debit Supplier, Credit GST Input (reverse input credit)

                // Credit Purchase Account
                const purchaseLedgerId = findLedger('Purchase Account', 'Purchase Account');
                if (purchaseLedgerId) {
                    ledgerPostings.push({
                        ledger_id: purchaseLedgerId,
                        debit_amount: 0,
                        credit_amount: totals.subtotal,
                        narration: `Purchase return to ${party?.name || 'Supplier'}`,
                    });
                }

                // Credit GST Input accounts (reverse input credit)
                if (totals.totalCGST > 0) {
                    const cgstInputId = findLedger('CGST Input', 'Duties & Taxes');
                    if (cgstInputId) {
                        ledgerPostings.push({
                            ledger_id: cgstInputId,
                            debit_amount: 0,
                            credit_amount: totals.totalCGST,
                            narration: 'CGST reversal on purchase return',
                        });
                    }
                }
                if (totals.totalSGST > 0) {
                    const sgstInputId = findLedger('SGST Input', 'Duties & Taxes');
                    if (sgstInputId) {
                        ledgerPostings.push({
                            ledger_id: sgstInputId,
                            debit_amount: 0,
                            credit_amount: totals.totalSGST,
                            narration: 'SGST reversal on purchase return',
                        });
                    }
                }
                if (totals.totalIGST > 0) {
                    const igstInputId = findLedger('IGST Input', 'Duties & Taxes');
                    if (igstInputId) {
                        ledgerPostings.push({
                            ledger_id: igstInputId,
                            debit_amount: 0,
                            credit_amount: totals.totalIGST,
                            narration: 'IGST reversal on purchase return',
                        });
                    }
                }

                // Debit Supplier Ledger (reduce payable)
                let supplierLedgerId = party?.id
                    ? ledgers.find((l) => l.party_id === party.id)?.id
                    : undefined;
                if (supplierLedgerId) {
                    ledgerPostings.push({
                        ledger_id: supplierLedgerId,
                        debit_amount: totals.netAmount,
                        credit_amount: 0,
                        narration: `Credit note received from ${party?.name || 'Supplier'}`,
                    });
                }
            }

            await createVoucher.mutateAsync({
                voucher: {
                    voucher_type: 'credit_note',
                    voucher_date: data.doc_date,
                    party_id: data.party_id,
                    party_name: party?.name,
                    reference_number: data.invoice_number,
                    narration: data.notes,
                    subtotal: totals.subtotal,
                    taxable_amount: totals.subtotal,
                    cgst_amount: totals.totalCGST,
                    sgst_amount: totals.totalSGST,
                    igst_amount: totals.totalIGST,
                    total_tax: totals.totalCGST + totals.totalSGST + totals.totalIGST,
                    round_off: totals.roundOff,
                    total_amount: totals.netAmount,
                    status: 'confirmed',
                },
                items: voucherItems,
                ledgerPostings,
            });

            onOpenChange(false);
        } catch (error) {
            console.error('Error creating credit note:', error);
        }
    };

    const formatCurrency = (value: number) =>
        new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 2,
        }).format(value);

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-[1200px] max-h-[95vh] overflow-hidden flex flex-col">
                    <DialogHeader>
                        <DialogTitle>Add Credit Note</DialogTitle>
                    </DialogHeader>

                    <form
                        onSubmit={handleSubmit(onSubmit)}
                        className="flex-1 overflow-hidden flex flex-col space-y-5"
                    >
                        {/* Row 1: Document Header (12-column grid) */}
                        <div className="grid grid-cols-12 gap-4">
                            {/* CN Type - 2 columns */}
                            <div className="col-span-2 space-y-2">
                                <Label className="text-sm">
                                    CN. Type <span className="text-destructive">*</span>
                                </Label>
                                <Select
                                    value={watchedCNType}
                                    onValueChange={(v) => setValue('cn_type', v)}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectPrimitive.Portal>
                                        <SelectContent>
                                            {cnTypes.map((type) => (
                                                <SelectItem key={type} value={type}>
                                                    {type}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </SelectPrimitive.Portal>
                                </Select>
                            </div>

                            {/* CN No. - 2 columns */}
                            <div className="col-span-2 space-y-2">
                                <Label className="text-sm">
                                    CN. No. <span className="text-destructive">*</span>
                                </Label>
                                <div className="flex gap-1">
                                    <Select
                                        value={watchedPrefix}
                                        onValueChange={(v) => setValue('doc_prefix', v)}
                                    >
                                        <SelectTrigger className="w-28">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectPrimitive.Portal>
                                            <SelectContent>
                                                {prefixes.map((p) => (
                                                    <SelectItem key={p} value={p}>
                                                        {p}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </SelectPrimitive.Portal>
                                    </Select>
                                    <Input
                                        type="number"
                                        {...register('doc_number')}
                                        className="w-14"
                                    />
                                </div>
                            </div>

                            {/* CN Date - 2 columns */}
                            <div className="col-span-2 space-y-2">
                                <Label className="text-sm">
                                    CN. Date <span className="text-destructive">*</span>
                                </Label>
                                <Controller
                                    control={control}
                                    name="doc_date"
                                    render={({ field }) => (
                                        <DatePicker
                                            value={field.value}
                                            onChange={(date) => field.onChange(date ? format(date, 'yyyy-MM-dd') : '')}
                                        />
                                    )}
                                />
                                {errors.doc_date && (
                                    <p className="text-xs text-destructive">
                                        {errors.doc_date.message}
                                    </p>
                                )}
                            </div>

                            {/* Party Name - 3 columns */}
                            <div className="col-span-3 space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label className="text-sm">
                                        Party Name <span className="text-destructive">*</span>
                                    </Label>
                                    <div className="flex gap-2 text-xs">
                                        <a href="#" className="text-primary hover:underline">
                                            + Add New
                                        </a>
                                    </div>
                                </div>
                                <SearchablePartySelect
                                    value={watchedPartyId}
                                    onChange={(v) => setValue('party_id', v)}
                                    partyType={
                                        watchedCNType === 'Sales Credit Note'
                                            ? 'customer'
                                            : 'supplier'
                                    }
                                    placeholder="Select Party"
                                    error={!!errors.party_id}
                                />
                                {selectedParty && (
                                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                                        <span>
                                            Cl. Balance:{' '}
                                            <span className="font-medium">
                                                {formatCurrency(0)}
                                            </span>
                                        </span>
                                        <span>
                                            T.O.: <span className="font-medium">0</span>
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* GST NO. - 3 columns */}
                            <div className="col-span-3 space-y-2">
                                <Label className="text-sm">GST NO.</Label>
                                <Input
                                    value={selectedParty?.gst_number || ''}
                                    disabled
                                    placeholder="Select GST No."
                                    className="bg-muted"
                                />
                            </div>
                        </div>

                        {/* Row 2: Transaction Details (12-column grid) */}
                        <div className="grid grid-cols-12 gap-4">
                            {/* Memo Type - 2 columns */}
                            <div className="col-span-2 space-y-2">
                                <Label className="text-sm">Memo Type</Label>
                                <Select
                                    value={watch('memo_type')}
                                    onValueChange={(v) => setValue('memo_type', v)}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectPrimitive.Portal>
                                        <SelectContent>
                                            {memoTypes.map((type) => (
                                                <SelectItem key={type} value={type}>
                                                    {type}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </SelectPrimitive.Portal>
                                </Select>
                            </div>

                            {/* GST Type - 3 columns */}
                            <div className="col-span-3 space-y-2">
                                <Label className="text-sm">
                                    GST Type <span className="text-destructive">*</span>
                                </Label>
                                <Select
                                    value={watchedGSTType}
                                    onValueChange={(v) => setValue('gst_type', v)}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectPrimitive.Portal>
                                        <SelectContent>
                                            {gstTypes.map((type) => (
                                                <SelectItem key={type} value={type}>
                                                    {type}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </SelectPrimitive.Portal>
                                </Select>
                            </div>

                            {/* Eligibility For ITC - 2 columns */}
                            <div className="col-span-2 space-y-2">
                                <Label className="text-sm">Eligibility For ITC</Label>
                                <Select
                                    value={watch('eligibility_itc')}
                                    onValueChange={(v) => setValue('eligibility_itc', v)}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectPrimitive.Portal>
                                        <SelectContent>
                                            {itcTypes.map((type) => (
                                                <SelectItem key={type} value={type}>
                                                    {type}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </SelectPrimitive.Portal>
                                </Select>
                            </div>

                            {/* Apply Round Off - 1 column */}
                            <div className="col-span-1 space-y-2">
                                <Label className="text-sm">Round Off</Label>
                                <div className="flex items-center h-10">
                                    <Checkbox
                                        checked={watchedApplyRoundOff}
                                        onCheckedChange={(checked) =>
                                            setValue('apply_round_off', !!checked)
                                        }
                                    />
                                </div>
                            </div>

                            {/* Inv. No. - 2 columns */}
                            <div className="col-span-2 space-y-2">
                                <Label className="text-sm">Inv. No.</Label>
                                <Input {...register('invoice_number')} placeholder="Inv. No." />
                            </div>

                            {/* Inv. Date - 2 columns */}
                            <div className="col-span-2 space-y-2">
                                <Label className="text-sm">Inv. Date</Label>
                                <Controller
                                    control={control}
                                    name="invoice_date"
                                    render={({ field }) => (
                                        <DatePicker
                                            value={field.value}
                                            onChange={(date) => field.onChange(date ? format(date, 'yyyy-MM-dd') : '')}
                                        />
                                    )}
                                />
                            </div>
                        </div>

                        {/* Item Table */}
                        <div className="space-y-3 flex-1 overflow-hidden flex flex-col">
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

                            <div className="border rounded-lg overflow-auto flex-1">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-primary hover:bg-primary">
                                            <TableHead className="text-primary-foreground text-xs w-10">
                                                #
                                            </TableHead>
                                            <TableHead className="text-primary-foreground text-xs">
                                                Item Name
                                            </TableHead>
                                            <TableHead className="text-primary-foreground text-xs">
                                                HSN Code
                                            </TableHead>
                                            <TableHead className="text-primary-foreground text-xs text-right">
                                                Qty
                                            </TableHead>
                                            <TableHead className="text-primary-foreground text-xs">
                                                UOM
                                            </TableHead>
                                            <TableHead className="text-primary-foreground text-xs text-right">
                                                Price
                                            </TableHead>
                                            <TableHead className="text-primary-foreground text-xs text-right">
                                                Disc.
                                            </TableHead>
                                            <TableHead className="text-primary-foreground text-xs text-right">
                                                CGST
                                            </TableHead>
                                            <TableHead className="text-primary-foreground text-xs text-right">
                                                SGST
                                            </TableHead>
                                            <TableHead className="text-primary-foreground text-xs text-right">
                                                Amount
                                            </TableHead>
                                            <TableHead className="text-primary-foreground text-xs">
                                                Remark
                                            </TableHead>
                                            <TableHead className="text-primary-foreground text-xs w-20">
                                                Action
                                            </TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {items.length === 0 ? (
                                            <TableRow>
                                                <TableCell
                                                    colSpan={12}
                                                    className="text-center text-sm text-muted-foreground py-8"
                                                >
                                                    No data available in table
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            <>
                                                {items.map((item, index) => {
                                                    const lineTotal =
                                                        item.amount +
                                                        item.cgst_amount +
                                                        item.sgst_amount +
                                                        item.igst_amount;
                                                    return (
                                                        <TableRow
                                                            key={index}
                                                            className="hover:bg-muted/50"
                                                        >
                                                            <TableCell className="text-xs">
                                                                {index + 1}
                                                            </TableCell>
                                                            <TableCell className="text-xs">
                                                                {item.item_name}
                                                            </TableCell>
                                                            <TableCell className="text-xs">
                                                                {item.hsn_code || '-'}
                                                            </TableCell>
                                                            <TableCell className="text-xs text-right">
                                                                {item.quantity}
                                                            </TableCell>
                                                            <TableCell className="text-xs">
                                                                {item.unit}
                                                            </TableCell>
                                                            <TableCell className="text-xs text-right">
                                                                {formatCurrency(item.rate)}
                                                            </TableCell>
                                                            <TableCell className="text-xs text-right">
                                                                {item.discount_percent}%
                                                            </TableCell>
                                                            <TableCell className="text-xs text-right">
                                                                {formatCurrency(item.cgst_amount)}
                                                            </TableCell>
                                                            <TableCell className="text-xs text-right">
                                                                {formatCurrency(item.sgst_amount)}
                                                            </TableCell>
                                                            <TableCell className="text-xs text-right font-medium">
                                                                {formatCurrency(lineTotal)}
                                                            </TableCell>
                                                            <TableCell className="text-xs">
                                                                {item.remark || '-'}
                                                            </TableCell>
                                                            <TableCell>
                                                                <div className="flex gap-1">
                                                                    <Button
                                                                        type="button"
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-7 w-7"
                                                                        onClick={() =>
                                                                            handleEditItem(item, index)
                                                                        }
                                                                    >
                                                                        <Edit2 className="h-3 w-3" />
                                                                    </Button>
                                                                    <Button
                                                                        type="button"
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-7 w-7 text-destructive"
                                                                        onClick={() =>
                                                                            handleDeleteItem(index)
                                                                        }
                                                                    >
                                                                        <Trash2 className="h-3 w-3" />
                                                                    </Button>
                                                                </div>
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                })}

                                                {/* Total Row */}
                                                <TableRow className="bg-muted/50 font-semibold">
                                                    <TableCell
                                                        colSpan={9}
                                                        className="text-right text-xs"
                                                    >
                                                        Total
                                                    </TableCell>
                                                    <TableCell className="text-right text-xs">
                                                        {formatCurrency(totals.netAmount)}
                                                    </TableCell>
                                                    <TableCell colSpan={2}></TableCell>
                                                </TableRow>
                                            </>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>

                        {/* Summary Section */}
                        <div className="space-y-2">
                            <div className="bg-primary text-primary-foreground px-3 py-2 rounded-lg text-xs font-semibold">
                                Description
                            </div>
                            <div className="grid grid-cols-4 gap-4 text-xs">
                                {/* Sub Total */}
                                <div className="flex justify-between items-center py-1 border-b col-span-3">
                                    <span className="text-primary font-medium">Sub Total</span>
                                </div>
                                <div className="py-1 border-b text-right font-medium">
                                    {formatCurrency(totals.subtotal)}
                                </div>

                                {/* CGST */}
                                <div className="flex justify-between items-center py-1 border-b col-span-3">
                                    <span className="text-muted-foreground">CGST</span>
                                </div>
                                <div className="py-1 border-b text-right font-medium">
                                    {formatCurrency(totals.totalCGST)}
                                </div>

                                {/* SGST */}
                                <div className="flex justify-between items-center py-1 border-b col-span-3">
                                    <span className="text-muted-foreground">SGST</span>
                                </div>
                                <div className="py-1 border-b text-right font-medium">
                                    {formatCurrency(totals.totalSGST)}
                                </div>

                                {/* ROUNDED OFF */}
                                <div className="flex justify-between items-center py-1 border-b col-span-3">
                                    <span className="text-muted-foreground">ROUNDED OFF</span>
                                </div>
                                <div className="py-1 border-b text-right font-medium">
                                    {formatCurrency(totals.roundOff)}
                                </div>

                                {/* Net Amount */}
                                <div className="bg-primary text-primary-foreground px-2 py-2 rounded flex items-center col-span-3">
                                    <span className="font-semibold">Net. Amount</span>
                                </div>
                                <div className="bg-primary text-primary-foreground px-2 py-2 rounded text-right">
                                    <span className="font-bold">{formatCurrency(totals.netAmount)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Notes */}
                        <div className="space-y-2">
                            <Label className="text-sm">Remark</Label>
                            <Textarea
                                {...register('notes')}
                                placeholder="Additional notes..."
                                rows={2}
                            />
                        </div>

                        {/* Dialog Footer */}
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => onOpenChange(false)}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isCreating || items.length === 0}>
                                {isCreating ? 'Saving...' : 'Save'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Item Selection Dialog */}
            <ItemSelectionDialog
                open={isItemDialogOpen}
                onOpenChange={setIsItemDialogOpen}
                onSave={handleSaveItem}
                onSaveAndClose={handleSaveAndCloseItem}
                editItem={editingItem}
            />
        </>
    );
}
