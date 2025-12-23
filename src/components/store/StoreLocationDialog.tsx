import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
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
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Loader2, Check, ChevronsUpDown } from 'lucide-react';
import { useStoreLocations, StoreLocation } from '@/hooks/useStoreLocations';
import { cn } from "@/lib/utils";

const formSchema = z.object({
    location: z.string().min(1, 'Rack is required'),
    is_final_location: z.boolean().default(false),
    store_name: z.string().min(1, 'Store name is required'),
    parent_store_id: z.string().optional(),
    store_level: z.number().default(1),
    remark: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

const STORE_NAMES = [
    "General Store",
    "Marking",
    "Packing",
    "Ready To Dispatch",
    "Rejection"
];

interface StoreLocationDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    editingLocation?: StoreLocation | null;
}

export function StoreLocationDialog({
    open,
    onOpenChange,
    editingLocation,
}: StoreLocationDialogProps) {
    const { createLocation, updateLocation, isCreating, isUpdating } = useStoreLocations();
    const [storeNameOpen, setStoreNameOpen] = useState(false);

    const {
        register,
        handleSubmit,
        reset,
        setValue,
        watch,
        formState: { errors },
    } = useForm<FormData>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            location: '',
            is_final_location: false,
            store_name: '',
            parent_store_id: '',
            store_level: 1,
            remark: '',
        },
    });

    // Reset form when dialog opens/closes or editing location changes
    useEffect(() => {
        if (open) {
            if (editingLocation) {
                reset({
                    location: editingLocation.location,
                    is_final_location: editingLocation.is_final_location,
                    store_name: editingLocation.store_name,
                    parent_store_id: editingLocation.parent_store_id || '',
                    store_level: editingLocation.store_level,
                    remark: editingLocation.remark || '',
                });
            } else {
                reset({
                    location: '',
                    is_final_location: false,
                    store_name: '',
                    parent_store_id: '',
                    store_level: 1,
                    remark: '',
                });
            }
        }
    }, [open, editingLocation, reset]);

    const onSubmit = async (data: FormData) => {
        try {
            if (editingLocation) {
                await updateLocation.mutateAsync({
                    id: editingLocation.id,
                    location: data.location,
                    is_final_location: data.is_final_location,
                    store_name: data.store_name,
                    parent_store_id: data.parent_store_id || null,
                    store_level: data.store_level,
                    remark: data.remark || null,
                });
            } else {
                await createLocation.mutateAsync({
                    location: data.location,
                    is_final_location: data.is_final_location,
                    store_name: data.store_name,
                    parent_store_id: data.parent_store_id || null,
                    store_level: data.store_level,
                    remark: data.remark || null,
                });
            }
            onOpenChange(false);
        } catch (error) {
            console.error('Error saving store location:', error);
        }
    };

    const isSaving = isCreating || isUpdating;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>
                        {editingLocation ? 'Edit Location' : 'Add Location'}
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                    {/* Row 1: Rack & Final Store */}
                    <div className="grid grid-cols-12 gap-4">
                        <div className="col-span-8 space-y-2">
                            <Label className="text-sm">
                                Rack No. <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                {...register('location')}
                                placeholder="Rack"
                                className={cn("rounded-lg", errors.location ? 'border-destructive' : '')}
                            />
                            {errors.location && (
                                <p className="text-xs text-destructive">{errors.location.message}</p>
                            )}
                        </div>

                        <div className="col-span-4 space-y-2">
                            <Label className="text-sm">Final Store</Label>
                            <Select
                                value={watch('is_final_location') ? '1' : '0'}
                                onValueChange={(v) => setValue('is_final_location', v === '1')}
                            >
                                <SelectTrigger className="rounded-lg">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="0">No</SelectItem>
                                    <SelectItem value="1">Yes</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Row 2: Store Name (Combobox) */}
                    <div className="space-y-2">
                        <Label className="text-sm">
                            Store Name <span className="text-destructive">*</span>
                        </Label>
                        <Popover open={storeNameOpen} onOpenChange={setStoreNameOpen} modal={true}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={storeNameOpen}
                                    className={cn(
                                        "w-full justify-between rounded-lg font-normal",
                                        !watch('store_name') && "text-muted-foreground",
                                        errors.store_name && "border-destructive"
                                    )}
                                >
                                    {watch('store_name')
                                        ? STORE_NAMES.find((name) => name === watch('store_name')) || watch('store_name')
                                        : "Select Store"}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                                <Command>
                                    <CommandInput placeholder="Select Store" />
                                    <CommandList>
                                        <CommandEmpty>No store found.</CommandEmpty>
                                        <CommandGroup>
                                            {STORE_NAMES.map((name) => (
                                                <CommandItem
                                                    key={name}
                                                    value={name}
                                                    onSelect={(currentValue) => {
                                                        // use original casing from array instead of lowercase from cmdk
                                                        const originalValue = STORE_NAMES.find(n => n.toLowerCase() === currentValue.toLowerCase()) || currentValue;
                                                        setValue('store_name', originalValue, { shouldValidate: true });
                                                        setStoreNameOpen(false);
                                                    }}
                                                >
                                                    <Check
                                                        className={cn(
                                                            "mr-2 h-4 w-4",
                                                            watch('store_name') === name ? "opacity-100" : "opacity-0"
                                                        )}
                                                    />
                                                    {name}
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                        {errors.store_name && (
                            <p className="text-xs text-destructive">{errors.store_name.message}</p>
                        )}
                    </div>

                    {/* Row 3: Remark */}
                    <div className="space-y-2">
                        <Label className="text-sm">Remark</Label>
                        <Textarea
                            {...register('remark')}
                            placeholder="Remark"
                            rows={2}
                            className="resize-none rounded-lg"
                        />
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            className="rounded-lg"
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isSaving} className="rounded-lg">
                            {isSaving ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                'Save'
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
