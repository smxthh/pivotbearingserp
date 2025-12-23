import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Package, Save, X } from 'lucide-react';
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
import { useHsnCodes, GST_RATES } from '@/hooks/useHsnCodes';
import { useBrandDropdown } from '@/hooks/useBrands';
import { supabase } from '@/integrations/supabase/client';
import { useDistributorId } from '@/hooks/useDistributorProfile';
import { toast } from 'sonner';
import { Item } from '@/hooks/useItems';

// Extended Units List from User Request
const PRODUCT_UNITS = [
    { value: 'BAG', label: 'Bags' },
    { value: 'BAL', label: 'Bale' },
    { value: 'BDL', label: 'Bundles' },
    { value: 'BKL', label: 'Buckles' },
    { value: 'BOU', label: 'Billions Of Units' },
    { value: 'BOX', label: 'Box' },
    { value: 'BTL', label: 'Bottles' },
    { value: 'BUN', label: 'Bunches' },
    { value: 'CAN', label: 'Cans' },
    { value: 'CTN', label: 'Cartons' },
    { value: 'CCM', label: 'Cubic centimeters' },
    { value: 'CBM', label: 'Cubic meters' },
    { value: 'CMS', label: 'Centimeters' },
    { value: 'DRM', label: 'Drums' },
    { value: 'DOZ', label: 'Dozens' },
    { value: 'GGK', label: 'Great gross GYD' },
    { value: 'GMS', label: 'Grams' },
    { value: 'GRS', label: 'Gross GMS' },
    { value: 'GYD', label: 'Gross Yards' },
    { value: 'KME', label: 'Kilometer' },
    { value: 'KGS', label: 'Kilograms' },
    { value: 'KLR', label: 'Kiloliter' },
    { value: 'MLT', label: 'Milliliter' },
    { value: 'MTR', label: 'Meters' },
    { value: 'NOS', label: 'Numbers' },
    { value: 'PAC', label: 'Packs' },
    { value: 'PCS', label: 'Pieces' },
    { value: 'PRS', label: 'Pairs' },
    { value: 'QTL', label: 'Quintal' },
    { value: 'ROL', label: 'Rolls' },
    { value: 'SQY', label: 'Square Yards' },
    { value: 'SET', label: 'Sets' },
    { value: 'SQF', label: 'Square feet' },
    { value: 'SQM', label: 'Square meters' },
    { value: 'TBS', label: 'Tablets' },
    { value: 'TUB', label: 'Tubes' },
    { value: 'TGM', label: 'Ten Gross' },
    { value: 'THD', label: 'Thousands' },
    { value: 'TON', label: 'Tons' },
    { value: 'UNT', label: 'Units' },
    { value: 'UGS', label: 'US Gallons' },
    { value: 'YDS', label: 'Yards' },
    { value: 'OTH', label: 'Others' },
    { value: 'MM', label: 'Millimetre' },
];

// Schema matching current database structure + new fields
const productSchema = z.object({
    sku: z.string().optional().or(z.literal('')),
    name: z.string().min(1, 'Item name is required').max(200),
    category_id: z.string().min(1, 'Category is required'),
    hsn_code: z.string().optional().or(z.literal('')),
    gst_percent: z.coerce.number().min(0).max(100).optional().or(z.literal('')),
    sale_price: z.coerce.number().min(0).optional().or(z.literal('')),
    mrp: z.coerce.number().min(0).optional().or(z.literal('')),
    unit: z.string().min(1, 'Unit is required'),
    min_stock_level: z.coerce.number().min(0).optional().or(z.literal('')),
    // New fields (not in DB types yet, but carried in form)
    max_stock_level: z.coerce.number().min(0).optional().or(z.literal('')),
    weight_kg: z.coerce.number().min(0).optional().or(z.literal('')),
    brand_id: z.string().optional().or(z.literal('')),
    usage_application: z.string().optional().or(z.literal('')),
    description: z.string().optional().or(z.literal('')),
});

type ProductFormData = z.infer<typeof productSchema>;

interface ProductDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    product?: Item | null;
    onSuccess?: () => void;
}

