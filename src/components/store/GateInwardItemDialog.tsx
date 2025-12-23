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
import { useItems } from '@/hooks/useItems';
import { useStoreLocations } from '@/hooks/useStoreLocations';
import * as SelectPrimitive from '@radix-ui/react-select';
import type { GateInwardItem } from './GateInwardDialog';

const itemSchema = z.object({
    item_id: z.string().min(1, 'Item is required'),
    location_id: z.string().min(1, 'Location is required'),
    batch_number: z.string().min(1, 'Batch No. is required'),
    quantity: z.coerce.number().min(1, 'Quantity must be at least 1'),
    discount_percent: z.coerce.number().min(0).max(100).optional(),
    price: z.coerce.number().min(0).optional(),
    remark: z.string().optional(),
});

type ItemFormData = z.infer<typeof itemSchema>;

interface GateInwardItemDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSave: (item: GateInwardItem) => void;
    editingItem?: GateInwardItem | null;
}

export function GateInwardItemDialog({
    open,
    onOpenChange,
    onSave,
    editingItem,
}: GateInwardItemDialogProps) {
    const { items: allItems } = useItems();
    const { storeLocations } = useStoreLocations();

    const {
        register,
        handleSubmit,
        reset,
        setValue,
        watch,
        formState: { errors },
    } = useForm<ItemFormData>({
        resolver: zodResolver(itemSchema),
        defaultValues: {
            quantity: '' as any,
            discount_percent: '' as any,
            price: '' as any,
        },
    });

    const watchedItemId = watch('item_id');
    const watchedLocationId = watch('location_id');

    const selectedItem = allItems?.find(i => i.id === watchedItemId);
    const selectedLocation = storeLocations?.find(l => l.id === watchedLocationId);

    // Reset form when dialog opens/closes or editing item changes
    useEffect(() => {
        if (open) {
            if (editingItem) {
                reset({
                    item_id: editingItem.item_id,
                    location_id: editingItem.location_id,
                    batch_number: editingItem.batch_number,
                    quantity: editingItem.quantity,
                    discount_percent: editingItem.discount_percent || 0,
                    price: editingItem.price || 0,
                    remark: editingItem.remark || '',
                });
            } else {
                reset({
                    quantity: '' as any,
                    discount_percent: '' as any,
                    price: '' as any,
                });
            }
        }
    }, [open, editingItem, reset]);

    const onSubmit = (data: ItemFormData) => {
        const item: GateInwardItem = {
            item_id: data.item_id,
            item_name: selectedItem?.name || '',
            location_id: data.location_id,
            location_name: `${selectedLocation?.store_name} - ${selectedLocation?.location}` || '',
            batch_number: data.batch_number,
            quantity: data.quantity,
            discount_percent: data.discount_percent || 0,
            price: data.price || 0,
            remark: data.remark || '',
        };

        onSave(item);
        reset();
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle className="text-lg font-semibold text-primary">
                        {editingItem ? 'Edit Item' : 'Add Item'}
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                    {/* Row 1: Item Name & Location */}
                    <div className="grid grid-cols-2 gap-4">
                        {/* Item Name */}
                        <div className="space-y-2">
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
                                        {allItems?.map(item => (
                                            <SelectItem key={item.id} value={item.id}>
                                                {item.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </SelectPrimitive.Portal>
                            </Select>
                            {errors.item_id && (
                                <p className="text-xs text-destructive">{errors.item_id.message}</p>
                            )}
                        </div>

                        {/* Location */}
                        <div className="space-y-2">
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
                                        {storeLocations?.map(loc => (
                                            <SelectItem key={loc.id} value={loc.id}>
                                                {loc.store_name} - {loc.location}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </SelectPrimitive.Portal>
                            </Select>
                            {errors.location_id && (
                                <p className="text-xs text-destructive">{errors.location_id.message}</p>
                            )}
                        </div>
                    </div>

                    {/* Row 2: Batch & Quantity */}
                    <div className="grid grid-cols-2 gap-4">
                        {/* Batch Number */}
                        <div className="space-y-2">
                            <Label className="text-sm">
                                Batch No. <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                {...register('batch_number')}
                                placeholder="Enter Batch No."
                                className={errors.batch_number ? 'border-destructive' : ''}
                            />
                            {errors.batch_number && (
                                <p className="text-xs text-destructive">{errors.batch_number.message}</p>
                            )}
                        </div>

                        {/* Quantity */}
                        <div className="space-y-2">
                            <Label className="text-sm">
                                Quantity <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                type="number"
                                {...register('quantity')}
                                placeholder="0"
                                className={errors.quantity ? 'border-destructive' : ''}
                            />
                            {errors.quantity && (
                                <p className="text-xs text-destructive">{errors.quantity.message}</p>
                            )}
                        </div>
                    </div>

                    {/* Row 3: Discount & Price */}
                    <div className="grid grid-cols-2 gap-4">
                        {/* Discount Percent */}
                        <div className="space-y-2">
                            <Label className="text-sm">Disc. (%)</Label>
                            <Input
                                type="number"
                                step="0.01"
                                {...register('discount_percent')}
                                placeholder="0"
                                className={errors.discount_percent ? 'border-destructive' : ''}
                            />
                            {errors.discount_percent && (
                                <p className="text-xs text-destructive">{errors.discount_percent.message}</p>
                            )}
                        </div>

                        {/* Price */}
                        <div className="space-y-2">
                            <Label className="text-sm">Price</Label>
                            <Input
                                type="number"
                                step="0.01"
                                {...register('price')}
                                placeholder="0.00"
                                className={errors.price ? 'border-destructive' : ''}
                            />
                            {errors.price && (
                                <p className="text-xs text-destructive">{errors.price.message}</p>
                            )}
                        </div>
                    </div>

                    {/* Row 4: Remark */}
                    <div className="space-y-2">
                        <Label className="text-sm">Remark</Label>
                        <Input
                            {...register('remark')}
                            placeholder="Enter remark (optional)"
                        />
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                        >
                            Cancel
                        </Button>
                        <Button type="submit">
                            {editingItem ? 'Update' : 'Add'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
