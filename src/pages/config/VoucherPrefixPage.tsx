import { useState, useMemo, useEffect } from 'react';
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
import { Plus, RefreshCw, Download, Settings, Trash2, Search, Pencil, Wand2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useVoucherPrefixes, VoucherPrefix } from '@/hooks/useVoucherPrefixes';
import { AddVoucherPrefixDialog } from '@/components/config/AddVoucherPrefixDialog';
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

export default function VoucherPrefixPage() {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editData, setEditData] = useState<VoucherPrefix | null>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [recordToDelete, setRecordToDelete] = useState<VoucherPrefix | null>(null);

    // Filters
    const [globalSearch, setGlobalSearch] = useState('');
    const debouncedSearch = useDebounce(globalSearch, 500);
    const [pageSize, setPageSize] = useState(25);
    const [currentPage, setCurrentPage] = useState(1);

    // Data fetching
    const {
        prefixList,
        totalCount,
        isLoading,
        refetch,
        deletePrefix,
        seedDefaults,
        profile
    } = useVoucherPrefixes({
        page: currentPage,
        pageSize,
        search: debouncedSearch
    });

    // Auto-seed defaults if empty
    useEffect(() => {
        if (!isLoading && totalCount === 0 && profile?.id) {
            // Show seed button instead of auto-seeding
        }
    }, [isLoading, totalCount, profile?.id]);

    // Reset page when search changes
    useMemo(() => {
        setCurrentPage(1);
    }, [debouncedSearch]);

    // Pagination
    const totalPages = Math.ceil(totalCount / pageSize);

    // Handlers
    const handleAddClick = () => {
        setEditData(null);
        setIsDialogOpen(true);
    };

    const handleEditClick = (record: VoucherPrefix) => {
        setEditData(record);
        setIsDialogOpen(true);
    };

    const handleDeleteClick = (record: VoucherPrefix) => {
        setRecordToDelete(record);
        setDeleteDialogOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (recordToDelete) {
            await deletePrefix.mutateAsync(recordToDelete.id);
            setDeleteDialogOpen(false);
            setRecordToDelete(null);
        }
    };

    const handleSeedDefaults = async () => {
        await seedDefaults.mutateAsync();
    };

    const handleRefresh = () => refetch();

    const handleExportExcel = async () => {
        if (!profile?.id) return;

        const { data } = await supabase
            .from('voucher_prefixes')
            .select('*')
            .eq('distributor_id', profile.id)
            .order('voucher_name', { ascending: true });

        if (!data) return;

        const exportData = data.map((record: VoucherPrefix, index: number) => ({
            '#': index + 1,
            'Voucher Name': record.voucher_name,
            'Voucher Prefix': record.voucher_prefix,
            'Separator': record.prefix_separator,
            'Year Format': record.year_format,
            'Auto Start No.': record.auto_start_no,
            'Is Default?': record.is_default ? 'Yes' : 'No',
            'Status': record.is_active ? 'Active' : 'Inactive',
        }));

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Voucher Prefixes');
        XLSX.writeFile(wb, 'voucher_prefixes.xlsx');
    };

    const headerActions = (
        <div className="flex gap-2">
            {totalCount === 0 && (
                <Button onClick={handleSeedDefaults} variant="outline" className="rounded-lg" disabled={seedDefaults.isPending}>
                    <Wand2 className="h-4 w-4 mr-2" />
                    {seedDefaults.isPending ? 'Seeding...' : 'Seed Defaults'}
                </Button>
            )}
            <Button onClick={handleAddClick} className="rounded-lg">
                <Plus className="h-4 w-4 mr-2" />
                Add Prefix
            </Button>
        </div>
    );

    // Loading skeleton
    if (isLoading) {
        return (
            <PageContainer title="Voucher Prefix">
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
        <PageContainer title="Voucher Prefix" actions={headerActions}>
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
                                <TableHead className="text-primary-foreground text-xs">Voucher Name</TableHead>
                                <TableHead className="text-primary-foreground text-xs">Voucher Prefix</TableHead>
                                <TableHead className="text-primary-foreground text-xs">Prefix Separator</TableHead>
                                <TableHead className="text-primary-foreground text-xs">Year Format</TableHead>
                                <TableHead className="text-primary-foreground text-xs">Auto Start No.</TableHead>
                                <TableHead className="text-primary-foreground text-xs">Is Default?</TableHead>
                                <TableHead className="text-primary-foreground text-xs">Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {prefixList.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground bg-gray-50/50">
                                        No data available. Click "Seed Defaults" to create standard prefixes.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                prefixList.map((record, index) => (
                                    <TableRow key={record.id} className="hover:bg-muted/30">
                                        <TableCell>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                                        <Settings className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="start">
                                                    <DropdownMenuItem onClick={() => handleEditClick(record)}>
                                                        <Pencil className="h-4 w-4 mr-2" />
                                                        Edit
                                                    </DropdownMenuItem>
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
                                        <TableCell className="text-xs font-medium text-slate-700">{record.voucher_name}</TableCell>
                                        <TableCell className="text-xs font-medium text-primary">{record.voucher_prefix}</TableCell>
                                        <TableCell className="text-xs text-slate-600">{record.prefix_separator || '/'}</TableCell>
                                        <TableCell className="text-xs text-slate-600">{record.year_format || 'yy-yy'}</TableCell>
                                        <TableCell className="text-xs text-slate-600">{record.auto_start_no || 1}</TableCell>
                                        <TableCell className="text-xs">
                                            {record.is_default ? (
                                                <Badge variant="default" className="bg-blue-100 text-blue-800 hover:bg-blue-100">Yes</Badge>
                                            ) : (
                                                <span className="text-slate-500">No</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-xs">
                                            <span className={`px-2 py-1 rounded-full text-xs ${record.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                {record.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                        Showing {prefixList.length === 0 ? 0 : ((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalCount)} of {totalCount} entries
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

            {/* Add/Edit Dialog */}
            <AddVoucherPrefixDialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                editData={editData}
            />

            {/* Delete Confirmation */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete the prefix "{recordToDelete?.voucher_prefix}" for "{recordToDelete?.voucher_name}".
                            This action cannot be undone.
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
