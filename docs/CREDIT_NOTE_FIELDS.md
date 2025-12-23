# Credit Note Dialog - Field Validation & Mapping

## 📋 Complete Field Reference

This document maps each field from the reference image to the database schema and validation rules.

---

## 🎯 Field Mapping Table

| # | UI Field Label | Form Field Name | Database Column | Required | Type | Validation | Default Value | Reference Image Location |
|---|---------------|-----------------|-----------------|----------|------|------------|---------------|------------------------|
| 1 | **CN. Type** | `cn_type` | `vouchers.cn_type` | ✅ Yes | Dropdown | Must be one of: 'Sales Credit Note', 'Purchase Credit Note' | 'Sales Credit Note' | Top row, 1st field |
| 2 | **CN. No.** (Prefix) | `doc_prefix` | `vouchers.doc_prefix` | ❌ No | Dropdown | One of: 'CN/25-26/', 'CRN/25-26/', 'CN-PUR/25-26/' | 'CN/25-26/' | Top row, 2nd field (left part) |
| 3 | **CN. No.** (Number) | `doc_number` | `vouchers.doc_number` | ✅ Yes | Number | Must be >= 1 | Auto-generated | Top row, 2nd field (right part) |
| 4 | **CN. Date** | `doc_date` | `vouchers.voucher_date` | ✅ Yes | Date | Valid date format | Today's date | Top row, 3rd field |
| 5 | **Party Name** | `party_id` | `vouchers.party_id` | ✅ Yes | Searchable Dropdown | Must exist in parties table | - | Top row, 4th field |
| 6 | **GST NO.** | - (auto-filled) | `vouchers.party_gstin` | ❌ No | Text (disabled) | Auto-filled from party data | - | Top row, 5th field |
| 7 | **Memo Type** | `memo_type` | `vouchers.memo_type` | ❌ No | Dropdown | One of: 'Credit', 'Debit' | 'Credit' | Row 2, 1st field |
| 8 | **GST Type** | `gst_type` | `vouchers.gst_type` | ✅ Yes | Dropdown | One of: 'GST Local Sales', 'GST Inter-State Sales', 'GST Exports' | 'GST Local Sales' | Row 2, 2nd field |
| 9 | **Eligibility For ITC** | `eligibility_itc` | `vouchers.eligibility_itc` | ❌ No | Dropdown | One of: 'Input', 'Input Services', 'Capital Goods' | 'Input' | Row 2, 3rd field |
| 10 | **Apply Round Off** | `apply_round_off` | `vouchers.apply_round_off` | ❌ No | Checkbox | Boolean | true | Row 2, 4th field |
| 11 | **Inv. No.** | `invoice_number` | `vouchers.invoice_number` | ❌ No | Text | Max 100 characters | - | Row 2, 5th field |
| 12 | **Inv. Date** | `invoice_date` | `vouchers.invoice_date` | ❌ No | Date | Valid date format | - | Row 2, 6th field |
| 13 | **Item Name** | `item_name` | `voucher_items.item_name` | ✅ Yes | Text (from item dialog) | Min 1 character | - | Item table column |
| 14 | **HSN Code** | `hsn_code` | `voucher_items.hsn_code` | ❌ No | Text | Max 20 characters | - | Item table column |
| 15 | **Qty** | `quantity` | `voucher_items.quantity` | ✅ Yes | Number | Must be > 0 | 1 | Item table column |
| 16 | **UOM** | `unit` | `voucher_items.unit` | ✅ Yes | Text | Max 20 characters | 'PCS' | Item table column |
| 17 | **Price** | `price` | `voucher_items.rate` | ✅ Yes | Number | Must be >= 0 | 0 | Item table column |
| 18 | **Disc.** | `discount_percent` | `voucher_items.discount_percent` | ❌ No | Number | 0-100% | 0 | Item table column |
| 19 | **CGST** | `cgst_percent` | Calculated | ❌ No | Number | 0-100% | 0 | Item table column |
| 20 | **SGST** | `sgst_percent` | Calculated | ❌ No | Number | 0-100% | 0 | Item table column |
| 21 | **Amount** | Calculated | `voucher_items.total_amount` | - | Calculated | - | - | Item table column |
| 22 | **Remark** | `remark` | - | ❌ No | Text | - | - | Item table column |
| 23 | **Sub Total** | Calculated | `vouchers.subtotal` | - | Calculated | Sum of all item amounts before tax | - | Description section |
| 24 | **CGST** (Total) | Calculated | `vouchers.cgst_amount` | - | Calculated | Sum of all CGST amounts | - | Description section |
| 25 | **SGST** (Total) | Calculated | `vouchers.sgst_amount` | - | Calculated | Sum of all SGST amounts | - | Description section |
| 26 | **ROUNDED OFF** | Calculated | `vouchers.round_off` | - | Calculated | Rounding adjustment | - | Description section |
| 27 | **Net. Amount** | Calculated | `vouchers.total_amount` | - | Calculated | Final payable amount | - | Description section |
| 28 | **Remark** (Notes) | `notes` | `vouchers.narration` | ❌ No | Textarea | Max 500 characters | - | Bottom notes field |