export function ProductDialog({ open, onOpenChange, product, onSuccess }: ProductDialogProps) {
    const isEdit = !!product;
    const [isSaving, setIsSaving] = useState(false);
    const { data: distributorId } = useDistributorId();
    const { options: categoryOptions } = useCategoryDropdown('product'); // Show ALL categories
    const { options: hsnOptions } = useHsnCodes();
    const { options: brandOptions } = useBrandDropdown();

    const form = useForm<ProductFormData>({
        resolver: zodResolver(productSchema),
        defaultValues: {
            sku: '',
            name: '',
            category_id: '',
            hsn_code: '',
            gst_percent: '' as any,
            sale_price: '' as any,
            mrp: '' as any,
            unit: '',
            min_stock_level: '' as any,
            max_stock_level: '' as any,
            weight_kg: '' as any,
            brand_id: '',
            usage_application: '',
            description: '',
        },
    });

    useEffect(() => {
        if (product) {
            form.reset({
                sku: product.sku || '',
                name: product.name,
                category_id: product.category_id || '',
                hsn_code: product.hsn_code || '',
                gst_percent: product.gst_percent || ('' as any),
                sale_price: product.sale_price || ('' as any),
                mrp: product.mrp || ('' as any),
                unit: product.unit || '',
                min_stock_level: product.min_stock_level || ('' as any),
                max_stock_level: (product as any).max_stock_level || ('' as any),
                weight_kg: (product as any).weight_kg || ('' as any),
                brand_id: (product as any).brand_id || '',
                usage_application: (product as any).usage_application || '',
                description: product.description || '',
            });
        } else {
            form.reset({
                sku: '',
                name: '',
                category_id: '',
                hsn_code: '',
                gst_percent: '' as any,
                sale_price: '' as any,
                mrp: '' as any,
                unit: '',
                min_stock_level: '' as any,
                max_stock_level: '' as any,
                weight_kg: '' as any,
                brand_id: '',
                usage_application: '',
                description: '',
            });
        }
    }, [product, form]);

    // Handle HSN code selection
    const handleHsnChange = (hsnCode: string) => {
        form.setValue('hsn_code', hsnCode === 'null_hsn' ? '' : hsnCode);
        const selectedHsn = hsnOptions.find((h) => h.code === hsnCode);
        if (selectedHsn) {
            form.setValue('gst_percent', selectedHsn.gstRate);
        } else if (hsnCode === 'null_hsn') {
            form.setValue('gst_percent', 0);
        }
    };

    const onSubmit = async (data: ProductFormData) => {
        if (!distributorId) {
            toast.error('Distributor profile not found');
            return;
        }

        setIsSaving(true);
        try {
            // Helper to convert empty string to number
            const toNumber = (val: number | string | undefined): number => {
                if (val === '' || val === undefined || val === null) return 0;
                return typeof val === 'string' ? parseFloat(val) || 0 : val;
            };

            const itemData = {
                distributor_id: distributorId,
                name: data.name,
                category_id: data.category_id || null,
                hsn_code: data.hsn_code || null,
                gst_percent: toNumber(data.gst_percent),
                purchase_price: 0, // Default for now
                sale_price: toNumber(data.sale_price),
                mrp: toNumber(data.mrp),
                unit: data.unit,
                min_stock_level: toNumber(data.min_stock_level),
                description: data.description || null,
                is_active: true,
                // Extra fields for future schema compatibility
                max_stock_level: toNumber(data.max_stock_level),
                weight_kg: toNumber(data.weight_kg),
                brand_id: data.brand_id === 'null_brand' || !data.brand_id ? null : data.brand_id,
                usage_application: data.usage_application === 'none' || !data.usage_application ? null : data.usage_application,
            };

            let error;
            if (isEdit && product) {
                const { error: updateError } = await supabase
                    .from('items')
                    .update({ ...itemData, sku: data.sku })
                    .eq('id', product.id);
                error = updateError;
            } else {
                // Generate SKU if empty
                const sku = data.sku || `PRD-${Date.now().toString().slice(-8)}`;
                const { error: insertError } = await supabase
                    .from('items')
                    .insert({ ...itemData, sku });
                error = insertError;
            }

            if (error) throw error;
            toast.success(isEdit ? 'Product updated successfully' : 'Product added successfully');
            onOpenChange(false);
            onSuccess?.();
        } catch (error: any) {
            console.error('Error saving product:', error);
            toast.error(`Failed to save product: ${error.message}`);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <Package className="h-5 w-5 text-primary" />
                        </div>
                        <DialogTitle className="text-xl">
                            {isEdit ? 'Edit Product' : 'Add Product'}
                        </DialogTitle>
                    </div>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-4">
                        {/* Row 1: Item Code (3) + Item Name (6) + Category (3) */}
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                            <div className="col-span-12 md:col-span-3">
                                <FormField
                                    control={form.control}
                                    name="sku"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Item Code</FormLabel>
                                            <FormControl>
                                                <Input {...field} type="text" placeholder="Item Code" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <div className="col-span-12 md:col-span-6">
                                <FormField
                                    control={form.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Item Name <span className="text-red-500">*</span></FormLabel>
                                            <FormControl>
                                                <Input {...field} placeholder="Item Name" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <div className="col-span-12 md:col-span-3">
                                <FormField
                                    control={form.control}
                                    name="category_id"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Category <span className="text-red-500">*</span></FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
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
                            </div>
                        </div>

                        {/* Row 2: HSN, GST, Price, MRP */}
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                            <div className="col-span-12 md:col-span-3">
                                <FormField
                                    control={form.control}
                                    name="hsn_code"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>HSN Code</FormLabel>
                                            <Select onValueChange={handleHsnChange} value={field.value || 'null_hsn'}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select HSN Code" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="null_hsn">Select HSN Code</SelectItem>
                                                    {hsnOptions.map((h) => (
                                                        <SelectItem key={h.code} value={h.code}>
                                                            {h.code}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <div className="col-span-12 md:col-span-3">
                                <FormField
                                    control={form.control}
                                    name="gst_percent"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>GST (%)</FormLabel>
                                            <Select
                                                onValueChange={(val) => {
                                                    field.onChange(Number(val));
                                                }}
                                                value={field.value.toString()}
                                            >
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="NILL" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {GST_RATES.map((rate) => (
                                                        <SelectItem key={rate} value={rate.toString()}>
                                                            {rate === 0 ? 'NILL' : `${rate} %`}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <div className="col-span-12 md:col-span-3">
                                <FormField
                                    control={form.control}
                                    name="sale_price"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Price <span className="text-xs text-muted-foreground">(Exc. Tax)</span></FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="number"
                                                    step="0.01"
                                                    {...field}
                                                    onWheel={(e) => e.currentTarget.blur()}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <div className="col-span-12 md:col-span-3">
                                <FormField
                                    control={form.control}
                                    name="mrp"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>M.R.P. <span className="text-xs text-muted-foreground">(Inc. Tax)</span></FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="number"
                                                    step="0.01"
                                                    {...field}
                                                    onWheel={(e) => e.currentTarget.blur()}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </div>

                        {/* Row 3: Unit, Min Stock, Max Stock, Weight */}
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                            <div className="col-span-12 md:col-span-3">
                                <FormField
                                    control={form.control}
                                    name="unit"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Unit <span className="text-red-500">*</span></FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="--" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent className="max-h-60">
                                                    {PRODUCT_UNITS.map((u) => (
                                                        <SelectItem key={u.value} value={u.value}>
                                                            [{u.value}] {u.label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <div className="col-span-12 md:col-span-3">
                                <FormField
                                    control={form.control}
                                    name="min_stock_level"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Min. Stock Qty</FormLabel>
                                            <FormControl>
                                                <Input type="number" {...field} placeholder="Min. Stock Qty" onWheel={(e) => e.currentTarget.blur()} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <div className="col-span-12 md:col-span-3">
                                <FormField
                                    control={form.control}
                                    name="max_stock_level"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Max. Stock Qty</FormLabel>
                                            <FormControl>
                                                <Input type="number" {...field} placeholder="Max. Stock Qty" onWheel={(e) => e.currentTarget.blur()} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <div className="col-span-12 md:col-span-3">
                                <FormField
                                    control={form.control}
                                    name="weight_kg"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Weight/Nos <span className="text-xs text-muted-foreground">(Kg.)</span></FormLabel>
                                            <FormControl>
                                                <Input type="number" step="0.01" {...field} placeholder="Weight" onWheel={(e) => e.currentTarget.blur()} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </div>

                        {/* Row 4: Brand, Application */}
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                            <div className="col-span-12 md:col-span-6">
                                <FormField
                                    control={form.control}
                                    name="brand_id"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Brand</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value || 'null_brand'}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select Brand" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="null_brand">Select Brand</SelectItem>
                                                    {brandOptions.map((b) => (
                                                        <SelectItem key={b.value} value={b.value}>
                                                            {b.label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <div className="col-span-12 md:col-span-6">
                                <FormField
                                    control={form.control}
                                    name="usage_application"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Application Users</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value || 'none'}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select Application Users" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="none">Select Application Users</SelectItem>
                                                    <SelectItem value="industrial">Industrial</SelectItem>
                                                    <SelectItem value="automotive">Automotive</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </div>

                        {/* Row 5: Description */}
                        <div className="grid grid-cols-1 gap-4">
                            <FormField
                                control={form.control}
                                name="description"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Product Description</FormLabel>
                                        <FormControl>
                                            <Textarea {...field} placeholder="Product Description" rows={2} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => onOpenChange(false)}
                                disabled={isSaving}
                            >
                                <X className="mr-2 h-4 w-4" />
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isSaving} className="bg-primary hover:bg-primary/90">
                                <Save className="mr-2 h-4 w-4" />
                                {isSaving ? 'Saving...' : 'Save Product'}
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
