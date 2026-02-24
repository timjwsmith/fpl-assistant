/*
  # Add Statistical Prediction Tables

  1. New Tables
    - `player_statistical_predictions`
      - Stores detailed statistical predictions with component breakdowns
      - Links to players, users, and gameweeks
      - Includes expected minutes, goals, assists, clean sheets, etc.

    - `team_strength_cache`
      - Caches computed team strength metrics
      - Attack/defense strength for home/away
      - Overall strength ratings

    - `fixture_difficulty_cache`
      - Caches fixture difficulty analysis
      - Attack and defense difficulty ratings
      - Overall difficulty classification

  2. Security
    - Enable RLS on all new tables
    - Add policies for authenticated users to read their own data
    - Add policies for system to write prediction data

  3. Indexes
    - Add indexes on frequently queried columns
    - Composite indexes for optimal query performance
*/

-- Create player_statistical_predictions table
CREATE TABLE IF NOT EXISTS player_statistical_predictions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  gameweek INTEGER NOT NULL,
  player_id INTEGER NOT NULL,
  predicted_points DECIMAL(5, 2) NOT NULL DEFAULT 0,
  confidence INTEGER NOT NULL DEFAULT 50,

  -- Component breakdown
  expected_goals DECIMAL(5, 3) NOT NULL DEFAULT 0,
  expected_assists DECIMAL(5, 3) NOT NULL DEFAULT 0,
  expected_clean_sheet DECIMAL(5, 3) NOT NULL DEFAULT 0,
  expected_saves DECIMAL(5, 2) NOT NULL DEFAULT 0,
  expected_yellow_card DECIMAL(5, 3) NOT NULL DEFAULT 0,
  expected_bonus DECIMAL(5, 2) NOT NULL DEFAULT 0,
  expected_minutes INTEGER NOT NULL DEFAULT 0,

  -- Points breakdown
  appearance_points DECIMAL(5, 2) NOT NULL DEFAULT 0,
  goals_points DECIMAL(5, 2) NOT NULL DEFAULT 0,
  assists_points DECIMAL(5, 2) NOT NULL DEFAULT 0,
  clean_sheet_points DECIMAL(5, 2) NOT NULL DEFAULT 0,
  saves_points DECIMAL(5, 2) NOT NULL DEFAULT 0,
  bonus_points DECIMAL(5, 2) NOT NULL DEFAULT 0,
  yellow_card_points DECIMAL(5, 2) NOT NULL DEFAULT 0,
  defensive_contribution_points DECIMAL(5, 2) NOT NULL DEFAULT 0,

  -- Minutes estimate
  probability_90 DECIMAL(5, 3) NOT NULL DEFAULT 0,
  probability_60 DECIMAL(5, 3) NOT NULL DEFAULT 0,
  probability_bench DECIMAL(5, 3) NOT NULL DEFAULT 0,
  probability_0 DECIMAL(5, 3) NOT NULL DEFAULT 0,
  risk_level TEXT NOT NULL DEFAULT 'low',

  -- Metadata
  reasoning TEXT,
  snapshot_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),

  -- Ensure one prediction per user/gameweek/player combination
  UNIQUE(user_id, gameweek, player_id)
);

-- Create team_strength_cache table
CREATE TABLE IF NOT EXISTS team_strength_cache (
  id SERIAL PRIMARY KEY,
  team_id INTEGER NOT NULL,
  season INTEGER NOT NULL DEFAULT 2024,

  -- Strength metrics
  attack_strength_home INTEGER NOT NULL DEFAULT 0,
  attack_strength_away INTEGER NOT NULL DEFAULT 0,
  defense_strength_home INTEGER NOT NULL DEFAULT 0,
  defense_strength_away INTEGER NOT NULL DEFAULT 0,
  overall_strength DECIMAL(5, 3) NOT NULL DEFAULT 1.0,
  recent_form INTEGER NOT NULL DEFAULT 3,
  fixture_rating DECIMAL(5, 3) NOT NULL DEFAULT 1.0,

  -- Metadata
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Ensure one entry per team per season
  UNIQUE(team_id, season)
);

-- Create fixture_difficulty_cache table
CREATE TABLE IF NOT EXISTS fixture_difficulty_cache (
  id SERIAL PRIMARY KEY,
  fixture_id INTEGER NOT NULL,
  team_id INTEGER NOT NULL,
  opponent_id INTEGER NOT NULL,
  is_home BOOLEAN NOT NULL DEFAULT true,

  -- Difficulty metrics
  overall_difficulty INTEGER NOT NULL DEFAULT 3,
  attack_difficulty INTEGER NOT NULL DEFAULT 3,
  defense_difficulty INTEGER NOT NULL DEFAULT 3,
  difficulty_rating TEXT NOT NULL DEFAULT 'moderate',

  -- Metadata
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Ensure one entry per fixture/team combination
  UNIQUE(fixture_id, team_id)
);

-- Enable Row Level Security
ALTER TABLE player_statistical_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_strength_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE fixture_difficulty_cache ENABLE ROW LEVEL SECURITY;

-- RLS Policies for player_statistical_predictions
CREATE POLICY "Users can view their own statistical predictions"
  ON player_statistical_predictions
  FOR SELECT
  TO authenticated
  USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert their own statistical predictions"
  ON player_statistical_predictions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update their own statistical predictions"
  ON player_statistical_predictions
  FOR UPDATE
  TO authenticated
  USING (auth.uid()::text = user_id::text)
  WITH CHECK (auth.uid()::text = user_id::text);

-- RLS Policies for team_strength_cache (public read, system write)
CREATE POLICY "Anyone can view team strength cache"
  ON team_strength_cache
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "System can insert team strength cache"
  ON team_strength_cache
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "System can update team strength cache"
  ON team_strength_cache
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policies for fixture_difficulty_cache (public read, system write)
CREATE POLICY "Anyone can view fixture difficulty cache"
  ON fixture_difficulty_cache
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "System can insert fixture difficulty cache"
  ON fixture_difficulty_cache
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "System can update fixture difficulty cache"
  ON fixture_difficulty_cache
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create indexes for optimal query performance
CREATE INDEX IF NOT EXISTS idx_player_statistical_predictions_user_gameweek
  ON player_statistical_predictions(user_id, gameweek);

CREATE INDEX IF NOT EXISTS idx_player_statistical_predictions_player
  ON player_statistical_predictions(player_id);

CREATE INDEX IF NOT EXISTS idx_player_statistical_predictions_snapshot
  ON player_statistical_predictions(snapshot_id);

CREATE INDEX IF NOT EXISTS idx_team_strength_cache_team_season
  ON team_strength_cache(team_id, season);

CREATE INDEX IF NOT EXISTS idx_fixture_difficulty_cache_fixture
  ON fixture_difficulty_cache(fixture_id);

CREATE INDEX IF NOT EXISTS idx_fixture_difficulty_cache_team
  ON fixture_difficulty_cache(team_id);
