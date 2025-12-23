# Distributor Profile Setup - Quick Fix

## Problem
You were getting an error: **"Distributor profile not found. Please set up your profile first."**

This happened because the system requires a distributor profile before you can add parties.

## Solution ✅

I've created a **Distributor Setup** page where you can create your company profile.

### How to Set Up Your Profile

1. **Visit the setup page**: `http://localhost:5173/setup`

2. **Fill in your company details**:
   - Company Name (required)
   - GST Number
   - Invoice Prefix (e.g., "INV")
   - Phone Number
   - Address, City, State, Pincode

3. **Click "Create Profile"**

4. **You'll be redirected to Party Master** where you can now add parties!

## Quick Steps

```
1. Go to: http://localhost:5173/setup
2. Enter company name (minimum required)
3. Click "Create Profile"
4. Done! Now you can add parties
```

## What Happens Next

After creating your profile:
- ✅ You can add parties (customers/suppliers)
- ✅ You can create invoices
- ✅ Party codes will be auto-generated (C001, C002, etc.)
- ✅ All your data will be linked to your distributor profile

## Error Message Improved

Now when you try to add a party without a profile, you'll see:
- Clear error message
- **"Go to Setup →" link** that takes you directly to the setup page

## Database Migration Required

**IMPORTANT**: Before using the system, run this SQL migration in your Supabase dashboard:

```sql
-- File: supabase/migrations/parties_extended_fields.sql
```

This adds:
- Extended party fields (party_code, legal_name, contact_person, etc.)
- New tables (industry_types, sales_zones, price_structures, districts)
- `generate_party_code()` function

## Files Created/Modified

1. **`src/pages/DistributorSetup.tsx`** - New setup page
2. **`src/App.tsx`** - Added `/setup` route
3. **`src/components/parties/PartyDialog.tsx`** - Better error with setup link

## Access the Setup Page

**Direct Link**: http://localhost:5173/setup

Or you can add it to your sidebar navigation for easy access.

---

**Next Steps**:
1. Visit `/setup` and create your profile
2. Then go to Party Master and add your first customer
3. Test the GST auto-fill feature!
