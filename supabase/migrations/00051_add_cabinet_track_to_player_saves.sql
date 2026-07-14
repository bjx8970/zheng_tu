-- 内阁分管线：rank13玩家随机分配一条分管线（economy/social/hmt/military），rank14+全管(null)
ALTER TABLE player_saves
  ADD COLUMN IF NOT EXISTS cabinet_track TEXT DEFAULT NULL;

COMMENT ON COLUMN player_saves.cabinet_track IS
  'rank13副总理分管线: economy|social|hmt|military; NULL表示全管(rank14+总统)';
