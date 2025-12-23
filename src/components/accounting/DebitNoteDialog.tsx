import { useState, useEffect, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { format } from 'date-fns';
import { DatePicker } from '@/components/ui/date-picker';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import { useVouchers, VoucherItemInsert, LedgerPostingItem } from '@/hooks/useVouchers';
import { useLedgers } from '@/hooks/useLedgers';
import { useParties } from '@/hooks/useParties';
import { useVoucherPrefixesForType } from '@/hooks/useVoucherPrefixes';
import { SearchablePartySelect } from '@/components/shared/SearchablePartySelect';
import { ItemSelectionDialog, InvoiceItem } from '@/components/accounting/ItemSelectionDialog';
import * as SelectPrimitive from '@radix-ui/react-select';

// Form schema
const formSchema = z.object({
    dn_prefix: z.string().default('DRN/25-26/'),
    dn_number: z.coerce.number().min(1, 'Required'),
    dn_date: z.string().min(1, 'Required'),
    party_id: z.string().min(1, 'Required'),
    memo_type: z.string().default('Debit'),
    dn_type: z.string().default('Decrease Purchase'),
    gst_type: z.string().min(1, 'Required'),
    inv_number: z.string().optional(),
    inv_date: z.string().optional(),
    apply_round_off: z.boolean().default(true),
    eligibility_itc: z.string().optional(),
    narration: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface DebitNoteDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function DebitNoteDialog({ open, onOpenChange }: DebitNoteDialogProps) {
    const { createVoucher, isCreating } = useVouchers({ realtime: false });
    const { parties } = useParties({ realtime: true });
    const { ledgers } = useLedgers({ realtime: true });

    // State
    const [items, setItems] = useState<InvoiceItem[]>([]);
    const [isItemDialogOpen, setIsItemDialogOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<InvoiceItem | null>(null);
    const [editingIndex, setEditingIndex] = useState<number>(-1);

    // Fetch prefixes from centralized system
    const { prefixes: dbPrefixes, defaultPrefix } = useVoucherPrefixesForType('Debit Note');

    // Format prefixes for dropdown
    // Format prefixes for dropdown
    const dnPrefixes = useMemo(() => {
        return dbPrefixes.map(p => `${p.voucher_prefix}${p.prefix_separator}`);
    }, [dbPrefixes]);

    const {
        register,
        handleSubmit,
        reset,
        setValue,
        watch,
        control,
        formState: { errors },
    } = useForm<FormData>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            dn_prefix: 'DRN/25-26/',
            dn_number: 1,
            dn_date: new Date().toISOString().split('T')[0],
            party_id: '',
            memo_type: 'Debit',
            dn_type: 'Decrease Purchase',
            gst_type: '',
            inv_number: '',
            inv_date: '',
            apply_round_off: true,
            eligibility_itc: '',
            narration: '',
        },
    });

    const watchedPartyId = watch('party_id');
    const watchedPrefix = watch('dn_prefix');

    // Document number is now manually entered by user
    const watchedApplyRoundOff = watch('apply_round_off');

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
            const defaultPre = defaultPrefix
                ? `${defaultPrefix.voucher_prefix}${defaultPrefix.prefix_separator}`
                : dnPrefixes[0] || 'DRN/';
            reset({
                dn_prefix: defaultPre,
                dn_number: 1,
                dn_date: new Date().toISOString().split('T')[0],
                party_id: '',
                memo_type: 'Debit',
                dn_type: 'Decrease Purchase',
                gst_type: '',
                inv_number: '',
                inv_date: '',
                apply_round_off: true,
                eligibility_itc: '',
                narration: '',
            });
            setItems([]);
        }
    }, [open, reset, defaultPrefix, dnPrefixes]);

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
            const ledgerPostings: LedgerPostingItem[] = [];

            // Credit: Purchase Account (taxable amount only - reducing purchase)
            const purchaseLedger = ledgers.find(l => l.name === 'Purchase Account' || l.group_name === 'Purchase Account');
            if (purchaseLedger) {
                ledgerPostings.push({
                    ledger_id: purchaseLedger.id,
                    debit_amount: 0,
                    credit_amount: totals.subtotal,
                    narration: `Debit Note to ${selectedParty?.name || 'Supplier'}`,
                });
            }

            // Credit: GST Input accounts (reverse input credit claimed)
            if (totals.totalCGST > 0) {
                const cgstInputLedger = ledgers.find(l => l.name === 'CGST Input' || l.name === 'Input CGST');
                if (cgstInputLedger) {
                    ledgerPostings.push({
                        ledger_id: cgstInputLedger.id,
                        debit_amount: 0,
                        credit_amount: totals.totalCGST,
                        narration: 'CGST reversal on debit note',
                    });
                }
            }
            if (totals.totalSGST > 0) {
                const sgstInputLedger = ledgers.find(l => l.name === 'SGST Input' || l.name === 'Input SGST');
                if (sgstInputLedger) {
                    ledgerPostings.push({
                        ledger_id: sgstInputLedger.id,
                        debit_amount: 0,
                        credit_amount: totals.totalSGST,
                        narration: 'SGST reversal on debit note',
                    });
                }
            }

            // Debit: Supplier Ledger (reduce payable to supplier)
            const partyLedger = ledgers.find(l => l.party_id === data.party_id);
            if (partyLedger) {
                ledgerPostings.push({
                    ledger_id: partyLedger.id,
                    debit_amount: totals.netAmount,
                    credit_amount: 0,
                    narration: 'Debit Note',
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

            await createVoucher.mutateAsync({
                voucher: {
                    voucher_type: 'debit_note',
                    voucher_number: `${data.dn_prefix}${data.dn_number}`,
                    voucher_date: data.dn_date,
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
                    dn_prefix: data.dn_prefix,
                    dn_number: data.dn_number,
                    dn_type: data.dn_type,
                    gst_type: data.gst_type,
                    inv_number: data.inv_number,
                    inv_date: data.inv_date || null,
                    apply_round_off: data.apply_round_off,
                    eligibility_itc: data.eligibility_itc,
                } as any,
                items: voucherItems,
                ledgerPostings,
            });

            onOpenChange(false);
        } catch (error) {
            console.error('Error creating debit note:', error);
        }
    };

    const memoTypes = ['Debit', 'Cash', 'Other'];
    const dnTypes = ['Decrease Purchase', 'Purchase Return', 'Increase Sales'];
    const gstTypes = [
        'GST Local Purchase',
        'GST Central Purchase',
        'Tax Free Purchase Local',
        'Exempted (Nill Rated)',
        'Jobwork Local',
        'Jobwork Central',
        'URD Local Purchase',
        'URD Central Purchase',
    ];
    const itcOptions = ['Inputs', 'Capital Goods', 'Input Services', 'Ineligible'];

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-[1000px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-semibold">Debit Note</DialogTitle>
                    </DialogHeader>

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                        {/* Row 1: DN No, DN Date, Party Name, GST No */}
                        <div className="grid grid-cols-4 gap-4">
                            <div className="space-y-2">
                                <Label className="text-sm">DN. No.</Label>
                                <div className="flex gap-1">
                                    <Select value={watchedPrefix} onValueChange={v => setValue('dn_prefix', v)}>
                                        <SelectTrigger className="w-28">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectPrimitive.Portal>
                                            <SelectContent>
                                                {dnPrefixes.map(p => (
                                                    <SelectItem key={p} value={p}>{p}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </SelectPrimitive.Portal>
                                    </Select>
                                    <Input
                                        type="number"
                                        {...register('dn_number')}
                                        className="w-16"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-sm">
                                    DN. Date <span className="text-destructive">*</span>
                                </Label>
                                <Controller
                                    name="dn_date"
                                    control={control}
                                    render={({ field }) => (
                                        <DatePicker
                                            value={field.value}
                                            onChange={(date) => field.onChange(date ? format(date, 'yyyy-MM-dd') : '')}
                                            className={errors.dn_date ? 'border-destructive' : ''}
                                        />
                                    )}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-sm">
                                    Party Name <span className="text-destructive">*</span>
                                </Label>
                                <SearchablePartySelect
                                    value={watchedPartyId}
                                    onChange={(v) => setValue('party_id', v)}
                                    partyType="all"
                                    placeholder="Select Party"
                                    error={!!errors.party_id}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-sm">GST NO.</Label>
                                <Input
                                    value={selectedParty?.gst_number || ''}
                                    disabled
                                    placeholder="Select GST No."
                                    className="bg-muted"
                                />
                            </div>
                        </div>

                        {/* Row 2: Memo Type, DN Type, GST Type, Inv No, Inv Date */}
                        <div className="grid grid-cols-5 gap-4">
                            <div className="space-y-2">
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

                            <div className="space-y-2">
                                <Label className="text-sm">DN. Type</Label>
                                <Select value={watch('dn_type')} onValueChange={v => setValue('dn_type', v)}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectPrimitive.Portal>
                                        <SelectContent>
                                            {dnTypes.map(t => (
                                                <SelectItem key={t} value={t}>{t}</SelectItem>
                                            ))}
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

                            <div className="space-y-2">
                                <Label className="text-sm">Inv. No.</Label>
                                <Input
                                    {...register('inv_number')}
                                    placeholder="Inv. No."
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-sm">Inv. Date</Label>
                                <Controller
                                    name="inv_date"
                                    control={control}
                                    render={({ field }) => (
                                        <DatePicker
                                            value={field.value}
                                            onChange={(date) => field.onChange(date ? format(date, 'yyyy-MM-dd') : '')}
                                        />
                                    )}
                                />
                            </div>
                        </div>

                        {/* Row 3: Apply Round Off, Eligibility ITC */}
                        <div className="grid grid-cols-4 gap-4">
                            <div className="space-y-2">
                                <Label className="text-sm">Apply Round Off</Label>
                                <Select
                                    value={watchedApplyRoundOff ? 'Yes' : 'No'}
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

                            <div className="space-y-2">
                                <Label className="text-sm">Eligibility For ITC</Label>
                                <Select value={watch('eligibility_itc') || ''} onValueChange={v => setValue('eligibility_itc', v)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select ITC" />
                                    </SelectTrigger>
                                    <SelectPrimitive.Portal>
                                        <SelectContent>
                                            {itcOptions.map(o => (
                                                <SelectItem key={o} value={o}>{o}</SelectItem>
                                            ))}
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
                onSave={handleItemSave}
                onSaveAndClose={handleItemSaveAndClose}
                editItem={editingItem}
            />
        </>
    );
}
