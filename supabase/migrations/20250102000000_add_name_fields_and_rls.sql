-- Migration: Add first_name and last_name support for multi-square claiming
-- NOTE: Production already has first_name, last_name columns and sync_claimed_by_name trigger
-- This migration is idempotent and safe to run multiple times

-- Add columns if they don't exist (safe to run on production)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'squares' AND column_name = 'first_name') THEN
    ALTER TABLE squares ADD COLUMN first_name TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'squares' AND column_name = 'last_name') THEN
    ALTER TABLE squares ADD COLUMN last_name TEXT;
  END IF;
END $$;

-- Add check constraints if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.constraint_column_usage 
                 WHERE constraint_name = 'valid_first_name') THEN
    ALTER TABLE squares ADD CONSTRAINT valid_first_name CHECK (
      first_name IS NULL OR (LENGTH(TRIM(first_name)) > 0 AND LENGTH(first_name) <= 100)
    );
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.constraint_column_usage 
                 WHERE constraint_name = 'valid_last_name') THEN
    ALTER TABLE squares ADD CONSTRAINT valid_last_name CHECK (
      last_name IS NULL OR (LENGTH(TRIM(last_name)) > 0 AND LENGTH(last_name) <= 100)
    );
  END IF;
END $$;

-- Create or replace function to sync claimed_by_name
CREATE OR REPLACE FUNCTION sync_claimed_by_name()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.first_name IS NOT NULL AND NEW.last_name IS NOT NULL THEN
    NEW.claimed_by_name := NEW.first_name || ' ' || NEW.last_name;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop and recreate trigger to ensure it's up to date
DROP TRIGGER IF EXISTS sync_claimed_by_name_trigger ON squares;
CREATE TRIGGER sync_claimed_by_name_trigger
  BEFORE INSERT OR UPDATE ON squares
  FOR EACH ROW
  EXECUTE FUNCTION sync_claimed_by_name();

-- Comments for documentation
COMMENT ON COLUMN squares.first_name IS 'First name of the person claiming the square';
COMMENT ON COLUMN squares.last_name IS 'Last name of the person claiming the square';
COMMENT ON COLUMN squares.claimed_by_name IS 'Computed full name (first_name + last_name) for display';

-- NOTE: RLS policies already exist on production (squares_claim_anon, games_select_public, etc.)
-- No RLS policy changes needed - existing policies already allow claiming
-- Existing policy checks: claimed_by_email IS NULL AND payment_status = 'unpaid'

-- NOTE: Square initialization already handled by existing setup
-- Production has 100 squares per game with payment_status = 'unpaid'
-- No auto-initialization trigger needed
