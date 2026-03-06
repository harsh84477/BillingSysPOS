-- Expense Enhancements Migration

-- 1. Create Expense Categories Table
CREATE TABLE IF NOT EXISTS public.expense_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT DEFAULT 'receipt',
  color TEXT DEFAULT '#3b82f6',
  is_default BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(business_id, name)
);

ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner/Manager can view expense categories" ON public.expense_categories
  FOR SELECT TO authenticated
  USING (business_id = public.get_user_business_id(auth.uid()) AND public.is_admin_or_manager(auth.uid()));
CREATE POLICY "Owner/Manager can manage expense categories" ON public.expense_categories
  FOR ALL TO authenticated
  USING (business_id = public.get_user_business_id(auth.uid()) AND public.is_admin_or_manager(auth.uid()));

-- 2. Create Recurring Expenses Table
CREATE TABLE IF NOT EXISTS public.recurring_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.expense_categories(id) ON DELETE SET NULL,
  amount NUMERIC(12,2) NOT NULL,
  description TEXT,
  payment_method TEXT DEFAULT 'cash',
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly', 'yearly')),
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  next_due_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.recurring_expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner/Manager can view recurring expenses" ON public.recurring_expenses
  FOR SELECT TO authenticated
  USING (business_id = public.get_user_business_id(auth.uid()) AND public.is_admin_or_manager(auth.uid()));
CREATE POLICY "Owner/Manager can manage recurring expenses" ON public.recurring_expenses
  FOR ALL TO authenticated
  USING (business_id = public.get_user_business_id(auth.uid()) AND public.is_admin_or_manager(auth.uid()));

-- 3. Modify expenses table
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'cash';
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.expense_categories(id) ON DELETE SET NULL;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS recurring_expense_id UUID REFERENCES public.recurring_expenses(id) ON DELETE SET NULL;

-- Make category column nullable since we are moving to category_id
ALTER TABLE public.expenses ALTER COLUMN category DROP NOT NULL;
ALTER TABLE public.expenses ALTER COLUMN category TYPE TEXT USING category::TEXT;

-- Create function to process due recurring expenses
CREATE OR REPLACE FUNCTION public.process_due_recurring_expenses(_business_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _expense_count INTEGER := 0;
  _rec RECORD;
  _next_date DATE;
BEGIN
  -- We only want to process records that are due
  FOR _rec IN 
    SELECT * FROM public.recurring_expenses 
    WHERE business_id = _business_id 
      AND is_active = true 
      AND next_due_date <= CURRENT_DATE
  LOOP
    -- Insert new expense
    INSERT INTO public.expenses (business_id, category_id, amount, description, payment_method, created_by, expense_date, recurring_expense_id)
    VALUES (_business_id, _rec.category_id, _rec.amount, _rec.description, _rec.payment_method, _rec.created_by, _rec.next_due_date, _rec.id);
    
    -- Calculate next due date
    IF _rec.frequency = 'daily' THEN
      _next_date := _rec.next_due_date + INTERVAL '1 day';
    ELSIF _rec.frequency = 'weekly' THEN
      _next_date := _rec.next_due_date + INTERVAL '1 week';
    ELSIF _rec.frequency = 'monthly' THEN
      _next_date := _rec.next_due_date + INTERVAL '1 month';
    ELSIF _rec.frequency = 'yearly' THEN
      _next_date := _rec.next_due_date + INTERVAL '1 year';
    END IF;

    -- Update recurring expense
    UPDATE public.recurring_expenses 
    SET next_due_date = _next_date,
        updated_at = now()
    WHERE id = _rec.id;
    
    _expense_count := _expense_count + 1;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'processed_count', _expense_count);
END;
$$;
