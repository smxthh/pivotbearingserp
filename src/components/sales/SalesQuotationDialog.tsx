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
import { Plus, Trash2, Edit2, FileText } from 'lucide-react';
import { useVouchers, VoucherItemInsert, LedgerPostingItem } from '@/hooks/useVouchers';
import { useParties } from '@/hooks/useParties';
import { useVoucherPrefixesForType } from '@/hooks/useVoucherPrefixes';
import { SearchablePartySelect } from '@/components/shared/SearchablePartySelect';
import { ItemSelectionDialog, InvoiceItem } from '@/components/accounting/ItemSelectionDialog';
import { TermsSelectionDialog } from '@/components/shared/TermsSelectionDialog';
import * as SelectPrimitive from '@radix-ui/react-select';
import { useSalesExecutives } from '@/hooks/useSalesExecutives';

const formSchema = z.object({
    quot_prefix: z.string().default('QT/25-26/'),
    quot_number: z.coerce.number().min(1, 'Required'),
    quot_date: z.string().min(1, 'Required'),
    valid_till: z.string().optional(),
    party_id: z.string().min(1, 'Required'),
    contact_person: z.string().optional(),
    contact_phone: z.string().optional(),
    contact_email: z.string().optional(),
    address: z.string().optional(),
    pincode: z.string().optional(),
    reference_by: z.string().optional(),
    sales_executive_id: z.string().optional(),
    gst_type: z.string().min(1, 'Required'),
    tcs_percent: z.coerce.number().default(0),
    notes: z.string().optional(),
    apply_round_off: z.boolean().default(true),
});

type FormData = z.infer<typeof formSchema>;

interface SalesQuotationDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    sourceEnquiryId?: string;
}

