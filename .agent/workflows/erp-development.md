---
description: Complete ERP Development Rulebook - Supabase Backend, UI/UX Standards, Real-time Sync
---

# Pivot Bearings ERP - Development Rulebook

> **Version**: 1.1.0 (Active Development)
> **Project**: Pivot Bearings ERP
> **Tech Stack**: React + Vite + TypeScript + Tailwind CSS + Supabase + shadcn/ui

## ✅ IMPLEMENTATION STATUS

### Completed
- [x] TypeScript types for all Supabase tables
- [x] Real-time subscription hook (`useRealtimeSubscription.ts`)
- [x] Parties module with Supabase (`useParties.ts`, `PartyList.tsx`, `PartyForm.tsx`)
- [x] Items module with Supabase (`useItems.ts`, `ItemList.tsx`, `ItemForm.tsx`)
- [x] Dashboard with live data (`useDashboard.ts`, `Dashboard.tsx`)
- [x] Distributor profile hook (`useDistributorProfile.ts`)
- [x] Constants and utility functions (`constants.ts`)

### In Progress
- [ ] Sales invoice creation
- [ ] Purchase invoice creation
- [ ] Payments module
- [ ] Accounting ledgers

### Pending
- [ ] Reports with Supabase queries
- [ ] Stock movement tracking
- [ ] Invoice PDF generation

---

## 📋 TABLE OF CONTENTS

