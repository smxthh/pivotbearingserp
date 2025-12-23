import { useState } from 'react';
import { PageContainer } from '@/components/shared/PageContainer';
import { DataTable, Column } from '@/components/shared/DataTable';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useApp } from '@/contexts/AppContext';
import { Invoice } from '@/lib/mock-data';

export default function SalesReport() {
  const { salesInvoices } = useApp();
  const [startDate, setStartDate] = useState('2024-01-01');
  const [endDate, setEndDate] = useState('2024-12-31');

  const filteredInvoices = salesInvoices.filter(
    (inv) => inv.date >= startDate && inv.date <= endDate
  );

  const totalSales = filteredInvoices.reduce((sum, inv) => sum + inv.grandTotal, 0);
  const totalTax = filteredInvoices.reduce((sum, inv) => sum + inv.taxAmount, 0);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(value);

  const columns: Column<Invoice>[] = [
    { key: 'date', header: 'Date' },
    { key: 'invoiceNumber', header: 'Invoice #' },
    { key: 'partyName', header: 'Customer' },
    {
      key: 'subtotal',
      header: 'Subtotal',
      render: (i) => formatCurrency(i.subtotal),
      className: 'text-right',
    },
    {
      key: 'taxAmount',
      header: 'Tax',
      render: (i) => formatCurrency(i.taxAmount),
      className: 'text-right',
    },
    {
      key: 'grandTotal',
      header: 'Total',
      render: (i) => <span className="font-semibold">{formatCurrency(i.grandTotal)}</span>,
      className: 'text-right',
    },
  ];

  return (
    <PageContainer title="Sales Report">
      {/* Filters */}
      <div className="bg-card rounded-lg border p-4 mb-6">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <Label className="text-sm">Start Date</Label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="mt-1 w-40"
            />
          </div>
          <div>
            <Label className="text-sm">End Date</Label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="mt-1 w-40"
            />
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-card rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Total Sales</p>
          <p className="text-2xl font-bold text-success mt-1">{formatCurrency(totalSales)}</p>
        </div>
        <div className="bg-card rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Total Tax Collected</p>
          <p className="text-2xl font-bold mt-1">{formatCurrency(totalTax)}</p>
        </div>
        <div className="bg-card rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Invoices</p>
          <p className="text-2xl font-bold mt-1">{filteredInvoices.length}</p>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filteredInvoices}
        keyExtractor={(i) => i.id}
        emptyMessage="No sales in selected period"
      />
    </PageContainer>
  );
}
