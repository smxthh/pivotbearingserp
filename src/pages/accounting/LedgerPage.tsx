import { useState } from 'react';
import { Plus, Eye, Edit, Trash2 } from 'lucide-react';
import { PageContainer } from '@/components/shared/PageContainer';
import { TableToolbar } from '@/components/shared/TableToolbar';
import { DataTable, Column } from '@/components/shared/DataTable';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useLedgers, useLedgerGroups, Ledger } from '@/hooks/useLedgers';
import { LedgerDialog } from '@/components/accounting/LedgerDialog';
import { OpeningBalanceDialog } from '@/components/accounting/OpeningBalanceDialog';
import { LedgerTransactionsDialog } from '@/components/accounting/LedgerTransactionsDialog';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { exportToCSV, formatCurrencyForExport } from '@/lib/exportUtils';

export default function LedgerPage() {
    const { groups } = useLedgerGroups();
    const { ledgers, isLoading, refetch, deleteLedger, isDeleting } = useLedgers({ isActive: true });

    // State
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedGroup, setSelectedGroup] = useState<string>('all');
    const [rowsPerPage, setRowsPerPage] = useState(25);
    const [currentPage, setCurrentPage] = useState(1);

    // Dialog states
    const [isLedgerDialogOpen, setIsLedgerDialogOpen] = useState(false);
    const [isOpeningBalanceDialogOpen, setIsOpeningBalanceDialogOpen] = useState(false);
    const [isTransactionsDialogOpen, setIsTransactionsDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [selectedLedger, setSelectedLedger] = useState<Ledger | null>(null);

    // Format currency
    const formatCurrency = (value: number) =>
        new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 2,
        }).format(Math.abs(value));

    // Filter ledgers
    const filteredLedgers = ledgers.filter(ledger => {
        const matchesSearch =
            ledger.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            ledger.group_name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesGroup = selectedGroup === 'all' || ledger.group_name === selectedGroup;
        return matchesSearch && matchesGroup;
    });

    // Pagination
    const totalPages = Math.ceil(filteredLedgers.length / rowsPerPage);
    const paginatedLedgers = filteredLedgers.slice(
        (currentPage - 1) * rowsPerPage,
        currentPage * rowsPerPage
    );

    // Get unique group names for filter
    const uniqueGroups = [...new Set(ledgers.map(l => l.group_name))].sort();

    // Handle row actions
    const handleView = (ledger: Ledger) => {
        setSelectedLedger(ledger);
        setIsTransactionsDialogOpen(true);
    };

    const handleEdit = (ledger: Ledger) => {
        setSelectedLedger(ledger);
        setIsLedgerDialogOpen(true);
    };

    const handleDelete = (ledger: Ledger) => {
        setSelectedLedger(ledger);
        setIsDeleteDialogOpen(true);
    };

    const confirmDelete = async () => {
        if (selectedLedger) {
            await deleteLedger.mutateAsync(selectedLedger.id);
            setIsDeleteDialogOpen(false);
            setSelectedLedger(null);
        }
    };

    // Export to Excel
    const handleExport = () => {
        exportToCSV(
            filteredLedgers,
            [
                { key: 'name', header: 'Ledger Name' },
                { key: 'group_name', header: 'Group Name' },
                { key: 'opening_balance', header: 'Opening Balance', render: (l) => `${l.opening_balance} ${l.opening_balance_type}` },
                { key: 'closing_balance', header: 'Closing Balance', render: (l) => formatCurrencyForExport(l.closing_balance || 0) },
            ],
            'ledgers',
            'Ledger Master Report'
        );
    };

    // Table columns
    const columns: Column<Ledger>[] = [
        {
            key: 'actions',
            header: 'Action',
            render: (ledger) => (
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                        e.stopPropagation();
                        handleView(ledger);
                    }}
                    className="h-8 w-8"
                >
                    <Eye className="h-4 w-4 text-primary" />
                </Button>
            ),
            className: 'w-16',
        },
        {
            key: 'index',
            header: '#',
            render: (_, index) => (currentPage - 1) * rowsPerPage + (index || 0) + 1,
            className: 'w-12',
        },
        {
            key: 'name',
            header: 'Ledger Name',
            render: (ledger) => (
                <div className="font-medium">{ledger.name}</div>
            ),
        },
        {
            key: 'group_name',
            header: 'Group Name',
            render: (ledger) => (
                <Badge variant="secondary" className="font-normal">
                    {ledger.group_name}
                </Badge>
            ),
        },
        {
            key: 'opening_balance',
            header: 'Op. Balance',
            render: (ledger) => (
                <span className={ledger.opening_balance === 0 ? 'text-muted-foreground' : ''}>
                    {ledger.opening_balance === 0
                        ? '0'
                        : `${formatCurrency(ledger.opening_balance)} ${ledger.opening_balance_type}`}
                </span>
            ),
            className: 'text-right',
        },
        {
            key: 'closing_balance',
            header: 'Cl. Balance',
            render: (ledger) => {
                const balance = ledger.current_balance ?? ledger.closing_balance ?? 0;
                return (
                    <span className={
                        balance === 0
                            ? 'text-muted-foreground'
                            : balance > 0
                                ? 'text-success font-medium'
                                : 'text-destructive font-medium'
                    }>
                        {balance === 0
                            ? '0'
                            : `${formatCurrency(balance)} ${balance >= 0 ? 'Dr' : 'Cr'}`}
                    </span>
                );
            },
            className: 'text-right',
        },
    ];

    // Loading skeleton
    if (isLoading) {
        return (
            <PageContainer title="Ledger">
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <Skeleton className="h-10 w-64" />
                        <div className="flex gap-2">
                            <Skeleton className="h-10 w-32" />
                            <Skeleton className="h-10 w-32" />
                        </div>
                    </div>
                    <div className="bg-card rounded-xl border">
                        {[...Array(10)].map((_, i) => (
                            <Skeleton key={i} className="h-12 m-2" />
                        ))}
                    </div>
                </div>
            </PageContainer>
        );
    }

    return (
        <PageContainer title="Ledger">
            {/* Header Actions */}
            <TableToolbar
                onRefresh={refetch}
                onExport={handleExport}
                searchValue={searchQuery}
                onSearchChange={setSearchQuery}
                searchPlaceholder="Search..."
                pageSize={rowsPerPage}
                onPageSizeChange={(v) => { setRowsPerPage(v); setCurrentPage(1); }}
            >
                <Select
                    value={selectedGroup}
                    onValueChange={(v) => { setSelectedGroup(v); setCurrentPage(1); }}
                >
                    <SelectTrigger className="w-[180px] bg-background">
                        <SelectValue placeholder="Filter by Group" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Groups</SelectItem>
                        {uniqueGroups.map(group => (
                            <SelectItem key={group} value={group}>{group}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsOpeningBalanceDialogOpen(true)}
                    className="rounded-lg"
                >
                    Update Op. Bal.
                </Button>
                <Button
                    size="sm"
                    onClick={() => { setSelectedLedger(null); setIsLedgerDialogOpen(true); }}
                    className="rounded-lg"
                >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Ledger
                </Button>
            </TableToolbar>

            <p className="text-sm text-muted-foreground mb-4">
                Showing {paginatedLedgers.length} of {filteredLedgers.length} entries
            </p>

            {/* Data Table */}
            <DataTable
                columns={columns}
                data={paginatedLedgers}
                keyExtractor={(ledger) => ledger.id}
                emptyMessage="No ledgers found"
                onRowClick={handleView}
            />

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-end gap-2 mt-4">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                    >
                        Previous
                    </Button>
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        const page = currentPage <= 3 ? i + 1 : currentPage + i - 2;
                        if (page > totalPages || page < 1) return null;
                        return (
                            <Button
                                key={page}
                                variant={currentPage === page ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setCurrentPage(page)}
                            >
                                {page}
                            </Button>
                        );
                    })}
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                    >
                        Next
                    </Button>
                </div>
            )}

            {/* Dialogs */}
            <LedgerDialog
                open={isLedgerDialogOpen}
                onOpenChange={setIsLedgerDialogOpen}
                ledger={selectedLedger}
                groups={groups}
            />

            <OpeningBalanceDialog
                open={isOpeningBalanceDialogOpen}
                onOpenChange={setIsOpeningBalanceDialogOpen}
                ledgers={ledgers}
            />

            {selectedLedger && (
                <LedgerTransactionsDialog
                    open={isTransactionsDialogOpen}
                    onOpenChange={setIsTransactionsDialogOpen}
                    ledger={selectedLedger}
                />
            )}

            <ConfirmDialog
                open={isDeleteDialogOpen}
                onOpenChange={setIsDeleteDialogOpen}
                title="Delete Ledger"
                description={`Are you sure you want to delete "${selectedLedger?.name}"? This action cannot be undone.`}
                confirmLabel="Delete"
                onConfirm={confirmDelete}
                isLoading={isDeleting}
                variant="destructive"
            />
        </PageContainer>
    );
}
