-- ============================================
-- チーム機能
-- ============================================

-- ============================================
-- ENUM 型定義
-- ============================================

-- チームメンバー役割
CREATE TYPE team_role AS ENUM ('leader', 'member');

-- チーム戦形式
CREATE TYPE team_battle_format AS ENUM ('knockout', 'point');

-- チーム作成モード
CREATE TYPE team_creation_mode AS ENUM ('user', 'organizer');

-- チェックインステータス
CREATE TYPE check_in_status AS ENUM ('pending', 'checked_in', 'no_show');

-- ブラケットサイド（ダブルエリミネーション用）
CREATE TYPE bracket_side AS ENUM ('winners', 'losers', 'grand_final');

-- ============================================
-- テーブル定義
-- ============================================

-- --------------------------------------------
-- teams（チーム）
-- --------------------------------------------
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL,
  description TEXT,
  avatar_url TEXT,
  leader_id UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_teams_leader ON teams(leader_id);
CREATE INDEX idx_teams_name ON teams(name);

CREATE TRIGGER update_teams_updated_at
  BEFORE UPDATE ON teams
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- --------------------------------------------
-- team_members（チームメンバー）
-- --------------------------------------------
CREATE TABLE team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id),
  role team_role NOT NULL DEFAULT 'member',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(team_id, user_id)
);

CREATE INDEX idx_team_members_team ON team_members(team_id);
CREATE INDEX idx_team_members_user ON team_members(user_id);

-- --------------------------------------------
-- team_invites（チーム招待）
-- --------------------------------------------
CREATE TABLE team_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  invite_token VARCHAR(32) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  max_uses SMALLINT DEFAULT 1,
  use_count SMALLINT NOT NULL DEFAULT 0,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_team_invites_token ON team_invites(invite_token);
CREATE INDEX idx_team_invites_team ON team_invites(team_id);

-- --------------------------------------------
-- tournamentsにチーム戦関連カラム追加
-- --------------------------------------------
ALTER TABLE tournaments
  ADD COLUMN team_battle_format team_battle_format,
  ADD COLUMN team_size_min SMALLINT,
  ADD COLUMN team_size_max SMALLINT,
  ADD COLUMN team_creation_mode team_creation_mode;

-- チーム戦の場合は必須設定がある制約
-- 注: 既存データとの互換性のため、制約はコメントアウト
-- ALTER TABLE tournaments ADD CONSTRAINT chk_team_settings
--   CHECK (
--     (entry_type = 'individual') OR
--     (entry_type = 'team' AND team_battle_format IS NOT NULL
--      AND team_size_min IS NOT NULL AND team_size_max IS NOT NULL)
--   );

-- --------------------------------------------
-- team_entries（チーム戦エントリー）
-- --------------------------------------------
CREATE TABLE team_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id),
  entry_number SERIAL,
  check_in_status check_in_status NOT NULL DEFAULT 'pending',
  checked_in_at TIMESTAMPTZ,
  seed SMALLINT,
  final_placement SMALLINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tournament_id, team_id)
);

CREATE INDEX idx_team_entries_tournament ON team_entries(tournament_id);
CREATE INDEX idx_team_entries_team ON team_entries(team_id);

-- --------------------------------------------
-- team_rosters（出場メンバー）
-- --------------------------------------------
CREATE TABLE team_rosters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_entry_id UUID NOT NULL REFERENCES team_entries(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id),
  play_order SMALLINT NOT NULL,
  UNIQUE(team_entry_id, user_id),
  UNIQUE(team_entry_id, play_order)
);

CREATE INDEX idx_team_rosters_entry ON team_rosters(team_entry_id);

-- --------------------------------------------
-- matchesにチーム戦カラム追加
-- --------------------------------------------
ALTER TABLE matches
  ADD COLUMN team1_id UUID REFERENCES teams(id),
  ADD COLUMN team2_id UUID REFERENCES teams(id),
  ADD COLUMN bracket_side bracket_side;

CREATE INDEX idx_matches_team1 ON matches(team1_id);
CREATE INDEX idx_matches_team2 ON matches(team2_id);

