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
import { useTaxMaster } from '@/hooks/useTaxMaster';

const formSchema = z.object({
    tax_name: z.string().min(1, 'Tax Name is required'),
    tax_type: z.string().min(1, 'Tax Type is required'),
    calculation_type: z.string().min(1, 'Calculation Type is required'),
    ledger_name: z.string().optional(),
    is_active: z.boolean().default(true),
    add_deduct: z.string().default('add'),
});

type FormData = z.infer<typeof formSchema>;

interface AddTaxDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const TAX_TYPES = ['Purchase', 'Sales'];
const CALCULATION_TYPES = ['Basic Amount', 'Net Amount', 'Total Qty'];
const ADD_DEDUCT_OPTIONS = ['Add', 'Deduct'];

export function AddTaxDialog({ open, onOpenChange }: AddTaxDialogProps) {
    const { createTax } = useTaxMaster();

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
            tax_name: '',
            tax_type: '',
            calculation_type: '',
            ledger_name: '',
            is_active: true,
            add_deduct: 'add',
        },
    });

    const watchedTaxType = watch('tax_type');
    const watchedCalcType = watch('calculation_type');
    const watchedIsActive = watch('is_active');
    const watchedAddDeduct = watch('add_deduct');

    useEffect(() => {
        if (open) {
            reset({
                tax_name: '',
                tax_type: '',
                calculation_type: '',
                ledger_name: '',
                is_active: true,
                add_deduct: 'add',
            });
        }
    }, [open, reset]);

    const onSubmit = async (data: FormData) => {
        await createTax.mutateAsync({
            tax_name: data.tax_name,
            tax_type: data.tax_type.toLowerCase(),
            calculation_type: data.calculation_type.toLowerCase().replace(/ /g, '_'),
            ledger_name: data.ledger_name,
            is_active: data.is_active,
            add_deduct: data.add_deduct.toLowerCase(),
        });
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[700px]">
                <DialogHeader className="bg-primary text-primary-foreground px-6 py-4 -mx-6 -mt-6 rounded-t-lg">
                    <DialogTitle>Add Tax</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 pt-4">
                    {/* Row 1: Tax Name + Tax Type + Calc Type */}
                    <div className="grid grid-cols-12 gap-4">
                        <div className="col-span-4 space-y-2">
                            <Label className="text-sm">
                                Tax Name <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                {...register('tax_name')}
                                placeholder="Tax Name"
                                className={errors.tax_name ? 'border-destructive' : ''}
                            />
                        </div>

                        <div className="col-span-4 space-y-2">
                            <Label className="text-sm">
                                Tax Type <span className="text-destructive">*</span>
                            </Label>
                            <Select
                                value={watchedTaxType}
                                onValueChange={(v) => setValue('tax_type', v)}
                            >
                                <SelectTrigger className={errors.tax_type ? 'border-destructive' : ''}>
                                    <SelectValue placeholder="Select Tax Type" />
                                </SelectTrigger>
                                <SelectContent>
                                    {TAX_TYPES.map((type) => (
                                        <SelectItem key={type} value={type}>
                                            {type}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="col-span-4 space-y-2">
                            <Label className="text-sm">
                                Calcu. Type <span className="text-destructive">*</span>
                            </Label>
                            <Select
                                value={watchedCalcType}
                                onValueChange={(v) => setValue('calculation_type', v)}
                            >
                                <SelectTrigger className={errors.calculation_type ? 'border-destructive' : ''}>
                                    <SelectValue placeholder="Select Calcu. Type" />
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
                    </div>

                    {/* Row 2: Ledger Name + Is Active + Add/Deduct */}
                    <div className="grid grid-cols-12 gap-4">
                        <div className="col-span-6 space-y-2">
                            <Label className="text-sm">Ledger Name</Label>
                            <Input
                                {...register('ledger_name')}
                                placeholder="Ledger Name"
                            />
                        </div>

                        <div className="col-span-3 space-y-2">
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

                        <div className="col-span-3 space-y-2">
                            <Label className="text-sm">Add/Deduct</Label>
                            <Select
                                value={watchedAddDeduct}
                                onValueChange={(v) => setValue('add_deduct', v)}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {ADD_DEDUCT_OPTIONS.map((opt) => (
                                        <SelectItem key={opt} value={opt.toLowerCase()}>
                                            {opt}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <DialogFooter className="pt-4">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Close
                        </Button>
                        <Button type="submit" disabled={createTax.isPending}>
                            {createTax.isPending ? 'Saving...' : 'Save'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
