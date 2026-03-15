-- ============================================
-- 012: WMGP形式対応
-- ブロック別総当たり + 3v3星取戦(BO3) + マッチ戦(BO3デュエル)
-- ============================================

-- --------------------------------------------
-- tournaments テーブル拡張: ブロック分け
-- --------------------------------------------
ALTER TABLE tournaments
  ADD COLUMN IF NOT EXISTS block_count SMALLINT DEFAULT 1,
  ADD COLUMN IF NOT EXISTS rounds_to_win SMALLINT DEFAULT 2;

-- --------------------------------------------
-- tournament_blocks: ブロック管理
-- --------------------------------------------
CREATE TABLE tournament_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  block_name VARCHAR(50) NOT NULL,
  block_order SMALLINT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tournament_id, block_name)
);

CREATE INDEX idx_tournament_blocks_tournament ON tournament_blocks(tournament_id);

-- --------------------------------------------
-- team_entries にブロック割当
-- --------------------------------------------
ALTER TABLE team_entries
  ADD COLUMN IF NOT EXISTS block_id UUID REFERENCES tournament_blocks(id);

-- --------------------------------------------
-- matches にラウンド勝敗追加（星取戦の各ラウンド管理）
-- team1_round_wins / team2_round_wins = 2先取で試合終了
-- --------------------------------------------
ALTER TABLE matches
  ADD COLUMN IF NOT EXISTS team1_round_wins SMALLINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS team2_round_wins SMALLINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS block_id UUID REFERENCES tournament_blocks(id);

-- --------------------------------------------
-- war_orders 拡張: サブプレイヤー対応
-- WMGP: 3人メイン + 1人サブ = 最大4人
-- --------------------------------------------
ALTER TABLE war_orders
  ADD COLUMN IF NOT EXISTS is_sub BOOLEAN NOT NULL DEFAULT FALSE;

-- --------------------------------------------
-- war_rounds: 各ラウンドの結果管理
-- 1試合 = 最大3ラウンド、各ラウンド = 3人同時マッチ戦
-- --------------------------------------------
CREATE TABLE war_rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  round_number SMALLINT NOT NULL CHECK (round_number BETWEEN 1 AND 3),
  team1_match_wins SMALLINT NOT NULL DEFAULT 0,
  team2_match_wins SMALLINT NOT NULL DEFAULT 0,
  winner_team_id UUID REFERENCES teams(id),
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'in_progress', 'completed')),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(match_id, round_number)
);

CREATE INDEX idx_war_rounds_match ON war_rounds(match_id);

-- --------------------------------------------
-- individual_matches 拡張: BO3デュエル対応
-- duel_wins で各プレイヤーのデュエル勝利数を記録
-- --------------------------------------------
ALTER TABLE individual_matches
  ADD COLUMN IF NOT EXISTS war_round_id UUID REFERENCES war_rounds(id),
  ADD COLUMN IF NOT EXISTS player1_duel_wins SMALLINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS player2_duel_wins SMALLINT NOT NULL DEFAULT 0;

-- --------------------------------------------
-- block_standings: ブロック内順位（キャッシュ用ビュー）
-- 勝ち点 + 6段階タイブレーカー
-- --------------------------------------------
CREATE OR REPLACE VIEW block_standings AS
WITH match_results AS (
  SELECT
    m.tournament_id,
    m.block_id,
    m.team1_id AS team_id,
    CASE WHEN m.winner_team_id = m.team1_id THEN 3 ELSE 0 END AS win_points,
    m.team1_round_wins AS rounds_won,
    m.team2_round_wins AS rounds_lost,
    m.team1_wins AS matches_won,
    m.team2_wins AS matches_lost,
    m.status
  FROM matches m
  WHERE m.status = 'completed' AND m.team1_id IS NOT NULL
  UNION ALL
  SELECT
    m.tournament_id,
    m.block_id,
    m.team2_id AS team_id,
    CASE WHEN m.winner_team_id = m.team2_id THEN 3 ELSE 0 END AS win_points,
    m.team2_round_wins AS rounds_won,
    m.team1_round_wins AS rounds_lost,
    m.team2_wins AS matches_won,
    m.team1_wins AS matches_lost,
    m.status
  FROM matches m
  WHERE m.status = 'completed' AND m.team2_id IS NOT NULL
)
SELECT
  mr.tournament_id,
  mr.block_id,
  mr.team_id,
  t.name AS team_name,
  t.avatar_url AS team_avatar_url,
  COUNT(*) AS matches_played,
  COUNT(*) FILTER (WHERE mr.win_points = 3) AS wins,
  COUNT(*) FILTER (WHERE mr.win_points = 0) AS losses,
  SUM(mr.win_points) AS total_win_points,
  SUM(mr.rounds_won) - SUM(mr.rounds_lost) AS round_diff,
  SUM(mr.matches_won) - SUM(mr.matches_lost) AS match_diff,
  SUM(mr.rounds_won) AS total_rounds_won,
  RANK() OVER (
    PARTITION BY mr.tournament_id, mr.block_id
    ORDER BY
      SUM(mr.win_points) DESC,
      SUM(mr.rounds_won) - SUM(mr.rounds_lost) DESC,
      SUM(mr.matches_won) - SUM(mr.matches_lost) DESC,
      SUM(mr.rounds_won) DESC
  ) AS rank
FROM match_results mr
JOIN teams t ON t.id = mr.team_id
GROUP BY mr.tournament_id, mr.block_id, mr.team_id, t.name, t.avatar_url;

-- --------------------------------------------
-- RLS
-- --------------------------------------------
ALTER TABLE tournament_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE war_rounds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tournament_blocks_select" ON tournament_blocks
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM tournaments t WHERE t.id = tournament_blocks.tournament_id AND t.visibility = 'public')
  );

CREATE POLICY "tournament_blocks_organizer" ON tournament_blocks
  FOR ALL USING (
    EXISTS (SELECT 1 FROM tournaments t WHERE t.id = tournament_blocks.tournament_id AND t.organizer_id = auth.uid())
  );

CREATE POLICY "war_rounds_select" ON war_rounds
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM matches m JOIN tournaments t ON t.id = m.tournament_id
      WHERE m.id = war_rounds.match_id AND t.visibility = 'public'
    )
  );

CREATE POLICY "war_rounds_organizer" ON war_rounds
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM matches m JOIN tournaments t ON t.id = m.tournament_id
      WHERE m.id = war_rounds.match_id AND t.organizer_id = auth.uid()
    )
  );
