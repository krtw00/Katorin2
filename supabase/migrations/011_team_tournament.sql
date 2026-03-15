-- ============================================
-- 011: チーム大会（ロケットカップ形式）対応
-- ============================================

-- --------------------------------------------
-- tournaments テーブル拡張
-- --------------------------------------------
ALTER TABLE tournaments
  ADD COLUMN IF NOT EXISTS swiss_round_count SMALLINT,
  ADD COLUMN IF NOT EXISTS finals_bracket_size SMALLINT DEFAULT 4;

-- --------------------------------------------
-- war_orders: 各War前のオーダー提出（5人×デッキ）
-- --------------------------------------------
CREATE TABLE war_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id),
  slot SMALLINT NOT NULL CHECK (slot BETWEEN 1 AND 5),
  user_id UUID NOT NULL REFERENCES profiles(id),
  deck_name VARCHAR(100) NOT NULL,
  deck_theme VARCHAR(200) NOT NULL DEFAULT '',
  is_picked BOOLEAN NOT NULL DEFAULT FALSE,
  is_banned BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(match_id, team_id, slot),
  UNIQUE(match_id, team_id, user_id)
);

CREATE INDEX idx_war_orders_match ON war_orders(match_id);
CREATE INDEX idx_war_orders_team ON war_orders(match_id, team_id);

-- --------------------------------------------
-- swiss_standings: スイスドロー途中経過
-- --------------------------------------------
CREATE TABLE swiss_standings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id),
  round SMALLINT NOT NULL,
  team_points SMALLINT NOT NULL DEFAULT 0,
  win_points SMALLINT NOT NULL DEFAULT 0,
  is_bye BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tournament_id, team_id, round)
);

CREATE INDEX idx_swiss_standings_tournament ON swiss_standings(tournament_id);
CREATE INDEX idx_swiss_standings_ranking ON swiss_standings(tournament_id, round, team_points DESC, win_points DESC);

-- --------------------------------------------
-- matches テーブル拡張: War用フィールド
-- --------------------------------------------
ALTER TABLE matches
  ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS team1_wins SMALLINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS team2_wins SMALLINT NOT NULL DEFAULT 0;

-- --------------------------------------------
-- RLS: war_orders
-- --------------------------------------------
ALTER TABLE war_orders ENABLE ROW LEVEL SECURITY;

-- 公開大会のオーダーは誰でも見れる
CREATE POLICY "war_orders_select" ON war_orders
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM matches m
      JOIN tournaments t ON t.id = m.tournament_id
      WHERE m.id = war_orders.match_id
      AND t.visibility = 'public'
    )
  );

-- チームリーダーがオーダーを管理
CREATE POLICY "war_orders_insert" ON war_orders
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM teams WHERE id = war_orders.team_id AND leader_id = auth.uid()
    )
  );

CREATE POLICY "war_orders_update" ON war_orders
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM teams WHERE id = war_orders.team_id AND leader_id = auth.uid()
    )
  );

-- 主催者もオーダーを管理可能
CREATE POLICY "war_orders_organizer" ON war_orders
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM matches m
      JOIN tournaments t ON t.id = m.tournament_id
      WHERE m.id = war_orders.match_id
      AND t.organizer_id = auth.uid()
    )
  );

-- --------------------------------------------
-- RLS: swiss_standings
-- --------------------------------------------
ALTER TABLE swiss_standings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "swiss_standings_select" ON swiss_standings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tournaments t
      WHERE t.id = swiss_standings.tournament_id
      AND t.visibility = 'public'
    )
  );

CREATE POLICY "swiss_standings_organizer" ON swiss_standings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM tournaments t
      WHERE t.id = swiss_standings.tournament_id
      AND t.organizer_id = auth.uid()
    )
  );

-- --------------------------------------------
-- ビュー: スイスドロー累計順位
-- --------------------------------------------
CREATE OR REPLACE VIEW swiss_rankings AS
SELECT
  ss.tournament_id,
  ss.team_id,
  t.name AS team_name,
  t.avatar_url AS team_avatar_url,
  SUM(ss.team_points) AS total_team_points,
  SUM(ss.win_points) AS total_win_points,
  MAX(ss.round) AS rounds_played,
  COUNT(*) FILTER (WHERE ss.is_bye) AS bye_count,
  RANK() OVER (
    PARTITION BY ss.tournament_id
    ORDER BY SUM(ss.team_points) DESC, SUM(ss.win_points) DESC
  ) AS rank
FROM swiss_standings ss
JOIN teams t ON t.id = ss.team_id
GROUP BY ss.tournament_id, ss.team_id, t.name, t.avatar_url;
