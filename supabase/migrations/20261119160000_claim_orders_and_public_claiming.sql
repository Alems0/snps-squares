-- Claim orders (Venmo fee), public claiming gate, backup/restore RPCs
-- Project: snps-squares (axkxwguwquuxbjyntjeq)
-- Apply AFTER merge of this app PR (and after phone migrations).
-- Deploy order: 1) merge app  2) apply this migration immediately

-- ---------------------------------------------------------------------------
-- 1. Games: public_claiming_open (default OFF — admin-only claiming)
-- ---------------------------------------------------------------------------
ALTER TABLE public.games
  ADD COLUMN IF NOT EXISTS public_claiming_open BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.games.public_claiming_open IS
  'When false, only admins may claim via RPCs; public board is view-only.';

-- Anon may read this flag (needed for UI notice). Re-grant safe columns including it.
REVOKE SELECT ON public.games FROM anon;
GRANT SELECT (
  id,
  season,
  afc_team,
  nfc_team,
  cost_per_square,
  charity_percentage,
  q1_payout,
  q2_payout,
  q3_payout,
  final_payout,
  venmo_handle,
  numbers_locked,
  afc_numbers,
  nfc_numbers,
  status,
  created_at,
  updated_at,
  public_claiming_open
) ON public.games TO anon;
GRANT SELECT ON public.games TO authenticated;

-- ---------------------------------------------------------------------------
-- 2. Claim orders — one row per claim submit; Venmo fee is per order ($2)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.claim_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  claimed_by_email TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('venmo', 'cash')),
  square_count INTEGER NOT NULL CHECK (square_count > 0 AND square_count <= 20),
  square_subtotal NUMERIC(10,2) NOT NULL CHECK (square_subtotal >= 0),
  fee NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (fee >= 0),
  total NUMERIC(10,2) NOT NULL CHECK (total >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT claim_orders_email_lower CHECK (claimed_by_email = lower(claimed_by_email))
);

CREATE INDEX IF NOT EXISTS claim_orders_game_idx ON public.claim_orders (game_id);
CREATE INDEX IF NOT EXISTS claim_orders_email_idx ON public.claim_orders (lower(claimed_by_email));

ALTER TABLE public.claim_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS claim_orders_admin_all ON public.claim_orders;
CREATE POLICY claim_orders_admin_all ON public.claim_orders
  FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

REVOKE ALL ON public.claim_orders FROM anon;
REVOKE ALL ON public.claim_orders FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.claim_orders TO authenticated;

