-- ================================================================
-- ENABLE REALTIME: Add core tables to supabase_realtime publication
-- Allows frontend to receive instant updates via subscriptions
-- ================================================================

-- 1. Master Data
ALTER PUBLICATION supabase_realtime ADD TABLE items;
ALTER PUBLICATION supabase_realtime ADD TABLE parties;
ALTER PUBLICATION supabase_realtime ADD TABLE categories;

-- 2. Inventory Module
ALTER PUBLICATION supabase_realtime ADD TABLE gate_inwards;
ALTER PUBLICATION supabase_realtime ADD TABLE gate_inward_items;
ALTER PUBLICATION supabase_realtime ADD TABLE stock_movements;
ALTER PUBLICATION supabase_realtime ADD TABLE delivery_challans;
ALTER PUBLICATION supabase_realtime ADD TABLE delivery_challan_items;

-- 3. Sales & Purchase Module
ALTER PUBLICATION supabase_realtime ADD TABLE purchase_orders;
ALTER PUBLICATION supabase_realtime ADD TABLE purchase_order_items;
ALTER PUBLICATION supabase_realtime ADD TABLE sales_orders;
ALTER PUBLICATION supabase_realtime ADD TABLE sales_order_items;
ALTER PUBLICATION supabase_realtime ADD TABLE sales_quotations;
ALTER PUBLICATION supabase_realtime ADD TABLE sales_quotation_items;

-- 4. Accounting Module
ALTER PUBLICATION supabase_realtime ADD TABLE vouchers;
ALTER PUBLICATION supabase_realtime ADD TABLE voucher_items;
ALTER PUBLICATION supabase_realtime ADD TABLE ledgers;

-- 5. Misc
-- Ensure distributor_profiles is synced if needed for updates
ALTER PUBLICATION supabase_realtime ADD TABLE distributor_profiles;
