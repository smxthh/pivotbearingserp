# Role Assignment Flow - Complete Analysis

## Critical Findings

### 🚨 **PROBLEM: Open Signup Without Role Assignment**

**Current Situation:**
- ✅ Anyone can sign up (Auth.tsx allows public signup)
- ❌ **New signups get NO ROLE automatically** (unless they have an invitation)
- ❌ Users without roles **CANNOT ACCESS ANYTHING** (all RLS policies check for roles)
- ❌ New signups are **INVISIBLE to all admins** (no admin interface to see them)

---

## Signup Flow Analysis

### Path 1: Regular Signup (Current - BROKEN)

```
1. User visits /auth and clicks "Sign up"
2. User enters email/password
3. signUp() creates auth account
4. ❌ NO role is assigned
5. User is logged in but has NO role
6. ❌ User cannot access ANY data (all RLS policies require a role)
7. ❌ User is STUCK - cannot see anything, cannot do anything
8. ❌ NO admin can see this user (no interface exists)
```

**Code Evidence:**
```tsx
// Auth.tsx line 120-154
else if (mode === 'signup') {
  const { error, data } = await signUp(email, password);
  if (error) {
    // handle error
  } else {
    // If this is an invitation signup...
    if (invitation && data?.user) {
      // ✅ Role assigned via accept_invitation()
    } else {
      // ❌ NO ROLE ASSIGNED - User is stuck!
      setSuccess('Check your email for a confirmation link...');
    }
  }
}
```

### Path 2: Invitation-Based Signup (Current - WORKS)

```
1. Admin sends invitation via /salespersons (if interface exists)
2. Salesperson receives invitation link
3. Visits /auth?invitation=xyz
4. Signs up with pre-filled email
5. ✅ accept_invitation() automatically assigns role + tenant_id
6. ✅ User can access their tenant's data
```

**Code Evidence:**
```sql
-- accept_invitation function
CREATE OR REPLACE FUNCTION public.accept_invitation(
  p_invitation_id uuid,
  p_user_id uuid
)
RETURNS boolean
...
BEGIN
  -- Create user role
  INSERT INTO user_roles (user_id, role, tenant_id)
  VALUES (p_user_id, v_invitation.role, v_invitation.tenant_id);
  
  RETURN true;
END;
```

---

## Role Assignment Permissions

### Who Can Assign Roles?

Based on `user_roles` RLS policies:

```sql
-- From 20251223151246_e02770cf-458e-4eef-b0c2-002bd903364d.sql

-- SUPERADMIN: Full control
CREATE POLICY "Superadmin full access to user_roles"
ON public.user_roles FOR ALL
USING (public.is_superadmin())
WITH CHECK (public.is_superadmin());

-- ADMIN: Can only assign 'salesperson' role to their tenant
CREATE POLICY "Admins can assign roles to their tenant"
ON public.user_roles FOR INSERT
WITH CHECK (
  public.is_admin() 
  AND tenant_id = auth.uid() 
  AND role = 'salesperson'  -- ← ONLY SALESPERSON!
);

-- ADMINS CANNOT: 
-- ❌ Assign 'admin' role
-- ❌ Assign 'superadmin' role
-- ❌ Assign roles to other tenants
```

**Summary Table:**

| Who         | Can Assign What Roles?        | To Whom?                    |
|-------------|------------------------------|-----------------------------|
| Superadmin  | ✅ All roles (admin, salesperson, superadmin) | ✅ Anyone, any tenant      |
| Admin       | ✅ Only 'salesperson'        | ✅ Only their own tenant   |
| Salesperson | ❌ Cannot assign any roles   | ❌ N/A                      |

---

## Visibility of New Signups

### Will New Signups Show Up?

**Answer: NO - they are completely invisible**

```sql
-- Admins can only see users in their tenant
CREATE POLICY "Admins see their tenant users only"
ON public.user_roles FOR SELECT
USING (
  public.is_admin() AND tenant_id = auth.uid()
);
```

**Problem:**
- New signup has NO role → NO tenant_id → row doesn't exist in `user_roles`
- Admin queries `user_roles` WHERE `tenant_id = auth.uid()`
- Result: **Empty set** - new signup is invisible

**Who CAN see new signups?**
- ✅ **Superadmin ONLY** (via `is_superadmin()` policy)
- ❌ Admins **CANNOT** see them (they have no tenant_id yet)
- ❌ No UI exists to show "pending users without roles"

---

## The First User Problem

### How Does the FIRST User (First Admin) Get a Role?

**Currently: Manual Superadmin Assignment Required**

1. First user signs up
2. User has NO role
3. **Superadmin must manually assign** 'admin' role
4. How? **No UI exists!**

**Options:**

### Option A: SQL Direct Insert (Current Reality)
```sql
-- Superadmin must run this manually in database
INSERT INTO user_roles (user_id, role, tenant_id)
VALUES (
  'first-user-uuid',
  'admin'::app_role,
  'first-user-uuid'  -- admin's tenant is their own user_id
);
```

### Option B: Supabase RPC (If superadmin has access)
```sql
-- Create a function
CREATE OR REPLACE FUNCTION assign_admin_role(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO user_roles (user_id, role, tenant_id)
  VALUES (p_user_id, 'admin', p_user_id)
  ON CONFLICT (user_id, role) DO NOTHING;
END;
$$;

-- Superadmin calls it
SELECT assign_admin_role('user-uuid-here');
```

