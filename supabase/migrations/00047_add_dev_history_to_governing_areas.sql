ALTER TABLE governing_areas
  ADD COLUMN IF NOT EXISTS dev_history TEXT NOT NULL DEFAULT '[]';

COMMENT ON COLUMN governing_areas.dev_history IS '发展指数历史记录 JSON，格式 [{m:月序,v:指数值}]，最多保留24条';