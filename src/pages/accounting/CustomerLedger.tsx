import { useState } from 'react';
import { Search } from 'lucide-react';
import { PageContainer } from '@/components/shared/PageContainer';
import { DataTable, Column } from '@/components/shared/DataTable';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useApp } from '@/contexts/AppContext';

interface LedgerEntry {
  id: string;
  date: string;
  particulars: string;
  debit: number;
  credit: number;
  balance: number;
}

export default function CustomerLedger() {
  const { parties, salesInvoices } = useApp();
  const customers = parties.filter((p) => p.type === 'customer' || p.type === 'both');
  const [selectedParty, setSelectedParty] = useState('');

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(value);

  const ledgerEntries: LedgerEntry[] = [];
  if (selectedParty) {
    const party = parties.find((p) => p.id === selectedParty);
    let runningBalance = party?.openingBalance || 0;

    // Opening balance
    ledgerEntries.push({
      id: 'opening',
      date: '-',
      particulars: 'Opening Balance',
      debit: runningBalance > 0 ? runningBalance : 0,
      credit: runningBalance < 0 ? Math.abs(runningBalance) : 0,
      balance: runningBalance,
    });

    // Add sales invoices
    const partyInvoices = salesInvoices
      .filter((inv) => inv.partyId === selectedParty)
      .sort((a, b) => a.date.localeCompare(b.date));

    partyInvoices.forEach((inv) => {
      runningBalance += inv.grandTotal;
      ledgerEntries.push({
        id: inv.id,
        date: inv.date,
        particulars: `Sale - ${inv.invoiceNumber}`,
        debit: inv.grandTotal,
        credit: 0,
        balance: runningBalance,
      });
    });
  }

  const columns: Column<LedgerEntry>[] = [
    { key: 'date', header: 'Date' },
    { key: 'particulars', header: 'Particulars' },
    {
      key: 'debit',
      header: 'Debit',
      render: (e) => (e.debit > 0 ? formatCurrency(e.debit) : '-'),
      className: 'text-right',
    },
    {
      key: 'credit',
      header: 'Credit',
      render: (e) => (e.credit > 0 ? formatCurrency(e.credit) : '-'),
      className: 'text-right',
    },
    {
      key: 'balance',
      header: 'Balance',
      render: (e) => (
        <span className={e.balance >= 0 ? 'text-success' : 'text-destructive'}>
          {formatCurrency(Math.abs(e.balance))} {e.balance >= 0 ? 'Dr' : 'Cr'}
        </span>
      ),
      className: 'text-right font-medium',
    },
  ];

  return (
    <PageContainer title="Customer Ledger">
      <div className="flex items-center gap-4 mb-6">
        <div className="w-72">
          <Select value={selectedParty} onValueChange={setSelectedParty}>
            <SelectTrigger>
              <SelectValue placeholder="Select customer" />
            </SelectTrigger>
            <SelectContent>
              {customers.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {selectedParty ? (
        <DataTable
          columns={columns}
          data={ledgerEntries}
          keyExtractor={(e) => e.id}
          emptyMessage="No transactions found"
        />
      ) : (
        <div className="bg-card rounded-lg border p-12 text-center">
          <p className="text-muted-foreground">Select a customer to view their ledger</p>
        </div>
      )}
    </PageContainer>
  );
}
