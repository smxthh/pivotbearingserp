---
description: Universal Dialog Box Design Pattern (Based on Tax Invoice)
---

# Universal Dialog Box Design Pattern

**Reference Implementation:** `src/components/accounting/TaxInvoiceDialog.tsx`

This workflow defines the standard design pattern for all dialog boxes in the ERP system, ensuring consistency, modern UI/UX, and maintainability.

---

## 🎨 Design Principles

1. **Minimalist & Clean** - Curved corners, ample white space, clear hierarchy
2. **Brand Blue Theme** - Use `text-primary`, `bg-primary` for accents
3. **Responsive** - Grid-based layout using `grid-cols-12` for precise control
4. **Type-Safe** - Always use Zod schemas for validation
5. **Searchable Dropdowns** - Use `SearchablePartySelect` or Command components
6. **Separate Item Entry** - Complex forms use separate dialogs (e.g., `ItemSelectionDialog`)
7. **Real-time Calculations** - Use `useMemo` for computed values
8. **Consistent Spacing** - `space-y-5` for sections, `gap-4` for grids

---

## 📋 Standard Dialog Structure

### 1. **Imports (Standard Set)**

```tsx
import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Plus, Trash2, Edit2 } from 'lucide-react';
import * as SelectPrimitive from '@radix-ui/react-select';
```

### 2. **Form Schema Pattern**

```tsx
const formSchema = z.object({
    // Document identifiers
    doc_prefix: z.string().default('PREFIX/25-26/'),
    doc_number: z.coerce.number().min(1, 'Required'),
    doc_date: z.string().min(1, 'Required'),
    
    // Party information
    party_id: z.string().min(1, 'Required'),
    
    // Transaction details
    memo_type: z.string().default('Debit'),
    gst_type: z.string().min(1, 'Required'),
    
    // Optional fields
    notes: z.string().optional(),
    apply_round_off: z.boolean().default(true),
});

type FormData = z.infer<typeof formSchema>;
```

### 3. **State Management Pattern**

```tsx
// Data hooks
const { createVoucher, isCreating } = useVouchers({ realtime: false });
const { parties } = useParties({ realtime: true });
const { ledgers } = useLedgers({ realtime: true });

// Local state
const [items, setItems] = useState<InvoiceItem[]>([]);
const [isItemDialogOpen, setIsItemDialogOpen] = useState(false);
const [editingItem, setEditingItem] = useState<InvoiceItem | null>(null);
const [editingIndex, setEditingIndex] = useState<number>(-1);

// Form state
const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
} = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { /* ... */ },
});
```

---

## 🏗️ Layout Pattern (Grid-Based)

### **Row 1: Document Header (12-column grid)**

```tsx
<div className="grid grid-cols-12 gap-4">
    {/* Doc No. - 2 columns */}
    <div className="col-span-2 space-y-2">
        <Label className="text-sm">Doc. No.</Label>
        <div className="flex gap-1">
            <Select value={watchedPrefix} onValueChange={v => setValue('doc_prefix', v)}>
                <SelectTrigger className="w-20">
                    <SelectValue />
                </SelectTrigger>
                <SelectPrimitive.Portal>
                    <SelectContent>
                        {prefixes.map(p => (
                            <SelectItem key={p} value={p}>{p}</SelectItem>
                        ))}
                    </SelectContent>
                </SelectPrimitive.Portal>
            </Select>
            <Input type="number" {...register('doc_number')} className="w-12" />
        </div>
    </div>

    {/* Date - 2 columns */}
    <div className="col-span-2 space-y-2">
        <Label className="text-sm">
            Date <span className="text-destructive">*</span>
        </Label>
        <Input type="date" {...register('doc_date')} />
    </div>

    {/* Party Name - 5 columns */}
    <div className="col-span-5 space-y-2">
        <div className="flex items-center justify-between">
            <Label className="text-sm">
                Party Name <span className="text-destructive">*</span>
            </Label>
            <div className="flex gap-2 text-xs">
                <a href="#" className="text-primary hover:underline">+ Create [Type]</a>
                <a href="#" className="text-primary hover:underline">+ Add New</a>
            </div>
        </div>
        <SearchablePartySelect
            value={watchedPartyId}
            onChange={(v) => setValue('party_id', v)}
            partyType="customer"
            placeholder="Select Party"
            error={!!errors.party_id}
        />
        {/* Optional: Balance & Turnover */}
        <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>Cl. Balance: <span className="font-medium">{formatCurrency(0)}</span></span>
            <span>T.O.: <span className="font-medium">0</span></span>
        </div>
    </div>

    {/* GST No. - 3 columns */}
    <div className="col-span-3 space-y-2">
        <Label className="text-sm">GST NO.</Label>
        <Input
            value={selectedParty?.gst_number || ''}
            disabled
            placeholder="Select GST No."
            className="bg-muted"
        />
    </div>
</div>
```

### **Row 2: Transaction Details (12-column grid)**

