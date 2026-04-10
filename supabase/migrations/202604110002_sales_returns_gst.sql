-- Sales Returns & Credit Notes Schema.
-- - sales_returns: Header for returns, links to original bill, reason, total.
-- - return_items: Items returned, quantity, GST rate.
-- - credit_notes: Issued for returns, tracks usage.
-- - process_sales_return: RPC to atomically create return, restore stock, issue credit note.

-- ═══════════════════════════════════════════════════════════════════
-- Phase 3: Sales Returns / Credit Notes
-- ═══════════════════════════════════════════════════════════════════

-- 1. sales_returns
CREATE TABLE IF NOT EXISTS public.sales_returns (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id   UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  original_bill_id UUID REFERENCES public.bills(id) ON DELETE RESTRICT,
  return_number TEXT NOT NULL,
  return_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  reason        TEXT,
  notes         TEXT,
  total_amount  NUMERIC(12,2) NOT NULL DEFAULT 0,
  status        TEXT NOT NULL DEFAULT 'completed',
  created_by    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sales_returns_business_id ON public.sales_returns(business_id);
CREATE INDEX IF NOT EXISTS idx_sales_returns_bill_id ON public.sales_returns(original_bill_id);

ALTER TABLE public.sales_returns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage sales_returns"
  ON public.sales_returns FOR ALL TO authenticated
  USING (business_id = public.get_user_business_id(auth.uid()));

-- 2. return_items
CREATE TABLE IF NOT EXISTS public.return_items (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_return_id UUID NOT NULL REFERENCES public.sales_returns(id) ON DELETE CASCADE,
  product_id     UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_name   TEXT NOT NULL,
  quantity       NUMERIC(10,2) NOT NULL,
  unit_price     NUMERIC(12,2) NOT NULL,
  gst_rate       NUMERIC(5,2) NOT NULL DEFAULT 0,
  total          NUMERIC(12,2) GENERATED ALWAYS AS (quantity * unit_price) STORED
);

ALTER TABLE public.return_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage return_items"
  ON public.return_items FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.sales_returns sr
    WHERE sr.id = return_items.sales_return_id
      AND sr.business_id = public.get_user_business_id(auth.uid())
  ));

-- 3. credit_notes
CREATE TABLE IF NOT EXISTS public.credit_notes (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id       UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  sales_return_id   UUID REFERENCES public.sales_returns(id) ON DELETE CASCADE,
  customer_id       UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  credit_note_number TEXT NOT NULL,
  amount            NUMERIC(12,2) NOT NULL,
  used_amount       NUMERIC(12,2) NOT NULL DEFAULT 0,
  is_fully_used     BOOLEAN NOT NULL DEFAULT false,
  issued_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.credit_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage credit_notes"
  ON public.credit_notes FOR ALL TO authenticated
  USING (business_id = public.get_user_business_id(auth.uid()));

-- ═══════════════════════════════════════════════════════════════════
-- RPC: process_sales_return
-- Atomically creates the return record, restores stock, and issues
-- a credit note. All in one transaction.
-- ═══════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.process_sales_return(
  p_business_id    UUID,
  p_bill_id        UUID,
  p_return_number  TEXT,
  p_reason         TEXT,
  p_items          JSONB,   -- [{product_id, product_name, quantity, unit_price, gst_rate}]
  p_user_id        UUID
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_return_id     UUID;
  v_total         NUMERIC := 0;
  v_item          JSONB;
  v_credit_number TEXT;
  v_customer_id   UUID;
BEGIN
  -- Tally total
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_total := v_total + COALESCE((v_item->>'quantity')::NUMERIC, 0)
                       * COALESCE((v_item->>'unit_price')::NUMERIC, 0);
  END LOOP;

  -- Get customer from original bill
  SELECT customer_id INTO v_customer_id
  FROM public.bills WHERE id = p_bill_id;

  -- Create return header
  INSERT INTO public.sales_returns
    (business_id, original_bill_id, return_number, reason, total_amount, created_by)
  VALUES
    (p_business_id, p_bill_id, p_return_number, p_reason, v_total, p_user_id)
  RETURNING id INTO v_return_id;

  -- Insert items + restore stock
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    INSERT INTO public.return_items
      (sales_return_id, product_id, product_name, quantity, unit_price, gst_rate)
    VALUES (
      v_return_id,
      NULLIF(v_item->>'product_id', '')::UUID,
      v_item->>'product_name',
      (v_item->>'quantity')::NUMERIC,
      (v_item->>'unit_price')::NUMERIC,
      COALESCE((v_item->>'gst_rate')::NUMERIC, 0)
    );

    -- Restore stock if product_id present
    IF (v_item->>'product_id') IS NOT NULL AND (v_item->>'product_id') <> '' THEN
      UPDATE public.products
      SET stock_quantity = stock_quantity + (v_item->>'quantity')::NUMERIC
      WHERE id = NULLIF(v_item->>'product_id', '')::UUID;
    END IF;
  END LOOP;

  -- Issue credit note (only when there is a value)
  IF v_total > 0 THEN
    v_credit_number := 'CN-' || to_char(now(), 'YYYYMM') || '-' || upper(substring(v_return_id::TEXT, 1, 6));
    INSERT INTO public.credit_notes
      (business_id, sales_return_id, customer_id, credit_note_number, amount)
    VALUES
      (p_business_id, v_return_id, v_customer_id, v_credit_number, v_total);
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'return_id', v_return_id,
    'total', v_total,
    'credit_note', v_credit_number
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;
