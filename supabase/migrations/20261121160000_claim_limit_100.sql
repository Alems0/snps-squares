-- Raise per-claim square limit from 20 to 100 (RPCs + claim_orders check).
-- Bodies match 20261119160000 claim RPCs aside from the cap.

ALTER TABLE public.claim_orders DROP CONSTRAINT IF EXISTS claim_orders_square_count_check;
ALTER TABLE public.claim_orders
  ADD CONSTRAINT claim_orders_square_count_check
  CHECK (square_count > 0 AND square_count <= 100);

CREATE OR REPLACE FUNCTION public.claim_squares_as_guest(
  p_game_id UUID,
  p_positions INTEGER[],
  p_first TEXT,
  p_last TEXT,
  p_email TEXT,
  p_payment_method TEXT,
  p_phone TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_game public.games%ROWTYPE;
  v_email TEXT;
  v_first TEXT;
  v_last TEXT;
  v_phone TEXT;
  v_pos INTEGER;
  v_updated INTEGER := 0;
  v_failed INTEGER[] := ARRAY[]::INTEGER[];
  v_fee NUMERIC(10,2) := 0;
  v_subtotal NUMERIC(10,2);
  v_order_id UUID;
  v_claimed_positions INTEGER[] := ARRAY[]::INTEGER[];
BEGIN
  IF p_payment_method IS NULL OR p_payment_method NOT IN ('venmo', 'cash') THEN
    RAISE EXCEPTION 'Invalid payment method';
  END IF;

  IF p_positions IS NULL OR array_length(p_positions, 1) IS NULL THEN
    RAISE EXCEPTION 'No positions provided';
  END IF;

  IF array_length(p_positions, 1) > 100 THEN
    RAISE EXCEPTION 'Too many positions (max 100)';
  END IF;

  v_email := lower(trim(COALESCE(p_email, '')));
  v_first := trim(COALESCE(p_first, ''));
  v_last := trim(COALESCE(p_last, ''));
  v_phone := public.normalize_phone(p_phone);

  IF p_phone IS NOT NULL AND trim(p_phone) <> '' AND v_phone IS NULL THEN
    RAISE EXCEPTION 'Invalid phone number';
  END IF;

  IF v_first = '' OR v_last = '' THEN
    RAISE EXCEPTION 'First and last name are required';
  END IF;

  IF length(v_first) > 100 OR length(v_last) > 100 THEN
    RAISE EXCEPTION 'Name too long (max 100 characters)';
  END IF;

  IF v_email = '' OR v_email !~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
    RAISE EXCEPTION 'Invalid email';
  END IF;

  SELECT * INTO v_game FROM public.games WHERE id = p_game_id AND status = 'active';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No active game';
  END IF;

  IF NOT public.is_admin() AND NOT COALESCE(v_game.public_claiming_open, FALSE) THEN
    RAISE EXCEPTION 'Public claiming is closed';
  END IF;

  IF v_game.numbers_locked THEN
    RAISE EXCEPTION 'Board numbers are locked';
  END IF;

  FOREACH v_pos IN ARRAY p_positions LOOP
    IF v_pos < 0 OR v_pos > 99 THEN
      v_failed := array_append(v_failed, v_pos);
      CONTINUE;
    END IF;

    UPDATE public.squares
    SET
      first_name = v_first,
      last_name = v_last,
      claimed_by_email = v_email,
      claimed_by_name = v_first || ' ' || v_last,
      payment_method = p_payment_method,
      payment_status = 'unpaid',
      claimed_at = NOW()
    WHERE game_id = p_game_id
      AND position = v_pos
      AND claimed_by_email IS NULL
      AND payment_status = 'unpaid';

    IF FOUND THEN
      v_updated := v_updated + 1;
      v_claimed_positions := array_append(v_claimed_positions, v_pos);
    ELSE
      v_failed := array_append(v_failed, v_pos);
    END IF;
  END LOOP;

  IF v_updated > 0 THEN
    v_subtotal := v_updated * v_game.cost_per_square;
    IF p_payment_method = 'venmo' THEN
      v_fee := 2.00;
    END IF;

    INSERT INTO public.claim_orders (
      game_id, claimed_by_email, first_name, last_name, payment_method,
      square_count, square_subtotal, fee, total
    )
    VALUES (
      p_game_id, v_email, v_first, v_last, p_payment_method,
      v_updated, v_subtotal, v_fee, v_subtotal + v_fee
    )
    RETURNING id INTO v_order_id;

    UPDATE public.squares
    SET claim_order_id = v_order_id
    WHERE game_id = p_game_id
      AND position = ANY (v_claimed_positions);

    IF v_phone IS NOT NULL THEN
      UPDATE public.players
      SET phone = v_phone, updated_at = NOW()
      WHERE email = v_email
        AND (phone IS NULL OR public.is_admin());
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'claimed', v_updated,
    'failed_positions', to_jsonb(v_failed),
    'claim_order_id', v_order_id,
    'square_subtotal', COALESCE(v_subtotal, 0),
    'fee', v_fee,
    'total', COALESCE(v_subtotal, 0) + v_fee
  );
