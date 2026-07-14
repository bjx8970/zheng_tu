ALTER TABLE player_saves
  ADD COLUMN IF NOT EXISTS supreme_leader_cooldowns JSONB NOT NULL DEFAULT '{}'::jsonb;