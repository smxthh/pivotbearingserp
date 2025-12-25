import { useState, useEffect } from 'react';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useTransports, Transport } from '@/hooks/useTransports';
import { Truck, Search, Check } from 'lucide-react';

interface TransportSelectionDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    selectedTransportName: string;
    onTransportChange: (transportName: string, transportId?: string) => void;
}

export function TransportSelectionDialog({
    open,
    onOpenChange,
    selectedTransportName,
    onTransportChange,
}: TransportSelectionDialogProps) {
    const { transports, isLoading } = useTransports({ pageSize: 100 });
    const [searchQuery, setSearchQuery] = useState('');
    const [localSelection, setLocalSelection] = useState<string>('');

    // Filter active transports and by search query
    const filteredTransports = transports.filter(transport => {
        if (transport.is_active === false) return false;
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            return (
                transport.transport_name.toLowerCase().includes(query) ||
                transport.transport_id.toLowerCase().includes(query) ||
                (transport.address && transport.address.toLowerCase().includes(query))
            );
        }
        return true;
    });

    // Sync local selection with props when dialog opens
    useEffect(() => {
        if (open) {
            setLocalSelection(selectedTransportName);
            setSearchQuery('');
        }
    }, [open, selectedTransportName]);

    const handleSelectTransport = (transport: Transport) => {
        setLocalSelection(transport.transport_name);
    };

    const handleApply = () => {
        const selectedTransport = transports.find(t => t.transport_name === localSelection);
        onTransportChange(localSelection, selectedTransport?.transport_id);
        onOpenChange(false);
    };

    const handleCancel = () => {
        setLocalSelection(selectedTransportName);
        onOpenChange(false);
    };

    const handleClear = () => {
        setLocalSelection('');
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px] max-h-[80vh]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Truck className="h-5 w-5" />
                        Select Transport
                    </DialogTitle>
                    <DialogDescription>
                        Choose a transport from your master list.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search transports..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9"
                        />
                    </div>

                    {/* Selected indicator */}
                    {localSelection && (
                        <div className="flex items-center justify-between text-sm bg-primary/5 border border-primary/20 rounded-lg px-3 py-2">
                            <span className="font-medium">{localSelection}</span>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={handleClear}
                                className="h-6 text-xs"
                            >
                                Clear
                            </Button>
                        </div>
                    )}

                    {/* Transports list */}
                    <ScrollArea className="h-[300px] border rounded-lg p-3">
                        {isLoading ? (
                            <div className="space-y-3">
                                {[...Array(4)].map((_, i) => (
                                    <div key={i} className="flex items-center gap-3 p-3 border rounded-lg">
                                        <Skeleton className="h-10 w-10 rounded-full" />
                                        <div className="flex-1 space-y-2">
                                            <Skeleton className="h-4 w-1/2" />
                                            <Skeleton className="h-3 w-1/3" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : filteredTransports.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-center py-8">
                                <Truck className="h-12 w-12 text-muted-foreground/50 mb-3" />
                                <p className="text-muted-foreground">
                                    {searchQuery ? 'No matching transports' : 'No transports available'}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Add transports in Configuration → Transport
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {filteredTransports.map((transport) => {
                                    const isSelected = localSelection === transport.transport_name;
                                    return (
                                        <div
                                            key={transport.id}
                                            className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                                                isSelected ? 'bg-primary/5 border-primary/30' : 'hover:bg-muted/50'
                                            }`}
                                            onClick={() => handleSelectTransport(transport)}
                                        >
                                            <div className="flex items-center justify-center h-10 w-10 rounded-full bg-muted">
                                                <Truck className="h-5 w-5 text-muted-foreground" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium text-sm">{transport.transport_name}</span>
                                                    <span className="text-xs text-muted-foreground">
                                                        ({transport.transport_id})
                                                    </span>
                                                </div>
                                                {transport.address && (
                                                    <p className="text-xs text-muted-foreground truncate">
                                                        {transport.address}
                                                    </p>
                                                )}
                                            </div>
                                            {isSelected && (
                                                <Check className="h-4 w-4 text-primary shrink-0" />
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </ScrollArea>
                </div>

                <DialogFooter>
                    <Button type="button" variant="outline" onClick={handleCancel}>
                        Cancel
                    </Button>
                    <Button type="button" onClick={handleApply}>
                        Apply
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
