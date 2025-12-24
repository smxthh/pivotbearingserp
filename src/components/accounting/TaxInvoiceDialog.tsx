import { useState, useEffect, useMemo, useRef } from 'react';
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
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Plus, Trash2, Edit2 } from 'lucide-react';
import { toast } from 'sonner';
import { useVouchers, VoucherItemInsert } from '@/hooks/useVouchers';
import { useLedgers } from '@/hooks/useLedgers';
import { useParties } from '@/hooks/useParties';
import { useVoucherPrefixesForType } from '@/hooks/useVoucherPrefixes';
import { useDocumentNumber } from '@/hooks/useDocumentNumber';
import { SearchablePartySelect } from '@/components/shared/SearchablePartySelect';
import { ItemSelectionDialog, InvoiceItem } from '@/components/accounting/ItemSelectionDialog';
import * as SelectPrimitive from '@radix-ui/react-select';
import { supabase } from '@/integrations/supabase/client';

// Form schema
const formSchema = z.object({
    inv_prefix: z.string().default(''),
    inv_number: z.coerce.number().min(1, 'Required'),
    inv_date: z.string().min(1, 'Required'),
    due_date: z.string().optional(),
    party_id: z.string().min(1, 'Required'),
    memo_type: z.string().default('Debit'),
    gst_type: z.string().min(1, 'Required'),
    ship_to: z.string().optional(),
    po_number: z.string().optional(),
    notes: z.string().optional(),
    apply_round_off: z.boolean().default(true),
});

type FormData = z.infer<typeof formSchema>;

interface TaxInvoiceDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function TaxInvoiceDialog({ open, onOpenChange }: TaxInvoiceDialogProps) {
    const { createVoucher, createVoucherAtomic, isCreating, getVoucherById } = useVouchers({ realtime: false });
    const { vouchers: existingInvoices } = useVouchers({
        voucherType: 'tax_invoice',
        realtime: true
    });
    const { vouchers: deliveryChallans } = useVouchers({
        voucherType: 'delivery_challan',
        realtime: false
    });
    const { parties } = useParties({ realtime: true });
    const { ledgers } = useLedgers({ realtime: true });

