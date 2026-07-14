
-- 家族系统字段
ALTER TABLE player_saves
  ADD COLUMN IF NOT EXISTS clan_prestige        integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS clan_heritage        integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS clan_fund            integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS clan_elder_favor     integer NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS clan_member_count    integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS clan_events_log      jsonb   NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS clan_industry_level  integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS clan_industry_type   text    NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS clan_last_ritual_day integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS clan_last_meeting_day integer NOT NULL DEFAULT 0;

-- 城市治理经费基础值：已存在存档补为100万（仅补0值）
UPDATE player_saves SET city_gov_fund = 100 WHERE city_gov_fund = 0 OR city_gov_fund IS NULL;
