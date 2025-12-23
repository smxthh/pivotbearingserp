-- ============================================================
-- UPDATED PARTIES TABLE WITH EXTENDED FIELDS
-- Run this in Supabase SQL Editor
-- ============================================================

-- Drop and recreate parties table with all fields from reference
-- WARNING: This will delete existing data. Use ALTER TABLE if you have data.

-- First, let's add the new columns to existing table
ALTER TABLE public.parties ADD COLUMN IF NOT EXISTS party_code TEXT;
ALTER TABLE public.parties ADD COLUMN IF NOT EXISTS legal_name TEXT;
ALTER TABLE public.parties ADD COLUMN IF NOT EXISTS contact_person TEXT;
ALTER TABLE public.parties ADD COLUMN IF NOT EXISTS mobile TEXT;
ALTER TABLE public.parties ADD COLUMN IF NOT EXISTS whatsapp TEXT;
ALTER TABLE public.parties ADD COLUMN IF NOT EXISTS industry_type TEXT;
ALTER TABLE public.parties ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'INR';
ALTER TABLE public.parties ADD COLUMN IF NOT EXISTS distance_km NUMERIC(10,2) DEFAULT 0;
ALTER TABLE public.parties ADD COLUMN IF NOT EXISTS registration_type TEXT DEFAULT 'registered' CHECK (registration_type IN ('registered', 'composition', 'overseas', 'unregistered'));
ALTER TABLE public.parties ADD COLUMN IF NOT EXISTS gst_reg_date DATE;
ALTER TABLE public.parties ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'India';
ALTER TABLE public.parties ADD COLUMN IF NOT EXISTS district TEXT;
ALTER TABLE public.parties ADD COLUMN IF NOT EXISTS village TEXT;
ALTER TABLE public.parties ADD COLUMN IF NOT EXISTS sales_executive_id UUID;
ALTER TABLE public.parties ADD COLUMN IF NOT EXISTS sales_zone TEXT;
ALTER TABLE public.parties ADD COLUMN IF NOT EXISTS price_structure TEXT;
ALTER TABLE public.parties ADD COLUMN IF NOT EXISTS group_name TEXT DEFAULT 'Sundry Debtors';

-- Create index on party_code for fast lookup
CREATE INDEX IF NOT EXISTS idx_parties_party_code ON public.parties(distributor_id, party_code);

-- ============================================================
-- INDUSTRY TYPES TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.industry_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  distributor_id UUID NOT NULL REFERENCES public.distributor_profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.industry_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Distributors can manage industry types"
ON public.industry_types FOR ALL
USING (
  distributor_id = (SELECT id FROM public.distributor_profiles WHERE user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- ============================================================
-- SALES ZONES TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.sales_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  distributor_id UUID NOT NULL REFERENCES public.distributor_profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.sales_zones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Distributors can manage sales zones"
ON public.sales_zones FOR ALL
USING (
  distributor_id = (SELECT id FROM public.distributor_profiles WHERE user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- ============================================================
-- PRICE STRUCTURES TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.price_structures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  distributor_id UUID NOT NULL REFERENCES public.distributor_profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  discount_percent NUMERIC(5,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.price_structures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Distributors can manage price structures"
ON public.price_structures FOR ALL
USING (
  distributor_id = (SELECT id FROM public.distributor_profiles WHERE user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- ============================================================
-- PARTY GROUPS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.party_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  distributor_id UUID NOT NULL REFERENCES public.distributor_profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT,
  parent_id UUID REFERENCES public.party_groups(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.party_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Distributors can manage party groups"
ON public.party_groups FOR ALL
USING (
  distributor_id = (SELECT id FROM public.distributor_profiles WHERE user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Insert default party groups
-- INSERT INTO public.party_groups (distributor_id, name, code) VALUES 
-- ('your-distributor-id', 'Sundry Debtors', 'SD'),
-- ('your-distributor-id', 'Sundry Creditors', 'SC');

-- ============================================================
-- AUTO-GENERATE PARTY CODE FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION public.generate_party_code(
  p_distributor_id UUID,
  p_party_type TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_prefix TEXT;
  v_sequence INTEGER;
BEGIN
  -- Set prefix based on party type
  IF p_party_type = 'customer' THEN
    v_prefix := 'C';
  ELSIF p_party_type = 'supplier' THEN
    v_prefix := 'S';
  ELSE
    v_prefix := 'P';
  END IF;
  
  -- Get next sequence number
  SELECT COALESCE(MAX(
    NULLIF(REGEXP_REPLACE(party_code, '[^0-9]', '', 'g'), '')::INTEGER
  ), 0) + 1 INTO v_sequence
  FROM public.parties
  WHERE distributor_id = p_distributor_id
    AND party_code LIKE v_prefix || '%';
  
  RETURN v_prefix || LPAD(v_sequence::TEXT, 3, '0');
END;
$$;

-- ============================================================
-- DISTRICTS TABLE (For Gujarat and other states)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.districts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state TEXT NOT NULL,
  name TEXT NOT NULL,
  state_code TEXT,
  is_active BOOLEAN DEFAULT true
);

-- Insert Gujarat districts
INSERT INTO public.districts (state, name, state_code) VALUES
('Gujarat', 'Ahmedabad', '24'),
('Gujarat', 'Amreli', '24'),
('Gujarat', 'Anand', '24'),
('Gujarat', 'Aravalli', '24'),
('Gujarat', 'Banaskantha', '24'),
('Gujarat', 'Bharuch', '24'),
('Gujarat', 'Bhavnagar', '24'),
('Gujarat', 'Botad', '24'),
('Gujarat', 'Chhota Udaipur', '24'),
('Gujarat', 'Dahod', '24'),
('Gujarat', 'Dang', '24'),
('Gujarat', 'Devbhoomi Dwarka', '24'),
('Gujarat', 'Gandhinagar', '24'),
('Gujarat', 'Gir Somnath', '24'),
('Gujarat', 'Jamnagar', '24'),
('Gujarat', 'Junagadh', '24'),
('Gujarat', 'Kheda', '24'),
('Gujarat', 'Kutch', '24'),
('Gujarat', 'Mahisagar', '24'),
('Gujarat', 'Mehsana', '24'),
('Gujarat', 'Morbi', '24'),
('Gujarat', 'Narmada', '24'),
('Gujarat', 'Navsari', '24'),
('Gujarat', 'Panchmahal', '24'),
('Gujarat', 'Patan', '24'),
('Gujarat', 'Porbandar', '24'),
('Gujarat', 'Rajkot', '24'),
('Gujarat', 'Sabarkantha', '24'),
('Gujarat', 'Surat', '24'),
('Gujarat', 'Surendranagar', '24'),
('Gujarat', 'Tapi', '24'),
('Gujarat', 'Vadodara', '24'),
('Gujarat', 'Valsad', '24')
ON CONFLICT DO NOTHING;
