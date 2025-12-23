# Multi-Tenant Data Isolation Implementation Plan

## 📋 Executive Summary

This document outlines the complete implementation for **tenant-based data isolation** in the Pivot ERP system. The goal is to ensure:

1. **Each Admin (Distributor/Agency owner)** has their own isolated data silo
2. **Salespersons** can only see/create data for their assigned Admin's tenant
3. **Superadmin** has visibility across all data for platform management
4. **All data created by a salesperson** is attributed to and visible by their Admin

---

## 🏗️ Current Architecture Analysis

### Existing Role Structure
```
├── superadmin (Platform Owner)
├── admin (Agency/Distributor Owner)  
└── salesperson (Works under an Admin)
```

### Current Tables with Tenant Awareness
- `user_roles` - Has `tenant_id` column linking to Admin's user_id
- `distributor_profiles` - Has `user_id` linking to Admin
- Some tables have `distributor_id` referencing `distributor_profiles`

### Current Gaps
1. **Inconsistent tenant isolation** - Some tables use `distributor_id`, others don't
2. **Missing `tenant_id` column** on many transaction tables
3. **RLS policies not uniform** across all tables
4. **Salesperson data not properly aggregated** to Admin's dashboard
5. **`created_by` column missing** on most tables

---

## 🎯 Target Architecture

### Tenant Hierarchy Model
```
┌─────────────────────────────────────────────────────────────┐
│                      SUPERADMIN                              │
│              (Platform Owner - Sees All)                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   ┌─────────────────┐     ┌─────────────────┐              │
│   │   ADMIN A       │     │   ADMIN B       │              │
│   │ (smit@gmail.com)│     │ (john@gmail.com)│              │
│   │   tenant_id: A  │     │   tenant_id: B  │              │
│   │                 │     │                 │              │
│   │  ┌───────────┐  │     │  ┌───────────┐  │              │
│   │  │Salesperson│  │     │  │Salesperson│  │              │
│   │  │hello@...  │  │     │  │jane@...   │  │              │
│   │  │tenant: A  │  │     │  │tenant: B  │  │              │
│   │  └───────────┘  │     │  └───────────┘  │              │
│   │                 │     │                 │              │
│   │  DATA SILO A    │     │  DATA SILO B    │              │
│   │  - Parties      │     │  - Parties      │              │
│   │  - Invoices     │     │  - Invoices     │              │
│   │  - Products     │     │  - Products     │              │
│   │  - Stock        │     │  - Stock        │              │
│   └─────────────────┘     └─────────────────┘              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Data Visibility Rules
| Role | Visibility | Can Create | Dashboard Shows |
|------|-----------|------------|-----------------|
| Superadmin | ALL data across platform | Admin accounts | Aggregated platform metrics |
| Admin | Own tenant data only | Salespersons, all business data | Own + all salesperson data |
| Salesperson | Own tenant data (read) | Parties, Invoices, Orders | Own created records |

---

## 🔧 Implementation Plan

### Phase 1: Schema Enhancement

#### 1.1 Add `tenant_id` Column to ALL Business Tables

All business tables MUST have a `tenant_id` column that references the Admin's `user_id` from `auth.users`.

**Tables requiring `tenant_id`:**
```sql
-- Transaction & Master Tables
- parties
- vouchers
- voucher_items
- products
- services
- brands
- item_categories
- purchase_orders
- purchase_order_items
- gate_inward
- marking
- marking_batches
- packing
- packing_batches
- opening_stock
- ledgers
- ledger_groups
- ledger_transactions

-- Configuration Tables
- terms
- transports
- hsn_master
- tax_master
- expense_master
- group_master
- tax_class
- voucher_prefixes
- voucher_number_sequences
- store_locations

-- Extended Tables
- industry_types
- sales_zones
- price_structures
- price_structure_items
- party_groups
- party_delivery_addresses
- districts
```

#### 1.2 Add `created_by` Column for Audit Trail

Track which user created each record:

```sql
-- All transaction tables should have:
- created_by UUID REFERENCES auth.users(id)
- updated_by UUID REFERENCES auth.users(id)
- created_at TIMESTAMPTZ DEFAULT now()
- updated_at TIMESTAMPTZ DEFAULT now()
```

---

### Phase 2: Core Helper Functions

#### 2.1 Enhanced Tenant Resolution Functions

```sql
-- Get the current user's tenant (Admin's user_id)
CREATE OR REPLACE FUNCTION public.get_user_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    -- Superadmin: No tenant restriction (return NULL for superadmin queries)
    CASE WHEN EXISTS (
      SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'superadmin'
    ) THEN NULL END,
    -- Admin: Their tenant is their own user_id
    (SELECT user_id FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'),
    -- Salesperson: Their tenant is the tenant_id from their role assignment
    (SELECT tenant_id FROM user_roles WHERE user_id = auth.uid() AND role = 'salesperson')
  );
