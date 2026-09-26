-- Add first_name and last_name fields to squares table
-- Keep claimed_by_name for backward compatibility (will be computed as first_name || ' ' || last_name)
ALTER TABLE squares 
  ADD COLUMN first_name TEXT,
  ADD COLUMN last_name TEXT;

-- Add check constraints for names
ALTER TABLE squares
  ADD CONSTRAINT valid_first_name CHECK (
    first_name IS NULL OR (LENGTH(TRIM(first_name)) > 0 AND LENGTH(first_name) <= 100)
  ),
  ADD CONSTRAINT valid_last_name CHECK (
    last_name IS NULL OR (LENGTH(TRIM(last_name)) > 0 AND LENGTH(last_name) <= 100)
  );

-- Enable Row Level Security on all tables
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE squares ENABLE ROW LEVEL SECURITY;
ALTER TABLE scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;

-- RLS Policies for games table
-- Public can read active games
CREATE POLICY "Anyone can view active games"
  ON games FOR SELECT
  USING (status = 'active');

-- Only admins can insert/update/delete games
CREATE POLICY "Only admins can manage games"
  ON games FOR ALL
  USING (auth.jwt() ->> 'email' IN (SELECT email FROM admins));

-- RLS Policies for squares table
-- Public can read all squares for active games
CREATE POLICY "Anyone can view squares for active games"
  ON squares FOR SELECT
  USING (
    game_id IN (SELECT id FROM games WHERE status = 'active')
  );

-- Public can claim (update) unclaimed or pending squares
CREATE POLICY "Anyone can claim available squares"
  ON squares FOR UPDATE
  USING (
    game_id IN (SELECT id FROM games WHERE status = 'active') AND
    (claimed_by_email IS NULL OR payment_status IN ('released', 'unpaid'))
  )
  WITH CHECK (
    claimed_by_email IS NOT NULL AND
    first_name IS NOT NULL AND
    last_name IS NOT NULL AND
    payment_method IS NOT NULL
  );

-- Only admins can delete or fully manage squares
CREATE POLICY "Only admins can delete squares"
  ON squares FOR DELETE
  USING (auth.jwt() ->> 'email' IN (SELECT email FROM admins));

-- RLS Policies for scores table
-- Public can read scores
CREATE POLICY "Anyone can view scores"
  ON scores FOR SELECT
  USING (true);

-- Only admins can manage scores
CREATE POLICY "Only admins can manage scores"
  ON scores FOR ALL
  USING (auth.jwt() ->> 'email' IN (SELECT email FROM admins));

-- RLS Policies for admins table
-- Only admins can read the admins table
CREATE POLICY "Only admins can view admins"
  ON admins FOR SELECT
  USING (auth.jwt() ->> 'email' IN (SELECT email FROM admins));

-- Create function to sync claimed_by_name with first_name and last_name
CREATE OR REPLACE FUNCTION sync_claimed_by_name()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.first_name IS NOT NULL AND NEW.last_name IS NOT NULL THEN
    NEW.claimed_by_name := NEW.first_name || ' ' || NEW.last_name;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically sync claimed_by_name
CREATE TRIGGER sync_claimed_by_name_trigger
  BEFORE INSERT OR UPDATE ON squares
  FOR EACH ROW
  EXECUTE FUNCTION sync_claimed_by_name();

-- Add comment
COMMENT ON COLUMN squares.first_name IS 'First name of the person claiming the square';
COMMENT ON COLUMN squares.last_name IS 'Last name of the person claiming the square';
COMMENT ON COLUMN squares.claimed_by_name IS 'Computed full name (first_name + last_name) for display';

-- Function to initialize 100 squares for a new game
CREATE OR REPLACE FUNCTION initialize_game_squares(p_game_id UUID)
RETURNS void AS $$
BEGIN
  -- Insert 100 squares (positions 0-99) for the game
  INSERT INTO squares (game_id, position, payment_status)
  SELECT p_game_id, generate_series(0, 99), 'released'
  ON CONFLICT (game_id, position) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create squares when a new game is created
CREATE OR REPLACE FUNCTION create_squares_for_new_game()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM initialize_game_squares(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_create_squares_trigger
  AFTER INSERT ON games
  FOR EACH ROW
  EXECUTE FUNCTION create_squares_for_new_game();

COMMENT ON FUNCTION initialize_game_squares IS 'Creates 100 squares (0-99) for a given game';
COMMENT ON FUNCTION create_squares_for_new_game IS 'Automatically creates squares when a new game is inserted';
