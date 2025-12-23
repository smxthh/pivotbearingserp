-- ================================================================
-- QUICK FIX: Update RM prefix counter to correct value
-- ================================================================

-- STEP 1: Check current value
SELECT 
    id,
    voucher_name,
    voucher_prefix,
    prefix_separator,
    auto_start_no,  -- This shows the current counter
    is_default,
    is_active
FROM public.voucher_prefixes
WHERE voucher_name = 'Sales Invoice'
  AND voucher_prefix = 'RM';

-- ================================================================
-- STEP 2: Update the counter to 2 (since you already created RM/1)
-- ================================================================

UPDATE public.voucher_prefixes
SET auto_start_no = 2,  -- Next invoice will be RM/2
    updated_at = NOW()
WHERE voucher_name = 'Sales Invoice'
  AND voucher_prefix = 'RM';

-- ================================================================
-- STEP 3: Verify the update
-- ================================================================

SELECT 
    id,
    voucher_name,
    voucher_prefix,
    auto_start_no,  -- Should now show 2
    is_default
FROM public.voucher_prefixes
WHERE voucher_name = 'Sales Invoice'
  AND voucher_prefix = 'RM';
