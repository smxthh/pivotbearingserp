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
import { useLedgers, Ledger, OpeningBalanceUpdate } from '@/hooks/useLedgers';
import { Search } from 'lucide-react';

interface OpeningBalanceDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    ledgers: Ledger[];
}

interface BalanceEntry {
    ledger_id: string;
    name: string;
    group_name: string;
    opening_balance: number;
    opening_balance_type: 'Dr' | 'Cr';
    modified: boolean;
}

export function OpeningBalanceDialog({ open, onOpenChange, ledgers }: OpeningBalanceDialogProps) {
    const { updateOpeningBalances, isUpdating } = useLedgers({ realtime: false });
    const [searchQuery, setSearchQuery] = useState('');
    const [entries, setEntries] = useState<BalanceEntry[]>([]);

    // Initialize entries from ledgers
    useEffect(() => {
        if (open && ledgers.length > 0) {
            setEntries(
                ledgers.map((l) => ({
                    ledger_id: l.id,
                    name: l.name,
                    group_name: l.group_name || '',
                    opening_balance: l.opening_balance || 0,
                    opening_balance_type: (l.opening_balance_type as 'Dr' | 'Cr') || 'Dr',
                    modified: false,
                }))
            );
            setSearchQuery('');
        }
    }, [open, ledgers]);

    // Filter entries
    const filteredEntries = entries.filter(
        (entry) =>
            entry.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            entry.group_name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Handle balance change
    const handleBalanceChange = (ledgerId: string, value: string) => {
        setEntries((prev) =>
            prev.map((entry) =>
                entry.ledger_id === ledgerId
                    ? { ...entry, opening_balance: parseFloat(value) || 0, modified: true }
                    : entry
            )
        );
    };

    // Handle type change
    const handleTypeChange = (ledgerId: string, value: 'Dr' | 'Cr') => {
        setEntries((prev) =>
            prev.map((entry) =>
                entry.ledger_id === ledgerId
                    ? { ...entry, opening_balance_type: value, modified: true }
                    : entry
            )
        );
    };

    // Get modified entries
    const modifiedEntries = entries.filter((e) => e.modified);

    // Handle save
    const handleSave = async () => {
        if (modifiedEntries.length === 0) {
            onOpenChange(false);
            return;
        }

        const updates: OpeningBalanceUpdate[] = modifiedEntries.map((e) => ({
            ledger_id: e.ledger_id,
            opening_balance: e.opening_balance,
            opening_balance_type: e.opening_balance_type,
        }));

        try {
            await updateOpeningBalances.mutateAsync(updates);
            onOpenChange(false);
        } catch (error) {
            // Error handled by mutation
        }
    };

    // Format currency
    const formatCurrency = (value: number) =>
        new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 2,
        }).format(value);

    // Calculate totals
    const totalDebit = entries
        .filter((e) => e.opening_balance_type === 'Dr')
        .reduce((sum, e) => sum + e.opening_balance, 0);

    const totalCredit = entries
        .filter((e) => e.opening_balance_type === 'Cr')
        .reduce((sum, e) => sum + e.opening_balance, 0);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle>Update Opening Balances</DialogTitle>
                </DialogHeader>

                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search ledgers..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9"
                    />
                </div>

                {/* Summary */}
                <div className="flex items-center gap-6 px-2 py-3 bg-muted/50 rounded-lg">
                    <div>
                        <span className="text-sm text-muted-foreground">Total Debit:</span>
                        <span className="ml-2 font-semibold text-success">{formatCurrency(totalDebit)}</span>
                    </div>
                    <div>
                        <span className="text-sm text-muted-foreground">Total Credit:</span>
                        <span className="ml-2 font-semibold text-destructive">{formatCurrency(totalCredit)}</span>
                    </div>
                    <div>
                        <span className="text-sm text-muted-foreground">Difference:</span>
                        <span className={`ml-2 font-semibold ${totalDebit === totalCredit ? 'text-success' : 'text-warning'}`}>
                            {formatCurrency(Math.abs(totalDebit - totalCredit))}
                            {totalDebit !== totalCredit && (
                                <span className="text-xs ml-1">({totalDebit > totalCredit ? 'Dr' : 'Cr'})</span>
                            )}
                        </span>
                    </div>
                    {modifiedEntries.length > 0 && (
                        <div className="ml-auto">
                            <span className="text-sm text-primary font-medium">
                                {modifiedEntries.length} ledger(s) modified
                            </span>
                        </div>
                    )}
                </div>

                {/* Table */}
                <div className="flex-1 overflow-auto border rounded-lg">
                    <Table>
                        <TableHeader>
                            <TableRow className="sticky top-0 bg-background">
                                <TableHead className="w-12">#</TableHead>
                                <TableHead>Ledger Name</TableHead>
                                <TableHead>Group</TableHead>
                                <TableHead className="w-36 text-right">Opening Balance</TableHead>
                                <TableHead className="w-24">Type</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredEntries.map((entry, index) => (
                                <TableRow
                                    key={entry.ledger_id}
                                    className={entry.modified ? 'bg-primary/5' : ''}
                                >
                                    <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                                    <TableCell className="font-medium">{entry.name}</TableCell>
                                    <TableCell className="text-muted-foreground">{entry.group_name}</TableCell>
                                    <TableCell>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            value={entry.opening_balance}
                                            onChange={(e) => handleBalanceChange(entry.ledger_id, e.target.value)}
                                            className="w-full text-right h-8"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Select
                                            value={entry.opening_balance_type}
                                            onValueChange={(value: 'Dr' | 'Cr') => handleTypeChange(entry.ledger_id, value)}
                                        >
                                            <SelectTrigger className="h-8">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Dr">Dr</SelectItem>
                                                <SelectItem value="Cr">Cr</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {filteredEntries.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                                        No ledgers found
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={isUpdating || modifiedEntries.length === 0}>
                        {isUpdating ? 'Saving...' : `Save Changes (${modifiedEntries.length})`}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
