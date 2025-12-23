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
import { useTerms, Term } from '@/hooks/useTerms';
import { AddTermsDialog } from '@/components/config/AddTermsDialog';
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

export default function TermsPage() {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [recordToDelete, setRecordToDelete] = useState<Term | null>(null);

    // Filters
    const [globalSearch, setGlobalSearch] = useState('');
    const debouncedSearch = useDebounce(globalSearch, 500);
    const [pageSize, setPageSize] = useState(25);
    const [currentPage, setCurrentPage] = useState(1);

    // Data fetching
    const { terms, totalCount, isLoading, refetch, deleteTerm, profile } = useTerms({
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
    const handleAddClick = () => setIsDialogOpen(true);

    const handleDeleteClick = (record: Term) => {
        setRecordToDelete(record);
        setDeleteDialogOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (recordToDelete) {
            await deleteTerm.mutateAsync(recordToDelete.id);
            setDeleteDialogOpen(false);
            setRecordToDelete(null);
        }
    };

    const handleRefresh = () => refetch();

    const handleExportExcel = async () => {
        if (!profile?.id) return;

        const { data } = await supabase
            .from('terms')
            .select('*')
            .eq('distributor_id', profile.id)
            .order('created_at', { ascending: false });

        if (!data) return;

        const exportData = data.map((record: any, index: number) => ({
            '#': index + 1,
            'Title': record.title,
            'Type': record.type || '-',
            'Conditions': record.conditions,
        }));

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Terms');
        XLSX.writeFile(wb, 'terms.xlsx');
    };

    const headerActions = (
        <Button onClick={handleAddClick} className="rounded-lg">
            <Plus className="h-4 w-4 mr-2" />
            Add Terms
        </Button>
    );

    // Loading skeleton
    if (isLoading) {
        return (
            <PageContainer title="Terms">
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
        <PageContainer title="Terms" actions={headerActions}>
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

                    {/* Global Search */}
                    <div className="relative w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="search"
                            placeholder="Search..."
                            value={globalSearch}
                            onChange={(e) => setGlobalSearch(e.target.value)}
                            className="pl-9 rounded-lg"
                        />
                    </div>
                </div>

                {/* Table */}
                <div className="bg-card rounded-xl border overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-primary hover:bg-primary">
                                <TableHead className="text-primary-foreground text-xs w-16">Action</TableHead>
                                <TableHead className="text-primary-foreground text-xs w-10">#</TableHead>
                                <TableHead className="text-primary-foreground text-xs">Title</TableHead>
                                <TableHead className="text-primary-foreground text-xs">Type</TableHead>
                                <TableHead className="text-primary-foreground text-xs">Conditions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {terms.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground bg-gray-50/50">
                                        No data available in table
                                    </TableCell>
                                </TableRow>
                            ) : (
                                terms.map((record, index) => (
                                    <TableRow key={record.id} className="hover:bg-muted/30">
                                        <TableCell>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                                        <Settings className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="start">
                                                    <DropdownMenuItem
                                                        onClick={() => handleDeleteClick(record)}
                                                        className="text-destructive"
                                                    >
                                                        <Trash2 className="h-4 w-4 mr-2" />
                                                        Delete
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                        <TableCell className="text-xs text-slate-600">
                                            {(currentPage - 1) * pageSize + index + 1}
                                        </TableCell>
                                        <TableCell className="text-xs font-medium text-primary">{record.title}</TableCell>
                                        <TableCell className="text-xs text-slate-600 capitalize">{record.type || '-'}</TableCell>
                                        <TableCell className="text-xs text-slate-600 max-w-[300px] truncate">{record.conditions}</TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                        Showing {terms.length === 0 ? 0 : ((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalCount)} of {totalCount} entries
                    </span>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="rounded-lg"
                        >
                            Previous
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage >= totalPages}
                            className="rounded-lg"
                        >
                            Next
                        </Button>
                    </div>
                </div>
            </div>

            {/* Add Dialog */}
            <AddTermsDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} />

            {/* Delete Confirmation */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete this term. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive hover:bg-destructive/90">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </PageContainer>
    );
}
