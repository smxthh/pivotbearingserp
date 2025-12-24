import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useLedgers, Ledger, LedgerGroup } from '@/hooks/useLedgers';
import * as SelectPrimitive from '@radix-ui/react-select';

// Form schema with TCS/TDS fields
const ledgerSchema = z.object({
    name: z.string().min(1, 'Ledger name is required').max(200),
    group_name: z.string().min(1, 'Group is required'),
    opening_balance: z.coerce.number().default(0),
    opening_balance_type: z.enum(['Dr', 'Cr']).default('Dr'),
    tcs_applicable: z.boolean().default(false),
    tds_applicable: z.boolean().default(false),
    description: z.string().optional(),
});

type LedgerFormData = z.infer<typeof ledgerSchema>;

interface LedgerDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    ledger?: Ledger | null;
    groups: LedgerGroup[];
}

export function LedgerDialog({ open, onOpenChange, ledger, groups }: LedgerDialogProps) {
    const { addLedger, updateLedger, isAdding, isUpdating } = useLedgers({ realtime: false });
    const isEditing = !!ledger;

    const {
        register,
        handleSubmit,
        reset,
        setValue,
        watch,
        formState: { errors },
    } = useForm<LedgerFormData>({
        resolver: zodResolver(ledgerSchema),
        defaultValues: {
            name: '',
            group_name: 'Sundry Debtors',
            opening_balance: 0,
            opening_balance_type: 'Dr',
            tcs_applicable: false,
            tds_applicable: false,
            description: '',
        },
    });

    const selectedGroupName = watch('group_name');
    const tcsApplicable = watch('tcs_applicable');
    const tdsApplicable = watch('tds_applicable');

    // Reset form when dialog opens/closes or ledger changes
    useEffect(() => {
        if (open) {
            if (ledger) {
                reset({
                    name: ledger.name,
                    group_name: ledger.group_name,
                    opening_balance: ledger.opening_balance,
                    opening_balance_type: ledger.opening_balance_type,
                    tcs_applicable: (ledger as any).tcs_applicable || false,
                    tds_applicable: (ledger as any).tds_applicable || false,
                    description: ledger.description || '',
                });
            } else {
                reset({
                    name: '',
                    group_name: 'Sundry Debtors',
                    opening_balance: 0,
                    opening_balance_type: 'Dr',
                    tcs_applicable: false,
                    tds_applicable: false,
                    description: '',
                });
            }
        }
    }, [open, ledger, reset]);

    const onSubmit = async (data: LedgerFormData) => {
        try {
            if (isEditing && ledger) {
                await updateLedger.mutateAsync({
                    id: ledger.id,
                    updates: {
                        name: data.name,
                        group_name: data.group_name,
                        opening_balance: data.opening_balance,
                        opening_balance_type: data.opening_balance_type,
                        tcs_applicable: data.tcs_applicable,
                        tds_applicable: data.tds_applicable,
                        description: data.description,
                    } as any,
                });
            } else {
                await addLedger.mutateAsync({
                    name: data.name,
                    group_name: data.group_name,
                    opening_balance: data.opening_balance,
                    opening_balance_type: data.opening_balance_type,
                    tcs_applicable: data.tcs_applicable,
                    tds_applicable: data.tds_applicable,
                    description: data.description,
                } as any);
            }
            onOpenChange(false);
        } catch (error) {
            // Error is handled by the mutation
        }
    };

    // Get unique group names from groups or use defaults
    const groupOptions = groups.length > 0
        ? [...new Set(groups.map(g => g.name))].sort()
        : [
            'Sales Account',
            'Purchase Account',
            'Sundry Debtors',
            'Sundry Creditors',
            'Bank Accounts',
            'Cash-in-Hand',
            'Duties & Taxes',
            'Direct Expenses',
            'Indirect Expenses',
            'Fixed Assets',
            'Capital Account',
            'Loans (Liability)',
            'Current Assets',
            'Current Liabilities',
        ];

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>
                        {isEditing ? 'Edit Ledger' : 'Add Ledger'}
                    </DialogTitle>
                    <DialogDescription className="sr-only">
                        {isEditing ? 'Modify existing ledger details' : 'Create a new ledger account'}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    {/* Ledger Name */}
                    <div className="space-y-2">
                        <Label htmlFor="name">
                            Ledger Name <span className="text-destructive">*</span>
                        </Label>
                        <Input
                            id="name"
                            {...register('name')}
                            placeholder="Ledger Name"
                            className={errors.name ? 'border-destructive' : ''}
                        />
                        {errors.name && (
                            <p className="text-sm text-destructive">{errors.name.message}</p>
                        )}
                    </div>

                    {/* Group */}
                    <div className="space-y-2">
                        <Label htmlFor="group_name">
                            Group Name <span className="text-destructive">*</span>
                        </Label>
                        <Select
                            value={selectedGroupName}
                            onValueChange={(value) => setValue('group_name', value)}
                        >
                            <SelectTrigger className={errors.group_name ? 'border-destructive' : ''}>
                                <SelectValue placeholder="Select Group" />
                            </SelectTrigger>
                            <SelectPrimitive.Portal>
                                <SelectContent>
                                    {groupOptions.map((group) => (
                                        <SelectItem key={group} value={group}>
                                            {group}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </SelectPrimitive.Portal>
                        </Select>
                        {errors.group_name && (
                            <p className="text-sm text-destructive">{errors.group_name.message}</p>
                        )}
                    </div>

                    {/* Opening Balance */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="opening_balance">Op. Balance</Label>
                            <Select
                                value={watch('opening_balance_type')}
                                onValueChange={(value: 'Dr' | 'Cr') => setValue('opening_balance_type', value)}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectPrimitive.Portal>
                                    <SelectContent>
                                        <SelectItem value="Dr">CR</SelectItem>
                                        <SelectItem value="Cr">DR</SelectItem>
                                    </SelectContent>
                                </SelectPrimitive.Portal>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="opening_balance_amount">Op. Balance</Label>
                            <Input
                                id="opening_balance_amount"
                                type="number"
                                step="0.01"
                                {...register('opening_balance')}
                                placeholder="Op. Balance"
                            />
                        </div>
                    </div>

                    {/* TCS & TDS */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="tcs">TCS</Label>
                            <Select
                                value={tcsApplicable ? 'YES' : 'NO'}
                                onValueChange={(value) => setValue('tcs_applicable', value === 'YES')}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectPrimitive.Portal>
                                    <SelectContent>
                                        <SelectItem value="NO">NO</SelectItem>
                                        <SelectItem value="YES">YES</SelectItem>
                                    </SelectContent>
                                </SelectPrimitive.Portal>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="tds">TDS</Label>
                            <Select
                                value={tdsApplicable ? 'YES' : 'NO'}
                                onValueChange={(value) => setValue('tds_applicable', value === 'YES')}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectPrimitive.Portal>
                                    <SelectContent>
                                        <SelectItem value="NO">NO</SelectItem>
                                        <SelectItem value="YES">YES</SelectItem>
                                    </SelectContent>
                                </SelectPrimitive.Portal>
                            </Select>
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
                        <Button type="submit" disabled={isAdding || isUpdating}>
                            {isAdding || isUpdating ? 'Saving...' : isEditing ? 'Update' : 'Add Ledger'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