    // State
    const [items, setItems] = useState<InvoiceItem[]>([]);
    const [linkedChallan, setLinkedChallan] = useState<string>('');
    const lastLoadedChallanRef = useRef<string>('');
    const [isItemDialogOpen, setIsItemDialogOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<InvoiceItem | null>(null);
    const [editingIndex, setEditingIndex] = useState<number>(-1);

    // Fetch prefixes from centralized system
    const { prefixes: dbPrefixes, defaultPrefix } = useVoucherPrefixesForType('Sales Invoice');

    // Format prefixes for dropdown with year formatting to match database expectations
    const invPrefixes = useMemo(() => {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1;
        let startYear, endYear;
        // Financial year starts April 1st
        if (month >= 4) {
            startYear = year;
            endYear = year + 1;
        } else {
            startYear = year - 1;
            endYear = year;
        }

        return dbPrefixes.map(p => {
            let yearPart = '';
            switch (p.year_format) {
                case 'yy-yy':
                    yearPart = `${startYear % 100}-${endYear % 100}`;
                    break;
                case 'yy':
                    yearPart = `${startYear % 100}`;
                    break;
                case 'yyyy':
                    yearPart = `${startYear}-${endYear}`;
                    break;
                case 'none':
                    yearPart = '';
                    break;
                default:
                    yearPart = `${startYear % 100}-${endYear % 100}`;
            }

            if (yearPart) {
                return `${p.voucher_prefix}${p.prefix_separator}${yearPart}${p.prefix_separator}`;
            } else {
                return `${p.voucher_prefix}${p.prefix_separator}`;
            }
        });
    }, [dbPrefixes]);

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
            inv_prefix: '',
            inv_number: 1,
            inv_date: new Date().toISOString().split('T')[0],
            due_date: '',
            party_id: '',
            memo_type: 'Debit',
            gst_type: '',
            ship_to: '',
            po_number: '',
            notes: '',
            apply_round_off: true,
        },
    });

    const watchedPartyId = watch('party_id');
    const watchedInvPrefix = watch('inv_prefix');

    // Find the raw prefix (e.g. "RM/") corresponding to the selected formatted prefix (e.g. "RM/25-26/")
    // This is needed because the database functions expect the base prefix + separator to find the record.
    const rawPrefix = useMemo(() => {
        if (!watchedInvPrefix || dbPrefixes.length === 0) return null;
        // Find the prefix record that matches the start of the formatted string
        const match = dbPrefixes.find(p => {
            const base = `${p.voucher_prefix}${p.prefix_separator}`;
            return watchedInvPrefix.startsWith(base);
        });
        return match ? `${match.voucher_prefix}${match.prefix_separator}` : null;
    }, [watchedInvPrefix, dbPrefixes]);

    // Document Numbering
    const { previewNumber, incrementNumber, refetchPreview } = useDocumentNumber({
        voucherName: 'Sales Invoice', // Assuming Tax Invoice maps to Sales Invoice prefixes
        prefix: rawPrefix || watchedInvPrefix // Fallback to watched if logic fails, though raw is preferred
    });

    // Invoice number is now manually entered by user
    const watchedApplyRoundOff = watch('apply_round_off');

    // Get selected party and ship-to options
    const selectedParty = parties.find(p => p.id === watchedPartyId);

    // Load from linked delivery challan - only when challan changes
    useEffect(() => {
        // Skip if challan hasn't changed or is empty
        if (!linkedChallan || linkedChallan === lastLoadedChallanRef.current) {
            return;
        }

        lastLoadedChallanRef.current = linkedChallan;

        getVoucherById(linkedChallan).then(voucher => {
            if (voucher) {
                setValue('party_id', voucher.party_id || '');
                setValue('ship_to', (voucher as any).ship_to || '');
                setValue('po_number', (voucher as any).customer_po_number || (voucher as any).po_number || '');
                // Load items from challan with pricing (challan has price internally)
                if (voucher.items) {
                    const loadedItems: InvoiceItem[] = voucher.items.map(item => {
                        const rate = item.rate || 0;
                        const qty = item.quantity || 0;
                        const amount = rate * qty;
                        const discountPercent = item.discount_percent || 0;
                        const gstPercent = item.gst_percent || 18;
                        const taxableAmount = amount - (amount * discountPercent / 100);
                        const cgstAmount = (taxableAmount * (gstPercent / 2)) / 100;
                        const sgstAmount = (taxableAmount * (gstPercent / 2)) / 100;
                        const totalAmount = taxableAmount + cgstAmount + sgstAmount;

                        return {
                            item_id: item.item_id || undefined,
                            item_name: item.item_name,
                            hsn_code: item.hsn_code || '',
                            quantity: qty,
                            unit: item.unit,
                            rate: rate,
                            amount: amount,
                            discount_percent: discountPercent,
                            gst_percent: gstPercent,
                            cgst_amount: cgstAmount,
                            sgst_amount: sgstAmount,
                            igst_amount: 0,
                            total_amount: totalAmount,
                            remark: item.remarks || '',
                        };
                    });
                    setItems(loadedItems);
                }
            }
        });
    }, [linkedChallan, getVoucherById, setValue]);



    // Get party's ledger balance
    const partyLedgerBalance = useMemo(() => {
        const partyLedger = ledgers.find(l => l.party_id === watchedPartyId);
        return partyLedger?.closing_balance || 0;
    }, [ledgers, watchedPartyId]);

    const shipToOptions = useMemo(() => {
        if (!selectedParty) return [];
        const options = [];
        if (selectedParty.address) options.push({ label: selectedParty.address, value: selectedParty.address });
        if (selectedParty.city) options.push({ label: `${selectedParty.city}, ${selectedParty.state || ''}`, value: `${selectedParty.city}, ${selectedParty.state || ''}` });
        return options;
    }, [selectedParty]);

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
        const roundOff = watchedApplyRoundOff ? Math.round(beforeRoundOff) - beforeRoundOff : 0;
        const netAmount = beforeRoundOff + roundOff;

        return { subtotal, totalCGST, totalSGST, roundOff, netAmount };
    }, [items, watchedApplyRoundOff]);

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
            // Get the properly formatted default prefix
            const defaultPrefixFormatted = invPrefixes[0] || 'RM/25-26/';

            reset({
                inv_prefix: defaultPrefixFormatted,
                inv_number: 1,
                inv_date: new Date().toISOString().split('T')[0],
                party_id: '',
                memo_type: 'Debit',
                gst_type: '',
                ship_to: '',
                po_number: '',
                notes: '',
                apply_round_off: true,
            });
            setItems([]);
            setLinkedChallan('');
            lastLoadedChallanRef.current = '';

            // Force fetch latest number
            refetchPreview();
        }
    }, [open, reset, invPrefixes, refetchPreview]);

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



    // Auto-populate document number from preview if not set manually or is default (1)
    const watchedInvNumber = watch('inv_number');
    useEffect(() => {
        // If preview is available, and the user hasn't manually edited the field, update it.
        // We checking if the dialog is open to ensure we update when re-opening.
        if (open && previewNumber && !dirtyFields.inv_number) {
            const parts = previewNumber.split(/[/ -]/);
            const numStr = parts[parts.length - 1];
            const num = parseInt(numStr);
            if (!isNaN(num)) {
                setValue('inv_number', num);
            }
        }
    }, [open, previewNumber, watchedInvNumber, setValue, dirtyFields.inv_number]);

    // Submit handler
    const onSubmit = async (data: FormData) => {
        if (items.length === 0) return;

        // ========== STOCK VALIDATION ==========
        // Validate stock for all items with item_id before proceeding
        const itemsWithId = items.filter(item => item.item_id);
        if (itemsWithId.length > 0) {
            const itemIds = itemsWithId.map(item => item.item_id!);

            // Fetch current stock from database (authoritative source)
            const { data: stockData, error: stockError } = await supabase
                .from('items')
                .select('id, sku, name, stock_quantity')
                .in('id', itemIds);

            if (stockError) {
                toast.error('Failed to verify stock availability. Please try again.');
                return;
            }

            // Build a map for quick lookup
            const stockMap = new Map(stockData?.map(item => [item.id, item]) || []);

            // Validate each line item
            for (const invoiceItem of itemsWithId) {
                const stockItem = stockMap.get(invoiceItem.item_id!);
                if (!stockItem) {
                    toast.error(`Item "${invoiceItem.item_name}" not found in inventory.`);
                    return;
                }

                if (invoiceItem.quantity > stockItem.stock_quantity) {
                    toast.error(
                        `Insufficient stock for ${stockItem.sku} – ${stockItem.name}.\nAvailable stock: ${stockItem.stock_quantity} units.\nYou are trying to sell: ${invoiceItem.quantity} units.`,
                        { duration: 6000 }
                    );
                    return;
                }
            }
        }
        // ========== END STOCK VALIDATION ==========

        // ========== DUPLICATE INVOICE NUMBER CHECK ==========
        // Build the full invoice number that will be created
        const fullInvoiceNumber = `${data.inv_prefix}${data.inv_number}`;

        // Check if this invoice number already exists
        const { data: existingInvoice, error: checkError } = await supabase
            .from('vouchers')
            .select('id, voucher_number')
            .eq('voucher_number', fullInvoiceNumber)
            .eq('voucher_type', 'tax_invoice')
            .maybeSingle();

        if (checkError) {
            toast.error('Failed to verify invoice number. Please try again.');
            return;
        }

        if (existingInvoice) {
            toast.error(
                `Invoice number "${fullInvoiceNumber}" already exists. Please use a different number.`,
                { duration: 5000 }
            );
            return;
        }
        // ========== END DUPLICATE CHECK ==========

        try {
            // Build prefix for voucher_number (database trigger will append the atomic number)
            const voucherNumberPrefix = data.inv_prefix;

            // NOTE: Ledger postings are now handled by backend database triggers
            // The trigger 'auto_post_invoice_to_accounting' will automatically create
            // ledger entries when the voucher is saved with status='confirmed'
            // This ensures:
            // 1. No duplicate entries (idempotent)
            // 2. Audit-safe reversal on cancellation
            // 3. Proper validation of required ledgers

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
                igst_amount: item.igst_amount || 0,
                total_amount: item.total_amount,
                line_order: index + 1,
                remarks: item.remark,
            }));

            // Calculate IGST for header
            const totalIGST = items.reduce((sum, item) => sum + (item.igst_amount || 0), 0);

            const invNumberStr = data.inv_number ? data.inv_number.toString() : '';
            const fullVoucherNumber = invNumberStr ? `${voucherNumberPrefix}${invNumberStr}` : voucherNumberPrefix;

            await createVoucherAtomic.mutateAsync({
                voucher: {
                    voucher_type: 'tax_invoice',
                    voucher_number: fullVoucherNumber,
                    inv_number: invNumberStr,
                    voucher_date: data.inv_date,
                    due_date: data.due_date || null,
                    party_id: data.party_id,
                    party_name: selectedParty?.name || '',
                    narration: data.notes,
                    subtotal: totals.subtotal,
                    taxable_amount: totals.subtotal, // Ensure taxable_amount is set for backend
                    cgst_amount: totals.totalCGST,
                    sgst_amount: totals.totalSGST,
                    igst_amount: totalIGST,
                    total_tax: totals.totalCGST + totals.totalSGST + totalIGST,
                    round_off: totals.roundOff,
                    total_amount: totals.netAmount,
                    status: 'confirmed', // Backend trigger will auto-post to ledger
                    memo_type: data.memo_type,
                    inv_prefix: data.inv_prefix,
                    gst_type: data.gst_type,
                    ship_to: data.ship_to,
                    po_number: data.po_number,
                    apply_round_off: data.apply_round_off,
                    parent_voucher_id: linkedChallan || null,
                } as any,
                items: voucherItems,
                // No ledgerPostings - backend trigger handles accounting automatically
            });

            // NOTE: incrementNumber removed - database trigger handles sequence atomically

            onOpenChange(false);
        } catch (error) {
            console.error('Error creating tax invoice:', error);
        }
    };

    const memoTypes = ['Debit', 'Cash', 'Other'];
    const gstTypes = [
        'GST Local Sales',
        'GST Inter-State Sales',
        'GST Exports',
    ];

    // Get confirmed delivery challans for linking
    const confirmedChallans = deliveryChallans.filter(v => v.status === 'confirmed');

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-[1000px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-semibold">Sales Invoice</DialogTitle>
                    </DialogHeader>

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                        {/* Row 1: Inv No, Dates, Customer Name, GST No */}
                        <div className="grid grid-cols-12 gap-4">
                            <div className="col-span-3 space-y-2">
                                <Label className="text-sm">Inv. No. <span className="text-xs text-muted-foreground">(Editable)</span></Label>
                                <div className="flex gap-1">
                                    <Select value={watchedInvPrefix} onValueChange={v => setValue('inv_prefix', v)}>
                                        <SelectTrigger className="w-24">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectPrimitive.Portal>
                                            <SelectContent>
                                                {invPrefixes.map(p => (
                                                    <SelectItem key={p} value={p}>{p}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </SelectPrimitive.Portal>
                                    </Select>
                                    <Input
                                        type="number"
                                        {...register('inv_number')}
                                        className="flex-1"
                                        min={1}
                                        title="You can change this number if needed"
                                    />
                                </div>
                            </div>

                            <div className="col-span-3 space-y-2">
                                <Label className="text-sm">
                                    Inv. & Due Date <span className="text-destructive">*</span>
                                </Label>
                                <div className="flex gap-2">
                                    <Controller
                                        control={control}
                                        name="inv_date"
                                        render={({ field }) => (
                                            <DatePicker
                                                value={field.value}
                                                onChange={(date) => field.onChange(date ? format(date, 'yyyy-MM-dd') : '')}
                                                className={errors.inv_date ? 'border-destructive flex-1' : 'flex-1'}
                                                placeholder="Inv. Date"
                                            />
                                        )}
                                    />
                                    <Controller
                                        control={control}
                                        name="due_date"
                                        render={({ field }) => (
                                            <DatePicker
                                                value={field.value}
                                                onChange={(date) => field.onChange(date ? format(date, 'yyyy-MM-dd') : '')}
                                                className="flex-1"
                                                placeholder="Due Date"
                                            />
                                        )}
                                    />
                                </div>
                            </div>

                            <div className="col-span-4 space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label className="text-sm">
                                        Customer Name <span className="text-destructive">*</span>
                                    </Label>
                                    <div className="flex gap-2 text-xs">
                                        <a href="#" className="text-primary hover:underline">+ Create Invoice</a>
                                        <a href="#" className="text-primary hover:underline">+ Add New</a>
                                    </div>
                                </div>
                                <SearchablePartySelect
                                    value={watchedPartyId}
                                    onChange={(v) => setValue('party_id', v)}
                                    partyType="customer"
                                    placeholder="Select Party"
                                    error={!!errors.party_id}
                                />
                                <div className="flex justify-between text-xs mt-1">
                                    <span className={partyLedgerBalance >= 0 ? 'text-green-600' : 'text-red-600'}>
                                        Cl. Balance: <span className="font-medium">{formatCurrency(partyLedgerBalance)} {partyLedgerBalance >= 0 ? 'Dr' : 'Cr'}</span>
                                    </span>
                                </div>
                            </div>

                            <div className="col-span-2 space-y-2">
                                <Label className="text-sm">GST NO.</Label>
                                <Input
                                    value={selectedParty?.gst_number || ''}
                                    disabled
                                    placeholder="Select GST No."
                                    className="bg-muted"
                                />
                            </div>
                        </div>

                        {/* Row 2: Delivery Challan, Memo Type, GST Type, Ship To, P.O. No. */}
                        <div className="grid grid-cols-12 gap-4">
                            <div className="col-span-3 space-y-2">
                                <Label className="text-sm">Delivery Challan</Label>
                                <Select value={linkedChallan || '_none_'} onValueChange={(v) => setLinkedChallan(v === '_none_' ? '' : v)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="None" />
                                    </SelectTrigger>
                                    <SelectPrimitive.Portal>
                                        <SelectContent>
                                            <SelectItem value="_none_">None</SelectItem>
                                            {confirmedChallans.map(c => (
                                                <SelectItem key={c.id} value={c.id}>
                                                    {c.voucher_number} - {c.party_name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </SelectPrimitive.Portal>
                                </Select>
                            </div>

                            <div className="col-span-2 space-y-2">
                                <Label className="text-sm">Memo Type</Label>
                                <Select value={watch('memo_type')} onValueChange={v => setValue('memo_type', v)}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectPrimitive.Portal>
                                        <SelectContent>
                                            {memoTypes.map(t => (
                                                <SelectItem key={t} value={t}>{t}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </SelectPrimitive.Portal>
                                </Select>
                            </div>

                            <div className="col-span-3 space-y-2">
                                <Label className="text-sm">
                                    GST Type <span className="text-destructive">*</span>
                                </Label>
                                <Select value={watch('gst_type')} onValueChange={v => setValue('gst_type', v)}>
                                    <SelectTrigger className={errors.gst_type ? 'border-destructive' : ''}>
                                        <SelectValue placeholder="Select Type" />
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

                            <div className="col-span-2 space-y-2">
                                <Label className="text-sm">Ship To</Label>
                                <Select value={watch('ship_to') || ''} onValueChange={v => setValue('ship_to', v)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Ship To" />
                                    </SelectTrigger>
                                    <SelectPrimitive.Portal>
                                        <SelectContent>
                                            {shipToOptions.map((opt, idx) => (
                                                <SelectItem key={idx} value={opt.value}>{opt.label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </SelectPrimitive.Portal>
                                </Select>
                            </div>

                            <div className="col-span-2 space-y-2">
                                <Label className="text-sm">P.O. No.</Label>
                                <Input
                                    {...register('po_number')}
                                    placeholder="P.O. No."
                                />
                            </div>
                        </div>

                        {/* Notes */}
                        <div className="space-y-2">
                            <Label className="text-sm">Notes</Label>
                            <Input {...register('notes')} placeholder="Notes" />
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
                                    Add
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
                                            <TableHead className="text-primary-foreground text-xs text-right">Disc.</TableHead>
                                            <TableHead className="text-primary-foreground text-xs text-right">CGST</TableHead>
                                            <TableHead className="text-primary-foreground text-xs text-right">SGST</TableHead>
                                            <TableHead className="text-primary-foreground text-xs text-right">Amount</TableHead>
                                            <TableHead className="text-primary-foreground text-xs">Remark</TableHead>
                                            <TableHead className="text-primary-foreground text-xs w-20">Action</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {items.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={12} className="text-center text-sm text-muted-foreground py-8">
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
                                                    <TableCell className="text-xs text-right">{item.discount_percent}%</TableCell>
                                                    <TableCell className="text-xs text-right">{formatCurrency(item.cgst_amount)}</TableCell>
                                                    <TableCell className="text-xs text-right">{formatCurrency(item.sgst_amount)}</TableCell>
                                                    <TableCell className="text-xs text-right font-medium">{formatCurrency(item.total_amount)}</TableCell>
                                                    <TableCell className="text-xs">{item.remark || '-'}</TableCell>
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
                                        {/* Total Row */}
                                        <TableRow className="bg-muted/50 font-semibold">
                                            <TableCell colSpan={9} className="text-right text-xs">Total</TableCell>
                                            <TableCell className="text-right text-xs">{formatCurrency(items.reduce((sum, item) => sum + item.total_amount, 0))}</TableCell>
                                            <TableCell colSpan={2}></TableCell>
                                        </TableRow>
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
                                <div className="flex justify-between items-center py-1 border-b col-span-3">
                                    <span className="text-primary font-medium">Sub Total</span>
                                </div>
                                <div className="py-1 border-b text-right font-medium">{formatCurrency(totals.subtotal)}</div>

                                <div className="flex justify-between items-center py-1 border-b col-span-3">
                                    <span className="text-muted-foreground">CGST</span>
                                </div>
                                <div className="py-1 border-b text-right font-medium">{formatCurrency(totals.totalCGST)}</div>

                                <div className="flex justify-between items-center py-1 border-b col-span-3">
                                    <span className="text-muted-foreground">SGST</span>
                                </div>
                                <div className="py-1 border-b text-right font-medium">{formatCurrency(totals.totalSGST)}</div>

                                <div className="flex justify-between items-center py-1 border-b col-span-3">
                                    <span className="text-muted-foreground">ROUNDED OFF</span>
                                </div>
                                <div className="py-1 border-b text-right font-medium">{formatCurrency(totals.roundOff)}</div>

                                <div className="bg-primary text-primary-foreground px-2 py-2 rounded flex items-center col-span-3">
                                    <span className="font-semibold">Net. Amount</span>
                                </div>
                                <div className="bg-primary text-primary-foreground px-2 py-2 rounded text-right">
                                    <span className="font-bold">{formatCurrency(totals.netAmount)}</span>
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
