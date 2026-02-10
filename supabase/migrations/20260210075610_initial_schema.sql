/*
  # Fantasy Premier League AI Assistant - Initial Schema

  1. New Tables
    - `users` - Core user accounts (linked to FPL manager IDs)
    - `user_settings` - User preferences and settings
    - `user_teams` - Historical team states by gameweek
    - `predictions` - AI predictions for player points
    - `ai_team_predictions` - Async AI team analysis results
    - `transfers` - Historical transfer records
    - `chips_used` - FPL chip usage tracking
    - `fpl_credentials` - Encrypted FPL login credentials
    - `automation_settings` - User automation preferences
    - `gameweek_plans` - AI-generated gameweek plans and recommendations
    - `change_history` - Audit trail of applied changes
    - `applied_lineups` - Intended lineups for upcoming gameweeks
    - `ai_precomputations` - Cached AI computation results
    - `ai_decision_ledger` - AI decision audit trail
    - `multi_week_transfer_predictions` - Long-term transfer tracking
    - `scheduler_state` - Background job state management
    - `prediction_bias_metrics` - AI calibration metrics
    - `player_minutes_history` - Historical playing time data
    - `prediction_evaluations` - Prediction accuracy evaluations

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated user access
    - Ensure users can only access their own data
*/

-- Users Table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  fpl_manager_id INTEGER UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own data"
  ON users FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert own data"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- User Settings Table
CREATE TABLE IF NOT EXISTS user_settings (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  manager_id INTEGER,
  primary_league_id INTEGER,
  risk_tolerance TEXT CHECK (risk_tolerance IN ('conservative', 'balanced', 'aggressive')) DEFAULT 'balanced' NOT NULL,
  auto_captain BOOLEAN DEFAULT false NOT NULL,
  notifications_enabled BOOLEAN DEFAULT false NOT NULL,
  CONSTRAINT user_settings_user_id_idx UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS user_settings_user_id_idx ON user_settings(user_id);

ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own settings"
  ON user_settings FOR SELECT
  TO authenticated
  USING (user_id IN (SELECT id FROM users));

CREATE POLICY "Users can insert own settings"
  ON user_settings FOR INSERT
  TO authenticated
  WITH CHECK (user_id IN (SELECT id FROM users));

CREATE POLICY "Users can update own settings"
  ON user_settings FOR UPDATE
  TO authenticated
  USING (user_id IN (SELECT id FROM users))
  WITH CHECK (user_id IN (SELECT id FROM users));

-- User Teams Table
CREATE TABLE IF NOT EXISTS user_teams (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  gameweek INTEGER NOT NULL,
  players JSONB NOT NULL,
  formation TEXT NOT NULL,
  team_value INTEGER NOT NULL,
  bank INTEGER NOT NULL,
  transfers_made INTEGER NOT NULL DEFAULT 0,
  last_deadline_bank INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT user_teams_user_gameweek_unique UNIQUE (user_id, gameweek)
);

CREATE INDEX IF NOT EXISTS user_teams_user_id_idx ON user_teams(user_id);
CREATE INDEX IF NOT EXISTS user_teams_gameweek_idx ON user_teams(gameweek);
CREATE INDEX IF NOT EXISTS user_teams_user_gameweek_idx ON user_teams(user_id, gameweek);

ALTER TABLE user_teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own teams"
  ON user_teams FOR SELECT
  TO authenticated
  USING (user_id IN (SELECT id FROM users));

CREATE POLICY "Users can insert own teams"
  ON user_teams FOR INSERT
  TO authenticated
  WITH CHECK (user_id IN (SELECT id FROM users));

CREATE POLICY "Users can update own teams"
  ON user_teams FOR UPDATE
  TO authenticated
  USING (user_id IN (SELECT id FROM users))
  WITH CHECK (user_id IN (SELECT id FROM users));

-- Predictions Table
CREATE TABLE IF NOT EXISTS predictions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  gameweek INTEGER NOT NULL,
  player_id INTEGER NOT NULL,
  predicted_points REAL NOT NULL,
  actual_points REAL,
  confidence INTEGER NOT NULL,
  snapshot_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT predictions_user_gameweek_player_idx UNIQUE (user_id, gameweek, player_id)
);

