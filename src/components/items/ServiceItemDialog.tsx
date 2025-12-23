import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Wrench, Save, X } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useCategoryDropdown } from '@/hooks/useCategories';
import { useSacCodes, GST_RATES, UNITS } from '@/hooks/useHsnCodes';
import { supabase } from '@/integrations/supabase/client';
import { useDistributorId } from '@/hooks/useDistributorProfile';
import { toast } from 'sonner';
import { Item } from '@/hooks/useItems';

// Schema matching current database structure
const serviceSchema = z.object({
    sku: z.string().optional().or(z.literal('')),
    name: z.string().min(1, 'Service name is required').max(200),
    category_id: z.string().optional().or(z.literal('')),
    hsn_code: z.string().optional().or(z.literal('')), // Will store SAC code here
    gst_percent: z.coerce.number().min(0).max(100).default(18),
    sale_price: z.coerce.number().min(0).default(0),
    unit: z.string().min(1, 'Unit is required'),
    description: z.string().optional().or(z.literal('')),
});

type ServiceFormData = z.infer<typeof serviceSchema>;

interface ServiceItemDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    service?: Item | null;
    onSuccess?: () => void;
}

export function ServiceItemDialog({ open, onOpenChange, service, onSuccess }: ServiceItemDialogProps) {
    const isEdit = !!service;
    const [isSaving, setIsSaving] = useState(false);
    const { data: distributorId } = useDistributorId();
    const { finalOptions: categoryOptions } = useCategoryDropdown('service');
    const { options: sacOptions } = useSacCodes();

    const form = useForm<ServiceFormData>({
        resolver: zodResolver(serviceSchema),
        defaultValues: {
            sku: '',
            name: '',
            category_id: '',
            hsn_code: '',
            gst_percent: 18,
            sale_price: 0,
            unit: 'JOB',
            description: '',
        },
    });

    useEffect(() => {
        if (service) {
            form.reset({
                sku: service.sku || '',
                name: service.name,
                category_id: service.category_id || '',
                hsn_code: service.hsn_code || '',
                gst_percent: service.gst_percent || 18,
                sale_price: service.sale_price || 0,
                unit: service.unit || 'JOB',
                description: service.description || '',
            });
        } else {
            form.reset({
                sku: '',
                name: '',
                category_id: '',
                hsn_code: '',
                gst_percent: 18,
                sale_price: 0,
                unit: 'JOB',
                description: '',
            });
        }
    }, [service, form, open]);

    const onSubmit = async (data: ServiceFormData) => {
        if (!distributorId) {
            toast.error('Distributor profile not found');
            return;
        }

        setIsSaving(true);
        try {
            const itemData = {
                distributor_id: distributorId,
                name: data.name,
                category_id: data.category_id || null,
                hsn_code: data.hsn_code || null,
                gst_percent: data.gst_percent,
                purchase_price: 0,
                sale_price: data.sale_price,
                mrp: data.sale_price,
                unit: data.unit,
                min_stock_level: 0,
                stock_quantity: 0,
                description: data.description || null,
            };

            if (isEdit && service) {
                const { error } = await supabase
                    .from('items')
                    .update({ ...itemData, sku: data.sku })
                    .eq('id', service.id);

                if (error) throw error;
                toast.success('Service updated successfully');
            } else {
                // Generate SKU if empty, otherwise use provided
                const sku = data.sku || `SRV-${Date.now().toString().slice(-8)}`;

                const { error } = await supabase.from('items').insert({
                    ...itemData,
                    sku,
                });

                if (error) throw error;
                toast.success('Service added successfully');
            }

            onOpenChange(false);
            onSuccess?.();
        } catch (error: any) {
            console.error('Error saving service:', error);
            toast.error(`Failed to save service: ${error.message}`);
        } finally {
            setIsSaving(false);
        }
    };

    // Handle SAC code selection to auto-set GST rate
    const handleSacChange = (sacCode: string) => {
        form.setValue('hsn_code', sacCode);
        const selectedSac = sacOptions.find((s) => s.code === sacCode);
        if (selectedSac) {
            form.setValue('gst_percent', selectedSac.gstRate);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl">
                <DialogHeader className="border-b pb-4 bg-teal-600 -m-6 mb-0 p-6 rounded-t-2xl">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
                            <Wrench className="h-5 w-5 text-white" />
                        </div>
                        <DialogTitle className="text-xl text-white">
                            {isEdit ? 'Edit Service Item' : 'Add Service Item'}
                        </DialogTitle>
                    </div>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 pt-4">
                        {/* Row 1: SKU, Service Name */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="sku"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Service Code</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="text"
                                                placeholder="Service Code"
                                                className="rounded-lg"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>
                                            Service Name <span className="text-red-500">*</span>
                                        </FormLabel>
                                        <FormControl>
                                            <Input placeholder="Service Name" className="rounded-lg" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        {/* Row 2: Category, SAC Code */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="category_id"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Category</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger className="rounded-lg">
                                                    <SelectValue placeholder="Select" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {categoryOptions.map((opt) => (
                                                    <SelectItem key={opt.value} value={opt.value}>
                                                        {opt.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="hsn_code"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>SAC Code</FormLabel>
                                        <Select onValueChange={handleSacChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger className="rounded-lg">
                                                    <SelectValue placeholder="Select SAC Code" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {sacOptions.map((opt) => (
                                                    <SelectItem key={opt.value} value={opt.code}>
                                                        {opt.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        {/* Row 3: GST, Price, Unit */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <FormField
                                control={form.control}
                                name="gst_percent"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>GST (%)</FormLabel>
                                        <Select
                                            onValueChange={(v) => field.onChange(parseFloat(v))}
                                            value={field.value?.toString()}
                                        >
                                            <FormControl>
                                                <SelectTrigger className="rounded-lg">
                                                    <SelectValue />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {GST_RATES.map((rate) => (
                                                    <SelectItem key={rate} value={rate.toString()}>
                                                        {rate === 0 ? 'NILL' : `${rate}%`}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="sale_price"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Service Price</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="number"
                                                placeholder="0"
                                                className="rounded-lg"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="unit"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>
                                            Unit <span className="text-red-500">*</span>
                                        </FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger className="rounded-lg">
                                                    <SelectValue />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {UNITS.map((unit) => (
                                                    <SelectItem key={unit.value} value={unit.value}>
                                                        {unit.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        {/* Row 4: Description */}
                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Description</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="Service Description"
                                            className="rounded-lg resize-none"
                                            rows={3}
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Action Buttons */}
                        <div className="flex gap-3 justify-end pt-4 border-t">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => onOpenChange(false)}
                                className="rounded-lg"
                            >
                                <X className="h-4 w-4 mr-2" />
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={isSaving}
                                className="rounded-lg bg-teal-600 hover:bg-teal-700"
                            >
                                <Save className="h-4 w-4 mr-2" />
                                {isSaving ? 'Saving...' : 'Save'}
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
