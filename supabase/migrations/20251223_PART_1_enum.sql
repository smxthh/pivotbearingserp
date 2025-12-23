-- ============================================================
-- SUPERADMIN ROLLOUT - PART 1: ENUM UPDATE
-- ============================================================
-- RUN THIS FILE FIRST.
-- This creates the 'superadmin' role in the database.
-- It must be committed before we can assign it to users or policies.

DO $$ 
BEGIN
    -- Check if app_role type exists
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
        -- Add 'superadmin' to the enum if not present
        -- We catch the error just in case it's already there but the IF NOT EXISTS syntax isn't supported by this PG version
        BEGIN
            ALTER TYPE app_role ADD VALUE 'superadmin';
        EXCEPTION
            WHEN duplicate_object THEN
                NULL; -- Value already exists, ignore
            WHEN OTHERS THEN
                RAISE; -- Reraise other errors
        END;
    END IF;
END $$;
