-- RLS policies on games/squares/scores call is_admin() for the authenticated role.
-- If EXECUTE is missing, Postgres errors the whole query (does not fall through to other policies),
-- which broke admin View Board and Top Buyers while signed in.
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated;
