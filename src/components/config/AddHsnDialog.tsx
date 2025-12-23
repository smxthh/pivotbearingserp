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
import { useHsnMaster } from '@/hooks/useHsnMaster';

const formSchema = z.object({
    hsn_code: z.string().min(1, 'HSN is required'),
    gst_percent: z.coerce.number().min(0).max(100).optional(),
    description: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface AddHsnDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const GST_RATES = ['0', '5', '12', '18', '28'];

export function AddHsnDialog({ open, onOpenChange }: AddHsnDialogProps) {
    const { createHsn } = useHsnMaster();
    const [gstRate, setGstRate] = useState('');

    const {
        register,
        handleSubmit,
        reset,
        setValue,
        formState: { errors },
    } = useForm<FormData>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            hsn_code: '',
            gst_percent: 0,
            description: '',
        },
    });

    useEffect(() => {
        if (open) {
            reset({
                hsn_code: '',
                gst_percent: 0,
                description: '',
            });
            setGstRate('');
        }
    }, [open, reset]);

    useEffect(() => {
        if (gstRate) {
            setValue('gst_percent', parseFloat(gstRate));
        }
    }, [gstRate, setValue]);

    const onSubmit = async (data: FormData) => {
        await createHsn.mutateAsync({
            hsn_code: data.hsn_code,
            gst_percent: data.gst_percent || 0,
            description: data.description,
        });
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader className="bg-primary text-primary-foreground px-6 py-4 -mx-6 -mt-6 rounded-t-lg">
                    <DialogTitle>Add HSN</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 pt-4">
                    {/* Row 1: HSN + GST Per */}
                    <div className="grid grid-cols-12 gap-4">
                        <div className="col-span-6 space-y-2">
                            <Label className="text-sm">
                                HSN <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                {...register('hsn_code')}
                                placeholder="HSN"
                                className={errors.hsn_code ? 'border-destructive' : ''}
                            />
                        </div>

                        <div className="col-span-6 space-y-2">
                            <Label className="text-sm">GST Per (%)</Label>
                            <Select value={gstRate} onValueChange={setGstRate}>
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
                    </div>

                    {/* Row 2: Description */}
                    <div className="grid grid-cols-12 gap-4">
                        <div className="col-span-12 space-y-2">
                            <Label className="text-sm">Description</Label>
                            <Textarea
                                {...register('description')}
                                placeholder="Description"
                                rows={2}
                            />
                        </div>
                    </div>

                    <DialogFooter className="pt-4">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Close
                        </Button>
                        <Button type="submit" disabled={createHsn.isPending}>
                            {createHsn.isPending ? 'Saving...' : 'Save'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
