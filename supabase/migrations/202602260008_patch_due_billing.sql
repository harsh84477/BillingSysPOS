-- =============================================================================
-- PATCH: Smart POS Upgrade — Due Billing & Schema Additions
-- Run in: Supabase Dashboard > SQL Editor
-- Safe to re-run (uses IF NOT EXISTS / IF EXISTS guards)
-- =============================================================================

-- ── Bills table: payment & profit columns ─────────────────────────────────────
ALTER TABLE public.bills
  ADD COLUMN IF NOT EXISTS payment_type    TEXT    CHECK (payment_type IN ('cash','due','online')) DEFAULT 'cash',
  ADD COLUMN IF NOT EXISTS payment_status  TEXT    CHECK (payment_status IN ('paid','unpaid','partial')) DEFAULT 'paid',
  ADD COLUMN IF NOT EXISTS paid_amount     NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS due_amount      NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS due_date        DATE,
  ADD COLUMN IF NOT EXISTS profit          NUMERIC(12,2) NOT NULL DEFAULT 0;

-- Back-fill existing rows: all completed bills are treated as fully paid
UPDATE public.bills
SET
  payment_type   = 'cash',
  payment_status = 'paid',
  paid_amount    = total_amount,
  due_amount     = 0
WHERE payment_status IS NULL OR payment_status = '';

-- ── Customers table: credit & due tracking ────────────────────────────────────
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS credit_limit  NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS current_due   NUMERIC(12,2) NOT NULL DEFAULT 0;

-- ── RPC: Get due bills for a business ────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_due_bills(_business_id UUID)
RETURNS TABLE (
  id             UUID,
  bill_number    TEXT,
  customer_name  TEXT,
  customer_id    UUID,
  created_at     TIMESTAMPTZ,
  total_amount   NUMERIC,
  paid_amount    NUMERIC,
  due_amount     NUMERIC,
  due_date       DATE,
  payment_status TEXT,
  payment_type   TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    b.id,
    b.bill_number,
    COALESCE(c.name, 'Walk-in Customer') AS customer_name,
    b.customer_id,
    b.created_at,
    b.total_amount,
    b.paid_amount,
    b.due_amount,
    b.due_date,
    b.payment_status,
    b.payment_type
  FROM bills b
  LEFT JOIN customers c ON c.id = b.customer_id
  WHERE b.business_id = _business_id
    AND b.payment_status IN ('unpaid', 'partial')
    AND b.status = 'completed'
  ORDER BY
    CASE WHEN b.due_date < CURRENT_DATE THEN 0 ELSE 1 END,
    b.due_date ASC NULLS LAST,
    b.created_at DESC;
$$;

-- ── RPC: Get dashboard stats including due/profit ────────────────────────────
CREATE OR REPLACE FUNCTION get_business_dashboard_stats(_business_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today_sales       NUMERIC;
  v_monthly_sales     NUMERIC;
  v_today_profit      NUMERIC;
  v_total_due         NUMERIC;
  v_unpaid_count      INT;
  v_overdue_count     INT;
  v_low_stock_count   INT;
  v_today_bill_count  INT;
BEGIN
  -- Today Sales & count
  SELECT COALESCE(SUM(total_amount),0), COUNT(*)
  INTO v_today_sales, v_today_bill_count
  FROM bills
  WHERE business_id = _business_id
    AND status = 'completed'
    AND DATE(created_at) = CURRENT_DATE;

  -- Monthly Sales
  SELECT COALESCE(SUM(total_amount),0)
  INTO v_monthly_sales
  FROM bills
  WHERE business_id = _business_id
    AND status = 'completed'
    AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE);

  -- Today Profit
  SELECT COALESCE(SUM(profit),0)
  INTO v_today_profit
  FROM bills
  WHERE business_id = _business_id
    AND status = 'completed'
    AND DATE(created_at) = CURRENT_DATE;

  -- Total Due Amount
  SELECT COALESCE(SUM(due_amount),0)
  INTO v_total_due
  FROM bills
  WHERE business_id = _business_id
    AND payment_status IN ('unpaid','partial');

  -- Unpaid Bills Count
  SELECT COUNT(*)
  INTO v_unpaid_count
  FROM bills
  WHERE business_id = _business_id
    AND payment_status IN ('unpaid','partial')
    AND status = 'completed';

  -- Overdue Bills Count
  SELECT COUNT(*)
  INTO v_overdue_count
  FROM bills
  WHERE business_id = _business_id
    AND payment_status IN ('unpaid','partial')
    AND due_date IS NOT NULL
    AND due_date < CURRENT_DATE
    AND status = 'completed';

  -- Low Stock Products
  SELECT COUNT(*)
  INTO v_low_stock_count
  FROM products
  WHERE business_id = _business_id
    AND track_inventory = true
    AND stock_quantity <= low_stock_threshold;

  RETURN jsonb_build_object(
    'today_sales',      v_today_sales,
    'today_bill_count', v_today_bill_count,
    'monthly_sales',    v_monthly_sales,
    'today_profit',     v_today_profit,
    'total_due',        v_total_due,
    'unpaid_count',     v_unpaid_count,
    'overdue_count',    v_overdue_count,
    'low_stock_count',  v_low_stock_count
  );
END;
$$;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
