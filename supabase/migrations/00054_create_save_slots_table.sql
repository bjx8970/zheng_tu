-- 多存档槽系统：最多3个存档位，支持手动存档和自动存档
CREATE TABLE IF NOT EXISTS save_slots (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slot_number  int  NOT NULL CHECK (slot_number BETWEEN 1 AND 3),
  snapshot     jsonb NOT NULL,       -- player_saves 行快照
  slot_name    text NOT NULL DEFAULT '', -- 存档标签（自动存档/手动）
  rank_name    text NOT NULL DEFAULT '', -- 冗余便于列表展示
  rank_level   int  NOT NULL DEFAULT 1,
  city_name    text NOT NULL DEFAULT '',
  game_days    int  NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, slot_number)
);

-- RLS
ALTER TABLE save_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "save_slots_self" ON save_slots
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());