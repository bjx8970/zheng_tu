
-- 补增缺失的深度玩法冷却 jsonb 列（disc/party/league 均缺失）
ALTER TABLE player_saves
  ADD COLUMN IF NOT EXISTS disc_deep_cooldowns   jsonb NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS party_deep_cooldowns  jsonb NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS league_deep_cooldowns jsonb NOT NULL DEFAULT '{}',
  -- 行政线深度玩法新列
  ADD COLUMN IF NOT EXISTS admin_deep_cooldowns  jsonb NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS admin_deep_results    TEXT  NOT NULL DEFAULT '{}';
