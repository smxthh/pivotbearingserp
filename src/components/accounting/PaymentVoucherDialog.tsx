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
import * as SelectPrimitive from '@radix-ui/react-select';
import { useVouchers, LedgerPostingItem } from '@/hooks/useVouchers';
import { useLedgers } from '@/hooks/useLedgers';
import { useParties } from '@/hooks/useParties';
import { useVoucherPrefixesForType } from '@/hooks/useVoucherPrefixes';
import { SearchablePartySelect } from '@/components/shared/SearchablePartySelect';

// Form schema
const formSchema = z.object({
    doc_prefix: z.string().default('RV/25-26/'),
    doc_number: z.coerce.number().min(1, 'Required'),
    voucher_date: z.string().min(1, 'Date is required'),
    entry_type: z.enum(['Receive', 'Pay']).default('Receive'),
    party_id: z.string().min(1, 'Party is required'),
    bank_ledger_id: z.string().min(1, 'Bank/Cash account is required'),
    amount: z.coerce.number().min(0.01, 'Amount must be greater than 0'),
    kasar_amount: z.coerce.number().min(0).default(0),
    payment_mode: z.string().min(1, 'Payment mode is required'),
    ref_no: z.string().optional(),
    ref_date: z.string().optional(),
    note: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface PaymentVoucherDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    voucherType?: 'payment' | 'receipt';
}

export function PaymentVoucherDialog({ open, onOpenChange, voucherType = 'receipt' }: PaymentVoucherDialogProps) {
    const { createVoucher, isCreating } = useVouchers({ realtime: false });
    const { parties } = useParties({ realtime: false });
    const { ledgers } = useLedgers({ realtime: false });

    // Determine voucher type name for prefix fetching
    const voucherTypeName = voucherType === 'receipt' ? 'Receipt Voucher' : 'Payment Voucher';

    // Fetch prefixes from centralized system
    const { prefixes: dbPrefixes, defaultPrefix } = useVoucherPrefixesForType(voucherTypeName);

    // Format prefixes for dropdown
    // Format prefixes for dropdown
    const prefixes = useMemo(() => {
        return dbPrefixes.map(p => `${p.voucher_prefix}${p.prefix_separator}`);
    }, [dbPrefixes]);

    const paymentModes = [
        { value: 'cash', label: 'Cash' },
        { value: 'bank_transfer', label: 'Bank Transfer' },
        { value: 'cheque', label: 'Cheque' },
        { value: 'upi', label: 'UPI' },
        { value: 'neft', label: 'NEFT/RTGS' },
    ];

    const {
        register,
        control,
        handleSubmit,
        watch,
        reset,
        setValue,
        formState: { errors },
    } = useForm<FormData>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            doc_prefix: voucherType === 'receipt' ? 'RV/25-26/' : 'PV/25-26/',
            doc_number: 1,
            voucher_date: new Date().toISOString().split('T')[0],
            entry_type: voucherType === 'receipt' ? 'Receive' : 'Pay',
            party_id: '',
            bank_ledger_id: '',
            amount: 0,
            kasar_amount: 0,
            payment_mode: '',
            ref_no: '',
            ref_date: new Date().toISOString().split('T')[0],
            note: '',
        },
    });

    const watchedPartyId = watch('party_id');
    const watchedBankLedgerId = watch('bank_ledger_id');
    const watchedAmount = watch('amount');
    const watchedKasarAmount = watch('kasar_amount');
    const watchedEntryType = watch('entry_type');
    const watchedPrefix = watch('doc_prefix');
    const watchedPaymentMode = watch('payment_mode');

    // Document number is now manually entered by user

    // Get selected party and its ledger balance
    const selectedParty = useMemo(() => {
        return parties.find(p => p.id === watchedPartyId);
    }, [parties, watchedPartyId]);

    const partyLedgerBalance = useMemo(() => {
        const partyLedger = ledgers.find(l => l.party_id === watchedPartyId);
        return partyLedger?.closing_balance || 0;
    }, [ledgers, watchedPartyId]);

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

    const bankLedgerBalance = useMemo(() => {
        return selectedBankLedger?.closing_balance || 0;
    }, [selectedBankLedger]);

    // Calculate net amount
    const netAmount = useMemo(() => {
        return (watchedAmount || 0) - (watchedKasarAmount || 0);
    }, [watchedAmount, watchedKasarAmount]);

    // Reset form when dialog opens
    useEffect(() => {
        if (open) {
            const defaultPre = defaultPrefix
                ? `${defaultPrefix.voucher_prefix}${defaultPrefix.prefix_separator}`
                : prefixes[0] || (voucherType === 'receipt' ? 'RV/' : 'PV/');

            reset({
                doc_prefix: defaultPre,
                doc_number: 1,
                voucher_date: new Date().toISOString().split('T')[0],
                entry_type: voucherType === 'receipt' ? 'Receive' : 'Pay',
                party_id: '',
                bank_ledger_id: '',
                amount: 0,
                kasar_amount: 0,
                payment_mode: '',
                ref_no: '',
                ref_date: new Date().toISOString().split('T')[0],
                note: '',
            });
        }
    }, [open, reset, voucherType, defaultPrefix, prefixes]);

    // Submit handler
    const onSubmit = async (data: FormData) => {
        try {
            // Use manually entered voucher number
            const party = parties.find(p => p.id === data.party_id);
            const ledgerPostings: LedgerPostingItem[] = [];

            // Find party ledger
            const partyLedger = ledgers.find(l => l.party_id === data.party_id);

            if (data.entry_type === 'Receive') {
                // Receipt: Debit Bank/Cash, Credit Party
                if (data.bank_ledger_id) {
                    ledgerPostings.push({
                        ledger_id: data.bank_ledger_id,
                        debit_amount: netAmount,
                        credit_amount: 0,
                        narration: `Receipt from ${party?.name}`,
                    });
                }
                if (partyLedger) {
                    ledgerPostings.push({
                        ledger_id: partyLedger.id,
                        debit_amount: 0,
                        credit_amount: data.amount,
                        narration: `Receipt from ${party?.name}`,
                    });
                }
                // Kasar (discount given) - if any
                if (data.kasar_amount > 0) {
                    const discountLedger = ledgers.find(l => l.name.toLowerCase().includes('discount'));
                    if (discountLedger) {
                        ledgerPostings.push({
                            ledger_id: discountLedger.id,
                            debit_amount: data.kasar_amount,
                            credit_amount: 0,
                            narration: 'Kasar/Discount allowed',
                        });
                    }
                }
            } else {
                // Payment: Debit Party, Credit Bank/Cash
                if (partyLedger) {
                    ledgerPostings.push({
                        ledger_id: partyLedger.id,
                        debit_amount: data.amount,
                        credit_amount: 0,
                        narration: `Payment to ${party?.name}`,
                    });
                }
                if (data.bank_ledger_id) {
                    ledgerPostings.push({
                        ledger_id: data.bank_ledger_id,
                        debit_amount: 0,
                        credit_amount: netAmount,
                        narration: `Payment to ${party?.name}`,
                    });
                }
                // Kasar (discount received) - if any
                if (data.kasar_amount > 0) {
                    const discountLedger = ledgers.find(l => l.name.toLowerCase().includes('discount'));
                    if (discountLedger) {
                        ledgerPostings.push({
                            ledger_id: discountLedger.id,
                            debit_amount: 0,
                            credit_amount: data.kasar_amount,
                            narration: 'Kasar/Discount received',
                        });
                    }
                }
            }

            await createVoucher.mutateAsync({
                voucher: {
                    voucher_type: data.entry_type === 'Receive' ? 'receipt_voucher' : 'payment_voucher',
                    voucher_number: `${data.doc_prefix}${data.doc_number}`,
                    voucher_date: data.voucher_date,
                    party_id: data.party_id,
                    party_name: party?.name,
                    reference_number: data.ref_no,
                    narration: data.note || `${data.entry_type === 'Receive' ? 'Receipt from' : 'Payment to'} ${party?.name}`,
                    total_amount: netAmount,
                    status: 'confirmed',
                },
                items: [],
                ledgerPostings,
            });

            onOpenChange(false);
        } catch (error) {
            console.error('Error creating voucher:', error);
        }
    };

    const formatCurrency = (value: number) =>
        new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 2,
        }).format(value);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
                <DialogHeader className="bg-primary text-primary-foreground -mx-6 -mt-6 px-6 py-4 rounded-t-lg">
                    <DialogTitle className="text-lg font-semibold">
                        Add Voucher
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 pt-2">
                    {/* Row 1: Voucher No., Date, Entry Type */}
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

                        {/* Entry Type */}
                        <div className="col-span-4 space-y-2">
                            <Label className="text-sm">Entry Type</Label>
                            <Select value={watchedEntryType} onValueChange={(v: 'Receive' | 'Pay') => setValue('entry_type', v)}>
                                <SelectTrigger className="text-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectPrimitive.Portal>
                                    <SelectContent>
                                        <SelectItem value="Receive" className="text-xs">Receive</SelectItem>
                                        <SelectItem value="Pay" className="text-xs">Pay</SelectItem>
                                    </SelectContent>
                                </SelectPrimitive.Portal>
                            </Select>
                        </div>
                    </div>

                    {/* Row 2: Party Name, Bank/Cash Account */}
                    <div className="grid grid-cols-12 gap-4">
                        {/* Party Name */}
                        <div className="col-span-6 space-y-2">
                            <div className="flex items-center justify-between">
                                <Label className="text-sm">
                                    Party Name <span className="text-destructive">*</span>
                                </Label>
                                <span className={`text-xs font-medium ${partyLedgerBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    Balance: {formatCurrency(partyLedgerBalance)} {partyLedgerBalance >= 0 ? 'Dr' : 'Cr'}
                                </span>
                            </div>
                            <SearchablePartySelect
                                value={watchedPartyId}
                                onChange={(v) => setValue('party_id', v)}
                                placeholder="Select Party"
                                error={!!errors.party_id}
                            />
                        </div>

                        {/* Bank/Cash Account */}
                        <div className="col-span-6 space-y-2">
                            <div className="flex items-center justify-between">
                                <Label className="text-sm">
                                    Bank/Cash Account <span className="text-destructive">*</span>
                                </Label>
                                <span className={`text-xs font-medium ${bankLedgerBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    Balance: {formatCurrency(bankLedgerBalance)} {bankLedgerBalance >= 0 ? 'Dr' : 'Cr'}
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

                    {/* Row 3: Amount, Kasar, Payment Mode, Ref No, Ref Date */}
                    <div className="grid grid-cols-12 gap-4">
                        {/* Amount */}
                        <div className="col-span-2 space-y-2">
                            <Label className="text-sm">
                                Amount <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                type="number"
                                step="0.01"
                                {...register('amount')}
                                className={`text-xs ${errors.amount ? 'border-destructive' : ''}`}
                                placeholder="Amount"
                            />
                        </div>

                        {/* Kasar Amount */}
                        <div className="col-span-2 space-y-2">
                            <Label className="text-sm">Kasar Amount</Label>
                            <Input
                                type="number"
                                step="0.01"
                                {...register('kasar_amount')}
                                className="text-xs"
                                placeholder="Kasar Amount"
                            />
                        </div>

                        {/* Payment Mode */}
                        <div className="col-span-3 space-y-2">
                            <Label className="text-sm">
                                Payment Mode <span className="text-destructive">*</span>
                            </Label>
                            <Select value={watchedPaymentMode} onValueChange={v => setValue('payment_mode', v)}>
                                <SelectTrigger className={`text-xs ${errors.payment_mode ? 'border-destructive' : ''}`}>
                                    <SelectValue placeholder="Select Payment Mode" />
                                </SelectTrigger>
                                <SelectPrimitive.Portal>
                                    <SelectContent>
                                        {paymentModes.map(mode => (
                                            <SelectItem key={mode.value} value={mode.value} className="text-xs">
                                                {mode.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </SelectPrimitive.Portal>
                            </Select>
                        </div>

                        {/* Ref. No. */}
                        <div className="col-span-2 space-y-2">
                            <Label className="text-sm">Ref. No.</Label>
                            <Input
                                {...register('ref_no')}
                                className="text-xs"
                                placeholder="Ref. No."
                            />
                        </div>

                        {/* Ref. Date */}
                        <div className="col-span-3 space-y-2">
                            <Label className="text-sm">Ref. Date</Label>
                            <Controller
                                control={control}
                                name="ref_date"
                                render={({ field }) => (
                                    <DatePicker
                                        value={field.value}
                                        onChange={(date) => field.onChange(date ? format(date, 'yyyy-MM-dd') : '')}
                                        placeholder="Ref Date"
                                    />
                                )}
                            />
                        </div>
                    </div>

                    {/* Net Amount Display */}
                    {netAmount > 0 && (
                        <div className="bg-primary/10 rounded-lg p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">Net Amount</p>
                                    <p className="text-2xl font-bold text-primary">{formatCurrency(netAmount)}</p>
                                </div>
                                {watchedKasarAmount > 0 && (
                                    <div className="text-right">
                                        <p className="text-xs text-muted-foreground">Kasar/Discount</p>
                                        <p className="text-sm font-medium text-green-600">- {formatCurrency(watchedKasarAmount)}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Note */}
                    <div className="space-y-2">
                        <Label className="text-sm">Note</Label>
                        <Textarea
                            {...register('note')}
                            placeholder="Note"
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
                            disabled={isCreating || netAmount <= 0}
                            className="bg-green-600 hover:bg-green-700"
                        >
                            {isCreating ? 'Creating...' : '✓ Save'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
