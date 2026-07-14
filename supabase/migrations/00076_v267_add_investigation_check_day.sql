ALTER TABLE player_saves
  ADD COLUMN IF NOT EXISTS last_investigation_check_day INTEGER NOT NULL DEFAULT 0;