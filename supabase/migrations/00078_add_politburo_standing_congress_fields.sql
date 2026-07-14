ALTER TABLE player_saves
  ADD COLUMN IF NOT EXISTS politburo_seat              BOOLEAN  DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS last_politburo_election_year INTEGER DEFAULT -1,
  ADD COLUMN IF NOT EXISTS politburo_votes             INTEGER  DEFAULT 0,
  ADD COLUMN IF NOT EXISTS standing_committee_rank     INTEGER  DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_standing_election_year INTEGER  DEFAULT -1,
  ADD COLUMN IF NOT EXISTS standing_rank_delta         INTEGER  DEFAULT 0,
  ADD COLUMN IF NOT EXISTS party_congress_year         INTEGER  DEFAULT -1,
  ADD COLUMN IF NOT EXISTS party_congress_topics       TEXT     DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS party_congress_econ_bonus   INTEGER  DEFAULT 0,
  ADD COLUMN IF NOT EXISTS party_congress_eco_bonus    INTEGER  DEFAULT 0,
  ADD COLUMN IF NOT EXISTS party_congress_sec_bonus    INTEGER  DEFAULT 0;