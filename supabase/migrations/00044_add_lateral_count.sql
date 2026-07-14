-- 平调次数：记录玩家累计连续平调次数，第2次平调后再次任期满触发退休结局
ALTER TABLE player_saves
  ADD COLUMN IF NOT EXISTS lateral_count INTEGER NOT NULL DEFAULT 0;