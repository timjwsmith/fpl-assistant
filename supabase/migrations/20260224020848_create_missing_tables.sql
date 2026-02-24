/*
  # Create missing tables for FPL AI application

  1. New Tables
    - `ai_team_predictions` - AI predictions for team selections
    - `fpl_credentials` - Encrypted FPL login credentials
    - `automation_settings` - User automation preferences
    - `gameweek_plans` - Multi-gameweek planning data
    - `change_history` - Track changes to gameweek plans
    - `applied_lineups` - Track which lineups were applied
    - `ai_precomputations` - Cache for AI predictions
    - `ai_decision_ledger` - Log of AI decisions
    - `multi_week_transfer_predictions` - Multi-week transfer planning
    - `scheduler_state` - State for automation scheduler
    - `prediction_bias_metrics` - Track prediction accuracy metrics
    - `player_minutes_history` - Historical player minutes data
    - `prediction_evaluations` - Evaluation of prediction performance

  2. Table Details
    - All tables include proper timestamps
    - Foreign key relationships to users table
    - Appropriate indexes for performance
    - Default values where applicable

  3. Security
    - RLS will be enabled in a separate migration after initial setup
*/

-- AI Team Predictions
CREATE TABLE IF NOT EXISTS ai_team_predictions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  gameweek INTEGER NOT NULL,
  predicted_team JSONB NOT NULL,
  predicted_score INTEGER NOT NULL,
  confidence INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_team_predictions_user_gameweek_idx ON ai_team_predictions(user_id, gameweek);

-- FPL Credentials (encrypted)
CREATE TABLE IF NOT EXISTS fpl_credentials (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) UNIQUE,
  encrypted_email TEXT NOT NULL,
  encrypted_password TEXT NOT NULL,
  last_sync TIMESTAMP,
  sync_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Automation Settings
CREATE TABLE IF NOT EXISTS automation_settings (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) UNIQUE,
  auto_transfer BOOLEAN DEFAULT false,
  auto_captain BOOLEAN DEFAULT false,
  auto_bench BOOLEAN DEFAULT false,
  max_transfer_cost INTEGER DEFAULT 4,
  min_bank_balance INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Gameweek Plans
