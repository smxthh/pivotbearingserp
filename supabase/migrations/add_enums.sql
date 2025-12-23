-- ============================================================
-- ADDITIONAL ENUMS FOR PIVOT ERP
-- Run this in Supabase SQL Editor if enums are missing
-- ============================================================

-- Check if enums exist, create if not
DO $$ 
BEGIN
    -- party_type enum
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'party_type') THEN
        CREATE TYPE public.party_type AS ENUM ('customer', 'supplier', 'both');
    END IF;
    
    -- invoice_type enum
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'invoice_type') THEN
        CREATE TYPE public.invoice_type AS ENUM ('sale', 'purchase', 'sale_return', 'purchase_return');
    END IF;
    
    -- invoice_status enum
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'invoice_status') THEN
        CREATE TYPE public.invoice_status AS ENUM ('draft', 'confirmed', 'cancelled');
    END IF;
    
    -- payment_status enum
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status') THEN
        CREATE TYPE public.payment_status AS ENUM ('unpaid', 'partial', 'paid');
    END IF;
    
    -- payment_type enum
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_type') THEN
        CREATE TYPE public.payment_type AS ENUM ('receipt', 'payment');
    END IF;
    
    -- payment_mode enum
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_mode') THEN
        CREATE TYPE public.payment_mode AS ENUM ('cash', 'bank', 'cheque', 'upi', 'card', 'other');
    END IF;
    
    -- ledger_entry_type enum
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ledger_entry_type') THEN
        CREATE TYPE public.ledger_entry_type AS ENUM ('sale', 'purchase', 'receipt', 'payment', 'sale_return', 'purchase_return', 'opening', 'adjustment');
    END IF;
    
    -- stock_movement_type enum
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'stock_movement_type') THEN
        CREATE TYPE public.stock_movement_type AS ENUM ('sale', 'purchase', 'sale_return', 'purchase_return', 'adjustment', 'opening');
    END IF;
END $$;

-- ============================================================
-- UPDATE TABLES TO USE TEXT INSTEAD OF ENUMS (SIMPLER APPROACH)
-- ============================================================

-- If you prefer using TEXT with CHECK constraints instead of enums:
-- This is often easier to manage and more flexible

-- For parties table, update type column if needed
-- ALTER TABLE public.parties 
--   ALTER COLUMN type TYPE TEXT,
--   ADD CONSTRAINT parties_type_check 
--     CHECK (type IN ('customer', 'supplier', 'both'));

-- For invoices table
-- ALTER TABLE public.invoices
--   ALTER COLUMN invoice_type TYPE TEXT,
--   ADD CONSTRAINT invoices_type_check 
--     CHECK (invoice_type IN ('sale', 'purchase', 'sale_return', 'purchase_return'));
