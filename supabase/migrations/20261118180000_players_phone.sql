-- Players phone + claim/upsert RPC updates for text invites
-- Project: snps-squares (axkxwguwquuxbjyntjeq)
-- Apply AFTER Past Players migrations A/B (20261118150000, 20261118150100).
-- Deploy order: 1) merge app  2) apply this migration
-- Anon never reads players.phone (table remains admin-only RLS).

-- ---------------------------------------------------------------------------
-- 1. Nullable phone on players (E.164-ish)
-- ---------------------------------------------------------------------------
ALTER TABLE public.players
  ADD COLUMN IF NOT EXISTS phone TEXT;

ALTER TABLE public.players
  DROP CONSTRAINT IF EXISTS players_valid_phone;

ALTER TABLE public.players
  ADD CONSTRAINT players_valid_phone CHECK (
    phone IS NULL
    OR phone ~ '^\+[1-9][0-9]{7,14}$'
  );

COMMENT ON COLUMN public.players.phone IS
  'Optional E.164 phone for admin text invites. Never exposed to anon.';

-- Reaffirm: anon has no access to players (including phone)
REVOKE ALL ON public.players FROM anon;
REVOKE ALL ON public.players FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.players TO authenticated;

-- ---------------------------------------------------------------------------
-- 2. Normalize phone helper (digits → +E.164; US 10-digit → +1…)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.normalize_phone(p_raw TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
DECLARE
  v_digits TEXT;
BEGIN
  IF p_raw IS NULL OR trim(p_raw) = '' THEN
    RETURN NULL;
  END IF;

  v_digits := regexp_replace(p_raw, '[^0-9]', '', 'g');

  IF length(v_digits) = 10 THEN
    RETURN '+1' || v_digits;
  END IF;

  IF length(v_digits) = 11 AND left(v_digits, 1) = '1' THEN
    RETURN '+' || v_digits;
  END IF;

  IF length(v_digits) >= 8 AND length(v_digits) <= 15 THEN
    RETURN '+' || v_digits;
  END IF;

  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.normalize_phone(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.normalize_phone(TEXT) TO authenticated;
-- Anon may call via SECURITY DEFINER claim RPC only; no direct need to grant.

-- ---------------------------------------------------------------------------
-- 3. Guest claim: optional p_phone → store on players only (not squares)
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.claim_squares_as_guest(UUID, INTEGER[], TEXT, TEXT, TEXT, TEXT);

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
    WHERE email = v_email;
  END IF;

  RETURN jsonb_build_object(
    'claimed', v_updated,
    'failed_positions', to_jsonb(v_failed)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.claim_squares_as_guest(UUID, INTEGER[], TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_squares_as_guest(UUID, INTEGER[], TEXT, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4. Returning-player claim: optional p_phone updates players.phone when provided
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.claim_squares_for_player(UUID, UUID, INTEGER[], TEXT);

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
      phone = COALESCE(v_phone, phone),
      updated_at = NOW()
    WHERE id = p_player_id;
  ELSIF v_phone IS NOT NULL THEN
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

-- ---------------------------------------------------------------------------
-- 5. admin_upsert_players: accept phone; blank import phone does not wipe
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_upsert_players(
  p_rows JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_row JSONB;
  v_email TEXT;
  v_first TEXT;
  v_last TEXT;
  v_phone TEXT;
  v_new INTEGER := 0;
  v_updated INTEGER := 0;
  v_skipped INTEGER := 0;
  v_errors JSONB := '[]'::JSONB;
  v_idx INTEGER := 0;
  v_exists BOOLEAN;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Admin only';
  END IF;

  IF p_rows IS NULL OR jsonb_typeof(p_rows) <> 'array' THEN
    RAISE EXCEPTION 'Expected JSON array of rows';
  END IF;

  FOR v_row IN SELECT * FROM jsonb_array_elements(p_rows)
  LOOP
    v_idx := v_idx + 1;
    v_email := lower(trim(COALESCE(v_row->>'email', '')));
    v_first := trim(COALESCE(v_row->>'first_name', ''));
    v_last := trim(COALESCE(v_row->>'last_name', ''));
    v_phone := public.normalize_phone(v_row->>'phone');

    IF v_row ? 'phone' AND trim(COALESCE(v_row->>'phone', '')) <> '' AND v_phone IS NULL THEN
      v_skipped := v_skipped + 1;
      v_errors := v_errors || jsonb_build_array(jsonb_build_object('row', v_idx, 'error', 'Invalid phone'));
      CONTINUE;
    END IF;

    IF v_email = '' OR v_email !~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
      v_skipped := v_skipped + 1;
      v_errors := v_errors || jsonb_build_array(jsonb_build_object('row', v_idx, 'error', 'Invalid or missing email'));
      CONTINUE;
    END IF;

    IF v_first = '' OR v_last = '' THEN
      v_skipped := v_skipped + 1;
      v_errors := v_errors || jsonb_build_array(jsonb_build_object('row', v_idx, 'error', 'Missing first or last name'));
      CONTINUE;
    END IF;

    SELECT EXISTS(SELECT 1 FROM public.players WHERE email = v_email) INTO v_exists;

    INSERT INTO public.players (first_name, last_name, email, phone, source)
    VALUES (v_first, v_last, v_email, v_phone, 'csv')
    ON CONFLICT (email) DO UPDATE SET
      first_name = EXCLUDED.first_name,
      last_name = EXCLUDED.last_name,
      -- Do not wipe existing phone when import phone is blank
      phone = COALESCE(EXCLUDED.phone, public.players.phone),
      source = CASE
        WHEN public.players.source = 'claim' THEN 'csv'
        ELSE public.players.source
      END,
      updated_at = NOW();

    IF v_exists THEN
      v_updated := v_updated + 1;
    ELSE
      v_new := v_new + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'new_count', v_new,
    'updated_count', v_updated,
    'skipped_count', v_skipped,
    'errors', v_errors
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_upsert_players(JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_upsert_players(JSONB) TO authenticated;
