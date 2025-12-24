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
import { useTransports, Transport } from '@/hooks/useTransports';

const formSchema = z.object({
    transport_name: z.string().min(1, 'Transport Name is required'),
    transport_id: z.string().min(1, 'Transport ID is required'),
    address: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface AddTransportDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    transportToEdit?: Transport | null;
}

export function AddTransportDialog({ open, onOpenChange, transportToEdit }: AddTransportDialogProps) {
    const { createTransport, updateTransport } = useTransports();
    const isEditMode = !!transportToEdit;

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<FormData>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            transport_name: '',
            transport_id: '',
            address: '',
        },
    });

    useEffect(() => {
        if (open) {
            if (isEditMode && transportToEdit) {
                reset({
                    transport_name: transportToEdit.transport_name,
                    transport_id: transportToEdit.transport_id,
                    address: transportToEdit.address || '',
                });
            } else {
                reset({
                    transport_name: '',
                    transport_id: '',
                    address: '',
                });
            }
        }
    }, [open, reset, isEditMode, transportToEdit]);

    const onSubmit = async (data: FormData) => {
        if (isEditMode && transportToEdit) {
            await updateTransport.mutateAsync({
                id: transportToEdit.id,
                transport_name: data.transport_name,
                transport_id: data.transport_id,
                address: data.address || undefined,
            });
        } else {
            await createTransport.mutateAsync({
                transport_name: data.transport_name,
                transport_id: data.transport_id,
                address: data.address || undefined,
            });
        }
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader className="bg-primary text-primary-foreground px-6 py-4 -mx-6 -mt-6 rounded-t-lg">
                    <DialogTitle>{isEditMode ? 'Edit Transport' : 'Add Transport'}</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 pt-4">
                    {/* Row 1: Transport Name + Transport ID */}
                    <div className="grid grid-cols-12 gap-4">
                        <div className="col-span-6 space-y-2">
                            <Label className="text-sm">
                                Transport Name <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                {...register('transport_name')}
                                placeholder="Transport Name"
                                className={errors.transport_name ? 'border-destructive' : ''}
                            />
                        </div>

                        <div className="col-span-6 space-y-2">
                            <Label className="text-sm">
                                Transport ID <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                {...register('transport_id')}
                                placeholder="Transport ID"
                                className={errors.transport_id ? 'border-destructive' : ''}
                            />
                        </div>
                    </div>

                    {/* Row 2: Address (full width) */}
                    <div className="grid grid-cols-12 gap-4">
                        <div className="col-span-12 space-y-2">
                            <Label className="text-sm">Address</Label>
                            <Textarea
                                {...register('address')}
                                placeholder="Address"
                                rows={3}
                            />
                        </div>
                    </div>

                    <DialogFooter className="pt-4">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Close
                        </Button>
                        <Button type="submit" disabled={createTransport.isPending || updateTransport.isPending}>
                            {(createTransport.isPending || updateTransport.isPending) ? 'Saving...' : 'Save'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
