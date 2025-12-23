# Admin Party Access - Quick Fix

## Problem
Admin user `smitmodi416@gmail.com` cannot add parties because admins don't have a `distributor_id`.

## Solution ✅

I've implemented a fix that:
1. **Auto-creates** a distributor profile for admins
2. **Updates RLS policies** to allow admin access
3. **Ensures** admins can add/edit/delete parties

## 🚀 How to Fix

### Step 1: Run SQL Migration

Open Supabase Dashboard → SQL Editor and run:

```sql
-- File: supabase/migrations/fix_admin_party_access.sql
```

This migration:
- ✅ Updates RLS policies for `distributor_profiles`
- ✅ Updates RLS policies for `parties`
- ✅ Ensures admin role exists for `smitmodi416@gmail.com`
- ✅ Grants proper permissions

### Step 2: Test Adding a Party

1. **Login** as admin (`smitmodi416@gmail.com`)
2. **Go to** Party Master
3. **Click** "Add Customer"
4. **Fill in** party details
5. **Click** "Save"

The system will:
- Automatically create a distributor profile for the admin (if doesn't exist)
- Use that profile's ID for the party's `distributor_id`
- Save the party successfully

## 🔧 What Changed

### Code Changes

**File**: `src/hooks/useDistributorProfile.ts`

The `useDistributorId()` hook now:
```typescript
if (role === 'admin') {
  // Check if admin has a distributor profile
  // If not, create one automatically
  // Return the distributor_id
}
```

### Database Changes

**RLS Policies Added**:
1. Admins can insert distributor profiles
2. Admins can view all parties
3. Admins can insert parties
4. Admins can update all parties
5. Admins can delete all parties

## 🎯 How It Works

### For Admin Users:
1. Admin tries to add a party
2. System checks for admin's distributor profile
3. If not found, creates one automatically with:
   - `company_name`: "Admin Company"
   - `invoice_prefix`: "INV"
4. Uses that profile's ID for the party
5. Party is saved successfully

### For Distributor Users:
- Uses their existing distributor profile ID
- No changes needed

### For Salesperson Users:
- Uses their assigned distributor_id from salespersons table
- No changes needed

## ✅ Verification

After running the migration, verify with these queries:

### Check Admin Role
```sql
SELECT u.email, ur.role
FROM auth.users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
WHERE u.email = 'smitmodi416@gmail.com';
```

Expected: Should show `admin` role

### Check Admin Distributor Profile
```sql
SELECT dp.*
FROM distributor_profiles dp
JOIN auth.users u ON dp.user_id = u.id
WHERE u.email = 'smitmodi416@gmail.com';
```

Expected: Should show a distributor profile (created automatically on first party add)

## 🐛 Troubleshooting

### Still can't add parties?

1. **Check RLS policies**:
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'parties';
   ```

2. **Check admin role**:
   ```sql
   SELECT * FROM user_roles WHERE user_id = (
     SELECT id FROM auth.users WHERE email = 'smitmodi416@gmail.com'
   );
   ```

3. **Check distributor profile**:
   ```sql
   SELECT * FROM distributor_profiles WHERE user_id = (
     SELECT id FROM auth.users WHERE email = 'smitmodi416@gmail.com'
   );
   ```

4. **Check browser console** for any errors

### "Permission denied" error?

Run the migration again - it's idempotent and safe to run multiple times.

### Profile not auto-creating?

1. Hard refresh the page (Ctrl+Shift+R)
2. Logout and login again
3. Check Supabase logs for errors

## 📋 Summary

| User Type | Distributor Profile | Can Add Parties |
|-----------|-------------------|-----------------|
| Admin | Auto-created | ✅ Yes |
| Distributor | Manual setup | ✅ Yes |
| Salesperson | Uses distributor's | ✅ Yes |

## 🎉 What's Fixed

- ✅ Admin can now add parties
- ✅ Auto-creates distributor profile for admins
- ✅ RLS policies updated for admin access
- ✅ No manual setup required for admins
- ✅ Works seamlessly with existing code

---

**Just run the SQL migration and the admin will be able to add parties immediately!** 🚀
