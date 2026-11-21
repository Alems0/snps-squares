-- Admin-only Game Password for destructive actions (reset board, clear numbers, restore).
-- Stores bcrypt hash only; never readable by anon. Complexity enforced in set RPC.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------------
-- 1. Status flag on games (safe to read by admin; never the hash)
-- ---------------------------------------------------------------------------
ALTER TABLE public.games
  ADD COLUMN IF NOT EXISTS game_password_set BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.games.game_password_set IS
  'True when an admin Game Password hash exists. Never store or expose the plaintext/hash here.';

-- ---------------------------------------------------------------------------
-- 2. Hash table — no RLS policies → no direct table access for API roles
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.game_passwords (
  game_id UUID PRIMARY KEY REFERENCES public.games(id) ON DELETE CASCADE,
  password_hash TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.game_passwords ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.game_passwords FROM PUBLIC;
REVOKE ALL ON TABLE public.game_passwords FROM anon;
REVOKE ALL ON TABLE public.game_passwords FROM authenticated;

COMMENT ON TABLE public.game_passwords IS
  'bcrypt hashes for admin Game Passwords. Access only via SECURITY DEFINER RPCs.';

-- ---------------------------------------------------------------------------
-- 3. Complexity check (6+, upper, digit, special; no maximum)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.assert_game_password_complexity(p_password TEXT)
RETURNS VOID
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
BEGIN
  IF p_password IS NULL OR char_length(p_password) < 6 THEN
    RAISE EXCEPTION 'Game password must be at least 6 characters';
  END IF;
  IF p_password !~ '[A-Z]' THEN
    RAISE EXCEPTION 'Game password must include at least one uppercase letter';
  END IF;
  IF p_password !~ '[0-9]' THEN
    RAISE EXCEPTION 'Game password must include at least one number';
  END IF;
  IF p_password !~ '[^A-Za-z0-9]' THEN
    RAISE EXCEPTION 'Game password must include at least one special character';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.assert_game_password_complexity(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.assert_game_password_complexity(TEXT) FROM anon;
REVOKE ALL ON FUNCTION public.assert_game_password_complexity(TEXT) FROM authenticated;

-- ---------------------------------------------------------------------------
-- 4. Verify helper (internal; called only by other SECURITY DEFINER RPCs)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.verify_game_password(p_game_id UUID, p_game_password TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_hash TEXT;
BEGIN
  SELECT password_hash INTO v_hash
  FROM public.game_passwords
  WHERE game_id = p_game_id;

  IF v_hash IS NULL OR v_hash = '' THEN
    RAISE EXCEPTION 'Game password is not set. Set one in Configure Game first.';
  END IF;

  IF p_game_password IS NULL OR p_game_password = '' THEN
    RAISE EXCEPTION 'Incorrect game password';
  END IF;

  IF v_hash <> crypt(p_game_password, v_hash) THEN
    RAISE EXCEPTION 'Incorrect game password';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.verify_game_password(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.verify_game_password(UUID, TEXT) FROM anon;
REVOKE ALL ON FUNCTION public.verify_game_password(UUID, TEXT) FROM authenticated;

-- ---------------------------------------------------------------------------
-- 5. Set Game Password (admin). Blank password = leave existing unchanged.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_set_game_password(
  p_game_id UUID,
  p_game_password TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_trimmed TEXT;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin only';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.games WHERE id = p_game_id) THEN
    RAISE EXCEPTION 'Game not found';
  END IF;

  v_trimmed := COALESCE(p_game_password, '');
  IF btrim(v_trimmed) = '' THEN
    RETURN jsonb_build_object('ok', true, 'unchanged', true);
  END IF;

  PERFORM public.assert_game_password_complexity(v_trimmed);

  INSERT INTO public.game_passwords (game_id, password_hash, updated_at)
  VALUES (p_game_id, crypt(v_trimmed, gen_salt('bf')), NOW())
  ON CONFLICT (game_id) DO UPDATE
    SET password_hash = EXCLUDED.password_hash,
        updated_at = NOW();

  UPDATE public.games
  SET game_password_set = TRUE,
      updated_at = NOW()
  WHERE id = p_game_id;

  RETURN jsonb_build_object('ok', true, 'unchanged', false);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_game_password(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_set_game_password(UUID, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_set_game_password(UUID, TEXT) TO authenticated;

-- ---------------------------------------------------------------------------
-- 6. Reset board (clear all claims)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_reset_board(
  p_game_id UUID,
  p_game_password TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_updated INTEGER;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin only';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.games WHERE id = p_game_id) THEN
    RAISE EXCEPTION 'Game not found';
  END IF;

  PERFORM public.verify_game_password(p_game_id, p_game_password);

  UPDATE public.squares
  SET
    first_name = NULL,
    last_name = NULL,
    claimed_by_name = NULL,
    claimed_by_email = NULL,
    claimed_at = NULL,
    payment_status = 'unpaid',
    payment_method = NULL,
    paid_at = NULL,
    claim_order_id = NULL
  WHERE game_id = p_game_id;

  GET DIAGNOSTICS v_updated = ROW_COUNT;

  RETURN jsonb_build_object('ok', true, 'cleared', v_updated);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_reset_board(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_reset_board(UUID, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_reset_board(UUID, TEXT) TO authenticated;

-- ---------------------------------------------------------------------------
-- 7. Clear axis numbers back to ?
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_clear_numbers(
  p_game_id UUID,
  p_game_password TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin only';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.games WHERE id = p_game_id) THEN
    RAISE EXCEPTION 'Game not found';
  END IF;

  PERFORM public.verify_game_password(p_game_id, p_game_password);

  UPDATE public.games
  SET
    afc_numbers = ARRAY[-1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
    nfc_numbers = ARRAY[-1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
    updated_at = NOW()
  WHERE id = p_game_id;

  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_clear_numbers(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_clear_numbers(UUID, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_clear_numbers(UUID, TEXT) TO authenticated;

-- ---------------------------------------------------------------------------
-- 8. Restore — drop insecure 2-arg overload; recreate with password arg
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.admin_restore_game_squares(UUID, JSONB);

CREATE OR REPLACE FUNCTION public.admin_restore_game_squares(
  p_game_id UUID,
  p_rows JSONB,
  p_game_password TEXT
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
  v_paid_at TIMESTAMPTZ;
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

  PERFORM public.verify_game_password(p_game_id, p_game_password);

  IF p_rows IS NULL OR jsonb_typeof(p_rows) <> 'array' THEN
    RAISE EXCEPTION 'Expected JSON array of square rows';
  END IF;

  IF jsonb_array_length(p_rows) > 100 THEN
    RAISE EXCEPTION 'Too many rows (max 100)';
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

    IF v_pos IS NULL OR v_pos < 0 OR v_pos > 99 THEN
      v_skipped := v_skipped + 1;
      v_errors := v_errors || jsonb_build_array(jsonb_build_object('row', v_idx, 'error', 'Position out of range'));
      CONTINUE;
    END IF;

    v_email := lower(trim(COALESCE(v_row->>'email', v_row->>'claimed_by_email', '')));
    v_first := trim(COALESCE(v_row->>'first_name', ''));
    v_last := trim(COALESCE(v_row->>'last_name', ''));
    v_phone := CASE
      WHEN COALESCE(v_row->>'phone', '') ~* 'e[+-]?\d' THEN NULL
      ELSE public.normalize_phone(v_row->>'phone')
    END;
    v_method := lower(trim(COALESCE(v_row->>'payment_method', '')));
    v_status := lower(trim(COALESCE(v_row->>'payment_status', 'unpaid')));

    IF v_email = '' THEN
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

    BEGIN
      v_paid_at := NULLIF(v_row->>'paid_at', '')::TIMESTAMPTZ;
    EXCEPTION WHEN OTHERS THEN
      v_paid_at := NULL;
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
      paid_at = CASE WHEN v_status = 'paid' THEN COALESCE(v_paid_at, NOW()) ELSE NULL END
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

REVOKE ALL ON FUNCTION public.admin_restore_game_squares(UUID, JSONB, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_restore_game_squares(UUID, JSONB, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_restore_game_squares(UUID, JSONB, TEXT) TO authenticated;
