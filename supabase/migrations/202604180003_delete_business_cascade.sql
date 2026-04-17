-- Delete a business and all its associated data
CREATE OR REPLACE FUNCTION public.delete_business_cascade(p_business_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Delete bill items first (depends on bills)
    DELETE FROM public.bill_items WHERE bill_id IN (SELECT id FROM public.bills WHERE business_id = p_business_id);
    -- Delete bill payments
    DELETE FROM public.bill_payments WHERE business_id = p_business_id;
    -- Delete return items (depends on sales_returns)
    DELETE FROM public.return_items WHERE return_id IN (SELECT id FROM public.sales_returns WHERE business_id = p_business_id);
    -- Delete credit notes
    DELETE FROM public.credit_notes WHERE business_id = p_business_id;
    -- Delete sales returns
    DELETE FROM public.sales_returns WHERE business_id = p_business_id;
    -- Delete purchase order items
    DELETE FROM public.purchase_order_items WHERE purchase_order_id IN (SELECT id FROM public.purchase_orders WHERE business_id = p_business_id);
    -- Delete purchase orders
    DELETE FROM public.purchase_orders WHERE business_id = p_business_id;
    -- Delete suppliers
    DELETE FROM public.suppliers WHERE business_id = p_business_id;
    -- Delete bills
    DELETE FROM public.bills WHERE business_id = p_business_id;
    -- Delete inventory logs
    DELETE FROM public.inventory_logs WHERE business_id = p_business_id;
    -- Delete products
    DELETE FROM public.products WHERE business_id = p_business_id;
    -- Delete categories
    DELETE FROM public.categories WHERE business_id = p_business_id;
    -- Delete customer-related
    DELETE FROM public.customer_credit_ledger WHERE business_id = p_business_id;
    DELETE FROM public.customer_credit_limits WHERE business_id = p_business_id;
    -- Delete loyalty
    DELETE FROM public.loyalty_points WHERE business_id = p_business_id;
    -- Delete salesman tables
    DELETE FROM public.salesman_stores WHERE business_id = p_business_id;
    DELETE FROM public.salesman_targets WHERE business_id = p_business_id;
    -- Delete customers
    DELETE FROM public.customers WHERE business_id = p_business_id;
    -- Delete expenses
    DELETE FROM public.expense_subcategories WHERE category_id IN (SELECT id FROM public.expense_categories WHERE business_id = p_business_id);
    DELETE FROM public.expense_categories WHERE business_id = p_business_id;
    DELETE FROM public.expenses WHERE business_id = p_business_id;
    -- Delete activity logs
    DELETE FROM public.activity_logs WHERE business_id = p_business_id;
    -- Delete payment modes config
    DELETE FROM public.payment_modes_config WHERE business_id = p_business_id;
    -- Delete offline sync
    DELETE FROM public.offline_sync_queue WHERE business_id = p_business_id;
    DELETE FROM public.offline_data_cache WHERE business_id = p_business_id;
    DELETE FROM public.sync_conflicts WHERE business_id = p_business_id;
    -- Delete subscriptions
    DELETE FROM public.subscriptions WHERE business_id = p_business_id;
    -- Delete business settings
    DELETE FROM public.business_settings WHERE business_id = p_business_id;
    -- Delete user roles
    DELETE FROM public.user_roles WHERE business_id = p_business_id;
    -- Delete the business itself
    DELETE FROM public.businesses WHERE id = p_business_id;
END;
$$;
