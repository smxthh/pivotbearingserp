import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Tag, Save, X } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Brand, useBrands } from '@/hooks/useBrands';

const brandSchema = z.object({
    name: z.string().min(1, 'Brand name is required').max(200),
    description: z.string().optional().or(z.literal('')),
    is_active: z.boolean().default(true),
});

type BrandFormData = z.infer<typeof brandSchema>;

interface BrandDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    brand?: Brand | null;
    onSuccess?: () => void;
}

export function BrandDialog({ open, onOpenChange, brand, onSuccess }: BrandDialogProps) {
    const isEdit = !!brand;
    const { addBrand, updateBrand, isAdding, isUpdating } = useBrands();

    const form = useForm<BrandFormData>({
        resolver: zodResolver(brandSchema),
        defaultValues: {
            name: '',
            description: '',
            is_active: true,
        },
    });

    useEffect(() => {
        if (brand) {
            form.reset({
                name: brand.name,
                description: brand.description || '',
                is_active: brand.is_active,
            });
        } else {
            form.reset({
                name: '',
                description: '',
                is_active: true,
            });
        }
    }, [brand, form, open]);

    const onSubmit = async (data: BrandFormData) => {
        try {
            if (isEdit && brand) {
                await updateBrand.mutateAsync({
                    id: brand.id,
                    updates: {
                        name: data.name,
                        description: data.description || undefined,
                        is_active: data.is_active,
                    },
                });
            } else {
                await addBrand.mutateAsync({
                    name: data.name,
                    description: data.description || undefined,
                });
            }

            onOpenChange(false);
            onSuccess?.();
        } catch (error) {
            console.error('Error saving brand:', error);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md rounded-2xl">
                <DialogHeader className="border-b pb-4 bg-teal-600 -m-6 mb-0 p-6 rounded-t-2xl">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
                            <Tag className="h-5 w-5 text-white" />
                        </div>
                        <DialogTitle className="text-xl text-white">
                            {isEdit ? 'Edit Brand' : 'Add Brand'}
                        </DialogTitle>
                    </div>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 pt-4">
                        {/* Brand Name */}
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>
                                        Brand Name <span className="text-red-500">*</span>
                                    </FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder="Brand Name"
                                            className="rounded-lg"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Description */}
                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Description</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="Brand description..."
                                            className="rounded-lg resize-none"
                                            rows={3}
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Active Status */}
                        {isEdit && (
                            <FormField
                                control={form.control}
                                name="is_active"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-lg border p-4 bg-muted/20">
                                        <FormControl>
                                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                                        </FormControl>
                                        <div className="space-y-1 leading-none">
                                            <FormLabel className="cursor-pointer">Active</FormLabel>
                                            <p className="text-sm text-muted-foreground">
                                                Inactive brands won't appear in product forms
                                            </p>
                                        </div>
                                    </FormItem>
                                )}
                            />
                        )}

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
                                disabled={isAdding || isUpdating}
                                className="rounded-lg bg-teal-600 hover:bg-teal-700"
                            >
                                <Save className="h-4 w-4 mr-2" />
                                {isAdding || isUpdating ? 'Saving...' : 'Save'}
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