-- --------------------------------------------
-- individual_matches（チーム戦内の個人戦）
-- --------------------------------------------
CREATE TABLE individual_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  play_order SMALLINT NOT NULL,
  player1_id UUID NOT NULL REFERENCES profiles(id),
  player2_id UUID NOT NULL REFERENCES profiles(id),
  player1_score SMALLINT DEFAULT 0,
  player2_score SMALLINT DEFAULT 0,
  winner_id UUID REFERENCES profiles(id),
  status match_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(match_id, play_order)
);

CREATE INDEX idx_individual_matches_match ON individual_matches(match_id);

-- --------------------------------------------
-- series_pointsにteam_id外部キー追加
-- --------------------------------------------
ALTER TABLE series_points ADD CONSTRAINT fk_series_points_team
  FOREIGN KEY (team_id) REFERENCES teams(id);
CREATE INDEX idx_series_points_team ON series_points(team_id);

-- --------------------------------------------
-- series_rankingsビューを更新（チーム名対応）
-- --------------------------------------------
DROP VIEW IF EXISTS series_rankings;
CREATE VIEW series_rankings AS
SELECT
  sp.series_id,
  sp.user_id,
  sp.team_id,
  COALESCE(p.display_name, t.name) AS name,
  COALESCE(p.avatar_url, t.avatar_url) AS avatar_url,
  SUM(sp.points) AS total_points,
  COUNT(sp.tournament_id) AS tournaments_played,
  SUM(sp.wins) AS total_wins,
  SUM(sp.losses) AS total_losses,
  RANK() OVER (PARTITION BY sp.series_id ORDER BY SUM(sp.points) DESC) AS rank
FROM series_points sp
LEFT JOIN profiles p ON p.id = sp.user_id
LEFT JOIN teams t ON t.id = sp.team_id
GROUP BY sp.series_id, sp.user_id, sp.team_id, p.display_name, p.avatar_url, t.name, t.avatar_url;

-- ============================================
-- Row Level Security (RLS) ポリシー
-- ============================================

-- --------------------------------------------
-- teams
-- --------------------------------------------
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

-- 誰でも閲覧可能
CREATE POLICY "Teams are viewable by everyone"
  ON teams FOR SELECT
  USING (true);

-- ログインユーザーは作成可能
CREATE POLICY "Authenticated users can create teams"
  ON teams FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND leader_id = auth.uid());

-- リーダーのみ更新可能
CREATE POLICY "Leaders can update teams"
  ON teams FOR UPDATE
  USING (leader_id = auth.uid());

-- リーダーのみ削除可能
CREATE POLICY "Leaders can delete teams"
  ON teams FOR DELETE
  USING (leader_id = auth.uid());

-- --------------------------------------------
-- team_members
-- --------------------------------------------
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

-- 誰でも閲覧可能
CREATE POLICY "Team members are viewable by everyone"
  ON team_members FOR SELECT
  USING (true);

-- リーダーはメンバーを管理可能
CREATE POLICY "Leaders can manage members"
  ON team_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM teams t WHERE t.id = team_id AND t.leader_id = auth.uid()
    ) OR user_id = auth.uid()
  );

CREATE POLICY "Leaders can update members"
  ON team_members FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM teams t WHERE t.id = team_id AND t.leader_id = auth.uid()
    )
  );

-- メンバー自身またはリーダーが削除可能
CREATE POLICY "Members can leave or leaders can remove"
  ON team_members FOR DELETE
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM teams t WHERE t.id = team_id AND t.leader_id = auth.uid()
    )
  );

-- --------------------------------------------
-- team_invites
-- --------------------------------------------
ALTER TABLE team_invites ENABLE ROW LEVEL SECURITY;

-- 誰でも閲覧可能（トークンベースで有効性チェック）
CREATE POLICY "Invites are viewable by everyone"
  ON team_invites FOR SELECT
  USING (true);

-- リーダーのみ作成可能
CREATE POLICY "Leaders can create invites"
  ON team_invites FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM teams t WHERE t.id = team_id AND t.leader_id = auth.uid()
    )
  );

