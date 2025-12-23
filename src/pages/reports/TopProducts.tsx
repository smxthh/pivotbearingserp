import { PageContainer } from '@/components/shared/PageContainer';
import { DataTable, Column } from '@/components/shared/DataTable';
import { topSellingProducts } from '@/lib/mock-data';

interface ProductReport {
  name: string;
  quantity: number;
  revenue: number;
}

export default function TopProducts() {
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(value);

  const columns: Column<ProductReport>[] = [
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
    { key: 'name', header: 'Product Name' },
    {
      key: 'quantity',
      header: 'Qty Sold',
      className: 'text-right',
    },
    {
      key: 'revenue',
      header: 'Revenue',
      render: (p) => <span className="font-semibold">{formatCurrency(p.revenue)}</span>,
      className: 'text-right',
    },
  ];

  const totalRevenue = topSellingProducts.reduce((sum, p) => sum + p.revenue, 0);

  return (
    <PageContainer title="Top Products">
      <div className="bg-card rounded-lg border p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Total Revenue from Top Products</p>
            <p className="text-3xl font-bold text-success mt-1">{formatCurrency(totalRevenue)}</p>
          </div>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={topSellingProducts}
        keyExtractor={(p) => p.name}
        emptyMessage="No product data available"
      />
    </PageContainer>
  );
}
