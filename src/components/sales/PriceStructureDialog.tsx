import { useEffect, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useDistributorId } from '@/hooks/useDistributorProfile';
import { toast } from 'sonner';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2 } from 'lucide-react';

const formSchema = z.object({
    name: z.string().min(1, 'Structure Name is required'),
    is_default: z.boolean().default(false),
    items: z.array(z.object({
        item_id: z.string(),
        item_name: z.string(),
        sku: z.string().optional(),
        price: z.number().min(0),
        mrp: z.number().min(0),
    })),
});

export interface PriceStructure {
    id: string;
    name: string;
    is_default: boolean;
}

interface PriceStructureDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    structureToEdit?: PriceStructure | null;
}

export function PriceStructureDialog({ open, onOpenChange, structureToEdit }: PriceStructureDialogProps) {
    const { data: distributorId } = useDistributorId();
    const queryClient = useQueryClient();
    const [isLoadingData, setIsLoadingData] = useState(false);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: '',
            is_default: false,
            items: [],
        },
    });

    const { fields, replace } = useFieldArray({
        control: form.control,
        name: "items",
    });

    useEffect(() => {
        const loadData = async () => {
            if (!open || !distributorId) return;
            setIsLoadingData(true);

            try {
                // 1. Fetch all items
                const { data: allItems, error: itemsError } = await supabase
                    .from('items')
                    .select('id, name, sku, sale_price, purchase_price')
                    .eq('distributor_id', distributorId)
                    .order('name');

                if (itemsError) throw itemsError;

                // 2. If editing, fetch existing structure items
                let existingPrices: Record<string, { price: number, mrp: number }> = {};

                if (structureToEdit) {
                    const { data: structureItems, error: valError } = await supabase
                        .from('price_structure_items' as any)
                        .select('item_id, price, mrp')
                        .eq('structure_id', structureToEdit.id);

                    if (valError) throw valError;

                    (structureItems as any[])?.forEach(si => {
                        existingPrices[si.item_id] = { price: si.price, mrp: si.mrp };
                    });

                    form.reset({
                        name: structureToEdit.name,
                        is_default: structureToEdit.is_default,
                        items: [], // Will populate below
                    });
                } else {
                    form.reset({
                        name: '',
                        is_default: false,
                        items: [],
                    });
                }

                // 3. Merge
                const mergedItems = allItems?.map(item => {
                    const existing = existingPrices[item.id];
                    return {
                        item_id: item.id,
                        item_name: item.name,
                        sku: item.sku || '',
                        price: existing ? existing.price : (item.sale_price || 0), // Default to sale price
                        mrp: existing ? existing.mrp : (item.sale_price || 0), // Default MRP to sale price/purchase price logic? Just sale price for now. Or 0.
                    };
                }) || [];

                replace(mergedItems);

            } catch (err: any) {
                console.error("Error loading price structure data:", err);
                toast.error("Failed to load items");
            } finally {
                setIsLoadingData(false);
            }
        };

        if (open) {
            loadData();
        }
    }, [open, structureToEdit, distributorId, form, replace]);

    const saveStructure = useMutation({
        mutationFn: async (values: z.infer<typeof formSchema>) => {
            if (!distributorId) throw new Error('Distributor ID not found');

            let structureId = structureToEdit?.id;

            // 1. Upsert Structure
            if (structureId) {
                const { error } = await supabase
                    .from('price_structures' as any)
                    .update({
                        name: values.name,
                        is_default: values.is_default,
                    })
                    .eq('id', structureId);
                if (error) throw error;
            } else {
                const { data, error } = await supabase
                    .from('price_structures' as any)
                    .insert({
                        distributor_id: distributorId,
                        name: values.name,
                        is_default: values.is_default,
                    })
                    .select('id')
                    .single();
                if (error) throw error;
                structureId = (data as any).id;
            }

            if (!structureId) throw new Error("Failed to get structure ID");

            // 2. Prepare items for upsert
            // Optimize: Only save items? Or all? 
            // Saving all ensures integrity. 
            // We use upsert on price_structure_items.
            const itemsPayload = values.items.map(item => ({
                structure_id: structureId!,
                item_id: item.item_id,
                price: item.price,
                mrp: item.mrp,
            }));

            // Batch insert/upsert
            const { error: itemsError } = await supabase
                .from('price_structure_items' as any)
                .upsert(itemsPayload, { onConflict: 'structure_id, item_id' }); // Requires unique constraint

            if (itemsError) throw itemsError;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['price_structures'] });
            toast.success('Price structure saved successfully');
            onOpenChange(false);
        },
        onError: (error: Error) => {
            toast.error(error.message);
        },
    });

    const onSubmit = (values: z.infer<typeof formSchema>) => {
        saveStructure.mutate(values);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[800px] h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>{structureToEdit ? 'Edit Price Structure' : 'Add Price Structure'}</DialogTitle>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="h-full flex flex-col gap-4">
                        <div className="flex gap-4 items-end">
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem className="flex-1">
                                        <FormLabel>Structure Name</FormLabel>
                                        <FormControl>
                                            <Input placeholder="e.g. Wholesale, Retail A" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="is_default"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-3">
                                        <FormControl>
                                            <Checkbox
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                            />
                                        </FormControl>
                                        <div className="space-y-1 leading-none">
                                            <FormLabel>
                                                Is Default
                                            </FormLabel>
                                        </div>
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="flex-1 border rounded-md overflow-hidden relative">
                            {isLoadingData ? (
                                <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
                                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                </div>
                            ) : null}

                            <ScrollArea className="h-full">
                                <Table>
                                    <TableHeader className="bg-gray-50 sticky top-0 z-10">
                                        <TableRow>
                                            <TableHead>Item Name</TableHead>
                                            <TableHead>SKU</TableHead>
                                            <TableHead className="w-[150px]">MRP</TableHead>
                                            <TableHead className="w-[150px]">Price</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {fields.map((field, index) => (
                                            <TableRow key={field.id}>
                                                <TableCell className="font-medium">
                                                    {field.item_name}
                                                </TableCell>
                                                <TableCell className="text-muted-foreground text-sm">
                                                    {field.sku}
                                                </TableCell>
                                                <TableCell>
                                                    <FormField
                                                        control={form.control}
                                                        name={`items.${index}.mrp`}
                                                        render={({ field: inputField }) => (
                                                            <Input
                                                                type="number"
                                                                {...inputField}
                                                                onChange={e => inputField.onChange(e.target.valueAsNumber)}
                                                                className="h-8"
                                                                min="0"
                                                            />
                                                        )}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <FormField
                                                        control={form.control}
                                                        name={`items.${index}.price`}
                                                        render={({ field: inputField }) => (
                                                            <Input
                                                                type="number"
                                                                {...inputField}
                                                                onChange={e => inputField.onChange(e.target.valueAsNumber)}
                                                                className="h-8"
                                                                min="0"
                                                            />
                                                        )}
                                                    />
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </ScrollArea>
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={saveStructure.isPending || isLoadingData}>
                                {saveStructure.isPending ? 'Saving...' : 'Save Structure'}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
