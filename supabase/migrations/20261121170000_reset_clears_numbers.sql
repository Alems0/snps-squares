-- Reset Board also wipes randomized axis numbers and unlocks them so headers
-- show '?' afterward. Keeps Game Password gate via public.verify_game_password.
-- Body based on 20261121140000_game_password.sql admin_reset_board; no pgcrypto
-- calls here (verify_game_password already uses extensions.crypt).

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

  UPDATE public.games
  SET
    afc_numbers = ARRAY[-1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
    nfc_numbers = ARRAY[-1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
    numbers_locked = FALSE,
    updated_at = NOW()
  WHERE id = p_game_id;

  RETURN jsonb_build_object('ok', true, 'cleared', v_updated);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_reset_board(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_reset_board(UUID, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_reset_board(UUID, TEXT) TO authenticated;
