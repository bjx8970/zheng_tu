
-- 1. 新增 city_gov_fund 列（迁移 line_grant_fund 数据）
ALTER TABLE player_saves
  ADD COLUMN IF NOT EXISTS city_gov_fund           integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS city_gov_fund_auto_month integer NOT NULL DEFAULT -1;

-- 2. 将旧数据迁移到新列
UPDATE player_saves
SET
  city_gov_fund            = COALESCE(line_grant_fund, 0),
  city_gov_fund_auto_month = COALESCE(line_grant_fund_auto_month, -1);

-- 3. 删除旧列
ALTER TABLE player_saves
  DROP COLUMN IF EXISTS line_grant_fund,
  DROP COLUMN IF EXISTS line_grant_fund_auto_month,
  DROP COLUMN IF EXISTS line_grant_fund_crisis;
