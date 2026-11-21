-- Hotfix: on Supabase, pgcrypto lives in the `extensions` schema.
-- Functions with SET search_path = public, pg_temp cannot resolve unqualified
-- crypt() / gen_salt(). Schema-qualify both calls.
-- Repo grep: only these two functions used crypt/gen_salt (from 20261121140000).

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

  IF v_hash <> extensions.crypt(p_game_password, v_hash) THEN
    RAISE EXCEPTION 'Incorrect game password';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.verify_game_password(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.verify_game_password(UUID, TEXT) FROM anon;
REVOKE ALL ON FUNCTION public.verify_game_password(UUID, TEXT) FROM authenticated;

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
  VALUES (p_game_id, extensions.crypt(v_trimmed, extensions.gen_salt('bf')), NOW())
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