ALTER TABLE public.squares
  ADD COLUMN IF NOT EXISTS claim_order_id UUID REFERENCES public.claim_orders(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS squares_claim_order_idx ON public.squares (claim_order_id);

-- Anon still cannot see claim_order_id (not in public column grant). Authenticated keeps full SELECT.
-- Reaffirm squares anon column grants (unchanged set — no claim_order_id, no email)
REVOKE SELECT ON public.squares FROM anon;
GRANT SELECT (
  id,
  game_id,
  position,
  first_name,
  last_name,
  claimed_by_name,
  claimed_at,
  payment_status,
  payment_method,
  paid_at
) ON public.squares TO anon;
GRANT SELECT ON public.squares TO authenticated;

-- ---------------------------------------------------------------------------
-- 3. Helper: assert claiming allowed (admin OR public_claiming_open)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.assert_claiming_allowed()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF public.is_admin() THEN
    RETURN;
  END IF;
  -- Non-admin: requiring open claiming is checked per-game in claim RPCs
  RETURN;
END;
$$;

REVOKE ALL ON FUNCTION public.assert_claiming_allowed() FROM PUBLIC;

-- ---------------------------------------------------------------------------
-- 4. Rewrite claim_squares_as_guest — public_claiming gate + claim_order + fee
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.claim_squares_as_guest(UUID, INTEGER[], TEXT, TEXT, TEXT, TEXT, TEXT);

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

-- ---------------------------------------------------------------------------
-- 5. Rewrite claim_squares_for_player — same gates + claim_order + fee
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.claim_squares_for_player(UUID, UUID, INTEGER[], TEXT, TEXT);

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

-- ---------------------------------------------------------------------------
-- 6. Admin restore squares from backup (single transaction)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_restore_game_squares(
  p_game_id UUID,
  p_rows JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_row JSONB;
  v_pos INTEGER;
  v_email TEXT;
  v_first TEXT;
  v_last TEXT;
  v_phone TEXT;
  v_method TEXT;
  v_status TEXT;
  v_claimed_at TIMESTAMPTZ;
  v_restored INTEGER := 0;
  v_skipped INTEGER := 0;
  v_errors JSONB := '[]'::JSONB;
  v_idx INTEGER := 0;
  v_game public.games%ROWTYPE;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin only';
  END IF;

  SELECT * INTO v_game FROM public.games WHERE id = p_game_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Game not found';
  END IF;

  IF p_rows IS NULL OR jsonb_typeof(p_rows) <> 'array' THEN
    RAISE EXCEPTION 'Expected JSON array of square rows';
  END IF;

  FOR v_row IN SELECT * FROM jsonb_array_elements(p_rows)
  LOOP
    v_idx := v_idx + 1;

    BEGIN
      v_pos := (v_row->>'position')::INTEGER;
    EXCEPTION WHEN OTHERS THEN
      v_skipped := v_skipped + 1;
      v_errors := v_errors || jsonb_build_array(jsonb_build_object('row', v_idx, 'error', 'Invalid position'));
      CONTINUE;
    END;

    IF v_pos < 0 OR v_pos > 99 THEN
      v_skipped := v_skipped + 1;
      v_errors := v_errors || jsonb_build_array(jsonb_build_object('row', v_idx, 'error', 'Position out of range'));
      CONTINUE;
    END IF;

    v_email := lower(trim(COALESCE(v_row->>'email', v_row->>'claimed_by_email', '')));
    v_first := trim(COALESCE(v_row->>'first_name', ''));
    v_last := trim(COALESCE(v_row->>'last_name', ''));
    v_phone := public.normalize_phone(v_row->>'phone');
    v_method := lower(trim(COALESCE(v_row->>'payment_method', '')));
    v_status := lower(trim(COALESCE(v_row->>'payment_status', 'unpaid')));

    IF v_email = '' THEN
      -- Clear square
      UPDATE public.squares
      SET
        first_name = NULL,
        last_name = NULL,
        claimed_by_email = NULL,
        claimed_by_name = NULL,
        payment_method = NULL,
        payment_status = 'unpaid',
        claimed_at = NULL,
        paid_at = NULL,
        claim_order_id = NULL
      WHERE game_id = p_game_id AND position = v_pos;
      v_restored := v_restored + 1;
      CONTINUE;
    END IF;

    IF v_email !~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
      v_skipped := v_skipped + 1;
      v_errors := v_errors || jsonb_build_array(jsonb_build_object('row', v_idx, 'error', 'Invalid email'));
      CONTINUE;
    END IF;

    IF v_first = '' OR v_last = '' THEN
      v_skipped := v_skipped + 1;
      v_errors := v_errors || jsonb_build_array(jsonb_build_object('row', v_idx, 'error', 'Missing name'));
      CONTINUE;
    END IF;

    IF v_method IS NOT NULL AND v_method <> '' AND v_method NOT IN ('venmo', 'cash') THEN
      v_skipped := v_skipped + 1;
      v_errors := v_errors || jsonb_build_array(jsonb_build_object('row', v_idx, 'error', 'Invalid payment_method'));
      CONTINUE;
    END IF;

    IF v_status NOT IN ('unpaid', 'paid', 'released') THEN
      v_status := 'unpaid';
    END IF;

    IF v_method = '' THEN
      v_method := NULL;
    END IF;

    BEGIN
      v_claimed_at := COALESCE((v_row->>'claimed_at')::TIMESTAMPTZ, NOW());
    EXCEPTION WHEN OTHERS THEN
      v_claimed_at := NOW();
    END;

    UPDATE public.squares
    SET
      first_name = v_first,
      last_name = v_last,
      claimed_by_email = v_email,
      claimed_by_name = v_first || ' ' || v_last,
      payment_method = v_method,
      payment_status = v_status,
      claimed_at = v_claimed_at,
      paid_at = CASE WHEN v_status = 'paid' THEN COALESCE((v_row->>'paid_at')::TIMESTAMPTZ, NOW()) ELSE NULL END
    WHERE game_id = p_game_id AND position = v_pos;

    IF FOUND THEN
      v_restored := v_restored + 1;
      INSERT INTO public.players (first_name, last_name, email, phone, source, last_claimed_at)
      VALUES (v_first, v_last, v_email, v_phone, 'csv', v_claimed_at)
      ON CONFLICT (email) DO UPDATE SET
        first_name = COALESCE(NULLIF(public.players.first_name, ''), EXCLUDED.first_name),
        last_name = COALESCE(NULLIF(public.players.last_name, ''), EXCLUDED.last_name),
        phone = COALESCE(EXCLUDED.phone, public.players.phone),
        last_claimed_at = GREATEST(
          COALESCE(public.players.last_claimed_at, 'epoch'::timestamptz),
          EXCLUDED.last_claimed_at
        ),
        updated_at = NOW();
    ELSE
      v_skipped := v_skipped + 1;
      v_errors := v_errors || jsonb_build_array(jsonb_build_object('row', v_idx, 'error', 'Square not found'));
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'restored', v_restored,
    'skipped', v_skipped,
    'errors', v_errors
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_restore_game_squares(UUID, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_restore_game_squares(UUID, JSONB) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_restore_game_squares(UUID, JSONB) TO authenticated;

-- ---------------------------------------------------------------------------
-- 7. Admin mark-all-paid / unpaid by email for a game
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_set_payment_status_for_email(
  p_game_id UUID,
  p_email TEXT,
  p_status TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_email TEXT;
  v_count INTEGER;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin only';
  END IF;

  IF p_status NOT IN ('paid', 'unpaid') THEN
    RAISE EXCEPTION 'Invalid status';
  END IF;

  v_email := lower(trim(COALESCE(p_email, '')));
  IF v_email = '' OR v_email !~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
    RAISE EXCEPTION 'Invalid email';
  END IF;

  IF p_status = 'paid' THEN
    UPDATE public.squares
    SET payment_status = 'paid', paid_at = COALESCE(paid_at, NOW())
    WHERE game_id = p_game_id
      AND lower(claimed_by_email) = v_email
      AND claimed_by_email IS NOT NULL;
  ELSE
    UPDATE public.squares
    SET payment_status = 'unpaid', paid_at = NULL
    WHERE game_id = p_game_id
      AND lower(claimed_by_email) = v_email
      AND claimed_by_email IS NOT NULL;
  END IF;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN jsonb_build_object('updated', v_count);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_payment_status_for_email(UUID, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_set_payment_status_for_email(UUID, TEXT, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_set_payment_status_for_email(UUID, TEXT, TEXT) TO authenticated;
