-- ================================================================
-- STOCK MANAGEMENT: Automatic Stock Updates via Triggers (FIXED)
-- ================================================================
-- This creates triggers to automatically update item stock when
-- vouchers (invoices, purchases) are created or deleted
-- FIXED: Removed invalid 'gate_inward' voucher type
-- ================================================================

-- First, drop the existing trigger and function
DROP TRIGGER IF EXISTS trigger_update_stock_on_voucher_items ON voucher_items;
DROP FUNCTION IF EXISTS update_item_stock();

-- ================================================================
-- FUNCTION: Update Stock Quantity
-- ================================================================
CREATE OR REPLACE FUNCTION update_item_stock()
RETURNS TRIGGER AS $$
DECLARE
    v_voucher RECORD;
    v_quantity_change NUMERIC;
BEGIN
    -- Determine quantity change based on voucher type
    -- Sales/Outward = Decrease stock (negative)
    -- Purchase/Inward = Increase stock (positive)
    
    IF TG_OP = 'INSERT' THEN
        -- Get voucher type to determine stock direction
        SELECT voucher_type INTO v_voucher
        FROM vouchers
        WHERE id = NEW.voucher_id;
        
        -- Determine if this is inward (increase) or outward (decrease) stock
        IF v_voucher.voucher_type IN ('purchase_invoice') THEN
            -- Inward: Increase stock
            v_quantity_change := NEW.quantity;
        ELSIF v_voucher.voucher_type IN ('tax_invoice', 'sales_invoice', 'delivery_challan') THEN
            -- Outward: Decrease stock
            v_quantity_change := -NEW.quantity;
        ELSE
            -- Unknown type, don't update stock
            RETURN NEW;
        END IF;
        
        -- Update item stock
        IF NEW.item_id IS NOT NULL THEN
            UPDATE items
            SET stock_quantity = COALESCE(stock_quantity, 0) + v_quantity_change,
                updated_at = NOW()
            WHERE id = NEW.item_id;
        END IF;
        
    ELSIF TG_OP = 'DELETE' THEN
        -- Reverse the stock change when voucher item is deleted
        SELECT voucher_type INTO v_voucher
        FROM vouchers
        WHERE id = OLD.voucher_id;
        
        IF v_voucher.voucher_type IN ('purchase_invoice') THEN
            -- Was inward: Reverse by decreasing stock
            v_quantity_change := -OLD.quantity;
        ELSIF v_voucher.voucher_type IN ('tax_invoice', 'sales_invoice', 'delivery_challan') THEN
            -- Was outward: Reverse by increasing stock
            v_quantity_change := OLD.quantity;
        ELSE
            RETURN OLD;
        END IF;
        
        IF OLD.item_id IS NOT NULL THEN
            UPDATE items
            SET stock_quantity = COALESCE(stock_quantity, 0) + v_quantity_change,
                updated_at = NOW()
            WHERE id = OLD.item_id;
        END IF;
        
    ELSIF TG_OP = 'UPDATE' THEN
        -- Handle quantity changes
        SELECT voucher_type INTO v_voucher
        FROM vouchers
        WHERE id = NEW.voucher_id;
        
        -- Only process if item_id or quantity changed
        IF OLD.item_id IS DISTINCT FROM NEW.item_id OR OLD.quantity IS DISTINCT FROM NEW.quantity THEN
            -- Reverse old quantity
            IF v_voucher.voucher_type IN ('purchase_invoice') THEN
                v_quantity_change := -OLD.quantity;
            ELSIF v_voucher.voucher_type IN ('tax_invoice', 'sales_invoice', 'delivery_challan') THEN
                v_quantity_change := OLD.quantity;
            END IF;
            
            IF OLD.item_id IS NOT NULL THEN
                UPDATE items
                SET stock_quantity = COALESCE(stock_quantity, 0) + v_quantity_change,
                    updated_at = NOW()
                WHERE id = OLD.item_id;
            END IF;
            
            -- Apply new quantity
            IF v_voucher.voucher_type IN ('purchase_invoice') THEN
                v_quantity_change := NEW.quantity;
            ELSIF v_voucher.voucher_type IN ('tax_invoice', 'sales_invoice', 'delivery_challan') THEN
                v_quantity_change := -NEW.quantity;
            END IF;
            
            IF NEW.item_id IS NOT NULL THEN
                UPDATE items
                SET stock_quantity = COALESCE(stock_quantity, 0) + v_quantity_change,
                    updated_at = NOW()
                WHERE id = NEW.item_id;
            END IF;
        END IF;
    END IF;
    
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ================================================================
-- TRIGGER: Stock Update on Voucher Items
-- ================================================================
CREATE TRIGGER trigger_update_stock_on_voucher_items
    AFTER INSERT OR UPDATE OR DELETE ON voucher_items
    FOR EACH ROW
    EXECUTE FUNCTION update_item_stock();

-- ================================================================
-- GRANT PERMISSIONS
-- ================================================================
GRANT EXECUTE ON FUNCTION update_item_stock() TO authenticated;

-- ================================================================
-- VERIFICATION QUERY
-- ================================================================
-- Check current stock levels
SELECT 
    id,
    name,
    sku,
    stock_quantity,
    min_stock_level
FROM items
WHERE name LIKE '%6001%'
ORDER BY name;
