import { useState, useEffect } from 'react';
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
} from '@/components/ui/command';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { useItems } from '@/hooks/useItems';
import * as SelectPrimitive from '@radix-ui/react-select';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface EnquiryItem {
    item_id?: string;
    item_name: string;
    hsn_code?: string;
    quantity: number;
    unit: string;
    brand_clearance?: string;
    application: string;
    how_old_mfg?: string;
    shaft_housing: string;
    old_bearing_life?: string;
    fitment_tools: string;
    weather_effect?: string;
    failure_cause?: string;
    place_of_fitment: string;
    notes: string;
}

interface EnquiryItemDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSave: (item: EnquiryItem) => void;
    onSaveAndAdd: (item: EnquiryItem) => void;
    editItem?: EnquiryItem | null;
}

export function EnquiryItemDialog({
    open,
    onOpenChange,
    onSave,
    onSaveAndAdd,
    editItem,
}: EnquiryItemDialogProps) {
    const { items: productItems } = useItems({ realtime: true });
    const [searchOpen, setSearchOpen] = useState(false);
    const [formData, setFormData] = useState<EnquiryItem>({
        item_id: '',
        item_name: '',
        hsn_code: '',
        quantity: 1,
        unit: 'PCS',
        brand_clearance: '',
        application: '',
        how_old_mfg: '',
        shaft_housing: '',
        old_bearing_life: '',
        fitment_tools: '',
        weather_effect: '',
        failure_cause: '',
        place_of_fitment: '',
        notes: '',
    });

    useEffect(() => {
        if (open) {
            if (editItem) {
                setFormData(editItem);
            } else {
                setFormData({
                    item_id: '',
                    item_name: '',
                    hsn_code: '',
                    quantity: 1,
                    unit: 'PCS',
                    brand_clearance: '',
                    application: '',
                    how_old_mfg: '',
                    shaft_housing: '',
                    old_bearing_life: '',
                    fitment_tools: '',
                    weather_effect: '',
                    failure_cause: '',
                    place_of_fitment: '',
                    notes: '',
                });
            }
        }
    }, [open, editItem]);

    const handleItemSelect = (itemId: string) => {
        const item = productItems.find(i => i.id === itemId);
        if (item) {
            setFormData(prev => ({
                ...prev,
                item_id: item.id,
                item_name: item.name,
                hsn_code: item.hsn_code || '',
                unit: item.unit || 'PCS',
            }));
            setSearchOpen(false);
        }
    };

    const handleSave = () => {
        if (!formData.item_name) return;
        onSave(formData);
        onOpenChange(false);
    };

    const handleSaveAndAdd = () => {
        if (!formData.item_name) return;
        onSaveAndAdd(formData);
        setFormData({
            item_id: '',
            item_name: '',
            hsn_code: '',
            quantity: 1,
            unit: 'PCS',
            brand_clearance: '',
            application: '',
            how_old_mfg: '',
            shaft_housing: '',
            old_bearing_life: '',
            fitment_tools: '',
            weather_effect: '',
            failure_cause: '',
            place_of_fitment: '',
            notes: '',
        });
    };

    const units = ['PCS', 'NOS', 'SET', 'KG', 'MTR', 'BOX'];

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-lg font-semibold">
                        {editItem ? 'Edit Item' : 'Add or Update Item'}
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Row 1: Bearing Number (Searchable) & Brand/Clearance */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-sm">
                                Bearing Number <span className="text-destructive">*</span>
                            </Label>
                            <Popover open={searchOpen} onOpenChange={setSearchOpen} modal={true}>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        role="combobox"
                                        className="w-full justify-between font-normal"
                                    >
                                        {formData.item_name || 'Select or type bearing number'}
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[400px] p-0" align="start">
                                    <Command>
                                        <CommandInput
                                            placeholder="Search bearing..."
                                            value={formData.item_name}
                                            onValueChange={val => setFormData(prev => ({ ...prev, item_name: val }))}
                                        />
                                        <CommandList>
                                            <CommandEmpty>
                                                <div className="py-6 text-center text-sm">
                                                    <p className="text-muted-foreground">
                                                        No item found. Type to add manually.
                                                    </p>
                                                </div>
                                            </CommandEmpty>
                                            <CommandGroup>
                                                {productItems.map((item) => (
                                                    <CommandItem
                                                        key={item.id}
                                                        value={item.name}
                                                        onSelect={() => handleItemSelect(item.id)}
                                                    >
                                                        <Check
                                                            className={cn(
                                                                'mr-2 h-4 w-4',
                                                                formData.item_id === item.id ? 'opacity-100' : 'opacity-0'
                                                            )}
                                                        />
                                                        <div>
                                                            <p className="font-medium">{item.name}</p>
                                                            <p className="text-xs text-muted-foreground">
                                                                {item.sku} {item.hsn_code ? `| HSN: ${item.hsn_code}` : ''}
                                                            </p>
                                                        </div>
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-sm">Brand/Clearance</Label>
                            <Input
                                value={formData.brand_clearance || ''}
                                onChange={e => setFormData(prev => ({ ...prev, brand_clearance: e.target.value }))}
                                placeholder="Select Brand"
                            />
                        </div>
                    </div>

                    {/* Row 2: Application & How Old Mfg */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-sm">Application</Label>
                            <Input
                                value={formData.application}
                                onChange={e => setFormData(prev => ({ ...prev, application: e.target.value }))}
                                placeholder="Application"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-sm">How Old Mfg.</Label>
                            <Input
                                value={formData.how_old_mfg || ''}
                                onChange={e => setFormData(prev => ({ ...prev, how_old_mfg: e.target.value }))}
                                placeholder="How Old Mfg."
                            />
                        </div>
                    </div>

                    {/* Row 3: Shaft/Housing & Old Bearing Life */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-sm">Shaft/Housing</Label>
                            <Input
                                value={formData.shaft_housing}
                                onChange={e => setFormData(prev => ({ ...prev, shaft_housing: e.target.value }))}
                                placeholder="Shaft/Housing"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-sm">Old Bearing Life(Estimated)</Label>
                            <Input
                                value={formData.old_bearing_life || ''}
                                onChange={e => setFormData(prev => ({ ...prev, old_bearing_life: e.target.value }))}
                                placeholder="Old Bearing Life(Estimated)"
                            />
                        </div>
                    </div>

                    {/* Row 4: Fitment Tools & Weather Effect */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-sm">Fitment Tools</Label>
                            <Input
                                value={formData.fitment_tools}
                                onChange={e => setFormData(prev => ({ ...prev, fitment_tools: e.target.value }))}
                                placeholder="Fitment Tools"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-sm">Weather Effect</Label>
                            <Input
                                value={formData.weather_effect || ''}
                                onChange={e => setFormData(prev => ({ ...prev, weather_effect: e.target.value }))}
                                placeholder="Weather Effect"
                            />
                        </div>
                    </div>

                    {/* Row 5: Failure Cause & Place Of Fitment */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-sm">Failure Cause</Label>
                            <Input
                                value={formData.failure_cause || ''}
                                onChange={e => setFormData(prev => ({ ...prev, failure_cause: e.target.value }))}
                                placeholder="Failure Cause"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-sm">Place Of Fitment</Label>
                            <Input
                                value={formData.place_of_fitment}
                                onChange={e => setFormData(prev => ({ ...prev, place_of_fitment: e.target.value }))}
                                placeholder="Place Of Fitment"
                            />
                        </div>
                    </div>

                    {/* Notes */}
                    <div className="space-y-2">
                        <Label className="text-sm">Notes</Label>
                        <Textarea
                            value={formData.notes}
                            onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                            placeholder="Notes"
                            rows={2}
                        />
                    </div>
                </div>

                <DialogFooter className="gap-2">
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                        Close
                    </Button>
                    <Button type="button" variant="secondary" onClick={handleSaveAndAdd}>
                        Save & Close
                    </Button>
                    <Button type="button" onClick={handleSave} disabled={!formData.item_name}>
                        Save
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
