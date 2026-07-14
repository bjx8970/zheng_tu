ALTER TABLE player_saves
  ADD COLUMN IF NOT EXISTS info_public_count       INTEGER     NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS admin_litigation_count  INTEGER     NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS inspection_count        INTEGER     NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS joint_meeting_count     INTEGER     NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fiscal_warning_count    INTEGER     NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS project_type_count      INTEGER     NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS line_grant_fund_crisis  BOOLEAN     NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN player_saves.info_public_count      IS '政府信息公开处置次数';
COMMENT ON COLUMN player_saves.admin_litigation_count IS '行政诉讼应对次数';
COMMENT ON COLUMN player_saves.inspection_count       IS '专项督查迎检次数';
COMMENT ON COLUMN player_saves.joint_meeting_count    IS '联席会议外交次数';
COMMENT ON COLUMN player_saves.fiscal_warning_count   IS '行政成本预警处置次数';
COMMENT ON COLUMN player_saves.project_type_count     IS '政绩/民生工程决策次数';
COMMENT ON COLUMN player_saves.line_grant_fund_crisis IS '专项经费危机标志（余额耗尽时触发）';