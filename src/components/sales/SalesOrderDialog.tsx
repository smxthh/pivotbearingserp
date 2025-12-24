import { useState, useEffect, useMemo } from 'react';
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
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
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
import { useVouchers } from '@/hooks/useVouchers';
import type { VoucherItemInsert } from '@/hooks/useVouchers';
import { useParties } from '@/hooks/useParties';
import { useVoucherPrefixesForType } from '@/hooks/useVoucherPrefixes';
import { SearchablePartySelect } from '@/components/shared/SearchablePartySelect';
import { ItemSelectionDialog, InvoiceItem } from '@/components/accounting/ItemSelectionDialog';


const formSchema = z.object({
    so_prefix: z.string().default(''),
    so_number: z.coerce.number().optional(), // Now optional - DB generates it
    so_date: z.string().min(1, 'Required'),
    customer_po_number: z.string().optional(),
    customer_po_date: z.string().optional(),
    delivery_date: z.string().optional(),
    party_id: z.string().min(1, 'Required'),
    contact_person: z.string().optional(),
    contact_phone: z.string().optional(),
    gst_type: z.string().min(1, 'Required'),
    ship_to: z.string().optional(),
    notes: z.string().optional(),
    apply_round_off: z.boolean().default(true),
});

type FormData = z.infer<typeof formSchema>;

interface SalesOrderDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    sourceQuotationId?: string;
}

