import { useState, useEffect } from 'react';
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
import { useGateInward } from '@/hooks/useGateInward';
import { useParties } from '@/hooks/useParties';
import { usePurchaseOrders } from '@/hooks/usePurchaseOrders';
import * as SelectPrimitive from '@radix-ui/react-select';
import { GateInwardItemDialog } from './GateInwardItemDialog';
import { useVoucherPrefixesForType } from '@/hooks/useVoucherPrefixes';
import { useMemo } from 'react';

const formSchema = z.object({
    doc_prefix: z.string().min(1, 'Required'),
    doc_number: z.coerce.number().optional(), // Now optional - DB generates it
    gi_date: z.string().min(1, 'Required'),
    party_id: z.string().min(1, 'Required'),
    invoice_number: z.string().optional(),
    invoice_date: z.string().optional(),
    challan_number: z.string().optional(),
    challan_date: z.string().optional(),
    purchase_order_id: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

export interface GateInwardItem {
    item_id: string;
    item_name: string;
    location_id: string;
    location_name: string;
    batch_number: string;
    quantity: number;
    discount_percent: number;
    price: number;
    remark: string;
}

interface GateInwardDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function GateInwardDialog({
    open,
    onOpenChange,
}: GateInwardDialogProps) {
    const { createGateInwardAtomic, getNextGINumber } = useGateInward();
    const { parties } = useParties({ type: 'supplier' });
    const { purchaseOrders, getPurchaseOrderWithItems } = usePurchaseOrders();

    // Fetch prefixes
    const { prefixes: dbPrefixes, defaultPrefix: dbDefaultPrefix } = useVoucherPrefixesForType('Gate Inward');

    // Format prefixes
    // Format prefixes
    const prefixes = useMemo(() => {
        return dbPrefixes.map(p => `${p.voucher_prefix}${p.prefix_separator}`);
    }, [dbPrefixes]);

    const defaultPrefix = dbDefaultPrefix
        ? `${dbDefaultPrefix.voucher_prefix}${dbDefaultPrefix.prefix_separator}`
        : prefixes[0];

    const [items, setItems] = useState<GateInwardItem[]>([]);
    const [isItemDialogOpen, setIsItemDialogOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<GateInwardItem | null>(null);
    const [editingIndex, setEditingIndex] = useState<number>(-1);

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
            doc_prefix: 'GI/25-26/',
            doc_number: 1,
            gi_date: new Date().toISOString().split('T')[0],
            party_id: '',
            invoice_number: '',
            invoice_date: '',
            challan_number: '',
            challan_date: '',
            purchase_order_id: '',
        },
    });

    const watchedPartyId = watch('party_id');
    const watchedPOId = watch('purchase_order_id');
    const watchedPrefix = watch('doc_prefix');

    // GI number is now manually entered by user

    const selectedParty = parties?.find(p => p.id === watchedPartyId);
    const selectedPO = purchaseOrders?.find(po => po.id === watchedPOId);

    // Reset form when dialog opens/closes
    useEffect(() => {
        if (open) {
            reset({
                doc_prefix: defaultPrefix,
                doc_number: 1,
                gi_date: new Date().toISOString().split('T')[0],
            });
            setItems([]);
        }
    }, [open, reset, defaultPrefix]);

    // Preview Next Number Logic
    useEffect(() => {
        const fetchNextNumber = async () => {
            if (!open || !watchedPrefix) return;
            const nextNum = await getNextGINumber(watchedPrefix);
            setValue('doc_number', nextNum); // Update the read-only field for display
        };
        fetchNextNumber();
    }, [watchedPrefix, open, getNextGINumber, setValue]);

    // Auto-fill from PO Logic
    useEffect(() => {
        const fetchPODetails = async () => {
            if (!watchedPOId) return;

            const fullPO = await getPurchaseOrderWithItems(watchedPOId);

            if (fullPO) {
                // Set Party
                if (fullPO.party_id) {
                    setValue('party_id', fullPO.party_id);
                }

                // Set Items
                if (fullPO.items && fullPO.items.length > 0) {
                    const mappedItems: GateInwardItem[] = fullPO.items.map(poItem => ({
                        item_id: poItem.item_id || '',
                        item_name: poItem.item_name,
                        location_id: '', // User needs to select location
                        location_name: '',
                        batch_number: '',
                        quantity: poItem.quantity,
                        discount_percent: poItem.discount_percent,
                        price: poItem.price,
                        remark: poItem.remark || ''
                    }));
                    setItems(mappedItems);
                }
            }
        };

        fetchPODetails();
    }, [watchedPOId, setValue]);

    const handleAddItem = (item: GateInwardItem) => {
        if (editingIndex >= 0) {
            const updatedItems = [...items];
            updatedItems[editingIndex] = item;
            setItems(updatedItems);
            setEditingIndex(-1);
        } else {
            setItems([...items, item]);
        }
        setEditingItem(null);
        setIsItemDialogOpen(false);
    };

    const handleEditItem = (item: GateInwardItem, index: number) => {
        setEditingItem(item);
        setEditingIndex(index);
        setIsItemDialogOpen(true);
    };

    const handleDeleteItem = (index: number) => {
        setItems(items.filter((_, i) => i !== index));
    };

    const onSubmit = async (data: FormData) => {
        console.log('Form submitted with data:', data);
        console.log('Items:', items);
        console.log('Form errors:', errors);

        if (items.length === 0) {
            console.error('Cannot submit: No items added');
            return;
        }

        if (!data.party_id) {
            console.error('Cannot submit: No party selected');
            return;
        }

        try {
            // Use atomic RPC - creates header + items in single transaction
            const headerData = {
                gi_number: data.doc_prefix, // DB trigger appends atomic number
                gi_date: data.gi_date,
                party_id: data.party_id,
                invoice_number: data.invoice_number || null,
                invoice_date: data.invoice_date || null,
                challan_number: data.challan_number || null,
                challan_date: data.challan_date || null,
                purchase_order_id: data.purchase_order_id || null,
                status: 'pending',
            };

            const itemsData = items.map(item => ({
                item_id: item.item_id,
                location_id: item.location_id || null,
                batch_number: item.batch_number || null,
                quantity: item.quantity,
                discount_percent: item.discount_percent || 0,
                price: item.price || 0,
                remark: item.remark || null,
            }));

            await createGateInwardAtomic.mutateAsync({
                header: headerData as any,
                items: itemsData as any[]
            });

            console.log('Gate Inward saved atomically!');
            onOpenChange(false);
        } catch (error) {
            console.error('Error creating gate inward:', error);
            // Toast error is handled by the mutation's onError
        }
    };

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-[1000px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-semibold text-primary">
                            Gate Inward Entry
                        </DialogTitle>
                    </DialogHeader>

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                        {/* Row 1: GI No, GI Date, Party Name */}
                        <div className="grid grid-cols-12 gap-4">
                            {/* GI No - 3 columns */}
                            <div className="col-span-3 space-y-2">
                                <Label className="text-sm">GI No. <span className="text-xs text-muted-foreground">(Auto)</span></Label>
                                <div className="flex gap-1">
                                    <Select value={watchedPrefix} onValueChange={v => setValue('doc_prefix', v)}>
                                        <SelectTrigger className="w-24 px-2 text-xs">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectPrimitive.Portal>
                                            <SelectContent>
                                                {prefixes.map(p => (
                                                    <SelectItem key={p} value={p} className="text-xs">{p}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </SelectPrimitive.Portal>
                                    </Select>
                                    <Input
                                        type="number"
                                        {...register('doc_number')}
                                        className="flex-1 text-xs bg-muted"
                                        readOnly
                                        placeholder="Auto"
                                        title={`Auto-generated by server. Next likely: ${watch('doc_number')}`}
                                    />
                                </div>
                            </div>

                            {/* GI Date - 2 columns */}
                            <div className="col-span-2 space-y-2">
                                <Label className="text-sm">
                                    GI Date <span className="text-destructive">*</span>
                                </Label>
                                <Controller
                                    control={control}
                                    name="gi_date"
                                    render={({ field }) => (
                                        <DatePicker
                                            value={field.value}
                                            onChange={(date) => field.onChange(date ? format(date, 'yyyy-MM-dd') : '')}
                                        />
                                    )}
                                />
                            </div>

                            {/* Party Name - 5 columns */}
                            <div className="col-span-5 space-y-2">
                                <Label className="text-sm">
                                    Party Name <span className="text-destructive">*</span>
                                </Label>
                                <Select
                                    value={watchedPartyId}
                                    onValueChange={(v) => setValue('party_id', v)}
                                >
                                    <SelectTrigger className={errors.party_id ? 'border-destructive' : ''}>
                                        <SelectValue placeholder="Select Party" />
                                    </SelectTrigger>
                                    <SelectPrimitive.Portal>
                                        <SelectContent>
                                            {parties?.map(p => (
                                                <SelectItem key={p.id} value={p.id}>
                                                    {p.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </SelectPrimitive.Portal>
                                </Select>
                            </div>

                            {/* GST No - 2 columns */}
                            <div className="col-span-2 space-y-2">
                                <Label className="text-sm">GST NO.</Label>
                                <Input
                                    value={selectedParty?.gst_number || ''}
                                    disabled
                                    placeholder="Select GST No."
                                    className="bg-muted text-xs"
                                />
                            </div>
                        </div>

                        {/* Row 2: Invoice Details */}
                        <div className="grid grid-cols-12 gap-4">
                            {/* Invoice No - 3 columns */}
                            <div className="col-span-3 space-y-2">
                                <Label className="text-sm">Invoice No.</Label>
                                <Input
                                    {...register('invoice_number')}
                                    placeholder="Invoice No."
                                    className="text-xs"
                                />
                            </div>

                            {/* Invoice Date - 2 columns */}
                            <div className="col-span-2 space-y-2">
                                <Label className="text-sm">Invoice Date</Label>
                                <Controller
                                    control={control}
                                    name="invoice_date"
                                    render={({ field }) => (
                                        <DatePicker
                                            value={field.value}
                                            onChange={(date) => field.onChange(date ? format(date, 'yyyy-MM-dd') : '')}
                                            placeholder="Inv Date"
                                        />
                                    )}
                                />
                            </div>

                            {/* Challan No - 3 columns */}
                            <div className="col-span-3 space-y-2">
                                <Label className="text-sm">Challan No.</Label>
                                <Input
                                    {...register('challan_number')}
                                    placeholder="Challan No."
                                    className="text-xs"
                                />
                            </div>

                            {/* Challan Date - 2 columns */}
                            <div className="col-span-2 space-y-2">
                                <Label className="text-sm">Challan Date</Label>
                                <Controller
                                    control={control}
                                    name="challan_date"
                                    render={({ field }) => (
                                        <DatePicker
                                            value={field.value}
                                            onChange={(date) => field.onChange(date ? format(date, 'yyyy-MM-dd') : '')}
                                            placeholder="Chal Date"
                                        />
                                    )}
                                />
                            </div>

                            {/* Purchase Order - 2 columns */}
                            <div className="col-span-2 space-y-2">
                                <Label className="text-sm">PO No.</Label>
                                <Select
                                    value={watchedPOId}
                                    onValueChange={(v) => setValue('purchase_order_id', v)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select PO" />
                                    </SelectTrigger>
                                    <SelectPrimitive.Portal>
                                        <SelectContent>
                                            {purchaseOrders?.map(po => (
                                                <SelectItem key={po.id} value={po.id}>
                                                    {po.po_full_number}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </SelectPrimitive.Portal>
                                </Select>
                            </div>
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
                                    className="rounded-lg"
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
                                            <TableHead className="text-primary-foreground text-xs">Location</TableHead>
                                            <TableHead className="text-primary-foreground text-xs">Batch No.</TableHead>
                                            <TableHead className="text-primary-foreground text-xs text-right">Qty</TableHead>
                                            <TableHead className="text-primary-foreground text-xs text-right">Disc. %</TableHead>
                                            <TableHead className="text-primary-foreground text-xs text-right">Price</TableHead>
                                            <TableHead className="text-primary-foreground text-xs">Remark</TableHead>
                                            <TableHead className="text-primary-foreground text-xs w-20">Action</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {items.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={9} className="text-center text-sm text-muted-foreground py-8">
                                                    No data available in table
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            items.map((item, index) => (
                                                <TableRow key={index} className="hover:bg-muted/50">
                                                    <TableCell className="text-xs">{index + 1}</TableCell>
                                                    <TableCell className="text-xs font-medium">{item.item_name}</TableCell>
                                                    <TableCell className="text-xs">{item.location_name}</TableCell>
                                                    <TableCell className="text-xs">{item.batch_number}</TableCell>
                                                    <TableCell className="text-xs text-right">{item.quantity}</TableCell>
                                                    <TableCell className="text-xs text-right">{item.discount_percent || 0}%</TableCell>
                                                    <TableCell className="text-xs text-right">₹{item.price?.toFixed(2) || '0.00'}</TableCell>
                                                    <TableCell className="text-xs text-muted-foreground">{item.remark || '-'}</TableCell>
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
                                    </TableBody>
                                </Table>
                            </div>
                        </div>

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => onOpenChange(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={createGateInwardAtomic.isPending}
                            >
                                {createGateInwardAtomic.isPending ? 'Saving...' : 'Save'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Item Selection Dialog */}
            <GateInwardItemDialog
                open={isItemDialogOpen}
                onOpenChange={setIsItemDialogOpen}
                onSave={handleAddItem}
                editingItem={editingItem}
            />
        </>
    );
}