export function SalesQuotationDialog({ open, onOpenChange, sourceEnquiryId }: SalesQuotationDialogProps) {
    const { createVoucher, createVoucherAtomic, isCreating, getVoucherById, vouchers: existingQuotations } = useVouchers({
        voucherType: 'sales_quotation',
        realtime: true
    });
    const { parties } = useParties({ realtime: true });
    const { salesExecutives } = useSalesExecutives();

    const [items, setItems] = useState<InvoiceItem[]>([]);
    const [isItemDialogOpen, setIsItemDialogOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<InvoiceItem | null>(null);
    const [editingIndex, setEditingIndex] = useState<number>(-1);
    const [termsConditions, setTermsConditions] = useState<string[]>([]);
    const [isTermsDialogOpen, setIsTermsDialogOpen] = useState(false);

    // Fetch prefixes from centralized system
    const { prefixes: dbPrefixes, defaultPrefix } = useVoucherPrefixesForType('Sales Quotation');

    // Format prefixes for dropdown
    // Format prefixes for dropdown
    const quotPrefixes = useMemo(() => {
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
            quot_prefix: 'QT/25-26/',
            quot_number: 1,
            quot_date: new Date().toISOString().split('T')[0],
            valid_till: '',
            party_id: '',
            contact_person: '',
            contact_phone: '',
            contact_email: '',
            address: '',
            pincode: '',
            reference_by: '',
            sales_executive_id: '',
            gst_type: '',
            tcs_percent: 0,
            notes: '',
            apply_round_off: true,
        },
    });

    const watchedPartyId = watch('party_id');
    const watchedPrefix = watch('quot_prefix');

    // Document number is now manually entered by user
    const watchedApplyRoundOff = watch('apply_round_off');
    const watchedTcsPercent = watch('tcs_percent');

    const selectedParty = parties.find(p => p.id === watchedPartyId);

    // Auto-fill contact details from selected party
    useEffect(() => {
        if (selectedParty) {
            setValue('contact_person', selectedParty.contact_person || '');
            setValue('contact_phone', selectedParty.phone || selectedParty.mobile || '');
            setValue('contact_email', selectedParty.email || '');
            setValue('address', selectedParty.address || '');
            setValue('pincode', selectedParty.pincode || '');
        }
    }, [selectedParty, setValue]);



    // Load from source enquiry
    useEffect(() => {
        if (open && sourceEnquiryId) {
            getVoucherById(sourceEnquiryId).then(voucher => {
                if (voucher) {
                    setValue('party_id', voucher.party_id || '');
                    setValue('reference_by', (voucher as any).reference_by || '');
                    // Load items from enquiry if needed
                }
            });
        }
    }, [open, sourceEnquiryId, getVoucherById, setValue]);

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
        const tcsAmount = (subtotal + totalTax) * (watchedTcsPercent / 100);
        const beforeRoundOff = subtotal + totalTax + tcsAmount;
        const roundOff = watchedApplyRoundOff ? Math.round(beforeRoundOff) - beforeRoundOff : 0;
        const netAmount = beforeRoundOff + roundOff;

        return { subtotal, totalCGST, totalSGST, totalIGST, totalTax, tcsAmount, roundOff, netAmount };
    }, [items, watchedApplyRoundOff, watchedTcsPercent]);

    const formatCurrency = (value: number) =>
        new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 2,
        }).format(value);

    useEffect(() => {
        if (open && !sourceEnquiryId) {
            const defaultPre = defaultPrefix
                ? `${defaultPrefix.voucher_prefix}${defaultPrefix.prefix_separator}`
                : quotPrefixes[0] || 'QT/';
            reset({
                quot_prefix: defaultPre,
                quot_number: 1,
                quot_date: new Date().toISOString().split('T')[0],
                valid_till: '',
                party_id: '',
                contact_person: '',
                contact_phone: '',
                contact_email: '',
                address: '',
                pincode: '',
                reference_by: '',
                sales_executive_id: '',
                gst_type: '',
                tcs_percent: 0,
                notes: '',
                apply_round_off: true,
            });
            setItems([]);
            setTermsConditions([]);
        }
    }, [open, reset, sourceEnquiryId, defaultPrefix, quotPrefixes]);

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
        if (items.length === 0) return;

        try {
            // Use manually entered quotation number
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
                    voucher_type: 'sales_quotation',
                    voucher_number: `${data.quot_prefix}${data.quot_number}`,
                    voucher_date: data.quot_date,
                    valid_till: data.valid_till || null,
                    party_id: data.party_id,
                    party_name: selectedParty?.name || '',
                    contact_person: data.contact_person,
                    contact_phone: data.contact_phone,
                    contact_email: data.contact_email,
                    address: data.address,
                    pincode: data.pincode,
                    reference_by: data.reference_by,
                    sales_executive_id: data.sales_executive_id || null,
                    gst_type: data.gst_type,
                    narration: data.notes,
                    subtotal: totals.subtotal,
                    cgst_amount: totals.totalCGST,
                    sgst_amount: totals.totalSGST,
                    igst_amount: totals.totalIGST,
                    total_tax: totals.totalTax,
                    tcs_percent: data.tcs_percent,
                    tcs_amount: totals.tcsAmount,
                    round_off: totals.roundOff,
                    total_amount: totals.netAmount,
                    terms_conditions: termsConditions,
                    source_enquiry_id: sourceEnquiryId || null,
                    status: 'confirmed',
                    apply_round_off: data.apply_round_off,
                } as any,
                items: voucherItems,
                ledgerPostings: [],
            });

            onOpenChange(false);
        } catch (error) {
            console.error('Error creating sales quotation:', error);
        }
    };

    const gstTypes = [
        'GST Local Sales',
        'GST Inter-State Sales',
        'GST Exports',
    ];

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-[1000px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-semibold">Sales Quotation</DialogTitle>
                        <DialogDescription className="sr-only">
                            Create a sales quotation for a potential customer with item pricing and validity terms.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                        {/* Row 1: Q No, Date, Valid Till, Customer, GSTIN */}
                        <div className="grid grid-cols-12 gap-4">
                            <div className="col-span-2 space-y-2">
                                <Label className="text-sm">Q. No.</Label>
                                <div className="flex gap-1">
                                    <Select value={watchedPrefix} onValueChange={v => setValue('quot_prefix', v)}>
                                        <SelectTrigger className="w-20">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectPrimitive.Portal>
                                            <SelectContent>
                                                {quotPrefixes.map(p => (
                                                    <SelectItem key={p} value={p}>{p}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </SelectPrimitive.Portal>
                                    </Select>
                                    <Input
                                        type="number"
                                        {...register('quot_number')}
                                        className="w-14"
                                    />
                                </div>
                            </div>

                            <div className="col-span-2 space-y-2">
                                <Label className="text-sm">
                                    Q. Date <span className="text-destructive">*</span>
                                </Label>
                                <Controller
                                    control={control}
                                    name="quot_date"
                                    render={({ field }) => (
                                        <DatePicker
                                            value={field.value}
                                            onChange={(date) => field.onChange(date ? format(date, 'yyyy-MM-dd') : '')}
                                        />
                                    )}
                                />
                            </div>

                            <div className="col-span-2 space-y-2">
                                <Label className="text-sm">Valid Till</Label>
                                <Controller
                                    control={control}
                                    name="valid_till"
                                    render={({ field }) => (
                                        <DatePicker
                                            value={field.value}
                                            onChange={(date) => field.onChange(date ? format(date, 'yyyy-MM-dd') : '')}
                                        />
                                    )}
                                />
                            </div>

                            <div className="col-span-4 space-y-2">
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

                            <div className="col-span-2 space-y-2">
                                <Label className="text-sm">GSTIN</Label>
                                <Input
                                    value={selectedParty?.gst_number || ''}
                                    disabled
                                    className="bg-muted"
                                />
                            </div>
                        </div>

                        {/* Row 2: Reference By, Sales Executive, GST Type */}
                        <div className="grid grid-cols-12 gap-4">
                            <div className="col-span-3 space-y-2">
                                <Label className="text-sm">Reference By</Label>
                                <Input {...register('reference_by')} placeholder="Reference" />
                            </div>

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

                            <div className="col-span-4 space-y-2">
                                <Label className="text-sm">
                                    GST Type <span className="text-destructive">*</span>
                                </Label>
                                <Select value={watch('gst_type')} onValueChange={v => setValue('gst_type', v)}>
                                    <SelectTrigger className={errors.gst_type ? 'border-destructive' : ''}>
                                        <SelectValue placeholder="Select GST Type" />
                                    </SelectTrigger>
                                    <SelectPrimitive.Portal>
                                        <SelectContent>
                                            {gstTypes.map(t => (
                                                <SelectItem key={t} value={t}>{t}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </SelectPrimitive.Portal>
                                </Select>
                            </div>

                            <div className="col-span-2 space-y-2">
                                <Label className="text-sm">Terms & Conditions</Label>
                                <Button 
                                    type="button" 
                                    variant="outline" 
                                    size="sm" 
                                    className="w-full"
                                    onClick={() => setIsTermsDialogOpen(true)}
                                >
                                    <FileText className="h-4 w-4 mr-1" />
                                    T&C {termsConditions.length > 0 && `(${termsConditions.length})`}
                                </Button>
                            </div>
                        </div>

                        {/* Row 3: Contact Person, Contact Phone, Contact Email */}
                        <div className="grid grid-cols-12 gap-4">
                            <div className="col-span-4 space-y-2">
                                <Label className="text-sm">Contact Person</Label>
                                <Input {...register('contact_person')} placeholder="Contact person name" />
                            </div>
                            <div className="col-span-4 space-y-2">
                                <Label className="text-sm">Contact Phone</Label>
                                <Input {...register('contact_phone')} placeholder="Phone number" />
                            </div>
                            <div className="col-span-4 space-y-2">
                                <Label className="text-sm">Contact Email</Label>
                                <Input {...register('contact_email')} type="email" placeholder="Email address" />
                            </div>
                        </div>

                        {/* Row 4: Address, Pincode */}
                        <div className="grid grid-cols-12 gap-4">
                            <div className="col-span-9 space-y-2">
                                <Label className="text-sm">Address</Label>
                                <Input {...register('address')} placeholder="Full address" />
                            </div>
                            <div className="col-span-3 space-y-2">
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
                                            <TableHead className="text-primary-foreground">Item Name</TableHead>
                                            <TableHead className="text-primary-foreground">HSN</TableHead>
                                            <TableHead className="text-primary-foreground">Qty</TableHead>
                                            <TableHead className="text-primary-foreground">Unit</TableHead>
                                            <TableHead className="text-primary-foreground">Price</TableHead>
                                            <TableHead className="text-primary-foreground">Disc%</TableHead>
                                            <TableHead className="text-primary-foreground">Taxable</TableHead>
                                            <TableHead className="text-primary-foreground">CGST</TableHead>
                                            <TableHead className="text-primary-foreground">SGST</TableHead>
                                            <TableHead className="text-primary-foreground">Total</TableHead>
                                            <TableHead className="text-primary-foreground w-20">Action</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {items.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={12} className="text-center text-muted-foreground py-8">
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
                                                    <TableCell>{formatCurrency(item.cgst_amount)}</TableCell>
                                                    <TableCell>{formatCurrency(item.sgst_amount)}</TableCell>
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
                                                <TableCell>{formatCurrency(totals.totalCGST)}</TableCell>
                                                <TableCell>{formatCurrency(totals.totalSGST)}</TableCell>
                                                <TableCell>{formatCurrency(totals.netAmount)}</TableCell>
                                                <TableCell></TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>

                        {/* Summary Section */}
                        <div className="grid grid-cols-2 gap-8">
                            <div className="space-y-2">
                                <Label className="text-sm">Notes</Label>
                                <Textarea {...register('notes')} placeholder="Remarks" rows={3} />
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
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-2">
                                            <span>TCS</span>
                                            <Input
                                                type="number"
                                                {...register('tcs_percent')}
                                                className="w-16 h-7 text-xs"
                                                step="0.01"
                                            />
                                            <span>%</span>
                                        </div>
                                        <span>{formatCurrency(totals.tcsAmount)}</span>
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

            <TermsSelectionDialog
                open={isTermsDialogOpen}
                onOpenChange={setIsTermsDialogOpen}
                selectedTerms={termsConditions}
                onTermsChange={setTermsConditions}
                termType="quotation"
            />
        </>
    );
}
