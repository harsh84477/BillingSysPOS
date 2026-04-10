-- Supplier & Purchase Module Schema.
-- - suppliers: Stores vendor details, GSTIN, contact info, RLS policies.
-- - purchase_orders: Tracks purchase orders, status, supplier linkage.
-- - purchase_order_items: Items per order, cost, quantity, RLS.
-- - stock_movements: Tracks stock in/out, references purchase/bill.

-- ============================================================
-- Phase 2: Supplier / Vendor Management + Purchase / Stock-In
-- ============================================================

-- ── Suppliers ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS suppliers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  contact_person  TEXT,
  phone           TEXT,
  email           TEXT,
  address         TEXT,
  gstin           TEXT,
  notes           TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS suppliers_business_id_idx ON suppliers(business_id);

ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "suppliers_business_isolation"
  ON suppliers FOR ALL
  USING (
    business_id IN (
      SELECT business_id FROM user_roles WHERE user_id = auth.uid()
      UNION
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

-- ── Purchase Orders ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS purchase_orders (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  supplier_id     UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  order_number    TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft', 'ordered', 'received', 'cancelled')),
  notes           TEXT,
  total_amount    NUMERIC(12,2) NOT NULL DEFAULT 0,
  ordered_at      TIMESTAMPTZ,
  received_at     TIMESTAMPTZ,
  created_by      UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS purchase_orders_business_id_idx ON purchase_orders(business_id);
CREATE INDEX IF NOT EXISTS purchase_orders_supplier_id_idx ON purchase_orders(supplier_id);

ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "purchase_orders_business_isolation"
  ON purchase_orders FOR ALL
  USING (
    business_id IN (
      SELECT business_id FROM user_roles WHERE user_id = auth.uid()
      UNION
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

-- ── Purchase Order Items ──────────────────────────────────
CREATE TABLE IF NOT EXISTS purchase_order_items (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id   UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  product_id          UUID REFERENCES products(id) ON DELETE SET NULL,
  product_name        TEXT NOT NULL,
  quantity            NUMERIC(12,3) NOT NULL DEFAULT 1,
  received_quantity   NUMERIC(12,3) NOT NULL DEFAULT 0,
  cost_price          NUMERIC(12,2) NOT NULL DEFAULT 0,
  total               NUMERIC(12,2) GENERATED ALWAYS AS (quantity * cost_price) STORED,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS purchase_order_items_po_idx ON purchase_order_items(purchase_order_id);

ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "purchase_order_items_via_po"
  ON purchase_order_items FOR ALL
  USING (
    purchase_order_id IN (
      SELECT id FROM purchase_orders
      WHERE business_id IN (
        SELECT business_id FROM user_roles WHERE user_id = auth.uid()
        UNION
        SELECT id FROM businesses WHERE owner_id = auth.uid()
      )
    )
  );

-- ── Stock Movements ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS stock_movements (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  product_id      UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  movement_type   TEXT NOT NULL
                    CHECK (movement_type IN ('stock_in','stock_out','adjustment','return','opening')),
  quantity        NUMERIC(12,3) NOT NULL,
  reference_id    UUID,
  reference_type  TEXT,  -- 'purchase_order' | 'bill' | 'manual'
  notes           TEXT,
  created_by      UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS stock_movements_business_idx ON stock_movements(business_id);
CREATE INDEX IF NOT EXISTS stock_movements_product_idx ON stock_movements(product_id);

ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "stock_movements_business_isolation"
  ON stock_movements FOR ALL
  USING (
    business_id IN (
      SELECT business_id FROM user_roles WHERE user_id = auth.uid()
      UNION
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
  );

-- ── RPC: receive_purchase_order ───────────────────────────
-- Marks a purchase order as received, increments stock_quantity for each item,
-- and logs a stock_movement row. Runs as a single atomic transaction.
CREATE OR REPLACE FUNCTION receive_purchase_order(
  p_purchase_order_id UUID,
  p_user_id           UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order     purchase_orders%ROWTYPE;
  v_item      purchase_order_items%ROWTYPE;
  v_total     NUMERIC := 0;
BEGIN
  -- Lock the order row
  SELECT * INTO v_order
  FROM purchase_orders
  WHERE id = p_purchase_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Purchase order not found');
  END IF;

  IF v_order.status = 'received' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order already received');
  END IF;

  IF v_order.status = 'cancelled' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order is cancelled');
  END IF;

  -- Process each item
  FOR v_item IN
    SELECT * FROM purchase_order_items WHERE purchase_order_id = p_purchase_order_id
  LOOP
    IF v_item.product_id IS NOT NULL THEN
      -- Increment stock
      UPDATE products
      SET stock_quantity = stock_quantity + v_item.quantity,
          cost_price     = v_item.cost_price,  -- update cost price to latest
          updated_at     = now()
      WHERE id = v_item.product_id;

      -- Log movement
      INSERT INTO stock_movements
        (business_id, product_id, movement_type, quantity, reference_id, reference_type, notes, created_by)
      VALUES
        (v_order.business_id, v_item.product_id, 'stock_in', v_item.quantity,
         p_purchase_order_id, 'purchase_order',
         'Received via PO#' || v_order.order_number, p_user_id);

      -- Mark received qty
      UPDATE purchase_order_items
      SET received_quantity = quantity
      WHERE id = v_item.id;
    END IF;

    v_total := v_total + v_item.total;
  END LOOP;

  -- Mark order received
  UPDATE purchase_orders
  SET status      = 'received',
      received_at = now(),
      total_amount = v_total,
      updated_at  = now()
  WHERE id = p_purchase_order_id;

  RETURN jsonb_build_object('success', true);
END;
$$;
