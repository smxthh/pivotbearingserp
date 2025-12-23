import { useState, useMemo } from 'react';
import { Check, ChevronsUpDown, Search, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
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
import { useParties } from '@/hooks/useParties';

interface SearchablePartySelectProps {
    value: string;
    onChange: (value: string, party?: any) => void;
    partyType?: 'supplier' | 'customer' | 'all';
    placeholder?: string;
    error?: boolean;
    disabled?: boolean;
}

export function SearchablePartySelect({
    value,
    onChange,
    partyType = 'supplier',
    placeholder = 'Select party...',
    error = false,
    disabled = false,
}: SearchablePartySelectProps) {
    const [open, setOpen] = useState(false);
    const { parties } = useParties({ realtime: true });

    // Filter parties based on type
    const filteredParties = useMemo(() => {
        if (partyType === 'all') return parties;
        // Include parties with type 'both' when filtering for 'supplier' or 'customer'
        return parties.filter(p => p.type === partyType || p.type === 'both');
    }, [parties, partyType]);

    // Get selected party
    const selectedParty = useMemo(() => {
        return filteredParties.find(p => p.id === value);
    }, [filteredParties, value]);

    // Format currency for balance display
    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0,
        }).format(Math.abs(val));

    return (
        <Popover open={open} onOpenChange={setOpen} modal={true}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    disabled={disabled}
                    className={cn(
                        'w-full justify-between font-normal',
                        !value && 'text-muted-foreground',
                        error && 'border-destructive'
                    )}
                >
                    {selectedParty ? (
                        <span className="truncate">{selectedParty.name}</span>
                    ) : (
                        placeholder
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[400px] p-0" align="start">
                <Command>
                    <CommandInput placeholder="Search party..." />
                    <CommandList>
                        <CommandEmpty>
                            <div className="py-6 text-center text-sm">
                                <p className="text-muted-foreground">No party found.</p>
                                <Button
                                    variant="link"
                                    size="sm"
                                    className="mt-2 text-primary"
                                >
                                    <Plus className="h-3 w-3 mr-1" />
                                    Add New Party
                                </Button>
                            </div>
                        </CommandEmpty>
                        <CommandGroup>
                            {filteredParties.map((party) => (
                                <CommandItem
                                    key={party.id}
                                    value={party.name}
                                    onSelect={() => {
                                        onChange(party.id, party);
                                        setOpen(false);
                                    }}
                                    className="flex items-center justify-between"
                                >
                                    <div className="flex items-center gap-2">
                                        <Check
                                            className={cn(
                                                'h-4 w-4',
                                                value === party.id ? 'opacity-100' : 'opacity-0'
                                            )}
                                        />
                                        <div>
                                            <p className="font-medium">{party.name}</p>
                                            {party.gst_number && (
                                                <p className="text-xs text-muted-foreground">
                                                    GST: {party.gst_number}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    {party.current_balance !== undefined && party.current_balance !== 0 && (
                                        <span className={cn(
                                            'text-xs font-medium',
                                            party.current_balance > 0 ? 'text-green-600' : 'text-red-600'
                                        )}>
                                            {formatCurrency(party.current_balance)}
                                        </span>
                                    )}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