CREATE INDEX IF NOT EXISTS predictions_user_id_idx ON predictions(user_id);
CREATE INDEX IF NOT EXISTS predictions_gameweek_idx ON predictions(gameweek);
CREATE INDEX IF NOT EXISTS predictions_player_id_idx ON predictions(player_id);
CREATE INDEX IF NOT EXISTS predictions_user_gameweek_idx ON predictions(user_id, gameweek);
CREATE INDEX IF NOT EXISTS predictions_snapshot_id_idx ON predictions(snapshot_id);

ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own predictions"
  ON predictions FOR SELECT
  TO authenticated
  USING (user_id IN (SELECT id FROM users));

CREATE POLICY "Users can insert own predictions"
  ON predictions FOR INSERT
  TO authenticated
  WITH CHECK (user_id IN (SELECT id FROM users));

CREATE POLICY "Users can update own predictions"
  ON predictions FOR UPDATE
  TO authenticated
  USING (user_id IN (SELECT id FROM users))
  WITH CHECK (user_id IN (SELECT id FROM users));

-- AI Team Predictions Table
CREATE TABLE IF NOT EXISTS ai_team_predictions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  request_data JSONB NOT NULL,
  status TEXT CHECK (status IN ('pending', 'processing', 'complete', 'error')) DEFAULT 'pending' NOT NULL,
  result JSONB,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS ai_team_predictions_user_id_idx ON ai_team_predictions(user_id);
CREATE INDEX IF NOT EXISTS ai_team_predictions_status_idx ON ai_team_predictions(status);

ALTER TABLE ai_team_predictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own ai predictions"
  ON ai_team_predictions FOR SELECT
  TO authenticated
  USING (user_id IN (SELECT id FROM users));

CREATE POLICY "Users can insert own ai predictions"
  ON ai_team_predictions FOR INSERT
  TO authenticated
  WITH CHECK (user_id IN (SELECT id FROM users));

CREATE POLICY "Users can update own ai predictions"
  ON ai_team_predictions FOR UPDATE
  TO authenticated
  USING (user_id IN (SELECT id FROM users))
  WITH CHECK (user_id IN (SELECT id FROM users));

