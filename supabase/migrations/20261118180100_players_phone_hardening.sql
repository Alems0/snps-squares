-- Hardening for 20261118180000_players_phone.sql: public (anon) claim RPCs may only FILL a missing players.phone; only admins may replace an existing phone. Also revokes anon EXECUTE on normalize_phone and admin_upsert_players.

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
BEGIN
  IF p_payment_method IS NULL OR p_payment_method NOT IN ('venmo', 'cash') THEN
    RAISE EXCEPTION 'Invalid payment method';
  END IF;

  IF p_positions IS NULL OR array_length(p_positions, 1) IS NULL THEN
    RAISE EXCEPTION 'No positions provided';
  END IF;

  IF array_length(p_positions, 1) > 20 THEN
    RAISE EXCEPTION 'Too many positions (max 20)';
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
    ELSE
      v_failed := array_append(v_failed, v_pos);
    END IF;
  END LOOP;

  -- Trigger upserts players from claim; attach phone only on players (never squares)
  IF v_updated > 0 AND v_phone IS NOT NULL THEN
    UPDATE public.players
    SET phone = v_phone, updated_at = NOW()
    WHERE email = v_email
      AND (phone IS NULL OR public.is_admin());
  END IF;

  RETURN jsonb_build_object(
    'claimed', v_updated,
    'failed_positions', to_jsonb(v_failed)
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
BEGIN
  IF p_payment_method IS NULL OR p_payment_method NOT IN ('venmo', 'cash') THEN
    RAISE EXCEPTION 'Invalid payment method';
  END IF;

  IF p_positions IS NULL OR array_length(p_positions, 1) IS NULL THEN
    RAISE EXCEPTION 'No positions provided';
  END IF;

  IF array_length(p_positions, 1) > 20 THEN
    RAISE EXCEPTION 'Too many positions (max 20)';
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
    ELSE
      v_failed := array_append(v_failed, v_pos);
    END IF;
  END LOOP;

  IF v_updated > 0 THEN
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
    'display_name', v_player.first_name || ' ' || v_player.last_name
  );
END;
$$;

REVOKE ALL ON FUNCTION public.claim_squares_for_player(UUID, UUID, INTEGER[], TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_squares_for_player(UUID, UUID, INTEGER[], TEXT, TEXT) TO anon, authenticated;

REVOKE ALL ON FUNCTION public.normalize_phone(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.normalize_phone(TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.normalize_phone(TEXT) TO authenticated;
REVOKE ALL ON FUNCTION public.admin_upsert_players(JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_upsert_players(JSONB) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_upsert_players(JSONB) TO authenticated;
