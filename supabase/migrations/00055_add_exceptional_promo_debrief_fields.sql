
ALTER TABLE player_saves
  ADD COLUMN IF NOT EXISTS exceptional_promo_bonus FLOAT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS annual_debrief_target_key TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS annual_debrief_target_value FLOAT NOT NULL DEFAULT 0;
