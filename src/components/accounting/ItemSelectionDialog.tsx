import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Check, ChevronsUpDown, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
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
import { useItems } from '@/hooks/useItems';
import { useCategories } from '@/hooks/useCategories';
import { useHsnMaster } from '@/hooks/useHsnMaster';
import * as SelectPrimitive from '@radix-ui/react-select';

// Form schema
const itemFormSchema = z.object({
    item_id: z.string().optional(),
    item_name: z.string().min(1, 'Item name is required'),
    quantity: z.coerce.number().min(0.001, 'Quantity required'),
    rate: z.coerce.number().min(0, 'Price required'),
    discount_percent: z.coerce.number().min(0).max(100),
    unit: z.string().default('PCS'),
    hsn_code: z.string().optional(),
    gst_percent: z.coerce.number().min(0, 'GST rate is required').max(100),
    remark: z.string().optional(),
});

type ItemFormData = z.infer<typeof itemFormSchema>;

export interface InvoiceItem {
    item_id?: string;
    item_name: string;
    quantity: number;
    rate: number;
    discount_percent: number;
    unit: string;
    hsn_code: string;
    gst_percent: number;
    remark: string;
    amount: number;
    cgst_amount: number;
    sgst_amount: number;
    igst_amount: number;
    total_amount: number;
}

interface ItemSelectionDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSave: (item: InvoiceItem) => void;
    onSaveAndClose: (item: InvoiceItem) => void;
    editItem?: InvoiceItem | null;
}

