import { useState } from 'react';
import { PageContainer } from '@/components/shared/PageContainer';
import { DataTable, Column } from '@/components/shared/DataTable';
import { usePayables, ReceivablePayable } from '@/hooks/useReceivablesPayables';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { RefreshCw, TrendingDown, Users, FileText, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export default function Payables() {
  const { payables, totalPayable, partyCount, isLoading, refetch } = usePayables();
  const [searchQuery, setSearchQuery] = useState('');

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(Math.abs(value));

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const isOverdue = (dueDate: string | null) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  };

  const filteredPayables = payables.filter(
    (p) =>
      p.party_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.phone?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      (p.state?.toLowerCase() || '').includes(searchQuery.toLowerCase())
  );

  // Count overdue
  const overdueCount = payables.filter(p => p.outstanding_balance > 0 && isOverdue(p.earliest_due_date)).length;

  const columns: Column<ReceivablePayable>[] = [
    {
      key: 'party_name',
      header: 'Supplier Name',
      render: (p) => (
        <div>
          <div className="font-medium">{p.party_name}</div>
          {p.phone && <div className="text-xs text-muted-foreground">{p.phone}</div>}
        </div>
      ),
    },
    {
      key: 'state',
      header: 'State',
      render: (p) => <span className="text-sm">{p.state || '-'}</span>,
    },
    {
      key: 'total_invoiced',
      header: 'Billed',
      render: (p) => (
        <span className="text-sm font-medium">{formatCurrency(p.total_invoiced)}</span>
      ),
      className: 'text-right',
    },
    {
      key: 'total_paid',
      header: 'Paid',
      render: (p) => (
        <span className="text-sm text-muted-foreground">{formatCurrency(p.total_paid)}</span>
      ),
      className: 'text-right',
    },
    {
      key: 'outstanding_balance',
      header: 'Balance',
      render: (p) => (
        <span className={cn(
          "font-semibold text-base",
          p.outstanding_balance > 0 ? "text-red-600" : p.outstanding_balance < 0 ? "text-green-600" : "text-muted-foreground"
        )}>
          {p.outstanding_balance >= 0 ? '' : '('}{formatCurrency(p.outstanding_balance)}{p.outstanding_balance < 0 ? ')' : ''}
          {p.outstanding_balance > 0 && <span className="text-xs ml-1">Cr</span>}
          {p.outstanding_balance < 0 && <span className="text-xs ml-1">Dr</span>}
        </span>
      ),
      className: 'text-right',
    },
    {
      key: 'earliest_due_date',
      header: 'Due Date',
      render: (p) => {
        const overdue = p.outstanding_balance > 0 && isOverdue(p.earliest_due_date);
        return (
          <div className={cn(
            "text-sm",
            overdue && "text-red-600 font-medium"
          )}>
            {p.earliest_due_date ? (
              <div className="flex items-center gap-1">
                {overdue && <AlertCircle className="h-3 w-3" />}
                {formatDate(p.earliest_due_date)}
              </div>
            ) : '-'}
          </div>
        );
      },
      className: 'text-center',
    },
    {
      key: 'last_transaction_date',
      header: 'Last Txn',
      render: (p) => (
        <span className="text-xs text-muted-foreground">
          {formatDate(p.last_transaction_date)}
        </span>
      ),
      className: 'text-center',
    },
  ];

  if (isLoading) {
    return (
      <PageContainer title="Outstanding Payables">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <Skeleton className="h-96" />
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer title="Outstanding Payables">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="p-6 bg-gradient-to-br from-red-50 to-white dark:from-red-950/20 dark:to-background border-red-200 dark:border-red-800">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Total Payables</p>
              <p className="text-3xl font-bold text-red-600 dark:text-red-400">{formatCurrency(totalPayable)}</p>
            </div>
            <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <TrendingDown className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-orange-50 to-white dark:from-orange-950/20 dark:to-background border-orange-200 dark:border-orange-800">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Suppliers with Dues</p>
              <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">{partyCount}</p>
            </div>
            <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
              <Users className="h-6 w-6 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-yellow-50 to-white dark:from-yellow-950/20 dark:to-background border-yellow-200 dark:border-yellow-800">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Overdue</p>
              <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">{overdueCount}</p>
            </div>
            <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
              <AlertCircle className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-amber-50 to-white dark:from-amber-950/20 dark:to-background border-amber-200 dark:border-amber-800">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Total Suppliers</p>
              <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">{payables.length}</p>
            </div>
            <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
              <FileText className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
        </Card>
      </div>

      {/* Actions Bar */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Input
            type="text"
            placeholder="Search suppliers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-64"
          />
        </div>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={filteredPayables}
        keyExtractor={(p) => p.party_id}
        emptyMessage="No supplier transactions found"
      />
    </PageContainer>
  );
}
