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
import * as SelectPrimitive from '@radix-ui/react-select';
import { useVouchers, LedgerPostingItem, VoucherInsert } from '@/hooks/useVouchers';
import { useParties } from '@/hooks/useParties';
import { useLedgers, Ledger } from '@/hooks/useLedgers';
import { useVoucherPrefixesForType } from '@/hooks/useVoucherPrefixes';
import { SearchablePartySelect } from '@/components/shared/SearchablePartySelect';

// Ledger Entry type
interface LedgerEntry {
    ledger_id: string;
    ledger_name: string;
    hsn_code: string;
    uom: string;
    price: number;
    discount_percent: number;
    cgst_percent: number;
    sgst_percent: number;
    amount: number;
    cgst_amount: number;
    sgst_amount: number;
    remark: string;
}

// Form Schema
const formSchema = z.object({
    doc_prefix: z.string().default('EXP/25-26/'),
    doc_number: z.coerce.number().min(1, 'Required'),
    doc_date: z.string().min(1, 'Required'),
    party_id: z.string().min(1, 'Required'),
    gst_type: z.string().min(1, 'Required'),
    memo_type: z.string().default('Debit'),
    eligibility_itc: z.string().min(1, 'Required'),
    po_challan_no: z.string().optional(),
    apply_round_off: z.boolean().default(true),
    notes: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface GSTExpenseDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function GSTExpenseDialog({ open, onOpenChange }: GSTExpenseDialogProps) {
    const { createVoucher, isCreating } = useVouchers({ realtime: false });
    const { parties } = useParties({ realtime: true });
    const { ledgers } = useLedgers({ realtime: true });

    // Local State
    const [entries, setEntries] = useState<LedgerEntry[]>([]);
    const [isAddingEntry, setIsAddingEntry] = useState(false);
    const [editingIndex, setEditingIndex] = useState<number>(-1);

    // Entry form state
    const [entryForm, setEntryForm] = useState<Partial<LedgerEntry>>({
        ledger_id: '',
        ledger_name: '',
        hsn_code: '',
        uom: 'PCS',
        price: 0,
        discount_percent: 0,
        cgst_percent: 9,
        sgst_percent: 9,
        remark: '',
    });

    // Fetch prefixes from centralized system
    const { prefixes: dbPrefixes, defaultPrefix } = useVoucherPrefixesForType('GST Expense');

    // Format prefixes for dropdown
    // Format prefixes for dropdown
    const prefixes = useMemo(() => {
        return dbPrefixes.map(p => `${p.voucher_prefix}${p.prefix_separator}`);
    }, [dbPrefixes]);
    const gstTypes = ['GST Local Purchase', 'GST Inter-State Purchase', 'GST Imports'];
    const memoTypes = ['Debit', 'Credit'];
    const itcTypes = ['Input', 'Input Services', 'Capital Goods', 'Ineligible'];

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
            doc_prefix: 'EXP/25-26/',
            doc_number: 1,
            doc_date: new Date().toISOString().split('T')[0],
            party_id: '',
            gst_type: 'GST Local Purchase',
            memo_type: 'Debit',
            eligibility_itc: 'Input',
            po_challan_no: '',
            apply_round_off: true,
            notes: '',
        },
    });

    const watchedPartyId = watch('party_id');
    const watchedGstType = watch('gst_type');
    const watchedApplyRoundOff = watch('apply_round_off');
    const watchedPrefix = watch('doc_prefix');

    // Document number is now manually entered by user
    const watchedDocNumber = watch('doc_number');

    const selectedParty = useMemo(() => {
        return parties.find(p => p.id === watchedPartyId);
    }, [parties, watchedPartyId]);

    const isInterState = watchedGstType === 'GST Inter-State Purchase' || watchedGstType === 'GST Imports';

    // Group ledgers by group_name for dropdown
    const groupedLedgers = useMemo(() => {
        return ledgers.reduce((groups, ledger) => {
            const group = ledger.group_name;
            if (!groups[group]) groups[group] = [];
            groups[group].push(ledger);
            return groups;
        }, {} as Record<string, Ledger[]>);
    }, [ledgers]);

    // Calculate totals
    const totals = useMemo(() => {
        let subtotal = 0;
        let totalCGST = 0;
        let totalSGST = 0;
        let totalIGST = 0;

        entries.forEach((entry) => {
            subtotal += entry.amount;
            if (isInterState) {
                totalIGST += entry.cgst_amount + entry.sgst_amount;
            } else {
                totalCGST += entry.cgst_amount;
                totalSGST += entry.sgst_amount;
            }
        });

        const beforeRoundOff = subtotal + totalCGST + totalSGST + totalIGST;
        const roundOff = watchedApplyRoundOff ? Math.round(beforeRoundOff) - beforeRoundOff : 0;
        const netAmount = beforeRoundOff + roundOff;

        return { subtotal, totalCGST, totalSGST, totalIGST, roundOff, netAmount };
    }, [entries, watchedApplyRoundOff, isInterState]);

    // Reset form when dialog opens
    useEffect(() => {
        if (open) {
            const defaultPre = defaultPrefix
                ? `${defaultPrefix.voucher_prefix}${defaultPrefix.prefix_separator}`
                : prefixes[0] || 'EXP/';

            reset({
                doc_prefix: defaultPre,
                doc_number: 1,
                doc_date: new Date().toISOString().split('T')[0],
                party_id: '',
                gst_type: 'GST Local Purchase',
                memo_type: 'Debit',
                eligibility_itc: 'Input',
                po_challan_no: '',
                apply_round_off: true,
                notes: '',
            });
            setEntries([]);
            setIsAddingEntry(false);
            setEditingIndex(-1);
        }
    }, [open, reset, defaultPrefix, prefixes]);

    // Add/Update entry
    const handleSaveEntry = () => {
        if (!entryForm.ledger_id || !entryForm.price) return;

        const ledger = ledgers.find(l => l.id === entryForm.ledger_id);
        const amount = entryForm.price || 0;
        const discountAmt = amount * ((entryForm.discount_percent || 0) / 100);
        const taxableAmt = amount - discountAmt;
        const cgstAmt = isInterState ? 0 : taxableAmt * ((entryForm.cgst_percent || 0) / 100);
        const sgstAmt = isInterState ? 0 : taxableAmt * ((entryForm.sgst_percent || 0) / 100);

        const newEntry: LedgerEntry = {
            ledger_id: entryForm.ledger_id!,
            ledger_name: ledger?.name || entryForm.ledger_name || '',
            hsn_code: entryForm.hsn_code || '',
            uom: entryForm.uom || 'PCS',
            price: entryForm.price || 0,
            discount_percent: entryForm.discount_percent || 0,
            cgst_percent: entryForm.cgst_percent || 0,
            sgst_percent: entryForm.sgst_percent || 0,
            amount: taxableAmt,
            cgst_amount: cgstAmt,
            sgst_amount: sgstAmt,
            remark: entryForm.remark || '',
        };

        if (editingIndex >= 0) {
            const updated = [...entries];
            updated[editingIndex] = newEntry;
            setEntries(updated);
            setEditingIndex(-1);
        } else {
            setEntries([...entries, newEntry]);
        }

        // Reset entry form
        setEntryForm({
            ledger_id: '',
            ledger_name: '',
            hsn_code: '',
            uom: 'PCS',
            price: 0,
            discount_percent: 0,
            cgst_percent: 9,
            sgst_percent: 9,
            remark: '',
        });
        setIsAddingEntry(false);
    };

    const handleEditEntry = (index: number) => {
        const entry = entries[index];
        setEntryForm({
            ledger_id: entry.ledger_id,
            ledger_name: entry.ledger_name,
            hsn_code: entry.hsn_code,
            uom: entry.uom,
            price: entry.price,
            discount_percent: entry.discount_percent,
            cgst_percent: entry.cgst_percent,
            sgst_percent: entry.sgst_percent,
            remark: entry.remark,
        });
        setEditingIndex(index);
        setIsAddingEntry(true);
    };

    const handleDeleteEntry = (index: number) => {
        setEntries(entries.filter((_, i) => i !== index));
    };

    // Submit handler
    const onSubmit = async (data: FormData) => {
        if (entries.length === 0) {
            alert('Please add at least one entry');
            return;
        }

        try {
            // Use manually entered expense document number
            const voucherNumber = `${data.doc_prefix}${data.doc_number}`;
            const party = parties.find(p => p.id === data.party_id);

            // Build ledger postings - for expense, we debit expense accounts
            const ledgerPostings: LedgerPostingItem[] = entries.map(entry => ({
                ledger_id: entry.ledger_id,
                debit_amount: entry.amount + entry.cgst_amount + entry.sgst_amount,
                credit_amount: 0,
                narration: `GST Expense - ${entry.ledger_name}`,
            }));

            // Credit party account (payable)
            const partyLedger = ledgers.find(l => l.party_id === data.party_id);
            if (partyLedger) {
                ledgerPostings.push({
                    ledger_id: partyLedger.id,
                    debit_amount: 0,
                    credit_amount: totals.netAmount,
                    narration: `GST Expense from ${party?.name}`,
                });
            }

            // Map to voucher object with required fields
            const voucherPayload = {
                voucher_type: 'purchase_invoice', // Using 'purchase_invoice' to satisfy type
                voucher_date: data.doc_date,
                party_id: data.party_id,
                party_name: party?.name,
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
                // Map Invoice Number to reference_number as this is a Purchase Invoice (External Ref)
                voucher_number: `${data.doc_prefix}${data.doc_number}`,
                reference_number: `${data.doc_prefix}${data.doc_number}`,
                // Pass other fields via cast to any if backend logic supports them
                gst_type: data.gst_type,
                eligibility_itc: data.eligibility_itc,
            } as any;

            await createVoucher.mutateAsync({
                voucher: voucherPayload,
                items: [],
                ledgerPostings,
            });

            onOpenChange(false);
        } catch (error) {
            console.error('Error creating GST expense:', error);
        }
    };

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 2,
        }).format(val);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[1000px] max-h-[90vh] overflow-y-auto">
                <DialogHeader className="bg-primary text-primary-foreground -mx-6 -mt-6 px-6 py-4 rounded-t-lg">
                    <DialogTitle className="text-lg font-semibold">
                        GST Expense
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 pt-2">
                    {/* Row 1: Invoice Details */}
                    <div className="grid grid-cols-12 gap-4">
                        {/* Inv. No. */}
                        <div className="col-span-2 space-y-2">
                            <Label className="text-sm">Inv. No.</Label>
                            <div className="flex gap-1">
                                <Select value={watchedPrefix} onValueChange={v => setValue('doc_prefix', v)}>
                                    <SelectTrigger className="w-24 text-xs">
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
                                <Input
                                    type="number"
                                    {...register('doc_number')}
                                    className="w-14 text-xs"
                                />
                            </div>
                        </div>

                        {/* Inv. Date */}
                        <div className="col-span-2 space-y-2">
                            <Label className="text-sm">
                                Inv. Date <span className="text-destructive">*</span>
                            </Label>
                            <Controller
                                name="doc_date"
                                control={control}
                                render={({ field }) => (
                                    <DatePicker
                                        value={field.value}
                                        onChange={(date) => field.onChange(date ? format(date, 'yyyy-MM-dd') : '')}
                                        className={errors.doc_date ? 'border-destructive' : ''}
                                    />
                                )}
                            />
                        </div>

                        {/* Party Name */}
                        <div className="col-span-5 space-y-2">
                            <div className="flex items-center justify-between">
                                <Label className="text-sm">
                                    Party Name <span className="text-destructive">*</span>
                                </Label>
                                <a href="#" className="text-xs text-primary hover:underline">+ Add New</a>
                            </div>
                            <SearchablePartySelect
                                value={watchedPartyId}
                                onChange={(v) => setValue('party_id', v)}
                                partyType="supplier"
                                placeholder="Select Party"
                                error={!!errors.party_id}
                            />
                            {selectedParty && (
                                <div className="flex justify-between text-xs text-muted-foreground">
                                    <span>Cl. Balance: <span className="font-medium">{formatCurrency(0)}</span></span>
                                    <span>T.O.: <span className="font-medium">0</span></span>
                                </div>
                            )}
                        </div>

                        {/* GST NO. */}
                        <div className="col-span-3 space-y-2">
                            <Label className="text-sm">GST NO.</Label>
                            <Input
                                value={selectedParty?.gst_number || ''}
                                disabled
                                placeholder="Select GST No."
                                className="bg-muted text-xs"
                            />
                        </div>
                    </div>

                    {/* Row 2: Transaction Details */}
                    <div className="grid grid-cols-12 gap-4">
                        {/* Memo Type */}
                        <div className="col-span-2 space-y-2">
                            <Label className="text-sm">Memo Type</Label>
                            <Select value={watch('memo_type')} onValueChange={v => setValue('memo_type', v)}>
                                <SelectTrigger className="text-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectPrimitive.Portal>
                                    <SelectContent>
                                        {memoTypes.map(t => (
                                            <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </SelectPrimitive.Portal>
                            </Select>
                        </div>

                        {/* GST Type */}
                        <div className="col-span-3 space-y-2">
                            <Label className="text-sm">
                                GST Type <span className="text-destructive">*</span>
                            </Label>
                            <Select value={watchedGstType} onValueChange={v => setValue('gst_type', v)}>
                                <SelectTrigger className="text-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectPrimitive.Portal>
                                    <SelectContent>
                                        {gstTypes.map(t => (
                                            <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </SelectPrimitive.Portal>
                            </Select>
                        </div>

                        {/* Eligibility For ITC */}
                        <div className="col-span-2 space-y-2">
                            <Label className="text-sm">
                                Eligibility For ITC <span className="text-destructive">*</span>
                            </Label>
                            <Select value={watch('eligibility_itc')} onValueChange={v => setValue('eligibility_itc', v)}>
                                <SelectTrigger className="text-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectPrimitive.Portal>
                                    <SelectContent>
                                        {itcTypes.map(t => (
                                            <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </SelectPrimitive.Portal>
                            </Select>
                        </div>

                        {/* PO. No./Challan No. */}
                        <div className="col-span-3 space-y-2">
                            <Label className="text-sm">PO. No./Challan No.</Label>
                            <Input
                                {...register('po_challan_no')}
                                placeholder="Enter PO. No."
                                className="text-xs"
                            />
                        </div>

                        {/* Apply Round Off */}
                        <div className="col-span-2 space-y-2">
                            <Label className="text-sm">Apply Round Off</Label>
                            <Select
                                value={watchedApplyRoundOff ? 'Yes' : 'No'}
                                onValueChange={v => setValue('apply_round_off', v === 'Yes')}
                            >
                                <SelectTrigger className="text-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectPrimitive.Portal>
                                    <SelectContent>
                                        <SelectItem value="Yes" className="text-xs">Yes</SelectItem>
                                        <SelectItem value="No" className="text-xs">No</SelectItem>
                                    </SelectContent>
                                </SelectPrimitive.Portal>
                            </Select>
                        </div>
                    </div>

                    {/* Ledger Details Table */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <Label className="text-sm font-medium">Ledger Details :</Label>
                            <Button
                                type="button"
                                size="sm"
                                onClick={() => setIsAddingEntry(true)}
                                className="text-xs"
                            >
                                <Plus className="h-4 w-4 mr-1" /> Add Ledger
                            </Button>
                        </div>

                        <div className="border rounded-lg overflow-hidden">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-primary hover:bg-primary">
                                        <TableHead className="text-primary-foreground text-xs w-10">#</TableHead>
                                        <TableHead className="text-primary-foreground text-xs">Ledger Name</TableHead>
                                        <TableHead className="text-primary-foreground text-xs">HSN Code</TableHead>
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
                                    {entries.length === 0 && !isAddingEntry ? (
                                        <TableRow>
                                            <TableCell colSpan={11} className="text-center text-sm text-muted-foreground py-8">
                                                No data available in table
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        entries.map((entry, index) => (
                                            <TableRow key={index} className="hover:bg-muted/50">
                                                <TableCell className="text-xs">{index + 1}</TableCell>
                                                <TableCell className="text-xs">{entry.ledger_name}</TableCell>
                                                <TableCell className="text-xs">{entry.hsn_code || '-'}</TableCell>
                                                <TableCell className="text-xs">{entry.uom}</TableCell>
                                                <TableCell className="text-xs text-right">{formatCurrency(entry.price)}</TableCell>
                                                <TableCell className="text-xs text-right">{entry.discount_percent}%</TableCell>
                                                <TableCell className="text-xs text-right">{formatCurrency(entry.cgst_amount)}</TableCell>
                                                <TableCell className="text-xs text-right">{formatCurrency(entry.sgst_amount)}</TableCell>
                                                <TableCell className="text-xs text-right">{formatCurrency(entry.amount)}</TableCell>
                                                <TableCell className="text-xs">{entry.remark || '-'}</TableCell>
                                                <TableCell>
                                                    <div className="flex gap-1">
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-7 w-7"
                                                            onClick={() => handleEditEntry(index)}
                                                        >
                                                            <Edit2 className="h-3 w-3" />
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-7 w-7 text-destructive"
                                                            onClick={() => handleDeleteEntry(index)}
                                                        >
                                                            <Trash2 className="h-3 w-3" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}

                                    {/* Inline Add/Edit Row */}
                                    {isAddingEntry && (
                                        <TableRow className="bg-muted/30">
                                            <TableCell className="text-xs">{editingIndex >= 0 ? editingIndex + 1 : entries.length + 1}</TableCell>
                                            <TableCell>
                                                <Select
                                                    value={entryForm.ledger_id}
                                                    onValueChange={v => {
                                                        const led = ledgers.find(l => l.id === v);
                                                        setEntryForm({ ...entryForm, ledger_id: v, ledger_name: led?.name || '' });
                                                    }}
                                                >
                                                    <SelectTrigger className="h-8 text-xs">
                                                        <SelectValue placeholder="Select Ledger" />
                                                    </SelectTrigger>
                                                    <SelectPrimitive.Portal>
                                                        <SelectContent className="max-h-60">
                                                            {Object.entries(groupedLedgers).map(([group, leds]) => (
                                                                <div key={group}>
                                                                    <div className="px-2 py-1 text-xs font-semibold text-muted-foreground bg-muted">{group}</div>
                                                                    {leds.map(l => (
                                                                        <SelectItem key={l.id} value={l.id} className="text-xs">{l.name}</SelectItem>
                                                                    ))}
                                                                </div>
                                                            ))}
                                                        </SelectContent>
                                                    </SelectPrimitive.Portal>
                                                </Select>
                                            </TableCell>
                                            <TableCell>
                                                <Input
                                                    value={entryForm.hsn_code || ''}
                                                    onChange={e => setEntryForm({ ...entryForm, hsn_code: e.target.value })}
                                                    className="h-8 text-xs w-20"
                                                    placeholder="HSN"
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Input
                                                    value={entryForm.uom || ''}
                                                    onChange={e => setEntryForm({ ...entryForm, uom: e.target.value })}
                                                    className="h-8 text-xs w-16"
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Input
                                                    type="number"
                                                    value={entryForm.price || ''}
                                                    onChange={e => setEntryForm({ ...entryForm, price: parseFloat(e.target.value) || 0 })}
                                                    className="h-8 text-xs w-20 text-right"
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Input
                                                    type="number"
                                                    value={entryForm.discount_percent || ''}
                                                    onChange={e => setEntryForm({ ...entryForm, discount_percent: parseFloat(e.target.value) || 0 })}
                                                    className="h-8 text-xs w-14 text-right"
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Input
                                                    type="number"
                                                    value={entryForm.cgst_percent || ''}
                                                    onChange={e => setEntryForm({ ...entryForm, cgst_percent: parseFloat(e.target.value) || 0 })}
                                                    className="h-8 text-xs w-14 text-right"
                                                    disabled={isInterState}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Input
                                                    type="number"
                                                    value={entryForm.sgst_percent || ''}
                                                    onChange={e => setEntryForm({ ...entryForm, sgst_percent: parseFloat(e.target.value) || 0 })}
                                                    className="h-8 text-xs w-14 text-right"
                                                    disabled={isInterState}
                                                />
                                            </TableCell>
                                            <TableCell className="text-xs text-right">-</TableCell>
                                            <TableCell>
                                                <Input
                                                    value={entryForm.remark || ''}
                                                    onChange={e => setEntryForm({ ...entryForm, remark: e.target.value })}
                                                    className="h-8 text-xs"
                                                    placeholder="Remark"
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex gap-1">
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        className="h-7 px-2"
                                                        onClick={handleSaveEntry}
                                                    >
                                                        ✓
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-7 px-2"
                                                        onClick={() => {
                                                            setIsAddingEntry(false);
                                                            setEditingIndex(-1);
                                                        }}
                                                    >
                                                        ✕
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )}

                                    {/* Total Row */}
                                    {entries.length > 0 && (
                                        <TableRow className="bg-muted/50 font-semibold">
                                            <TableCell colSpan={8} className="text-right text-xs">Total</TableCell>
                                            <TableCell className="text-right text-xs">
                                                {formatCurrency(entries.reduce((sum, e) => sum + e.amount, 0))}
                                            </TableCell>
                                            <TableCell colSpan={2}></TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </div>

                    {/* Description Summary */}
                    <div className="space-y-2">
                        <div className="bg-primary text-primary-foreground px-3 py-2 rounded-lg text-xs font-semibold">
                            Description
                        </div>
                        <div className="grid grid-cols-4 gap-2 text-xs">
                            <div className="col-span-1 text-muted-foreground">Percentage</div>
                            <div className="col-span-1 text-muted-foreground text-right">Amount</div>
                            <div className="col-span-2 text-muted-foreground text-right">Net Amount</div>

                            <div className="col-span-1 py-1 border-b text-primary font-medium">Sub Total</div>
                            <div className="col-span-1 py-1 border-b text-right">-</div>
                            <div className="col-span-2 py-1 border-b text-right font-medium">{formatCurrency(totals.subtotal)}</div>

                            <div className="col-span-1 py-1 border-b text-destructive">CGST</div>
                            <div className="col-span-1 py-1 border-b text-right">-</div>
                            <div className="col-span-2 py-1 border-b text-right">{formatCurrency(totals.totalCGST)}</div>

                            <div className="col-span-1 py-1 border-b text-destructive">SGST</div>
                            <div className="col-span-1 py-1 border-b text-right">-</div>
                            <div className="col-span-2 py-1 border-b text-right">{formatCurrency(totals.totalSGST)}</div>

                            <div className="col-span-1 py-1 border-b text-yellow-600">ROUNDED OFF</div>
                            <div className="col-span-1 py-1 border-b text-right">-</div>
                            <div className="col-span-2 py-1 border-b text-right">{formatCurrency(totals.roundOff)}</div>

                            <div className="col-span-2 bg-primary text-primary-foreground px-2 py-2 rounded font-semibold">
                                Net. Amount
                            </div>
                            <div className="col-span-2 bg-primary text-primary-foreground px-2 py-2 rounded text-right font-bold">
                                {formatCurrency(totals.netAmount)}
                            </div>
                        </div>
                    </div>

                    {/* Remark */}
                    <div className="space-y-2">
                        <Label className="text-sm">Remark</Label>
                        <Textarea
                            {...register('notes')}
                            placeholder="Remark"
                            rows={2}
                            className="text-xs"
                        />
                    </div>

                    {/* Footer */}
                    <DialogFooter className="gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                        >
                            ✕ Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={isCreating || entries.length === 0}
                            className="bg-green-600 hover:bg-green-700"
                        >
                            {isCreating ? 'Saving...' : '✓ Save'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
