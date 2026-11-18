-- Migration A: Past Players table + RPCs (no privilege revokes on games/squares)
-- Project: snps-squares (axkxwguwquuxbjyntjeq)
-- Safe to apply while current main is live (select('*') + direct anon UPDATE on squares).
-- Deploy order:
--   1) Merge app PR
--   2) Apply THIS migration (A) immediately
--   3) Apply 20261118150100_privacy_grants.sql (B) after A is live

-- ---------------------------------------------------------------------------
-- 1. Players table
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.players (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'manual',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_claimed_at TIMESTAMPTZ,
  CONSTRAINT players_valid_source CHECK (source IN ('csv', 'manual', 'claim')),
  CONSTRAINT players_valid_email CHECK (
    email = lower(email)
    AND email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
  ),
  CONSTRAINT players_valid_first_name CHECK (LENGTH(TRIM(first_name)) > 0 AND LENGTH(first_name) <= 100),
  CONSTRAINT players_valid_last_name CHECK (LENGTH(TRIM(last_name)) > 0 AND LENGTH(last_name) <= 100),
  CONSTRAINT players_email_unique UNIQUE (email)
);

CREATE INDEX IF NOT EXISTS players_name_search_idx ON public.players (lower(last_name), lower(first_name));
CREATE INDEX IF NOT EXISTS players_last_claimed_idx ON public.players (last_claimed_at DESC NULLS LAST);

CREATE OR REPLACE FUNCTION public.players_normalize_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.email := lower(trim(NEW.email));
  NEW.first_name := trim(NEW.first_name);
  NEW.last_name := trim(NEW.last_name);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS players_normalize_email ON public.players;
CREATE TRIGGER players_normalize_email
  BEFORE INSERT OR UPDATE ON public.players
  FOR EACH ROW
  EXECUTE FUNCTION public.players_normalize_email();

DROP TRIGGER IF EXISTS players_updated_at ON public.players;
CREATE TRIGGER players_updated_at
  BEFORE UPDATE ON public.players
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS players_all_admin ON public.players;
CREATE POLICY players_all_admin ON public.players
  FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Anon: no access. Authenticated: table DML gated by RLS (admin only).
REVOKE ALL ON public.players FROM anon;
REVOKE ALL ON public.players FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.players TO authenticated;

COMMENT ON TABLE public.players IS 'Past players for returning-player autocomplete and admin claim-on-behalf. Anon never reads emails.';

-- ---------------------------------------------------------------------------
-- 2. Auto-upsert player on successful claim (server-side, SECURITY DEFINER)
--    On email conflict: do not overwrite names; only refresh last_claimed_at.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.upsert_player_from_claim()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_email TEXT;
  v_first TEXT;
  v_last TEXT;
BEGIN
  IF NEW.claimed_by_email IS NULL THEN
    RETURN NEW;
  END IF;

  v_email := lower(trim(NEW.claimed_by_email));
  v_first := COALESCE(NULLIF(trim(NEW.first_name), ''), split_part(COALESCE(NEW.claimed_by_name, ''), ' ', 1));
  v_last := COALESCE(
    NULLIF(trim(NEW.last_name), ''),
    NULLIF(trim(substring(COALESCE(NEW.claimed_by_name, '') from position(' ' in COALESCE(NEW.claimed_by_name, '') || ' ') + 1)), ''),
    v_first
  );

  IF v_first IS NULL OR v_first = '' THEN
    v_first := 'Player';
  END IF;
  IF v_last IS NULL OR v_last = '' THEN
    v_last := v_first;
  END IF;

  INSERT INTO public.players (first_name, last_name, email, source, last_claimed_at)
  VALUES (v_first, v_last, v_email, 'claim', COALESCE(NEW.claimed_at, NOW()))
  ON CONFLICT (email) DO UPDATE SET
    -- Do not overwrite existing names; only refresh last_claimed_at
    last_claimed_at = GREATEST(
      COALESCE(public.players.last_claimed_at, 'epoch'::timestamptz),
      EXCLUDED.last_claimed_at
    ),
    updated_at = NOW();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS squares_upsert_player_on_claim ON public.squares;
CREATE TRIGGER squares_upsert_player_on_claim
  AFTER INSERT OR UPDATE OF claimed_by_email, first_name, last_name, claimed_by_name, claimed_at
  ON public.squares
  FOR EACH ROW
  WHEN (NEW.claimed_by_email IS NOT NULL)
  EXECUTE FUNCTION public.upsert_player_from_claim();

