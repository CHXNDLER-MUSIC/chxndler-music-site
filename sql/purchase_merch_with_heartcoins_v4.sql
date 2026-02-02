-- v4 RPC: Minimal, idempotent merch purchase with HeartCoins
-- Signature matches app/api/merch/purchase/route.ts
-- Ensures orders.payment_type is EXACTLY 'heartcoins'
-- Includes selected_variant/selected_color in the INSERT for reliable storage

-- Drop old 3-param signature so we can replace with 5-param version
DROP FUNCTION IF EXISTS purchase_merch_with_heartcoins_v4(UUID, INTEGER, UUID);

CREATE OR REPLACE FUNCTION purchase_merch_with_heartcoins_v4(
  p_merch_item_id UUID,
  p_quantity INTEGER,
  p_client_request_id UUID,
  p_selected_variant JSONB DEFAULT '{}'::jsonb,
  p_selected_color TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID;
  current_balance INTEGER;
  merch_item RECORD;
  total_cost INTEGER;
  new_balance INTEGER;
  order_id UUID;
  existing_order RECORD;
BEGIN
  -- Get current user from auth context
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'UNAUTHORIZED: User must be logged in';
  END IF;

  -- Basic validation
  IF p_quantity IS NULL OR p_quantity <= 0 THEN
    RAISE EXCEPTION 'VALIDATION_ERROR: Quantity must be greater than 0';
  END IF;
  IF p_client_request_id IS NULL THEN
    RAISE EXCEPTION 'VALIDATION_ERROR: client_request_id is required';
  END IF;

  -- Idempotency: return existing order if already processed for this user + key
  SELECT id
  INTO existing_order
  FROM public.orders
  WHERE user_id = current_user_id
    AND client_request_id = p_client_request_id
  LIMIT 1;

  IF FOUND THEN
    RETURN json_build_object(
      'success', true,
      'idempotent', true,
      'message', 'Already processed',
      'order_id', existing_order.id
    );
  END IF;

  -- Load merch item
  SELECT * INTO merch_item
  FROM public.merch_items
  WHERE id = p_merch_item_id AND is_active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ITEM_NOT_FOUND: Merch item not found or not available';
  END IF;

  total_cost := merch_item.price_heartcoins * p_quantity;

  -- Lock user profile/balance
  SELECT heartcoin_balance INTO current_balance
  FROM public.profiles
  WHERE id = current_user_id
  FOR UPDATE;
  IF current_balance IS NULL THEN
    RAISE EXCEPTION 'USER_NOT_FOUND: User profile not found';
  END IF;
  IF current_balance < total_cost THEN
    RAISE EXCEPTION 'INSUFFICIENT_HEARTCOINS: Have %, need %', current_balance, total_cost;
  END IF;

  new_balance := current_balance - total_cost;

  -- 1) Create order with explicit payment_type 'heartcoins' and variant selection
  INSERT INTO public.orders (
    id,
    user_id,
    order_type,
    payment_type,
    item_id,
    item_name,
    merch_item_id,
    quantity,
    total_heartcoins,
    status,
    client_request_id,
    selected_variant,
    selected_color,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    current_user_id,
    'merch',
    'heartcoins',
    merch_item.name,
    merch_item.name,
    p_merch_item_id,
    p_quantity,
    total_cost,
    'paid',
    p_client_request_id,
    p_selected_variant,
    p_selected_color,
    NOW(),
    NOW()
  ) RETURNING id INTO order_id;

  -- 2) Log HeartCoin transaction
  INSERT INTO public.heartcoin_transactions (
    user_id,
    amount,
    transaction_type,
    description,
    metadata,
    created_at
  ) VALUES (
    current_user_id,
    -total_cost,
    'purchase',
    'Purchased merch: ' || merch_item.name,
    jsonb_build_object(
      'order_id', order_id,
      'merch_item_id', p_merch_item_id,
      'item_name', merch_item.name,
      'quantity', p_quantity,
      'unit_price', merch_item.price_heartcoins,
      'total_cost', total_cost
    ),
    NOW()
  );

  -- 3) Deduct balance (with optional guard env, if present in triggers)
  PERFORM set_config('app.allow_balance_update', '1', true);
  UPDATE public.profiles
  SET heartcoin_balance = new_balance,
      updated_at = NOW()
  WHERE id = current_user_id;
  PERFORM set_config('app.allow_balance_update', '0', true);

  RETURN json_build_object(
    'success', true,
    'order_id', order_id,
    'amount_spent', total_cost,
    'heartcoins_before', current_balance,
    'heartcoins_after', new_balance
  );

EXCEPTION
  WHEN OTHERS THEN
    -- Reset bypass on error and re-raise
    PERFORM set_config('app.allow_balance_update', '0', true);
    RAISE;
END;
$$;

GRANT EXECUTE ON FUNCTION purchase_merch_with_heartcoins_v4(UUID, INTEGER, UUID, JSONB, TEXT) TO authenticated;