$$;

-- Check if user can access a specific tenant's data
CREATE OR REPLACE FUNCTION public.can_access_tenant(p_tenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    -- Superadmin can access any tenant
    public.is_superadmin()
    OR
    -- User belongs to this tenant
    public.get_user_tenant_id() = p_tenant_id;
$$;

-- Get distributor_id for the current tenant
CREATE OR REPLACE FUNCTION public.get_tenant_distributor_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id 
  FROM distributor_profiles 
  WHERE user_id = public.get_user_tenant_id()
  LIMIT 1;
$$;
```

---

### Phase 3: Universal RLS Policy Template

Every business table should follow this RLS pattern:

```sql
-- Enable RLS
ALTER TABLE public.{table_name} ENABLE ROW LEVEL SECURITY;

-- Drop existing policies (clean slate)
DROP POLICY IF EXISTS "superadmin_full_access_{table_name}" ON public.{table_name};
DROP POLICY IF EXISTS "tenant_select_{table_name}" ON public.{table_name};
DROP POLICY IF EXISTS "tenant_insert_{table_name}" ON public.{table_name};
DROP POLICY IF EXISTS "tenant_update_{table_name}" ON public.{table_name};
DROP POLICY IF EXISTS "tenant_delete_{table_name}" ON public.{table_name};

-- 1. Superadmin: Full access to ALL data
CREATE POLICY "superadmin_full_access_{table_name}"
ON public.{table_name} FOR ALL
USING (public.is_superadmin())
WITH CHECK (public.is_superadmin());

-- 2. Tenant-based SELECT: Admins and Salespersons see their tenant's data
CREATE POLICY "tenant_select_{table_name}"
ON public.{table_name} FOR SELECT
USING (
  NOT public.is_superadmin() 
  AND tenant_id = public.get_user_tenant_id()
);

-- 3. Tenant-based INSERT: Only Admins and Salespersons in tenant can insert
CREATE POLICY "tenant_insert_{table_name}"
ON public.{table_name} FOR INSERT
WITH CHECK (
  NOT public.is_superadmin()
  AND tenant_id = public.get_user_tenant_id()
);

-- 4. Tenant-based UPDATE: Same tenant can update
CREATE POLICY "tenant_update_{table_name}"
ON public.{table_name} FOR UPDATE
USING (
  NOT public.is_superadmin()
  AND tenant_id = public.get_user_tenant_id()
)
WITH CHECK (
  NOT public.is_superadmin()
  AND tenant_id = public.get_user_tenant_id()
);

-- 5. Tenant-based DELETE: Same tenant can delete
CREATE POLICY "tenant_delete_{table_name}"
ON public.{table_name} FOR DELETE
USING (
  NOT public.is_superadmin()
  AND tenant_id = public.get_user_tenant_id()
);
```

---

### Phase 4: Auto-Population Triggers

#### 4.1 Auto-set `tenant_id` on INSERT

```sql
-- Generic trigger function to set tenant_id
CREATE OR REPLACE FUNCTION public.set_tenant_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only set if not already provided
  IF NEW.tenant_id IS NULL THEN
    NEW.tenant_id := public.get_user_tenant_id();
  END IF;
  
  -- Validate that user can insert for this tenant
  IF NOT public.can_access_tenant(NEW.tenant_id) THEN
    RAISE EXCEPTION 'You do not have permission to create data for this tenant';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Apply trigger to each table
CREATE TRIGGER set_tenant_id_before_insert
  BEFORE INSERT ON public.{table_name}
  FOR EACH ROW
  EXECUTE FUNCTION public.set_tenant_id();
```

#### 4.2 Auto-set `created_by` on INSERT

```sql
CREATE OR REPLACE FUNCTION public.set_created_by()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.created_by IS NULL THEN
    NEW.created_by := auth.uid();
  END IF;
  NEW.created_at := COALESCE(NEW.created_at, now());
  RETURN NEW;
END;
$$;

-- Apply to tables
CREATE TRIGGER set_created_by_before_insert
  BEFORE INSERT ON public.{table_name}
  FOR EACH ROW
  EXECUTE FUNCTION public.set_created_by();
```

#### 4.3 Auto-set `updated_by` on UPDATE

```sql
CREATE OR REPLACE FUNCTION public.set_updated_by()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_by := auth.uid();
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_updated_by_before_update
  BEFORE UPDATE ON public.{table_name}
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_by();
```

---

### Phase 5: Salesperson Integration

#### 5.1 Update Salespersons Table

```sql
-- Ensure salespersons table has proper structure
ALTER TABLE public.salespersons 
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Populate tenant_id from distributor_profiles for existing records
UPDATE public.salespersons s
SET tenant_id = dp.user_id
FROM distributor_profiles dp
WHERE s.distributor_id = dp.id
AND s.tenant_id IS NULL;
```

#### 5.2 Enhanced User Invitation Flow

```sql
-- Updated user_invitations table
CREATE TABLE IF NOT EXISTS public.user_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  role app_role NOT NULL DEFAULT 'salesperson',
  inviter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  phone TEXT,
  commission_rate DECIMAL(5,2) DEFAULT 0,
  assigned_zones UUID[], -- Array of zone IDs
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '7 days'),
  accepted_at TIMESTAMPTZ,
  UNIQUE(email, tenant_id)
);
```

#### 5.3 On Signup: Auto-Create Salesperson Record

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user_with_invitation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invitation RECORD;
  v_distributor_id UUID;
BEGIN
  -- Check for pending invitation
  SELECT * INTO v_invitation
  FROM user_invitations
  WHERE email = NEW.email
    AND accepted_at IS NULL
    AND expires_at > now()
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF v_invitation IS NOT NULL THEN
    -- Create user_role entry
    INSERT INTO user_roles (user_id, role, tenant_id)
    VALUES (NEW.id, v_invitation.role, v_invitation.tenant_id);
    
    -- If salesperson, create salesperson record
    IF v_invitation.role = 'salesperson' THEN
      -- Get distributor_id for the tenant
      SELECT id INTO v_distributor_id
      FROM distributor_profiles
      WHERE user_id = v_invitation.tenant_id;
      
      IF v_distributor_id IS NOT NULL THEN
        INSERT INTO salespersons (
          user_id, 
          distributor_id, 
          tenant_id,
          name, 
          email, 
          phone,
          commission_rate,
          is_active
        )
        VALUES (
          NEW.id,
          v_distributor_id,
          v_invitation.tenant_id,
          COALESCE(v_invitation.name, split_part(NEW.email, '@', 1)),
          NEW.email,
          v_invitation.phone,
          COALESCE(v_invitation.commission_rate, 0),
          true
        );
      END IF;
    END IF;
    
    -- Mark invitation as accepted
    UPDATE user_invitations
    SET accepted_at = now()
    WHERE id = v_invitation.id;
  END IF;
  
  -- Always create profile
  INSERT INTO profiles (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$;
```

