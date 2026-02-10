/*
  # Fix user_settings schema mismatch
  
  1. Changes
    - Rename fpl_manager_id to manager_id
    - Rename league_id to primary_league_id
    - Add auto_captain column
    - Add notifications_enabled column
  
  2. Notes
    - Uses ALTER TABLE with IF EXISTS checks to safely update the schema
    - All changes are backward compatible
*/

-- Rename fpl_manager_id to manager_id
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_settings' AND column_name = 'fpl_manager_id'
  ) THEN
    ALTER TABLE user_settings RENAME COLUMN fpl_manager_id TO manager_id;
  END IF;
END $$;

-- Rename league_id to primary_league_id
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_settings' AND column_name = 'league_id'
  ) THEN
    ALTER TABLE user_settings RENAME COLUMN league_id TO primary_league_id;
  END IF;
END $$;

-- Add auto_captain column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_settings' AND column_name = 'auto_captain'
  ) THEN
    ALTER TABLE user_settings ADD COLUMN auto_captain boolean NOT NULL DEFAULT false;
  END IF;
END $$;

-- Add notifications_enabled column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_settings' AND column_name = 'notifications_enabled'
  ) THEN
    ALTER TABLE user_settings ADD COLUMN notifications_enabled boolean NOT NULL DEFAULT false;
  END IF;
END $$;
