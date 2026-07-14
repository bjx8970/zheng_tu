-- 秘书自动施政开关（手动开启，默认关闭）
ALTER TABLE player_saves
  ADD COLUMN IF NOT EXISTS sec_auto_gov_enabled BOOLEAN NOT NULL DEFAULT FALSE;

-- 秘书自动招募开关（手动开启，默认关闭）
ALTER TABLE player_saves
  ADD COLUMN IF NOT EXISTS sec_auto_recruit_enabled BOOLEAN NOT NULL DEFAULT FALSE;