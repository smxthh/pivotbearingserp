# Credit Note Module - SQL Commands & Field Reference

## 📋 Table of Contents
1. [Database Migration](#database-migration)
2. [Field Descriptions](#field-descriptions)
3. [Helper Functions](#helper-functions)
4. [Queries & Examples](#queries--examples)

---

## 🗄️ Database Migration

### Run Migration Command

```bash
# Navigate to project root
cd d:\pivotbearings-erp

# Apply migration using Supabase CLI
npx supabase db push

# OR manually execute the migration file
# Upload: supabase/migrations/add_credit_note_fields.sql to Supabase Dashboard
```

### Migration File Location
📁 `d:\pivotbearings-erp\supabase\migrations\add_credit_note_fields.sql`

---

## 📝 Field Descriptions

### Vouchers Table - Credit Note Fields

| Field Name | Data Type | Required | Description | Example Values |
|-----------|-----------|----------|-------------|----------------|
| `cn_type` | VARCHAR(50) | ✅ | Type of credit note | `'Sales Credit Note'`, `'Purchase Credit Note'` |
| `memo_type` | VARCHAR(20) | ❌ | Memo classification | `'Credit'`, `'Debit'` (default: `'Credit'`) |
| `gst_type` | VARCHAR(50) | ✅ | GST transaction type | `'GST Local Sales'`, `'GST Inter-State Sales'`, `'GST Exports'` |
| `eligibility_itc` | VARCHAR(50) | ❌ | Input Tax Credit type | `'Input'`, `'Input Services'`, `'Capital Goods'` (default: `'Input'`) |
| `invoice_number` | VARCHAR(100) | ❌ | Reference original invoice | `'TI/2526/0001'` |
| `invoice_date` | DATE | ❌ | Original invoice date | `'2025-12-17'` |
| `apply_round_off` | BOOLEAN | ❌ | Enable round-off | `true`, `false` (default: `true`) |
| `doc_prefix` | VARCHAR(50) | ❌ | Document number prefix | `'CN/25-26/'`, `'CRN/25-26/'` |
| `doc_number` | INTEGER | ❌ | Sequential document number | `1`, `2`, `3`, etc. |
| `party_gstin` | VARCHAR(20) | ❌ | Party's GST number | `'27AABCU9603R1ZM'` |
| `party_balance` | DECIMAL(15,2) | ❌ | Party closing balance | `50000.00` |
| `party_turnover` | DECIMAL(15,2) | ❌ | Total party turnover | `1500000.00` |

---

## ⚙️ Helper Functions

### 1. Generate Credit Note Number

```sql
-- Function to generate sequential credit note number
SELECT * FROM generate_credit_note_number(
    p_distributor_id := 'your-distributor-uuid',
    p_prefix := 'CN/25-26/'
);

-- Returns:
-- full_number: 'CN/25-26/1'
-- doc_number: 1
```

### 2. Get Party Closing Balance

```sql
-- Get current closing balance of a party
SELECT get_party_closing_balance('party-uuid');

-- Returns: DECIMAL value (e.g., 50000.00)
```

### 3. Get Party Turnover

```sql
-- Get total turnover for a party
SELECT get_party_turnover(
    p_party_id := 'party-uuid',
    p_distributor_id := 'distributor-uuid'
);

-- Returns: DECIMAL value (e.g., 1500000.00)
```

---

## 🔍 Queries & Examples

### Example 1: Insert Sales Credit Note

```sql
INSERT INTO vouchers (
    distributor_id,
    voucher_type,
    voucher_number,
    voucher_date,
    party_id,
    party_name,
    cn_type,
    memo_type,
    gst_type,
    eligibility_itc,
    doc_prefix,
    doc_number,
    invoice_number,
    invoice_date,
    apply_round_off,
    subtotal,
    cgst_amount,
    sgst_amount,
    igst_amount,
    total_tax,
    round_off,
    total_amount,
    status
) VALUES (
    '00000000-0000-0000-0000-000000000000',  -- distributor_id
    'credit_note',
    'CN/25-26/1',
    '2025-12-17',
    '11111111-1111-1111-1111-111111111111',  -- party_id
    'ABC Corporation',
    'Sales Credit Note',
    'Credit',
    'GST Local Sales',
    'Input',
    'CN/25-26/',
    1,
    'TI/25-26/123',
    '2025-12-10',
    true,
    10000.00,
    900.00,
    900.00,
    0.00,
    1800.00,
    0.00,
    11800.00,
    'confirmed'
);
```

### Example 2: Query Credit Notes by Type

```sql
-- Get all sales credit notes for current month
SELECT 
    voucher_number,
    voucher_date,
    party_name,
    invoice_number,
    total_amount,
    status
FROM vouchers
WHERE voucher_type = 'credit_note'
    AND cn_type = 'Sales Credit Note'
    AND voucher_date >= DATE_TRUNC('month', CURRENT_DATE)
    AND voucher_date < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
    AND status = 'confirmed'
ORDER BY voucher_date DESC;
```

### Example 3: Credit Note Summary by GST Type

```sql
-- Get summary from the credit_note_summary view
SELECT 
    cn_type,
    gst_type,
    TO_CHAR(month, 'Mon YYYY') as period,
    total_credit_notes,
    total_subtotal,
    total_cgst,
    total_sgst,
    total_igst,
    total_amount
FROM credit_note_summary
WHERE distributor_id = 'your-distributor-uuid'
    AND month >= DATE_TRUNC('year', CURRENT_DATE)
ORDER BY month DESC, cn_type, gst_type;
```

### Example 4: Find Credit Notes by Invoice Reference

```sql
-- Find all credit notes for a specific original invoice
SELECT 
    v.voucher_number,
    v.voucher_date,
    v.party_name,
    v.total_amount,
    v.status
FROM vouchers v
WHERE v.voucher_type = 'credit_note'
    AND v.invoice_number = 'TI/25-26/123'
    AND v.status != 'cancelled'
ORDER BY v.voucher_date DESC;
```

### Example 5: Monthly Credit Note Report

```sql
-- Monthly report with party-wise credit notes
SELECT 
    v.party_name,
    COUNT(*) as total_notes,
    SUM(v.subtotal) as gross_value,
    SUM(v.total_tax) as total_tax,
    SUM(v.total_amount) as net_value,
    v.cn_type,
    v.gst_type
FROM vouchers v
WHERE v.voucher_type = 'credit_note'
    AND v.voucher_date >= DATE_TRUNC('month', CURRENT_DATE)
    AND v.voucher_date < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
    AND v.status = 'confirmed'
    AND v.distributor_id = 'your-distributor-uuid'
GROUP BY 
    v.party_name,
    v.cn_type,
    v.gst_type
ORDER BY net_value DESC;
```

### Example 6: Top Customers/Suppliers by Credit Notes

```sql
-- Top 10 parties with highest credit note values
SELECT 
    v.party_name,
    v.cn_type,
    COUNT(*) as note_count,
    SUM(v.total_amount) as total_credit_value,
    MAX(v.voucher_date) as last_credit_date
FROM vouchers v
WHERE v.voucher_type = 'credit_note'
    AND v.status = 'confirmed'
    AND v.distributor_id = 'your-distributor-uuid'
    AND v.voucher_date >= CURRENT_DATE - INTERVAL '6 months'
GROUP BY v.party_name, v.cn_type
ORDER BY total_credit_value DESC
LIMIT 10;
```

---

## 🔐 Constraints & Validations

### Check Constraints

```sql
-- CN Type validation
ALTER TABLE vouchers 
ADD CONSTRAINT check_cn_type 
CHECK (cn_type IS NULL OR cn_type IN ('Sales Credit Note', 'Purchase Credit Note'));

-- Memo Type validation
ALTER TABLE vouchers 
ADD CONSTRAINT check_memo_type 
CHECK (memo_type IS NULL OR memo_type IN ('Credit', 'Debit'));

-- GST Type validation
ALTER TABLE vouchers 
ADD CONSTRAINT check_gst_type 
CHECK (gst_type IS NULL OR gst_type IN ('GST Local Sales', 'GST Inter-State Sales', 'GST Exports'));

-- Eligibility ITC validation
ALTER TABLE vouchers 
ADD CONSTRAINT check_eligibility_itc 
CHECK (eligibility_itc IS NULL OR eligibility_itc IN ('Input', 'Input Services', 'Capital Goods'));
```

---

## 📊 Indexes for Performance

```sql
-- Index on CN type for faster filtering
CREATE INDEX idx_vouchers_cn_type 
ON vouchers(cn_type) WHERE voucher_type = 'credit_note';

-- Index on GST type
CREATE INDEX idx_vouchers_gst_type 
ON vouchers(gst_type) WHERE voucher_type = 'credit_note';

-- Index on invoice reference
CREATE INDEX idx_vouchers_invoice_number 
ON vouchers(invoice_number) WHERE voucher_type = 'credit_note';

-- Composite index on document prefix and number
CREATE INDEX idx_vouchers_doc_prefix_number 
ON vouchers(doc_prefix, doc_number) WHERE voucher_type = 'credit_note';
```

---

## 🎯 Best Practices

### 1. Always Use Transactions
```sql
BEGIN;
    -- Insert voucher
    -- Insert voucher_items
    -- Insert ledger_transactions
COMMIT;
```

### 2. Check Duplicate Document Numbers
```sql
SELECT COUNT(*) 
FROM vouchers 
WHERE doc_prefix = 'CN/25-26/' 
    AND doc_number = 1 
    AND voucher_type = 'credit_note'
    AND distributor_id = 'your-uuid'
    AND status != 'cancelled';
```

### 3. Validate Party Before Insert
```sql
SELECT id, name, gst_number, state 
FROM parties 
WHERE id = 'party-uuid' 
    AND is_active = true;
```

---

## 🧪 Testing Queries

### Test 1: Verify Migration Success
```sql
-- Check if all columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'vouchers' 
    AND column_name IN (
        'cn_type', 'memo_type', 'gst_type', 'eligibility_itc',
        'invoice_number', 'invoice_date', 'apply_round_off',
        'doc_prefix', 'doc_number', 'party_gstin'
    );
```

### Test 2: Verify Constraints
```sql
-- Check constraints are active
SELECT con.conname, con.contype, pg_get_constraintdef(con.oid)
FROM pg_constraint con
WHERE con.conrelid = 'vouchers'::regclass
    AND con.conname LIKE 'check_%';
```

### Test 3: Verify Indexes
```sql
-- Check indexes exist
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'vouchers'
    AND indexname LIKE 'idx_vouchers_%';
```

---

## 📞 Support & Troubleshooting

### Common Issues

**Issue 1: Duplicate Constraint Error**
```sql
-- Drop existing constraint first
ALTER TABLE vouchers DROP CONSTRAINT IF EXISTS check_cn_type;
-- Then re-add
ALTER TABLE vouchers ADD CONSTRAINT check_cn_type CHECK (...);
```

**Issue 2: Column Already Exists**
```sql
-- Check if column exists before adding
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'vouchers' AND column_name = 'cn_type'
    ) THEN
        ALTER TABLE vouchers ADD COLUMN cn_type VARCHAR(50);
    END IF;
END $$;
```

---

## ✅ Verification Checklist

After running migration:

- [ ] All 11 new columns added to `vouchers` table
- [ ] 4 check constraints created successfully
- [ ] 4 indexes created for performance
- [ ] `generate_credit_note_number()` function exists
- [ ] `get_party_closing_balance()` function exists
- [ ] `get_party_turnover()` function exists
- [ ] `credit_note_summary` view accessible
- [ ] Row Level Security (RLS) policies intact
- [ ] Test insert works without errors
- [ ] Test query returns expected results

---

**Last Updated**: 2025-12-17  
**Module Version**: 1.0.0  
**Status**: Production Ready
