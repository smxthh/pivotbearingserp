import { useEffect } from 'react';
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
import {
    useVoucherPrefixes,
    VOUCHER_NAMES,
    YEAR_FORMATS,
    VoucherPrefix,
    CreateVoucherPrefixData
} from '@/hooks/useVoucherPrefixes';

const formSchema = z.object({
    voucher_name: z.string().min(1, 'Voucher Name is required'),
    voucher_prefix: z.string().min(1, 'Prefix is required').max(20),
    prefix_separator: z.string().max(5).default('/'),
    year_format: z.string().default('yy-yy'),
    auto_start_no: z.coerce.number().min(1).default(1),
    is_default: z.boolean().default(false),
    is_active: z.boolean().default(true),
});

type FormData = z.infer<typeof formSchema>;

interface AddVoucherPrefixDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    editData?: VoucherPrefix | null;
}

export function AddVoucherPrefixDialog({ open, onOpenChange, editData }: AddVoucherPrefixDialogProps) {
    const { createPrefix, updatePrefix } = useVoucherPrefixes();
    const isEdit = !!editData;

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
            voucher_name: '',
            voucher_prefix: '',
            prefix_separator: '/',
            year_format: 'yy-yy',
            auto_start_no: 1,
            is_default: false,
            is_active: true,
        },
    });

    const watchedVoucherName = watch('voucher_name');
    const watchedYearFormat = watch('year_format');
    const watchedIsDefault = watch('is_default');
    const watchedIsActive = watch('is_active');

    useEffect(() => {
        if (open) {
            if (editData) {
                reset({
                    voucher_name: editData.voucher_name,
                    voucher_prefix: editData.voucher_prefix,
                    prefix_separator: editData.prefix_separator || '/',
                    year_format: editData.year_format || 'yy-yy',
                    auto_start_no: editData.auto_start_no || 1,
                    is_default: editData.is_default || false,
                    is_active: editData.is_active ?? true,
                });
            } else {
                reset({
                    voucher_name: '',
                    voucher_prefix: '',
                    prefix_separator: '/',
                    year_format: 'yy-yy',
                    auto_start_no: 1,
                    is_default: false,
                    is_active: true,
                });
            }
        }
    }, [open, editData, reset]);

    const onSubmit = async (data: FormData) => {
        if (isEdit && editData) {
            await updatePrefix.mutateAsync({
                id: editData.id,
                voucher_name: data.voucher_name,
                voucher_prefix: data.voucher_prefix,
                prefix_separator: data.prefix_separator,
                year_format: data.year_format,
                auto_start_no: data.auto_start_no,
                is_default: data.is_default,
                is_active: data.is_active,
            });
        } else {
            await createPrefix.mutateAsync(data as CreateVoucherPrefixData);
        }
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[700px]">
                <DialogHeader className="bg-primary text-primary-foreground px-6 py-4 -mx-6 -mt-6 rounded-t-lg">
                    <DialogTitle>{isEdit ? 'Edit' : 'Add'} Voucher Prefix</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 pt-4">
                    {/* Row 1: Voucher Name + Prefix */}
                    <div className="grid grid-cols-12 gap-4">
                        <div className="col-span-6 space-y-2">
                            <Label className="text-sm">
                                Voucher Name <span className="text-destructive">*</span>
                            </Label>
                            <Select
                                value={watchedVoucherName}
                                onValueChange={(v) => setValue('voucher_name', v)}
                                disabled={isEdit}
                            >
                                <SelectTrigger className={errors.voucher_name ? 'border-destructive' : ''}>
                                    <SelectValue placeholder="Select Voucher Name" />
                                </SelectTrigger>
                                <SelectContent>
                                    {VOUCHER_NAMES.map((name) => (
                                        <SelectItem key={name} value={name}>
                                            {name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="col-span-6 space-y-2">
                            <Label className="text-sm">
                                Prefix <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                {...register('voucher_prefix')}
                                placeholder="Prefix"
                                className={`uppercase ${errors.voucher_prefix ? 'border-destructive' : ''}`}
                            />
                        </div>
                    </div>

                    {/* Row 2: Separator + Year Format */}
                    <div className="grid grid-cols-12 gap-4">
                        <div className="col-span-4 space-y-2">
                            <Label className="text-sm">Separator</Label>
                            <Input
                                {...register('prefix_separator')}
                                placeholder="/"
                            />
                        </div>

                        <div className="col-span-8 space-y-2">
                            <Label className="text-sm">Year Format</Label>
                            <Select
                                value={watchedYearFormat}
                                onValueChange={(v) => setValue('year_format', v)}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {YEAR_FORMATS.map((format) => (
                                        <SelectItem key={format.value} value={format.value}>
                                            {format.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Row 3: Auto Start No + Is Default + Is Active */}
                    <div className="grid grid-cols-12 gap-4">
                        <div className="col-span-4 space-y-2">
                            <Label className="text-sm">Auto Start No.</Label>
                            <Input
                                type="number"
                                {...register('auto_start_no')}
                                placeholder="1"
                                min={1}
                            />
                        </div>

                        <div className="col-span-4 space-y-2">
                            <Label className="text-sm">
                                Is Default? <span className="text-destructive">*</span>
                            </Label>
                            <Select
                                value={watchedIsDefault ? 'yes' : 'no'}
                                onValueChange={(v) => setValue('is_default', v === 'yes')}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="no">No</SelectItem>
                                    <SelectItem value="yes">Yes</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="col-span-4 space-y-2">
                            <Label className="text-sm">
                                Is Active? <span className="text-destructive">*</span>
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
                        <Button
                            type="submit"
                            disabled={createPrefix.isPending || updatePrefix.isPending}
                        >
                            {(createPrefix.isPending || updatePrefix.isPending) ? 'Saving...' : 'Save'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
