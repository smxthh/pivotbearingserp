import { useState, useEffect, useMemo } from 'react';
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
import { Trash2, Plus } from 'lucide-react';
import { usePacking, PackingBatch } from '@/hooks/usePacking';
import { useItems } from '@/hooks/useItems';
import { useStoreLocations } from '@/hooks/useStoreLocations';
import { useSalesExecutives } from '@/hooks/useSalesExecutives';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import * as SelectPrimitive from '@radix-ui/react-select';
import { useVoucherPrefixesForType } from '@/hooks/useVoucherPrefixes';

const formSchema = z.object({
    doc_prefix: z.string().min(1, 'Required'),
    doc_number: z.coerce.number().min(1, 'Required'),
    pck_date: z.string().min(1, 'Required'),
    item_id: z.string().min(1, 'Required'),
    location_id: z.string().min(1, 'Required'),
    quantity: z.coerce.number().min(1, 'Required'),
    employee_id: z.string().optional(),
    remark: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface StockBatch {
    id: string;
    gi_number: string;
    batch_number: string;
    location_id: string;
    location_name: string;
    available_quantity: number;
}

interface AddPackingDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function AddPackingDialog({
    open,
    onOpenChange,
}: AddPackingDialogProps) {
    const { createPacking } = usePacking();
    const { items } = useItems();
    const { storeLocations } = useStoreLocations();
    const { salesExecutives } = useSalesExecutives();

    // Fetch prefixes
    const { prefixes: dbPrefixes, defaultPrefix: dbDefaultPrefix } = useVoucherPrefixesForType('Packing');

    // Format prefixes
    // Format prefixes
    const prefixes = useMemo(() => {
        return dbPrefixes.map(p => `${p.voucher_prefix}${p.prefix_separator}`);
    }, [dbPrefixes]);

    const defaultPrefix = dbDefaultPrefix
        ? `${dbDefaultPrefix.voucher_prefix}${dbDefaultPrefix.prefix_separator}`
        : prefixes[0];

    const [batches, setBatches] = useState<PackingBatch[]>([]);
    const [availableBatches, setAvailableBatches] = useState<StockBatch[]>([]);
    const [selectedBatchId, setSelectedBatchId] = useState<string>('');
    const [batchQuantity, setBatchQuantity] = useState<string>('');
    const [isLoadingBatches, setIsLoadingBatches] = useState(false);

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
            doc_prefix: 'PCK/25-26/',
            doc_number: 1,
            pck_date: new Date().toISOString().split('T')[0],
        },
    });

    // Register custom fields
    useEffect(() => {
        register('location_id');
        register('item_id');
        register('employee_id');
        register('doc_prefix');
    }, [register]);

    const watchedItemId = watch('item_id');
    const watchedLocationId = watch('location_id');
    const watchedEmployeeId = watch('employee_id');
    const watchedPrefix = watch('doc_prefix');

    // Document number is now manually entered by user

    // Calculate total quantity from batches
    const totalQuantity = useMemo(() => {
        return batches.reduce((sum, batch) => sum + batch.quantity, 0);
    }, [batches]);

    // Auto-populate quantity field from batches
    useEffect(() => {
        setValue('quantity', totalQuantity);
    }, [totalQuantity, setValue]);

    // Fetch available batches when item and location are selected
    const loadAvailableBatches = async () => {
        if (!watchedItemId || !watchedLocationId) {
            toast.error('Please select both Item and Location first');
            return;
        }

        setIsLoadingBatches(true);
        try {
            // Fetch available stock from view_available_packing_stock
            const { data, error } = await (supabase
                .from('view_available_packing_stock' as any) as any)
                .select(`
                    batch_number,
                    available_quantity,
                    location_id
                `)
                .eq('item_id', watchedItemId)
                .eq('location_id', watchedLocationId)
                .gt('available_quantity', 0)
                .order('batch_number', { ascending: true });

            if (error) throw error;

            const formattedBatches = (data || []).map((item: any) => ({
                id: `${item.batch_number}-${item.location_id}`,
                gi_number: '',
                batch_number: item.batch_number,
                location_id: item.location_id,
                location_name: storeLocations?.find(l => l.id === item.location_id)?.store_name || '',
                available_quantity: item.available_quantity,
            }));

            setAvailableBatches(formattedBatches);

            if (formattedBatches.length === 0) {
                toast.info('No stock available for this item at this location');
            } else {
                toast.success(`Found ${formattedBatches.length} batch(es)`);
            }
        } catch (error: any) {
            console.error('Error loading batches:', error);
            toast.error(error.message || 'Failed to load available batches');
        } finally {
            setIsLoadingBatches(false);
        }
    };

    // Add batch to the table
    const handleAddBatch = () => {
        if (!selectedBatchId) {
            toast.error('Please select a batch');
            return;
        }

        const qty = parseFloat(batchQuantity);
        if (!qty || qty <= 0) {
            toast.error('Please enter a valid quantity');
            return;
        }

        const selectedBatch = availableBatches.find(b => b.id === selectedBatchId);
        if (!selectedBatch) {
            toast.error('Selected batch not found');
            return;
        }

        if (qty > selectedBatch.available_quantity) {
            toast.error(`Quantity cannot exceed available stock (${selectedBatch.available_quantity})`);
            return;
        }

        // Check if batch already added
        const existingBatch = batches.find(b => b.batch_number === selectedBatch.batch_number);
        if (existingBatch) {
            toast.error('This batch is already added');
            return;
        }

        const newBatch: PackingBatch = {
            location_id: selectedBatch.location_id,
            batch_number: selectedBatch.batch_number,
            stock_quantity: selectedBatch.available_quantity,
            quantity: qty,
            location_name: selectedBatch.location_name,
        };

        setBatches([...batches, newBatch]);
        setSelectedBatchId('');
        setBatchQuantity('');
        toast.success('Batch added');
    };

    // Reset form when dialog opens/closes
    useEffect(() => {
        if (open) {
            reset({
                doc_prefix: defaultPrefix,
                doc_number: 1,
                pck_date: new Date().toISOString().split('T')[0],
            });
            setBatches([]);
            setAvailableBatches([]);
            setSelectedBatchId('');
            setBatchQuantity('');
        }
    }, [open, reset]);

    const handleDeleteBatch = (index: number) => {
        setBatches(batches.filter((_, i) => i !== index));
    };

    const onSubmit = async (data: FormData) => {
        if (batches.length === 0) {
            toast.error('Please add at least one batch');
            return;
        }

        try {
            // Use manually entered packing number
            await createPacking.mutateAsync({
                pck_number: data.doc_number,
                pck_full_number: `${data.doc_prefix}${data.doc_number}`,
                pck_date: data.pck_date,
                item_id: data.item_id,
                location_id: data.location_id,
                quantity: data.quantity,
                employee_id: data.employee_id || null,
                remark: data.remark || null,
                batches: batches.map(b => ({
                    location_id: b.location_id,
                    batch_number: b.batch_number,
                    stock_quantity: b.stock_quantity,
                    quantity: b.quantity,
                })),
            });

            onOpenChange(false);
        } catch (error) {
            console.error('Error creating packing:', error);
        }
    };

    const selectedBatch = availableBatches.find(b => b.id === selectedBatchId);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[1000px] p-0 overflow-hidden gap-0">
                <DialogHeader className="px-6 py-4 border-b bg-gray-50/50">
                    <DialogTitle className="text-xl font-semibold text-primary">
                        Add Packing
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="p-6 overflow-y-auto max-h-[80vh]">
                    <div className="space-y-6">
                        {/* Row 1: Document Details */}
                        <div className="grid grid-cols-12 gap-4">
                            {/* Trans No. */}
                            <div className="col-span-2 space-y-2">
                                <Label className="text-sm">Trans No.</Label>
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
                                    <Input type="number" {...register('doc_number')} className="flex-1 text-xs" />
                                </div>
                            </div>

                            {/* Date */}
                            <div className="col-span-2 space-y-2">
                                <Label className="text-sm">
                                    Date <span className="text-destructive">*</span>
                                </Label>
                                <Controller
                                    name="pck_date"
                                    control={control}
                                    render={({ field }) => (
                                        <DatePicker
                                            value={field.value}
                                            onChange={(date) => field.onChange(date ? format(date, 'yyyy-MM-dd') : '')}
                                            className={errors.pck_date ? 'border-destructive' : ''}
                                        />
                                    )}
                                />
                            </div>

                            {/* Location */}
                            <div className="col-span-4 space-y-2">
                                <Label className="text-sm">
                                    Location <span className="text-destructive">*</span>
                                </Label>
                                <Select
                                    value={watchedLocationId}
                                    onValueChange={(v) => {
                                        setValue('location_id', v, { shouldValidate: true });
                                        setBatches([]);
                                        setAvailableBatches([]);
                                    }}
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
                            </div>

                            {/* Employee */}
                            <div className="col-span-4 space-y-2">
                                <Label className="text-sm">Employee</Label>
                                <Select
                                    value={watchedEmployeeId}
                                    onValueChange={(v) => setValue('employee_id', v, { shouldValidate: true })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Employee" />
                                    </SelectTrigger>
                                    <SelectPrimitive.Portal>
                                        <SelectContent>
                                            {salesExecutives?.map(emp => (
                                                <SelectItem key={emp.id} value={emp.id}>
                                                    {emp.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </SelectPrimitive.Portal>
                                </Select>
                            </div>
                        </div>

                        {/* Row 2: Item Selection */}
                        <div className="grid grid-cols-12 gap-4 bg-muted/20 p-4 rounded-lg border">
                            <div className="col-span-6 space-y-2">
                                <Label className="text-sm">
                                    Item Name <span className="text-destructive">*</span>
                                </Label>
                                <Select
                                    value={watchedItemId}
                                    onValueChange={(v) => {
                                        setValue('item_id', v, { shouldValidate: true });
                                        setBatches([]);
                                        setAvailableBatches([]);
                                    }}
                                >
                                    <SelectTrigger className={errors.item_id ? 'border-destructive' : ''}>
                                        <SelectValue placeholder="Select Product" />
                                    </SelectTrigger>
                                    <SelectPrimitive.Portal>
                                        <SelectContent>
                                            {items?.map(item => (
                                                <SelectItem key={item.id} value={item.id}>
                                                    {item.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </SelectPrimitive.Portal>
                                </Select>
                            </div>

                            <div className="col-span-3 space-y-2">
                                <Label className="text-sm">
                                    Total Qty <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    type="number"
                                    {...register('quantity')}
                                    placeholder="0"
                                    readOnly
                                    className="bg-muted font-mono"
                                />
                            </div>

                            <div className="col-span-3 flex items-end">
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="w-full border-primary text-primary hover:bg-primary/5"
                                    onClick={loadAvailableBatches}
                                    disabled={!watchedItemId || !watchedLocationId || isLoadingBatches}
                                >
                                    {isLoadingBatches ? 'Loading...' : 'Load Batches'}
                                </Button>
                            </div>
                        </div>

                        {/* Batch Selection Section */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2">
                                <Label className="text-sm font-semibold">Batch Details</Label>
                                <div className="h-px bg-border flex-1" />
                            </div>

                            <div className="grid grid-cols-12 gap-3 items-end">
                                {/* Batch Select */}
                                <div className="col-span-6 space-y-1.5">
                                    <Label className="text-xs text-muted-foreground">Select Batch</Label>
                                    <Select
                                        value={selectedBatchId}
                                        onValueChange={setSelectedBatchId}
                                        disabled={availableBatches.length === 0}
                                    >
                                        <SelectTrigger className="h-9">
                                            <SelectValue placeholder={availableBatches.length > 0 ? "Select Batch" : "No batches available"} />
                                        </SelectTrigger>
                                        <SelectPrimitive.Portal>
                                            <SelectContent>
                                                {availableBatches.map(batch => (
                                                    <SelectItem key={batch.id} value={batch.id}>
                                                        {batch.batch_number} (Avail: {batch.available_quantity})
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </SelectPrimitive.Portal>
                                    </Select>
                                </div>

                                {/* Available Stock - 2 columns */}
                                <div className="col-span-2 space-y-1.5">
                                    <Label className="text-xs text-muted-foreground">Available</Label>
                                    <Input
                                        type="number"
                                        value={selectedBatch?.available_quantity || ''}
                                        readOnly
                                        className="bg-muted h-9 text-center"
                                    />
                                </div>

                                {/* Quantity - 2 columns */}
                                <div className="col-span-2 space-y-1.5">
                                    <Label className="text-xs text-muted-foreground">Enter Qty</Label>
                                    <Input
                                        type="number"
                                        value={batchQuantity}
                                        onChange={(e) => setBatchQuantity(e.target.value)}
                                        placeholder="0"
                                        className="h-9"
                                        disabled={!selectedBatchId}
                                    />
                                </div>

                                {/* Add Button - 2 columns */}
                                <div className="col-span-2">
                                    <Button
                                        type="button"
                                        onClick={handleAddBatch}
                                        disabled={!selectedBatchId || !batchQuantity}
                                        className="w-full h-9"
                                        size="sm"
                                    >
                                        <Plus className="h-4 w-4 mr-1" />
                                        Add
                                    </Button>
                                </div>
                            </div>

                            {/* Batch Detail Table */}
                            <div className="border rounded-lg overflow-hidden">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-primary hover:bg-primary">
                                            <TableHead className="text-primary-foreground text-xs h-9">#</TableHead>
                                            <TableHead className="text-primary-foreground text-xs h-9">Batch No.</TableHead>
                                            <TableHead className="text-primary-foreground text-xs h-9">Location</TableHead>
                                            <TableHead className="text-primary-foreground text-xs h-9 text-right">Available</TableHead>
                                            <TableHead className="text-primary-foreground text-xs h-9 text-right">Packing Qty</TableHead>
                                            <TableHead className="text-primary-foreground text-xs h-9 text-center w-12">Action</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {batches.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={6} className="text-center text-muted-foreground text-xs py-8">
                                                    No batches added yet
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            batches.map((batch, index) => (
                                                <TableRow key={index} className="hover:bg-muted/50">
                                                    <TableCell className="text-xs">{index + 1}</TableCell>
                                                    <TableCell className="text-xs font-medium">{batch.batch_number}</TableCell>
                                                    <TableCell className="text-xs text-muted-foreground">{batch.location_name}</TableCell>
                                                    <TableCell className="text-xs text-right text-muted-foreground">{batch.stock_quantity}</TableCell>
                                                    <TableCell className="text-xs text-right font-medium">{batch.quantity}</TableCell>
                                                    <TableCell className="text-center">
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                            onClick={() => handleDeleteBatch(index)}
                                                        >
                                                            <Trash2 className="h-3 w-3" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                        {batches.length > 0 && (
                                            <TableRow className="bg-muted/50 font-medium">
                                                <TableCell colSpan={4} className="text-right text-xs">Total Quantity</TableCell>
                                                <TableCell className="text-right text-xs">{totalQuantity}</TableCell>
                                                <TableCell></TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>

                        {/* Remark */}
                        <div className="space-y-2">
                            <Label className="text-sm">Remark</Label>
                            <Textarea
                                {...register('remark')}
                                placeholder="Optional notes..."
                                rows={2}
                                className="resize-none"
                            />
                        </div>
                    </div>

                    <DialogFooter className="mt-8">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={createPacking.isPending || batches.length === 0}
                            className="bg-primary hover:bg-primary/90 text-white px-8"
                        >
                            {createPacking.isPending ? 'Saving...' : 'Save Packing'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
