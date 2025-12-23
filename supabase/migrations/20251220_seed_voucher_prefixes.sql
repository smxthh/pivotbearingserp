-- Migration: Seed Default Voucher Prefixes
-- Description: Ensures all distributors have the standard set of voucher prefixes to prevent "No active prefix found" errors.

DO $$
DECLARE
    distributor RECORD;
    prefix_record RECORD;
    
    -- Define default prefixes as a temporary table or array
    -- We'll use a loop for simplicity
    defaults text[][] := ARRAY[
        ['Sales Order', 'SO'],
        ['Sales Quotation', 'SQ'],
        ['Sales Enquiry', 'SE'],
        ['Sales Invoice', 'INV'],
        ['Delivery Challan', 'DC'],
        ['Purchase Order', 'PO'],
        ['Purchase Invoice', 'PI'],
        ['Debit Note', 'DRN'],
        ['Credit Note', 'CRN'],
        ['Receipt Voucher', 'RV'],
        ['Payment Voucher', 'PV'],
        ['Journal Entry', 'JV'],
        ['GST Expense', 'EXP'],
        ['GST Income', 'INC'],
        ['GST Payment', 'GPAY'],
        ['GST Journal', 'GJ'],
        ['GST Havala', 'GH'],
        ['Havala', 'HAV'],
        ['TCS/TDS Payment', 'TAX'],
        ['Marking', 'MRK'],
        ['Packing', 'PCK'],
        ['Gate Inward', 'GI']
    ];
    
    current_default text[];
BEGIN
    -- Iterate through all existing distributor profiles
    FOR distributor IN SELECT id FROM distributor_profiles LOOP
        
        -- RAISE NOTICE 'Checking prefixes for Distributor: %', distributor.id;
        
        -- Iterate through each default prefix definition
        FOREACH current_default SLICE 1 IN ARRAY defaults LOOP
            
            -- Check if a prefix already exists for this voucher type for this distributor
            IF NOT EXISTS (
                SELECT 1 
                FROM voucher_prefixes 
                WHERE distributor_id = distributor.id 
                AND voucher_name = current_default[1]
            ) THEN
                -- Insert the missing prefix
                INSERT INTO voucher_prefixes (
                    distributor_id,
                    voucher_name,
                    voucher_prefix,
                    prefix_separator,
                    year_format,
                    auto_start_no,
                    is_default,
                    is_active
                ) VALUES (
                    distributor.id,
                    current_default[1], -- Voucher Name
                    current_default[2], -- Voucher Prefix
                    '/',               -- Separator
                    'yy-yy',           -- Year Format
                    1,                 -- Auto Start No
                    true,              -- Is Default
                    true               -- Is Active
                );
                
                -- RAISE NOTICE 'Created missing prefix: % (%)', current_default[1], current_default[2];
            END IF;
            
        END LOOP;
        
    END LOOP;
END $$;
