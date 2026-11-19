-- Security hardening on top of 20261119160000 (applied before merging PR #28)
-- 1. Close the direct-table claim bypass (squares_claim_anon let any authenticated user UPDATE squares).
-- 2. Public read policies are anon-only; admins read via *_all_admin policies (hides claimed_by_email/join_password from non-admin authenticated users).
-- 3. Remove unneeded table privileges.
-- 4. Drop the no-op assert_claiming_allowed(); revoke direct EXECUTE on the trigger fn.
-- 5. Restore: reject NULL position, tolerate bad paid_at, cap at 100 rows.

DROP POLICY IF EXISTS squares_claim_anon ON public.squares;

DROP POLICY IF EXISTS squares_select_public ON public.squares;
CREATE POLICY squares_select_public ON public.squares
  FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS games_select_public ON public.games;
CREATE POLICY games_select_public ON public.games
  FOR SELECT TO anon USING (status = ANY (ARRAY['active'::text, 'completed'::text]));

REVOKE TRUNCATE, REFERENCES, TRIGGER ON public.games, public.squares, public.scores, public.admins, public.players, public.claim_orders FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.games, public.squares, public.scores, public.admins FROM anon;
REVOKE SELECT ON public.admins FROM anon;
REVOKE ALL ON public.players FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.admins FROM authenticated;

DROP FUNCTION IF EXISTS public.assert_claiming_allowed();
REVOKE EXECUTE ON FUNCTION public.upsert_player_from_claim() FROM PUBLIC, anon, authenticated;

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

REVOKE ALL ON FUNCTION public.admin_restore_game_squares(UUID, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_restore_game_squares(UUID, JSONB) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_restore_game_squares(UUID, JSONB) TO authenticated;
