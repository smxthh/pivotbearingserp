-- ==============================================================================
-- ACCOUNTING PHASE 2.5: PURCHASE INFRASTRUCTURE
-- Created: 2025-12-24
-- Purpose: Creates Vendor Bill entities and connects them to Accounting
-- ==============================================================================

-- 1. PURCHASE INVOICES TABLE
CREATE TABLE IF NOT EXISTS public.purchase_invoices (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id uuid NOT NULL,
    purchase_order_id uuid, -- Optional link to PO (Note: PO table is likely purchase_orders)
    party_id uuid NOT NULL REFERENCES public.parties(id),
    invoice_number text NOT NULL, -- Vendor's Invoice Number
    invoice_date date NOT NULL,
    due_date date,
    
    -- Amounts
    total_taxable_amount numeric DEFAULT 0,
    total_tax_amount numeric DEFAULT 0,
    grand_total numeric DEFAULT 0,
    
    status text DEFAULT 'Draft' CHECK (status IN ('Draft', 'Posted', 'Cancelled')),
    url text, -- File path for scanned bill
    
    created_at timestamptz DEFAULT now(),
    created_by uuid REFERENCES auth.users(id),
    updated_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE public.purchase_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their tenant's purchase invoices"
    ON public.purchase_invoices FOR SELECT
    USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Admins can manage their tenant's purchase invoices"
    ON public.purchase_invoices FOR ALL
    USING (tenant_id = public.get_user_tenant_id())
    WITH CHECK (tenant_id = public.get_user_tenant_id());


-- 2. PURCHASE INVOICE ITEMS TABLE
CREATE TABLE IF NOT EXISTS public.purchase_invoice_items (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    purchase_invoice_id uuid NOT NULL REFERENCES public.purchase_invoices(id) ON DELETE CASCADE,
    tenant_id uuid NOT NULL,
    
    description text NOT NULL,
    hsn_code text,
    
    quantity numeric DEFAULT 1,
    rate numeric DEFAULT 0,
    amount numeric DEFAULT 0, -- Taxable Value
    
    gst_rate numeric DEFAULT 0, -- Total Tax Rate %
    cgst_amount numeric DEFAULT 0,
    sgst_amount numeric DEFAULT 0,
    igst_amount numeric DEFAULT 0,
    
    created_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE public.purchase_invoice_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view purchase items"
    ON public.purchase_invoice_items FOR SELECT
    USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Admins can manage purchase items"
    ON public.purchase_invoice_items FOR ALL
    USING (tenant_id = public.get_user_tenant_id())
    WITH CHECK (tenant_id = public.get_user_tenant_id());


-- 3. PURCHASE INTEGRATION RPC
---------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.post_purchase_invoice_to_accounting(p_invoice_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_tenant_id uuid;
    inv_rec RECORD;
    tax_rec RECORD;
    v_vendor_ledger_id uuid;
    v_purchase_ledger_id uuid;
    v_input_cgst_id uuid;
    v_input_sgst_id uuid;
    v_input_igst_id uuid;
    v_entries jsonb := '[]'::jsonb;
    v_total_taxable numeric := 0;
    v_total_cgst numeric := 0;
    v_total_sgst numeric := 0;
    v_total_igst numeric := 0;
    v_grand_total numeric := 0;
BEGIN
    v_tenant_id := public.get_user_tenant_id();

    -- 1. Fetch Invoice
    SELECT * INTO inv_rec FROM purchase_invoices WHERE id = p_invoice_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Purchase Invoice not found'; END IF;

    -- Check status
    IF inv_rec.status = 'Posted' THEN
        RAISE EXCEPTION 'Invoice is already posted';
    END IF;
    -- Also Check ledger_entries just in case
    IF EXISTS (SELECT 1 FROM ledger_entries WHERE transaction_id = p_invoice_id) THEN
        RAISE EXCEPTION 'Accounting entries already exist for this invoice';
    END IF;

    -- 2. Identify Ledgers
    -- Vendor
    SELECT ledger_id INTO v_vendor_ledger_id FROM parties WHERE id = inv_rec.party_id;
    IF v_vendor_ledger_id IS NULL THEN
        -- Heal
        PERFORM public.create_ledger_for_party(inv_rec.party_id);
        SELECT ledger_id INTO v_vendor_ledger_id FROM parties WHERE id = inv_rec.party_id;
    END IF;
    IF v_vendor_ledger_id IS NULL THEN RAISE EXCEPTION 'Vendor Ledger not found'; END IF;

    -- Purchase Account (Default)
    v_purchase_ledger_id := public.get_ledger_id_by_name(v_tenant_id, 'Purchase Account');
    IF v_purchase_ledger_id IS NULL THEN RAISE EXCEPTION 'Purchase Account ledger missing'; END IF;

    -- Input Duties
    v_input_cgst_id := public.get_ledger_id_by_name(v_tenant_id, 'Input CGST');
    v_input_sgst_id := public.get_ledger_id_by_name(v_tenant_id, 'Input SGST');
    v_input_igst_id := public.get_ledger_id_by_name(v_tenant_id, 'Input IGST');

    -- 3. Calculate Totals (Group by Tax from Items)
    FOR tax_rec IN 
        SELECT 
            SUM(amount) as taxable_val, 
            SUM(cgst_amount) as cgst_val, 
            SUM(sgst_amount) as sgst_val, 
            SUM(igst_amount) as igst_val
        FROM purchase_invoice_items 
        WHERE purchase_invoice_id = p_invoice_id
    LOOP
        v_total_taxable := COALESCE(tax_rec.taxable_val, 0);
        v_total_cgst := COALESCE(tax_rec.cgst_val, 0);
        v_total_sgst := COALESCE(tax_rec.sgst_val, 0);
        v_total_igst := COALESCE(tax_rec.igst_val, 0);
    END LOOP;

    -- Recalculate Grand Total
    v_grand_total := v_total_taxable + v_total_cgst + v_total_sgst + v_total_igst;

    -- 4. Construct Journal Entries
    
    -- CREDIT Vendor (Grand Total) - Liability/Payable
    IF v_grand_total > 0 THEN
        v_entries := v_entries || jsonb_build_object(
            'ledger_id', v_vendor_ledger_id,
            'debit', 0,
            'credit', v_grand_total
        );
    END IF;

    -- DEBIT Purchase (Taxable Total) - Expense
    IF v_total_taxable > 0 THEN
        v_entries := v_entries || jsonb_build_object(
            'ledger_id', v_purchase_ledger_id,
            'debit', v_total_taxable,
            'credit', 0
        );
    END IF;

    -- DEBIT Input Taxes - Asset
    IF v_total_cgst > 0 THEN
        v_entries := v_entries || jsonb_build_object('ledger_id', v_input_cgst_id, 'debit', v_total_cgst, 'credit', 0);
    END IF;
    IF v_total_sgst > 0 THEN
         v_entries := v_entries || jsonb_build_object('ledger_id', v_input_sgst_id, 'debit', v_total_sgst, 'credit', 0);
    END IF;
    IF v_total_igst > 0 THEN
         v_entries := v_entries || jsonb_build_object('ledger_id', v_input_igst_id, 'debit', v_total_igst, 'credit', 0);
    END IF;

    -- 5. Post Journal
    IF jsonb_array_length(v_entries) > 0 THEN
        PERFORM public.record_journal_entry(
            p_invoice_id, 
            'PURCHASE_INVOICE', 
            inv_rec.invoice_date, 
            'Purchase Bill #' || inv_rec.invoice_number, 
            v_entries
        );
        
        -- Update Status
        UPDATE purchase_invoices SET status = 'Posted' WHERE id = p_invoice_id;
    END IF;

END;
$$;
