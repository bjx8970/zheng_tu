
-- 非行政线上级拨款余额
ALTER TABLE player_saves ADD COLUMN IF NOT EXISTS line_grant_fund       integer NOT NULL DEFAULT 0;
-- 上次拨款的游戏年份（用于判断是否本年已拨）
ALTER TABLE player_saves ADD COLUMN IF NOT EXISTS line_grant_last_year  integer NOT NULL DEFAULT -1;
-- 累计贪污金额（以元为单位）
ALTER TABLE player_saves ADD COLUMN IF NOT EXISTS corrupt_total         bigint  NOT NULL DEFAULT 0;

-- 政法线20-23号功能字段
ALTER TABLE player_saves ADD COLUMN IF NOT EXISTS judicial_coord_count    integer NOT NULL DEFAULT 0;
ALTER TABLE player_saves ADD COLUMN IF NOT EXISTS informant_count         integer NOT NULL DEFAULT 0;
ALTER TABLE player_saves ADD COLUMN IF NOT EXISTS law_enforce_purge_count integer NOT NULL DEFAULT 0;
ALTER TABLE player_saves ADD COLUMN IF NOT EXISTS death_review_count      integer NOT NULL DEFAULT 0;
-- 政法线冷却记录（20-23号）
ALTER TABLE player_saves ADD COLUMN IF NOT EXISTS judicial_extra_cooldowns jsonb NOT NULL DEFAULT '{}';
