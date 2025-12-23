import { PageContainer } from '@/components/shared/PageContainer';
import { DataTable, Column } from '@/components/shared/DataTable';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { topStates } from '@/lib/mock-data';

interface StateReport {
  state: string;
  revenue: number;
}

export default function StateWiseSales() {
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(value);

  const formatCompact = (value: number) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value);

  const columns: Column<StateReport>[] = [
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
    { key: 'state', header: 'State' },
    {
      key: 'revenue',
      header: 'Revenue',
      render: (s) => <span className="font-semibold">{formatCurrency(s.revenue)}</span>,
      className: 'text-right',
    },
  ];

  const totalRevenue = topStates.reduce((sum, s) => sum + s.revenue, 0);

  return (
    <PageContainer title="State-wise Sales">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-card rounded-lg border p-6">
          <div>
            <p className="text-sm text-muted-foreground">Total Revenue Across States</p>
            <p className="text-3xl font-bold text-success mt-1">{formatCurrency(totalRevenue)}</p>
          </div>
        </div>

        <div className="bg-card rounded-lg border p-6">
          <h3 className="font-semibold mb-4">Revenue by State</h3>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topStates} layout="vertical" margin={{ left: 80 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  type="number"
                  tickFormatter={formatCompact}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                />
                <YAxis
                  type="category"
                  dataKey="state"
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={topStates}
        keyExtractor={(s) => s.state}
        emptyMessage="No state data available"
      />
    </PageContainer>
  );
}
