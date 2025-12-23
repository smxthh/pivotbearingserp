-- ================================================================
-- SAFE REALTIME ENABLE: Idempotent script
-- Checks if table is already in publication before adding
-- ================================================================

DO $$
DECLARE
    t text;
    tables text[] := ARRAY[
        'items', 
        'parties', 
        'categories',
        'gate_inwards', 
        'gate_inward_items', 
        'stock_movements',
        'purchase_orders', 
        'purchase_order_items',
        'vouchers', 
        'voucher_items', 
        'ledgers'
    ];
BEGIN
    FOREACH t IN ARRAY tables
    LOOP
        -- Check if table exists first (to avoid 42P01)
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = t) THEN
            -- Check if already in publication
            IF NOT EXISTS (
                SELECT 1 
                FROM pg_publication_tables 
                WHERE pubname = 'supabase_realtime' 
                AND schemaname = 'public' 
                AND tablename = t
            ) THEN
                EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE %I', t);
                RAISE NOTICE 'Added table % to realtime', t;
            ELSE
                RAISE NOTICE 'Table % is already in realtime', t;
            END IF;
        ELSE
            RAISE NOTICE 'Skipping missing table %', t;
        END IF;
    END LOOP;
END
$$;
