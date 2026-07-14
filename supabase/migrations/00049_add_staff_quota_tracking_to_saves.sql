-- 编制年度追踪：last_staff_quota_year = 上次重置的游戏年份
--                staff_apply_bits   = 本年度已提交申请的位标志（bit0~bit3 对应4种申请）
ALTER TABLE player_saves
  ADD COLUMN IF NOT EXISTS last_staff_quota_year INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS staff_apply_bits      INTEGER NOT NULL DEFAULT 0;