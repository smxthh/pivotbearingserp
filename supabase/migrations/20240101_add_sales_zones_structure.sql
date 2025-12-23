-- Create sales_zones table
CREATE TABLE IF NOT EXISTS public.sales_zones (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    distributor_id UUID NOT NULL REFERENCES public.distributor_profiles(id),
    name TEXT NOT NULL,
    remark TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure columns exist if table already existed without them
ALTER TABLE public.sales_zones ADD COLUMN IF NOT EXISTS remark TEXT;
ALTER TABLE public.sales_zones ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Enable RLS for sales_zones
ALTER TABLE public.sales_zones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Distributors can view their own sales zones" ON public.sales_zones;
CREATE POLICY "Distributors can view their own sales zones"
    ON public.sales_zones FOR SELECT
    USING (
        distributor_id IN (
            SELECT id FROM distributor_profiles WHERE user_id = auth.uid()
            UNION
            SELECT distributor_id FROM salespersons WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Distributors can insert their own sales zones" ON public.sales_zones;
CREATE POLICY "Distributors can insert their own sales zones"
    ON public.sales_zones FOR INSERT
    WITH CHECK (
        distributor_id IN (
            SELECT id FROM distributor_profiles WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Distributors can update their own sales zones" ON public.sales_zones;
CREATE POLICY "Distributors can update their own sales zones"
    ON public.sales_zones FOR UPDATE
    USING (
        distributor_id IN (
            SELECT id FROM distributor_profiles WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Distributors can delete their own sales zones" ON public.sales_zones;
CREATE POLICY "Distributors can delete their own sales zones"
    ON public.sales_zones FOR DELETE
    USING (
        distributor_id IN (
            SELECT id FROM distributor_profiles WHERE user_id = auth.uid()
        )
    );

-- Create price_structures table
CREATE TABLE IF NOT EXISTS public.price_structures (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    distributor_id UUID NOT NULL REFERENCES public.distributor_profiles(id),
    name TEXT NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure columns exist
ALTER TABLE public.price_structures ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT FALSE;
ALTER TABLE public.price_structures ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Enable RLS for price_structures
ALTER TABLE public.price_structures ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Distributors can view their own price structures" ON public.price_structures;
CREATE POLICY "Distributors can view their own price structures"
    ON public.price_structures FOR SELECT
    USING (
        distributor_id IN (
            SELECT id FROM distributor_profiles WHERE user_id = auth.uid()
            UNION
            SELECT distributor_id FROM salespersons WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Distributors can insert their own price structures" ON public.price_structures;
CREATE POLICY "Distributors can insert their own price structures"
    ON public.price_structures FOR INSERT
    WITH CHECK (
        distributor_id IN (
            SELECT id FROM distributor_profiles WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Distributors can update their own price structures" ON public.price_structures;
CREATE POLICY "Distributors can update their own price structures"
    ON public.price_structures FOR UPDATE
    USING (
        distributor_id IN (
            SELECT id FROM distributor_profiles WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Distributors can delete their own price structures" ON public.price_structures;
CREATE POLICY "Distributors can delete their own price structures"
    ON public.price_structures FOR DELETE
    USING (
        distributor_id IN (
            SELECT id FROM distributor_profiles WHERE user_id = auth.uid()
        )
    );

-- Create price_structure_items table
CREATE TABLE IF NOT EXISTS public.price_structure_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    structure_id UUID NOT NULL REFERENCES public.price_structures(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES public.items(id),
    price NUMERIC DEFAULT 0,
    mrp NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure columns exist
ALTER TABLE public.price_structure_items ADD COLUMN IF NOT EXISTS mrp NUMERIC DEFAULT 0;
ALTER TABLE public.price_structure_items ADD COLUMN IF NOT EXISTS price NUMERIC DEFAULT 0;

-- Add unique constraint for (structure_id, item_id) if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'price_structure_items_structure_item_key'
    ) THEN
        ALTER TABLE public.price_structure_items ADD CONSTRAINT price_structure_items_structure_item_key UNIQUE (structure_id, item_id);
    END IF;
END $$;

-- Enable RLS for price_structure_items
ALTER TABLE public.price_structure_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view price structure items" ON public.price_structure_items;
CREATE POLICY "Users can view price structure items"
    ON public.price_structure_items FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM price_structures
            WHERE price_structures.id = price_structure_items.structure_id
            AND price_structures.distributor_id IN (
                SELECT id FROM distributor_profiles WHERE user_id = auth.uid()
                UNION
                SELECT distributor_id FROM salespersons WHERE user_id = auth.uid()
            )
        )
    );

DROP POLICY IF EXISTS "Distributors can insert price structure items" ON public.price_structure_items;
CREATE POLICY "Distributors can insert price structure items"
    ON public.price_structure_items FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM price_structures
            WHERE price_structures.id = price_structure_items.structure_id
            AND price_structures.distributor_id IN (
                SELECT id FROM distributor_profiles WHERE user_id = auth.uid()
            )
        )
    );

DROP POLICY IF EXISTS "Distributors can update price structure items" ON public.price_structure_items;
CREATE POLICY "Distributors can update price structure items"
    ON public.price_structure_items FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM price_structures
            WHERE price_structures.id = price_structure_items.structure_id
            AND price_structures.distributor_id IN (
                SELECT id FROM distributor_profiles WHERE user_id = auth.uid()
            )
        )
    );

DROP POLICY IF EXISTS "Distributors can delete price structure items" ON public.price_structure_items;
CREATE POLICY "Distributors can delete price structure items"
    ON public.price_structure_items FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM price_structures
            WHERE price_structures.id = price_structure_items.structure_id
            AND price_structures.distributor_id IN (
                SELECT id FROM distributor_profiles WHERE user_id = auth.uid()
            )
        )
    );
