import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
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
import { useExpenseMaster } from '@/hooks/useExpenseMaster';

const formSchema = z.object({
    expense_name: z.string().min(1, 'Expense Name is required'),
    entry_type: z.string().min(1, 'Entry Type is required'),
    ledger_name: z.string().min(1, 'Ledger Name is required'),
    calculation_type: z.string().min(1, 'Calculation Type is required'),
    default_percent: z.coerce.number().min(0).optional(),
    calculation_on: z.string().min(1, 'Calculation On is required'),
    amount_effect: z.string().min(1, 'Amount Effect is required'),
    position: z.string().min(1, 'Position is required'),
    sequence: z.coerce.number().min(0).optional(),
    is_active: z.boolean().default(true),
});

type FormData = z.infer<typeof formSchema>;

interface AddExpenseDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const ENTRY_TYPES = ['Purchase', 'Sales'];
const CALCULATION_TYPES = ['Fixed', 'Percentage'];
const CALCULATION_ON_OPTIONS = ['Basic Amount', 'Total Qty', 'Net Amount'];
const AMOUNT_EFFECT_OPTIONS = ['Add', 'Deduct'];
const POSITION_OPTIONS = ['Before Tax', 'After Tax'];

export function AddExpenseDialog({ open, onOpenChange }: AddExpenseDialogProps) {
    const { createExpense } = useExpenseMaster();

    const {
        register,
        handleSubmit,
        reset,
        setValue,
        watch,
        formState: { errors },
    } = useForm<FormData>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            expense_name: '',
            entry_type: '',
            ledger_name: '',
            calculation_type: '',
            default_percent: 0,
            calculation_on: '',
            amount_effect: '',
            position: '',
            sequence: 0,
            is_active: true,
        },
    });

    const watchedEntryType = watch('entry_type');
    const watchedCalcType = watch('calculation_type');
    const watchedCalcOn = watch('calculation_on');
    const watchedAmountEffect = watch('amount_effect');
    const watchedPosition = watch('position');
    const watchedIsActive = watch('is_active');

    useEffect(() => {
        if (open) {
            reset({
                expense_name: '',
                entry_type: '',
                ledger_name: '',
                calculation_type: '',
                default_percent: 0,
                calculation_on: '',
                amount_effect: '',
                position: '',
                sequence: 0,
                is_active: true,
            });
        }
    }, [open, reset]);

    const onSubmit = async (data: FormData) => {
        await createExpense.mutateAsync({
            expense_name: data.expense_name,
            entry_type: data.entry_type.toLowerCase(),
            ledger_name: data.ledger_name,
            calculation_type: data.calculation_type.toLowerCase(),
            default_percent: data.default_percent || 0,
            calculation_on: data.calculation_on.toLowerCase().replace(/ /g, '_'),
            amount_effect: data.amount_effect.toLowerCase(),
            position: data.position.toLowerCase().replace(/ /g, '_'),
            sequence: data.sequence || 0,
            is_active: data.is_active,
        });
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[850px]">
                <DialogHeader className="bg-primary text-primary-foreground px-6 py-4 -mx-6 -mt-6 rounded-t-lg">
                    <DialogTitle>Add Expense Master</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 pt-4">
                    {/* Row 1: Expense Name + Entry Type + Ledger Name */}
                    <div className="grid grid-cols-12 gap-4">
                        <div className="col-span-4 space-y-2">
                            <Label className="text-sm">
                                Expense Name <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                {...register('expense_name')}
                                placeholder="Expense Name"
                                className={errors.expense_name ? 'border-destructive' : ''}
                            />
                        </div>

                        <div className="col-span-4 space-y-2">
                            <Label className="text-sm">
                                Entry Type <span className="text-destructive">*</span>
                            </Label>
                            <Select
                                value={watchedEntryType}
                                onValueChange={(v) => setValue('entry_type', v)}
                            >
                                <SelectTrigger className={errors.entry_type ? 'border-destructive' : ''}>
                                    <SelectValue placeholder="Select Entry Type" />
                                </SelectTrigger>
                                <SelectContent>
                                    {ENTRY_TYPES.map((type) => (
                                        <SelectItem key={type} value={type}>
                                            {type}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="col-span-4 space-y-2">
                            <Label className="text-sm">
                                Ledger Name <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                {...register('ledger_name')}
                                placeholder="Ledger Name"
                                className={errors.ledger_name ? 'border-destructive' : ''}
                            />
                        </div>
                    </div>

                    {/* Row 2: Calcu. Type + Def. Per + Calcu. ON + Amount Effect */}
                    <div className="grid grid-cols-12 gap-4">
                        <div className="col-span-3 space-y-2">
                            <Label className="text-sm">
                                Calcu. Type <span className="text-destructive">*</span>
                            </Label>
                            <Select
                                value={watchedCalcType}
                                onValueChange={(v) => setValue('calculation_type', v)}
                            >
                                <SelectTrigger className={errors.calculation_type ? 'border-destructive' : ''}>
                                    <SelectValue placeholder="Select" />
                                </SelectTrigger>
                                <SelectContent>
                                    {CALCULATION_TYPES.map((type) => (
                                        <SelectItem key={type} value={type}>
                                            {type}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="col-span-3 space-y-2">
                            <Label className="text-sm">Def. Per</Label>
                            <Input
                                type="number"
                                step="0.01"
                                {...register('default_percent')}
                                placeholder="Def. Per"
                            />
                        </div>

                        <div className="col-span-3 space-y-2">
                            <Label className="text-sm">
                                Calcu. ON <span className="text-destructive">*</span>
                            </Label>
                            <Select
                                value={watchedCalcOn}
                                onValueChange={(v) => setValue('calculation_on', v)}
                            >
                                <SelectTrigger className={errors.calculation_on ? 'border-destructive' : ''}>
                                    <SelectValue placeholder="Select" />
                                </SelectTrigger>
                                <SelectContent>
                                    {CALCULATION_ON_OPTIONS.map((opt) => (
                                        <SelectItem key={opt} value={opt}>
                                            {opt}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="col-span-3 space-y-2">
                            <Label className="text-sm">
                                Amount Effect <span className="text-destructive">*</span>
                            </Label>
                            <Select
                                value={watchedAmountEffect}
                                onValueChange={(v) => setValue('amount_effect', v)}
                            >
                                <SelectTrigger className={errors.amount_effect ? 'border-destructive' : ''}>
                                    <SelectValue placeholder="Select" />
                                </SelectTrigger>
                                <SelectContent>
                                    {AMOUNT_EFFECT_OPTIONS.map((opt) => (
                                        <SelectItem key={opt} value={opt}>
                                            {opt}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Row 3: Position + Sequence + Is Active */}
                    <div className="grid grid-cols-12 gap-4">
                        <div className="col-span-4 space-y-2">
                            <Label className="text-sm">
                                Position <span className="text-destructive">*</span>
                            </Label>
                            <Select
                                value={watchedPosition}
                                onValueChange={(v) => setValue('position', v)}
                            >
                                <SelectTrigger className={errors.position ? 'border-destructive' : ''}>
                                    <SelectValue placeholder="Select Position" />
                                </SelectTrigger>
                                <SelectContent>
                                    {POSITION_OPTIONS.map((opt) => (
                                        <SelectItem key={opt} value={opt}>
                                            {opt}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="col-span-4 space-y-2">
                            <Label className="text-sm">Sequence</Label>
                            <Input
                                type="number"
                                {...register('sequence')}
                                placeholder="Sequence"
                            />
                        </div>

                        <div className="col-span-4 space-y-2">
                            <Label className="text-sm">Is Active</Label>
                            <Select
                                value={watchedIsActive ? 'active' : 'inactive'}
                                onValueChange={(v) => setValue('is_active', v === 'active')}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="active">Active</SelectItem>
                                    <SelectItem value="inactive">Inactive</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <DialogFooter className="pt-4">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Close
                        </Button>
                        <Button type="submit" disabled={createExpense.isPending}>
                            {createExpense.isPending ? 'Saving...' : 'Save'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
