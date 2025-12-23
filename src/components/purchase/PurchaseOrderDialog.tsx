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
import * as SelectPrimitive from '@radix-ui/react-select';
import {
    usePurchaseOrders,
    PurchaseOrder,
    CreatePurchaseOrderData,
} from '@/hooks/usePurchaseOrders';
import { useVoucherPrefixesForType } from '@/hooks/useVoucherPrefixes';
import { useParties } from '@/hooks/useParties';
import { SearchablePartySelect } from '@/components/shared/SearchablePartySelect';
import { ItemSelectionDialog, InvoiceItem } from '@/components/accounting/ItemSelectionDialog';
import { supabase } from '@/integrations/supabase/client';
import { PartyDialog } from '@/components/parties/PartyDialog';

// Form schema following universal pattern
const formSchema = z.object({
    po_prefix: z.string().min(1, 'Required'),
    po_number: z.coerce.number().min(1, 'Required'),
    po_date: z.string().min(1, 'Required'),
    party_id: z.string().min(1, 'Required'),
    transport_name: z.string().optional(),
    contact_person: z.string().optional(),
    contact_number: z.string().optional(),
    delivery_address: z.string().optional(),
    gst_type: z.coerce.number().default(1),
    remark: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface PurchaseOrderDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    order?: PurchaseOrder | null;
    onSuccess?: () => void;
}

export function PurchaseOrderDialog({
    open,
    onOpenChange,
    order,
    onSuccess,
}: PurchaseOrderDialogProps) {
    const isEdit = !!order;

    const { createPurchaseOrder, createPurchaseOrderAtomic, updatePurchaseOrder, getNextPoNumber, getPurchaseOrderWithItems } =
        usePurchaseOrders();

    const { parties, refetch: refetchParties } = useParties({ realtime: true });

    // Fetch prefixes
    const { prefixes: dbPrefixes, defaultPrefix: dbDefaultPrefix } = useVoucherPrefixesForType('Purchase Order');

    // Format prefixes for dropdown
    const poPrefixes = useMemo(() => {
        return dbPrefixes.map(p => `${p.voucher_prefix}${p.prefix_separator}`);
    }, [dbPrefixes]);

    const defaultPrefix = dbDefaultPrefix
        ? `${dbDefaultPrefix.voucher_prefix}${dbDefaultPrefix.prefix_separator}`
        : poPrefixes[0];

    // State
    const [items, setItems] = useState<InvoiceItem[]>([]);
    const [isItemDialogOpen, setIsItemDialogOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<InvoiceItem | null>(null);
    const [editingIndex, setEditingIndex] = useState<number>(-1);
    const [deliveryAddresses, setDeliveryAddresses] = useState<any[]>([]);
    const [selectedAddressId, setSelectedAddressId] = useState<string>('default');
    const [useCustomAddress, setUseCustomAddress] = useState(false);
    const [isPartyDialogOpen, setIsPartyDialogOpen] = useState(false);

    // Ref to track last processed party ID to prevent double-processing
    const lastProcessedPartyIdRef = useRef<string>('');
    // Ref to store parties array to avoid realtime re-trigger
    const partiesRef = useRef<typeof parties>([]);
    // Ref to track if form has been initialized for this dialog open cycle
    const formInitializedRef = useRef<boolean>(false);

    const today = new Date().toISOString().split('T')[0];

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
            po_prefix: defaultPrefix,
            po_number: 1,
            po_date: today,
            party_id: '',
            transport_name: '',
            contact_person: '',
            contact_number: '',
            delivery_address: '',
            gst_type: 1,
            remark: '',
        },
    });

    const watchedPartyId = watch('party_id');
    const watchedPrefix = watch('po_prefix');

    // PO number is now manually entered by user
    const watchedGstType = watch('gst_type');

    // Get selected party (supplier or 'both' types)
    const selectedParty = useMemo(() =>
        parties.find(p => p.id === watchedPartyId && (p.type === 'supplier' || p.type === 'both')),
        [parties, watchedPartyId]
    );

    // Keep partiesRef in sync with parties array
    useEffect(() => {
        partiesRef.current = parties;
    }, [parties]);

    // Fetch delivery addresses and auto-fill party details when party changes
    useEffect(() => {
        // Skip if no party selected or already processed this party
        if (!watchedPartyId) {
            setDeliveryAddresses([]);
            lastProcessedPartyIdRef.current = '';
            return;
        }

        // Skip if we already processed this party ID (prevents double-triggering)
        if (lastProcessedPartyIdRef.current === watchedPartyId) {
            return;
        }

        // Find the party from the parties ref (avoids realtime re-trigger)
        const party = partiesRef.current.find(p => p.id === watchedPartyId && (p.type === 'supplier' || p.type === 'both'));
        if (!party) {
            return;
        }

        // Mark as processed
        lastProcessedPartyIdRef.current = watchedPartyId;

        // Debug: log selected party data
        console.log('Selected Party Data:', party);
        console.log('Contact Person:', (party as any).contact_person);
        console.log('Phone:', (party as any).phone);

        // Auto-fill contact person name (use party name as default)
        const contactName = (party as any).contact_person || party.name || '';
        setValue('contact_person', contactName, { shouldDirty: false });

        // Auto-fill mobile number
        const phone = (party as any).phone || '';
        setValue('contact_number', phone, { shouldDirty: false });

        // Fetch delivery addresses for this party
        const fetchAddresses = async () => {
            try {
                const { data: addresses, error } = await supabase
                    .from('party_delivery_addresses')
                    .select('*')
                    .eq('party_id', watchedPartyId)
                    .order('is_default', { ascending: false });

                if (error) throw error;

                setDeliveryAddresses(addresses || []);

                // If there's a default address, auto-fill it
                const defaultAddr = addresses?.find((a: any) => a.is_default);
                if (defaultAddr) {
                    const fullAddress = [
                        defaultAddr.address,
                        defaultAddr.city,
                        defaultAddr.district,
                        defaultAddr.state,
                        defaultAddr.pincode
                    ].filter(Boolean).join(', ');
                    setValue('delivery_address', fullAddress, { shouldDirty: false });
                    setSelectedAddressId(defaultAddr.id);
                } else if (addresses?.length > 0) {
                    // Use first address if no default
                    const firstAddr = addresses[0];
                    const fullAddress = [
                        firstAddr.address,
                        firstAddr.city,
                        firstAddr.district,
                        firstAddr.state,
                        firstAddr.pincode
                    ].filter(Boolean).join(', ');
                    setValue('delivery_address', fullAddress, { shouldDirty: false });
                    setSelectedAddressId(firstAddr.id);
                } else {
                    // Use party's primary address if no delivery addresses
                    const partyAddress = [
                        (party as any).address,
                        (party as any).city,
                        (party as any).state,
                        (party as any).pincode
                    ].filter(Boolean).join(', ');
                    setValue('delivery_address', partyAddress, { shouldDirty: false });
                    setSelectedAddressId('party_address');
                }
            } catch (error) {
                console.error('Error fetching delivery addresses:', error);
                // Fallback to party address
                const partyAddress = [
                    (party as any).address,
                    (party as any).city,
                    (party as any).state,
                    (party as any).pincode
                ].filter(Boolean).join(', ');
                setValue('delivery_address', partyAddress, { shouldDirty: false });
            }
        };

        fetchAddresses();
    }, [watchedPartyId, setValue]); // Removed 'parties' to prevent realtime re-trigger

    // Reset party tracking when dialog closes
    useEffect(() => {
        if (!open) {
            lastProcessedPartyIdRef.current = '';
        }
    }, [open]);

    // Calculate totals
    const totals = useMemo(() => {
        let subtotal = 0;
        let totalCGST = 0;
        let totalSGST = 0;
        let totalIGST = 0;

        items.forEach(item => {
            const taxableAmt = item.amount - (item.amount * item.discount_percent / 100);
            subtotal += taxableAmt;

            if (watchedGstType === 1) {
                totalCGST += item.cgst_amount;
                totalSGST += item.sgst_amount;
            } else {
                totalIGST += item.cgst_amount + item.sgst_amount;
            }
        });

        const beforeRoundOff = subtotal + totalCGST + totalSGST + totalIGST;
        const roundOff = Math.round(beforeRoundOff) - beforeRoundOff;
        const netAmount = Math.round(beforeRoundOff);

        return { subtotal, totalCGST, totalSGST, totalIGST, roundOff, netAmount };
    }, [items, watchedGstType]);

    // Format currency
    const formatCurrency = (value: number) =>
        new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 2,
        }).format(value);

    // Reset form when dialog opens - uses ref to prevent re-running on re-renders
    useEffect(() => {
        // Reset the initialized flag when dialog closes
        if (!open) {
            formInitializedRef.current = false;
            return;
        }

        // Skip if already initialized for this dialog open cycle
        if (formInitializedRef.current) {
            return;
        }

        const initForm = async () => {
            // Mark as initialized BEFORE any async operations
            formInitializedRef.current = true;

            if (order) {
                const fullOrder = await getPurchaseOrderWithItems(order.id);
                if (fullOrder) {
                    reset({
                        po_prefix: fullOrder.po_prefix,
                        po_number: fullOrder.po_number,
                        po_date: fullOrder.po_date,
                        party_id: fullOrder.party_id,
                        transport_name: fullOrder.transport_name || '',
                        contact_person: fullOrder.contact_person || '',
                        contact_number: fullOrder.contact_number || '',
                        delivery_address: fullOrder.delivery_address || '',
                        gst_type: fullOrder.gst_type,
                        remark: fullOrder.remark || '',
                    });
                    // Convert items to InvoiceItem format
                    const convertedItems: InvoiceItem[] = (fullOrder.items || []).map(item => ({
                        item_id: item.item_id || '',
                        item_name: item.item_name,
                        hsn_code: item.hsn_code || '',
                        quantity: item.quantity,
                        unit: item.unit,
                        rate: item.price,
                        amount: item.quantity * item.price,
                        discount_percent: item.discount_percent || 0,
                        gst_percent: item.gst_percent,
                        cgst_amount: item.cgst_amount,
                        sgst_amount: item.sgst_amount,
                        igst_amount: item.igst_amount || 0,
                        total_amount: item.net_amount,
                        remark: item.remark || '',
                    }));
                    setItems(convertedItems);
                }
            } else {
                // Create mode: Synchronous reset FIRST
                reset({
                    po_prefix: defaultPrefix,
                    po_number: 0, // Reset to 0 initially to match number type
                    po_date: today,
                    party_id: '',
                    transport_name: '',
                    contact_person: '',
                    contact_number: '',
                    delivery_address: '',
                    gst_type: 1,
                    remark: '',
                });
                setItems([]);

                // THEN async fetch next number and update only that field
                // This prevents the race condition where reset() wipes out party details
                try {
                    const nextNum = await getNextPoNumber(defaultPrefix);
                    setValue('po_number', nextNum, { shouldDirty: false });
                } catch (error) {
                    console.error('Error fetching PO number:', error);
                }
            }
        };

        initForm();
    }, [open, order, reset, defaultPrefix, today, getNextPoNumber, getPurchaseOrderWithItems, setValue]);

    // Handle item save (add more)
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

    // Handle item save and close
    const handleItemSaveAndClose = (item: InvoiceItem) => {
        handleItemSave(item);
        setIsItemDialogOpen(false);
    };

    // Edit item
    const handleEditItem = (item: InvoiceItem, index: number) => {
        setEditingItem(item);
        setEditingIndex(index);
        setIsItemDialogOpen(true);
    };

    // Delete item
    const handleDeleteItem = (index: number) => {
        setItems(items.filter((_, i) => i !== index));
    };

    // Submit handler
    const onSubmit = async (data: FormData) => {
        if (items.length === 0) {
            alert('Please add at least one item');
            return;
        }

        try {
            // Use manually entered PO number
            const poFullNumber = `${data.po_prefix}${data.po_number}`;

            // Convert InvoiceItem to purchase order items
            const orderItems = items.map((item, index) => ({
                item_id: item.item_id || null,
                item_name: item.item_name,
                hsn_code: item.hsn_code,
                quantity: item.quantity,
                unit: item.unit,
                price: item.rate,
                discount_percent: item.discount_percent,
                discount_amount: (item.amount * item.discount_percent) / 100,
                gst_percent: item.gst_percent,
                cgst_percent: watchedGstType === 1 ? item.gst_percent / 2 : 0,
                sgst_percent: watchedGstType === 1 ? item.gst_percent / 2 : 0,
                igst_percent: watchedGstType === 2 ? item.gst_percent : 0,
                cgst_amount: item.cgst_amount,
                sgst_amount: item.sgst_amount,
                igst_amount: watchedGstType === 2 ? item.cgst_amount + item.sgst_amount : 0,
                taxable_amount: item.amount - (item.amount * item.discount_percent) / 100,
                net_amount: item.total_amount,
                remark: item.remark,
            }));

            const orderData = {
                po_prefix: data.po_prefix,
                po_number: data.po_number,
                po_full_number: poFullNumber,
                po_date: data.po_date,
                party_id: data.party_id,
                party_gstin: selectedParty?.gst_number || '',
                transport_name: data.transport_name,
                contact_person: data.contact_person,
                contact_number: data.contact_number,
                delivery_address: data.delivery_address,
                gst_type: data.gst_type,
                remark: data.remark,
                taxable_amount: totals.subtotal,
                cgst_amount: totals.totalCGST,
                sgst_amount: totals.totalSGST,
                igst_amount: totals.totalIGST,
                round_off_amount: totals.roundOff,
                net_amount: totals.netAmount,
                items: orderItems,
            } as CreatePurchaseOrderData;

            if (isEdit && order) {
                await updatePurchaseOrder.mutateAsync({ id: order.id, data: orderData });
            } else {
                await createPurchaseOrderAtomic.mutateAsync(orderData);
            }

            onOpenChange(false);
            onSuccess?.();
        } catch (error) {
            console.error('Error saving purchase order:', error);
        }
    };

    // const poPrefixes = [defaultPrefix]; // Removed hardcoded array

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-[1000px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-semibold">
                            {isEdit ? 'Edit Purchase Order' : 'Purchase Order'}
                        </DialogTitle>
                    </DialogHeader>

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                        {/* Row 1: PO No, PO Date, Party Name, GST No */}
                        <div className="grid grid-cols-12 gap-4">
                            <div className="col-span-3 space-y-2">
                                <Label className="text-sm">PO. No.</Label>
                                <div className="flex gap-1">
                                    <Select value={watchedPrefix} onValueChange={v => setValue('po_prefix', v)}>
                                        <SelectTrigger className="w-24">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {poPrefixes.map(p => (
                                                <SelectItem key={p} value={p}>{p}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Input
                                        type="number"
                                        {...register('po_number')}
                                        className="flex-1"
                                        min={1}
                                    />
                                </div>
                            </div>

                            <div className="col-span-2 space-y-2">
                                <Label className="text-sm">
                                    PO. Date <span className="text-destructive">*</span>
                                </Label>
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

                            <div className="col-span-5 space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label className="text-sm">
                                        Party Name <span className="text-destructive">*</span>
                                    </Label>
                                    <div className="flex gap-2 text-xs">
                                        <button type="button" onClick={() => setIsPartyDialogOpen(true)} className="text-primary hover:underline">+ Add New</button>
                                    </div>
                                </div>
                                <SearchablePartySelect
                                    value={watchedPartyId}
                                    onChange={(v) => setValue('party_id', v)}
                                    partyType="supplier"
                                    placeholder="Select Party"
                                    error={!!errors.party_id}
                                />
                                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                                    <span>Cl. Balance: <span className="font-medium">{selectedParty ? formatCurrency(0) : '0'}</span></span>
                                    <span>T.O.: <span className="font-medium">0</span></span>
                                </div>
                            </div>

                            <div className="col-span-2 space-y-2">
                                <Label className="text-sm">GST NO.</Label>
                                <Input
                                    value={selectedParty?.gst_number || ''}
                                    disabled
                                    placeholder="Select GST No."
                                    className="bg-muted"
                                />
                            </div>
                        </div>

                        {/* Row 2: Transport, Contact Person, Contact No */}
                        <div className="grid grid-cols-12 gap-4">
                            <div className="col-span-4 space-y-2">
                                <Label className="text-sm">Transport Name</Label>
                                <Input {...register('transport_name')} placeholder="Transport Name" />
                            </div>

                            <div className="col-span-4 space-y-2">
                                <Label className="text-sm">Contact Person</Label>
                                <Input {...register('contact_person')} placeholder="Contact Person" />
                            </div>

                            <div className="col-span-4 space-y-2">
                                <Label className="text-sm">Contact No.</Label>
                                <Input {...register('contact_number')} placeholder="Contact No." />
                            </div>
                        </div>

                        {/* Delivery Address */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label className="text-sm">Delivery Address</Label>
                                <div className="flex items-center gap-2">
                                    {deliveryAddresses.length > 0 && (
                                        <label className="flex items-center gap-2 text-xs cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={useCustomAddress}
                                                onChange={(e) => {
                                                    setUseCustomAddress(e.target.checked);
                                                    if (e.target.checked) {
                                                        setValue('delivery_address', '');
                                                    }
                                                }}
                                                className="h-3 w-3 rounded"
                                            />
                                            <span className="text-muted-foreground">Use custom address</span>
                                        </label>
                                    )}
                                </div>
                            </div>

                            {/* Address Selection Dropdown (if addresses exist and not using custom) */}
                            {deliveryAddresses.length > 0 && !useCustomAddress && (
                                <div className="mb-2">
                                    <Select
                                        value={selectedAddressId}
                                        onValueChange={(val) => {
                                            setSelectedAddressId(val);
                                            if (val === 'party_address') {
                                                const partyAddress = [
                                                    (selectedParty as any)?.address,
                                                    (selectedParty as any)?.city,
                                                    (selectedParty as any)?.state,
                                                    (selectedParty as any)?.pincode
                                                ].filter(Boolean).join(', ');
                                                setValue('delivery_address', partyAddress);
                                            } else {
                                                const addr = deliveryAddresses.find(a => a.id === val);
                                                if (addr) {
                                                    const fullAddress = [
                                                        addr.address,
                                                        addr.city,
                                                        addr.district,
                                                        addr.state,
                                                        addr.pincode
                                                    ].filter(Boolean).join(', ');
                                                    setValue('delivery_address', fullAddress);
                                                }
                                            }
                                        }}
                                    >
                                        <SelectTrigger className="w-full bg-blue-50/50 border-blue-200">
                                            <SelectValue placeholder="Select delivery address" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="party_address">
                                                📍 Party Primary Address
                                            </SelectItem>
                                            {deliveryAddresses.map((addr: any) => (
                                                <SelectItem key={addr.id} value={addr.id}>
                                                    {addr.is_default && '⭐ '}{addr.ship_to} - {addr.city || addr.district || addr.state}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            <Input
                                {...register('delivery_address')}
                                placeholder="Delivery Address"
                                disabled={deliveryAddresses.length > 0 && !useCustomAddress}
                                className={deliveryAddresses.length > 0 && !useCustomAddress ? "bg-muted" : ""}
                            />
                        </div>

                        {/* Item Details Section */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <Label className="text-sm font-medium">Item Details :</Label>
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
                                            <TableHead className="text-primary-foreground text-xs w-10">#</TableHead>
                                            <TableHead className="text-primary-foreground text-xs">Item Name</TableHead>
                                            <TableHead className="text-primary-foreground text-xs">HSN Code</TableHead>
                                            <TableHead className="text-primary-foreground text-xs text-right">Qty</TableHead>
                                            <TableHead className="text-primary-foreground text-xs">UOM</TableHead>
                                            <TableHead className="text-primary-foreground text-xs text-right">Price</TableHead>
                                            <TableHead className="text-primary-foreground text-xs text-right">Disc.</TableHead>
                                            {watchedGstType === 1 ? (
                                                <>
                                                    <TableHead className="text-primary-foreground text-xs text-right">CGST</TableHead>
                                                    <TableHead className="text-primary-foreground text-xs text-right">SGST</TableHead>
                                                </>
                                            ) : (
                                                <TableHead className="text-primary-foreground text-xs text-right">IGST</TableHead>
                                            )}
                                            <TableHead className="text-primary-foreground text-xs text-right">Amount</TableHead>
                                            <TableHead className="text-primary-foreground text-xs">Remark</TableHead>
                                            <TableHead className="text-primary-foreground text-xs w-20">Action</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {items.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={12} className="text-center text-sm text-muted-foreground py-8">
                                                    No data available in table
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            items.map((item, index) => (
                                                <TableRow key={index} className="hover:bg-muted/50">
                                                    <TableCell className="text-xs">{index + 1}</TableCell>
                                                    <TableCell className="text-xs font-medium">{item.item_name}</TableCell>
                                                    <TableCell className="text-xs">{item.hsn_code || '-'}</TableCell>
                                                    <TableCell className="text-xs text-right">{item.quantity}</TableCell>
                                                    <TableCell className="text-xs">{item.unit}</TableCell>
                                                    <TableCell className="text-xs text-right">{formatCurrency(item.rate)}</TableCell>
                                                    <TableCell className="text-xs text-right">{item.discount_percent}%</TableCell>
                                                    {watchedGstType === 1 ? (
                                                        <>
                                                            <TableCell className="text-xs text-right">{formatCurrency(item.cgst_amount)}</TableCell>
                                                            <TableCell className="text-xs text-right">{formatCurrency(item.sgst_amount)}</TableCell>
                                                        </>
                                                    ) : (
                                                        <TableCell className="text-xs text-right">{formatCurrency(item.cgst_amount + item.sgst_amount)}</TableCell>
                                                    )}
                                                    <TableCell className="text-xs text-right font-medium">{formatCurrency(item.total_amount)}</TableCell>
                                                    <TableCell className="text-xs">{item.remark || '-'}</TableCell>
                                                    <TableCell>
                                                        <div className="flex gap-1">
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-7 w-7"
                                                                onClick={() => handleEditItem(item, index)}
                                                            >
                                                                <Edit2 className="h-3 w-3" />
                                                            </Button>
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-7 w-7 text-destructive"
                                                                onClick={() => handleDeleteItem(index)}
                                                            >
                                                                <Trash2 className="h-3 w-3" />
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                        {/* Total Row */}
                                        <TableRow className="bg-muted/50 font-semibold">
                                            <TableCell colSpan={watchedGstType === 1 ? 9 : 8} className="text-right text-xs">Total</TableCell>
                                            <TableCell className="text-right text-xs">{formatCurrency(items.reduce((sum, item) => sum + item.total_amount, 0))}</TableCell>
                                            <TableCell colSpan={2}></TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </div>
                        </div>

                        {/* Summary Section */}
                        <div className="space-y-2">
                            <div className="bg-primary text-primary-foreground px-3 py-2 rounded-lg text-xs font-semibold">
                                Description
                            </div>
                            <div className="grid grid-cols-4 gap-4 text-xs">
                                {/* Sub Total */}
                                <div className="flex justify-between items-center py-1 border-b col-span-3">
                                    <span className="text-primary font-medium">Sub Total</span>
                                </div>
                                <div className="py-1 border-b text-right font-medium">
                                    {formatCurrency(totals.subtotal)}
                                </div>

                                {watchedGstType === 1 ? (
                                    <>
                                        {/* CGST */}
                                        <div className="flex justify-between items-center py-1 border-b col-span-3">
                                            <span className="text-muted-foreground">CGST</span>
                                        </div>
                                        <div className="py-1 border-b text-right font-medium">
                                            {formatCurrency(totals.totalCGST)}
                                        </div>

                                        {/* SGST */}
                                        <div className="flex justify-between items-center py-1 border-b col-span-3">
                                            <span className="text-muted-foreground">SGST</span>
                                        </div>
                                        <div className="py-1 border-b text-right font-medium">
                                            {formatCurrency(totals.totalSGST)}
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        {/* IGST */}
                                        <div className="flex justify-between items-center py-1 border-b col-span-3">
                                            <span className="text-muted-foreground">IGST</span>
                                        </div>
                                        <div className="py-1 border-b text-right font-medium">
                                            {formatCurrency(totals.totalIGST)}
                                        </div>
                                    </>
                                )}

                                {/* Rounded Off */}
                                <div className="flex justify-between items-center py-1 border-b col-span-3">
                                    <span className="text-muted-foreground">ROUNDED OFF</span>
                                </div>
                                <div className="py-1 border-b text-right font-medium">
                                    {formatCurrency(totals.roundOff)}
                                </div>

                                {/* Net Amount */}
                                <div className="bg-primary text-primary-foreground px-2 py-2 rounded flex items-center col-span-3">
                                    <span className="font-semibold">Net. Amount</span>
                                </div>
                                <div className="bg-primary text-primary-foreground px-2 py-2 rounded text-right">
                                    <span className="font-bold">{formatCurrency(totals.netAmount)}</span>
                                </div>
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
                            <Button type="submit" disabled={items.length === 0}>
                                Save
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Item Selection Dialog */}
            <ItemSelectionDialog
                open={isItemDialogOpen}
                onOpenChange={setIsItemDialogOpen}
                onSave={handleItemSave}
                onSaveAndClose={handleItemSaveAndClose}
                editItem={editingItem}
            />

            {/* Party Dialog for adding new supplier */}
            <PartyDialog
                open={isPartyDialogOpen}
                onOpenChange={setIsPartyDialogOpen}
                onSuccess={() => {
                    refetchParties();
                }}
            />
        </>
    );
}
