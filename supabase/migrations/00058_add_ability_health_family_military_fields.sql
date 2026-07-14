-- 能力值、健康值（全新字段）
ALTER TABLE player_saves
  ADD COLUMN IF NOT EXISTS ability_value INTEGER NOT NULL DEFAULT 40,
  ADD COLUMN IF NOT EXISTS health_value  INTEGER NOT NULL DEFAULT 100;

-- 家庭背景（角色创建时选择）
ALTER TABLE player_saves
  ADD COLUMN IF NOT EXISTS family_background VARCHAR(20) NOT NULL DEFAULT '普通家庭';

-- 是否军转干部路线
ALTER TABLE player_saves
  ADD COLUMN IF NOT EXISTS is_military_transfer BOOLEAN NOT NULL DEFAULT false;

-- 初始政治倾向派系（角色创建时选择，不同于游戏中动态的primaryFaction）
ALTER TABLE player_saves
  ADD COLUMN IF NOT EXISTS init_faction VARCHAR(20) NOT NULL DEFAULT '';