-- CHECK SCHEMA COLUMNS
SELECT 
    table_name, 
    column_name 
FROM 
    information_schema.columns 
WHERE 
    table_schema = 'public' 
    AND table_name IN ('ledgers', 'ledger_groups', 'ledger_entries', 'vouchers', 'parties')
    AND column_name IN ('tenant_id', 'distributor_id')
ORDER BY 
    table_name;