export function SalesOrderDialog({ open, onOpenChange, sourceQuotationId }: SalesOrderDialogProps) {
    const { createVoucher, createVoucherAtomic, isCreating, getVoucherById, vouchers } = useVouchers({
        voucherType: 'sales_quotation',
        realtime: false
    });
    const { vouchers: existingOrders } = useVouchers({
        voucherType: 'sales_order',
        realtime: true
    });
    const { parties } = useParties({ realtime: true });

    const [items, setItems] = useState<InvoiceItem[]>([]);
    const [isItemDialogOpen, setIsItemDialogOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<InvoiceItem | null>(null);
    const [editingIndex, setEditingIndex] = useState<number>(-1);
    const [linkedQuotation, setLinkedQuotation] = useState<string>('');

    // Fetch prefixes from centralized system
    const { prefixes: dbPrefixes, defaultPrefix } = useVoucherPrefixesForType('Sales Order');

    // Format prefixes for dropdown
    // Format prefixes for dropdown
    const soPrefixes = useMemo(() => {
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
            so_prefix: 'SO/25-26/',
            so_number: 1,
            so_date: new Date().toISOString().split('T')[0],
            customer_po_number: '',
            customer_po_date: '',
            delivery_date: '',
            party_id: '',
            contact_person: '',
            contact_phone: '',
            gst_type: '',
            ship_to: '',
            notes: '',
            apply_round_off: true,
        },
    });

    const watchedPartyId = watch('party_id');
    const watchedPrefix = watch('so_prefix');

    // Document number is now manually entered by user
    const watchedApplyRoundOff = watch('apply_round_off');

    const selectedParty = parties.find(p => p.id === watchedPartyId);

    // Auto-fill contact details from selected party
    useEffect(() => {
        if (selectedParty) {
            setValue('contact_person', selectedParty.contact_person || '');
            setValue('contact_phone', selectedParty.phone || selectedParty.mobile || '');
        }
    }, [selectedParty, setValue]);

    // Load from source quotation
    useEffect(() => {
        if (linkedQuotation) {
            getVoucherById(linkedQuotation).then(voucher => {
                if (voucher) {
                    setValue('party_id', voucher.party_id || '');
                    setValue('gst_type', (voucher as any).gst_type || '');
                    // Load items from quotation
                    if (voucher.items) {
                        const loadedItems: InvoiceItem[] = voucher.items.map(item => ({
                            item_id: item.item_id || undefined,
                            item_name: item.item_name,
                            hsn_code: item.hsn_code || '',
                            quantity: item.quantity,
                            unit: item.unit,
                            rate: item.rate,
                            amount: item.amount,
                            discount_percent: item.discount_percent,
                            gst_percent: item.gst_percent,
                            cgst_amount: item.cgst_amount,
                            sgst_amount: item.sgst_amount,
                            igst_amount: item.igst_amount,
                            total_amount: item.total_amount,
                            remark: (item as any).remarks || '',
                        }));
                        setItems(loadedItems);
                    }
                }
            });
        }
    }, [linkedQuotation, getVoucherById, setValue]);

    const shipToOptions = useMemo(() => {
        if (!selectedParty) return [];
        const options = [];
        if (selectedParty.address) options.push({ label: selectedParty.address, value: selectedParty.address });
        if (selectedParty.city) options.push({ label: `${selectedParty.city}, ${selectedParty.state || ''}`, value: `${selectedParty.city}, ${selectedParty.state || ''}` });
        return options;
    }, [selectedParty]);

    const totals = useMemo(() => {
        let subtotal = 0;
        let totalCGST = 0;
        let totalSGST = 0;
        let totalIGST = 0;

        items.forEach(item => {
            const taxable = item.amount - (item.amount * item.discount_percent / 100);
            subtotal += taxable;
            totalCGST += item.cgst_amount;
            totalSGST += item.sgst_amount;
            totalIGST += item.igst_amount || 0;
        });

        const totalTax = totalCGST + totalSGST + totalIGST;
        const beforeRoundOff = subtotal + totalTax;
        const roundOff = watchedApplyRoundOff ? Math.round(beforeRoundOff) - beforeRoundOff : 0;
        const netAmount = beforeRoundOff + roundOff;

        return { subtotal, totalCGST, totalSGST, totalIGST, totalTax, roundOff, netAmount };
    }, [items, watchedApplyRoundOff]);

    const formatCurrency = (value: number) =>
        new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 2,
        }).format(value);

    useEffect(() => {
        if (open && !sourceQuotationId) {
            const defaultPre = defaultPrefix
                ? `${defaultPrefix.voucher_prefix}${defaultPrefix.prefix_separator}`
                : soPrefixes[0] || 'SO/';
            reset({
                so_prefix: defaultPre,
                so_number: 1,
                so_date: new Date().toISOString().split('T')[0],
                customer_po_number: '',
                customer_po_date: '',
                delivery_date: '',
                party_id: '',
                contact_person: '',
                contact_phone: '',
                gst_type: '',
                ship_to: '',
                notes: '',
                apply_round_off: true,
            });
            setItems([]);
            setLinkedQuotation('');
        } else if (open && sourceQuotationId) {
            setLinkedQuotation(sourceQuotationId);
        }
    }, [open, reset, sourceQuotationId, defaultPrefix, soPrefixes]);

    const handleItemSave = (item: InvoiceItem) => {
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

    const handleItemSaveAndClose = (item: InvoiceItem) => {
        handleItemSave(item);
        setIsItemDialogOpen(false);
    };

    const handleEditItem = (item: InvoiceItem, index: number) => {
        setEditingItem(item);
        setEditingIndex(index);
        setIsItemDialogOpen(true);
    };

    const handleDeleteItem = (index: number) => {
        setItems(items.filter((_, i) => i !== index));
    };

    const onSubmit = async (data: FormData) => {
        if (items.length === 0) {
            // TODO: Show error message
            return;
        }

        try {
            // Use manually entered SO number
            const voucherItems: VoucherItemInsert[] = items.map((item, index) => ({
                item_id: item.item_id || undefined,
                item_name: item.item_name,
                hsn_code: item.hsn_code,
                quantity: item.quantity,
                unit: item.unit,
                rate: item.rate,
                amount: item.amount,
                discount_percent: item.discount_percent,
                discount_amount: (item.amount * item.discount_percent) / 100,
                taxable_amount: item.amount - (item.amount * item.discount_percent) / 100,
                gst_percent: item.gst_percent,
                cgst_amount: item.cgst_amount,
                sgst_amount: item.sgst_amount,
                igst_amount: item.igst_amount || 0,
                total_amount: item.total_amount,
                line_order: index + 1,
                remarks: item.remark,
            }));

            await createVoucherAtomic.mutateAsync({
                voucher: {
                    voucher_type: 'sales_order',
                    voucher_number: data.so_prefix, // DB trigger will append atomic number
                    // inv_number: REMOVED - DB trigger generates it
                    voucher_date: data.so_date,
                    delivery_date: data.delivery_date || null,
                    customer_po_number: data.customer_po_number,
                    customer_po_date: data.customer_po_date || null,
                    party_id: data.party_id,
                    party_name: selectedParty?.name || '',
                    party_gstin: selectedParty?.gst_number,
                    contact_person: data.contact_person,
                    contact_phone: data.contact_phone,
                    gst_type: data.gst_type,
                    ship_to: data.ship_to,
                    narration: data.notes,
                    subtotal: totals.subtotal,
                    cgst_amount: totals.totalCGST,
                    sgst_amount: totals.totalSGST,
                    igst_amount: totals.totalIGST,
                    total_tax: totals.totalTax,
                    round_off: totals.roundOff,
                    total_amount: totals.netAmount,
                    parent_voucher_id: linkedQuotation || null,
                    status: 'confirmed',
                    apply_round_off: data.apply_round_off,
                } as any,
                items: voucherItems,
            });

            onOpenChange(false);
        } catch (error) {
            console.error('Error creating sales order:', error);
        }
    };

    const gstTypes = [
        'GST Local Sales',
        'GST Inter-State Sales',
        'GST Exports',
    ];

    // Get quotations for linking
    const quotations = vouchers.filter(v => v.status === 'confirmed');

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-[1100px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-semibold">Sales Order</DialogTitle>
                        <DialogDescription className="sr-only">
                            Generate a new sales order for a customer including items, delivery details, and terms.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                        {/* Row 1: SO No, Date, Customer PO, PO Date, Delivery Date */}
                        <div className="grid grid-cols-12 gap-4">
                            <div className="col-span-3 space-y-2">
                                <Label className="text-sm">S.O. No. <span className="text-xs text-muted-foreground">(Auto)</span></Label>
                                <div className="flex gap-1">
                                    <Select value={watchedPrefix} onValueChange={v => setValue('so_prefix', v)}>
                                        <SelectTrigger className="w-24">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {soPrefixes.map(p => (
                                                <SelectItem key={p} value={p}>{p}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Input
                                        type="number"
                                        {...register('so_number')}
                                        className="flex-1 bg-muted"
                                        readOnly
                                        placeholder="Auto"
                                        title="Auto-generated by database"
                                    />
                                </div>
                            </div>

                            <div className="col-span-2 space-y-2">
                                <Label className="text-sm">
                                    SO Date <span className="text-destructive">*</span>
                                </Label>
                                <Controller
                                    control={control}
                                    name="so_date"
                                    render={({ field }) => (
                                        <DatePicker
                                            value={field.value}
                                            onChange={(date) => field.onChange(date ? format(date, 'yyyy-MM-dd') : '')}
                                        />
                                    )}
                                />
                            </div>

                            <div className="col-span-3 space-y-2">
                                <Label className="text-sm">Customer PO & Date</Label>
                                <div className="flex gap-2">
                                    <Input
                                        {...register('customer_po_number')}
                                        placeholder="PO Number"
                                        className="flex-1"
                                    />
                                    <div className="w-32">
                                        <Controller
                                            control={control}
                                            name="customer_po_date"
                                            render={({ field }) => (
                                                <DatePicker
                                                    value={field.value}
                                                    onChange={(date) => field.onChange(date ? format(date, 'yyyy-MM-dd') : '')}
                                                    placeholder="PO Date"
                                                />
                                            )}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="col-span-2 space-y-2">
                                <Label className="text-sm">Delivery Date</Label>
                                <Controller
                                    control={control}
                                    name="delivery_date"
                                    render={({ field }) => (
                                        <DatePicker
                                            value={field.value}
                                            onChange={(date) => field.onChange(date ? format(date, 'yyyy-MM-dd') : '')}
                                        />
                                    )}
                                />
                            </div>

                            <div className="col-span-2 space-y-2">
                                <Label className="text-sm">Link Quotation</Label>
                                <Select value={linkedQuotation || '_none_'} onValueChange={(v) => setLinkedQuotation(v === '_none_' ? '' : v)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="_none_">None</SelectItem>
                                        {quotations.map(q => (
                                            <SelectItem key={q.id} value={q.id}>
                                                {q.voucher_number}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Row 2: Customer, GSTIN, GST Type */}
                        <div className="grid grid-cols-12 gap-4">
                            <div className="col-span-5 space-y-2">
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
                                <Label className="text-sm">GSTIN</Label>
                                <Input
                                    value={selectedParty?.gst_number || ''}
                                    disabled
                                    className="bg-muted"
                                />
                            </div>

                            <div className="col-span-4 space-y-2">
                                <Label className="text-sm">
                                    GST Type <span className="text-destructive">*</span>
                                </Label>
                                <Select value={watch('gst_type')} onValueChange={v => setValue('gst_type', v)}>
                                    <SelectTrigger className={errors.gst_type ? 'border-destructive' : ''}>
                                        <SelectValue placeholder="Select GST Type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {gstTypes.map(t => (
                                            <SelectItem key={t} value={t}>{t}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Row 3: Contact Person, Contact Phone */}
                        <div className="grid grid-cols-12 gap-4">
                            <div className="col-span-6 space-y-2">
                                <Label className="text-sm">Contact Person</Label>
                                <Input {...register('contact_person')} placeholder="Contact person name" />
                            </div>
                            <div className="col-span-6 space-y-2">
                                <Label className="text-sm">Contact No.</Label>
                                <Input {...register('contact_phone')} placeholder="Phone number" />
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
                                            <TableHead className="text-primary-foreground">Item Name</TableHead>
                                            <TableHead className="text-primary-foreground">HSN</TableHead>
                                            <TableHead className="text-primary-foreground">Qty</TableHead>
                                            <TableHead className="text-primary-foreground">Unit</TableHead>
                                            <TableHead className="text-primary-foreground">Price</TableHead>
                                            <TableHead className="text-primary-foreground">Disc%</TableHead>
                                            <TableHead className="text-primary-foreground">Taxable</TableHead>
                                            <TableHead className="text-primary-foreground">CGST%</TableHead>
                                            <TableHead className="text-primary-foreground">SGST%</TableHead>
                                            <TableHead className="text-primary-foreground">IGST%</TableHead>
                                            <TableHead className="text-primary-foreground">Amount</TableHead>
                                            <TableHead className="text-primary-foreground w-20">Action</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {items.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={13} className="text-center text-muted-foreground py-8">
                                                    No data available in table
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            items.map((item, index) => (
                                                <TableRow key={index} className="hover:bg-muted/50">
                                                    <TableCell>{index + 1}</TableCell>
                                                    <TableCell className="font-medium">{item.item_name}</TableCell>
                                                    <TableCell>{item.hsn_code}</TableCell>
                                                    <TableCell>{item.quantity}</TableCell>
                                                    <TableCell>{item.unit}</TableCell>
                                                    <TableCell>{formatCurrency(item.rate)}</TableCell>
                                                    <TableCell>{item.discount_percent}%</TableCell>
                                                    <TableCell>{formatCurrency(item.amount - (item.amount * item.discount_percent / 100))}</TableCell>
                                                    <TableCell>{item.gst_percent / 2}%</TableCell>
                                                    <TableCell>{item.gst_percent / 2}%</TableCell>
                                                    <TableCell>0%</TableCell>
                                                    <TableCell className="font-medium">{formatCurrency(item.total_amount)}</TableCell>
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
                                                <TableCell colSpan={7}>Total</TableCell>
                                                <TableCell>{formatCurrency(totals.subtotal)}</TableCell>
                                                <TableCell colSpan={3}></TableCell>
                                                <TableCell>{formatCurrency(totals.netAmount)}</TableCell>
                                                <TableCell></TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>

                        {/* Ship To & Summary */}
                        <div className="grid grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label className="text-sm">Ship To</Label>
                                    <Select value={watch('ship_to') || ''} onValueChange={v => setValue('ship_to', v)}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select Ship To Address" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {shipToOptions.length === 0 && (
                                                <SelectItem value="_none_" disabled>No addresses available</SelectItem>
                                            )}
                                            {shipToOptions.map((opt, idx) => (
                                                <SelectItem key={idx} value={opt.value}>{opt.label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-sm">Remarks</Label>
                                    <Textarea {...register('notes')} placeholder="Order remarks" rows={2} />
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="bg-primary text-primary-foreground px-3 py-1.5 rounded-t-lg text-sm font-medium">
                                    Summary
                                </div>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span>Sub Total</span>
                                        <span>{formatCurrency(totals.subtotal)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>CGST</span>
                                        <span>{formatCurrency(totals.totalCGST)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>SGST</span>
                                        <span>{formatCurrency(totals.totalSGST)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>IGST</span>
                                        <span>{formatCurrency(totals.totalIGST)}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-2">
                                            <Checkbox
                                                checked={watchedApplyRoundOff}
                                                onCheckedChange={(checked) => setValue('apply_round_off', !!checked)}
                                            />
                                            <span>Round Off</span>
                                        </div>
                                        <span>{formatCurrency(totals.roundOff)}</span>
                                    </div>
                                    <div className="flex justify-between font-semibold text-base bg-primary text-primary-foreground px-2 py-1 rounded">
                                        <span>Net Amount</span>
                                        <span>{formatCurrency(totals.netAmount)}</span>
                                    </div>
                                </div>
                            </div>
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

            <ItemSelectionDialog
                open={isItemDialogOpen}
                onOpenChange={setIsItemDialogOpen}
                onSave={handleItemSave}
                onSaveAndClose={handleItemSaveAndClose}
                editItem={editingItem}
            />
        </>
    );
}
