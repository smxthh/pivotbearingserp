-- DIAGNOSTIC REPORT: INVOICE vs LEDGER SYNC STATUS
-- Run this in Supabase SQL Editor and view the results in the "Results" tab.

-- 1. Check Tenant Context
SELECT public.get_user_tenant_id() as "Current Tenant ID";

-- 2. Check Sales Ledger Existence and Balance
SELECT id, name, group_id, opening_balance, current_balance, closing_balance 
FROM ledgers 
WHERE name = 'Sales Account';

-- 3. Check Invoice vs Ledger Entry Link
SELECT 
    i.invoice_number, 
    i.status, 
    i.grand_total,
    i.taxable_amount,
    CASE WHEN EXISTS (SELECT 1 FROM ledger_entries le WHERE le.transaction_id = i.id) THEN 'YES' ELSE 'NO' END as "Is Posted",
    (SELECT COUNT(*) FROM ledger_entries le WHERE le.transaction_id = i.id) as "Entries Count",
    (SELECT SUM(credit) FROM ledger_entries le WHERE le.transaction_id = i.id AND le.ledger_id = (SELECT id FROM ledgers WHERE name = 'Sales Account' LIMIT 1)) as "Sales Credit Amount"
FROM invoices i
ORDER BY i.created_at DESC
LIMIT 10;

-- 4. Dump Last 5 Ledger Entries for Sales Account
SELECT 
    le.entry_date, 
    le.transaction_type, 
    le.description, 
    le.debit, 
    le.credit, 
    l.name as ledger_name
FROM ledger_entries le
JOIN ledgers l ON le.ledger_id = l.id
WHERE l.name = 'Sales Account'
ORDER BY le.created_at DESC
LIMIT 5;
