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
import * as SelectPrimitive from '@radix-ui/react-select';
import { useVouchers, LedgerPostingItem } from '@/hooks/useVouchers';
import { useLedgers, Ledger } from '@/hooks/useLedgers';
import { useVoucherPrefixesForType } from '@/hooks/useVoucherPrefixes';

// GST Row type for the matrix
interface GSTRow {
    gst: number;
    interest: number;
    penalty: number;
    fees: number;
    other: number;
}

// Form Schema
const formSchema = z.object({
    doc_prefix: z.string().default('GSTPMT/25-26/'),
    doc_number: z.coerce.number().min(1, 'Required'),
    voucher_date: z.string().min(1, 'Required'),
    bank_ledger_id: z.string().min(1, 'Required'),
    challan_no: z.string().optional(),
    challan_date: z.string().optional(),
    note: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface GSTPaymentDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    summary?: {
        period: { month: number; year: number };
        net: { cgst: number; sgst: number; igst: number; payable: number };
    } | null;
}

export function GSTPaymentDialog({ open, onOpenChange, summary }: GSTPaymentDialogProps) {
    const { createVoucher, isCreating } = useVouchers({ realtime: false });
    const { ledgers } = useLedgers({ realtime: false });

    // GST Matrix State
    const [igstRow, setIgstRow] = useState<GSTRow>({ gst: 0, interest: 0, penalty: 0, fees: 0, other: 0 });
    const [cgstRow, setCgstRow] = useState<GSTRow>({ gst: 0, interest: 0, penalty: 0, fees: 0, other: 0 });
    const [sgstRow, setSgstRow] = useState<GSTRow>({ gst: 0, interest: 0, penalty: 0, fees: 0, other: 0 });
    const [cessRow, setCessRow] = useState<GSTRow>({ gst: 0, interest: 0, penalty: 0, fees: 0, other: 0 });

    // Fetch prefixes from centralized system
    const { prefixes: dbPrefixes, defaultPrefix } = useVoucherPrefixesForType('GST Payment');

    // Format prefixes for dropdown
    // Format prefixes for dropdown
    const prefixes = useMemo(() => {
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
            doc_prefix: 'GSTPMT/25-26/',
            doc_number: 1,
            voucher_date: new Date().toISOString().split('T')[0],
            bank_ledger_id: '',
            challan_no: '',
            challan_date: new Date().toISOString().split('T')[0],
            note: '',
        },
    });

    const watchedPrefix = watch('doc_prefix');

    // Document number is now manually entered by user
    const watchedBankLedgerId = watch('bank_ledger_id');

    // Get bank/cash ledgers
    const bankLedgers = useMemo(() => {
        return ledgers.filter(l =>
            l.group_name === 'Bank Accounts' ||
            l.group_name === 'Cash-in-Hand' ||
            l.name.toLowerCase().includes('bank') ||
            l.name.toLowerCase().includes('cash')
        );
    }, [ledgers]);

    const selectedBankLedger = useMemo(() => {
        return ledgers.find(l => l.id === watchedBankLedgerId);
    }, [ledgers, watchedBankLedgerId]);

    // Calculate row totals
    const getRowTotal = (row: GSTRow) => row.gst + row.interest + row.penalty + row.fees + row.other;

    // Calculate column totals
    const totals = useMemo(() => {
        return {
            gst: igstRow.gst + cgstRow.gst + sgstRow.gst + cessRow.gst,
            interest: igstRow.interest + cgstRow.interest + sgstRow.interest + cessRow.interest,
            penalty: igstRow.penalty + cgstRow.penalty + sgstRow.penalty + cessRow.penalty,
            fees: igstRow.fees + cgstRow.fees + sgstRow.fees + cessRow.fees,
            other: igstRow.other + cgstRow.other + sgstRow.other + cessRow.other,
            total: getRowTotal(igstRow) + getRowTotal(cgstRow) + getRowTotal(sgstRow) + getRowTotal(cessRow),
        };
    }, [igstRow, cgstRow, sgstRow, cessRow]);

    // Reset form when dialog opens
    useEffect(() => {
        if (open) {
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

            const defaultPre = defaultPrefix
                ? `${defaultPrefix.voucher_prefix}${defaultPrefix.prefix_separator}`
                : prefixes[0] || 'GSTPMT/';

            reset({
                doc_prefix: defaultPre,
                doc_number: 1,
                voucher_date: new Date().toISOString().split('T')[0],
                bank_ledger_id: '',
                challan_no: '',
                challan_date: new Date().toISOString().split('T')[0],
                note: summary ? `GST Payment for ${months[summary.period.month - 1]} ${summary.period.year}` : '',
            });

            // Pre-fill from summary if available
            if (summary) {
                setIgstRow({ gst: Math.max(0, summary.net.igst), interest: 0, penalty: 0, fees: 0, other: 0 });
                setCgstRow({ gst: Math.max(0, summary.net.cgst), interest: 0, penalty: 0, fees: 0, other: 0 });
                setSgstRow({ gst: Math.max(0, summary.net.sgst), interest: 0, penalty: 0, fees: 0, other: 0 });
                setCessRow({ gst: 0, interest: 0, penalty: 0, fees: 0, other: 0 });
            } else {
                setIgstRow({ gst: 0, interest: 0, penalty: 0, fees: 0, other: 0 });
                setCgstRow({ gst: 0, interest: 0, penalty: 0, fees: 0, other: 0 });
                setSgstRow({ gst: 0, interest: 0, penalty: 0, fees: 0, other: 0 });
                setCessRow({ gst: 0, interest: 0, penalty: 0, fees: 0, other: 0 });
            }
        }
    }, [open, summary, reset]);

    // Find GST output ledgers
    const findLedger = (name: string, groupName: string) =>
        ledgers.find(l => l.name.toLowerCase().includes(name.toLowerCase()) || l.group_name === groupName)?.id;

    // Submit handler
    const onSubmit = async (data: FormData) => {
        if (totals.gst === 0 && totals.interest === 0 && totals.penalty === 0 && totals.fees === 0 && totals.other === 0) {
            alert('Please enter at least one amount');
            return;
        }

        try {
            // Use manually entered GST payment number
            const voucherNumber = `${data.doc_prefix}${data.doc_number}`;
            const ledgerPostings: LedgerPostingItem[] = [];

            // Debit GST Output accounts (reduce liability)
            if (cgstRow.gst > 0) {
                const cgstLedgerId = findLedger('CGST Output', 'Duties & Taxes');
                if (cgstLedgerId) {
                    ledgerPostings.push({
                        ledger_id: cgstLedgerId,
                        debit_amount: getRowTotal(cgstRow),
                        credit_amount: 0,
                        narration: 'CGST payment',
                    });
                }
            }
            if (sgstRow.gst > 0) {
                const sgstLedgerId = findLedger('SGST Output', 'Duties & Taxes');
                if (sgstLedgerId) {
                    ledgerPostings.push({
                        ledger_id: sgstLedgerId,
                        debit_amount: getRowTotal(sgstRow),
                        credit_amount: 0,
                        narration: 'SGST payment',
                    });
                }
            }
            if (igstRow.gst > 0) {
                const igstLedgerId = findLedger('IGST Output', 'Duties & Taxes');
                if (igstLedgerId) {
                    ledgerPostings.push({
                        ledger_id: igstLedgerId,
                        debit_amount: getRowTotal(igstRow),
                        credit_amount: 0,
                        narration: 'IGST payment',
                    });
                }
            }
            if (cessRow.gst > 0) {
                const cessLedgerId = findLedger('CESS', 'Duties & Taxes');
                if (cessLedgerId) {
                    ledgerPostings.push({
                        ledger_id: cessLedgerId,
                        debit_amount: getRowTotal(cessRow),
                        credit_amount: 0,
                        narration: 'CESS payment',
                    });
                }
            }

            // Credit Bank/Cash (reduce assets)
            if (data.bank_ledger_id) {
                ledgerPostings.push({
                    ledger_id: data.bank_ledger_id,
                    debit_amount: 0,
                    credit_amount: totals.total,
                    narration: 'GST payment',
                });
            }

            await createVoucher.mutateAsync({
                voucher: {
                    voucher_type: 'gst_payment',
                    voucher_number: `${data.doc_prefix}${data.doc_number}`,
                    voucher_date: data.voucher_date,
                    reference_number: data.challan_no,
                    narration: data.note,
                    cgst_amount: getRowTotal(cgstRow),
                    sgst_amount: getRowTotal(sgstRow),
                    igst_amount: getRowTotal(igstRow),
                    total_tax: totals.total,
                    total_amount: totals.total,
                    status: 'confirmed',
                },
                items: [],
                ledgerPostings,
            });

            onOpenChange(false);
        } catch (error) {
            console.error('Error creating GST payment:', error);
        }
    };

    const formatCurrency = (value: number) =>
        new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 2,
        }).format(value);

    // Helper to update row values
    const updateRow = (
        setter: React.Dispatch<React.SetStateAction<GSTRow>>,
        field: keyof GSTRow,
        value: number
    ) => {
        setter(prev => ({ ...prev, [field]: value }));
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
                <DialogHeader className="bg-primary text-primary-foreground -mx-6 -mt-6 px-6 py-4 rounded-t-lg">
                    <DialogTitle className="text-lg font-semibold">
                        Add Voucher
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 pt-2">
                    {/* Row 1: Voucher Details */}
                    <div className="grid grid-cols-12 gap-4">
                        {/* Voucher No. */}
                        <div className="col-span-4 space-y-2">
                            <Label className="text-sm">
                                Voucher No. <span className="text-destructive">*</span>
                            </Label>
                            <div className="flex gap-1">
                                <Select value={watchedPrefix} onValueChange={v => setValue('doc_prefix', v)}>
                                    <SelectTrigger className="flex-1 text-xs">
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
                                    className="w-16 text-xs"
                                />
                            </div>
                        </div>

                        {/* Voucher Date */}
                        <div className="col-span-4 space-y-2">
                            <Label className="text-sm">
                                Voucher Date <span className="text-destructive">*</span>
                            </Label>
                            <Controller
                                name="voucher_date"
                                control={control}
                                render={({ field }) => (
                                    <DatePicker
                                        value={field.value}
                                        onChange={(date) => field.onChange(date ? format(date, 'yyyy-MM-dd') : '')}
                                        className={errors.voucher_date ? 'border-destructive' : ''}
                                    />
                                )}
                            />
                        </div>

                        {/* Bank/Cash Account */}
                        <div className="col-span-4 space-y-2">
                            <div className="flex items-center justify-between">
                                <Label className="text-sm">
                                    Bank/Cash Account <span className="text-destructive">*</span>
                                </Label>
                                <span className="text-xs text-muted-foreground">
                                    Balance: {selectedBankLedger ? formatCurrency(0) : '0'}
                                </span>
                            </div>
                            <Select value={watchedBankLedgerId} onValueChange={v => setValue('bank_ledger_id', v)}>
                                <SelectTrigger className={`text-xs ${errors.bank_ledger_id ? 'border-destructive' : ''}`}>
                                    <SelectValue placeholder="Select Ledger" />
                                </SelectTrigger>
                                <SelectPrimitive.Portal>
                                    <SelectContent>
                                        {bankLedgers.map(l => (
                                            <SelectItem key={l.id} value={l.id} className="text-xs">{l.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </SelectPrimitive.Portal>
                            </Select>
                        </div>
                    </div>

                    {/* Row 2: Challan Details */}
                    <div className="grid grid-cols-12 gap-4">
                        {/* CHL. No. */}
                        <div className="col-span-4 space-y-2">
                            <Label className="text-sm">CHL. No.</Label>
                            <Input
                                {...register('challan_no')}
                                placeholder="CHL. No."
                                className="text-xs"
                            />
                        </div>

                        {/* CHL. Date */}
                        <div className="col-span-4 space-y-2">
                            <Label className="text-sm">CHL. Date</Label>
                            <Controller
                                name="challan_date"
                                control={control}
                                render={({ field }) => (
                                    <DatePicker
                                        value={field.value}
                                        onChange={(date) => field.onChange(date ? format(date, 'yyyy-MM-dd') : '')}
                                        className="text-xs"
                                    />
                                )}
                            />
                        </div>

                        {/* Note */}
                        <div className="col-span-4 space-y-2">
                            <Label className="text-sm">Note</Label>
                            <Input
                                {...register('note')}
                                placeholder="Note"
                                className="text-xs"
                            />
                        </div>
                    </div>

                    {/* GST Payment Matrix */}
                    <div className="border rounded-lg overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-primary hover:bg-primary">
                                    <TableHead className="text-primary-foreground text-xs w-24">GST Type</TableHead>
                                    <TableHead className="text-primary-foreground text-xs text-right">GST</TableHead>
                                    <TableHead className="text-primary-foreground text-xs text-right">Interest</TableHead>
                                    <TableHead className="text-primary-foreground text-xs text-right">Penalty</TableHead>
                                    <TableHead className="text-primary-foreground text-xs text-right">Fees</TableHead>
                                    <TableHead className="text-primary-foreground text-xs text-right">Other</TableHead>
                                    <TableHead className="text-primary-foreground text-xs text-right">Total</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {/* IGST Row */}
                                <TableRow className="hover:bg-muted/50">
                                    <TableCell className="text-xs font-medium">IGST</TableCell>
                                    <TableCell>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            value={igstRow.gst || ''}
                                            onChange={e => updateRow(setIgstRow, 'gst', parseFloat(e.target.value) || 0)}
                                            className="h-8 text-xs text-right w-20"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            value={igstRow.interest || ''}
                                            onChange={e => updateRow(setIgstRow, 'interest', parseFloat(e.target.value) || 0)}
                                            className="h-8 text-xs text-right w-20"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            value={igstRow.penalty || ''}
                                            onChange={e => updateRow(setIgstRow, 'penalty', parseFloat(e.target.value) || 0)}
                                            className="h-8 text-xs text-right w-20"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            value={igstRow.fees || ''}
                                            onChange={e => updateRow(setIgstRow, 'fees', parseFloat(e.target.value) || 0)}
                                            className="h-8 text-xs text-right w-20"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            value={igstRow.other || ''}
                                            onChange={e => updateRow(setIgstRow, 'other', parseFloat(e.target.value) || 0)}
                                            className="h-8 text-xs text-right w-20"
                                        />
                                    </TableCell>
                                    <TableCell className="text-xs text-right font-medium">{formatCurrency(getRowTotal(igstRow))}</TableCell>
                                </TableRow>

                                {/* CGST Row */}
                                <TableRow className="hover:bg-muted/50">
                                    <TableCell className="text-xs font-medium">CGST</TableCell>
                                    <TableCell>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            value={cgstRow.gst || ''}
                                            onChange={e => updateRow(setCgstRow, 'gst', parseFloat(e.target.value) || 0)}
                                            className="h-8 text-xs text-right w-20"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            value={cgstRow.interest || ''}
                                            onChange={e => updateRow(setCgstRow, 'interest', parseFloat(e.target.value) || 0)}
                                            className="h-8 text-xs text-right w-20"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            value={cgstRow.penalty || ''}
                                            onChange={e => updateRow(setCgstRow, 'penalty', parseFloat(e.target.value) || 0)}
                                            className="h-8 text-xs text-right w-20"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            value={cgstRow.fees || ''}
                                            onChange={e => updateRow(setCgstRow, 'fees', parseFloat(e.target.value) || 0)}
                                            className="h-8 text-xs text-right w-20"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            value={cgstRow.other || ''}
                                            onChange={e => updateRow(setCgstRow, 'other', parseFloat(e.target.value) || 0)}
                                            className="h-8 text-xs text-right w-20"
                                        />
                                    </TableCell>
                                    <TableCell className="text-xs text-right font-medium">{formatCurrency(getRowTotal(cgstRow))}</TableCell>
                                </TableRow>

                                {/* SGST Row */}
                                <TableRow className="hover:bg-muted/50">
                                    <TableCell className="text-xs font-medium">SGST</TableCell>
                                    <TableCell>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            value={sgstRow.gst || ''}
                                            onChange={e => updateRow(setSgstRow, 'gst', parseFloat(e.target.value) || 0)}
                                            className="h-8 text-xs text-right w-20"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            value={sgstRow.interest || ''}
                                            onChange={e => updateRow(setSgstRow, 'interest', parseFloat(e.target.value) || 0)}
                                            className="h-8 text-xs text-right w-20"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            value={sgstRow.penalty || ''}
                                            onChange={e => updateRow(setSgstRow, 'penalty', parseFloat(e.target.value) || 0)}
                                            className="h-8 text-xs text-right w-20"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            value={sgstRow.fees || ''}
                                            onChange={e => updateRow(setSgstRow, 'fees', parseFloat(e.target.value) || 0)}
                                            className="h-8 text-xs text-right w-20"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            value={sgstRow.other || ''}
                                            onChange={e => updateRow(setSgstRow, 'other', parseFloat(e.target.value) || 0)}
                                            className="h-8 text-xs text-right w-20"
                                        />
                                    </TableCell>
                                    <TableCell className="text-xs text-right font-medium">{formatCurrency(getRowTotal(sgstRow))}</TableCell>
                                </TableRow>

                                {/* CESS Row */}
                                <TableRow className="hover:bg-muted/50">
                                    <TableCell className="text-xs font-medium">CESS</TableCell>
                                    <TableCell>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            value={cessRow.gst || ''}
                                            onChange={e => updateRow(setCessRow, 'gst', parseFloat(e.target.value) || 0)}
                                            className="h-8 text-xs text-right w-20"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            value={cessRow.interest || ''}
                                            onChange={e => updateRow(setCessRow, 'interest', parseFloat(e.target.value) || 0)}
                                            className="h-8 text-xs text-right w-20"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            value={cessRow.penalty || ''}
                                            onChange={e => updateRow(setCessRow, 'penalty', parseFloat(e.target.value) || 0)}
                                            className="h-8 text-xs text-right w-20"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            value={cessRow.fees || ''}
                                            onChange={e => updateRow(setCessRow, 'fees', parseFloat(e.target.value) || 0)}
                                            className="h-8 text-xs text-right w-20"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            value={cessRow.other || ''}
                                            onChange={e => updateRow(setCessRow, 'other', parseFloat(e.target.value) || 0)}
                                            className="h-8 text-xs text-right w-20"
                                        />
                                    </TableCell>
                                    <TableCell className="text-xs text-right font-medium">{formatCurrency(getRowTotal(cessRow))}</TableCell>
                                </TableRow>

                                {/* Total Row */}
                                <TableRow className="bg-muted/50 font-semibold">
                                    <TableCell className="text-xs font-bold">Total</TableCell>
                                    <TableCell className="text-xs text-right">{formatCurrency(totals.gst)}</TableCell>
                                    <TableCell className="text-xs text-right">{formatCurrency(totals.interest)}</TableCell>
                                    <TableCell className="text-xs text-right">{formatCurrency(totals.penalty)}</TableCell>
                                    <TableCell className="text-xs text-right">{formatCurrency(totals.fees)}</TableCell>
                                    <TableCell className="text-xs text-right">{formatCurrency(totals.other)}</TableCell>
                                    <TableCell className="text-xs text-right font-bold text-primary">{formatCurrency(totals.total)}</TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
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
                            disabled={isCreating || totals.total <= 0}
                            className="bg-green-600 hover:bg-green-700"
                        >
                            {isCreating ? 'Recording...' : '✓ Save'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
