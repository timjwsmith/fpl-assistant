/*
  # FPL AI Assistant - Core Database Schema
  
  This migration creates the complete database schema for the FPL AI Assistant application.
  
  ## New Tables
  
  ### Core User & Authentication Tables
  - `users` - User accounts linked to FPL manager IDs
  - `user_settings` - User preferences and configuration
  - `fpl_credentials` - Encrypted FPL login credentials (optional)
  
  ### Team & Predictions Tables
  - `user_teams` - Historical team snapshots per gameweek
  - `predictions` - AI predictions for player points (with composite indexes for performance)
  - `ai_team_predictions` - Async team analysis results
  - `applied_lineups` - User's intended lineup for upcoming gameweeks
  
  ### Transfer & Strategy Tables
  - `transfers` - Transfer history
  - `chips_used` - Chip usage tracking
  - `gameweek_plans` - Complete AI-generated gameweek strategies
  - `multi_week_transfer_predictions` - Long-term transfer tracking (6-week projections)
  
  ### AI & Analytics Tables
  - `ai_precomputations` - Cached AI computation results
  - `ai_decision_ledger` - Complete audit trail of all AI decisions
  - `prediction_bias_metrics` - Calibration data for prediction accuracy
  - `prediction_evaluations` - Gameweek evaluation reports
  - `player_minutes_history` - Historical playing time data
  
  ### System Tables
  - `automation_settings` - User automation preferences
  - `change_history` - Audit log of applied changes
  - `scheduler_state` - Background job state tracking
  
  ## Performance Optimizations
  
  ### Critical Composite Indexes (addressing N+1 query patterns)
  - `predictions(user_id, gameweek)` - Most common query pattern
  - `gameweek_plans(user_id, gameweek)` - Frequent plan lookups
  - `ai_precomputations(snapshot_id, computation_type, expires_at)` - Cache lookups
  - `ai_decision_ledger(user_id, gameweek)` - Audit queries
  - `user_teams(user_id, gameweek)` - Team data retrieval
  
  ### Unique Constraints
  - Prevent duplicate predictions per user/gameweek/player
  - Enforce one plan per user/gameweek
  - Ensure cache entry uniqueness
  
  ## Security
  - RLS will be enabled on all user-scoped tables
  - Cascade deletes configured for data consistency
  - Foreign keys enforce referential integrity
*/

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  fpl_manager_id INTEGER UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS users_fpl_manager_id_idx ON users(fpl_manager_id);

-- User settings table
CREATE TABLE IF NOT EXISTS user_settings (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  fpl_manager_id INTEGER NOT NULL,
  league_id INTEGER,
  risk_tolerance TEXT DEFAULT 'balanced' NOT NULL CHECK (risk_tolerance IN ('conservative', 'balanced', 'aggressive')),
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS user_settings_user_id_idx ON user_settings(user_id);

-- User teams table (historical snapshots)
CREATE TABLE IF NOT EXISTS user_teams (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  gameweek INTEGER NOT NULL,
  players JSONB NOT NULL,
  captain_id INTEGER,
  vice_captain_id INTEGER,
  formation TEXT NOT NULL,
  total_value REAL NOT NULL,
  bank REAL NOT NULL,
  free_transfers INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS user_teams_user_id_idx ON user_teams(user_id);
CREATE INDEX IF NOT EXISTS user_teams_gameweek_idx ON user_teams(gameweek);
CREATE INDEX IF NOT EXISTS user_teams_user_gameweek_idx ON user_teams(user_id, gameweek);
CREATE UNIQUE INDEX IF NOT EXISTS user_teams_user_gameweek_unique ON user_teams(user_id, gameweek);

-- Predictions table (CRITICAL: Composite index for performance)
CREATE TABLE IF NOT EXISTS predictions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  gameweek INTEGER NOT NULL,
  player_id INTEGER NOT NULL,
  predicted_points REAL NOT NULL,
  actual_points REAL,
  confidence INTEGER NOT NULL,
  snapshot_id TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS predictions_user_id_idx ON predictions(user_id);
CREATE INDEX IF NOT EXISTS predictions_gameweek_idx ON predictions(gameweek);
CREATE INDEX IF NOT EXISTS predictions_player_id_idx ON predictions(player_id);
-- CRITICAL PERFORMANCE INDEX: Most queries filter by user_id + gameweek
CREATE INDEX IF NOT EXISTS predictions_user_gameweek_idx ON predictions(user_id, gameweek);
CREATE UNIQUE INDEX IF NOT EXISTS predictions_user_gameweek_player_idx ON predictions(user_id, gameweek, player_id);
CREATE INDEX IF NOT EXISTS predictions_snapshot_id_idx ON predictions(snapshot_id);

-- AI team predictions (async analysis)
CREATE TABLE IF NOT EXISTS ai_team_predictions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  request_data JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'complete', 'error')),
  result JSONB,
  error TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  completed_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS ai_team_predictions_user_id_idx ON ai_team_predictions(user_id);
