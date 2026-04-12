-- Salesman stores assignment (maps salesman → customer/store)
CREATE TABLE IF NOT EXISTS public.salesman_stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  salesman_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(salesman_id, customer_id)
);

-- Salesman targets (monthly/weekly)
CREATE TABLE IF NOT EXISTS public.salesman_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  salesman_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period TEXT NOT NULL CHECK (period IN ('daily', 'weekly', 'monthly')),
  target_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  target_bills INTEGER NOT NULL DEFAULT 0,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.salesman_stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salesman_targets ENABLE ROW LEVEL SECURITY;

-- Salesman stores: members can view their business's data
CREATE POLICY "Users can view salesman_stores"
  ON public.salesman_stores FOR SELECT
  USING (business_id = public.get_user_business_id(auth.uid()));

CREATE POLICY "Admins can manage salesman_stores"
  ON public.salesman_stores FOR ALL
  USING (business_id = public.get_user_business_id(auth.uid())
    AND public.is_admin_or_manager(auth.uid()));

-- Salesman targets: members can view, admins can manage
CREATE POLICY "Users can view salesman_targets"
  ON public.salesman_targets FOR SELECT
  USING (business_id = public.get_user_business_id(auth.uid()));

CREATE POLICY "Admins can manage salesman_targets"
  ON public.salesman_targets FOR ALL
  USING (business_id = public.get_user_business_id(auth.uid())
    AND public.is_admin_or_manager(auth.uid()));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_salesman_stores_salesman ON public.salesman_stores(salesman_id);
CREATE INDEX IF NOT EXISTS idx_salesman_stores_business ON public.salesman_stores(business_id);
CREATE INDEX IF NOT EXISTS idx_salesman_targets_salesman ON public.salesman_targets(salesman_id);
CREATE INDEX IF NOT EXISTS idx_salesman_targets_period ON public.salesman_targets(salesman_id, start_date, end_date);
