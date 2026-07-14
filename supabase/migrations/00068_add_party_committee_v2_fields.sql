-- 党报舆论管控冷却天
ALTER TABLE player_saves ADD COLUMN IF NOT EXISTS party_media_control_day INTEGER NOT NULL DEFAULT 0;
-- 过度管控累积失察风险值 (0-100)
ALTER TABLE player_saves ADD COLUMN IF NOT EXISTS media_overcontrol_risk INTEGER NOT NULL DEFAULT 0;
-- 组织部暗线冷却天
ALTER TABLE player_saves ADD COLUMN IF NOT EXISTS org_dept_insider_day INTEGER NOT NULL DEFAULT 0;
-- 暗线当前布局竞争对手名（展示用）
ALTER TABLE player_saves ADD COLUMN IF NOT EXISTS org_insider_target TEXT NOT NULL DEFAULT '';
-- 中央全会文件传达冷却天
ALTER TABLE player_saves ADD COLUMN IF NOT EXISTS plenary_conference_day INTEGER NOT NULL DEFAULT 0;
-- 党风廉政责任状冷却天（每年一次）
ALTER TABLE player_saves ADD COLUMN IF NOT EXISTS discipline_contract_day INTEGER NOT NULL DEFAULT 0;
-- 本年已签廉政责任状的下属ID列表（JSON数组字符串）
ALTER TABLE player_saves ADD COLUMN IF NOT EXISTS discipline_contract_signed TEXT NOT NULL DEFAULT '[]';