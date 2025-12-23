import { useState, useEffect, useMemo, useRef } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { DatePicker } from '@/components/ui/date-picker';
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
import { useParties } from '@/hooks/useParties';
import { useVoucherPrefixesForType } from '@/hooks/useVoucherPrefixes';
import { SearchablePartySelect } from '@/components/shared/SearchablePartySelect';
import * as SelectPrimitive from '@radix-ui/react-select';
import { DeliveryChallanItemDialog, ChallanItem } from './DeliveryChallanItemDialog';



const formSchema = z.object({
    dc_prefix: z.string().default('DC/25-26/'),
    dc_number: z.coerce.number().min(1, 'Required'),
    dc_date: z.string().min(1, 'Required'),
    party_id: z.string().min(1, 'Required'),
    po_number: z.string().optional(),
    po_date: z.string().optional(),
    transport_name: z.string().optional(),
    lr_number: z.string().optional(),
    ship_to: z.string().optional(),
    notes: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface DeliveryChallanDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    sourceOrderId?: string;
}

export function DeliveryChallanDialog({ open, onOpenChange, sourceOrderId }: DeliveryChallanDialogProps) {
    const { createVoucherAtomic, isCreating, getVoucherById, vouchers: salesQuotations, getNextVoucherNumberPreview } = useVouchers({
        voucherType: 'sales_quotation',
        realtime: false
    });
    const { parties } = useParties({ realtime: true });

    const [items, setItems] = useState<ChallanItem[]>([]);
    const [linkedQuotation, setLinkedQuotation] = useState<string>('');
    const lastLoadedQuotationRef = useRef<string>('');
    const [isItemDialogOpen, setIsItemDialogOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<ChallanItem | null>(null);
    const [editingIndex, setEditingIndex] = useState<number>(-1);

    // Fetch prefixes from centralized system
    const { prefixes: dbPrefixes, defaultPrefix } = useVoucherPrefixesForType('Delivery Challan');

    // Format prefixes for dropdown
    // Format prefixes for dropdown
    const dcPrefixes = useMemo(() => {
        return dbPrefixes.map(p => `${p.voucher_prefix}${p.prefix_separator}`);
    }, [dbPrefixes]);

    const {
        register,
        control,
        handleSubmit,
        reset,
        setValue,
        watch,
        formState: { errors },
    } = useForm<FormData>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            dc_prefix: 'DC/25-26/',
            dc_number: 1,
            dc_date: new Date().toISOString().split('T')[0],
            party_id: '',
            po_number: '',
            po_date: '',
            transport_name: '',
            lr_number: '',
            ship_to: '',
            notes: '',
        },
    });

    const watchedPartyId = watch('party_id');
    const watchedPrefix = watch('dc_prefix');

    // Document number is now manually entered by user

    const selectedParty = parties.find(p => p.id === watchedPartyId);

    // Number Preview Logic
    useEffect(() => {
        const fetchNext = async () => {
            if (!open || !watchedPrefix) return;
            const nextNum = await getNextVoucherNumberPreview(watchedPrefix);
            setValue('dc_number', nextNum);
        };
        fetchNext();
    }, [open, watchedPrefix, getNextVoucherNumberPreview, setValue]);
    // Wait, I need to implement the preview RPC properly if I promised it.
    // For now, let's proceed with atomic safety first. I'll make the field read-only and show "Auto".
    useEffect(() => {
        // Skip if quotation hasn't changed or is empty
        if (!linkedQuotation || linkedQuotation === lastLoadedQuotationRef.current) {
            return;
        }

        lastLoadedQuotationRef.current = linkedQuotation;

        getVoucherById(linkedQuotation).then(voucher => {
            if (voucher) {
                setValue('party_id', voucher.party_id || '');
                setValue('ship_to', (voucher as any).ship_to || '');
                setValue('po_number', (voucher as any).customer_po_number || '');
                setValue('po_date', (voucher as any).customer_po_date || '');
                // Load items from quotation
                if (voucher.items) {
                    const loadedItems: ChallanItem[] = voucher.items.map(item => ({
                        item_id: item.item_id || undefined,
                        item_name: item.item_name,
                        hsn_code: item.hsn_code || '',
                        quantity: item.quantity,
                        price: item.rate || 0,
                        discount: item.discount_percent || 0,
                        unit: item.unit,
                    }));
                    setItems(loadedItems);
                }
            }
        });
    }, [linkedQuotation, getVoucherById, setValue]);

    const shipToOptions = useMemo(() => {
        if (!selectedParty) return [];
        const options = [];
        if (selectedParty.address) options.push({ label: selectedParty.address, value: selectedParty.address });
        if (selectedParty.city) options.push({ label: `${selectedParty.city}, ${selectedParty.state || ''}`, value: `${selectedParty.city}, ${selectedParty.state || ''}` });
        return options;
    }, [selectedParty]);

    useEffect(() => {
        if (open && !sourceOrderId) {
            const defaultPre = defaultPrefix
                ? `${defaultPrefix.voucher_prefix}${defaultPrefix.prefix_separator}`
                : dcPrefixes[0] || 'DC/';
            reset({
                dc_prefix: defaultPre,
                dc_number: 1,
                dc_date: new Date().toISOString().split('T')[0],
                party_id: '',
                po_number: '',
                po_date: '',
                transport_name: '',
                lr_number: '',
                ship_to: '',
                notes: '',
            });
            setItems([]);
            setLinkedQuotation('');
            lastLoadedQuotationRef.current = ''; // Reset the ref when dialog opens fresh
        } else if (open && sourceOrderId) {
            setLinkedQuotation(sourceOrderId);
        }
    }, [open, reset, sourceOrderId, defaultPrefix, dcPrefixes]);

    const handleItemSave = (item: ChallanItem) => {
        if (editingIndex >= 0) {
            const newItems = [...items];
            newItems[editingIndex] = item;
            setItems(newItems);
            setEditingIndex(-1);
        } else {
            setItems([...items, item]);
        }
        setEditingItem(null);
        setIsItemDialogOpen(false);
    };

    const handleEditItem = (item: ChallanItem, index: number) => {
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
            // Use manually entered DC number
            const voucherItems: VoucherItemInsert[] = items.map((item, index) => {
                const price = item.price || 0;
                const discount = item.discount || 0;
                const discountAmount = (price * item.quantity * discount) / 100;
                const totalAmount = (price * item.quantity) - discountAmount;
                return {
                    item_id: item.item_id || undefined,
                    item_name: item.item_name,
                    hsn_code: item.hsn_code,
                    quantity: item.quantity,
                    unit: item.unit,
                    rate: price,
                    discount_percent: discount,
                    discount_amount: discountAmount,
                    amount: price * item.quantity,
                    total_amount: totalAmount,
                    line_order: index + 1,
                    remarks: item.remark || '',
                };
            });

            await createVoucherAtomic.mutateAsync({
                voucher: {
                    voucher_type: 'delivery_challan',
                    voucher_number: `${data.dc_prefix}`, // Trigger will append number
                    voucher_date: data.dc_date,
                    party_id: data.party_id,
                    party_name: selectedParty?.name || '',
                    customer_po_number: data.po_number,
                    customer_po_date: data.po_date || null,
                    transport_name: data.transport_name,
                    lr_number: data.lr_number,
                    ship_to: data.ship_to,
                    narration: data.notes,
                    total_amount: 0,
                    parent_voucher_id: linkedQuotation || null,
                    status: 'confirmed',
                } as any,
                items: voucherItems,
            });

            onOpenChange(false);
        } catch (error) {
            console.error('Error creating delivery challan:', error);
        }
    };

    const units = ['PCS', 'NOS', 'SET', 'KG', 'MTR', 'BOX'];

    // Get sales quotations for linking
    const confirmedQuotations = salesQuotations.filter(v => v.status === 'confirmed');

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-semibold">Delivery Challan</DialogTitle>
                    </DialogHeader>

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                        {/* Row 1: DC No, Date, Customer Name, + Sales Order, GST NO */}
                        <div className="grid grid-cols-12 gap-4">
                            <div className="col-span-3 space-y-2">
                                <Label className="text-sm">D.C. No.</Label>
                                <div className="flex gap-1">
                                    <Select value={watchedPrefix} onValueChange={v => setValue('dc_prefix', v)}>
                                        <SelectTrigger className="w-20">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectPrimitive.Portal>
                                            <SelectContent>
                                                {dcPrefixes.map(p => (
                                                    <SelectItem key={p} value={p}>{p}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </SelectPrimitive.Portal>
                                    </Select>
                                    <Input
                                        type="number"
                                        {...register('dc_number')}
                                        className="flex-1 bg-muted"
                                        readOnly
                                        title={`Auto-generated. Next likely: ${watch('dc_number')}`}
                                    />
                                </div>
                            </div>

                            <div className="col-span-3 space-y-2">
                                <Label className="text-sm">
                                    DC. Date <span className="text-destructive">*</span>
                                </Label>
                                <Controller
                                    control={control}
                                    name="dc_date"
                                    render={({ field }) => (
                                        <DatePicker
                                            value={field.value}
                                            onChange={(date) => field.onChange(date ? format(date, 'yyyy-MM-dd') : '')}
                                        />
                                    )}
                                />
                            </div>

                            <div className="col-span-3 space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label className="text-sm">
                                        Customer <span className="text-destructive">*</span>
                                    </Label>
                                    <a href="#" className="text-xs text-primary hover:underline">+ Add New</a>
                                </div>
                                <SearchablePartySelect
                                    value={watchedPartyId}
                                    onChange={(v) => setValue('party_id', v)}
                                    partyType="customer"
                                    placeholder="Select Customer"
                                    error={!!errors.party_id}
                                />
                            </div>

                            <div className="col-span-3 space-y-2">
                                <Label className="text-sm">GST NO.</Label>
                                <Input
                                    value={selectedParty?.gst_number || ''}
                                    disabled
                                    placeholder="Select GST No."
                                    className="bg-muted"
                                />
                            </div>
                        </div>

                        {/* Row 2: Sales Quotations, PO No, PO Date, Ship To */}
                        <div className="grid grid-cols-12 gap-4">
                            <div className="col-span-3 space-y-2">
                                <Label className="text-sm">Sales Quotations</Label>
                                <Select value={linkedQuotation || '_none_'} onValueChange={(v) => setLinkedQuotation(v === '_none_' ? '' : v)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="None" />
                                    </SelectTrigger>
                                    <SelectPrimitive.Portal>
                                        <SelectContent>
                                            <SelectItem value="_none_">None</SelectItem>
                                            {confirmedQuotations.map(q => (
                                                <SelectItem key={q.id} value={q.id}>
                                                    {q.voucher_number} - {q.party_name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </SelectPrimitive.Portal>
                                </Select>
                            </div>

                            <div className="col-span-2 space-y-2">
                                <Label className="text-sm">PO. No.</Label>
                                <Input {...register('po_number')} placeholder="PO. No." />
                            </div>

                            <div className="col-span-2 space-y-2">
                                <Label className="text-sm">PO. Date</Label>
                                <Controller
                                    control={control}
                                    name="po_date"
                                    render={({ field }) => (
                                        <DatePicker
                                            value={field.value}
                                            onChange={(date) => field.onChange(date ? format(date, 'yyyy-MM-dd') : '')}
                                        />
                                    )}
                                />
                            </div>
                            <div className="col-span-2 space-y-2">
                                <Label className="text-sm">Ship To</Label>
                                <Select value={watch('ship_to') || ''} onValueChange={v => setValue('ship_to', v)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Ship To" />
                                    </SelectTrigger>
                                    <SelectPrimitive.Portal>
                                        <SelectContent>
                                            {shipToOptions.map((opt, idx) => (
                                                <SelectItem key={idx} value={opt.value}>{opt.label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </SelectPrimitive.Portal>
                                </Select>
                            </div>

                            <div className="col-span-3 space-y-2">
                                <Label className="text-sm">Transport Name</Label>
                                <Input {...register('transport_name')} placeholder="Select Transport" />
                            </div>

                            <div className="col-span-2 space-y-2">
                                <Label className="text-sm">L.R. No.</Label>
                                <Input {...register('lr_number')} placeholder="L.R. No." />
                            </div>
                        </div>

                        {/* Row 3: Remark */}
                        <div className="grid grid-cols-12 gap-4">
                            <div className="col-span-12 space-y-2">
                                <Label className="text-sm">Remark</Label>
                                <Input {...register('notes')} placeholder="Remark" />
                            </div>
                        </div>

                        {/* Item Details */}
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

                            {/* Items Table - showing only Qty, Item Name, Unit, and Discount (if given) */}
                            <div className="border rounded-lg overflow-hidden">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-primary hover:bg-primary">
                                            <TableHead className="text-primary-foreground w-10">#</TableHead>
                                            <TableHead className="text-primary-foreground">Item Name</TableHead>
                                            <TableHead className="text-primary-foreground">Qty</TableHead>
                                            <TableHead className="text-primary-foreground">Unit</TableHead>
                                            {items.some(item => (item.discount || 0) > 0) && (
                                                <TableHead className="text-primary-foreground">Disc %</TableHead>
                                            )}
                                            <TableHead className="text-primary-foreground">Remark</TableHead>
                                            <TableHead className="text-primary-foreground w-20">Action</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {items.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                                                    No data available in table
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            items.map((item, index) => (
                                                <TableRow key={index} className="hover:bg-muted/50">
                                                    <TableCell>{index + 1}</TableCell>
                                                    <TableCell className="font-medium">{item.item_name}</TableCell>
                                                    <TableCell>{item.quantity}</TableCell>
                                                    <TableCell>{item.unit}</TableCell>
                                                    {items.some(i => (i.discount || 0) > 0) && (
                                                        <TableCell>{item.discount || 0}%</TableCell>
                                                    )}
                                                    <TableCell>{item.remark || '-'}</TableCell>
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
                                        {items.length > 0 && (
                                            <TableRow className="bg-muted/50 font-semibold">
                                                <TableCell colSpan={2}>Total</TableCell>
                                                <TableCell>{items.reduce((sum, i) => sum + i.quantity, 0)}</TableCell>
                                                <TableCell colSpan={items.some(i => (i.discount || 0) > 0) ? 4 : 3}></TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isCreating || items.length === 0}>
                                {isCreating ? 'Saving...' : 'Save'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <DeliveryChallanItemDialog
                open={isItemDialogOpen}
                onOpenChange={setIsItemDialogOpen}
                onSave={handleItemSave}
                editItem={editingItem}
            />
        </>
    );
}
