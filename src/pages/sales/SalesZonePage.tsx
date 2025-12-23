import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useDistributorId } from '@/hooks/useDistributorProfile';
import { PageContainer } from '@/components/shared/PageContainer';
import { TableToolbar } from '@/components/shared/TableToolbar';
import { DataTable } from '@/components/shared/DataTable';
import { Button } from '@/components/ui/button';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { SalesZoneDialog, SalesZone } from '@/components/sales/SalesZoneDialog';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { toast } from 'sonner';
import { exportToCSV } from '@/lib/exportUtils';

export default function SalesZonePage() {
    const { data: distributorId } = useDistributorId();
    const queryClient = useQueryClient();
    const [searchQuery, setSearchQuery] = useState('');
    const [rowsPerPage, setRowsPerPage] = useState(25);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [zoneToEdit, setZoneToEdit] = useState<SalesZone | null>(null);
    const [deleteId, setDeleteId] = useState<string | null>(null);

    const { data: zones = [], isLoading } = useQuery({
        queryKey: ['sales_zones', distributorId],
        queryFn: async () => {
            if (!distributorId) return [];
            const { data, error } = await supabase
                .from('sales_zones' as any)
                .select('*')
                .eq('distributor_id', distributorId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data as unknown as SalesZone[];
        },
        enabled: !!distributorId,
    });

    const deleteZone = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('sales_zones' as any)
                .delete()
                .eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['sales_zones'] });
            toast.success('Zone deleted successfully');
            setDeleteId(null);
        },
        onError: (error: Error) => {
            toast.error(error.message);
        },
    });

    const filteredZones = zones.filter(zone =>
        zone.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (zone.remark?.toLowerCase() || '').includes(searchQuery.toLowerCase())
    );

    const handleEdit = (zone: SalesZone) => {
        setZoneToEdit(zone);
        setIsDialogOpen(true);
    };

    const handleCreate = () => {
        setZoneToEdit(null);
        setIsDialogOpen(true);
    };

    const handleExport = () => {
        exportToCSV(
            filteredZones,
            [
                { key: 'name', header: 'Zone Name' },
                { key: 'remark', header: 'Remark', render: (z) => z.remark || '-' },
            ],
            'sales_zones',
            'Sales Zones'
        );
    };

    const columns = [
        {
            key: 'actions',
            header: 'Action',
            className: 'w-24',
            render: (zone: SalesZone) => (
                <div className="flex items-center gap-1">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => { e.stopPropagation(); handleEdit(zone); }}
                    >
                        <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={(e) => { e.stopPropagation(); setDeleteId(zone.id); }}
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            ),
        },
        { key: 'name', header: 'Zone Name', render: (z: SalesZone) => <span className="font-medium">{z.name}</span> },
        { key: 'remark', header: 'Remark', render: (z: SalesZone) => z.remark || '-' },
    ];

    return (
        <PageContainer title="Sales Zone">
            <div className="flex items-center justify-between mb-6">
                <h2
                    className="text-lg font-semibold cursor-pointer hover:text-primary transition-colors"
                    onClick={() => {
                        setSearchQuery('');
                        queryClient.invalidateQueries({ queryKey: ['sales_zones'] });
                    }}
                    title="Click to refresh"
                >
                    Sales Zone
                </h2>
                <Button onClick={handleCreate}>
                    <Plus className="h-4 w-4 mr-2" />Add Sales Zone
                </Button>
            </div>

            <TableToolbar
                onRefresh={() => queryClient.invalidateQueries({ queryKey: ['sales_zones'] })}
                onExport={handleExport}
                searchValue={searchQuery}
                onSearchChange={setSearchQuery}
                searchPlaceholder="Search Zone Name..."
                pageSize={rowsPerPage}
                onPageSizeChange={setRowsPerPage}
            />

            <DataTable
                columns={columns}
                data={filteredZones}
                keyExtractor={(z) => z.id}
                emptyMessage="No data available in table"
                isLoading={isLoading}
                onRowClick={handleEdit}
            />

            <SalesZoneDialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                zoneToEdit={zoneToEdit}
            />

            <ConfirmDialog
                open={!!deleteId}
                onOpenChange={(open) => !open && setDeleteId(null)}
                title="Delete Sales Zone"
                description="Are you sure you want to delete this zone?"
                confirmLabel="Delete"
                onConfirm={() => deleteId && deleteZone.mutate(deleteId)}
                isLoading={deleteZone.isPending}
                variant="destructive"
            />
        </PageContainer>
    );
}
