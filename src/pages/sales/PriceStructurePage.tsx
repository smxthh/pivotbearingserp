import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useDistributorId } from '@/hooks/useDistributorProfile';
import { PageContainer } from '@/components/shared/PageContainer';
import { TableToolbar } from '@/components/shared/TableToolbar';
import { DataTable } from '@/components/shared/DataTable';
import { Button } from '@/components/ui/button';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { PriceStructureDialog, PriceStructure } from '@/components/sales/PriceStructureDialog';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';

export default function PriceStructurePage() {
    const { data: distributorId } = useDistributorId();
    const queryClient = useQueryClient();
    const [searchQuery, setSearchQuery] = useState('');
    const [rowsPerPage, setRowsPerPage] = useState(25);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [structureToEdit, setStructureToEdit] = useState<PriceStructure | null>(null);
    const [deleteId, setDeleteId] = useState<string | null>(null);

    const { data: structures = [], isLoading } = useQuery({
        queryKey: ['price_structures', distributorId],
        queryFn: async () => {
            if (!distributorId) return [];
            const { data, error } = await supabase
                .from('price_structures' as any)
                .select('*')
                .eq('distributor_id', distributorId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data as unknown as PriceStructure[];
        },
        enabled: !!distributorId,
    });

    const deleteStructure = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('price_structures' as any)
                .delete()
                .eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['price_structures'] });
            toast.success('Price structure deleted successfully');
            setDeleteId(null);
        },
        onError: (error: Error) => {
            toast.error(error.message);
        },
    });

    const filteredStructures = structures.filter(s =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleEdit = (s: PriceStructure) => {
        setStructureToEdit(s);
        setIsDialogOpen(true);
    };

    const handleCreate = () => {
        setStructureToEdit(null);
        setIsDialogOpen(true);
    };

    const columns = [
        {
            key: 'actions',
            header: 'Action',
            className: 'w-24',
            render: (s: PriceStructure) => (
                <div className="flex items-center gap-1">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => { e.stopPropagation(); handleEdit(s); }}
                    >
                        <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={(e) => { e.stopPropagation(); setDeleteId(s.id); }}
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            ),
        },
        { key: 'name', header: 'Structure Name', render: (s: PriceStructure) => <span className="font-medium">{s.name}</span> },
        {
            key: 'is_default',
            header: 'Default',
            render: (s: PriceStructure) => s.is_default ? <Badge>Default</Badge> : <span className="text-muted-foreground">-</span>
        },
    ];

    return (
        <PageContainer title="Price Structure">
            <div className="flex items-center justify-between mb-6">
                <h2
                    className="text-lg font-semibold cursor-pointer hover:text-primary transition-colors"
                    onClick={() => {
                        setSearchQuery('');
                        queryClient.invalidateQueries({ queryKey: ['price_structures'] });
                    }}
                    title="Click to refresh"
                >
                    Price Structure
                </h2>
                <Button onClick={handleCreate}>
                    <Plus className="h-4 w-4 mr-2" />Add Structure
                </Button>
            </div>

            <TableToolbar
                onRefresh={() => queryClient.invalidateQueries({ queryKey: ['price_structures'] })}
                onExport={() => { }} // No export needed yet
                searchValue={searchQuery}
                onSearchChange={setSearchQuery}
                searchPlaceholder="Search Structure..."
                pageSize={rowsPerPage}
                onPageSizeChange={setRowsPerPage}
            />

            <DataTable
                columns={columns}
                data={filteredStructures}
                keyExtractor={(s) => s.id}
                emptyMessage="No price structures found"
                isLoading={isLoading}
                onRowClick={handleEdit}
            />

            <PriceStructureDialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                structureToEdit={structureToEdit}
            />

            <ConfirmDialog
                open={!!deleteId}
                onOpenChange={(open) => !open && setDeleteId(null)}
                title="Delete Price Structure"
                description="Are you sure you want to delete this structure? All linked prices will be deleted."
                confirmLabel="Delete"
                onConfirm={() => deleteId && deleteStructure.mutate(deleteId)}
                isLoading={deleteStructure.isPending}
                variant="destructive"
            />
        </PageContainer>
    );
}