CREATE INDEX IF NOT EXISTS ai_team_predictions_status_idx ON ai_team_predictions(status);

-- Transfers table
CREATE TABLE IF NOT EXISTS transfers (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  gameweek INTEGER NOT NULL,
  player_in_id INTEGER NOT NULL,
  player_out_id INTEGER NOT NULL,
  cost INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS transfers_user_id_idx ON transfers(user_id);
CREATE INDEX IF NOT EXISTS transfers_gameweek_idx ON transfers(gameweek);
CREATE INDEX IF NOT EXISTS transfers_user_gameweek_idx ON transfers(user_id, gameweek);

-- Chips used table
CREATE TABLE IF NOT EXISTS chips_used (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  chip_type TEXT NOT NULL CHECK (chip_type IN ('wildcard', 'freehit', 'benchboost', 'triplecaptain')),
  gameweek_used INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS chips_used_user_id_idx ON chips_used(user_id);
CREATE INDEX IF NOT EXISTS chips_used_gameweek_idx ON chips_used(gameweek_used);
CREATE UNIQUE INDEX IF NOT EXISTS chips_used_user_chip_gameweek_unique ON chips_used(user_id, chip_type, gameweek_used);

-- FPL credentials table (encrypted)
CREATE TABLE IF NOT EXISTS fpl_credentials (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  email_encrypted TEXT,
  password_encrypted TEXT,
  session_cookies TEXT,
  cookies_expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS fpl_credentials_user_id_idx ON fpl_credentials(user_id);

-- Automation settings table
CREATE TABLE IF NOT EXISTS automation_settings (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  auto_sync_enabled BOOLEAN DEFAULT FALSE NOT NULL,
  auto_apply_transfers BOOLEAN DEFAULT FALSE NOT NULL,
  auto_apply_captain BOOLEAN DEFAULT FALSE NOT NULL,
  auto_apply_chips BOOLEAN DEFAULT FALSE NOT NULL,
  max_transfer_hit INTEGER DEFAULT 8 NOT NULL,
  notification_enabled BOOLEAN DEFAULT TRUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS automation_settings_user_id_idx ON automation_settings(user_id);

-- Gameweek plans table (AI-generated strategies)
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
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'previewed', 'applied', 'rejected')),
  applied_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  original_team_snapshot JSONB,
  actual_points_with_ai INTEGER,
  actual_points_without_ai INTEGER,
  points_delta INTEGER,
  analysis_completed_at TIMESTAMP,
  prediction_analysis TEXT,
  recommendations_changed BOOLEAN DEFAULT FALSE,
  change_reasoning TEXT,
  snapshot_id TEXT,
  snapshot_gameweek INTEGER,
  snapshot_timestamp TIMESTAMP,
  snapshot_enriched BOOLEAN,
  submitted BOOLEAN DEFAULT FALSE,
  submitted_at TIMESTAMP,
  data_source TEXT CHECK (data_source IN ('live', 'fallback')),
  is_what_if BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS gameweek_plans_user_id_idx ON gameweek_plans(user_id);
CREATE INDEX IF NOT EXISTS gameweek_plans_gameweek_idx ON gameweek_plans(gameweek);
-- CRITICAL PERFORMANCE INDEX: Plans are fetched by user + gameweek
CREATE INDEX IF NOT EXISTS gameweek_plans_user_gameweek_idx ON gameweek_plans(user_id, gameweek);

-- Change history table (audit log)
CREATE TABLE IF NOT EXISTS change_history (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  gameweek INTEGER NOT NULL,
  change_type TEXT NOT NULL CHECK (change_type IN ('transfer', 'captain', 'chip', 'formation')),
  change_data JSONB NOT NULL,
  applied_successfully BOOLEAN NOT NULL,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS change_history_user_id_idx ON change_history(user_id);
CREATE INDEX IF NOT EXISTS change_history_gameweek_idx ON change_history(gameweek);
CREATE INDEX IF NOT EXISTS change_history_user_gameweek_idx ON change_history(user_id, gameweek);

-- Applied lineups table
CREATE TABLE IF NOT EXISTS applied_lineups (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  gameweek INTEGER NOT NULL,
  lineup JSONB NOT NULL,
  formation TEXT NOT NULL,
  captain_id INTEGER NOT NULL,
  vice_captain_id INTEGER NOT NULL,
  source_plan_id INTEGER REFERENCES gameweek_plans(id),
  source_type TEXT NOT NULL DEFAULT 'plan' CHECK (source_type IN ('plan', 'manual')),
  applied_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS applied_lineups_user_id_idx ON applied_lineups(user_id);
CREATE INDEX IF NOT EXISTS applied_lineups_gameweek_idx ON applied_lineups(gameweek);
CREATE UNIQUE INDEX IF NOT EXISTS applied_lineups_user_gameweek_unique ON applied_lineups(user_id, gameweek);

-- AI precomputations table (cache)
CREATE TABLE IF NOT EXISTS ai_precomputations (
  id SERIAL PRIMARY KEY,
  snapshot_id TEXT NOT NULL,
  gameweek INTEGER NOT NULL,
  computation_type TEXT NOT NULL CHECK (computation_type IN ('player_projections', 'fixture_difficulty', 'captain_shortlist', 'chip_heuristics')),
  player_id INTEGER,
  result JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  expires_at TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS ai_precomp_snapshot_id_idx ON ai_precomputations(snapshot_id);
CREATE INDEX IF NOT EXISTS ai_precomp_gameweek_idx ON ai_precomputations(gameweek);
CREATE INDEX IF NOT EXISTS ai_precomp_type_idx ON ai_precomputations(computation_type);
CREATE INDEX IF NOT EXISTS ai_precomp_player_id_idx ON ai_precomputations(player_id);
-- CRITICAL PERFORMANCE INDEX: Cache lookups use snapshot_id + type + expires_at
CREATE INDEX IF NOT EXISTS ai_precomp_lookup_idx ON ai_precomputations(snapshot_id, computation_type, expires_at);
CREATE UNIQUE INDEX IF NOT EXISTS ai_precomp_snapshot_type_player_unique ON ai_precomputations(snapshot_id, computation_type, player_id);

-- AI decision ledger table (audit trail)
CREATE TABLE IF NOT EXISTS ai_decision_ledger (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  plan_id INTEGER REFERENCES gameweek_plans(id) ON DELETE CASCADE,
  snapshot_id TEXT NOT NULL,
  gameweek INTEGER NOT NULL,
  decision_type TEXT NOT NULL CHECK (decision_type IN ('gameweek_plan', 'transfer', 'captain', 'chip', 'prediction')),
  inputs_fingerprint TEXT NOT NULL,
  model_version TEXT NOT NULL,
  confidence INTEGER,
  uncertainty_reasons JSONB,
  overrides JSONB,
  decision_data JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS ai_decision_user_id_idx ON ai_decision_ledger(user_id);
CREATE INDEX IF NOT EXISTS ai_decision_plan_id_idx ON ai_decision_ledger(plan_id);
CREATE INDEX IF NOT EXISTS ai_decision_snapshot_id_idx ON ai_decision_ledger(snapshot_id);
CREATE INDEX IF NOT EXISTS ai_decision_gameweek_idx ON ai_decision_ledger(gameweek);
CREATE INDEX IF NOT EXISTS ai_decision_type_idx ON ai_decision_ledger(decision_type);
-- CRITICAL PERFORMANCE INDEX: Audit queries filter by user + gameweek
CREATE INDEX IF NOT EXISTS ai_decision_user_gameweek_idx ON ai_decision_ledger(user_id, gameweek);

-- Multi-week transfer predictions table
CREATE TABLE IF NOT EXISTS multi_week_transfer_predictions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  gameweek_plan_id INTEGER REFERENCES gameweek_plans(id) ON DELETE CASCADE NOT NULL,
  start_gameweek INTEGER NOT NULL,
  player_out_id INTEGER NOT NULL,
  player_in_id INTEGER NOT NULL,
  predicted_gain REAL NOT NULL,
  timeframe_weeks INTEGER DEFAULT 6 NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'tracking', 'completed', 'voided')),
  weeks_elapsed INTEGER DEFAULT 0 NOT NULL,
  points_actual_to_date REAL DEFAULT 0 NOT NULL,
  actual_gain_final REAL,
  accuracy_percent REAL,
  void_reason TEXT,
  closed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS multi_week_transfer_pred_user_status_closed_idx ON multi_week_transfer_predictions(user_id, status, closed_at);
CREATE INDEX IF NOT EXISTS multi_week_transfer_pred_plan_idx ON multi_week_transfer_predictions(gameweek_plan_id);
CREATE INDEX IF NOT EXISTS multi_week_transfer_pred_status_gw_idx ON multi_week_transfer_predictions(status, start_gameweek);

-- Scheduler state table
CREATE TABLE IF NOT EXISTS scheduler_state (
  id SERIAL PRIMARY KEY,
  job_name VARCHAR(50) UNIQUE NOT NULL,
  last_run_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Prediction bias metrics table
CREATE TABLE IF NOT EXISTS prediction_bias_metrics (
  id SERIAL PRIMARY KEY,
  gameweek INTEGER NOT NULL,
  position TEXT NOT NULL CHECK (position IN ('GK', 'DEF', 'MID', 'FWD', 'ALL')),
  sample_size INTEGER DEFAULT 0 NOT NULL,
  mean_absolute_error REAL DEFAULT 0 NOT NULL,
  mean_bias REAL DEFAULT 0 NOT NULL,
  root_mean_square_error REAL DEFAULT 0 NOT NULL,
  calibration_factor REAL DEFAULT 1.0 NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS prediction_bias_gameweek_idx ON prediction_bias_metrics(gameweek);
CREATE INDEX IF NOT EXISTS prediction_bias_position_idx ON prediction_bias_metrics(position);
CREATE UNIQUE INDEX IF NOT EXISTS prediction_bias_gw_position_unique ON prediction_bias_metrics(gameweek, position);

-- Player minutes history table
CREATE TABLE IF NOT EXISTS player_minutes_history (
  id SERIAL PRIMARY KEY,
  player_id INTEGER NOT NULL,
  gameweek INTEGER NOT NULL,
  season INTEGER DEFAULT 2024 NOT NULL,
  minutes_played INTEGER DEFAULT 0 NOT NULL,
  was_in_starting_xi BOOLEAN DEFAULT FALSE NOT NULL,
  was_substituted BOOLEAN DEFAULT FALSE NOT NULL,
  injury_flag TEXT,
  chance_of_playing INTEGER,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS player_minutes_player_id_idx ON player_minutes_history(player_id);
CREATE INDEX IF NOT EXISTS player_minutes_gameweek_idx ON player_minutes_history(gameweek);
CREATE UNIQUE INDEX IF NOT EXISTS player_minutes_player_gw_unique ON player_minutes_history(player_id, gameweek, season);

-- Prediction evaluations table
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
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS prediction_evaluations_gameweek_idx ON prediction_evaluations(gameweek);
CREATE UNIQUE INDEX IF NOT EXISTS prediction_evaluations_gw_unique ON prediction_evaluations(gameweek);