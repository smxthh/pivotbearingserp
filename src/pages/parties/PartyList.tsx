import { useState } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  UserPlus,
  Eye,
  MapPin,
} from 'lucide-react';
import { PageContainer } from '@/components/shared/PageContainer';
import { TableToolbar } from '@/components/shared/TableToolbar';
import { DataTable, Column } from '@/components/shared/DataTable';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { PartyDialog } from '@/components/parties/PartyDialog';
import { DeliveryAddressDialog } from '@/components/parties/DeliveryAddressDialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useParties, Party, PartyType } from '@/hooks/useParties';
import { formatCurrency } from '@/lib/constants';
import { exportToCSV, formatCurrencyForExport } from '@/lib/exportUtils';

export default function PartyList() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<PartyType | 'all'>('customer');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deliveryDialogOpen, setDeliveryDialogOpen] = useState(false);
  const [editingParty, setEditingParty] = useState<Party | null>(null);
  const [selectedParty, setSelectedParty] = useState<Party | null>(null);
  const [pageSize, setPageSize] = useState(25);

  const { parties, isLoading, deleteParty, isDeleting, refetch } = useParties();

  const handleExport = () => {
    exportToCSV(
      filteredParties,
      [
        { key: 'name', header: 'Company Name' },
        { key: 'city', header: 'City/Village', render: (p) => p.city || '-' },
        { key: 'district', header: 'District', render: (p) => (p as any).district || p.state || '-' },
        { key: 'gst_number', header: 'GSTIN', render: (p) => p.gst_number || '-' },
        { key: 'phone', header: 'Phone', render: (p) => p.phone || '-' },
        { key: 'current_balance', header: 'Balance', render: (p) => formatCurrencyForExport(p.current_balance) },
        { key: 'type', header: 'Type' },
      ],
      `parties_${typeFilter}`,
      'Party Master Report'
    );
  };

  // Filter parties based on search and type
  const filteredParties = parties.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.gst_number?.toLowerCase() || '').includes(search.toLowerCase()) ||
      p.state.toLowerCase().includes(search.toLowerCase()) ||
      (p.city?.toLowerCase() || '').includes(search.toLowerCase()) ||
      ((p as any).district?.toLowerCase() || '').includes(search.toLowerCase()) ||
      (p.phone?.toLowerCase() || '').includes(search.toLowerCase());

    const matchesType =
      typeFilter === 'all' ||
      p.type === typeFilter ||
      p.type === 'both';

    return matchesSearch && matchesType;
  });

  const handleAddParty = () => {
    setEditingParty(null);
    setDialogOpen(true);
  };

  const handleEditParty = (party: Party) => {
    setEditingParty(party);
    setDialogOpen(true);
  };

  const handleDelete = () => {
    if (deleteId) {
      deleteParty.mutate(deleteId, {
        onSuccess: () => setDeleteId(null),
      });
    }
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setEditingParty(null);
  };

  const getTypeVariant = (type: PartyType) => {
    switch (type) {
      case 'customer':
        return 'default';
      case 'supplier':
        return 'secondary';
      case 'both':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const columns: Column<Party>[] = [
    {
      key: 'action',
      header: 'Action',
      render: (p) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-primary/10 hover:bg-primary/20">
              <Plus className="h-4 w-4 text-primary" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-40">
            <DropdownMenuItem onClick={() => handleEditParty(p)}>
              <Edit2 className="h-4 w-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Eye className="h-4 w-4 mr-2" />
              View Ledger
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive" onClick={() => setDeleteId(p.id)}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
      className: 'w-[60px]',
    },
    {
      key: 'serial',
      header: '#',
      render: (_, index) => <span className="text-muted-foreground">{(index || 0) + 1}</span>,
      className: 'w-[40px]',
    },
    {
      key: 'name',
      header: 'Company Name',
      render: (p) => (
        <div>
          <p className="font-medium text-primary hover:underline cursor-pointer" onClick={() => handleEditParty(p)}>
            {p.name}
          </p>
        </div>
      ),
    },
    {
      key: 'city',
      header: 'City/Village',
      render: (p) => p.city || <span className="text-muted-foreground">-</span>,
    },
    {
      key: 'district',
      header: 'District',
      render: (p) => (p as any).district || p.state || <span className="text-muted-foreground">-</span>,
    },
    {
      key: 'gst_number',
      header: 'GSTIN',
      render: (p) => p.gst_number || <span className="text-muted-foreground">-</span>,
    },
    {
      key: 'current_balance',
      header: 'Balance',
      render: (p) => (
        <span className={p.current_balance >= 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
          {formatCurrency(p.current_balance)}
        </span>
      ),
      className: 'text-right',
    },
  ];

  // Loading skeleton
  if (isLoading) {
    return (
      <PageContainer title="Party Master">
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-28 ml-auto" />
          </div>
          <div className="bg-card rounded-xl border overflow-hidden">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-4 border-b last:border-b-0">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-5 w-20 ml-auto" />
              </div>
            ))}
          </div>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="Party Master"
      actions={
        <Button onClick={handleAddParty} className="rounded-lg">
          <Plus className="h-4 w-4 mr-2" />
          Add Customer
        </Button>
      }
    >
      {/* Sub Navigation */}
      <div className="flex items-center gap-2 mb-4">
        <Badge
          variant={typeFilter === 'customer' ? 'default' : 'outline'}
          className="cursor-pointer px-4 py-1.5"
          onClick={() => setTypeFilter('customer')}
        >
          Customer
        </Badge>
        <Badge
          variant={typeFilter === 'supplier' ? 'default' : 'outline'}
          className="cursor-pointer px-4 py-1.5"
          onClick={() => setTypeFilter('supplier')}
        >
          Supplier
        </Badge>
      </div>

      {/* Controls Row */}
      <TableToolbar
        onRefresh={refetch}
        onExport={handleExport}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by name, GST, city, district..."
        pageSize={pageSize}
        onPageSizeChange={setPageSize}
      />

      {/* Data Table */}
      {filteredParties.length === 0 ? (
        <div className="bg-card rounded-xl border p-12 text-center">
          <UserPlus className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No parties found</h3>
          <p className="text-muted-foreground mb-4">
            {search || typeFilter !== 'all'
              ? 'Try adjusting your filters'
              : 'Get started by adding your first party'}
          </p>
          {!search && typeFilter === 'all' && (
            <Button onClick={handleAddParty}>
              <Plus className="h-4 w-4 mr-2" />
              Add Customer
            </Button>
          )}
        </div>
      ) : (
        <div className="bg-card rounded-xl border overflow-hidden">
          {/* Table Header with Search */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-primary/90 text-primary-foreground">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium">Action</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">#</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Company Name</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">City/Village</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">District</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">GSTIN</th>
                  <th className="px-4 py-3 text-right text-sm font-medium">Balance</th>
                </tr>
              </thead>
              <tbody>
                {filteredParties.slice(0, pageSize).map((party, index) => (
                  <tr
                    key={party.id}
                    className="border-b last:border-b-0 hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-primary/10 hover:bg-primary/20">
                            <Plus className="h-4 w-4 text-primary" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-40">
                          <DropdownMenuItem onClick={() => handleEditParty(party)}>
                            <Edit2 className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => {
                            setSelectedParty(party);
                            setDeliveryDialogOpen(true);
                          }}>
                            <MapPin className="h-4 w-4 mr-2" />
                            Delivery Address
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Eye className="h-4 w-4 mr-2" />
                            View Ledger
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => setDeleteId(party.id)}>
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{index + 1}</td>
                    <td className="px-4 py-3">
                      <span
                        className="font-medium text-primary hover:underline cursor-pointer"
                        onClick={() => handleEditParty(party)}
                      >
                        {party.name}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">{party.city || '-'}</td>
                    <td className="px-4 py-3 text-sm">{(party as any).district || party.state || '-'}</td>
                    <td className="px-4 py-3 text-sm font-mono">{party.gst_number || '-'}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`font-medium ${party.current_balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(party.current_balance)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/20">
            <p className="text-sm text-muted-foreground">
              Showing 1 to {Math.min(pageSize, filteredParties.length)} of {filteredParties.length} entries
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled>
                Previous
              </Button>
              <Button variant="default" size="sm" className="px-3">
                1
              </Button>
              <Button variant="outline" size="sm" disabled={filteredParties.length <= pageSize}>
                Next
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Party Dialog */}
      <PartyDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        party={editingParty}
        onSuccess={() => refetch()}
      />

      {/* Delivery Address Dialog */}
      <DeliveryAddressDialog
        open={deliveryDialogOpen}
        onOpenChange={setDeliveryDialogOpen}
        party={selectedParty}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete Party"
        description="Are you sure you want to delete this party? This action cannot be undone. Associated transactions will remain but reference will be lost."
        confirmLabel={isDeleting ? 'Deleting...' : 'Delete'}
        onConfirm={handleDelete}
        variant="destructive"
      />
    </PageContainer>
  );
}