1. [Project Overview](#1-project-overview)
2. [Role-Based Access Control](#2-role-based-access-control)
3. [Supabase Database Schema](#3-supabase-database-schema)
4. [Real-time Synchronization](#4-real-time-synchronization)
5. [UI/UX Design Standards](#5-uiux-design-standards)
6. [Frontend Architecture](#6-frontend-architecture)
7. [Development Workflow](#7-development-workflow)

---

## 1. PROJECT OVERVIEW

### 1.1 Business Context
Pivot Bearings ERP is a comprehensive enterprise resource planning system designed for:
- **Parties Management**: Customers, suppliers, and combined parties
- **Inventory Management**: Items with SKU, pricing, GST, and stock tracking
- **Sales & Purchase**: Invoice generation with line items and tax calculations
- **Accounting**: Ledgers, receivables, payables tracking
- **Reports**: Sales, purchase, customers, products, and state-wise analytics

### 1.2 Technical Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                       FRONTEND                               │
│   React + Vite + TypeScript + Tailwind + shadcn/ui          │
├─────────────────────────────────────────────────────────────┤
│                    STATE MANAGEMENT                          │
│   React Query + Supabase Real-time Subscriptions            │
├─────────────────────────────────────────────────────────────┤
│                      SUPABASE                                │
│   Auth │ Database (PostgreSQL) │ RLS │ Real-time │ Storage  │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. ROLE-BASED ACCESS CONTROL

### 2.1 Roles Hierarchy
```
admin          → Full access (all features + user management)
distributor    → Manage parties, items, purchases, sales, accounting, reports
salesperson    → Sales only (create sales, view assigned parties)
```

### 2.2 Page Access Matrix

| Page/Feature | Admin | Distributor | Salesperson |
|--------------|-------|-------------|-------------|
| Dashboard | ✅ | ✅ | ✅ |
| User Management | ✅ | ❌ | ❌ |
| Configuration | ✅ | ❌ | ❌ |
| Parties | ✅ | ✅ | ❌ |
| Items | ✅ | ✅ | ❌ |
| Sales | ✅ | ✅ | ✅ |
| Purchase | ✅ | ✅ | ❌ |
| Accounting | ✅ | ✅ | ❌ |
| Reports | ✅ | ✅ | ❌ |

### 2.3 Data Isolation Rules
- **Admin**: Can see all data across all distributors
- **Distributor**: Can only see their own data (parties, items, invoices)
- **Salesperson**: Can only see data assigned by their parent distributor

---


## 4. REAL-TIME SYNCHRONIZATION

### 4.1 Supabase Real-time Subscriptions

```typescript
// hooks/useRealtimeSubscription.ts
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

export function useRealtimeSubscription(
  table: string,
  queryKey: string[],
  filter?: { column: string; value: string }
) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel(`${table}_changes`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: table,
          filter: filter ? `${filter.column}=eq.${filter.value}` : undefined,
        },
        (payload) => {
          console.log(`[Realtime] ${table} change:`, payload);
          // Invalidate and refetch queries
          queryClient.invalidateQueries({ queryKey });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, queryKey, filter, queryClient]);
}
```

### 4.2 Query Hooks Pattern

```typescript
// hooks/useParties.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useRealtimeSubscription } from './useRealtimeSubscription';

export function useParties() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = ['parties'];

  // Real-time subscription
  useRealtimeSubscription('parties', queryKey);

  // Fetch parties
  const { data: parties = [], isLoading, error } = useQuery({
    queryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('parties')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Add party mutation
  const addParty = useMutation({
    mutationFn: async (party: PartyInsert) => {
      const { data, error } = await supabase
        .from('parties')
        .insert(party)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  // Update party mutation
  const updateParty = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: PartyUpdate }) => {
      const { data, error } = await supabase
        .from('parties')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  // Delete party mutation
  const deleteParty = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('parties')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  return {
    parties,
    isLoading,
    error,
    addParty,
    updateParty,
    deleteParty,
  };
}
```

---

## 5. UI/UX DESIGN STANDARDS

### 5.1 Design Philosophy
- **Clean & Minimalistic**: Ample white space, clear hierarchy
- **Curved Layouts**: Use `rounded-xl`, `rounded-2xl`, `rounded-3xl` for cards
- **Speed Optimized**: Skeleton loaders, optimistic updates
- **Responsive**: Mobile-first design

### 5.2 Color Palette

```css
/* Primary Colors */
--primary: 222.2 84% 44.9%;      /* Blue */
--primary-foreground: 210 40% 98%;

/* Status Colors */
--success: 142.1 76.2% 36.3%;    /* Green */
--warning: 45.4 93.4% 47.5%;     /* Yellow/Orange */
--destructive: 0 84.2% 60.2%;    /* Red */
--info: 201 96% 46%;             /* Light Blue */

/* Neutral Colors */
--background: 0 0% 98%;          /* Light gray bg */
--card: 0 0% 100%;               /* White cards */
--muted: 210 40% 96.1%;
--border: 214.3 31.8% 91.4%;
```

### 5.3 Typography

```css
/* Font Family */
font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;

/* Letter Spacing */
.tracking-tight { letter-spacing: -0.025em; }
.tracking-[-0.06em] { letter-spacing: -0.06em; } /* Headings */

/* Font Sizes */
.text-xs   { font-size: 0.75rem; }   /* 12px - Labels */
.text-sm   { font-size: 0.875rem; }  /* 14px - Body text */
.text-base { font-size: 1rem; }      /* 16px - Default */
.text-lg   { font-size: 1.125rem; }  /* 18px - Subheadings */
.text-xl   { font-size: 1.25rem; }   /* 20px - Section titles */
.text-2xl  { font-size: 1.5rem; }    /* 24px - Page titles */
```

### 5.4 Component Styling Standards

```tsx
// Card Component Pattern
<div className="bg-card rounded-xl border border-border p-6 shadow-sm hover:shadow-md transition-shadow">
  {/* Content */}
</div>

// Button Variants
<Button className="rounded-lg">Default</Button>
<Button variant="outline" className="rounded-lg">Outline</Button>
<Button variant="ghost" className="rounded-lg">Ghost</Button>

// Input Fields
<Input className="rounded-lg h-10" />

// Tables
<div className="bg-card rounded-xl border overflow-hidden">
  <Table>
    {/* Table content */}
  </Table>
</div>

// Page Container Pattern
<div className="space-y-6 p-6 animate-fade-in">
  <div className="flex items-center justify-between">
    <h1 className="text-2xl font-semibold tracking-[-0.06em]">Page Title</h1>
    <Button>Action</Button>
  </div>
  {/* Page content */}
</div>
```

### 5.5 Animation Standards

```css
/* Fade In Animation */
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.animate-fade-in {
  animation: fadeIn 0.3s ease-out;
}

/* Skeleton Loading */
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

.skeleton {
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}
```

### 5.6 Responsive Breakpoints

```css
/* Tailwind Breakpoints */
sm: 640px   /* Mobile landscape */
md: 768px   /* Tablets */
lg: 1024px  /* Laptops */
xl: 1280px  /* Desktops */
2xl: 1536px /* Large screens */
```

---

## 6. FRONTEND ARCHITECTURE

### 6.1 Folder Structure

```
src/
├── components/
│   ├── auth/           # Auth components (ProtectedRoute, RoleBasedRoute)
│   ├── dashboard/      # Dashboard-specific components
│   ├── layout/         # AppLayout, AppSidebar, AppHeader
│   ├── shared/         # Reusable components (PageContainer, DataTable, ConfirmDialog)
│   └── ui/             # shadcn/ui components
├── contexts/
│   ├── AuthContext.tsx # Authentication & role management
│   └── AppContext.tsx  # Global app state (replace with hooks)
├── hooks/
│   ├── useParties.ts   # Party CRUD operations
│   ├── useItems.ts     # Item CRUD operations
│   ├── useInvoices.ts  # Invoice operations
│   ├── usePayments.ts  # Payment operations
│   └── useRealtimeSubscription.ts
├── integrations/
│   └── supabase/
│       ├── client.ts   # Supabase client instance
│       └── types.ts    # Generated types from Supabase
├── lib/
│   ├── utils.ts        # Utility functions
│   └── constants.ts    # App constants
├── pages/
│   ├── admin/          # Admin-only pages
│   ├── parties/        # Party management
│   ├── items/          # Item management
│   ├── sales/          # Sales invoices
│   ├── purchase/       # Purchase invoices
│   ├── accounting/     # Ledgers, receivables, payables
│   └── reports/        # Various reports
└── types/
    └── index.ts        # TypeScript type definitions
```

### 6.2 Type Definitions

```typescript
// types/index.ts
export type PartyType = 'customer' | 'supplier' | 'both';
export type InvoiceType = 'sale' | 'purchase' | 'sale_return' | 'purchase_return';
export type InvoiceStatus = 'draft' | 'confirmed' | 'cancelled';
export type PaymentStatus = 'unpaid' | 'partial' | 'paid';
export type PaymentMode = 'cash' | 'bank' | 'cheque' | 'upi' | 'card' | 'other';
export type PaymentType = 'receipt' | 'payment';

export interface Party {
  id: string;
  distributor_id: string;
  name: string;
  type: PartyType;
  gst_number?: string;
  pan_number?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state: string;
  pincode?: string;
  opening_balance: number;
  current_balance: number;
  credit_limit: number;
  credit_days: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Item {
  id: string;
  distributor_id: string;
  name: string;
  sku: string;
  hsn_code?: string;
  category_id?: string;
  description?: string;
  unit: string;
  sale_price: number;
  purchase_price: number;
  mrp: number;
  gst_percent: number;
  cess_percent: number;
  stock_quantity: number;
  min_stock_level: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Invoice {
  id: string;
  distributor_id: string;
  invoice_number: string;
  invoice_type: InvoiceType;
  invoice_date: string;
  due_date?: string;
  party_id: string;
  party_name: string;
  party_gst?: string;
  party_state: string;
  // ... other fields
  items?: InvoiceItem[];
}

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  item_id?: string;
  item_name: string;
  item_sku?: string;
  hsn_code?: string;
  quantity: number;
  unit: string;
  rate: number;
  discount_percent: number;
  discount_amount: number;
  taxable_amount: number;
  gst_percent: number;
  cgst_amount: number;
  sgst_amount: number;
  igst_amount: number;
  cess_percent: number;
  cess_amount: number;
  total_amount: number;
}
```

### 6.3 State Management Pattern

```typescript
// Replace AppContext with React Query hooks
// Each domain has its own hook: useParties, useItems, useInvoices, etc.

// Example usage in component:
function PartyList() {
  const { parties, isLoading, addParty, deleteParty } = useParties();
  
  if (isLoading) return <LoadingSkeleton />;
  
  return (
    <DataTable
      data={parties}
      columns={columns}
      onDelete={(id) => deleteParty.mutate(id)}
    />
  );
}
```

---

## 7. DEVELOPMENT WORKFLOW

### 7.1 Feature Development Checklist

```markdown
## New Feature Checklist

### Database
- [ ] Create migration SQL file
- [ ] Add RLS policies
- [ ] Create necessary indexes
- [ ] Add triggers if needed
- [ ] Regenerate TypeScript types

### Backend Integration
- [ ] Create/update hook (useXxx.ts)
- [ ] Add real-time subscription
- [ ] Handle loading states
- [ ] Handle error states
- [ ] Add optimistic updates

### Frontend
- [ ] Create page component
- [ ] Add route to App.tsx
- [ ] Implement RoleBasedRoute if needed
- [ ] Create form component
- [ ] Add validation
- [ ] Add skeleton loaders
- [ ] Add empty states

### UI/UX
- [ ] Follow design standards
- [ ] Mobile responsive
- [ ] Animations (fade-in, transitions)
- [ ] Toast notifications
- [ ] Confirm dialogs for destructive actions

### Testing
- [ ] Test all CRUD operations
- [ ] Test real-time sync
- [ ] Test across different roles
- [ ] Test error scenarios
```

### 7.2 Supabase Type Generation

```bash
# Generate types from Supabase
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/integrations/supabase/types.ts
```

### 7.3 Error Handling Pattern

```typescript
// Consistent error handling
try {
  const { data, error } = await supabase.from('table').select('*');
  
  if (error) {
    console.error('Database error:', error);
    toast.error(error.message || 'An error occurred');
    throw error;
  }
  
  return data;
} catch (err) {
  console.error('Unexpected error:', err);
  toast.error('Something went wrong. Please try again.');
  throw err;
}
```

### 7.4 GST Calculation Logic

```typescript
// GST Calculation Helper
export function calculateGST(
  amount: number,
  gstPercent: number,
  sellerState: string,
  buyerState: string
): {
  cgst: number;
  sgst: number;
  igst: number;
  totalTax: number;
} {
  const taxAmount = (amount * gstPercent) / 100;
  
  if (sellerState === buyerState) {
    // Intra-state: CGST + SGST
    const halfTax = taxAmount / 2;
    return {
      cgst: halfTax,
      sgst: halfTax,
      igst: 0,
      totalTax: taxAmount,
    };
  } else {
    // Inter-state: IGST
    return {
      cgst: 0,
      sgst: 0,
      igst: taxAmount,
      totalTax: taxAmount,
    };
  }
}
```

---

## 🚀 QUICK START COMMANDS

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Generate Supabase types
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/integrations/supabase/types.ts

# Run migrations
# (Run in Supabase Dashboard SQL Editor or via CLI)
```

---

## 📚 REFERENCE LINKS

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Real-time](https://supabase.com/docs/guides/realtime)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [React Query](https://tanstack.com/query/latest)
- [shadcn/ui Components](https://ui.shadcn.com/)

---

> **Last Updated**: 2024-12-16
> **Maintained By**: Development Team