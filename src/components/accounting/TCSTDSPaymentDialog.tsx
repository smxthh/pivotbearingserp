import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { format } from 'date-fns';
import { DatePicker } from '@/components/ui/date-picker';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useVouchers, LedgerPostingItem } from '@/hooks/useVouchers';
import { useLedgers } from '@/hooks/useLedgers';
import { useParties } from '@/hooks/useParties';
import { useVoucherPrefixesForType } from '@/hooks/useVoucherPrefixes';
import * as SelectPrimitive from '@radix-ui/react-select';
import { useMemo } from 'react';

const formSchema = z.object({
    doc_prefix: z.string().min(1, 'Required'),
    doc_number: z.coerce.number().min(1, 'Required'),
    quarter: z.string().optional(),
    entry_type: z.enum(['tds', 'tcs']),
    challan_number: z.string().optional(),
    challan_date: z.string().min(1, 'Required'),
    party_id: z.string().optional(),
    party_name: z.string().min(1, 'Party name required'),
    bank_account_id: z.string().optional(),
    bank_voucher_number: z.string().optional(),
    cheque_dd_number: z.string().optional(),
    brs_code: z.string().optional(),
    amount: z.coerce.number().min(0.01, 'Amount required'),
    interest_amount: z.coerce.number().optional(),
    payment_mode: z.string().default('bank'),
    narration: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface TCSTDSPaymentDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function TCSTDSPaymentDialog({ open, onOpenChange }: TCSTDSPaymentDialogProps) {
    const { createVoucher, isCreating } = useVouchers({ realtime: false });
    const { ledgers, refetch: refetchLedgers } = useLedgers({ realtime: true }); // Enable realtime
    const { parties } = useParties({ realtime: true }); // Enable realtime

    // Fetch prefixes
    const { prefixes: dbPrefixes, defaultPrefix } = useVoucherPrefixesForType('TCS/TDS Payment');

    // Format prefixes
    // Format prefixes
    const prefixes = useMemo(() => {
        return dbPrefixes.map(p => `${p.voucher_prefix}${p.prefix_separator}`);
    }, [dbPrefixes]);

    const { register, handleSubmit, reset, watch, setValue, control, formState: { errors } } = useForm<FormData>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            doc_prefix: 'TDSPMT/',
            doc_number: 1,
            quarter: '',
            entry_type: 'tds',
            challan_number: '',
            challan_date: new Date().toISOString().split('T')[0],
            party_id: '',
            party_name: '',
            bank_account_id: '',
            bank_voucher_number: '',
            cheque_dd_number: '',
            brs_code: '',
            amount: 0,
            interest_amount: 0,
            payment_mode: 'bank',
            narration: '',
        },
    });

    const entryType = watch('entry_type');
    const amount = watch('amount') || 0;
    const interestAmount = watch('interest_amount') || 0;
    const watchedPartyId = watch('party_id');
    const watchedBankAccountId = watch('bank_account_id');
    const watchedPrefix = watch('doc_prefix');

    // Document number is now manually entered by user

    // Auto-fill party name when party selected
    useEffect(() => {
        if (watchedPartyId) {
            const party = parties.find((p) => p.id === watchedPartyId);
            if (party) {
                setValue('party_name', party.name);
            }
        }
    }, [watchedPartyId, parties, setValue]);

    // Get party balance
    const getPartyBalance = () => {
        if (!watchedPartyId) return 0;
        const partyLedger = ledgers.find((l) => l.party_id === watchedPartyId);
        return partyLedger?.closing_balance || 0;
    };

    // Get bank account balance
    const getBankBalance = () => {
        if (!watchedBankAccountId) return 0;
        const bankLedger = ledgers.find((l) => l.id === watchedBankAccountId);
        return bankLedger?.closing_balance || 0;
    };

    // Reset form when dialog opens
    useEffect(() => {
        if (open) {
            // Refetch ledgers to get latest data
            refetchLedgers();

            refetchLedgers();

            const defaultPre = defaultPrefix
                ? `${defaultPrefix.voucher_prefix}${defaultPrefix.prefix_separator}`
                : prefixes[0] || 'TDSPMT/';

            reset({
                doc_prefix: defaultPre,
                doc_number: 1,
                quarter: '',
                entry_type: 'tds',
                challan_number: '',
                challan_date: new Date().toISOString().split('T')[0],
                party_id: '',
                party_name: '',
                bank_account_id: '',
                bank_voucher_number: '',
                cheque_dd_number: '',
                brs_code: '',
                amount: 0,
                interest_amount: 0,
                payment_mode: 'bank',
                narration: '',
            });
        }
    }, [open, reset, refetchLedgers]);

    const findLedger = (name: string, groupName: string) => ledgers.find(l => l.name.toLowerCase() === name.toLowerCase() || l.group_name === groupName)?.id;

    const onSubmit = async (data: FormData) => {
        try {
            const ledgerPostings: LedgerPostingItem[] = [];
            const totalAmount = data.amount + (data.interest_amount || 0);

            // Debit TDS/TCS Payable (reduce liability)
            const taxLedgerId = findLedger(data.entry_type === 'tds' ? 'TDS Payable' : 'TCS Payable', 'Duties & Taxes');
            if (taxLedgerId) {
                ledgerPostings.push({
                    ledger_id: taxLedgerId,
                    debit_amount: totalAmount,
                    credit_amount: 0,
                    narration: `${data.entry_type.toUpperCase()} payment - ${data.challan_number || 'N/A'}`,
                });
            }

            // Credit Bank (reduce assets)
            const bankLedgerId = data.bank_account_id || findLedger('Bank Accounts', 'Bank Accounts');
            if (bankLedgerId) {
                ledgerPostings.push({
                    ledger_id: bankLedgerId,
                    debit_amount: 0,
                    credit_amount: totalAmount,
                    narration: `${data.entry_type.toUpperCase()} payment`,
                });
            }

            await createVoucher.mutateAsync({
                voucher: {
                    voucher_type: 'tcs_tds_payment',
                    voucher_number: `${data.doc_prefix}${data.doc_number}`,
                    voucher_date: data.challan_date,
                    party_id: data.party_id,
                    party_name: data.party_name,
                    reference_number: data.challan_number,
                    narration: data.narration || `${data.entry_type.toUpperCase()} Payment - Q${data.quarter} - ${data.challan_number}`,
                    tds_amount: data.entry_type === 'tds' ? data.amount : 0,
                    tcs_amount: data.entry_type === 'tcs' ? data.amount : 0,
                    total_amount: totalAmount,
                    status: 'confirmed',
                },
                items: [],
                ledgerPostings,
            });
            onOpenChange(false);
        } catch (error) { }
    };

    const formatCurrency = (value: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(value);

    const quarters = ['Q1 (Apr-Jun)', 'Q2 (Jul-Sep)', 'Q3 (Oct-Dec)', 'Q4 (Jan-Mar)'];
    const paymentModes = ['Bank Transfer', 'Cheque', 'Demand Draft', 'Cash'];

    // Get bank/cash ledgers with improved filtering
    const bankCashLedgers = ledgers.filter(l => {
        const groupName = l.group_name?.toLowerCase() || '';
        const ledgerName = l.name?.toLowerCase() || '';

        return groupName.includes('bank') ||
            groupName.includes('cash') ||
            ledgerName.includes('bank') ||
            ledgerName.includes('cash');
    });

    // Debug logging
    console.log('All ledgers:', ledgers.length);
    console.log('Bank/Cash ledgers:', bankCashLedgers);

    const totalPayment = amount + interestAmount;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-lg font-semibold">Add Voucher</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    {/* Row 1 */}
                    <div className="grid grid-cols-4 gap-4">
                        <div className="space-y-2">
                            <Label>Voucher No</Label>
                            <div className="flex gap-1">
                                <Select value={watchedPrefix} onValueChange={v => setValue('doc_prefix', v)}>
                                    <SelectTrigger className="w-24 px-2">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectPrimitive.Portal>
                                        <SelectContent>
                                            {prefixes.map(p => (
                                                <SelectItem key={p} value={p}>{p}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </SelectPrimitive.Portal>
                                </Select>
                                <Input type="number" {...register('doc_number')} placeholder="No" className="flex-1" />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Quarter</Label>
                            <Select value={watch('quarter')} onValueChange={v => setValue('quarter', v)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Quarter" />
                                </SelectTrigger>
                                <SelectPrimitive.Portal>
                                    <SelectContent>
                                        {quarters.map(q => (
                                            <SelectItem key={q} value={q}>{q}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </SelectPrimitive.Portal>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Entry Type</Label>
                            <Select value={entryType} onValueChange={(v: 'tds' | 'tcs') => setValue('entry_type', v)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectPrimitive.Portal>
                                    <SelectContent>
                                        <SelectItem value="tds">TCS Payment</SelectItem>
                                        <SelectItem value="tcs">TDS Payment</SelectItem>
                                    </SelectContent>
                                </SelectPrimitive.Portal>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>
                                CHL. No. <span className="text-destructive">*</span>
                            </Label>
                            <Input {...register('challan_number')} placeholder="CHL. No." />
                        </div>

                        <div className="space-y-2">
                            <Label>
                                CHL. Date <span className="text-destructive">*</span>
                            </Label>
                            <Controller
                                name="challan_date"
                                control={control}
                                render={({ field }) => (
                                    <DatePicker
                                        value={field.value}
                                        onChange={(date) => field.onChange(date ? format(date, 'yyyy-MM-dd') : '')}
                                        className={errors.challan_date ? 'border-destructive' : ''}
                                    />
                                )}
                            />
                        </div>
                    </div>

                    {/* Row 2 */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>
                                Party Name <span className="text-destructive">*</span>
                                {watchedPartyId && (
                                    <span className="ml-2 text-xs text-muted-foreground">
                                        Balance: {formatCurrency(getPartyBalance())}
                                    </span>
                                )}
                            </Label>
                            <Select value={watchedPartyId} onValueChange={v => setValue('party_id', v)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Party" />
                                </SelectTrigger>
                                <SelectPrimitive.Portal>
                                    <SelectContent>
                                        {parties.map(p => (
                                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </SelectPrimitive.Portal>
                            </Select>
                            {!watchedPartyId && (
                                <Input {...register('party_name')} placeholder="Or enter party name" className={errors.party_name ? 'border-destructive' : ''} />
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label>
                                Bank/Cash Account <span className="text-destructive">*</span>
                                {watchedBankAccountId && (
                                    <span className="ml-2 text-xs text-muted-foreground">
                                        Balance: {formatCurrency(getBankBalance())}
                                    </span>
                                )}
                            </Label>
                            <Select value={watchedBankAccountId} onValueChange={v => setValue('bank_account_id', v)}>
                                <SelectTrigger>
                                    <SelectValue placeholder={bankCashLedgers.length === 0 ? "No bank/cash ledgers found" : "Select Ledger"} />
                                </SelectTrigger>
                                <SelectPrimitive.Portal>
                                    <SelectContent>
                                        {bankCashLedgers.length === 0 ? (
                                            <div className="p-2 text-sm text-muted-foreground text-center">
                                                No bank or cash ledgers available.
                                                <br />
                                                Please create a ledger first.
                                            </div>
                                        ) : (
                                            bankCashLedgers.map(l => (
                                                <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                                            ))
                                        )}
                                    </SelectContent>
                                </SelectPrimitive.Portal>
                            </Select>
                            {bankCashLedgers.length === 0 && (
                                <p className="text-xs text-muted-foreground">
                                    Tip: Create bank/cash ledgers from the Ledger page first
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Row 3 */}
                    <div className="grid grid-cols-4 gap-4">
                        <div className="space-y-2">
                            <Label>
                                Bank Vou. No. <span className="text-destructive">*</span>
                            </Label>
                            <Input {...register('bank_voucher_number')} placeholder="Bank Vou. No." />
                        </div>

                        <div className="space-y-2">
                            <Label>Cheque/DD No.</Label>
                            <Input {...register('cheque_dd_number')} placeholder="Cheque/DD No." />
                        </div>

                        <div className="space-y-2">
                            <Label>
                                BRS Code <span className="text-destructive">*</span>
                            </Label>
                            <Input {...register('brs_code')} placeholder="BRS Code" />
                        </div>

                        <div className="space-y-2">
                            <Label>
                                Amount <span className="text-destructive">*</span>
                            </Label>
                            <Input type="number" step="0.01" {...register('amount')} placeholder="Amount" className={errors.amount ? 'border-destructive' : ''} />
                            {errors.amount && <p className="text-sm text-destructive">{errors.amount.message}</p>}
                        </div>
                    </div>

                    {/* Row 4 */}
                    <div className="grid grid-cols-4 gap-4">
                        <div className="space-y-2">
                            <Label>Interest Amount</Label>
                            <Input type="number" step="0.01" {...register('interest_amount')} placeholder="Interest Amount" />
                        </div>

                        <div className="space-y-2 col-span-3">
                            <Label>Payment Mode</Label>
                            <Select value={watch('payment_mode')} onValueChange={v => setValue('payment_mode', v)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Payment Mode" />
                                </SelectTrigger>
                                <SelectPrimitive.Portal>
                                    <SelectContent>
                                        {paymentModes.map(mode => (
                                            <SelectItem key={mode} value={mode.toLowerCase()}>{mode}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </SelectPrimitive.Portal>
                            </Select>
                        </div>
                    </div>

                    {/* Note */}
                    <div className="space-y-2">
                        <Label>Note</Label>
                        <Textarea {...register('narration')} placeholder="Note" rows={2} />
                    </div>

                    {/* Total */}
                    {totalPayment > 0 && (
                        <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                            <div className="flex justify-between items-center">
                                <span className="text-sm font-medium text-muted-foreground">Total Payment:</span>
                                <span className="text-2xl font-bold text-primary">{formatCurrency(totalPayment)}</span>
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isCreating || totalPayment <= 0}>
                            {isCreating ? 'Recording...' : 'Record Payment'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
