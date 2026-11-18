-- Migration B: Anon column privacy + revoke write privileges on games/squares
-- Project: snps-squares (axkxwguwquuxbjyntjeq)
-- Apply AFTER Migration A (20261118150000_past_players_and_rpcs.sql) and AFTER
-- the app that uses claim_squares_as_guest / safe column selects is live.
-- Deploy order:
--   1) Merge app PR
--   2) Apply Migration A
--   3) Apply THIS migration (B) immediately after A
--
-- Verified: no anon app path uses INSERT/DELETE on games or squares.
-- Anon claims go through SECURITY DEFINER RPCs; admin writes use authenticated.

-- Games: revoke table SELECT from anon, grant safe columns only
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
  updated_at
) ON public.games TO anon;
GRANT SELECT ON public.games TO authenticated;

-- Squares: revoke table SELECT from anon, grant safe columns only (no claimed_by_email)
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

-- Anon no longer needs direct writes; claims go through SECURITY DEFINER RPCs.
-- Authenticated admins keep DML via existing RLS policies.
REVOKE UPDATE ON public.squares FROM anon;
GRANT UPDATE ON public.squares TO authenticated;

REVOKE INSERT, DELETE ON public.games FROM anon;
REVOKE INSERT, DELETE ON public.squares FROM anon;
GRANT INSERT, DELETE ON public.games TO authenticated;
GRANT INSERT, DELETE ON public.squares TO authenticated;