-- リーダーのみ更新可能
CREATE POLICY "Leaders can update invites"
  ON team_invites FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM teams t WHERE t.id = team_id AND t.leader_id = auth.uid()
    )
  );

-- リーダーのみ削除可能
CREATE POLICY "Leaders can delete invites"
  ON team_invites FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM teams t WHERE t.id = team_id AND t.leader_id = auth.uid()
    )
  );

-- --------------------------------------------
-- team_entries
-- --------------------------------------------
ALTER TABLE team_entries ENABLE ROW LEVEL SECURITY;

-- 公開大会のエントリーは閲覧可能
CREATE POLICY "Team entries are viewable"
  ON team_entries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tournaments t
      WHERE t.id = tournament_id
      AND (t.visibility = 'public' OR t.organizer_id = auth.uid())
    )
  );

-- チームリーダーがエントリー可能
CREATE POLICY "Leaders can enter tournaments"
  ON team_entries FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM teams t WHERE t.id = team_id AND t.leader_id = auth.uid()
    )
  );

-- リーダーまたは主催者が更新可能
CREATE POLICY "Leaders or organizers can update entries"
  ON team_entries FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM teams t WHERE t.id = team_id AND t.leader_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM tournaments t WHERE t.id = tournament_id AND t.organizer_id = auth.uid()
    )
  );

-- リーダーまたは主催者が削除可能
CREATE POLICY "Leaders or organizers can delete entries"
  ON team_entries FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM teams t WHERE t.id = team_id AND t.leader_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM tournaments t WHERE t.id = tournament_id AND t.organizer_id = auth.uid()
    )
  );

-- --------------------------------------------
-- team_rosters
-- --------------------------------------------
ALTER TABLE team_rosters ENABLE ROW LEVEL SECURITY;

-- 誰でも閲覧可能
CREATE POLICY "Rosters are viewable by everyone"
  ON team_rosters FOR SELECT
  USING (true);

-- チームリーダーが管理可能
CREATE POLICY "Leaders can manage rosters"
  ON team_rosters FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM team_entries te
      JOIN teams t ON t.id = te.team_id
      WHERE te.id = team_entry_id AND t.leader_id = auth.uid()
    )
  );

CREATE POLICY "Leaders can update rosters"
  ON team_rosters FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM team_entries te
      JOIN teams t ON t.id = te.team_id
      WHERE te.id = team_entry_id AND t.leader_id = auth.uid()
    )
  );

CREATE POLICY "Leaders can delete rosters"
  ON team_rosters FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM team_entries te
      JOIN teams t ON t.id = te.team_id
      WHERE te.id = team_entry_id AND t.leader_id = auth.uid()
    )
  );

-- --------------------------------------------
-- individual_matches
-- --------------------------------------------
ALTER TABLE individual_matches ENABLE ROW LEVEL SECURITY;

-- 公開大会の個人戦は閲覧可能
CREATE POLICY "Individual matches are viewable"
  ON individual_matches FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM matches m
      JOIN tournaments t ON t.id = m.tournament_id
      WHERE m.id = match_id
      AND (t.visibility = 'public' OR t.organizer_id = auth.uid())
    )
  );

-- 主催者のみ管理可能
CREATE POLICY "Organizers can manage individual matches"
  ON individual_matches FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM matches m
      JOIN tournaments t ON t.id = m.tournament_id
      WHERE m.id = match_id AND t.organizer_id = auth.uid()
    )
  );

CREATE POLICY "Organizers can update individual matches"
  ON individual_matches FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM matches m
      JOIN tournaments t ON t.id = m.tournament_id
      WHERE m.id = match_id AND t.organizer_id = auth.uid()
    )
  );

CREATE POLICY "Organizers can delete individual matches"
  ON individual_matches FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM matches m
      JOIN tournaments t ON t.id = m.tournament_id
      WHERE m.id = match_id AND t.organizer_id = auth.uid()
    )
  );

-- ============================================
-- Realtime設定
-- ============================================

ALTER PUBLICATION supabase_realtime ADD TABLE team_entries;
ALTER PUBLICATION supabase_realtime ADD TABLE individual_matches;
