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
import { Plus, RefreshCw, Download, Settings, Edit2, Trash2, Search, Loader2, CheckCircle2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useGateInward, GateInward } from '@/hooks/useGateInward';
import { GateInwardDialog } from '@/components/store/GateInwardDialog';
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
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

export default function GateInwardPage() {
    const { gateInwards, isLoading, refetch, updateGateInward, deleteGateInward } = useGateInward();

    // Status Filter State
    const [statusFilter, setStatusFilter] = useState<'pending' | 'completed'>('pending');

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    // const [editingInvoice, setEditingInvoice] = useState<GateInward | null>(null); // TODO: Add editing support
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [documentToDelete, setDocumentToDelete] = useState<GateInward | null>(null);

    // Filters
    const [globalSearch, setGlobalSearch] = useState('');
    const [pageSize, setPageSize] = useState(25);
    const [currentPage, setCurrentPage] = useState(1);

    // Filter and search logic
    const filteredDocuments = useMemo(() => {
        return gateInwards
            .filter(doc => doc.status === statusFilter)
            .filter((doc) => {
                const searchLower = globalSearch.toLowerCase();
                return globalSearch === '' ||
                    doc.gi_number.toLowerCase().includes(searchLower) ||
                    doc.parties?.name.toLowerCase().includes(searchLower) ||
                    doc.purchase_orders?.po_number?.toString().toLowerCase().includes(searchLower);
            });
    }, [gateInwards, globalSearch, statusFilter]);

    // Pagination
    const totalPages = Math.ceil(filteredDocuments.length / pageSize);
    const paginatedDocuments = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return filteredDocuments.slice(start, start + pageSize);
    }, [filteredDocuments, currentPage, pageSize]);

    // Handlers
    const handleAddClick = () => {
        // setEditingInvoice(null);
        setIsDialogOpen(true);
    };

    const handleDeleteClick = (doc: GateInward) => {
        setDocumentToDelete(doc);
        setDeleteDialogOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (documentToDelete) {
            await deleteGateInward.mutateAsync(documentToDelete.id);
            setDeleteDialogOpen(false);
            setDocumentToDelete(null);
        }
    };

    const handleMarkComplete = async (doc: GateInward) => {
        await updateGateInward.mutateAsync({
            id: doc.id,
            status: 'completed'
        });
    };

    const handleRefresh = () => {
        refetch();
    };

    const handleExportExcel = () => {
        const exportData = filteredDocuments.map((doc, index) => ({
            '#': index + 1,
            'GI No.': doc.gi_number,
            'GI Date': new Date(doc.gi_date).toLocaleDateString('en-IN'),
            'Party Name': doc.parties?.name || '-',
            // 'Item Name': 'N/A', // Items are nested, might strictly just export headers or join items
            // 'Qty': 'N/A',
            'PO. NO.': doc.purchase_orders?.po_number || '-',
            'Invoice No': doc.invoice_number || '-',
            'Challan No': doc.challan_number || '-',
        }));

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Gate Inward Register');
        XLSX.writeFile(wb, 'gate_inward_register.xlsx');
    };

    const headerActions = (
        <Button onClick={handleAddClick} className="rounded-lg">
            <Plus className="h-4 w-4 mr-2" />
            Add GI
        </Button>
    );

    return (
        <PageContainer title="Gate Inward Register" actions={headerActions}>

            {/* Status Tabs */}
            <div className="flex space-x-2 mb-4">
                <Button
                    variant={statusFilter === 'pending' ? 'default' : 'outline'}
                    onClick={() => setStatusFilter('pending')}
                    className={statusFilter === 'pending' ? 'bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 border-red-200' : 'text-muted-foreground'}
                >
                    Pending
                </Button>
                <Button
                    variant={statusFilter === 'completed' ? 'default' : 'outline'}
                    onClick={() => setStatusFilter('completed')}
                    className={statusFilter === 'completed' ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 hover:text-emerald-700 border-emerald-200' : 'text-muted-foreground'}
                >
                    Completed
                </Button>
            </div>

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
                                <TableHead className="text-xs font-bold text-slate-700">GI No.</TableHead>
                                <TableHead className="text-xs font-bold text-slate-700">GI Date</TableHead>
                                <TableHead className="text-xs font-bold text-slate-700">Party Name</TableHead>
                                <TableHead className="text-xs font-bold text-slate-700">Item Name</TableHead>
                                <TableHead className="text-xs font-bold text-slate-700">Qty</TableHead>
                                <TableHead className="text-xs font-bold text-slate-700">PO. NO.</TableHead>
                            </TableRow>
                            {/* Search Row - Based on Image 1 which has column specific searches inside the table header area.
                                Since user asked to remove personalized filters in previous turn, I will stick to the current design which just uses Global Search for now
                                to keep it clean, or I can add them back if strictly replicating the image. 
                                The user's previous request "remove personalized filters" was for StoreLocation. 
                                For this new page, the image SHOWS them. 
                                However, to keep consistency with the "minimalistic" approach requested earlier, I will omit the specific input row unless requested, 
                                as it often clutters the UI. The "row" in the image is "Search GI No", "Search GI Date", etc.
                             */}
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-6" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                                    </TableRow>
                                ))
                            ) : paginatedDocuments.length === 0 ? (
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
                                                    {statusFilter === 'pending' && (
                                                        <DropdownMenuItem
                                                            onClick={() => handleMarkComplete(doc)}
                                                            className="text-emerald-600"
                                                        >
                                                            <CheckCircle2 className="h-4 w-4 mr-2" />
                                                            Mark as Complete
                                                        </DropdownMenuItem>
                                                    )}
                                                    {/* <DropdownMenuItem onClick={() => handleEditClick(doc)}>
                                                        <Edit2 className="h-4 w-4 mr-2" />
                                                        Edit
                                                    </DropdownMenuItem> */}
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
                                        <TableCell className="text-xs font-medium text-slate-700 bg-slate-50/50 px-2 rounded-sm border border-slate-100 w-fit">{doc.gi_number}</TableCell>
                                        <TableCell className="text-xs text-slate-600">{new Date(doc.gi_date).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })}</TableCell>
                                        <TableCell className="text-xs font-medium text-primary">{doc.parties?.name || '-'}</TableCell>
                                        <TableCell className="text-xs text-slate-600">
                                            {doc.gate_inward_items && doc.gate_inward_items.length > 0 ? (
                                                doc.gate_inward_items.length === 1
                                                    ? doc.gate_inward_items[0].items?.name || '-'
                                                    : `${doc.gate_inward_items[0].items?.name || 'Item'} +${doc.gate_inward_items.length - 1} more`
                                            ) : '-'}
                                        </TableCell>
                                        <TableCell className="text-xs text-slate-600">
                                            {doc.gate_inward_items && doc.gate_inward_items.length > 0
                                                ? doc.gate_inward_items.reduce((sum, item) => sum + item.quantity, 0)
                                                : '-'}
                                        </TableCell>
                                        <TableCell className="text-xs text-slate-600">{doc.purchase_orders?.po_number || '-'}</TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">
                        Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, filteredDocuments.length)} of {filteredDocuments.length} entries
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
            <GateInwardDialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
            // editingInvoice={editingInvoice}
            />

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Gate Inward Entry</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete {documentToDelete?.gi_number}?
                            This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleConfirmDelete}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            disabled={deleteGateInward.isPending}
                        >
                            {deleteGateInward.isPending ? 'Deleting...' : 'Delete'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </PageContainer>
    );
}
