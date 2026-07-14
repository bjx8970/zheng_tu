-- v260: 行政线25-29号功能字段
ALTER TABLE player_saves
  ADD COLUMN IF NOT EXISTS admin_gov_cooldowns        JSONB    NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS policy_pilot_count         INTEGER  NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS institution_reform_count   INTEGER  NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS approval_race_count        INTEGER  NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS hall_satisfy_count         INTEGER  NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS digital_gov_built          BOOLEAN  NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS digital_gov_built_day      INTEGER  NOT NULL DEFAULT 0;
