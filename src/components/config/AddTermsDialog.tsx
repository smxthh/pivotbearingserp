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
import { useTerms } from '@/hooks/useTerms';

const formSchema = z.object({
    title: z.string().min(1, 'Title is required'),
    conditions: z.string().min(1, 'Conditions is required'),
    type: z.string().optional(),
    is_default: z.boolean().default(false),
});

type FormData = z.infer<typeof formSchema>;

interface AddTermsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function AddTermsDialog({ open, onOpenChange }: AddTermsDialogProps) {
    const { createTerm } = useTerms();

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
            title: '',
            conditions: '',
            type: '',
            is_default: false,
        },
    });

    const watchedType = watch('type');
    const watchedIsDefault = watch('is_default');

    useEffect(() => {
        if (open) {
            reset({
                title: '',
                conditions: '',
                type: '',
                is_default: false,
            });
        }
    }, [open, reset]);

    const onSubmit = async (data: FormData) => {
        await createTerm.mutateAsync({
            title: data.title,
            conditions: data.conditions,
            type: data.type || null,
            is_default: data.is_default,
        });
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader className="bg-primary text-primary-foreground px-6 py-4 -mx-6 -mt-6 rounded-t-lg">
                    <DialogTitle>Add Terms</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 pt-4">
                    {/* Row 1: Title (full width) */}
                    <div className="grid grid-cols-12 gap-4">
                        <div className="col-span-12 space-y-2">
                            <Label className="text-sm">
                                Title <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                {...register('title')}
                                placeholder="Title"
                                className={errors.title ? 'border-destructive' : ''}
                            />
                        </div>
                    </div>

                    {/* Row 2: Conditions (full width) */}
                    <div className="grid grid-cols-12 gap-4">
                        <div className="col-span-12 space-y-2">
                            <Label className="text-sm">
                                Conditions <span className="text-destructive">*</span>
                            </Label>
                            <Textarea
                                {...register('conditions')}
                                placeholder="Conditions"
                                rows={3}
                                className={errors.conditions ? 'border-destructive' : ''}
                            />
                        </div>
                    </div>

                    {/* Row 3: Type + Is Default */}
                    <div className="grid grid-cols-12 gap-4">
                        <div className="col-span-6 space-y-2">
                            <Label className="text-sm">Type</Label>
                            <Select
                                value={watchedType || ''}
                                onValueChange={(v) => setValue('type', v)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="None selected" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="purchase">Purchase</SelectItem>
                                    <SelectItem value="sales">Sales</SelectItem>
                                    <SelectItem value="both">Both</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="col-span-6 space-y-2">
                            <Label className="text-sm">Is Default ?</Label>
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
                    </div>

                    <DialogFooter className="pt-4">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Close
                        </Button>
                        <Button type="submit" disabled={createTerm.isPending}>
                            {createTerm.isPending ? 'Saving...' : 'Save'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
