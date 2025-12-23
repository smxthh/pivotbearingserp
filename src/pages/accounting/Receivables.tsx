import { useState } from 'react';
import { PageContainer } from '@/components/shared/PageContainer';
import { DataTable, Column } from '@/components/shared/DataTable';
import { useReceivables, ReceivablePayable } from '@/hooks/useReceivablesPayables';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { RefreshCw, TrendingUp, Users, FileText, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export default function Receivables() {
  const { receivables, totalReceivable, partyCount, isLoading, refetch } = useReceivables();
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

  const filteredReceivables = receivables.filter(
    (r) =>
      r.party_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.phone?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      (r.state?.toLowerCase() || '').includes(searchQuery.toLowerCase())
  );

  // Count overdue
  const overdueCount = receivables.filter(r => r.outstanding_balance > 0 && isOverdue(r.earliest_due_date)).length;

  const columns: Column<ReceivablePayable>[] = [
    {
      key: 'party_name',
      header: 'Customer Name',
      render: (r) => (
        <div>
          <div className="font-medium">{r.party_name}</div>
          {r.phone && <div className="text-xs text-muted-foreground">{r.phone}</div>}
        </div>
      ),
    },
    {
      key: 'state',
      header: 'State',
      render: (r) => <span className="text-sm">{r.state || '-'}</span>,
    },
    {
      key: 'total_invoiced',
      header: 'Invoiced',
      render: (r) => (
        <span className="text-sm font-medium">{formatCurrency(r.total_invoiced)}</span>
      ),
      className: 'text-right',
    },
    {
      key: 'total_paid',
      header: 'Received',
      render: (r) => (
        <span className="text-sm text-muted-foreground">{formatCurrency(r.total_paid)}</span>
      ),
      className: 'text-right',
    },
    {
      key: 'outstanding_balance',
      header: 'Balance',
      render: (r) => (
        <span className={cn(
          "font-semibold text-base",
          r.outstanding_balance > 0 ? "text-green-600" : r.outstanding_balance < 0 ? "text-red-600" : "text-muted-foreground"
        )}>
          {r.outstanding_balance >= 0 ? '' : '('}{formatCurrency(r.outstanding_balance)}{r.outstanding_balance < 0 ? ')' : ''}
          {r.outstanding_balance > 0 && <span className="text-xs ml-1">Dr</span>}
          {r.outstanding_balance < 0 && <span className="text-xs ml-1">Cr</span>}
        </span>
      ),
      className: 'text-right',
    },
    {
      key: 'earliest_due_date',
      header: 'Due Date',
      render: (r) => {
        const overdue = r.outstanding_balance > 0 && isOverdue(r.earliest_due_date);
        return (
          <div className={cn(
            "text-sm",
            overdue && "text-red-600 font-medium"
          )}>
            {r.earliest_due_date ? (
              <div className="flex items-center gap-1">
                {overdue && <AlertCircle className="h-3 w-3" />}
                {formatDate(r.earliest_due_date)}
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
      render: (r) => (
        <span className="text-xs text-muted-foreground">
          {formatDate(r.last_transaction_date)}
        </span>
      ),
      className: 'text-center',
    },
  ];

  if (isLoading) {
    return (
      <PageContainer title="Outstanding Receivables">
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
    <PageContainer title="Outstanding Receivables">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="p-6 bg-gradient-to-br from-green-50 to-white dark:from-green-950/20 dark:to-background border-green-200 dark:border-green-800">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Total Receivables</p>
              <p className="text-3xl font-bold text-green-600 dark:text-green-400">{formatCurrency(totalReceivable)}</p>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/20 dark:to-background border-blue-200 dark:border-blue-800">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Customers with Dues</p>
              <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{partyCount}</p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-red-50 to-white dark:from-red-950/20 dark:to-background border-red-200 dark:border-red-800">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Overdue</p>
              <p className="text-3xl font-bold text-red-600 dark:text-red-400">{overdueCount}</p>
            </div>
            <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-purple-50 to-white dark:from-purple-950/20 dark:to-background border-purple-200 dark:border-purple-800">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Total Customers</p>
              <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">{receivables.length}</p>
            </div>
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <FileText className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </Card>
      </div>

      {/* Actions Bar */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Input
            type="text"
            placeholder="Search customers..."
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
        data={filteredReceivables}
        keyExtractor={(r) => r.party_id}
        emptyMessage="No customer transactions found"
      />
    </PageContainer>
  );
}
