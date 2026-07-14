ALTER TABLE player_saves
  ADD COLUMN IF NOT EXISTS disc_deep_results  TEXT NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS party_deep_results TEXT NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS league_deep_results TEXT NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS mass_incident_results TEXT NOT NULL DEFAULT '{}';