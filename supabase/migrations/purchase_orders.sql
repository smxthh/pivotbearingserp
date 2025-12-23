-- Purchase Orders Table
CREATE TABLE IF NOT EXISTS purchase_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    distributor_id UUID NOT NULL REFERENCES distributor_profiles(id) ON DELETE CASCADE,
    
    -- PO Number
    po_prefix VARCHAR(20) DEFAULT 'PO/',
    po_number INTEGER NOT NULL,
    po_full_number VARCHAR(50) NOT NULL, -- Combined: PO/25-26/1
    
    -- Core Details
    po_date DATE NOT NULL DEFAULT CURRENT_DATE,
    party_id UUID NOT NULL REFERENCES parties(id) ON DELETE RESTRICT,
    party_gstin VARCHAR(20),
    
    -- Transport & Delivery
    transport_name VARCHAR(200),
    contact_person VARCHAR(100),
    contact_number VARCHAR(20),
    delivery_address TEXT,
    
    -- Amounts
    taxable_amount NUMERIC(12,2) DEFAULT 0,
    cgst_amount NUMERIC(12,2) DEFAULT 0,
    sgst_amount NUMERIC(12,2) DEFAULT 0,
    igst_amount NUMERIC(12,2) DEFAULT 0,
    round_off_amount NUMERIC(12,2) DEFAULT 0,
    net_amount NUMERIC(12,2) DEFAULT 0,
    
    -- GST Type: 1=Local (CGST+SGST), 2=Central (IGST)
    gst_type INTEGER DEFAULT 1,
    
    -- Status: pending, completed, cancelled
    status VARCHAR(20) DEFAULT 'pending',
    
    -- Remark
    remark TEXT,
    
    -- Terms & Conditions (JSON array)
    terms_conditions JSONB DEFAULT '[]'::jsonb,
    
    -- Audit
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(distributor_id, po_full_number)
);

-- Purchase Order Items Table
CREATE TABLE IF NOT EXISTS purchase_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    
    -- Item Reference
    item_id UUID REFERENCES items(id) ON DELETE SET NULL,
    item_name VARCHAR(200) NOT NULL,
    hsn_code VARCHAR(20),
    
    -- Quantity & Unit
    quantity NUMERIC(12,3) NOT NULL DEFAULT 1,
    unit VARCHAR(20) NOT NULL DEFAULT 'PCS',
    
    -- Pricing
    price NUMERIC(12,2) NOT NULL DEFAULT 0,
    discount_percent NUMERIC(5,2) DEFAULT 0,
    discount_amount NUMERIC(12,2) DEFAULT 0,
    
    -- Tax
    gst_percent NUMERIC(5,2) DEFAULT 0,
    cgst_percent NUMERIC(5,2) DEFAULT 0,
    sgst_percent NUMERIC(5,2) DEFAULT 0,
    igst_percent NUMERIC(5,2) DEFAULT 0,
    cgst_amount NUMERIC(12,2) DEFAULT 0,
    sgst_amount NUMERIC(12,2) DEFAULT 0,
    igst_amount NUMERIC(12,2) DEFAULT 0,
    
    -- Amounts
    taxable_amount NUMERIC(12,2) DEFAULT 0,
    net_amount NUMERIC(12,2) DEFAULT 0,
    
    -- Remark
    remark TEXT,
    
    -- Sort Order
    sort_order INTEGER DEFAULT 0,
    
    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_purchase_orders_distributor ON purchase_orders(distributor_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_party ON purchase_orders(party_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_date ON purchase_orders(po_date);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_order ON purchase_order_items(purchase_order_id);

-- Enable RLS
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for purchase_orders
CREATE POLICY "Users can view their distributor purchase orders"
    ON purchase_orders FOR SELECT
    USING (
        distributor_id IN (
            SELECT id FROM distributor_profiles WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert their distributor purchase orders"
    ON purchase_orders FOR INSERT
    WITH CHECK (
        distributor_id IN (
            SELECT id FROM distributor_profiles WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their distributor purchase orders"
    ON purchase_orders FOR UPDATE
    USING (
        distributor_id IN (
            SELECT id FROM distributor_profiles WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete their distributor purchase orders"
    ON purchase_orders FOR DELETE
    USING (
        distributor_id IN (
            SELECT id FROM distributor_profiles WHERE user_id = auth.uid()
        )
    );

-- RLS Policies for purchase_order_items
CREATE POLICY "Users can view their purchase order items"
    ON purchase_order_items FOR SELECT
    USING (
        purchase_order_id IN (
            SELECT po.id FROM purchase_orders po
            JOIN distributor_profiles d ON po.distributor_id = d.id
            WHERE d.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert their purchase order items"
    ON purchase_order_items FOR INSERT
    WITH CHECK (
        purchase_order_id IN (
            SELECT po.id FROM purchase_orders po
            JOIN distributor_profiles d ON po.distributor_id = d.id
            WHERE d.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their purchase order items"
    ON purchase_order_items FOR UPDATE
    USING (
        purchase_order_id IN (
            SELECT po.id FROM purchase_orders po
            JOIN distributor_profiles d ON po.distributor_id = d.id
            WHERE d.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete their purchase order items"
    ON purchase_order_items FOR DELETE
    USING (
        purchase_order_id IN (
            SELECT po.id FROM purchase_orders po
            JOIN distributor_profiles d ON po.distributor_id = d.id
            WHERE d.user_id = auth.uid()
        )
    );

-- Function to get next PO number
CREATE OR REPLACE FUNCTION get_next_po_number(p_distributor_id UUID, p_prefix VARCHAR)
RETURNS INTEGER AS $$
DECLARE
    next_num INTEGER;
BEGIN
    SELECT COALESCE(MAX(po_number), 0) + 1 INTO next_num
    FROM purchase_orders
    WHERE distributor_id = p_distributor_id
    AND po_prefix = p_prefix;
    
    RETURN next_num;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_purchase_order_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER purchase_orders_updated_at
    BEFORE UPDATE ON purchase_orders
    FOR EACH ROW
    EXECUTE FUNCTION update_purchase_order_timestamp();
