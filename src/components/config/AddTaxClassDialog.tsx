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
import { useTaxClass } from '@/hooks/useTaxClass';

const formSchema = z.object({
    class_type: z.string().min(1, 'Class Type is required'),
    class_code: z.string().min(1, 'Class Code is required'),
    class_name: z.string().min(1, 'Class Name is required'),
    ledger_name: z.string().min(1, 'Ledger Name is required'),
    tax_name: z.string().optional(),
    expense_name: z.string().optional(),
    is_default: z.boolean().default(false),
    is_active: z.boolean().default(true),
});

type FormData = z.infer<typeof formSchema>;

interface AddTaxClassDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const CLASS_TYPES = ['Purchase', 'Sales'];
const CLASS_CODES = ['GST', 'IGST', 'TF', 'EX', 'JW', 'URD'];

export function AddTaxClassDialog({ open, onOpenChange }: AddTaxClassDialogProps) {
    const { createTaxClass } = useTaxClass();

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
            class_type: 'Purchase',
            class_code: '',
            class_name: '',
            ledger_name: '',
            tax_name: '',
            expense_name: '',
            is_default: false,
            is_active: true,
        },
    });

    const watchedClassType = watch('class_type');
    const watchedClassCode = watch('class_code');
    const watchedIsDefault = watch('is_default');
    const watchedIsActive = watch('is_active');

    useEffect(() => {
        if (open) {
            reset({
                class_type: 'Purchase',
                class_code: '',
                class_name: '',
                ledger_name: '',
                tax_name: '',
                expense_name: '',
                is_default: false,
                is_active: true,
            });
        }
    }, [open, reset]);

    const onSubmit = async (data: FormData) => {
        await createTaxClass.mutateAsync({
            class_type: data.class_type.toLowerCase(),
            class_code: data.class_code,
            class_name: data.class_name,
            ledger_name: data.ledger_name,
            tax_name: data.tax_name,
            expense_name: data.expense_name,
            is_default: data.is_default,
            is_active: data.is_active,
        });
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[850px]">
                <DialogHeader className="bg-primary text-primary-foreground px-6 py-4 -mx-6 -mt-6 rounded-t-lg">
                    <DialogTitle>Add Tax Class</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 pt-4">
                    {/* Row 1: Class Type + Class Code + Class Name + Ledger Name */}
                    <div className="grid grid-cols-12 gap-4">
                        <div className="col-span-2 space-y-2">
                            <Label className="text-sm">Class Type</Label>
                            <Select
                                value={watchedClassType}
                                onValueChange={(v) => setValue('class_type', v)}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {CLASS_TYPES.map((type) => (
                                        <SelectItem key={type} value={type}>
                                            {type}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="col-span-2 space-y-2">
                            <Label className="text-sm">
                                Class Code <span className="text-destructive">*</span>
                            </Label>
                            <Select
                                value={watchedClassCode}
                                onValueChange={(v) => setValue('class_code', v)}
                            >
                                <SelectTrigger className={errors.class_code ? 'border-destructive' : ''}>
                                    <SelectValue placeholder="Select" />
                                </SelectTrigger>
                                <SelectContent>
                                    {CLASS_CODES.map((code) => (
                                        <SelectItem key={code} value={code}>
                                            {code}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="col-span-4 space-y-2">
                            <Label className="text-sm">
                                Class Name <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                {...register('class_name')}
                                placeholder="Class Name"
                                className={errors.class_name ? 'border-destructive' : ''}
                            />
                        </div>

                        <div className="col-span-4 space-y-2">
                            <Label className="text-sm">
                                Ledger Name <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                {...register('ledger_name')}
                                placeholder="Select Ledger"
                                className={errors.ledger_name ? 'border-destructive' : ''}
                            />
                        </div>
                    </div>

                    {/* Row 2: Tax Name + Expense Name + Is Default + Is Active */}
                    <div className="grid grid-cols-12 gap-4">
                        <div className="col-span-4 space-y-2">
                            <Label className="text-sm">Tax Name</Label>
                            <Input
                                {...register('tax_name')}
                                placeholder="None selected"
                            />
                        </div>

                        <div className="col-span-4 space-y-2">
                            <Label className="text-sm">Expense Name</Label>
                            <Input
                                {...register('expense_name')}
                                placeholder="None selected"
                            />
                        </div>

                        <div className="col-span-2 space-y-2">
                            <Label className="text-sm">
                                Is Default <span className="text-destructive">*</span>
                            </Label>
                            <Select
                                value={watchedIsDefault ? 'yes' : 'no'}
                                onValueChange={(v) => setValue('is_default', v === 'yes')}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="no">NO</SelectItem>
                                    <SelectItem value="yes">YES</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="col-span-2 space-y-2">
                            <Label className="text-sm">
                                Is Active <span className="text-destructive">*</span>
                            </Label>
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
                        <Button type="submit" disabled={createTaxClass.isPending}>
                            {createTaxClass.isPending ? 'Saving...' : 'Save'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
