-- 每年分级行政区综合评分前10排行快照
CREATE TABLE IF NOT EXISTS annual_rank_snapshots (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  save_id     UUID         NOT NULL REFERENCES player_saves(id) ON DELETE CASCADE,
  year_key    INTEGER      NOT NULL,
  tier        TEXT         NOT NULL, -- 'province'|'city'|'county'|'town'
  rank_pos    INTEGER      NOT NULL, -- 1~10
  area_name   TEXT         NOT NULL,
  area_type   TEXT         NOT NULL, -- governing_areas.area_type 或 'player_city'
  score       NUMERIC      NOT NULL, -- 综合评分（满分100）
  dev_index   INTEGER      NOT NULL DEFAULT 0,
  favor_index INTEGER      NOT NULL DEFAULT 0,
  city_gdp    NUMERIC      NOT NULL DEFAULT 0,
  city_livelihood NUMERIC  NOT NULL DEFAULT 0,
  city_ecology    NUMERIC  NOT NULL DEFAULT 0,
  city_business   NUMERIC  NOT NULL DEFAULT 0,
  security_index  NUMERIC  NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (save_id, year_key, tier, rank_pos)
);

CREATE INDEX IF NOT EXISTS idx_annual_rank_snapshots_save_year
  ON annual_rank_snapshots (save_id, year_key, tier);