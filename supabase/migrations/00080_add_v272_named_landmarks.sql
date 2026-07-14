-- v2.8: 重大工程命名权字段
ALTER TABLE player_saves ADD COLUMN IF NOT EXISTS named_landmarks TEXT NOT NULL DEFAULT '[]';
