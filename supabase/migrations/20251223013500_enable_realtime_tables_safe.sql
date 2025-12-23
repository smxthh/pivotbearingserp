-- ================================================================
-- ENABLE REALTIME: Confirmed tables only
-- ================================================================

-- 1. Master Data
ALTER PUBLICATION supabase_realtime ADD TABLE items;
ALTER PUBLICATION supabase_realtime ADD TABLE parties;
ALTER PUBLICATION supabase_realtime ADD TABLE categories;

-- 2. Inventory Module
ALTER PUBLICATION supabase_realtime ADD TABLE gate_inwards;
ALTER PUBLICATION supabase_realtime ADD TABLE gate_inward_items;
ALTER PUBLICATION supabase_realtime ADD TABLE stock_movements;
-- delivery_challans skipped if not exists
-- delivery_challan_items skipped if not exists

-- 3. Sales & Purchase Module
ALTER PUBLICATION supabase_realtime ADD TABLE purchase_orders;
ALTER PUBLICATION supabase_realtime ADD TABLE purchase_order_items;
-- sales_orders skipped if not exists
-- sales_quotations skipped if not exists

-- 4. Accounting Module
ALTER PUBLICATION supabase_realtime ADD TABLE vouchers;
ALTER PUBLICATION supabase_realtime ADD TABLE voucher_items;
ALTER PUBLICATION supabase_realtime ADD TABLE ledgers;
