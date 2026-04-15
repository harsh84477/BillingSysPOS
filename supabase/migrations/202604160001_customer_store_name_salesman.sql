-- Add store_name and assigned_salesman_id to customers table

-- Store name: the name of the customer's shop/store (different from customer name)
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS store_name TEXT;

-- Assigned salesman: auto-set when salesman creates the customer, owner can reassign later
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS assigned_salesman_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Index for fast lookup by assigned salesman
CREATE INDEX IF NOT EXISTS idx_customers_assigned_salesman ON public.customers(assigned_salesman_id);

-- Index for store_name search
CREATE INDEX IF NOT EXISTS idx_customers_store_name ON public.customers(store_name);