```tsx
<div className="grid grid-cols-12 gap-4">
    {/* 2 col + 4 col + 3 col + 3 col = 12 columns */}
    <div className="col-span-2 space-y-2">
        {/* Memo Type or similar */}
    </div>
    <div className="col-span-4 space-y-2">
        {/* GST Type or main dropdown */}
    </div>
    <div className="col-span-3 space-y-2">
        {/* Additional field 1 */}
    </div>
    <div className="col-span-3 space-y-2">
        {/* Additional field 2 */}
    </div>
</div>
```

---

## 📊 Item Table Pattern

### **Standard Table Structure**

```tsx
<div className="space-y-3">
    <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Item Details :</Label>
        <Button type="button" size="sm" onClick={() => setIsItemDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Add
        </Button>
    </div>

    <div className="border rounded-lg overflow-hidden">
        <Table>
            <TableHeader>
                <TableRow className="bg-primary hover:bg-primary">
                    <TableHead className="text-primary-foreground text-xs w-10">#</TableHead>
                    <TableHead className="text-primary-foreground text-xs">Item Name</TableHead>
                    <TableHead className="text-primary-foreground text-xs">HSN Code</TableHead>
                    <TableHead className="text-primary-foreground text-xs text-right">Qty</TableHead>
                    <TableHead className="text-primary-foreground text-xs">UOM</TableHead>
                    <TableHead className="text-primary-foreground text-xs text-right">Price</TableHead>
                    <TableHead className="text-primary-foreground text-xs text-right">Disc.</TableHead>
                    <TableHead className="text-primary-foreground text-xs text-right">CGST</TableHead>
                    <TableHead className="text-primary-foreground text-xs text-right">SGST</TableHead>
                    <TableHead className="text-primary-foreground text-xs text-right">Amount</TableHead>
                    <TableHead className="text-primary-foreground text-xs">Remark</TableHead>
                    <TableHead className="text-primary-foreground text-xs w-20">Action</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {items.length === 0 ? (
                    <TableRow>
                        <TableCell colSpan={12} className="text-center text-sm text-muted-foreground py-8">
                            No data available in table
                        </TableCell>
                    </TableRow>
                ) : (
                    items.map((item, index) => (
                        <TableRow key={index} className="hover:bg-muted/50">
                            {/* Table cells... */}
                            <TableCell>
                                <div className="flex gap-1">
                                    <Button variant="ghost" size="icon" className="h-7 w-7"
                                        onClick={() => handleEditItem(item, index)}>
                                        <Edit2 className="h-3 w-3" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive"
                                        onClick={() => handleDeleteItem(index)}>
                                        <Trash2 className="h-3 w-3" />
                                    </Button>
                                </div>
                            </TableCell>
                        </TableRow>
                    ))
                )}
                {/* Total Row */}
                <TableRow className="bg-muted/50 font-semibold">
                    <TableCell colSpan={9} className="text-right text-xs">Total</TableCell>
                    <TableCell className="text-right text-xs">{formatCurrency(total)}</TableCell>
                    <TableCell colSpan={2}></TableCell>
                </TableRow>
            </TableBody>
        </Table>
    </div>
</div>
```

---

## 💰 Summary Section Pattern

```tsx
<div className="space-y-2">
    <div className="bg-primary text-primary-foreground px-3 py-2 rounded-lg text-xs font-semibold">
        Description
    </div>
    <div className="grid grid-cols-4 gap-4 text-xs">
        {/* Sub Total */}
        <div className="flex justify-between items-center py-1 border-b col-span-3">
            <span className="text-primary font-medium">Sub Total</span>
        </div>
        <div className="py-1 border-b text-right font-medium">
            {formatCurrency(totals.subtotal)}
        </div>

        {/* CGST */}
        <div className="flex justify-between items-center py-1 border-b col-span-3">
            <span className="text-muted-foreground">CGST</span>
        </div>
        <div className="py-1 border-b text-right font-medium">
            {formatCurrency(totals.totalCGST)}
        </div>

        {/* SGST */}
        <div className="flex justify-between items-center py-1 border-b col-span-3">
            <span className="text-muted-foreground">SGST</span>
        </div>
        <div className="py-1 border-b text-right font-medium">
            {formatCurrency(totals.totalSGST)}
        </div>

        {/* Rounded Off */}
        <div className="flex justify-between items-center py-1 border-b col-span-3">
            <span className="text-muted-foreground">ROUNDED OFF</span>
        </div>
        <div className="py-1 border-b text-right font-medium">
            {formatCurrency(totals.roundOff)}
        </div>

        {/* Net Amount */}
        <div className="bg-primary text-primary-foreground px-2 py-2 rounded flex items-center col-span-3">
            <span className="font-semibold">Net. Amount</span>
        </div>
        <div className="bg-primary text-primary-foreground px-2 py-2 rounded text-right">
            <span className="font-bold">{formatCurrency(totals.netAmount)}</span>
        </div>
    </div>
</div>
```

---

## 🎯 Dialog Footer Pattern

```tsx
<DialogFooter>
    <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
        Cancel
    </Button>
    <Button type="submit" disabled={isCreating || items.length === 0}>
        {isCreating ? 'Saving...' : 'Save'}
    </Button>
</DialogFooter>
```

