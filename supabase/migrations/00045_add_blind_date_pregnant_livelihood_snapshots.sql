
-- 1. player_saves: 相亲NPC列表、怀孕天数、民生快照
ALTER TABLE player_saves
  ADD COLUMN IF NOT EXISTS blind_date_npcs    JSONB        NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS pregnant_day       INTEGER      NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS livelihood_snapshots JSONB      NOT NULL DEFAULT '[]'::jsonb;
-- pregnant_day: 0=未怀孕, >0=开始怀孕的游戏天数

-- 2. player_career_history: 添加任期末民生指数（用于折线图）
ALTER TABLE player_career_history
  ADD COLUMN IF NOT EXISTS livelihood_score   INTEGER      NOT NULL DEFAULT 0;
