-- Fix: finalize_draft_bill must set completed_at = now()
-- Without this, finalized salesman orders have NULL completed_at 
-- and don't appear in dashboard "Today's Performance".

CREATE OR REPLACE FUNCTION public.finalize_draft_bill(
  _bill_id UUID,
  _payment_type TEXT,
  _payment_status TEXT,
  _paid_amount NUMERIC,
  _due_amount NUMERIC,
  _due_date DATE DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _item RECORD;
  _reservation_enabled BOOLEAN;
  _business_id UUID;
BEGIN
  SELECT business_id INTO _business_id FROM public.bills WHERE id = _bill_id;
  
  SELECT enable_draft_stock_reservation INTO _reservation_enabled 
  FROM public.business_settings WHERE business_id = _business_id;

  -- Update bill status (now includes completed_at)
  UPDATE public.bills SET
    status = 'completed',
    completed_at = now(),
    payment_status = _payment_status::public.payment_status,
    payment_type = _payment_type::public.payment_mode,
    paid_amount = _paid_amount,
    due_amount = _due_amount,
    due_date = _due_date,
    profit = (SELECT COALESCE(SUM((bi.unit_price - bi.cost_price) * bi.quantity), 0) FROM public.bill_items bi WHERE bi.bill_id = _bill_id),
    updated_at = now()
  WHERE id = _bill_id;

  -- Deduct actual stock and clear reservations
  FOR _item IN SELECT * FROM public.bill_items WHERE bill_id = _bill_id
  LOOP
    UPDATE public.products
    SET stock_quantity = stock_quantity - _item.quantity,
        reserved_quantity = GREATEST(0, COALESCE(reserved_quantity, 0) - _item.quantity),
        updated_at = now()
    WHERE id = _item.product_id;
  END LOOP;

  PERFORM public.log_activity(
    _business_id, 'finalize_bill', 'bills', _bill_id, 
    jsonb_build_object('status', 'draft'), 
    jsonb_build_object('status', 'completed'), 
    'Draft bill finalized'
  );

  RETURN jsonb_build_object('success', true, 'bill_id', _bill_id);
END;
$$;

-- Backfill completed_at for any already-finalized bills that are missing it
UPDATE public.bills
SET completed_at = updated_at
WHERE status = 'completed' AND completed_at IS NULL;
