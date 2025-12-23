import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useDistributorId } from '@/hooks/useDistributorProfile';
import { toast } from 'sonner';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';

const formSchema = z.object({
    name: z.string().min(1, 'Zone Name is required'),
    remark: z.string().optional(),
});

export interface SalesZone {
    id: string;
    name: string;
    remark: string | null;
}

interface SalesZoneDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    zoneToEdit?: SalesZone | null;
}

export function SalesZoneDialog({ open, onOpenChange, zoneToEdit }: SalesZoneDialogProps) {
    const { data: distributorId } = useDistributorId();
    const queryClient = useQueryClient();

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: '',
            remark: '',
        },
    });

    useEffect(() => {
        if (open) {
            if (zoneToEdit) {
                form.reset({
                    name: zoneToEdit.name,
                    remark: zoneToEdit.remark || '',
                });
            } else {
                form.reset({
                    name: '',
                    remark: '',
                });
            }
        }
    }, [open, zoneToEdit, form]);

    const saveZone = useMutation({
        mutationFn: async (values: z.infer<typeof formSchema>) => {
            if (!distributorId) throw new Error('Distributor ID not found');

            if (zoneToEdit) {
                const { error } = await supabase
                    .from('sales_zones' as any)
                    .update({
                        name: values.name,
                        remark: values.remark || null,
                    })
                    .eq('id', zoneToEdit.id);

                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('sales_zones' as any)
                    .insert({
                        distributor_id: distributorId,
                        name: values.name,
                        remark: values.remark || null,
                    });

                if (error) throw error;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['sales_zones'] });
            toast.success(zoneToEdit ? 'Zone updated successfully' : 'Zone created successfully');
            onOpenChange(false);
        },
        onError: (error: Error) => {
            toast.error(error.message);
        },
    });

    const onSubmit = (values: z.infer<typeof formSchema>) => {
        saveZone.mutate(values);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{zoneToEdit ? 'Edit Sales Zone' : 'Add Sales Zone'}</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Zone Name</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Zone Name" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="remark"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Remark</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Remark" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={saveZone.isPending}>
                                {saveZone.isPending ? 'Saving...' : 'Save'}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
