-- Migration: Update RPC to include items_per_case

DROP FUNCTION IF EXISTS public.create_draft_bill(uuid, text, uuid, text, numeric, text, numeric, numeric, numeric, numeric, jsonb);

CREATE OR REPLACE FUNCTION public.create_draft_bill(
  _business_id UUID,
  _bill_number TEXT,
  _customer_id UUID DEFAULT NULL,
  _salesman_name TEXT DEFAULT NULL,
  _subtotal NUMERIC DEFAULT 0,
  _discount_type TEXT DEFAULT 'flat',
  _discount_value NUMERIC DEFAULT 0,
  _discount_amount NUMERIC DEFAULT 0,
  _tax_amount NUMERIC DEFAULT 0,
  _total_amount NUMERIC DEFAULT 0,
  _items JSONB DEFAULT '[]'::JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _bill_id UUID;
  _item RECORD;
  _reservation_enabled BOOLEAN;
BEGIN
  -- Check if draft stock reservation is enabled
  SELECT enable_draft_stock_reservation INTO _reservation_enabled 
  FROM public.business_settings WHERE business_id = _business_id;
  
  -- Create bill record
  INSERT INTO public.bills (
    business_id, bill_number, customer_id, salesman_name,
    subtotal, discount_type, discount_value, discount_amount, tax_amount, total_amount,
    status, created_at, updated_at
  )
  VALUES (
    _business_id, _bill_number, _customer_id, _salesman_name,
    _subtotal, _discount_type, _discount_value, _discount_amount, _tax_amount, _total_amount,
    'draft', now(), now()
  )
  RETURNING id INTO _bill_id;

  -- Process items and reserve stock
  FOR _item IN SELECT * FROM jsonb_to_recordset(_items) 
    AS x(product_id UUID, product_name TEXT, quantity INTEGER, unit_price NUMERIC, cost_price NUMERIC, mrp_price NUMERIC, items_per_case NUMERIC, total_price NUMERIC)
  LOOP
    -- Insert bill item
    INSERT INTO public.bill_items (
      bill_id, product_id, product_name, quantity, unit_price, cost_price, mrp_price, items_per_case, total_price
    )
    VALUES (
      _bill_id, _item.product_id, _item.product_name, _item.quantity, _item.unit_price, _item.cost_price, COALESCE(_item.mrp_price, _item.unit_price), COALESCE(_item.items_per_case, 0), _item.total_price
    );

    -- Update reserved quantity if enabled
    IF _reservation_enabled THEN
      UPDATE public.products
      SET reserved_quantity = COALESCE(reserved_quantity, 0) + _item.quantity,
          updated_at = now()
      WHERE id = _item.product_id AND business_id = _business_id;
    END IF;
  END LOOP;

  -- Log Activity
  PERFORM public.log_activity(
    _business_id, 
    'create_bill', 
    'bills', 
    _bill_id, 
    NULL, 
    jsonb_build_object('bill_number', _bill_number, 'status', 'draft'), 
    'Draft bill created via billing'
  );

  RETURN jsonb_build_object(
    'success', true,
    'bill_id', _bill_id,
    'bill_number', _bill_number,
    'stock_reserved', _reservation_enabled
  );
END;
$$;


DROP FUNCTION IF EXISTS public.update_draft_bill(uuid, uuid, numeric, text, numeric, numeric, numeric, numeric, jsonb);

CREATE OR REPLACE FUNCTION public.update_draft_bill(
  _bill_id UUID,
  _customer_id UUID DEFAULT NULL,
  _subtotal NUMERIC DEFAULT 0,
  _discount_type TEXT DEFAULT 'flat',
  _discount_value NUMERIC DEFAULT 0,
  _discount_amount NUMERIC DEFAULT 0,
  _tax_amount NUMERIC DEFAULT 0,
  _total_amount NUMERIC DEFAULT 0,
  _items JSONB DEFAULT '[]'::JSONB
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
  -- Get business_id
  SELECT business_id INTO _business_id FROM public.bills WHERE id = _bill_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Bill not found');
  END IF;

  -- Check reservation setting
  SELECT enable_draft_stock_reservation INTO _reservation_enabled 
  FROM public.business_settings WHERE business_id = _business_id;

  -- Restore old reservations first
  IF _reservation_enabled THEN
    FOR _item IN SELECT * FROM public.bill_items WHERE bill_id = _bill_id
    LOOP
      UPDATE public.products
      SET reserved_quantity = GREATEST(0, COALESCE(reserved_quantity, 0) - _item.quantity)
      WHERE id = _item.product_id;
    END LOOP;
  END IF;

  -- Delete old items
  DELETE FROM public.bill_items WHERE bill_id = _bill_id;

  UPDATE public.bills SET
    customer_id = _customer_id,
    subtotal = _subtotal,
    discount_type = _discount_type,
    discount_value = _discount_value,
    discount_amount = _discount_amount,
    tax_amount = _tax_amount,
    total_amount = _total_amount,
    updated_at = now()
  WHERE id = _bill_id;

  -- Insert new items and reserve stock
  FOR _item IN SELECT * FROM jsonb_to_recordset(_items) 
    AS x(product_id UUID, product_name TEXT, quantity INTEGER, unit_price NUMERIC, cost_price NUMERIC, mrp_price NUMERIC, items_per_case NUMERIC, total_price NUMERIC)
  LOOP
    INSERT INTO public.bill_items (
      bill_id, product_id, product_name, quantity, unit_price, cost_price, mrp_price, items_per_case, total_price
    )
    VALUES (
      _bill_id, _item.product_id, _item.product_name, _item.quantity, _item.unit_price, _item.cost_price, COALESCE(_item.mrp_price, _item.unit_price), COALESCE(_item.items_per_case, 0), _item.total_price
    );

    IF _reservation_enabled THEN
      UPDATE public.products
      SET reserved_quantity = COALESCE(reserved_quantity, 0) + _item.quantity,
          updated_at = now()
      WHERE id = _item.product_id;
    END IF;
  END LOOP;

  RETURN jsonb_build_object('success', true);
END;
$$;
