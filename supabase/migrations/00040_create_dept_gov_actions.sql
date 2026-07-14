
-- 每月施政行动记录表
-- month_key = floor(game_days / 30)，同一存档+部门+月份 唯一，防止重复施政
CREATE TABLE IF NOT EXISTS dept_gov_actions (
  id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  save_id     UUID    NOT NULL REFERENCES player_saves(id) ON DELETE CASCADE,
  dept_key    TEXT    NOT NULL,
  month_key   INTEGER NOT NULL,
  merit_gain  NUMERIC NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (save_id, dept_key, month_key)
);

CREATE INDEX IF NOT EXISTS idx_dept_gov_actions_save_month
  ON dept_gov_actions (save_id, month_key);
