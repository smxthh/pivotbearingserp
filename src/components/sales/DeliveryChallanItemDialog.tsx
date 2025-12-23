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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useItems } from '@/hooks/useItems';
import * as SelectPrimitive from '@radix-ui/react-select';

const formSchema = z.object({
    item_id: z.string().optional(),
    item_name: z.string().min(1, 'Required'),
    quantity: z.coerce.number().min(1, 'Must be at least 1'),
    price: z.coerce.number().min(0, 'Must be 0 or more'),
    discount: z.coerce.number().min(0).max(100),
    unit: z.string().min(1, 'Required'),
    remark: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

export interface ChallanItem {
    item_id?: string;
    item_name: string;
    hsn_code: string;
    quantity: number;
    price: number;
    discount: number;
    unit: string;
    remark?: string;
}

interface DeliveryChallanItemDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSave: (item: ChallanItem) => void;
    editItem?: ChallanItem | null;
}

export function DeliveryChallanItemDialog({
    open,
    onOpenChange,
    onSave,
    editItem,
}: DeliveryChallanItemDialogProps) {
    const { items } = useItems({ realtime: true });
    const [selectedItemId, setSelectedItemId] = useState<string>('');
    const [searchOpen, setSearchOpen] = useState(false);

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
            item_name: '',
            quantity: '' as any,
            price: '' as any,
            discount: '' as any,
            unit: 'PCS',
            remark: '',
        },
    });

    const watchedUnit = watch('unit');
    const watchedPrice = watch('price');
    const watchedDiscount = watch('discount');

    useEffect(() => {
        if (open) {
            if (editItem) {
                reset({
                    item_id: editItem.item_id || '',
                    item_name: editItem.item_name,
                    quantity: editItem.quantity,
                    price: editItem.price || 0,
                    discount: editItem.discount || 0,
                    unit: editItem.unit,
                    remark: editItem.remark || '',
                });
                setSelectedItemId(editItem.item_id || '');
            } else {
                reset({
                    item_id: '',
                    item_name: '',
                    quantity: '' as any,
                    price: '' as any,
                    discount: '' as any,
                    unit: 'PCS',
                    remark: '',
                });
                setSelectedItemId('');
            }
        }
    }, [open, editItem, reset]);

    const handleItemSelect = (itemId: string) => {
        setSelectedItemId(itemId);
        const selected = items.find(i => i.id === itemId);
        if (selected) {
            setValue('item_id', selected.id);
            setValue('item_name', selected.name);
            setValue('unit', selected.unit || 'PCS');
            // Fetch price from item (sale_price or purchase_price)
            setValue('price', selected.sale_price || selected.purchase_price || 0);
            setValue('discount', 0);
        }
    };

    const onSubmit = (data: FormData) => {
        const selectedItem = items.find(i => i.id === selectedItemId);
        const challanItem: ChallanItem = {
            item_id: selectedItemId || undefined,
            item_name: data.item_name,
            hsn_code: selectedItem?.hsn_code || '',
            quantity: data.quantity,
            price: data.price || 0,
            discount: data.discount || 0,
            unit: data.unit,
            remark: data.remark || '',
        };
        onSave(challanItem);
        onOpenChange(false);
    };

    const units = ['PCS', 'NOS', 'SET', 'KG', 'MTR', 'BOX'];

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle className="text-lg font-semibold">
                        {editItem ? 'Edit Item' : 'Add or Update Item'}
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    {/* Product Name */}
                    <div className="space-y-2">
                        <Label className="text-sm">
                            Product Name <span className="text-destructive">*</span>
                        </Label>
                        <Popover open={searchOpen} onOpenChange={setSearchOpen} modal={true}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={searchOpen}
                                    className={cn(
                                        "w-full justify-between",
                                        errors.item_name && "border-destructive"
                                    )}
                                >
                                    {selectedItemId && selectedItemId !== '_custom_'
                                        ? items.find((item) => item.id === selectedItemId)?.name
                                        : selectedItemId === '_custom_'
                                            ? "Custom Item (Type Below)"
                                            : "Select Product Name"}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[500px] p-0">
                                <Command>
                                    <CommandInput placeholder="Search product..." />
                                    <CommandList className="max-h-[300px] overflow-y-auto">
                                        <CommandEmpty>No product found.</CommandEmpty>
                                        <CommandGroup>
                                            <CommandItem
                                                value="_custom_"
                                                onSelect={() => {
                                                    setSelectedItemId('_custom_');
                                                    setValue('item_name', '');
                                                    setValue('unit', 'PCS');
                                                    setSearchOpen(false);
                                                }}
                                            >
                                                <Check
                                                    className={cn(
                                                        "mr-2 h-4 w-4",
                                                        selectedItemId === '_custom_' ? "opacity-100" : "opacity-0"
                                                    )}
                                                />
                                                Custom Item (Type Below)
                                            </CommandItem>
                                            {items.map((item) => (
                                                <CommandItem
                                                    key={item.id}
                                                    value={`${item.name} ${item.hsn_code || ''}`}
                                                    onSelect={() => {
                                                        handleItemSelect(item.id);
                                                        setSearchOpen(false);
                                                    }}
                                                >
                                                    <Check
                                                        className={cn(
                                                            "mr-2 h-4 w-4",
                                                            selectedItemId === item.id ? "opacity-100" : "opacity-0"
                                                        )}
                                                    />
                                                    <div className="flex flex-col">
                                                        <span className="font-medium">{item.name}</span>
                                                        <span className="text-xs text-muted-foreground">
                                                            HSN: {item.hsn_code || 'N/A'} | Unit: {item.unit || 'PCS'}
                                                        </span>
                                                    </div>
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                        {selectedItemId === '_custom_' && (
                            <Input
                                {...register('item_name')}
                                placeholder="Enter custom item name"
                                className={errors.item_name ? 'border-destructive' : ''}
                            />
                        )}
                        {errors.item_name && (
                            <p className="text-xs text-destructive">{errors.item_name.message}</p>
                        )}
                    </div>

                    {/* Row: Qty, Price, Discount %, Unit */}
                    <div className="grid grid-cols-4 gap-4">
                        <div className="space-y-2">
                            <Label className="text-sm">
                                Qty. <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                type="number"
                                {...register('quantity', { valueAsNumber: true })}
                                placeholder="Qty."
                                min={1}
                                className={errors.quantity ? 'border-destructive' : ''}
                            />
                            {errors.quantity && (
                                <p className="text-xs text-destructive">{errors.quantity.message}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label className="text-sm">
                                Price <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                type="number"
                                {...register('price', { valueAsNumber: true })}
                                placeholder="Price"
                                min={0}
                                step="0.01"
                                className={errors.price ? 'border-destructive' : ''}
                            />
                            {errors.price && (
                                <p className="text-xs text-destructive">{errors.price.message}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label className="text-sm">Discount %</Label>
                            <Input
                                type="number"
                                {...register('discount', { valueAsNumber: true })}
                                placeholder="0"
                                min={0}
                                max={100}
                                step="0.01"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-sm">
                                Unit <span className="text-destructive">*</span>
                            </Label>
                            <Select value={watchedUnit} onValueChange={v => setValue('unit', v)}>
                                <SelectTrigger className={errors.unit ? 'border-destructive' : ''}>
                                    <SelectValue placeholder="Select Unit" />
                                </SelectTrigger>
                                <SelectPrimitive.Portal>
                                    <SelectContent>
                                        {units.map(u => (
                                            <SelectItem key={u} value={u}>{u}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </SelectPrimitive.Portal>
                            </Select>
                            {errors.unit && (
                                <p className="text-xs text-destructive">{errors.unit.message}</p>
                            )}
                        </div>
                    </div>

                    {/* Remark */}
                    <div className="space-y-2">
                        <Label className="text-sm">Remark</Label>
                        <Input {...register('remark')} placeholder="Remark" />
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit">
                            {editItem ? 'Update' : 'Add'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
