-- Public buyers list: name, square count, earliest claimed_at.
-- SECURITY DEFINER so grouping can use claimed_by_email without exposing it to anon.
-- Returns no email, phone, join_password, players, or claim_orders fields.

CREATE OR REPLACE FUNCTION public.get_public_buyers(p_game_id UUID)
RETURNS TABLE (
  name TEXT,
  square_count INTEGER,
  first_claimed_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.games g
    WHERE g.id = p_game_id
      AND g.status IN ('active', 'completed')
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    COALESCE(s.claimed_by_name, 'Unknown')::TEXT AS name,
    COUNT(*)::INTEGER AS square_count,
    MIN(s.claimed_at)::TIMESTAMPTZ AS first_claimed_at
  FROM public.squares s
  WHERE s.game_id = p_game_id
    AND s.claimed_by_name IS NOT NULL
    AND s.claimed_at IS NOT NULL
  GROUP BY COALESCE(s.claimed_by_name, 'Unknown'), lower(COALESCE(s.claimed_by_email, s.claimed_by_name))
  ORDER BY MIN(s.claimed_at) DESC NULLS LAST, COUNT(*) DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_public_buyers(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_buyers(UUID) TO anon, authenticated;
