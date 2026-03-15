-- ============================================================
-- EXPENSE SUBCATEGORIES & COST TRENDS
-- ============================================================
-- Date: 2026-03-09
-- Adds subcategory system and monthly cost trend RPC

-- 1. Create Expense Subcategories Table
CREATE TABLE IF NOT EXISTS public.expense_subcategories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES public.expense_categories(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(category_id, name)
);

ALTER TABLE public.expense_subcategories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner/Manager can view expense subcategories" ON public.expense_subcategories
  FOR SELECT TO authenticated
  USING (business_id = public.get_user_business_id(auth.uid()) AND public.is_admin_or_manager(auth.uid()));

CREATE POLICY "Owner/Manager can manage expense subcategories" ON public.expense_subcategories
  FOR ALL TO authenticated
  USING (business_id = public.get_user_business_id(auth.uid()) AND public.is_admin_or_manager(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_expense_subcategories_category_id ON public.expense_subcategories(category_id);
CREATE INDEX IF NOT EXISTS idx_expense_subcategories_business_id ON public.expense_subcategories(business_id);

-- 2. Add subcategory_id to expenses table
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS subcategory_id UUID REFERENCES public.expense_subcategories(id) ON DELETE SET NULL;

-- 3. Monthly Cost Trends RPC (returns 6 months of sales, inventory cost, expenses)
CREATE OR REPLACE FUNCTION public.get_monthly_cost_trends(_business_id UUID)
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _result JSON;
BEGIN
  WITH months AS (
    SELECT generate_series(
      date_trunc('month', CURRENT_DATE) - INTERVAL '5 months',
      date_trunc('month', CURRENT_DATE),
      '1 month'
    )::DATE AS month_start
  ),
  monthly_sales AS (
    SELECT
      date_trunc('month', COALESCE(completed_at, created_at))::DATE AS m,
      COALESCE(SUM(total_amount), 0) AS total
    FROM public.bills
    WHERE business_id = _business_id AND status = 'completed'
      AND COALESCE(completed_at, created_at) >= date_trunc('month', CURRENT_DATE) - INTERVAL '5 months'
    GROUP BY 1
  ),
  monthly_cogs AS (
    SELECT
      date_trunc('month', COALESCE(b.completed_at, b.created_at))::DATE AS m,
      COALESCE(SUM(bi.cost_price * bi.quantity), 0) AS total
    FROM public.bill_items bi
    JOIN public.bills b ON b.id = bi.bill_id
    WHERE b.business_id = _business_id AND b.status = 'completed'
      AND COALESCE(b.completed_at, b.created_at) >= date_trunc('month', CURRENT_DATE) - INTERVAL '5 months'
    GROUP BY 1
  ),
  monthly_expenses AS (
    SELECT
      date_trunc('month', expense_date)::DATE AS m,
      COALESCE(SUM(amount), 0) AS total
    FROM public.expenses
    WHERE business_id = _business_id
      AND expense_date >= date_trunc('month', CURRENT_DATE) - INTERVAL '5 months'
    GROUP BY 1
  )
  SELECT json_agg(
    json_build_object(
      'month', to_char(mo.month_start, 'Mon ''YY'),
      'sales', COALESCE(s.total, 0),
      'inventory_cost', COALESCE(c.total, 0),
      'expenses', COALESCE(e.total, 0),
      'profit', COALESCE(s.total, 0) - COALESCE(c.total, 0) - COALESCE(e.total, 0)
    ) ORDER BY mo.month_start
  ) INTO _result
  FROM months mo
  LEFT JOIN monthly_sales s ON s.m = mo.month_start
  LEFT JOIN monthly_cogs c ON c.m = mo.month_start
  LEFT JOIN monthly_expenses e ON e.m = mo.month_start;

  RETURN COALESCE(_result, '[]'::JSON);
END;
$$;
