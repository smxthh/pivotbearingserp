import { useState, useMemo } from 'react';
import { PageContainer } from '@/components/shared/PageContainer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Plus, RefreshCw, Download, Settings, Edit2, Trash2, Search } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useStoreLocations, StoreLocation } from '@/hooks/useStoreLocations';
import { StoreLocationDialog } from '@/components/store/StoreLocationDialog';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import * as XLSX from 'xlsx';

export default function StoreLocationPage() {
    const { storeLocations, isLoading, refetch, deleteLocation, isDeleting } = useStoreLocations();

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingLocation, setEditingLocation] = useState<StoreLocation | null>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [locationToDelete, setLocationToDelete] = useState<StoreLocation | null>(null);

    // Filters
    const [globalSearch, setGlobalSearch] = useState('');

    const [pageSize, setPageSize] = useState(25);
    const [currentPage, setCurrentPage] = useState(1);

    // Filter and search logic
    const filteredLocations = useMemo(() => {
        return storeLocations.filter((location) => {
            return globalSearch === '' ||
                location.store_name.toLowerCase().includes(globalSearch.toLowerCase()) ||
                location.location.toLowerCase().includes(globalSearch.toLowerCase()) ||
                (location.remark?.toLowerCase().includes(globalSearch.toLowerCase()));
        });
    }, [storeLocations, globalSearch]);

    // Pagination
    const totalPages = Math.ceil(filteredLocations.length / pageSize);
    const paginatedLocations = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return filteredLocations.slice(start, start + pageSize);
    }, [filteredLocations, currentPage, pageSize]);

    // Handlers
    const handleAddLocation = () => {
        setEditingLocation(null);
        setIsDialogOpen(true);
    };

    const handleEditLocation = (location: StoreLocation) => {
        setEditingLocation(location);
        setIsDialogOpen(true);
    };

    const handleDeleteClick = (location: StoreLocation) => {
        setLocationToDelete(location);
        setDeleteDialogOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (locationToDelete) {
            await deleteLocation.mutateAsync(locationToDelete.id);
            setDeleteDialogOpen(false);
            setLocationToDelete(null);
        }
    };

    const handleRefresh = () => {
        refetch();
    };

    const handleExportExcel = () => {
        const exportData = filteredLocations.map((location, index) => ({
            '#': index + 1,
            'Store Name': location.store_name,
            'Location': location.location,
            'Remark': location.remark || '',
        }));

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Store Locations');
        XLSX.writeFile(wb, 'store_locations.xlsx');
    };

    const headerActions = (
        <Button onClick={handleAddLocation} className="rounded-lg">
            <Plus className="h-4 w-4 mr-2" />
            Add Location
        </Button>
    );

    return (
        <PageContainer title="Store Location" actions={headerActions}>
            <div className="space-y-6">
                {/* Toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <Select
                            value={pageSize.toString()}
                            onValueChange={(v) => {
                                setPageSize(Number(v));
                                setCurrentPage(1);
                            }}
                        >
                            <SelectTrigger className="w-[130px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="10">Show 10 rows</SelectItem>
                                <SelectItem value="25">Show 25 rows</SelectItem>
                                <SelectItem value="50">Show 50 rows</SelectItem>
                                <SelectItem value="100">Show 100 rows</SelectItem>
                            </SelectContent>
                        </Select>

                        <Button variant="outline" onClick={handleExportExcel}>
                            <Download className="h-4 w-4 mr-2" />
                            Excel
                        </Button>

                        <Button variant="outline" onClick={handleRefresh}>
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Refresh
                        </Button>
                    </div>

                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search..."
                            value={globalSearch}
                            onChange={(e) => setGlobalSearch(e.target.value)}
                            className="pl-9 w-[250px]"
                        />
                    </div>
                </div>

                {/* Table */}
                <div className="border rounded-lg overflow-hidden bg-white">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/50">
                                <TableHead className="w-[80px] text-xs font-semibold">Action</TableHead>
                                <TableHead className="w-[50px] text-xs font-semibold">#</TableHead>
                                <TableHead className="text-xs font-semibold">Store Name</TableHead>
                                <TableHead className="text-xs font-semibold">Rack No.</TableHead>
                                <TableHead className="text-xs font-semibold">Remark</TableHead>
                            </TableRow>

                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-6" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                                    </TableRow>
                                ))
                            ) : paginatedLocations.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                        No data available in table
                                    </TableCell>
                                </TableRow>
                            ) : (
                                paginatedLocations.map((location, index) => (
                                    <TableRow key={location.id} className="hover:bg-muted/30">
                                        <TableCell>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                                        <Settings className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="start">
                                                    <DropdownMenuItem onClick={() => handleEditLocation(location)}>
                                                        <Edit2 className="h-4 w-4 mr-2" />
                                                        Edit
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        onClick={() => handleDeleteClick(location)}
                                                        className="text-destructive"
                                                    >
                                                        <Trash2 className="h-4 w-4 mr-2" />
                                                        Delete
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                        <TableCell className="text-sm">{(currentPage - 1) * pageSize + index + 1}</TableCell>
                                        <TableCell className="text-sm font-medium">{location.store_name}</TableCell>
                                        <TableCell className="text-sm text-primary">{location.location}</TableCell>
                                        <TableCell className="text-sm text-muted-foreground">{location.remark || '-'}</TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                        Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, filteredLocations.length)} of {filteredLocations.length} entries
                    </p>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                        >
                            Previous
                        </Button>
                        <div className="flex items-center gap-1">
                            {Array.from({ length: totalPages }, (_, i) => i + 1).slice(
                                Math.max(0, currentPage - 3),
                                currentPage + 2
                            ).map(page => (
                                <Button
                                    key={page}
                                    variant={currentPage === page ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => setCurrentPage(page)}
                                    className="w-8"
                                >
                                    {page}
                                </Button>
                            ))}
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages || totalPages === 0}
                        >
                            Next
                        </Button>
                    </div>
                </div>
            </div>

            {/* Add/Edit Dialog */}
            <StoreLocationDialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                editingLocation={editingLocation}
            />

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Store Location</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete "{locationToDelete?.store_name} - {locationToDelete?.location}"?
                            This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleConfirmDelete}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            disabled={isDeleting}
                        >
                            {isDeleting ? 'Deleting...' : 'Delete'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </PageContainer>
    );
}
