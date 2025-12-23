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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useGroupMaster } from '@/hooks/useGroupMaster';

const formSchema = z.object({
    group_name: z.string().min(1, 'Group Name is required'),
    parent_group_id: z.string().min(1, 'Parent Group is required'),
    sequence: z.coerce.number().min(0).optional(),
});

type FormData = z.infer<typeof formSchema>;

interface AddGroupDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function AddGroupDialog({ open, onOpenChange }: AddGroupDialogProps) {
    const { createGroup, allGroups } = useGroupMaster();

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
            group_name: '',
            parent_group_id: '',
            sequence: 0,
        },
    });

    const watchedParentGroup = watch('parent_group_id');

    useEffect(() => {
        if (open) {
            reset({
                group_name: '',
                parent_group_id: '',
                sequence: 0,
            });
        }
    }, [open, reset]);

    const onSubmit = async (data: FormData) => {
        // Generate group code from name
        const groupCode = data.group_name.substring(0, 2).toUpperCase();

        await createGroup.mutateAsync({
            group_code: groupCode,
            group_name: data.group_name,
            parent_group_id: data.parent_group_id,
            sequence: data.sequence || 0,
        });
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader className="bg-primary text-primary-foreground px-6 py-4 -mx-6 -mt-6 rounded-t-lg">
                    <DialogTitle>Add Group</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 pt-4">
                    {/* Row 1: Group Name */}
                    <div className="grid grid-cols-12 gap-4">
                        <div className="col-span-12 space-y-2">
                            <Label className="text-sm">
                                Group Name <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                {...register('group_name')}
                                placeholder="Group Name"
                                className={errors.group_name ? 'border-destructive' : ''}
                            />
                        </div>
                    </div>

                    {/* Row 2: Parent Group + Sequence */}
                    <div className="grid grid-cols-12 gap-4">
                        <div className="col-span-8 space-y-2">
                            <Label className="text-sm">
                                Parent Group <span className="text-destructive">*</span>
                            </Label>
                            <Select
                                value={watchedParentGroup}
                                onValueChange={(v) => setValue('parent_group_id', v)}
                            >
                                <SelectTrigger className={errors.parent_group_id ? 'border-destructive' : ''}>
                                    <SelectValue placeholder="Select Group" />
                                </SelectTrigger>
                                <SelectContent>
                                    {allGroups.map((group) => (
                                        <SelectItem key={group.id} value={group.id}>
                                            {group.group_name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="col-span-4 space-y-2">
                            <Label className="text-sm">Seq.</Label>
                            <Input
                                type="number"
                                {...register('sequence')}
                                placeholder="Seq."
                            />
                        </div>
                    </div>

                    <DialogFooter className="pt-4">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Close
                        </Button>
                        <Button type="submit" disabled={createGroup.isPending}>
                            {createGroup.isPending ? 'Saving...' : 'Save'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
