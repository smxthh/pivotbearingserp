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
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useTerms, Term } from '@/hooks/useTerms';
import { Badge } from '@/components/ui/badge';
import { FileText, Plus, Check } from 'lucide-react';

interface TermsSelectionDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    selectedTerms: string[];
    onTermsChange: (terms: string[]) => void;
    /** Filter terms by type (e.g., 'quotation', 'invoice', 'order') */
    termType?: string;
}

export function TermsSelectionDialog({
    open,
    onOpenChange,
    selectedTerms,
    onTermsChange,
    termType,
}: TermsSelectionDialogProps) {
    const { terms, isLoading } = useTerms({ pageSize: 100 });
    const [localSelection, setLocalSelection] = useState<string[]>([]);

    // Filter terms by type if specified, and only active terms
    // If no termType filter is provided, show all active terms
    const filteredTerms = terms.filter(term => {
        // Skip inactive terms (but allow null/undefined is_active as active)
        if (term.is_active === false) return false;
        // If termType filter is specified and term has a type, match them
        if (termType && term.type) {
            return term.type.toLowerCase() === termType.toLowerCase();
        }
        // If no termType filter, show all terms
        return true;
    });

    // Sync local selection with props when dialog opens
    useEffect(() => {
        if (open) {
            setLocalSelection([...selectedTerms]);
        }
    }, [open, selectedTerms]);

    const handleToggleTerm = (termConditions: string) => {
        setLocalSelection(prev => {
            if (prev.includes(termConditions)) {
                return prev.filter(t => t !== termConditions);
            }
            return [...prev, termConditions];
        });
    };

    const handleSelectAll = () => {
        const allConditions = filteredTerms.map(t => t.conditions);
        setLocalSelection(allConditions);
    };

    const handleDeselectAll = () => {
        setLocalSelection([]);
    };

    const handleApply = () => {
        onTermsChange(localSelection);
        onOpenChange(false);
    };

    const handleCancel = () => {
        setLocalSelection([...selectedTerms]);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] max-h-[80vh]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Select Terms & Conditions
                    </DialogTitle>
                    <DialogDescription>
                        Choose terms from your master list to include in this document.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Quick actions */}
                    <div className="flex items-center justify-between">
                        <div className="text-sm text-muted-foreground">
                            {localSelection.length} of {filteredTerms.length} selected
                        </div>
                        <div className="flex gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={handleSelectAll}
                                disabled={localSelection.length === filteredTerms.length}
                            >
                                Select All
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={handleDeselectAll}
                                disabled={localSelection.length === 0}
                            >
                                Clear All
                            </Button>
                        </div>
                    </div>

                    {/* Terms list */}
                    <ScrollArea className="h-[350px] border rounded-lg p-3">
                        {isLoading ? (
                            <div className="space-y-3">
                                {[...Array(4)].map((_, i) => (
                                    <div key={i} className="flex items-start gap-3 p-3 border rounded-lg">
                                        <Skeleton className="h-5 w-5" />
                                        <div className="flex-1 space-y-2">
                                            <Skeleton className="h-4 w-1/3" />
                                            <Skeleton className="h-3 w-full" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : filteredTerms.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-center py-8">
                                <FileText className="h-12 w-12 text-muted-foreground/50 mb-3" />
                                <p className="text-muted-foreground">No terms available</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Add terms in Configuration → Terms & Conditions
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {filteredTerms.map((term) => {
                                    const isSelected = localSelection.includes(term.conditions);
                                    return (
                                        <div
                                            key={term.id}
                                            className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                                                isSelected ? 'bg-primary/5 border-primary/30' : 'hover:bg-muted/50'
                                            }`}
                                            onClick={() => handleToggleTerm(term.conditions)}
                                        >
                                            <Checkbox
                                                checked={isSelected}
                                                onCheckedChange={() => handleToggleTerm(term.conditions)}
                                                className="mt-0.5"
                                            />
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="font-medium text-sm">{term.title}</span>
                                                    {term.is_default && (
                                                        <Badge variant="secondary" className="text-xs">
                                                            Default
                                                        </Badge>
                                                    )}
                                                    {term.type && (
                                                        <Badge variant="outline" className="text-xs capitalize">
                                                            {term.type}
                                                        </Badge>
                                                    )}
                                                </div>
                                                <p className="text-xs text-muted-foreground line-clamp-2">
                                                    {term.conditions}
                                                </p>
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

                    {/* Preview of selected terms */}
                    {localSelection.length > 0 && (
                        <div className="border rounded-lg p-3 bg-muted/30">
                            <Label className="text-xs font-medium text-muted-foreground">
                                Selected Terms Preview:
                            </Label>
                            <ol className="list-decimal list-inside text-xs mt-2 space-y-1 max-h-[80px] overflow-y-auto">
                                {localSelection.slice(0, 5).map((term, idx) => (
                                    <li key={idx} className="truncate text-muted-foreground">
                                        {term}
                                    </li>
                                ))}
                                {localSelection.length > 5 && (
                                    <li className="text-muted-foreground italic">
                                        +{localSelection.length - 5} more...
                                    </li>
                                )}
                            </ol>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button type="button" variant="outline" onClick={handleCancel}>
                        Cancel
                    </Button>
                    <Button type="button" onClick={handleApply}>
                        Apply ({localSelection.length})
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