CREATE TABLE IF NOT EXISTS gameweek_plans (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  gameweek INTEGER NOT NULL,
  team_snapshot JSONB NOT NULL,
  proposed_transfers JSONB,
  proposed_captain INTEGER,
  proposed_vice_captain INTEGER,
  proposed_formation TEXT,
  proposed_bench_order JSONB,
  chip_recommendation TEXT,
  predicted_points INTEGER,
  expected_value REAL,
  confidence_score REAL,
  reasoning TEXT,
  status TEXT DEFAULT 'draft',
  applied_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE INDEX IF NOT EXISTS gameweek_plans_user_gameweek_idx ON gameweek_plans(user_id, gameweek);
CREATE INDEX IF NOT EXISTS gameweek_plans_status_idx ON gameweek_plans(status);

-- Change History
CREATE TABLE IF NOT EXISTS change_history (
  id SERIAL PRIMARY KEY,
  plan_id INTEGER NOT NULL REFERENCES gameweek_plans(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  change_type TEXT NOT NULL,
  previous_value JSONB,
  new_value JSONB,
  reason TEXT,
  created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX IF NOT EXISTS change_history_plan_idx ON change_history(plan_id);

-- Applied Lineups
CREATE TABLE IF NOT EXISTS applied_lineups (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  gameweek INTEGER NOT NULL,
  plan_id INTEGER REFERENCES gameweek_plans(id),
  lineup JSONB NOT NULL,
  captain INTEGER NOT NULL,
  vice_captain INTEGER NOT NULL,
  formation TEXT NOT NULL,
  bench_order JSONB NOT NULL,
  transfers_made JSONB,
  chip_used TEXT,
  applied_at TIMESTAMP DEFAULT now(),
  actual_points INTEGER,
  points_recorded_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS applied_lineups_user_gameweek_idx ON applied_lineups(user_id, gameweek);

-- AI Precomputations Cache
CREATE TABLE IF NOT EXISTS ai_precomputations (
  id SERIAL PRIMARY KEY,
  gameweek INTEGER NOT NULL,
  computation_type TEXT NOT NULL,
  cache_key TEXT NOT NULL,
  cached_data JSONB NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS ai_precomputations_key_idx ON ai_precomputations(computation_type, cache_key, gameweek);
CREATE INDEX IF NOT EXISTS ai_precomputations_expires_idx ON ai_precomputations(expires_at);

-- AI Decision Ledger
CREATE TABLE IF NOT EXISTS ai_decision_ledger (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  gameweek INTEGER NOT NULL,
  decision_type TEXT NOT NULL,
  decision_data JSONB NOT NULL,
  reasoning TEXT NOT NULL,
  confidence REAL NOT NULL,
  outcome TEXT,
  actual_result JSONB,
  created_at TIMESTAMP DEFAULT now(),
  evaluated_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS ai_decision_ledger_user_gameweek_idx ON ai_decision_ledger(user_id, gameweek);
CREATE INDEX IF NOT EXISTS ai_decision_ledger_type_idx ON ai_decision_ledger(decision_type);

-- Multi-Week Transfer Predictions
CREATE TABLE IF NOT EXISTS multi_week_transfer_predictions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  start_gameweek INTEGER NOT NULL,
  end_gameweek INTEGER NOT NULL,
  transfer_plan JSONB NOT NULL,
  expected_total_points REAL NOT NULL,
  expected_rank_change INTEGER,
  confidence REAL NOT NULL,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE INDEX IF NOT EXISTS multi_week_predictions_user_idx ON multi_week_transfer_predictions(user_id, start_gameweek);

-- Scheduler State
CREATE TABLE IF NOT EXISTS scheduler_state (
  id SERIAL PRIMARY KEY,
  task_name TEXT NOT NULL UNIQUE,
  last_run TIMESTAMP,
  next_run TIMESTAMP,
  status TEXT DEFAULT 'idle',
  error_message TEXT,
  run_count INTEGER DEFAULT 0,
  updated_at TIMESTAMP DEFAULT now()
);

-- Prediction Bias Metrics
CREATE TABLE IF NOT EXISTS prediction_bias_metrics (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  metric_type TEXT NOT NULL,
  gameweek INTEGER NOT NULL,
  predicted_value REAL NOT NULL,
  actual_value REAL,
  error_margin REAL,
  bias_direction TEXT,
  created_at TIMESTAMP DEFAULT now(),
  evaluated_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS prediction_bias_user_gameweek_idx ON prediction_bias_metrics(user_id, gameweek);

-- Player Minutes History
CREATE TABLE IF NOT EXISTS player_minutes_history (
  id SERIAL PRIMARY KEY,
  player_id INTEGER NOT NULL,
  gameweek INTEGER NOT NULL,
  minutes_played INTEGER NOT NULL,
  was_in_starting_xi BOOLEAN NOT NULL,
  position VARCHAR(3) NOT NULL,
  team_id INTEGER NOT NULL,
  opponent_team_id INTEGER NOT NULL,
  was_home BOOLEAN NOT NULL,
  created_at TIMESTAMP DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS player_minutes_unique_idx ON player_minutes_history(player_id, gameweek);
CREATE INDEX IF NOT EXISTS player_minutes_player_idx ON player_minutes_history(player_id);

-- Prediction Evaluations
CREATE TABLE IF NOT EXISTS prediction_evaluations (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  gameweek INTEGER NOT NULL,
  prediction_type TEXT NOT NULL,
  predicted_outcome JSONB NOT NULL,
  actual_outcome JSONB,
  accuracy_score REAL,
  error_analysis JSONB,
  created_at TIMESTAMP DEFAULT now(),
  evaluated_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS prediction_eval_user_gameweek_idx ON prediction_evaluations(user_id, gameweek);

-- Update user_settings to add primary_league_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_settings' AND column_name = 'primary_league_id'
  ) THEN
    ALTER TABLE user_settings ADD COLUMN primary_league_id INTEGER;
  END IF;
END $$;