-- ---------------------------------------------------------------------------
-- 3. Public name search (names only — never emails)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.search_player_names(q TEXT)
RETURNS TABLE (id UUID, display_name TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_q TEXT := lower(trim(COALESCE(q, '')));
  v_like TEXT;
BEGIN
  IF length(v_q) < 2 THEN
    RETURN;
  END IF;

  -- Escape LIKE metacharacters
  v_like := replace(replace(replace(v_q, '\', '\\'), '%', '\%'), '_', '\_');

  RETURN QUERY
  SELECT
    p.id,
    (p.first_name || ' ' || p.last_name)::TEXT AS display_name
  FROM public.players p
  WHERE
    lower(p.first_name) LIKE v_like || '%' ESCAPE '\'
    OR lower(p.last_name) LIKE v_like || '%' ESCAPE '\'
    OR lower(p.first_name || ' ' || p.last_name) LIKE '%' || v_like || '%' ESCAPE '\'
  ORDER BY
    CASE WHEN lower(p.last_name) LIKE v_like || '%' ESCAPE '\' THEN 0 ELSE 1 END,
    p.last_name,
    p.first_name
  LIMIT 8;
END;
$$;

REVOKE ALL ON FUNCTION public.search_player_names(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_player_names(TEXT) TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4a. Claim squares for a known player (email resolved server-side; name-only client)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.claim_squares_for_player(
  p_player_id UUID,
  p_game_id UUID,
  p_positions INTEGER[],
  p_payment_method TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_player public.players%ROWTYPE;
  v_game public.games%ROWTYPE;
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
    SET last_claimed_at = NOW(), updated_at = NOW()
    WHERE id = p_player_id;
  END IF;

  RETURN jsonb_build_object(
    'claimed', v_updated,
    'failed_positions', to_jsonb(v_failed),
    'display_name', v_player.first_name || ' ' || v_player.last_name
  );
END;
$$;

REVOKE ALL ON FUNCTION public.claim_squares_for_player(UUID, UUID, INTEGER[], TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_squares_for_player(UUID, UUID, INTEGER[], TEXT) TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4b. Guest claim (typed email) — SECURITY DEFINER so anon need not SELECT
--     claimed_by_email for the RLS UPDATE filter (required after Migration B).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.claim_squares_as_guest(
  p_game_id UUID,
  p_positions INTEGER[],
  p_first TEXT,
  p_last TEXT,
  p_email TEXT,
  p_payment_method TEXT
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

  RETURN jsonb_build_object(
    'claimed', v_updated,
    'failed_positions', to_jsonb(v_failed)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.claim_squares_as_guest(UUID, INTEGER[], TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_squares_as_guest(UUID, INTEGER[], TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- 5. Top buyers without exposing emails to the client
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_top_buyers(p_game_id UUID, p_limit INTEGER DEFAULT 5)
RETURNS TABLE (
  name TEXT,
  square_count INTEGER,
  total_cost INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_cost INTEGER;
BEGIN
  SELECT cost_per_square INTO v_cost
  FROM public.games
  WHERE id = p_game_id
    AND status IN ('active', 'completed');

  IF v_cost IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    COALESCE(s.claimed_by_name, 'Unknown')::TEXT AS name,
    COUNT(*)::INTEGER AS square_count,
    (COUNT(*) * v_cost)::INTEGER AS total_cost
  FROM public.squares s
  WHERE s.game_id = p_game_id
    AND s.claimed_by_email IS NOT NULL
  GROUP BY COALESCE(s.claimed_by_name, 'Unknown'), lower(s.claimed_by_email)
  ORDER BY COUNT(*) DESC
  LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 5), 20));
END;
$$;

REVOKE ALL ON FUNCTION public.get_top_buyers(UUID, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_top_buyers(UUID, INTEGER) TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- 6. Public board / prize pot helper
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_public_game_stats(p_game_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_game public.games%ROWTYPE;
  v_claimed INTEGER;
  v_paid INTEGER;
BEGIN
  SELECT * INTO v_game
  FROM public.games
  WHERE id = p_game_id
    AND status IN ('active', 'completed');

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT
    COUNT(*) FILTER (WHERE claimed_by_email IS NOT NULL),
    COUNT(*) FILTER (WHERE payment_status = 'paid')
  INTO v_claimed, v_paid
  FROM public.squares
  WHERE game_id = p_game_id;

  RETURN jsonb_build_object(
    'claimed', v_claimed,
    'paid', v_paid,
    'cost_per_square', v_game.cost_per_square,
    'charity_percentage', v_game.charity_percentage,
    'prize_pot', (v_paid * v_game.cost_per_square) - ((v_paid * v_game.cost_per_square) * v_game.charity_percentage / 100.0)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_public_game_stats(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_game_stats(UUID) TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- 7. Admin CSV bulk upsert helper
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

    INSERT INTO public.players (first_name, last_name, email, source)
    VALUES (v_first, v_last, v_email, 'csv')
    ON CONFLICT (email) DO UPDATE SET
      first_name = EXCLUDED.first_name,
      last_name = EXCLUDED.last_name,
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
