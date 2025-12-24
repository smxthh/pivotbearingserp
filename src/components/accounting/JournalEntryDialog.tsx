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
import { Plus, Trash2, CheckCircle, AlertCircle, Check } from 'lucide-react';
import * as SelectPrimitive from '@radix-ui/react-select';
import { useVouchers, LedgerPostingItem } from '@/hooks/useVouchers';
import { useLedgers, Ledger } from '@/hooks/useLedgers';
import { useVoucherPrefixesForType } from '@/hooks/useVoucherPrefixes';

// Entry type for journal entries
interface JournalEntry {
    ledger_id: string;
    ledger_name: string;
    entry_type: 'Credit' | 'Debit';
    amount: number;
    remark: string;
}

// Form Schema
const formSchema = z.object({
    doc_prefix: z.string().default('JV/25-26/'),
    doc_number: z.coerce.number().min(1, 'Required'),
    voucher_date: z.string().min(1, 'Required'),
    remark: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface JournalEntryDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function JournalEntryDialog({ open, onOpenChange }: JournalEntryDialogProps) {
    const { createVoucher, isCreating } = useVouchers({ realtime: false });
    const { ledgers } = useLedgers({ realtime: false });

    // Local State
    const [entries, setEntries] = useState<JournalEntry[]>([]);

    // Inline entry form state
    const [newEntry, setNewEntry] = useState<{
        ledger_id: string;
        entry_type: 'Credit' | 'Debit';
        amount: number;
        remark: string;
    }>({
        ledger_id: '',
        entry_type: 'Credit',
        amount: 0,
        remark: '',
    });



    // Fetch prefixes from centralized system
    const { prefixes: dbPrefixes, defaultPrefix } = useVoucherPrefixesForType('Journal Entry');

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
            doc_prefix: 'JV/25-26/',
            doc_number: 1,
            voucher_date: new Date().toISOString().split('T')[0],
            remark: '',
        },
    });

    const watchedPrefix = watch('doc_prefix');

    // Document number is now manually entered by user

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
        const totalCredit = entries
            .filter(e => e.entry_type === 'Credit')
            .reduce((sum, e) => sum + e.amount, 0);
        const totalDebit = entries
            .filter(e => e.entry_type === 'Debit')
            .reduce((sum, e) => sum + e.amount, 0);
        const difference = Math.abs(totalDebit - totalCredit);
        const isBalanced = totalDebit === totalCredit && totalDebit > 0;

        return { totalCredit, totalDebit, difference, isBalanced };
    }, [entries]);

    // Reset form when dialog opens
    useEffect(() => {
        if (open) {
            const defaultPre = defaultPrefix
                ? `${defaultPrefix.voucher_prefix}${defaultPrefix.prefix_separator}`
                : prefixes[0] || 'JV/';

            reset({
                doc_prefix: defaultPre,
                doc_number: 1,
                voucher_date: new Date().toISOString().split('T')[0],
                remark: '',
            });
            setEntries([]);
            setNewEntry({
                ledger_id: '',
                entry_type: 'Credit',
                amount: 0,
                remark: '',
            });
        }
    }, [open, reset, defaultPrefix, prefixes]);

    // Add new entry
    const handleAddEntry = () => {
        if (!newEntry.ledger_id || newEntry.amount <= 0) return;

        const ledger = ledgers.find(l => l.id === newEntry.ledger_id);
        const entry: JournalEntry = {
            ledger_id: newEntry.ledger_id,
            ledger_name: ledger?.name || '',
            entry_type: newEntry.entry_type,
            amount: newEntry.amount,
            remark: newEntry.remark,
        };

        setEntries([...entries, entry]);
        setNewEntry({
            ledger_id: '',
            entry_type: 'Credit',
            amount: 0,
            remark: '',
        });
    };

    const handleDeleteEntry = (index: number) => {
        setEntries(entries.filter((_, i) => i !== index));
    };

    // Handle quick action buttons


    // Submit handler
    const onSubmit = async (data: FormData) => {
        if (!totals.isBalanced) return;

        try {
            const ledgerPostings: LedgerPostingItem[] = entries.map(entry => ({
                ledger_id: entry.ledger_id,
                debit_amount: entry.entry_type === 'Debit' ? entry.amount : 0,
                credit_amount: entry.entry_type === 'Credit' ? entry.amount : 0,
                narration: entry.remark || data.remark || '',
            }));

            // Use manually entered journal number

            await createVoucher.mutateAsync({
                voucher: {
                    voucher_type: 'journal_entry',
                    voucher_number: `${data.doc_prefix}${data.doc_number}`,
                    voucher_date: data.voucher_date,
                    narration: data.remark,
                    total_amount: totals.totalDebit,
                    status: 'confirmed',
                },
                items: [],
                ledgerPostings,
            });

            onOpenChange(false);
        } catch (error) {
            console.error('Error creating journal entry:', error);
        }
    };

    const formatCurrency = (value: number) =>
        new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 2,
        }).format(value);

    const getLedgerName = (id: string) => ledgers.find(l => l.id === id)?.name || '';

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
                <DialogHeader className="bg-primary text-primary-foreground -mx-6 -mt-6 px-6 py-4 rounded-t-lg">
                    <div className="flex items-center justify-between">
                        <DialogTitle className="text-lg font-semibold">
                            Journal Entry
                        </DialogTitle>
                    </div>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 pt-2">
                    {/* Row 1: Document Details */}
                    <div className="grid grid-cols-12 gap-4">
                        {/* Journal No. */}
                        <div className="col-span-3 space-y-2">
                            <Label className="text-sm">Journal No.</Label>
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

                        {/* Journal Date */}
                        <div className="col-span-3 space-y-2">
                            <Label className="text-sm">
                                Journal Date <span className="text-destructive">*</span>
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

                        {/* Remark */}
                        <div className="col-span-6 space-y-2">
                            <Label className="text-sm">Remark</Label>
                            <Input
                                {...register('remark')}
                                placeholder="Remark"
                                className="text-xs"
                            />
                        </div>
                    </div>

                    {/* Ledger Entries Table */}
                    <div className="border rounded-lg overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-primary hover:bg-primary">
                                    <TableHead className="text-primary-foreground text-xs w-10">#</TableHead>
                                    <TableHead className="text-primary-foreground text-xs">Ledger</TableHead>
                                    <TableHead className="text-primary-foreground text-xs text-right w-32">CR</TableHead>
                                    <TableHead className="text-primary-foreground text-xs text-right w-32">DR</TableHead>
                                    <TableHead className="text-primary-foreground text-xs">Remark</TableHead>
                                    <TableHead className="text-primary-foreground text-xs w-16">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {entries.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-4">
                                            No data available in table
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    entries.map((entry, index) => (
                                        <TableRow key={index} className="hover:bg-muted/50">
                                            <TableCell className="text-xs">{index + 1}</TableCell>
                                            <TableCell className="text-xs">{entry.ledger_name}</TableCell>
                                            <TableCell className="text-xs text-right">
                                                {entry.entry_type === 'Credit' ? formatCurrency(entry.amount) : '-'}
                                            </TableCell>
                                            <TableCell className="text-xs text-right">
                                                {entry.entry_type === 'Debit' ? formatCurrency(entry.amount) : '-'}
                                            </TableCell>
                                            <TableCell className="text-xs">{entry.remark || '-'}</TableCell>
                                            <TableCell>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7 text-destructive"
                                                    onClick={() => handleDeleteEntry(index)}
                                                >
                                                    <Trash2 className="h-3 w-3" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}

                                {/* Total Row */}
                                <TableRow className="bg-muted/50 font-semibold">
                                    <TableCell colSpan={2} className="text-right text-xs">Total</TableCell>
                                    <TableCell className="text-xs text-right text-green-600">{formatCurrency(totals.totalCredit)}</TableCell>
                                    <TableCell className="text-xs text-right text-red-600">{formatCurrency(totals.totalDebit)}</TableCell>
                                    <TableCell colSpan={2}></TableCell>
                                </TableRow>

                                {/* Inline Add Entry Row */}
                                <TableRow className="bg-muted/30">
                                    <TableCell className="text-xs">-</TableCell>
                                    <TableCell>
                                        <Select
                                            value={newEntry.ledger_id}
                                            onValueChange={v => setNewEntry({ ...newEntry, ledger_id: v })}
                                        >
                                            <SelectTrigger className="h-8 text-xs">
                                                <SelectValue placeholder="Select Ledger" />
                                            </SelectTrigger>
                                            <SelectPrimitive.Portal>
                                                <SelectContent className="max-h-60">
                                                    {Object.entries(groupedLedgers).map(([group, leds]) => (
                                                        <div key={group}>
                                                            <div className="px-2 py-1 text-xs font-semibold text-muted-foreground bg-muted">{group}</div>
                                                            {(leds as Ledger[]).map(l => (
                                                                <SelectItem key={l.id} value={l.id} className="text-xs">{l.name}</SelectItem>
                                                            ))}
                                                        </div>
                                                    ))}
                                                </SelectContent>
                                            </SelectPrimitive.Portal>
                                        </Select>
                                    </TableCell>
                                    <TableCell colSpan={2}>
                                        <div className="flex gap-2 items-center">
                                            <Select
                                                value={newEntry.entry_type}
                                                onValueChange={(v: 'Credit' | 'Debit') => setNewEntry({ ...newEntry, entry_type: v })}
                                            >
                                                <SelectTrigger className="h-8 w-24 text-xs">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectPrimitive.Portal>
                                                    <SelectContent>
                                                        <SelectItem value="Credit" className="text-xs">Credit</SelectItem>
                                                        <SelectItem value="Debit" className="text-xs">Debit</SelectItem>
                                                    </SelectContent>
                                                </SelectPrimitive.Portal>
                                            </Select>
                                            <Input
                                                type="number"
                                                step="0.01"
                                                value={newEntry.amount || ''}
                                                onChange={e => setNewEntry({ ...newEntry, amount: parseFloat(e.target.value) || 0 })}
                                                className="h-8 text-xs w-28 text-right"
                                                placeholder="0"
                                            />
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Input
                                            value={newEntry.remark}
                                            onChange={e => setNewEntry({ ...newEntry, remark: e.target.value })}
                                            className="h-8 text-xs"
                                            placeholder="Remark"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Button
                                            type="button"
                                            size="sm"
                                            className="h-8 w-8 p-0"
                                            onClick={handleAddEntry}
                                            disabled={!newEntry.ledger_id || newEntry.amount <= 0}
                                        >
                                            <Check className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </div>

                    {/* Balance Status */}
                    <div className={`flex items-center gap-2 p-3 rounded-lg ${totals.isBalanced ? 'bg-green-100 border border-green-300' : 'bg-yellow-100 border border-yellow-300'}`}>
                        {totals.isBalanced ? (
                            <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : (
                            <AlertCircle className="h-5 w-5 text-yellow-600" />
                        )}
                        <span className={totals.isBalanced ? 'text-green-700 font-medium' : 'text-yellow-700 font-medium'}>
                            {totals.isBalanced
                                ? 'Entries are balanced'
                                : `Difference: ${formatCurrency(totals.difference)} ${totals.totalDebit > totals.totalCredit ? '(Credit short)' : '(Debit short)'}`}
                        </span>
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
                            disabled={isCreating || !totals.isBalanced}
                            className="bg-green-600 hover:bg-green-700"
                        >
                            {isCreating ? 'Posting...' : '✓ Save'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
