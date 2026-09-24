-- SNPS Squares Database Schema
-- Single-tenant charity Super Bowl squares application

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Admins table (single admin for Phase 1)
CREATE TABLE admins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Games table (one active game per season)
CREATE TABLE games (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  season INTEGER NOT NULL,
  afc_team TEXT DEFAULT 'AFC',
  nfc_team TEXT DEFAULT 'NFC',
  cost_per_square INTEGER DEFAULT 10, -- in dollars
  charity_percentage INTEGER DEFAULT 50, -- percentage going to charity
  q1_payout INTEGER DEFAULT 0,
  q2_payout INTEGER DEFAULT 0,
  q3_payout INTEGER DEFAULT 0,
  final_payout INTEGER DEFAULT 0,
  venmo_handle TEXT,
  join_password TEXT, -- optional password to claim squares
  numbers_locked BOOLEAN DEFAULT FALSE,
  afc_numbers INTEGER[] DEFAULT ARRAY[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1], -- 10 numbers, -1 means unassigned
  nfc_numbers INTEGER[] DEFAULT ARRAY[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],
  status TEXT DEFAULT 'active', -- active, completed, archived
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT valid_status CHECK (status IN ('active', 'completed', 'archived')),
  CONSTRAINT valid_charity_pct CHECK (charity_percentage >= 0 AND charity_percentage <= 100),
  CONSTRAINT valid_cost CHECK (cost_per_square >= 0)
);

-- Squares table (100 squares per game)
CREATE TABLE squares (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  position INTEGER NOT NULL, -- 0-99 (row*10 + col)
  claimed_by_name TEXT,
  claimed_by_email TEXT,
  claimed_at TIMESTAMP WITH TIME ZONE,
  payment_status TEXT DEFAULT 'unpaid', -- unpaid, paid, released
  payment_method TEXT, -- venmo, cash
  paid_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT valid_position CHECK (position >= 0 AND position < 100),
  CONSTRAINT valid_payment_status CHECK (payment_status IN ('unpaid', 'paid', 'released')),
  CONSTRAINT valid_payment_method CHECK (payment_method IN ('venmo', 'cash') OR payment_method IS NULL),
  CONSTRAINT valid_email CHECK (claimed_by_email IS NULL OR claimed_by_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  UNIQUE(game_id, position)
);

-- Scores table (quarter scores for each game)
CREATE TABLE scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  quarter TEXT NOT NULL, -- q1, q2, q3, final
  afc_score INTEGER NOT NULL,
  nfc_score INTEGER NOT NULL,
  source TEXT DEFAULT 'manual', -- manual, api
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT valid_quarter CHECK (quarter IN ('q1', 'q2', 'q3', 'final')),
  CONSTRAINT valid_source CHECK (source IN ('manual', 'api')),
  CONSTRAINT valid_score CHECK (afc_score >= 0 AND nfc_score >= 0),
  UNIQUE(game_id, quarter)
);

-- Indexes for performance
CREATE INDEX idx_squares_game_id ON squares(game_id);
CREATE INDEX idx_squares_claimed ON squares(game_id, payment_status) WHERE claimed_by_email IS NOT NULL;
CREATE INDEX idx_scores_game_id ON scores(game_id);
CREATE INDEX idx_games_status ON games(status);

-- Updated timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER games_updated_at
  BEFORE UPDATE ON games
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Seed admin (stecher2789@gmail.com)
INSERT INTO admins (email) VALUES ('stecher2789@gmail.com')
ON CONFLICT (email) DO NOTHING;

-- Comments for documentation
COMMENT ON TABLE admins IS 'Single admin user - email allowlist for authentication';
COMMENT ON TABLE games IS 'One game per season - admin can start new season and archive previous';
COMMENT ON TABLE squares IS '100 squares per game (10x10 grid) - claimed by players';
COMMENT ON TABLE scores IS 'Quarter-end scores - can be manually entered or fetched from API';
COMMENT ON COLUMN games.numbers_locked IS 'Once locked, no unpaid squares can be released';
COMMENT ON COLUMN games.join_password IS 'Optional password required to claim squares (prevents fully public board)';
COMMENT ON COLUMN squares.position IS 'Position on board: row*10 + col (0-99)';