export function ItemSelectionDialog({
    open,
    onOpenChange,
    onSave,
    onSaveAndClose,
    editItem,
}: ItemSelectionDialogProps) {
    const { items: allItems } = useItems({ realtime: true });
    const { getProductCategoryIds, getServiceCategoryIds, isLoading: isCatsLoading } = useCategories({ realtime: false });
    const { hsnList, resolveHsnTax } = useHsnMaster();
    const [itemSearchOpen, setItemSearchOpen] = useState(false);
    const [isResolvingTax, setIsResolvingTax] = useState(false);

    // Filter to show BOTH products AND services (matching ProductsPage + ServiceItemsPage)
    const productCategoryIds = getProductCategoryIds();
    const serviceCategoryIds = getServiceCategoryIds();

    const items = allItems.filter((i) => {
        if (isCatsLoading) return false;
        // Include if it's EITHER a product OR a service
        const isProduct = i.category_id && productCategoryIds.has(i.category_id);
        const isService = i.category_id && serviceCategoryIds.has(i.category_id);
        return isProduct || isService;
    });

    const {
        register,
        handleSubmit,
        reset,
        setValue,
        watch,
        formState: { errors },
    } = useForm<ItemFormData>({
        resolver: zodResolver(itemFormSchema),
        defaultValues: {
            item_id: '',
            item_name: '',
            quantity: '' as any,
            rate: '' as any,
            discount_percent: '' as any,
            unit: 'PCS',
            hsn_code: '',
            gst_percent: undefined,
            remark: '',
        },
    });

    const watchedItemName = watch('item_name');
    const watchedQty = watch('quantity') || 0;
    const watchedRate = watch('rate') || 0;
    const watchedDiscount = watch('discount_percent') || 0;
    const watchedGst = watch('gst_percent') ?? 0;

    // Calculate amounts
    const calculations = useMemo(() => {
        const amount = watchedQty * watchedRate;
        const discountAmt = (amount * watchedDiscount) / 100;
        const taxableAmt = amount - discountAmt;
        const cgstAmt = (taxableAmt * (watchedGst / 2)) / 100;
        const sgstAmt = (taxableAmt * (watchedGst / 2)) / 100;
        const totalAmt = taxableAmt + cgstAmt + sgstAmt;

        return {
            amount,
            discountAmt,
            taxableAmt,
            cgstAmt,
            sgstAmt,
            totalAmt,
        };
    }, [watchedQty, watchedRate, watchedDiscount, watchedGst]);

    // Reset form when dialog opens
    useEffect(() => {
        if (open) {
            if (editItem) {
                reset({
                    item_id: editItem.item_id,
                    item_name: editItem.item_name,
                    quantity: editItem.quantity,
                    rate: editItem.rate,
                    discount_percent: editItem.discount_percent,
                    unit: editItem.unit,
                    hsn_code: editItem.hsn_code,
                    gst_percent: editItem.gst_percent,
                    remark: editItem.remark,
                });
            } else {
                reset({
                    item_id: '',
                    item_name: '',
                    quantity: '' as any,
                    rate: '' as any,
                    discount_percent: '' as any,
                    unit: 'PCS',
                    hsn_code: '',
                    gst_percent: undefined,
                    remark: '',
                });
            }
        }
    }, [open, editItem, reset]);

    // Handle item selection from dropdown - resolves tax from HSN Master (backend-authoritative)
    const handleItemSelect = async (item: any) => {
        setValue('item_id', item.id);
        setValue('item_name', item.name);
        setValue('hsn_code', item.hsn_code || '');
        setValue('unit', item.unit || 'PCS');
        setItemSearchOpen(false);

        // Resolve tax from HSN Master (SQL-first: backend decides)
        if (item.hsn_code) {
            setIsResolvingTax(true);
            try {
                const hsnInt = parseInt(item.hsn_code.replace(/\D/g, ''), 10);
                if (!isNaN(hsnInt)) {
                    const tax = await resolveHsnTax(hsnInt);
                    if (tax) {
                        setValue('gst_percent', tax.igst);
                    } else {
                        // Fallback to item's stored gst_percent if no HSN match
                        setValue('gst_percent', item.gst_percent || 0);
                    }
                } else {
                    setValue('gst_percent', item.gst_percent || 0);
                }
            } catch (err) {
                console.error('Error resolving HSN tax:', err);
                setValue('gst_percent', item.gst_percent || 0);
            } finally {
                setIsResolvingTax(false);
            }
        } else {
            setValue('gst_percent', item.gst_percent || 0);
        }
    };

    // Build invoice item from form data
    const buildInvoiceItem = (data: ItemFormData): InvoiceItem => ({
        item_id: data.item_id,
        item_name: data.item_name,
        quantity: data.quantity,
        rate: data.rate,
        discount_percent: data.discount_percent,
        unit: data.unit,
        hsn_code: data.hsn_code || '',
        gst_percent: data.gst_percent,
        remark: data.remark || '',
        amount: calculations.amount,
        cgst_amount: calculations.cgstAmt,
        sgst_amount: calculations.sgstAmt,
        igst_amount: 0,
        total_amount: calculations.totalAmt,
    });

    const handleSave = (data: ItemFormData) => {
        onSave(buildInvoiceItem(data));
        reset();
    };

    const handleSaveAndClose = (data: ItemFormData) => {
        onSaveAndClose(buildInvoiceItem(data));
    };

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 2,
        }).format(val);

    const units = ['PCS', 'KG', 'MTR', 'LTR', 'BOX', 'SET', 'NOS'];

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader className="bg-primary text-primary-foreground -mx-6 -mt-6 px-6 py-4 rounded-t-lg">
                    <DialogTitle className="text-lg font-semibold">
                        {editItem ? 'Update Item' : 'Add or Update Item'}
                    </DialogTitle>
                </DialogHeader>

                <form className="space-y-4 pt-2">
                    {/* Item Name with Search */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label className="text-sm font-medium">Item Name</Label>
                            <Button
                                type="button"
                                variant="link"
                                size="sm"
                                className="h-auto p-0 text-primary text-xs"
                            >
                                <Plus className="h-3 w-3 mr-1" />
                                Add New
                            </Button>
                        </div>
                        <Popover open={itemSearchOpen} onOpenChange={setItemSearchOpen} modal={true}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    role="combobox"
                                    className={cn(
                                        'w-full justify-between font-normal',
                                        !watchedItemName && 'text-muted-foreground',
                                        errors.item_name && 'border-destructive'
                                    )}
                                >
                                    {watchedItemName || 'Select Item Name'}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[550px] p-0" align="start">
                                <Command>
                                    <CommandInput placeholder="Search items..." />
                                    <CommandList className="max-h-[300px] overflow-y-auto">
                                        <CommandEmpty>No items found.</CommandEmpty>
                                        <CommandGroup>
                                            {items.map((item) => (
                                                <CommandItem
                                                    key={item.id}
                                                    value={item.name}
                                                    onSelect={() => handleItemSelect(item)}
                                                >
                                                    <Check
                                                        className={cn(
                                                            'mr-2 h-4 w-4',
                                                            watchedItemName === item.name
                                                                ? 'opacity-100'
                                                                : 'opacity-0'
                                                        )}
                                                    />
                                                    <div className="flex-1">
                                                        <p>{item.name}</p>
                                                        <p className="text-xs text-muted-foreground">
                                                            HSN: {item.hsn_code || 'N/A'} | ₹{item.sale_price || item.purchase_price || 0}
                                                        </p>
                                                    </div>
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                    </div>

                    {/* Row 1: Qty, Price, Disc, UOM */}
                    <div className="grid grid-cols-4 gap-4">
                        <div className="space-y-2">
                            <Label className="text-sm">
                                Qty. <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                type="number"
                                step="0.01"
                                {...register('quantity')}
                                placeholder="Qty."
                                className={errors.quantity ? 'border-destructive' : ''}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-sm">
                                Price <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                type="number"
                                step="0.01"
                                {...register('rate')}
                                placeholder="Price"
                                className={errors.rate ? 'border-destructive' : ''}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-sm">Disc. (%)</Label>
                            <Input
                                type="number"
                                step="0.01"
                                {...register('discount_percent')}
                                placeholder="Disc. (%)"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-sm">UOM</Label>
                            <Select value={watch('unit')} onValueChange={v => setValue('unit', v)}>
                                <SelectTrigger>
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
                        </div>
                    </div>

                    {/* Row 2: HSN Code, GST Per, Remark */}
                    <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label className="text-sm">HSN Code</Label>
                            <Select
                                value={watch('hsn_code') || ''}
                                onValueChange={async (v) => {
                                    setValue('hsn_code', v);
                                    // Resolve tax from HSN when HSN is selected
                                    if (v) {
                                        setIsResolvingTax(true);
                                        try {
                                            const hsnInt = parseInt(v.replace(/\D/g, ''), 10);
                                            if (!isNaN(hsnInt)) {
                                                const tax = await resolveHsnTax(hsnInt);
                                                if (tax) {
                                                    setValue('gst_percent', tax.igst);
                                                }
                                            }
                                        } catch (err) {
                                            console.error('Error resolving HSN tax:', err);
                                        } finally {
                                            setIsResolvingTax(false);
                                        }
                                    }
                                }}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select HSN Code" />
                                </SelectTrigger>
                                <SelectPrimitive.Portal>
                                    <SelectContent>
                                        {hsnList.length === 0 ? (
                                            <SelectItem value="-" disabled>No HSN codes configured</SelectItem>
                                        ) : (
                                            hsnList.map((h) => (
                                                <SelectItem key={h.id} value={String(h.hsn_from)}>
                                                    {h.hsn_from === h.hsn_to
                                                        ? h.hsn_from
                                                        : `${h.hsn_from} - ${h.hsn_to}`
                                                    } ({h.igst}%)
                                                </SelectItem>
                                            ))
                                        )}
                                    </SelectContent>
                                </SelectPrimitive.Portal>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-sm">GST (%) <span className="text-xs text-muted-foreground">(From HSN)</span></Label>
                            <Input
                                type="text"
                                value={isResolvingTax ? 'Loading...' : `${watch('gst_percent') ?? 0}%`}
                                disabled
                                className="bg-muted font-medium"
                            />
                            <p className="text-xs text-muted-foreground">Resolved from HSN Master</p>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-sm">Remark</Label>
                            <Input {...register('remark')} placeholder="Remark" />
                        </div>
                    </div>

                    {/* Amount Preview */}
                    {calculations.totalAmt > 0 && (
                        <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
                            <div className="grid grid-cols-3 gap-2 text-sm">
                                <div>
                                    <span className="text-muted-foreground">Amount:</span>
                                    <span className="ml-2 font-medium">{formatCurrency(calculations.amount)}</span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Tax:</span>
                                    <span className="ml-2 font-medium">{formatCurrency(calculations.cgstAmt + calculations.sgstAmt)}</span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Total:</span>
                                    <span className="ml-2 font-bold text-primary">{formatCurrency(calculations.totalAmt)}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    <DialogFooter className="gap-2 pt-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={handleSubmit(handleSave)}
                        >
                            Save
                        </Button>
                        <Button
                            type="button"
                            onClick={handleSubmit(handleSaveAndClose)}
                            className="bg-primary hover:bg-primary/90"
                        >
                            Save & Close
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
