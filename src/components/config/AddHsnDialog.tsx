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
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useHsnMaster, HsnMaster } from '@/hooks/useHsnMaster';

const formSchema = z.object({
    hsn_from: z.coerce.number().int().min(1, 'HSN From is required'),
    hsn_to: z.coerce.number().int().min(1, 'HSN To is required'),
    cgst: z.coerce.number().min(0).max(50),
    sgst: z.coerce.number().min(0).max(50),
    description: z.string().optional(),
}).refine((data) => data.hsn_from <= data.hsn_to, {
    message: "HSN From must be ≤ HSN To",
    path: ["hsn_to"],
});

type FormData = z.infer<typeof formSchema>;

interface AddHsnDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    editRecord?: HsnMaster | null;
}

const GST_RATES = ['0', '2.5', '6', '9', '14'];

export function AddHsnDialog({ open, onOpenChange, editRecord }: AddHsnDialogProps) {
    const { createHsn, updateHsn } = useHsnMaster();
    const [cgstRate, setCgstRate] = useState('');
    const [sgstRate, setSgstRate] = useState('');

    const isEdit = !!editRecord;

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
            hsn_from: undefined,
            hsn_to: undefined,
            cgst: 0,
            sgst: 0,
            description: '',
        },
    });

    const watchedCgst = watch('cgst');
    const watchedSgst = watch('sgst');
    const igst = (watchedCgst || 0) + (watchedSgst || 0);

    useEffect(() => {
        if (open) {
            if (editRecord) {
                // Editing existing record
                reset({
                    hsn_from: editRecord.hsn_from,
                    hsn_to: editRecord.hsn_to,
                    cgst: editRecord.cgst,
                    sgst: editRecord.sgst,
                    description: editRecord.description || '',
                });
                setCgstRate(String(editRecord.cgst));
                setSgstRate(String(editRecord.sgst));
            } else {
                // Creating new record
                reset({
                    hsn_from: undefined,
                    hsn_to: undefined,
                    cgst: 0,
                    sgst: 0,
                    description: '',
                });
                setCgstRate('');
                setSgstRate('');
            }
        }
    }, [open, editRecord, reset]);

    useEffect(() => {
        if (cgstRate) {
            setValue('cgst', parseFloat(cgstRate));
        }
    }, [cgstRate, setValue]);

    useEffect(() => {
        if (sgstRate) {
            setValue('sgst', parseFloat(sgstRate));
        }
    }, [sgstRate, setValue]);

    const onSubmit = async (data: FormData) => {
        const payload = {
            hsn_from: data.hsn_from,
            hsn_to: data.hsn_to,
            cgst: data.cgst,
            sgst: data.sgst,
            igst: data.cgst + data.sgst,
            description: data.description,
        };

        if (isEdit && editRecord) {
            await updateHsn.mutateAsync({ id: editRecord.id, ...payload });
        } else {
            await createHsn.mutateAsync(payload);
        }
        onOpenChange(false);
    };

    const isPending = createHsn.isPending || updateHsn.isPending;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[700px]">
                <DialogHeader className="bg-primary text-primary-foreground px-6 py-4 -mx-6 -mt-6 rounded-t-lg">
                    <DialogTitle>{isEdit ? 'Edit HSN Tax Slab' : 'Add HSN Tax Slab'}</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 pt-4">
                    {/* Row 1: HSN Range */}
                    <div className="grid grid-cols-12 gap-4">
                        <div className="col-span-6 space-y-2">
                            <Label className="text-sm">
                                HSN From <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                type="number"
                                {...register('hsn_from')}
                                placeholder="e.g. 84800"
                                className={errors.hsn_from ? 'border-destructive' : ''}
                            />
                            {errors.hsn_from && (
                                <p className="text-xs text-destructive">{errors.hsn_from.message}</p>
                            )}
                        </div>

                        <div className="col-span-6 space-y-2">
                            <Label className="text-sm">
                                HSN To <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                type="number"
                                {...register('hsn_to')}
                                placeholder="e.g. 84899"
                                className={errors.hsn_to ? 'border-destructive' : ''}
                            />
                            {errors.hsn_to && (
                                <p className="text-xs text-destructive">{errors.hsn_to.message}</p>
                            )}
                        </div>
                    </div>

                    {/* Row 2: GST Split */}
                    <div className="grid grid-cols-12 gap-4">
                        <div className="col-span-4 space-y-2">
                            <Label className="text-sm">CGST (%)</Label>
                            <Select value={cgstRate} onValueChange={setCgstRate}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select" />
                                </SelectTrigger>
                                <SelectContent>
                                    {GST_RATES.map((rate) => (
                                        <SelectItem key={rate} value={rate}>
                                            {rate}%
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="col-span-4 space-y-2">
                            <Label className="text-sm">SGST (%)</Label>
                            <Select value={sgstRate} onValueChange={setSgstRate}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select" />
                                </SelectTrigger>
                                <SelectContent>
                                    {GST_RATES.map((rate) => (
                                        <SelectItem key={rate} value={rate}>
                                            {rate}%
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="col-span-4 space-y-2">
                            <Label className="text-sm">IGST (Auto)</Label>
                            <Input
                                type="text"
                                value={`${igst}%`}
                                disabled
                                className="bg-muted font-medium"
                            />
                            <p className="text-xs text-muted-foreground">CGST + SGST</p>
                        </div>
                    </div>

                    {/* Row 3: Description */}
                    <div className="grid grid-cols-12 gap-4">
                        <div className="col-span-12 space-y-2">
                            <Label className="text-sm">Description</Label>
                            <Textarea
                                {...register('description')}
                                placeholder="Description (e.g. Ball Bearings, Roller Bearings)"
                                rows={2}
                            />
                        </div>
                    </div>

                    <DialogFooter className="pt-4">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Close
                        </Button>
                        <Button type="submit" disabled={isPending}>
                            {isPending ? 'Saving...' : isEdit ? 'Update' : 'Save'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
