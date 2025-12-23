# ERP System-Wide Logical Audit & Action Plan

## 🚨 Critical Findings (Urgent Attention Required)

### 1. Concurrency & Race Conditions (High Risk)
**The Problem**: While we fixed atomic numbering for **Tax Invoices**, the rest of the system (`Sales Orders`, `Gate Inward`, `Delivery Challans`) still relies on client-side numbering (e.g., frontend manual entry or "Last + 1").
**The Risk**: Two users creating a Sales Order at the same time will generate the **same Order Number**, causing a crash or duplicate data.
**Affected Areas**:
- `SalesOrderDialog.tsx`
- `GateInwardDialog.tsx`
- Likely `DeliveryChallan.tsx`, `PurchaseOrder.tsx`

### 2. Inventory Logic Disconnect (Critical Logic Gap)
**The Problem**: The **Gate Inward** module creates a document but **does NOT update the Stock Logic**.
- **Evidence**: `GateInwardDialog.tsx` inserts into `gate_inward` and `gate_inward_items`, but there is **no trigger** on the database and **no frontend call** to update `stock_movements`.
**The Result**: You will have "Gate Inwards" in your system, but your Inventory Reports will show **0 Stock**. The Accounting and Inventory modules are completely disconnected.

### 3. Transaction Safety (Data Corruption Risk)
**The Problem**: Saving a document happens in two steps:
1. Save Header (e.g., Gate Inward)
2. Save Items (Loop)
**The Risk**: If Step 1 succeeds but Step 2 fails (internet blip), you get an **Empty Document** (Ghost Entry) in your system.
**Solution**: This must be wrapped in a Database Transaction (PL/pgSQL function) so it all succeeds or all fails.

---

## 🛠️ Actionable Prompts (Copy & Paste to Fix)

Here is a roadmap to fix your ERP logically. Run these prompts one by one.

### Phase 1: Fix Core Architecture (The "Brain")
> "Help me refactor the `Sales Order` and `Gate Inward` modules to use the same **Atomic Database Trigger** approach we used for Invoices. Create a migration to trigger `trg_generate_inv_number` for these voucher types as well, and update the Dialogs to be Read-Only/Auto-Generated."

### Phase 2: Connect Inventory (The "Body")
> "The Gate Inward module is not updating my stock. Create a Database Trigger `trg_gate_inward_stock_update` that automatically inserts into the `stock_movements` table whenever a `gate_inward_item` is created. Ensure it handles the '+ Qty' logic correctly."

### Phase 3: Transaction Safety (The "Safety Net")
> "Refactor the `GateInwardDialog` and `SalesOrderDialog` submission logic. Instead of multiple frontend API calls, create a single Supabase RPC function (e.g., `create_gate_inward_atomic`) that accepts the header and items JSON, and inserts them in a single database transaction."

---

## 🔍 Detailed Component Audit

| Component | Status | Issue | Fix Type |
| :--- | :--- | :--- | :--- |
| **Tax Invoice** | ✅ **Fixed** | - | - |
| **Sales Order** | ❌ **Broken** | Client-side numbering (Race Condition) | Backend Trigger |
| **Gate Inward** | ❌ **Broken** | 1. No Stock Update<br>2. Non-atomic Numbering | Backend Trigger |
| **Inventory** | ⚠️ **Risk** | Disconnected from Documents | Logic Integration |
| **Purchase Order**| ⚠️ **Risk** | Likely same concurrency issue | Backend Trigger |

## 💡 Expert Recommendation
Your "Seamless" software is currently a **Frontend Prototype**. It looks good, but the "business logic" (Stock updates, Numbering safety) is missing from the database layer.

**Immediate Next Step**: Do not add new features. **Fix the Foundation**. Start with **Phase 2 (Inventory Connection)** so your stock counts actually work, then **Phase 1 (Numbering)**.
