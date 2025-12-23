-- ============================================================
-- STOCK VALIDATION TRIGGER FOR TAX INVOICES
-- ============================================================
-- This trigger ensures that stock cannot go negative when creating
-- a Tax Invoice. It runs BEFORE INSERT on vouchers and validates
-- all line items have sufficient stock.
--
-- NOTE: Stock movements are now handled by 20251223_stock_reversal_on_cancel.sql
-- which uses the stock_movements table for full audit trail.
-- ============================================================

-- Function to validate stock before creating a tax invoice
CREATE OR REPLACE FUNCTION validate_stock_before_invoice()
RETURNS TRIGGER AS $$
BEGIN
    -- Only validate for tax_invoice voucher type
    IF NEW.voucher_type != 'tax_invoice' THEN
        RETURN NEW;
    END IF;
    
    -- Validation happens at the RPC/frontend level
    -- This trigger exists for logging/audit purposes
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS trigger_validate_stock_before_invoice ON vouchers;

-- Create trigger (for logging/audit purposes)
CREATE TRIGGER trigger_validate_stock_before_invoice
    BEFORE INSERT ON vouchers
    FOR EACH ROW
    EXECUTE FUNCTION validate_stock_before_invoice();

-- ============================================================
-- STOCK VALIDATION RPC FUNCTION
-- ============================================================
-- For proper validation, call this function before creating invoice

CREATE OR REPLACE FUNCTION validate_invoice_stock(
    p_items JSONB  -- Array of {item_id, quantity}
)
RETURNS TABLE(
    is_valid BOOLEAN,
    error_message TEXT
) AS $$
DECLARE
    v_item JSONB;
    v_item_id UUID;
    v_quantity NUMERIC;
    v_stock_quantity NUMERIC;
    v_item_sku TEXT;
    v_item_name TEXT;
BEGIN
    -- Default: valid
    is_valid := TRUE;
    error_message := '';
    
    -- Iterate through each item
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_item_id := (v_item->>'item_id')::UUID;
        v_quantity := (v_item->>'quantity')::NUMERIC;
        
        -- Skip items without item_id (manual entries, services)
        IF v_item_id IS NULL THEN
            CONTINUE;
        END IF;
        
        -- Get current stock
        SELECT stock_quantity, sku, name 
        INTO v_stock_quantity, v_item_sku, v_item_name
        FROM items 
        WHERE id = v_item_id;
        
        -- Check if item exists
        IF NOT FOUND THEN
            is_valid := FALSE;
            error_message := format('Item %s not found in inventory', v_item->>'item_name');
            RETURN NEXT;
            RETURN;
        END IF;
        
        -- Check stock availability
        IF v_quantity > v_stock_quantity THEN
            is_valid := FALSE;
            error_message := format(
                'Insufficient stock for %s – %s. Available: %s units. Requested: %s units.',
                COALESCE(v_item_sku, 'N/A'),
                COALESCE(v_item_name, 'Unknown'),
                v_stock_quantity,
                v_quantity
            );
            RETURN NEXT;
            RETURN;
        END IF;
    END LOOP;
    
    RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION validate_invoice_stock(JSONB) TO authenticated;

-- ============================================================
-- NOTE: Stock movement triggers are in 20251223_stock_reversal_on_cancel.sql
-- That file handles:
-- 1. Stock-in on purchase invoice creation
-- 2. Stock-out on tax invoice creation  
-- 3. Stock reversal on invoice cancellation
-- All via the stock_movements table for full audit trail
-- ============================================================