### Option C: Auto-Assign First User as Superadmin (Migration)
```sql
-- Run once on production
CREATE OR REPLACE FUNCTION auto_assign_first_admin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_count INT;
BEGIN
  -- Count existing users with roles
  SELECT COUNT(*) INTO v_user_count FROM user_roles;
  
  -- If this is the FIRST user, make them superadmin
  IF v_user_count = 0 THEN
    INSERT INTO user_roles (user_id, role, tenant_id)
    VALUES (NEW.id, 'superadmin', NEW.id);
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS auto_assign_first_user ON auth.users;
CREATE TRIGGER auto_assign_first_user
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION auto_assign_first_admin();
```

---

## Current System Deficiencies

### ❌ Missing Features

1. **No Admin Management Interface**
   - No page to view all users in a tenant
   - No UI to assign roles
   - No way for admin to see pending signups

2. **No Self-Service Admin Creation**
   - New companies cannot onboard themselves
   - Requires superadmin intervention

3. **No First-User Bootstrap**
   - First signup gets stuck without a role
   - No automatic admin assignment

4. **Broken Public Signup**
   - Signup form exists but creates unusable accounts
   - Users get confirmation email but can't access anything

---

## Recommended Solutions

### Solution 1: Disable Public Signup (Quick Fix)

**Why:** Public signup creates broken accounts that nobody can manage

```tsx
// Auth.tsx
// Remove the signup mode toggle
{mode !== 'forgot' && !invitation && (
  <div className="text-center text-sm">
    {mode === 'login' ? (
      <>
        Need access? Contact your administrator
      </>
    ) : (
      // REMOVE THIS BLOCK
    )}
  </div>
)}
```

### Solution 2: Auto-Assign First User as Superadmin

**Implementation:** Use trigger approach (Option C above)

This ensures the FIRST signup becomes superadmin automatically.

### Solution 3: Create Superadmin User Management Interface

**Features:**
- View all users (including those without roles)
- Assign roles (admin, salesperson)
- Manage tenants
- Create invitations

**Route:** `/admin/users` (superadmin only)

### Solution 4: Admin User Management for Their Tenant

**Features:**
- View salespersons in their tenant
- Create salesperson invitations
- Revoke access

**This already exists in the schema via `user_invitations` table**

---

## Security Audit Results

### ✅ Strong Points

1. **Tenant Isolation Works**
   - Admins can ONLY see their tenant's users
   - Cannot assign roles outside their tenant
   - Cannot escalate to admin/superadmin

2. **RLS Properly Enforced**
   - All role checks happen at database level
   - Frontend cannot bypass security

3. **Invitation System Secure**
   - Uses SECURITY DEFINER function
   - Properly validates invitation
   - Auto-expires after 7 days

### ❌ Weak Points

1. **Public Signup Creates Orphaned Users**
   - No automatic role assignment
   - Users cannot self-elevate
   - But: Users are powerless (cannot access data)

2. **First User Problem**
   - No automatic superadmin creation
   - Requires manual database intervention

3. **No Pending User Visibility**
   - Signed-up users without roles are invisible
   - No admin interface to see them

---

## Immediate Action Required

### Priority 1: Fix First User Bootstrap

Add trigger to make first signup a superadmin:

```sql
-- Migration: 20251224_bootstrap_first_user.sql
CREATE OR REPLACE FUNCTION auto_assign_first_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_count INT;
BEGIN
  SELECT COUNT(*) INTO v_user_count FROM user_roles;
  
  IF v_user_count = 0 THEN
    INSERT INTO user_roles (user_id, role, tenant_id)
    VALUES (NEW.id, 'superadmin', NEW.id);
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER bootstrap_first_user
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION auto_assign_first_user();
```

### Priority 2: Disable or Fix Public Signup

**Option A:** Hide signup button, only allow invitation-based
**Option B:** Make public signup assign 'admin' role automatically (multi-tenant SaaS model)

### Priority 3: Build Superadmin Dashboard

Create `/admin/users` page for:
- Viewing all users
- Assigning roles
- Managing tenants

---

## Final Answer to Your Questions

### Q: Who can assign roles to new signups?

**A: Only Superadmin can assign 'admin' role**
- ✅ **Superadmin** → Can assign ANY role to ANYONE
- ⚠️ **Admin** → Can ONLY assign 'salesperson' role to their own tenant
- ❌ **Salesperson** → Cannot assign any roles

### Q: Will new signups show up?

**A: NO - They are invisible to admins**
- New signups without roles have no `tenant_id`
- Admins can only see users in their tenant (`WHERE tenant_id = auth.uid()`)
- Only superadmin can see all users via `is_superadmin()` policy

### Q: Current Status?

**A: System is secure but partially broken:**
- ✅ **Security:** Perfect tenant isolation
- ✅ **Invitation flow:** Works correctly
- ❌ **Public signup:** Creates orphaned accounts
- ❌ **First user:** Cannot bootstrap without manual SQL
- ❌ **Visibility:** No admin UI to manage users

**Action Required: Implement Priority 1 & 2 fixes immediately**
