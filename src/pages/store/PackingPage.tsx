import { useState, useMemo } from 'react';
import { useDebounce } from '@/hooks/use-debounce';
import { supabase } from '@/integrations/supabase/client';
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
import { Plus, RefreshCw, Download, Settings, Trash2, Search } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { usePacking, Packing } from '@/hooks/usePacking';
import { AddPackingDialog } from '@/components/store/AddPackingDialog';
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

export default function PackingPage() {


    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [documentToDelete, setDocumentToDelete] = useState<Packing | null>(null);

    // Filters
    const [globalSearch, setGlobalSearch] = useState('');
    const debouncedSearch = useDebounce(globalSearch, 500);
    const [pageSize, setPageSize] = useState(25);
    const [currentPage, setCurrentPage] = useState(1);

    // Server-side data fetching
    const { packings: paginatedDocuments, totalCount, isLoading, refetch, deletePacking, profile } = usePacking({
        page: currentPage,
        pageSize,
        search: debouncedSearch
    });

    // Reset page when search changes
    useMemo(() => {
        setCurrentPage(1);
    }, [debouncedSearch]);

    // Pagination
    const totalPages = Math.ceil(totalCount / pageSize);

    // Handlers
    const handleAddClick = () => {
        setIsDialogOpen(true);
    };

    const handleDeleteClick = (doc: Packing) => {
        setDocumentToDelete(doc);
        setDeleteDialogOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (documentToDelete) {
            await deletePacking.mutateAsync(documentToDelete.id);
            setDeleteDialogOpen(false);
            setDocumentToDelete(null);
        }
    };

    const handleRefresh = () => {
        refetch();
    };

    const handleExportExcel = async () => {
        // Fetch all data for export matching current filter
        let query = supabase
            .from('packing')
            .select(`
                pck_number,
                pck_full_number,
                pck_date,
                quantity,
                distributor_id,
                items:item_id (name),
                store_locations:location_id (store_name, location),
                profiles:employee_id (email)
            `);

        if (debouncedSearch) {
            query = query.ilike('pck_full_number', `%${debouncedSearch}%`);
        }

        if (!profile?.id) return;

        const { data } = await query
            .eq('distributor_id', profile.id)
            .order('pck_date', { ascending: false });

        // Export logic here (omitted for brevity, assume similar to original but with fetched data)
        // Since we are moving fast, I'll just skip the actual file write logic in this step if user didn't explicitly ask for it to be perfect,
        // BUT I Should support it.
        if (!data) return;

        const exportData = data.map((doc: any, index: number) => ({
            '#': index + 1,
            'Packing No.': doc.pck_number,
            'Packing Date': new Date(doc.pck_date).toLocaleDateString('en-IN'),
            'Item Name': doc.items?.name || '-',
            'Location': doc.store_locations ? `${doc.store_locations.store_name} - ${doc.store_locations.location}` : '-',
            'Qty': doc.quantity,
            'Employee': doc.profiles?.email || '-',
        }));

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Packing');
        XLSX.writeFile(wb, 'packing_register.xlsx');
    };

    const headerActions = (
        <Button onClick={handleAddClick} className="rounded-lg">
            <Plus className="h-4 w-4 mr-2" />
            Add Packing
        </Button>
    );

    // Loading skeleton matched to ProductsPage
    if (isLoading) {
        return (
            <PageContainer title="Packing">
                <div className="space-y-4">
                    <div className="flex items-center gap-4">
                        <Skeleton className="h-10 w-64" />
                        <Skeleton className="h-10 w-32" />
                        <Skeleton className="h-10 w-28 ml-auto" />
                    </div>
                    <div className="bg-card rounded-xl border overflow-hidden">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="flex items-center gap-4 p-4 border-b last:border-b-0">
                                <Skeleton className="h-5 w-20" />
                                <Skeleton className="h-5 w-40" />
                                <Skeleton className="h-5 w-32" />
                                <Skeleton className="h-5 w-24 ml-auto" />
                            </div>
                        ))}
                    </div>
                </div>
            </PageContainer>
        );
    }

    return (
        <PageContainer title="Packing" actions={headerActions}>
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
                            <SelectTrigger className="w-[130px] rounded-lg">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="10">Show 10 rows</SelectItem>
                                <SelectItem value="25">Show 25 rows</SelectItem>
                                <SelectItem value="50">Show 50 rows</SelectItem>
                                <SelectItem value="100">Show 100 rows</SelectItem>
                            </SelectContent>
                        </Select>

                        <Button variant="outline" onClick={handleExportExcel} className="rounded-lg">
                            <Download className="h-4 w-4 mr-2" />
                            Excel
                        </Button>

                        <Button variant="outline" onClick={handleRefresh} className="rounded-lg">
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Refresh
                        </Button>
                    </div>

                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search....."
                            value={globalSearch}
                            onChange={(e) => setGlobalSearch(e.target.value)}
                            className="pl-9 w-[300px] rounded-lg"
                        />
                    </div>
                </div>

                {/* Table */}
                <div className="border rounded-lg overflow-hidden bg-white">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-slate-50 hover:bg-slate-50 border-b">
                                <TableHead className="w-[80px] text-xs font-bold text-slate-700">Action</TableHead>
                                <TableHead className="w-[50px] text-xs font-bold text-slate-700">#</TableHead>
                                <TableHead className="text-xs font-bold text-slate-700">Packing No.</TableHead>
                                <TableHead className="text-xs font-bold text-slate-700">Packing Date</TableHead>
                                <TableHead className="text-xs font-bold text-slate-700">Item Name</TableHead>
                                <TableHead className="text-xs font-bold text-slate-700">Location</TableHead>
                                <TableHead className="text-xs font-bold text-slate-700">Qty</TableHead>
                                <TableHead className="text-xs font-bold text-slate-700">Employee Name</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paginatedDocuments.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground bg-gray-50/50">
                                        No data available in table
                                    </TableCell>
                                </TableRow>
                            ) : (
                                paginatedDocuments.map((doc, index) => (
                                    <TableRow key={doc.id} className="hover:bg-muted/30">
                                        <TableCell>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500">
                                                        <Settings className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="start">
                                                    <DropdownMenuItem
                                                        onClick={() => handleDeleteClick(doc)}
                                                        className="text-destructive"
                                                    >
                                                        <Trash2 className="h-4 w-4 mr-2" />
                                                        Delete
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                        <TableCell className="text-xs text-muted-foreground">{(currentPage - 1) * pageSize + index + 1}</TableCell>
                                        <TableCell className="text-xs font-medium text-slate-700 bg-slate-50/50 px-2 rounded-sm border border-slate-100 w-fit">{doc.pck_number}</TableCell>
                                        <TableCell className="text-xs text-slate-600">
                                            {new Date(doc.pck_date).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                                        </TableCell>
                                        <TableCell className="text-xs font-medium text-primary">{doc.items?.name || '-'}</TableCell>
                                        <TableCell className="text-xs text-slate-600">
                                            {doc.store_locations ? `${doc.store_locations.store_name} - ${doc.store_locations.location}` : '-'}
                                        </TableCell>
                                        <TableCell className="text-xs text-slate-600">{doc.quantity}</TableCell>
                                        <TableCell className="text-xs text-slate-600">{doc.profiles?.email || '-'}</TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">
                        Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, totalCount)} of {totalCount} entries
                    </p>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="h-8 text-xs"
                        >
                            Previous
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages || totalPages === 0}
                            className="h-8 text-xs"
                        >
                            Next
                        </Button>
                    </div>
                </div>
            </div>

            {/* Dialog */}
            <AddPackingDialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
            />

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Packing Entry</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete {documentToDelete?.pck_number}?
                            This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleConfirmDelete}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            disabled={deletePacking.isPending}
                        >
                            {deletePacking.isPending ? 'Deleting...' : 'Delete'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </PageContainer>
    );
}
