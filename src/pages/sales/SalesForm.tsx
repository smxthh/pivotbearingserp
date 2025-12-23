import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { PageContainer } from '@/components/shared/PageContainer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useApp } from '@/contexts/AppContext';
import { InvoiceItem } from '@/lib/mock-data';
import { useToast } from '@/hooks/use-toast';

export default function SalesForm() {
  const navigate = useNavigate();
  const { parties, items, addSalesInvoice, salesInvoices } = useApp();
  const { toast } = useToast();

  const customers = parties.filter((p) => p.type === 'customer' || p.type === 'both');

  const [partyId, setPartyId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([]);

  const nextInvoiceNumber = useMemo(() => {
    const count = salesInvoices.length + 1;
    return `INV-2024-${count.toString().padStart(3, '0')}`;
  }, [salesInvoices]);

  const addInvoiceItem = () => {
    setInvoiceItems([
      ...invoiceItems,
      { itemId: '', itemName: '', quantity: 1, price: 0, gstPercent: 18, total: 0 },
    ]);
  };

  const updateInvoiceItem = (index: number, field: keyof InvoiceItem, value: string | number) => {
    const updated = [...invoiceItems];
    
    if (field === 'itemId') {
      const selectedItem = items.find((i) => i.id === value);
      if (selectedItem) {
        updated[index] = {
          ...updated[index],
          itemId: selectedItem.id,
          itemName: selectedItem.name,
          price: selectedItem.salePrice,
          gstPercent: selectedItem.gstPercent,
        };
      }
    } else {
      (updated[index] as unknown as Record<string, unknown>)[field] = value;
    }

    // Calculate total
    const qty = updated[index].quantity;
    const price = updated[index].price;
    const gst = updated[index].gstPercent;
    updated[index].total = qty * price * (1 + gst / 100);

    setInvoiceItems(updated);
  };

  const removeInvoiceItem = (index: number) => {
    setInvoiceItems(invoiceItems.filter((_, i) => i !== index));
  };

  const subtotal = invoiceItems.reduce((sum, item) => sum + item.quantity * item.price, 0);
  const taxAmount = invoiceItems.reduce(
    (sum, item) => sum + (item.quantity * item.price * item.gstPercent) / 100,
    0
  );
  const grandTotal = subtotal + taxAmount;

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(value);

  const handleSubmit = () => {
    if (!partyId) {
      toast({ title: 'Error', description: 'Please select a customer', variant: 'destructive' });
      return;
    }
    if (invoiceItems.length === 0) {
      toast({ title: 'Error', description: 'Please add at least one item', variant: 'destructive' });
      return;
    }

    // Check stock availability
    for (const invItem of invoiceItems) {
      const stockItem = items.find((i) => i.id === invItem.itemId);
      if (stockItem && stockItem.stockQuantity < invItem.quantity) {
        toast({
          title: 'Insufficient stock',
          description: `${stockItem.name} has only ${stockItem.stockQuantity} units available`,
          variant: 'destructive',
        });
        return;
      }
    }

    const party = parties.find((p) => p.id === partyId);
    addSalesInvoice({
      invoiceNumber: nextInvoiceNumber,
      date,
      partyId,
      partyName: party?.name || '',
      items: invoiceItems,
      subtotal,
      taxAmount,
      grandTotal,
      type: 'sale',
      status: 'completed',
    });

    toast({ title: 'Invoice saved', description: 'Sale recorded successfully' });
    navigate('/sales');
  };

  return (
    <PageContainer title="New Sale Invoice">
      <Button variant="ghost" onClick={() => navigate('/sales')} className="mb-4">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Sales
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Invoice Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Header */}
          <div className="bg-card rounded-lg border p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Invoice Number</Label>
                <Input value={nextInvoiceNumber} disabled className="mt-1.5" />
              </div>
              <div>
                <Label>Date</Label>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label>Customer</Label>
                <Select value={partyId} onValueChange={setPartyId}>
                  <SelectTrigger className="mt-1.5">
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
          </div>

          {/* Items */}
          <div className="bg-card rounded-lg border p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Items</h3>
              <Button variant="outline" size="sm" onClick={addInvoiceItem}>
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </div>

            <div className="space-y-4">
              {invoiceItems.map((item, index) => (
                <div key={index} className="grid grid-cols-12 gap-3 items-end">
                  <div className="col-span-4">
                    {index === 0 && <Label className="text-xs">Item</Label>}
                    <Select
                      value={item.itemId}
                      onValueChange={(v) => updateInvoiceItem(index, 'itemId', v)}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select item" />
                      </SelectTrigger>
                      <SelectContent>
                        {items.map((i) => (
                          <SelectItem key={i.id} value={i.id}>
                            {i.name} ({i.stockQuantity} in stock)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2">
                    {index === 0 && <Label className="text-xs">Qty</Label>}
                    <Input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) =>
                        updateInvoiceItem(index, 'quantity', parseInt(e.target.value) || 0)
                      }
                      className="mt-1"
                    />
                  </div>
                  <div className="col-span-2">
                    {index === 0 && <Label className="text-xs">Price</Label>}
                    <Input
                      type="number"
                      value={item.price}
                      onChange={(e) =>
                        updateInvoiceItem(index, 'price', parseFloat(e.target.value) || 0)
                      }
                      className="mt-1"
                    />
                  </div>
                  <div className="col-span-2">
                    {index === 0 && <Label className="text-xs">GST %</Label>}
                    <Input type="number" value={item.gstPercent} disabled className="mt-1" />
                  </div>
                  <div className="col-span-1">
                    {index === 0 && <Label className="text-xs">Total</Label>}
                    <p className="py-2 text-sm font-medium tabular-nums">
                      {formatCurrency(item.total)}
                    </p>
                  </div>
                  <div className="col-span-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeInvoiceItem(index)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}

              {invoiceItems.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  No items added. Click "Add Item" to begin.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="space-y-6">
          <div className="bg-card rounded-lg border p-6 sticky top-24">
            <h3 className="font-semibold mb-4">Summary</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="tabular-nums">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tax</span>
                <span className="tabular-nums">{formatCurrency(taxAmount)}</span>
              </div>
              <div className="border-t pt-3 flex justify-between font-semibold">
                <span>Grand Total</span>
                <span className="tabular-nums text-lg">{formatCurrency(grandTotal)}</span>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <Button className="w-full" onClick={handleSubmit}>
                Save Invoice
              </Button>
              <Button variant="outline" className="w-full" onClick={() => navigate('/sales')}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