-- Transfers Table
CREATE TABLE IF NOT EXISTS transfers (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  gameweek INTEGER NOT NULL,
  player_in_id INTEGER NOT NULL,
  player_out_id INTEGER NOT NULL,
  cost INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS transfers_user_id_idx ON transfers(user_id);
CREATE INDEX IF NOT EXISTS transfers_gameweek_idx ON transfers(gameweek);
CREATE INDEX IF NOT EXISTS transfers_user_gameweek_idx ON transfers(user_id, gameweek);

ALTER TABLE transfers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own transfers"
  ON transfers FOR SELECT
  TO authenticated
  USING (user_id IN (SELECT id FROM users));

CREATE POLICY "Users can insert own transfers"
  ON transfers FOR INSERT
  TO authenticated
  WITH CHECK (user_id IN (SELECT id FROM users));

-- Chips Used Table
CREATE TABLE IF NOT EXISTS chips_used (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  chip_type TEXT CHECK (chip_type IN ('wildcard', 'freehit', 'benchboost', 'triplecaptain')) NOT NULL,
  gameweek_used INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT chips_used_user_chip_gameweek_unique UNIQUE (user_id, chip_type, gameweek_used)
);

CREATE INDEX IF NOT EXISTS chips_used_user_id_idx ON chips_used(user_id);
CREATE INDEX IF NOT EXISTS chips_used_gameweek_idx ON chips_used(gameweek_used);

ALTER TABLE chips_used ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own chips"
  ON chips_used FOR SELECT
  TO authenticated
  USING (user_id IN (SELECT id FROM users));

CREATE POLICY "Users can insert own chips"
  ON chips_used FOR INSERT
  TO authenticated
  WITH CHECK (user_id IN (SELECT id FROM users));

-- FPL Credentials Table
CREATE TABLE IF NOT EXISTS fpl_credentials (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  email_encrypted TEXT,
  password_encrypted TEXT,
  session_cookies TEXT,
  cookies_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS fpl_credentials_user_id_idx ON fpl_credentials(user_id);

ALTER TABLE fpl_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own credentials"
  ON fpl_credentials FOR SELECT
  TO authenticated
  USING (user_id IN (SELECT id FROM users));

CREATE POLICY "Users can insert own credentials"
  ON fpl_credentials FOR INSERT
  TO authenticated
  WITH CHECK (user_id IN (SELECT id FROM users));

CREATE POLICY "Users can update own credentials"
  ON fpl_credentials FOR UPDATE
  TO authenticated
  USING (user_id IN (SELECT id FROM users))
  WITH CHECK (user_id IN (SELECT id FROM users));

-- Automation Settings Table
CREATE TABLE IF NOT EXISTS automation_settings (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  auto_sync_enabled BOOLEAN DEFAULT false NOT NULL,
  auto_apply_transfers BOOLEAN DEFAULT false NOT NULL,
  auto_apply_captain BOOLEAN DEFAULT false NOT NULL,
  auto_apply_chips BOOLEAN DEFAULT false NOT NULL,
  max_transfer_hit INTEGER DEFAULT 8 NOT NULL,
  notification_enabled BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS automation_settings_user_id_idx ON automation_settings(user_id);

ALTER TABLE automation_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own automation settings"
  ON automation_settings FOR SELECT
  TO authenticated
  USING (user_id IN (SELECT id FROM users));

CREATE POLICY "Users can insert own automation settings"
  ON automation_settings FOR INSERT
  TO authenticated
  WITH CHECK (user_id IN (SELECT id FROM users));

CREATE POLICY "Users can update own automation settings"
  ON automation_settings FOR UPDATE
  TO authenticated
  USING (user_id IN (SELECT id FROM users))
  WITH CHECK (user_id IN (SELECT id FROM users));

-- Gameweek Plans Table
CREATE TABLE IF NOT EXISTS gameweek_plans (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  gameweek INTEGER NOT NULL,
  transfers JSONB NOT NULL,
  lineup_optimizations JSONB,
  captain_id INTEGER,
  vice_captain_id INTEGER,
  chip_to_play TEXT CHECK (chip_to_play IN ('wildcard', 'freehit', 'benchboost', 'triplecaptain')),
  formation TEXT NOT NULL,
  lineup JSONB,
  predicted_points INTEGER NOT NULL,
  baseline_predicted_points INTEGER,
  confidence INTEGER NOT NULL,
  ai_reasoning TEXT NOT NULL,
  status TEXT CHECK (status IN ('pending', 'previewed', 'applied', 'rejected')) DEFAULT 'pending' NOT NULL,
  applied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  original_team_snapshot JSONB,
  actual_points_with_ai INTEGER,
  actual_points_without_ai INTEGER,
  points_delta INTEGER,
  analysis_completed_at TIMESTAMPTZ,
  prediction_analysis TEXT,
  recommendations_changed BOOLEAN DEFAULT false,
  change_reasoning TEXT,
  snapshot_id TEXT,
  snapshot_gameweek INTEGER,
  snapshot_timestamp TIMESTAMPTZ,
  snapshot_enriched BOOLEAN,
  submitted BOOLEAN DEFAULT false,
  submitted_at TIMESTAMPTZ,
  data_source TEXT CHECK (data_source IN ('live', 'fallback')),
  is_what_if BOOLEAN DEFAULT false
);

CREATE INDEX IF NOT EXISTS gameweek_plans_user_id_idx ON gameweek_plans(user_id);
CREATE INDEX IF NOT EXISTS gameweek_plans_gameweek_idx ON gameweek_plans(gameweek);
CREATE INDEX IF NOT EXISTS gameweek_plans_user_gameweek_idx ON gameweek_plans(user_id, gameweek);

ALTER TABLE gameweek_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own plans"
  ON gameweek_plans FOR SELECT
  TO authenticated
  USING (user_id IN (SELECT id FROM users));

CREATE POLICY "Users can insert own plans"
  ON gameweek_plans FOR INSERT
  TO authenticated
  WITH CHECK (user_id IN (SELECT id FROM users));

CREATE POLICY "Users can update own plans"
  ON gameweek_plans FOR UPDATE
  TO authenticated
  USING (user_id IN (SELECT id FROM users))
  WITH CHECK (user_id IN (SELECT id FROM users));

CREATE POLICY "Users can delete own plans"
  ON gameweek_plans FOR DELETE
  TO authenticated
  USING (user_id IN (SELECT id FROM users));

-- Change History Table
CREATE TABLE IF NOT EXISTS change_history (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  gameweek INTEGER NOT NULL,
  change_type TEXT CHECK (change_type IN ('transfer', 'captain', 'chip', 'formation')) NOT NULL,
  change_data JSONB NOT NULL,
  applied_successfully BOOLEAN NOT NULL,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS change_history_user_id_idx ON change_history(user_id);
CREATE INDEX IF NOT EXISTS change_history_gameweek_idx ON change_history(gameweek);
CREATE INDEX IF NOT EXISTS change_history_user_gameweek_idx ON change_history(user_id, gameweek);

ALTER TABLE change_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own history"
  ON change_history FOR SELECT
  TO authenticated
  USING (user_id IN (SELECT id FROM users));

CREATE POLICY "Users can insert own history"
  ON change_history FOR INSERT
  TO authenticated
  WITH CHECK (user_id IN (SELECT id FROM users));

-- Applied Lineups Table
CREATE TABLE IF NOT EXISTS applied_lineups (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  gameweek INTEGER NOT NULL,
  lineup JSONB NOT NULL,
  formation TEXT NOT NULL,
  captain_id INTEGER NOT NULL,
  vice_captain_id INTEGER NOT NULL,
  source_plan_id INTEGER REFERENCES gameweek_plans(id),
  source_type TEXT CHECK (source_type IN ('plan', 'manual')) DEFAULT 'plan' NOT NULL,
  applied_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT applied_lineups_user_gameweek_unique UNIQUE (user_id, gameweek)
);

CREATE INDEX IF NOT EXISTS applied_lineups_user_id_idx ON applied_lineups(user_id);
CREATE INDEX IF NOT EXISTS applied_lineups_gameweek_idx ON applied_lineups(gameweek);

ALTER TABLE applied_lineups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own lineups"
  ON applied_lineups FOR SELECT
  TO authenticated
  USING (user_id IN (SELECT id FROM users));

CREATE POLICY "Users can insert own lineups"
  ON applied_lineups FOR INSERT
  TO authenticated
  WITH CHECK (user_id IN (SELECT id FROM users));

CREATE POLICY "Users can update own lineups"
  ON applied_lineups FOR UPDATE
  TO authenticated
  USING (user_id IN (SELECT id FROM users))
  WITH CHECK (user_id IN (SELECT id FROM users));

CREATE POLICY "Users can delete own lineups"
  ON applied_lineups FOR DELETE
  TO authenticated
  USING (user_id IN (SELECT id FROM users));

-- AI Precomputations Table
CREATE TABLE IF NOT EXISTS ai_precomputations (
  id SERIAL PRIMARY KEY,
  snapshot_id TEXT NOT NULL,
  gameweek INTEGER NOT NULL,
  computation_type TEXT CHECK (computation_type IN ('player_projections', 'fixture_difficulty', 'captain_shortlist', 'chip_heuristics')) NOT NULL,
  player_id INTEGER,
  result JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT ai_precomp_snapshot_type_player_unique UNIQUE (snapshot_id, computation_type, player_id)
);

CREATE INDEX IF NOT EXISTS ai_precomp_snapshot_id_idx ON ai_precomputations(snapshot_id);
CREATE INDEX IF NOT EXISTS ai_precomp_gameweek_idx ON ai_precomputations(gameweek);
CREATE INDEX IF NOT EXISTS ai_precomp_type_idx ON ai_precomputations(computation_type);
CREATE INDEX IF NOT EXISTS ai_precomp_player_id_idx ON ai_precomputations(player_id);

ALTER TABLE ai_precomputations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can read precomputations"
  ON ai_precomputations FOR SELECT
  TO authenticated
  USING (true);

-- AI Decision Ledger Table
CREATE TABLE IF NOT EXISTS ai_decision_ledger (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  plan_id INTEGER REFERENCES gameweek_plans(id) ON DELETE CASCADE,
  snapshot_id TEXT NOT NULL,
  gameweek INTEGER NOT NULL,
  decision_type TEXT CHECK (decision_type IN ('gameweek_plan', 'transfer', 'captain', 'chip', 'prediction')) NOT NULL,
  inputs_fingerprint TEXT NOT NULL,
  model_version TEXT NOT NULL,
  confidence INTEGER,
  uncertainty_reasons JSONB,
  overrides JSONB,
  decision_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS ai_decision_user_id_idx ON ai_decision_ledger(user_id);
CREATE INDEX IF NOT EXISTS ai_decision_plan_id_idx ON ai_decision_ledger(plan_id);
CREATE INDEX IF NOT EXISTS ai_decision_snapshot_id_idx ON ai_decision_ledger(snapshot_id);
CREATE INDEX IF NOT EXISTS ai_decision_gameweek_idx ON ai_decision_ledger(gameweek);
CREATE INDEX IF NOT EXISTS ai_decision_type_idx ON ai_decision_ledger(decision_type);

ALTER TABLE ai_decision_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own decisions"
  ON ai_decision_ledger FOR SELECT
  TO authenticated
  USING (user_id IN (SELECT id FROM users));

CREATE POLICY "Users can insert own decisions"
  ON ai_decision_ledger FOR INSERT
  TO authenticated
  WITH CHECK (user_id IN (SELECT id FROM users));

-- Multi Week Transfer Predictions Table
CREATE TABLE IF NOT EXISTS multi_week_transfer_predictions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  gameweek_plan_id INTEGER REFERENCES gameweek_plans(id) ON DELETE CASCADE NOT NULL,
  start_gameweek INTEGER NOT NULL,
  player_out_id INTEGER NOT NULL,
  player_in_id INTEGER NOT NULL,
  predicted_gain REAL NOT NULL,
  timeframe_weeks INTEGER DEFAULT 6 NOT NULL,
  status TEXT CHECK (status IN ('pending', 'tracking', 'completed', 'voided')) DEFAULT 'pending' NOT NULL,
  weeks_elapsed INTEGER DEFAULT 0 NOT NULL,
  points_actual_to_date REAL DEFAULT 0 NOT NULL,
  actual_gain_final REAL,
  accuracy_percent REAL,
  void_reason TEXT,
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS multi_week_transfer_pred_user_status_closed_idx ON multi_week_transfer_predictions(user_id, status, closed_at);
CREATE INDEX IF NOT EXISTS multi_week_transfer_pred_plan_idx ON multi_week_transfer_predictions(gameweek_plan_id);
CREATE INDEX IF NOT EXISTS multi_week_transfer_pred_status_gw_idx ON multi_week_transfer_predictions(status, start_gameweek);

ALTER TABLE multi_week_transfer_predictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own multi week predictions"
  ON multi_week_transfer_predictions FOR SELECT
  TO authenticated
  USING (user_id IN (SELECT id FROM users));

CREATE POLICY "Users can insert own multi week predictions"
  ON multi_week_transfer_predictions FOR INSERT
  TO authenticated
  WITH CHECK (user_id IN (SELECT id FROM users));

CREATE POLICY "Users can update own multi week predictions"
  ON multi_week_transfer_predictions FOR UPDATE
  TO authenticated
  USING (user_id IN (SELECT id FROM users))
  WITH CHECK (user_id IN (SELECT id FROM users));

-- Scheduler State Table
CREATE TABLE IF NOT EXISTS scheduler_state (
  id SERIAL PRIMARY KEY,
  job_name VARCHAR(50) UNIQUE NOT NULL,
  last_run_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE scheduler_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can read scheduler state"
  ON scheduler_state FOR SELECT
  TO authenticated
  USING (true);

-- Prediction Bias Metrics Table
CREATE TABLE IF NOT EXISTS prediction_bias_metrics (
  id SERIAL PRIMARY KEY,
  gameweek INTEGER NOT NULL,
  position TEXT CHECK (position IN ('GK', 'DEF', 'MID', 'FWD', 'ALL')) NOT NULL,
  sample_size INTEGER DEFAULT 0 NOT NULL,
  mean_absolute_error REAL DEFAULT 0 NOT NULL,
  mean_bias REAL DEFAULT 0 NOT NULL,
  root_mean_square_error REAL DEFAULT 0 NOT NULL,
  calibration_factor REAL DEFAULT 1.0 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT prediction_bias_gw_position_unique UNIQUE (gameweek, position)
);

CREATE INDEX IF NOT EXISTS prediction_bias_gameweek_idx ON prediction_bias_metrics(gameweek);
CREATE INDEX IF NOT EXISTS prediction_bias_position_idx ON prediction_bias_metrics(position);

ALTER TABLE prediction_bias_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can read bias metrics"
  ON prediction_bias_metrics FOR SELECT
  TO authenticated
  USING (true);

-- Player Minutes History Table
CREATE TABLE IF NOT EXISTS player_minutes_history (
  id SERIAL PRIMARY KEY,
  player_id INTEGER NOT NULL,
  gameweek INTEGER NOT NULL,
  season INTEGER DEFAULT 2024 NOT NULL,
  minutes_played INTEGER DEFAULT 0 NOT NULL,
  was_in_starting_xi BOOLEAN DEFAULT false NOT NULL,
  was_substituted BOOLEAN DEFAULT false NOT NULL,
  injury_flag TEXT,
  chance_of_playing INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT player_minutes_player_gw_unique UNIQUE (player_id, gameweek, season)
);

CREATE INDEX IF NOT EXISTS player_minutes_player_id_idx ON player_minutes_history(player_id);
CREATE INDEX IF NOT EXISTS player_minutes_gameweek_idx ON player_minutes_history(gameweek);

ALTER TABLE player_minutes_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can read minutes history"
  ON player_minutes_history FOR SELECT
  TO authenticated
  USING (true);

-- Prediction Evaluations Table
CREATE TABLE IF NOT EXISTS prediction_evaluations (
  id SERIAL PRIMARY KEY,
  gameweek INTEGER NOT NULL,
  total_predictions INTEGER DEFAULT 0 NOT NULL,
  predictions_with_actuals INTEGER DEFAULT 0 NOT NULL,
  overall_mae REAL DEFAULT 0 NOT NULL,
  overall_bias REAL DEFAULT 0 NOT NULL,
  gk_mae REAL DEFAULT 0,
  def_mae REAL DEFAULT 0,
  mid_mae REAL DEFAULT 0,
  fwd_mae REAL DEFAULT 0,
  gk_bias REAL DEFAULT 0,
  def_bias REAL DEFAULT 0,
  mid_bias REAL DEFAULT 0,
  fwd_bias REAL DEFAULT 0,
  top_overpredictions JSONB,
  top_underpredictions JSONB,
  lessons_learned JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT prediction_evaluations_gw_unique UNIQUE (gameweek)
);

CREATE INDEX IF NOT EXISTS prediction_evaluations_gameweek_idx ON prediction_evaluations(gameweek);

ALTER TABLE prediction_evaluations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can read evaluations"
  ON prediction_evaluations FOR SELECT
  TO authenticated
  USING (true);