
-- 中央线任职途径字段
ALTER TABLE player_saves
  ADD COLUMN IF NOT EXISTS career_line text NOT NULL DEFAULT '地方',
  ADD COLUMN IF NOT EXISTS ministry_name text NOT NULL DEFAULT '';

-- 中央线专属四维KPI（复用 city_* 字段，含义随 career_line 动态解读）
-- 无需新字段，直接用 city_gdp / city_livelihood / city_ecology / city_business
-- ministry_name 存放所在部委（如"发展改革委"）
