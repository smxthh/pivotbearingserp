import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FolderTree } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
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
import { useCategories, Category } from '@/hooks/useCategories';

// Schema matching the old PHP form
const categorySchema = z.object({
    name: z.string().min(1, 'Category name is required').max(200),
    parent_id: z.string().nullable().optional(),
    is_final: z.boolean().default(false),
    is_returnable: z.boolean().default(false),
    remark: z.string().optional().or(z.literal('')),
});

type CategoryFormData = z.infer<typeof categorySchema>;

interface ItemCategoryDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    category?: Category | null;
    defaultParentId?: string | null;
    onSuccess?: () => void;
}

export function ItemCategoryDialog({
    open,
    onOpenChange,
    category,
    defaultParentId,
    onSuccess,
}: ItemCategoryDialogProps) {
    const isEdit = !!category;
    const { categories, addCategory, updateCategory, isAdding, isUpdating } = useCategories();

    // Get parent categories
    // STRICT RULE: Only allow Root categories as parents. Max depth = 2.
    // Filter to show only categories that have NO parent_id (Roots)
    // AND exclude self if editing
    const parentOptions = categories.filter((c) =>
        (!c.parent_id) && // Must be a root category to be a parent
        (!category || c.id !== category.id) // Prevent circular reference
    );

    const form = useForm<CategoryFormData>({
        resolver: zodResolver(categorySchema),
        defaultValues: {
            name: '',
            parent_id: null,
            is_final: false,
            is_returnable: false,
            remark: '',
        },
    });

    useEffect(() => {
        if (category) {
            form.reset({
                name: category.name,
                parent_id: category.parent_id || null,
                is_final: category.is_final || false,
                is_returnable: category.is_returnable || false,
                remark: category.remark || '',
            });
        } else {
            form.reset({
                name: '',
                parent_id: defaultParentId || null,
                is_final: false,
                is_returnable: false,
                remark: '',
            });
        }
    }, [category, defaultParentId, form, open]);

    const onSubmit = async (data: CategoryFormData) => {
        try {
            if (isEdit && category) {
                await updateCategory.mutateAsync({
                    id: category.id,
                    updates: {
                        name: data.name,
                        parent_id: data.parent_id === 'NA' ? null : data.parent_id,
                        is_final: data.is_final,
                        is_returnable: data.is_returnable,
                        remark: data.remark || undefined,
                    },
                });
            } else {
                await addCategory.mutateAsync({
                    name: data.name,
                    parent_id: data.parent_id === 'NA' ? null : data.parent_id,
                    is_final: data.is_final,
                    is_returnable: data.is_returnable,
                    remark: data.remark || undefined,
                });
            }

            onOpenChange(false);
            onSuccess?.();
        } catch (error) {
            console.error('Error saving category:', error);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] rounded-lg">
                <DialogHeader className="border-b pb-4 bg-primary -m-6 mb-0 p-6 rounded-t-lg">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
                            <FolderTree className="h-5 w-5 text-primary-foreground" />
                        </div>
                        <DialogTitle className="text-xl text-primary-foreground">
                            {isEdit ? 'Edit Item Category' : 'Add Item Category'}
                        </DialogTitle>
                    </div>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 pt-4">
                        {/* Category Name */}
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-sm">
                                        Category Name <span className="text-destructive">*</span>
                                    </FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder="Enter category name"
                                            className="rounded-lg"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Main Category (Parent) */}
                        <FormField
                            control={form.control}
                            name="parent_id"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-sm">
                                        Main Category
                                    </FormLabel>
                                    <Select
                                        onValueChange={field.onChange}
                                        value={field.value || 'NA'}
                                    >
                                        <FormControl>
                                            <SelectTrigger className="rounded-lg">
                                                <SelectValue placeholder="Select parent category" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="NA">None (Root Category)</SelectItem>
                                            {parentOptions.map((cat) => (
                                                <SelectItem key={cat.id} value={cat.id}>
                                                    {cat.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Final Category & Returnable - Side by Side using grid-cols-12 */}
                        <div className="grid grid-cols-12 gap-4">
                            <div className="col-span-6">
                                <FormField
                                    control={form.control}
                                    name="is_final"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-sm">Final Category</FormLabel>
                                            <Select
                                                onValueChange={(v) => field.onChange(v === '1')}
                                                value={field.value ? '1' : '0'}
                                            >
                                                <FormControl>
                                                    <SelectTrigger className="rounded-lg">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="0">No</SelectItem>
                                                    <SelectItem value="1">Yes</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <div className="col-span-6">
                                <FormField
                                    control={form.control}
                                    name="is_returnable"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-sm">Returnable</FormLabel>
                                            <Select
                                                onValueChange={(v) => field.onChange(v === '1')}
                                                value={field.value ? '1' : '0'}
                                            >
                                                <FormControl>
                                                    <SelectTrigger className="rounded-lg">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="0">No</SelectItem>
                                                    <SelectItem value="1">Yes</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </div>

                        {/* Remark */}
                        <FormField
                            control={form.control}
                            name="remark"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-sm">Remark</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="Enter any remarks or notes"
                                            className="rounded-lg resize-none"
                                            rows={3}
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Dialog Footer */}
                        <DialogFooter className="pt-4 border-t">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => onOpenChange(false)}
                                className="rounded-lg"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={isAdding || isUpdating}
                                className="rounded-lg"
                            >
                                {isAdding || isUpdating ? 'Saving...' : 'Save'}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
