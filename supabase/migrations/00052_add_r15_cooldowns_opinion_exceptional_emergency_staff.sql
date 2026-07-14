-- rank15路线专权冷却追踪（JSON对象，key=行动id，value=最后执行gameDays）
ALTER TABLE player_saves
  ADD COLUMN IF NOT EXISTS r15_action_cooldowns JSONB DEFAULT '{}'::jsonb;

-- 待展示的全国性舆情事件（r15p2问责/r15d1扫黑触发后写入，home.tsx弹窗消费后清空）
ALTER TABLE player_saves
  ADD COLUMN IF NOT EXISTS pending_opinion_event JSONB DEFAULT NULL;

-- 破格晋升错过任期次数（0=从未触发; 1=错过1次→75%; >=2→90%）
ALTER TABLE player_saves
  ADD COLUMN IF NOT EXISTS exceptional_missed_terms INTEGER DEFAULT 0;

-- 应急编制到期游戏天（0=无应急编制，>0=有效截止gameDays）
ALTER TABLE player_saves
  ADD COLUMN IF NOT EXISTS emergency_staff_expiry INTEGER DEFAULT 0;

COMMENT ON COLUMN player_saves.r15_action_cooldowns IS 'rank15路线专权行动冷却：key=行动id，value=最后执行gameDays';
COMMENT ON COLUMN player_saves.pending_opinion_event IS '待弹出全国性舆情事件，消费后清null';
COMMENT ON COLUMN player_saves.exceptional_missed_terms IS '破格晋升已错过任期次数，驱动50/75/90%概率梯度';
COMMENT ON COLUMN player_saves.emergency_staff_expiry IS '应急编制到期游戏天，0=无效';