---

### Phase 6: Dashboard & Analytics Integration

#### 6.1 Dashboard RPC for Tenant Data

```sql
-- Get dashboard stats for current tenant
CREATE OR REPLACE FUNCTION public.get_tenant_dashboard_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
  v_distributor_id UUID;
  v_result JSON;
BEGIN
  v_tenant_id := public.get_user_tenant_id();
  
  SELECT id INTO v_distributor_id
  FROM distributor_profiles
  WHERE user_id = v_tenant_id;
  
  SELECT json_build_object(
    'total_products', (
      SELECT COUNT(*) FROM products 
      WHERE tenant_id = v_tenant_id
    ),
    'total_parties', (
      SELECT COUNT(*) FROM parties 
      WHERE distributor_id = v_distributor_id
    ),
    'total_sales', (
      SELECT COALESCE(SUM(total_amount), 0) 
      FROM vouchers 
      WHERE tenant_id = v_tenant_id 
        AND voucher_type = 'tax_invoice'
        AND status != 'cancelled'
    ),
    'total_invoices', (
      SELECT COUNT(*) 
      FROM vouchers 
      WHERE tenant_id = v_tenant_id 
        AND voucher_type = 'tax_invoice'
    ),
    'salesperson_count', (
      SELECT COUNT(*) 
      FROM salespersons 
      WHERE tenant_id = v_tenant_id AND is_active = true
    ),
    'salesperson_stats', (
      SELECT json_agg(sp_stats)
      FROM (
        SELECT 
          s.id,
          s.name,
          COUNT(v.id) as total_invoices,
          COALESCE(SUM(v.total_amount), 0) as total_sales
        FROM salespersons s
        LEFT JOIN vouchers v ON v.created_by = s.user_id 
          AND v.tenant_id = v_tenant_id
          AND v.voucher_type = 'tax_invoice'
          AND v.status != 'cancelled'
        WHERE s.tenant_id = v_tenant_id
        GROUP BY s.id, s.name
      ) sp_stats
    )
  ) INTO v_result;
  
  RETURN v_result;
END;
$$;
```

---

### Phase 7: Migration Script