---

## 🔐 Validation Rules

### Form-Level Validation

```typescript
const formSchema = z.object({
    // Required fields
    cn_type: z.string().min(1, 'CN Type is required'),
    doc_number: z.coerce.number().min(1, 'Document number must be at least 1'),
    doc_date: z.string().min(1, 'CN Date is required'),
    party_id: z.string().min(1, 'Party selection is required'),
    gst_type: z.string().min(1, 'GST Type is required'),
    
    // Optional fields with defaults
    doc_prefix: z.string().default('CN/25-26/'),
    memo_type: z.string().default('Credit'),
    eligibility_itc: z.string().default('Input'),
    apply_round_off: z.boolean().default(true),
    
    // Optional fields
    invoice_number: z.string().optional(),
    invoice_date: z.string().optional(),
    notes: z.string().optional(),
});
```

### Item-Level Validation

```typescript
const itemSchema = z.object({
    // Required fields
    item_name: z.string().min(1, 'Item name is required'),
    quantity: z.coerce.number().min(0.001, 'Quantity must be greater than 0'),
    price: z.coerce.number().min(0, 'Price cannot be negative'),
    
    // Optional fields with defaults
    unit: z.string().default('PCS'),
    discount_percent: z.coerce.number().min(0).max(100).default(0),
    cgst_percent: z.coerce.number().min(0).max(100).default(0),
    sgst_percent: z.coerce.number().min(0).max(100).default(0),
    igst_percent: z.coerce.number().min(0).max(100).default(0),
    
    // Optional fields
    item_id: z.string().optional(),
    hsn_code: z.string().optional(),
    remark: z.string().optional(),
});
```

---

## 🧮 Calculation Logic

### Item-Level Calculations

```typescript
// For each item:
const baseAmount = quantity * price;
const discountAmount = baseAmount * (discount_percent / 100);
const taxableAmount = baseAmount - discountAmount;

const cgstAmount = taxableAmount * (cgst_percent / 100);
const sgstAmount = taxableAmount * (sgst_percent / 100);
const igstAmount = taxableAmount * (igst_percent / 100);

const itemTotal = taxableAmount + cgstAmount + sgstAmount + igstAmount;
```

### Document-Level Calculations

```typescript
// Sum all items:
const subtotal = sum(items.map(i => i.quantity * i.price));
const totalCGST = sum(items.map(i => i.cgst_amount));
const totalSGST = sum(items.map(i => i.sgst_amount));
const totalIGST = sum(items.map(i => i.igst_amount));

// Calculate round-off (if enabled):
const beforeRoundOff = subtotal + totalCGST + totalSGST + totalIGST;
const roundOff = applyRoundOff ? Math.round(beforeRoundOff) - beforeRoundOff : 0;

// Final amount:
const netAmount = beforeRoundOff + roundOff;
```

---

## 🎨 UI Component Mapping

### Grid Layout Structure

```
Row 1 (12 columns):
├─ CN Type (2 cols)
├─ CN No. (2 cols)
├─ CN Date (2 cols)
├─ Party Name (3 cols)
└─ GST NO. (3 cols)

Row 2 (12 columns):
├─ Memo Type (2 cols)
├─ GST Type (3 cols)
├─ Eligibility ITC (3 cols)
├─ Round Off (1 col)
├─ Inv. No. (2 cols)
└─ Inv. Date (1 col)

Item Table (full width):
└─ Columns: #, Item Name, HSN, Qty, UOM, Price, Disc., CGST, SGST, Amount, Remark, Action

Description Section (4 columns):
├─ Label (3 cols) + Value (1 col)
├─ Sub Total
├─ CGST
├─ SGST
├─ ROUNDED OFF
└─ Net Amount (highlighted)
```

---

## 🔄 Auto-Fill Logic

### 1. Party Selection → GST Number
```typescript
// When party is selected:
const selectedParty = parties.find(p => p.id === party_id);
setValue('party_gstin', selectedParty?.gst_number || '');
```

