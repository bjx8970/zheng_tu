
ALTER TABLE player_saves
  ADD COLUMN IF NOT EXISTS diplomacy_points              INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_diplomacy_day            INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS career_path_line              TEXT    NOT NULL DEFAULT '行政线',
  ADD COLUMN IF NOT EXISTS career_path_cooldowns         TEXT    NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS exceptional_age_override_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_diplomacy_active           BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pending_bribery_event         TEXT    DEFAULT NULL;