---

## 📐 Spacing Guidelines

| Element | Class | Size |
|---------|-------|------|
| Section spacing | `space-y-5` | 20px (1.25rem) |
| Grid gap | `gap-4` | 16px (1rem) |
| Field spacing | `space-y-2` | 8px (0.5rem) |
| Button icon gap | `gap-1` | 4px (0.25rem) |
| Rounded corners | `rounded-lg` | 8px |
| Dialog content | `sm:max-w-[1000px]` | 1000px max width |

---

## 🎨 Color Scheme

| Element | Class | Usage |
|---------|-------|-------|
| Primary actions | `bg-primary text-primary-foreground` | Buttons, headers, highlights |
| Table header | `bg-primary hover:bg-primary` | Table header row |
| Required fields | `text-destructive` | Asterisk (*) |
| Muted text | `text-muted-foreground` | Secondary information |
| Disabled inputs | `bg-muted` | Read-only fields |
| Hover states | `hover:bg-muted/50` | Table rows, interactive elements |

---

## ✅ Validation Pattern

```tsx
// Zod schema with proper error messages
const formSchema = z.object({
    field_name: z.string().min(1, 'Required'),
    optional_field: z.string().optional(),
    number_field: z.coerce.number().min(1, 'Must be at least 1'),
    boolean_field: z.boolean().default(true),
});

// Error display
<Input
    {...register('field_name')}
    className={errors.field_name ? 'border-destructive' : ''}
/>
```

---

## 🔄 Real-time Calculations Pattern

```tsx
const totals = useMemo(() => {
    let subtotal = 0;
    let totalCGST = 0;
    let totalSGST = 0;

    items.forEach(item => {
        subtotal += item.amount - (item.amount * item.discount_percent / 100);
        totalCGST += item.cgst_amount;
        totalSGST += item.sgst_amount;
    });

    const beforeRoundOff = subtotal + totalCGST + totalSGST;
    const roundOff = applyRoundOff ? Math.round(beforeRoundOff) - beforeRoundOff : 0;
    const netAmount = beforeRoundOff + roundOff;

    return { subtotal, totalCGST, totalSGST, roundOff, netAmount };
}, [items, applyRoundOff]);
```

---

## 📝 Step-by-Step Implementation

### **Creating a New Dialog**

// turbo-all

1. **Create schema file**: `src/components/[module]/[Name]Dialog.tsx`

2. **Copy structure from** `TaxInvoiceDialog.tsx`:
   - Imports
   - Form schema
   - State management
   - Layout structure

3. **Customize fields**:
   - Update form schema for your fields
   - Adjust grid column spans (always sum to 12)
   - Modify table columns as needed

4. **Add calculations**:
   - Create `useMemo` for real-time totals
   - Add `formatCurrency` helper

5. **Implement handlers**:
   - Form submission
   - Item add/edit/delete
   - Dialog reset on open/close

6. **Style consistently**:
   - Use `text-primary` for brand colors
   - Apply `rounded-lg` for curves
   - Maintain `space-y-5` section spacing

7. **Test validation**:
   - Required fields show asterisk
   - Error states apply `border-destructive`
   - Submission disabled while saving

---

## 🚀 Quick Reference Checklist

When creating a new dialog, ensure:

- [ ] Uses `grid-cols-12` for main rows
- [ ] Required fields have `<span className="text-destructive">*</span>`
- [ ] Table header has `bg-primary hover:bg-primary`
- [ ] Summary section has blue `Description` header
- [ ] Net Amount row has `bg-primary` background
- [ ] Cancel button is `variant="outline"`
- [ ] Save button disables when `isCreating` or no items
- [ ] Dialog resets on `open` change with `useEffect`
- [ ] All dropdowns use `SelectPrimitive.Portal`
- [ ] Currency formatted with `formatCurrency` helper
- [ ] Items can be edited/deleted with icon buttons
- [ ] Empty table shows "No data available in table"
- [ ] Total row in table has `bg-muted/50 font-semibold`

---

## 📚 Example Dialogs Following This Pattern

1. ✅ **TaxInvoiceDialog.tsx** (Reference)
2. ✅ **DebitNoteDialog.tsx**
3. ✅ **PurchaseInvoiceDialog.tsx**
4. ✅ **LedgerDialog.tsx** (Simpler variant)

---

## 🎯 Key Takeaways

1. **Consistency is King** - Every dialog follows this exact structure
2. **Grid-Based Layout** - Always use `grid-cols-12` for flexibility
3. **Blue Highlights** - Brand blue for headers, totals, and primary actions
4. **Real-time Feedback** - Calculations update as user types
5. **Type-Safe Forms** - Zod validation catches errors early
6. **Separate Item Entry** - Complex forms use child dialogs
7. **Professional Polish** - Rounded corners, proper spacing, smooth animations

---

**Last Updated**: 2025-12-17  
**Status**: Production Standard  
**Reference**: Tax Invoice Dialog (Best Practice)
