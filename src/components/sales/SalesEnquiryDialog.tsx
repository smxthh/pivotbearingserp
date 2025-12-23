import { useState, useEffect, useMemo, useRef } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { format } from 'date-fns';
import { DatePicker } from '@/components/ui/date-picker';
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Plus, Trash2, Edit2 } from 'lucide-react';
import { useVouchers, VoucherItemInsert } from '@/hooks/useVouchers';
import { useVoucherPrefixesForType } from '@/hooks/useVoucherPrefixes';
import { EnquiryItemDialog, EnquiryItem } from './EnquiryItemDialog';
import * as SelectPrimitive from '@radix-ui/react-select';
import { supabase } from '@/integrations/supabase/client';
import { useSalesExecutives } from '@/hooks/useSalesExecutives';

const INDIAN_STATES = [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
    'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
    'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
    'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
    'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
    'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Puducherry', 'Chandigarh',
];

const formSchema = z.object({
    enq_prefix: z.string().default('ENQ/25-26/'),
    enq_number: z.coerce.number().min(1, 'Required'),
    enq_date: z.string().min(1, 'Required'),
    customer_name: z.string().min(1, 'Customer name is required'),
    gst_number: z.string().optional(),
    sales_executive_id: z.string().optional(),
    contact_person: z.string().optional(),
    contact_phone: z.string().optional(),
    contact_email: z.string().optional(),
    reference_by: z.string().optional(),
    country: z.string().default('India'),
    state: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    pincode: z.string().optional(),
    notes: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface SalesEnquiryDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function SalesEnquiryDialog({ open, onOpenChange }: SalesEnquiryDialogProps) {
    const { createVoucher, createVoucherAtomic, isCreating } = useVouchers({ realtime: false });
    const { salesExecutives } = useSalesExecutives();

    const [items, setItems] = useState<EnquiryItem[]>([]);
    const [isItemDialogOpen, setIsItemDialogOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<EnquiryItem | null>(null);
    const [editingIndex, setEditingIndex] = useState<number>(-1);

    // Ref to prevent re-running form init
    const formInitializedRef = useRef<boolean>(false);

    // Fetch prefixes from centralized system
    const { prefixes: dbPrefixes, defaultPrefix } = useVoucherPrefixesForType('Sales Enquiry');

    // Format prefixes for dropdown
    // Format prefixes for dropdown
    const enqPrefixes = useMemo(() => {
        return dbPrefixes.map(p => `${p.voucher_prefix}${p.prefix_separator}`);
    }, [dbPrefixes]);



    const {
        register,
        handleSubmit,
        reset,
        setValue,
        watch,
        control,
        formState: { errors },
    } = useForm<FormData>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            enq_prefix: 'ENQ/25-26/',
            enq_number: 1,
            enq_date: new Date().toISOString().split('T')[0],
            customer_name: '',
            gst_number: '',
            sales_executive_id: '',
            contact_person: '',
            contact_phone: '',
            contact_email: '',
            reference_by: '',
            country: 'India',
            state: '',
            address: '',
            city: '',
            pincode: '',
            notes: '',
        },
    });

    const watchedPrefix = watch('enq_prefix');

    // Document number is now manually entered by user

    // Auto-generate enquiry number on dialog open
    useEffect(() => {
        if (!open) {
            formInitializedRef.current = false;
            return;
        }

        if (formInitializedRef.current) {
            return;
        }

        const initForm = async () => {
            formInitializedRef.current = true;

            const defaultPre = defaultPrefix
                ? `${defaultPrefix.voucher_prefix}${defaultPrefix.prefix_separator}`
                : enqPrefixes[0] || 'ENQ/';

            // Reset form with defaults first
            reset({
                enq_prefix: defaultPre,
                enq_number: 1,
                enq_date: new Date().toISOString().split('T')[0],
                customer_name: '',
                gst_number: '',
                sales_executive_id: '',
                contact_person: '',
                contact_phone: '',
                contact_email: '',
                reference_by: '',
                country: 'India',
                state: '',
                address: '',
                city: '',
                pincode: '',
                notes: '',
            });
            setItems([]);

            // Fetch max enquiry number and auto-increment
            try {
                const prefixPattern = defaultPre.replace(/\//g, '/');
                const { data, error } = await supabase
                    .from('vouchers')
                    .select('voucher_number')
                    .eq('voucher_type', 'sales_enquiry')
                    .like('voucher_number', `${prefixPattern}%`)
                    .order('created_at', { ascending: false })
                    .limit(100);

                if (!error && data && data.length > 0) {
                    // Extract numbers from voucher_number
                    let maxNum = 0;
                    const regex = new RegExp(`${prefixPattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\d+)`);
                    data.forEach(v => {
                        const match = v.voucher_number?.match(regex);
                        if (match) {
                            const num = parseInt(match[1], 10);
                            if (num > maxNum) maxNum = num;
                        }
                    });
                    setValue('enq_number', maxNum + 1, { shouldDirty: false });
                } else {
                    setValue('enq_number', 1, { shouldDirty: false });
                }
            } catch (err) {
                console.error('Error fetching enquiry numbers:', err);
                setValue('enq_number', 1, { shouldDirty: false });
            }
        };

        initForm();
    }, [open, reset, setValue, defaultPrefix, enqPrefixes]);


    const handleItemSave = (item: EnquiryItem) => {
        if (editingIndex >= 0) {
            const newItems = [...items];
            newItems[editingIndex] = item;
            setItems(newItems);
            setEditingIndex(-1);
        } else {
            setItems([...items, item]);
        }
        setEditingItem(null);
    };

    const handleItemSaveAndAdd = (item: EnquiryItem) => {
        handleItemSave(item);
    };

    const handleEditItem = (item: EnquiryItem, index: number) => {
        setEditingItem(item);
        setEditingIndex(index);
        setIsItemDialogOpen(true);
    };

    const handleDeleteItem = (index: number) => {
        setItems(items.filter((_, i) => i !== index));
    };

    const onSubmit = async (data: FormData) => {
        if (items.length === 0) return;

        try {
            // Use manually entered enquiry number
            const voucherItems: VoucherItemInsert[] = items.map((item, index) => ({
                item_id: item.item_id || undefined,
                item_name: item.item_name,
                hsn_code: item.hsn_code,
                quantity: item.quantity,
                unit: item.unit,
                rate: 0,
                amount: 0,
                total_amount: 0,
                line_order: index + 1,
                brand_clearance: item.brand_clearance,
                application: item.application,
                how_old_mfg: item.how_old_mfg,
                shaft_housing: item.shaft_housing,
                old_bearing_life: item.old_bearing_life,
                fitment_tools: item.fitment_tools,
                weather_effect: item.weather_effect,
                failure_cause: item.failure_cause,
                place_of_fitment: item.place_of_fitment,
                notes: item.notes,
            }));

            await createVoucherAtomic.mutateAsync({
                voucher: {
                    voucher_type: 'sales_enquiry',
                    voucher_number: `${data.enq_prefix}${data.enq_number}`,
                    voucher_date: data.enq_date,
                    party_id: null,
                    party_name: data.customer_name,
                    gst_number: data.gst_number,
                    sales_executive_id: data.sales_executive_id || null,
                    contact_person: data.contact_person,
                    contact_phone: data.contact_phone,
                    contact_email: data.contact_email,
                    reference_by: data.reference_by,
                    country: data.country,
                    state: data.state,
                    city: data.city,
                    address: data.address,
                    pincode: data.pincode,
                    narration: data.notes,
                    total_amount: 0,
                    status: 'confirmed',
                } as any,
                items: voucherItems,
                ledgerPostings: [],
            });

            onOpenChange(false);
        } catch (error) {
            console.error('Error creating sales enquiry:', error);
        }
    };

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-[1000px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-semibold">Sales Enquiry</DialogTitle>
                    </DialogHeader>

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                        {/* Row 1: Enq No, Date, Customer Name, GST Verify */}
                        <div className="grid grid-cols-12 gap-4">
                            <div className="col-span-3 space-y-2">
                                <Label className="text-sm">Enq. No.</Label>
                                <div className="flex gap-1">
                                    <Select value={watchedPrefix} onValueChange={v => setValue('enq_prefix', v)}>
                                        <SelectTrigger className="w-24">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectPrimitive.Portal>
                                            <SelectContent>
                                                {enqPrefixes.map(p => (
                                                    <SelectItem key={p} value={p}>{p}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </SelectPrimitive.Portal>
                                    </Select>
                                    <Input
                                        type="number"
                                        {...register('enq_number')}
                                        className="w-16"
                                    />
                                </div>
                            </div>

                            <div className="col-span-2 space-y-2">
                                <Label className="text-sm">
                                    Enq. Date <span className="text-destructive">*</span>
                                </Label>
                                <Controller
                                    name="enq_date"
                                    control={control}
                                    render={({ field }) => (
                                        <DatePicker
                                            value={field.value}
                                            onChange={(date) => field.onChange(date ? format(date, 'yyyy-MM-dd') : '')}
                                            className={errors.enq_date ? 'border-destructive' : ''}
                                        />
                                    )}
                                />
                            </div>

                            <div className="col-span-4 space-y-2">
                                <Label className="text-sm">
                                    Customer Name <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    {...register('customer_name')}
                                    placeholder="Enter customer name"
                                    className={errors.customer_name ? 'border-destructive' : ''}
                                />
                            </div>

                            <div className="col-span-3 space-y-2">
                                <Label className="text-sm">GST Number</Label>
                                <Input
                                    {...register('gst_number')}
                                    placeholder="Enter GSTIN (optional)"
                                />
                            </div>
                        </div>

                        {/* Row 2: Sales Executive, Contact Person, Phone, Email */}
                        <div className="grid grid-cols-12 gap-4">
                            <div className="col-span-3 space-y-2">
                                <Label className="text-sm">Sales Executive</Label>
                                <Select value={watch('sales_executive_id') || ''} onValueChange={v => setValue('sales_executive_id', v)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Executive" />
                                    </SelectTrigger>
                                    <SelectPrimitive.Portal>
                                        <SelectContent>
                                            {salesExecutives.map(exec => (
                                                <SelectItem key={exec.id} value={exec.id}>
                                                    {exec.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </SelectPrimitive.Portal>
                                </Select>
                            </div>
                            <div className="col-span-3 space-y-2">
                                <Label className="text-sm">Contact Person</Label>
                                <Input {...register('contact_person')} placeholder="Contact person name" />
                            </div>
                            <div className="col-span-3 space-y-2">
                                <Label className="text-sm">Contact Phone</Label>
                                <Input {...register('contact_phone')} placeholder="Phone number" />
                            </div>
                            <div className="col-span-3 space-y-2">
                                <Label className="text-sm">Contact Email</Label>
                                <Input {...register('contact_email')} type="email" placeholder="Email address" />
                            </div>
                        </div>

                        {/* Row 3: Reference By */}
                        <div className="grid grid-cols-12 gap-4">
                            <div className="col-span-3 space-y-2">
                                <Label className="text-sm">Reference By</Label>
                                <Input {...register('reference_by')} placeholder="Reference source" />
                            </div>
                        </div>


                        {/* Row 4: Country, State, Address */}
                        <div className="grid grid-cols-12 gap-4">
                            <div className="col-span-2 space-y-2">
                                <Label className="text-sm">Country</Label>
                                <Select value={watch('country')} onValueChange={v => setValue('country', v)}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectPrimitive.Portal>
                                        <SelectContent>
                                            <SelectItem value="India">India</SelectItem>
                                            <SelectItem value="USA">USA</SelectItem>
                                            <SelectItem value="UK">UK</SelectItem>
                                            <SelectItem value="Other">Other</SelectItem>
                                        </SelectContent>
                                    </SelectPrimitive.Portal>
                                </Select>
                            </div>
                            <div className="col-span-3 space-y-2">
                                <Label className="text-sm">State</Label>
                                <Select value={watch('state') || ''} onValueChange={v => setValue('state', v)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select State" />
                                    </SelectTrigger>
                                    <SelectPrimitive.Portal>
                                        <SelectContent>
                                            {INDIAN_STATES.map(s => (
                                                <SelectItem key={s} value={s}>{s}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </SelectPrimitive.Portal>
                                </Select>
                            </div>
                            <div className="col-span-7 space-y-2">
                                <Label className="text-sm">Address</Label>
                                <Input {...register('address')} placeholder="Full address" />
                            </div>
                        </div>

                        {/* Row 4: City, Pincode */}
                        <div className="grid grid-cols-12 gap-4">
                            <div className="col-span-3 space-y-2">
                                <Label className="text-sm">City</Label>
                                <Input {...register('city')} placeholder="City" />
                            </div>
                            <div className="col-span-2 space-y-2">
                                <Label className="text-sm">Pincode</Label>
                                <Input {...register('pincode')} placeholder="Pincode" />
                            </div>
                        </div>

                        {/* Items Table */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <Label className="text-sm font-semibold">Item Details :</Label>
                                <Button
                                    type="button"
                                    size="sm"
                                    onClick={() => {
                                        setEditingItem(null);
                                        setEditingIndex(-1);
                                        setIsItemDialogOpen(true);
                                    }}
                                >
                                    <Plus className="h-4 w-4 mr-1" />
                                    Add
                                </Button>
                            </div>

                            <div className="border rounded-lg overflow-hidden">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-primary hover:bg-primary">
                                            <TableHead className="text-primary-foreground w-10">#</TableHead>
                                            <TableHead className="text-primary-foreground">Bearing Number</TableHead>
                                            <TableHead className="text-primary-foreground">Qty</TableHead>
                                            <TableHead className="text-primary-foreground">Application</TableHead>
                                            <TableHead className="text-primary-foreground">Shaft/Housing</TableHead>
                                            <TableHead className="text-primary-foreground">Fitment Tools</TableHead>
                                            <TableHead className="text-primary-foreground">Place of Fitment</TableHead>
                                            <TableHead className="text-primary-foreground">Notes</TableHead>
                                            <TableHead className="text-primary-foreground w-20">Action</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {items.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                                                    No data available in table
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            items.map((item, index) => (
                                                <TableRow key={index} className="hover:bg-muted/50">
                                                    <TableCell>{index + 1}</TableCell>
                                                    <TableCell className="font-medium">{item.item_name}</TableCell>
                                                    <TableCell>{item.quantity} {item.unit}</TableCell>
                                                    <TableCell>{item.application}</TableCell>
                                                    <TableCell>{item.shaft_housing}</TableCell>
                                                    <TableCell>{item.fitment_tools}</TableCell>
                                                    <TableCell>{item.place_of_fitment}</TableCell>
                                                    <TableCell>{item.notes}</TableCell>
                                                    <TableCell>
                                                        <div className="flex gap-1">
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-7 w-7"
                                                                onClick={() => handleEditItem(item, index)}
                                                            >
                                                                <Edit2 className="h-4 w-4" />
                                                            </Button>
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-7 w-7 text-destructive"
                                                                onClick={() => handleDeleteItem(index)}
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>

                        {/* Notes */}
                        <div className="space-y-2">
                            <Label className="text-sm">Notes</Label>
                            <Textarea
                                {...register('notes')}
                                placeholder="Additional notes or remarks"
                                rows={2}
                            />
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isCreating || createVoucherAtomic.isPending || items.length === 0}>
                                {isCreating || createVoucherAtomic.isPending ? 'Saving...' : 'Save'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <EnquiryItemDialog
                open={isItemDialogOpen}
                onOpenChange={setIsItemDialogOpen}
                onSave={handleItemSave}
                onSaveAndAdd={handleItemSaveAndAdd}
                editItem={editingItem}
            />
        </>
    );
}
