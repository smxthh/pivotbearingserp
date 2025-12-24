-- Add opening_balance_type column to existing ledgers table
-- Run this in Supabase SQL Editor

ALTER TABLE public.ledgers 
ADD COLUMN IF NOT EXISTS opening_balance_type text DEFAULT 'Dr' CHECK (opening_balance_type IN ('Dr', 'Cr'));

-- Update existing records to have correct opening_balance_type based on current_balance
UPDATE public.ledgers 
SET opening_balance_type = CASE WHEN opening_balance >= 0 THEN 'Dr' ELSE 'Cr' END
WHERE opening_balance_type IS NULL;
