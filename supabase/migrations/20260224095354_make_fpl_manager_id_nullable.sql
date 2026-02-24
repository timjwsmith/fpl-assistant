/*
  # Make fpl_manager_id nullable

  1. Changes
    - Alter `users` table to make `fpl_manager_id` nullable
    - This allows users to exist without having connected their FPL account yet
  
  2. Rationale
    - Users should be able to access settings and other features before connecting their FPL account
    - The app should not require an FPL Manager ID to function
*/

-- Make fpl_manager_id nullable
ALTER TABLE users ALTER COLUMN fpl_manager_id DROP NOT NULL;
