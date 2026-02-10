/*
  # Fix user_teams table schema mismatch

  1. Changes
    - Remove columns: captain_id, vice_captain_id, total_value, free_transfers
    - Add columns: team_value, transfers_made, last_deadline_bank
  
  2. Notes
    - This aligns the database schema with the application's expected structure
    - Captain/vice-captain info is stored in the players JSONB field
*/

-- Remove unnecessary columns
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_teams' AND column_name = 'captain_id'
  ) THEN
    ALTER TABLE user_teams DROP COLUMN captain_id;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_teams' AND column_name = 'vice_captain_id'
  ) THEN
    ALTER TABLE user_teams DROP COLUMN vice_captain_id;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_teams' AND column_name = 'total_value'
  ) THEN
    ALTER TABLE user_teams DROP COLUMN total_value;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_teams' AND column_name = 'free_transfers'
  ) THEN
    ALTER TABLE user_teams DROP COLUMN free_transfers;
  END IF;
END $$;

-- Add expected columns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_teams' AND column_name = 'team_value'
  ) THEN
    ALTER TABLE user_teams ADD COLUMN team_value INTEGER NOT NULL DEFAULT 0;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_teams' AND column_name = 'transfers_made'
  ) THEN
    ALTER TABLE user_teams ADD COLUMN transfers_made INTEGER NOT NULL DEFAULT 0;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_teams' AND column_name = 'last_deadline_bank'
  ) THEN
    ALTER TABLE user_teams ADD COLUMN last_deadline_bank INTEGER NOT NULL DEFAULT 0;
  END IF;
END $$;