END;
$$;

REVOKE ALL ON FUNCTION public.claim_squares_as_guest(UUID, INTEGER[], TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_squares_as_guest(UUID, INTEGER[], TEXT, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.claim_squares_for_player(
  p_player_id UUID,
  p_game_id UUID,
  p_positions INTEGER[],
  p_payment_method TEXT,
  p_phone TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_player public.players%ROWTYPE;
  v_game public.games%ROWTYPE;
  v_phone TEXT;
  v_pos INTEGER;
  v_updated INTEGER := 0;
  v_failed INTEGER[] := ARRAY[]::INTEGER[];
  v_fee NUMERIC(10,2) := 0;
  v_subtotal NUMERIC(10,2);
  v_order_id UUID;
  v_claimed_positions INTEGER[] := ARRAY[]::INTEGER[];
BEGIN
  IF p_payment_method IS NULL OR p_payment_method NOT IN ('venmo', 'cash') THEN
    RAISE EXCEPTION 'Invalid payment method';
  END IF;

  IF p_positions IS NULL OR array_length(p_positions, 1) IS NULL THEN
    RAISE EXCEPTION 'No positions provided';
  END IF;

  IF array_length(p_positions, 1) > 100 THEN
    RAISE EXCEPTION 'Too many positions (max 100)';
  END IF;

  v_phone := public.normalize_phone(p_phone);
  IF p_phone IS NOT NULL AND trim(p_phone) <> '' AND v_phone IS NULL THEN
    RAISE EXCEPTION 'Invalid phone number';
  END IF;

  SELECT * INTO v_player FROM public.players WHERE id = p_player_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Player not found';
  END IF;

  SELECT * INTO v_game FROM public.games WHERE id = p_game_id AND status = 'active';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No active game';
  END IF;

  IF NOT public.is_admin() AND NOT COALESCE(v_game.public_claiming_open, FALSE) THEN
    RAISE EXCEPTION 'Public claiming is closed';
  END IF;

  IF v_game.numbers_locked THEN
    RAISE EXCEPTION 'Board numbers are locked';
  END IF;

  FOREACH v_pos IN ARRAY p_positions LOOP
    IF v_pos < 0 OR v_pos > 99 THEN
      v_failed := array_append(v_failed, v_pos);
      CONTINUE;
    END IF;

    UPDATE public.squares
    SET
      first_name = v_player.first_name,
      last_name = v_player.last_name,
      claimed_by_email = v_player.email,
      claimed_by_name = v_player.first_name || ' ' || v_player.last_name,
      payment_method = p_payment_method,
      payment_status = 'unpaid',
      claimed_at = NOW()
    WHERE game_id = p_game_id
      AND position = v_pos
      AND claimed_by_email IS NULL
      AND payment_status = 'unpaid';

    IF FOUND THEN
      v_updated := v_updated + 1;
      v_claimed_positions := array_append(v_claimed_positions, v_pos);
    ELSE
      v_failed := array_append(v_failed, v_pos);
    END IF;
  END LOOP;

  IF v_updated > 0 THEN
    v_subtotal := v_updated * v_game.cost_per_square;
    IF p_payment_method = 'venmo' THEN
      v_fee := 2.00;
    END IF;

    INSERT INTO public.claim_orders (
      game_id, claimed_by_email, first_name, last_name, payment_method,
      square_count, square_subtotal, fee, total
    )
    VALUES (
      p_game_id, v_player.email, v_player.first_name, v_player.last_name, p_payment_method,
      v_updated, v_subtotal, v_fee, v_subtotal + v_fee
    )
    RETURNING id INTO v_order_id;

    UPDATE public.squares
    SET claim_order_id = v_order_id
    WHERE game_id = p_game_id
      AND position = ANY (v_claimed_positions);

    UPDATE public.players
    SET
      last_claimed_at = NOW(),
      phone = CASE
        WHEN public.is_admin() THEN COALESCE(v_phone, phone)
        ELSE COALESCE(phone, v_phone)
      END,
      updated_at = NOW()
    WHERE id = p_player_id;
  ELSIF v_phone IS NOT NULL AND public.is_admin() THEN
    UPDATE public.players
    SET phone = v_phone, updated_at = NOW()
    WHERE id = p_player_id;
  END IF;

  RETURN jsonb_build_object(
    'claimed', v_updated,
    'failed_positions', to_jsonb(v_failed),
    'display_name', v_player.first_name || ' ' || v_player.last_name,
    'claim_order_id', v_order_id,
    'square_subtotal', COALESCE(v_subtotal, 0),
    'fee', v_fee,
    'total', COALESCE(v_subtotal, 0) + v_fee
  );
END;
$$;

REVOKE ALL ON FUNCTION public.claim_squares_for_player(UUID, UUID, INTEGER[], TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_squares_for_player(UUID, UUID, INTEGER[], TEXT, TEXT) TO anon, authenticated;