### 2. GST Type → Tax Calculation Mode
```typescript
// If Inter-State:
if (gst_type === 'GST Inter-State Sales') {
    // Use IGST (full GST rate)
    igst_percent = item.gst_percent;
    cgst_percent = 0;
    sgst_percent = 0;
} else {
    // Use CGST + SGST (split equally)
    cgst_percent = item.gst_percent / 2;
    sgst_percent = item.gst_percent / 2;
    igst_percent = 0;
}
```

### 3. CN Type → Party Filter
```typescript
// Filter parties based on CN type:
const partyType = cn_type === 'Sales Credit Note' ? 'customer' : 'supplier';
const filteredParties = parties.filter(p => p.party_type === partyType);
```

---

## ✅ Field Validation Summary

### Critical Validations

1. **At least 1 item must be added** - Enforced before form submission
2. **Party must exist** - Validates against `parties` table
3. **Document number must be unique** - Per prefix, per distributor
4. **Date cannot be in future** - Optional business rule
5. **GST calculations must be accurate** - Based on taxable amount

### Optional Business Rules

```typescript
// Example: Prevent credit note amount exceeding original invoice
if (invoice_number) {
    const originalInvoice = await fetchInvoice(invoice_number);
    if (netAmount > originalInvoice.total_amount) {
        throw new Error('Credit note cannot exceed original invoice amount');
    }
}
```

---

## 🎯 Error Messages

### Form Validation Errors

| Field | Error Condition | Error Message |
|-------|----------------|---------------|
| `cn_type` | Empty | "CN Type is required" |
| `doc_number` | < 1 | "Document number must be at least 1" |
| `doc_date` | Empty | "CN Date is required" |
| `party_id` | Empty | "Party selection is required" |
| `gst_type` | Empty | "GST Type is required" |
| Items | Length = 0 | "Please add at least one item" |

### Item Validation Errors

| Field | Error Condition | Error Message |
|-------|----------------|---------------|
| `item_name` | Empty | "Item name is required" |
| `quantity` | <= 0 | "Quantity must be greater than 0" |
| `price` | < 0 | "Price cannot be negative" |
| `discount_percent` | > 100 | "Discount cannot exceed 100%" |

---

## 📊 Database Constraints

### Unique Constraints

```sql
-- Unique voucher number per distributor
UNIQUE(distributor_id, doc_prefix, doc_number) 
WHERE voucher_type = 'credit_note' AND status != 'cancelled'
```

### Check Constraints

```sql
-- CN Type validation
CHECK (cn_type IN ('Sales Credit Note', 'Purchase Credit Note'))

-- Memo Type validation
CHECK (memo_type IN ('Credit', 'Debit'))

-- GST Type validation
CHECK (gst_type IN ('GST Local Sales', 'GST Inter-State Sales', 'GST Exports'))

-- Eligibility ITC validation
CHECK (eligibility_itc IN ('Input', 'Input Services', 'Capital Goods'))
```

---

## 🧪 Test Cases

### Test Case 1: Valid Sales Credit Note
```typescript
const validData = {
    cn_type: 'Sales Credit Note',
    doc_prefix: 'CN/25-26/',
    doc_number: 1,
    doc_date: '2025-12-17',
    party_id: 'valid-customer-uuid',
    gst_type: 'GST Local Sales',
    memo_type: 'Credit',
    eligibility_itc: 'Input',
    apply_round_off: true,
    items: [{
        item_name: 'Test Product',
        quantity: 10,
        price: 100,
        discount_percent: 0,
        cgst_percent: 9,
        sgst_percent: 9,
    }]
};
// Expected: Success ✅
```

### Test Case 2: Invalid - Missing Party
```typescript
const invalidData = {
    ...validData,
    party_id: '', // Missing ❌
};
// Expected: Error "Party selection is required"
```

### Test Case 3: Invalid - No Items
```typescript
const invalidData = {
    ...validData,
    items: [], // Empty ❌
};
// Expected: Error "Please add at least one item"
```

---

## 📝 Notes

1. **Auto-Calculation**: All monetary values (amounts, taxes) are calculated in real-time using React `useMemo`
2. **GST Logic**: Tax split (CGST/SGST vs IGST) depends on `gst_type` field
3. **Round-Off**: Applied only when `apply_round_off` is true
4. **Party Balance**: Fetched from ledgers but not mandatory for credit note creation
5. **Document Number**: Must be sequential but can be manually overridden

---

**Last Updated**: 2025-12-17  
**Validation Version**: 1.0.0  
**Status**: Complete & Verified ✅