```sql
-- =====================================================
-- COMPLETE MULTI-TENANT DATA ISOLATION MIGRATION
-- Run this as a single transaction
-- =====================================================

BEGIN;

-- ============== STEP 1: Add tenant_id to all tables ==============

-- List of all tables needing tenant_id
DO $$
DECLARE
  tables_to_update TEXT[] := ARRAY[
    'parties', 'vouchers', 'products', 'services', 'brands', 
    'item_categories', 'purchase_orders', 'gate_inward', 
    'marking', 'packing', 'opening_stock', 'ledgers', 
    'ledger_groups', 'terms', 'transports', 'hsn_master',
    'tax_master', 'expense_master', 'group_master', 'tax_class',
    'voucher_prefixes', 'store_locations', 'sales_zones',
    'price_structures', 'party_groups', 'industry_types'
  ];
  t TEXT;
BEGIN
  FOREACH t IN ARRAY tables_to_update
  LOOP
    -- Add tenant_id if not exists
    EXECUTE format('
      ALTER TABLE public.%I 
      ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES auth.users(id);
    ', t);
    
    -- Add created_by if not exists
    EXECUTE format('
      ALTER TABLE public.%I 
      ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);
    ', t);
    
    -- Add updated_by if not exists
    EXECUTE format('
      ALTER TABLE public.%I 
      ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);
    ', t);
    
    -- Create index on tenant_id
    EXECUTE format('
      CREATE INDEX IF NOT EXISTS idx_%I_tenant_id ON public.%I(tenant_id);
    ', t, t);
  END LOOP;
END $$;

-- ============== STEP 2: Populate tenant_id from existing data ==============

-- For tables with distributor_id, derive tenant_id from distributor_profiles
UPDATE parties p
SET tenant_id = dp.user_id
FROM distributor_profiles dp
WHERE p.distributor_id = dp.id
AND p.tenant_id IS NULL;

UPDATE vouchers v
SET tenant_id = dp.user_id
FROM distributor_profiles dp
WHERE v.distributor_id = dp.id
AND v.tenant_id IS NULL;

-- Repeat for all tables with distributor_id...

-- ============== STEP 3: Create helper functions ==============
-- (Insert functions from Phase 2 here)

-- ============== STEP 4: Create RLS policies for each table ==============
-- (Insert RLS policies from Phase 3 here)

-- ============== STEP 5: Create triggers for auto-population ==============
-- (Insert triggers from Phase 4 here)

COMMIT;
```

---

## 📊 Testing Checklist

### Test Scenarios

1. **Admin Data Isolation**
   - [ ] Admin A creates a party
   - [ ] Admin B cannot see Admin A's party
   - [ ] Both admins' parties show correctly in their dashboards

2. **Salesperson Data Attribution**
   - [ ] Salesperson (under Admin A) creates an invoice
   - [ ] Invoice shows in Admin A's dashboard
   - [ ] Invoice does NOT show in Admin B's dashboard
   - [ ] Salesperson can see the invoice they created

3. **Dashboard Aggregation**
   - [ ] Admin dashboard shows all invoices (self + salespersons)
   - [ ] Total sales includes salesperson sales
   - [ ] Per-salesperson breakdown is accurate

4. **Superadmin Access**
   - [ ] Superadmin can see all admins' data
   - [ ] Superadmin can access any tenant's records
   - [ ] Platform-wide analytics work

5. **Cross-Tenant Security**
   - [ ] Direct SQL injection attempts fail
   - [ ] API calls respect tenant boundaries
   - [ ] File exports only include own tenant data

---

## 🚀 Frontend Changes Required

### 1. Update All Data Fetching Hooks

Remove any hardcoded `distributor_id` checks and rely on RLS:

```typescript
// Before
const { data } = await supabase
  .from('parties')
  .select('*')
  .eq('distributor_id', distributorId);

// After (RLS handles filtering)
const { data } = await supabase
  .from('parties')
  .select('*');
```

### 2. Update Dashboard Hook

```typescript
// Use the new RPC for tenant stats
const { data: stats } = await supabase
  .rpc('get_tenant_dashboard_stats');
```

### 3. Salesperson View Restriction

For salespersons, add frontend filters for "My Records":

```typescript
// In useVouchers hook
if (role === 'salesperson') {
  query = query.eq('created_by', user.id);
}
```

---

## 📝 Summary

This implementation provides:

1. ✅ **Complete data isolation** between admins
2. ✅ **Salesperson data flows** to their admin's analytics
3. ✅ **Superadmin oversight** of entire platform
4. ✅ **Automatic tenant assignment** via triggers
5. ✅ **Audit trail** with created_by/updated_by
6. ✅ **Secure invitation flow** for onboarding salespersons
7. ✅ **Database-level enforcement** via RLS (not just frontend)

---

## 🗓️ Implementation Order

1. **Day 1**: Create helper functions and test
2. **Day 2**: Add columns to all tables + migration script
3. **Day 3**: Implement RLS policies for all tables
4. **Day 4**: Create triggers for auto-population
5. **Day 5**: Update frontend hooks and test
6. **Day 6**: Full integration testing
7. **Day 7**: Production deployment

---

**Document Created**: December 23, 2025
**Author**: Antigravity AI
**Version**: 1.0
