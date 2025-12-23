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
import * as SelectPrimitive from '@radix-ui/react-select';
import { useOpeningStock } from '@/hooks/useOpeningStock';
import { useItems } from '@/hooks/useItems';
import { useStoreLocations } from '@/hooks/useStoreLocations';

// ============================================
// Form Schema (Zod Validation)
// ============================================
const formSchema = z.object({
    item_id: z.string().min(1, 'Item is required'),
    location_id: z.string().min(1, 'Location is required'),
    batch_number: z.string().optional(),
    quantity: z.coerce.number().min(0.001, 'Quantity must be greater than 0'),
    cost_price: z.coerce.number().min(0).optional(),
});

type FormData = z.infer<typeof formSchema>;

interface AddOpeningStockDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function AddOpeningStockDialog({
    open,
    onOpenChange,
}: AddOpeningStockDialogProps) {
    // ============================================
    // Hooks
    // ============================================
    const { createOpeningStock } = useOpeningStock();
    const { items } = useItems();
    const { storeLocations } = useStoreLocations();

    // ============================================
    // Form State
    // ============================================
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
            item_id: '',
            location_id: '',
            batch_number: '',
            quantity: '' as any,
            cost_price: '' as any,
        },
    });

    const watchedItemId = watch('item_id');
    const watchedLocationId = watch('location_id');

    // ============================================
    // Reset form when dialog opens/closes
    // ============================================
    useEffect(() => {
        if (open) {
            reset({
                item_id: '',
                location_id: '',
                batch_number: '',
                quantity: '' as any,
                cost_price: '' as any,
            });
        }
    }, [open, reset]);

    // ============================================
    // Form Submission
    // ============================================
    const onSubmit = async (data: FormData) => {
        try {
            await createOpeningStock.mutateAsync({
                item_id: data.item_id,
                location_id: data.location_id,
                batch_number: data.batch_number || null,
                quantity: data.quantity,
                cost_price: data.cost_price || 0,
            });
            onOpenChange(false);
        } catch (error) {
            // Error handled by mutation
        }
    };

    // ============================================
    // Render
    // ============================================
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px]">
                {/* ============================================ */}
                {/* Dialog Header - Primary Blue Theme */}
                {/* ============================================ */}
                <DialogHeader className="bg-primary text-primary-foreground px-6 py-4 -mx-6 -mt-6 rounded-t-lg">
                    <DialogTitle className="text-lg font-semibold">Opening Stock</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 pt-4">
                    {/* ============================================ */}
                    {/* Row 1: Item Name & Location (12-column grid) */}
                    {/* ============================================ */}
                    <div className="grid grid-cols-12 gap-4">
                        {/* Item Name - 6 columns */}
                        <div className="col-span-6 space-y-2">
                            <Label className="text-sm">
                                Item Name <span className="text-destructive">*</span>
                            </Label>
                            <Select
                                value={watchedItemId}
                                onValueChange={(v) => setValue('item_id', v)}
                            >
                                <SelectTrigger className={errors.item_id ? 'border-destructive' : ''}>
                                    <SelectValue placeholder="Select Item" />
                                </SelectTrigger>
                                <SelectPrimitive.Portal>
                                    <SelectContent>
                                        {items.map((item) => (
                                            <SelectItem key={item.id} value={item.id}>
                                                {item.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </SelectPrimitive.Portal>
                            </Select>
                        </div>

                        {/* Location - 6 columns */}
                        <div className="col-span-6 space-y-2">
                            <Label className="text-sm">
                                Location <span className="text-destructive">*</span>
                            </Label>
                            <Select
                                value={watchedLocationId}
                                onValueChange={(v) => setValue('location_id', v)}
                            >
                                <SelectTrigger className={errors.location_id ? 'border-destructive' : ''}>
                                    <SelectValue placeholder="Select Location" />
                                </SelectTrigger>
                                <SelectPrimitive.Portal>
                                    <SelectContent>
                                        {storeLocations.map((loc) => (
                                            <SelectItem key={loc.id} value={loc.id}>
                                                {loc.store_name} - {loc.location}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </SelectPrimitive.Portal>
                            </Select>
                        </div>
                    </div>

                    {/* ============================================ */}
                    {/* Row 2: Batch No., Qty, Cost Price */}
                    {/* ============================================ */}
                    <div className="grid grid-cols-12 gap-4">
                        {/* Batch No. - 4 columns */}
                        <div className="col-span-4 space-y-2">
                            <Label className="text-sm">Batch No.</Label>
                            <Input
                                {...register('batch_number')}
                                placeholder="Batch No."
                            />
                        </div>

                        {/* Qty - 4 columns */}
                        <div className="col-span-4 space-y-2">
                            <Label className="text-sm">
                                Qty <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                type="number"
                                step="0.001"
                                {...register('quantity')}
                                placeholder="Qty"
                                className={errors.quantity ? 'border-destructive' : ''}
                            />
                        </div>

                        {/* Cost Price - 4 columns */}
                        <div className="col-span-4 space-y-2">
                            <Label className="text-sm">Cost Price</Label>
                            <Input
                                type="number"
                                step="0.01"
                                {...register('cost_price')}
                                placeholder="Cost Price"
                            />
                        </div>
                    </div>

                    {/* ============================================ */}
                    {/* Dialog Footer */}
                    {/* ============================================ */}
                    <DialogFooter className="pt-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                        >
                            Close
                        </Button>
                        <Button
                            type="submit"
                            disabled={createOpeningStock.isPending}
                        >
                            {createOpeningStock.isPending ? 'Saving...' : 'Save'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
