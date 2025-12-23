import { PageContainer } from '@/components/shared/PageContainer';
import { DataTable, Column } from '@/components/shared/DataTable';
import { topCustomers } from '@/lib/mock-data';

interface CustomerReport {
  name: string;
  orders: number;
  revenue: number;
}

export default function TopCustomers() {
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(value);

  const columns: Column<CustomerReport>[] = [
    {
      key: 'rank',
      header: '#',
      render: (_, index) => (
        <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-medium flex items-center justify-center">
          {(index as number) + 1}
        </span>
      ),
      className: 'w-12',
    },
    { key: 'name', header: 'Customer Name' },
    {
      key: 'orders',
      header: 'Total Orders',
      className: 'text-right',
    },
    {
      key: 'revenue',
      header: 'Total Revenue',
      render: (c) => <span className="font-semibold">{formatCurrency(c.revenue)}</span>,
      className: 'text-right',
    },
  ];

  const totalRevenue = topCustomers.reduce((sum, c) => sum + c.revenue, 0);

  return (
    <PageContainer title="Top Customers">
      <div className="bg-card rounded-lg border p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Total Revenue from Top Customers</p>
            <p className="text-3xl font-bold text-success mt-1">{formatCurrency(totalRevenue)}</p>
          </div>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={topCustomers}
        keyExtractor={(c) => c.name}
        emptyMessage="No customer data available"
      />
    </PageContainer>
  );
}
