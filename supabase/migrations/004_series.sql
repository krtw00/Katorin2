-- ============================================
-- シリーズ機能（長期大会）
-- ============================================

-- ============================================
-- ENUM 型定義
-- ============================================

-- シリーズステータス
CREATE TYPE series_status AS ENUM (
  'draft',      -- 下書き
  'active',     -- 開催中
  'completed',  -- 終了
  'cancelled'   -- キャンセル
);

-- ポイントシステム
CREATE TYPE point_system AS ENUM (
  'ranking',  -- 順位ポイント制
  'wins'      -- 勝利数カウント
);

-- ============================================
-- テーブル定義
-- ============================================

-- --------------------------------------------
-- series（シリーズ/リーグ）
-- --------------------------------------------
CREATE TABLE series (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 基本情報
  name VARCHAR(100) NOT NULL,
  description TEXT,
  organizer_id UUID NOT NULL REFERENCES profiles(id),

  -- 参加形式
  entry_type entry_type NOT NULL DEFAULT 'individual',

  -- ポイント設定
  point_system point_system NOT NULL DEFAULT 'ranking',
  point_config JSONB NOT NULL DEFAULT '{}',
  -- point_config例:
  -- ranking: {"1": 100, "2": 70, "3": 50, "4": 30, "5-8": 10}
  -- wins: {"points_per_win": 10, "points_per_loss": 0}

  -- 期間
  start_date DATE,
  end_date DATE,

  -- ステータス
  status series_status NOT NULL DEFAULT 'draft',

  -- タイムスタンプ
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_series_organizer ON series(organizer_id);
CREATE INDEX idx_series_status ON series(status);
CREATE INDEX idx_series_dates ON series(start_date, end_date);

-- 更新時タイムスタンプ自動更新
CREATE TRIGGER update_series_updated_at
  BEFORE UPDATE ON series
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- --------------------------------------------
-- tournamentsにseries_id追加
-- --------------------------------------------
ALTER TABLE tournaments ADD COLUMN series_id UUID REFERENCES series(id) ON DELETE SET NULL;
CREATE INDEX idx_tournaments_series ON tournaments(series_id);

-- --------------------------------------------
-- series_points（シリーズポイント）
-- --------------------------------------------
CREATE TABLE series_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  series_id UUID NOT NULL REFERENCES series(id) ON DELETE CASCADE,
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,

  -- 個人またはチーム（チーム機能追加後に外部キー設定）
  user_id UUID REFERENCES profiles(id),
  team_id UUID,  -- チーム機能追加後: REFERENCES teams(id)

  -- ポイント情報
  points INTEGER NOT NULL DEFAULT 0,
  placement SMALLINT,
  wins SMALLINT DEFAULT 0,
  losses SMALLINT DEFAULT 0,

  -- タイムスタンプ
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- 個人かチームのどちらか必須
  CONSTRAINT chk_point_target CHECK (
    (user_id IS NOT NULL AND team_id IS NULL) OR
    (user_id IS NULL AND team_id IS NOT NULL)
  ),

  -- 重複防止
  UNIQUE(series_id, tournament_id, user_id),
  UNIQUE(series_id, tournament_id, team_id)
);

-- インデックス
CREATE INDEX idx_series_points_series ON series_points(series_id);
CREATE INDEX idx_series_points_tournament ON series_points(tournament_id);
CREATE INDEX idx_series_points_user ON series_points(user_id);
CREATE INDEX idx_series_points_team ON series_points(team_id);

-- ============================================
-- Row Level Security (RLS) ポリシー
-- ============================================

-- --------------------------------------------
-- series
-- --------------------------------------------
ALTER TABLE series ENABLE ROW LEVEL SECURITY;

-- 誰でも閲覧可能
CREATE POLICY "Series are viewable by everyone"
  ON series FOR SELECT
  USING (true);

-- ログインユーザーはシリーズを作成可能
CREATE POLICY "Authenticated users can create series"
  ON series FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND organizer_id = auth.uid());

-- 主催者のみ更新可能
CREATE POLICY "Organizers can update series"
  ON series FOR UPDATE
  USING (organizer_id = auth.uid());

-- 主催者のみ削除可能
CREATE POLICY "Organizers can delete series"
  ON series FOR DELETE
  USING (organizer_id = auth.uid());

-- --------------------------------------------
-- series_points
-- --------------------------------------------
ALTER TABLE series_points ENABLE ROW LEVEL SECURITY;

-- 誰でも閲覧可能
CREATE POLICY "Series points are viewable by everyone"
  ON series_points FOR SELECT
  USING (true);

-- 主催者のみ管理可能
CREATE POLICY "Organizers can insert series points"
  ON series_points FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM series s
      WHERE s.id = series_id AND s.organizer_id = auth.uid()
    )
  );

CREATE POLICY "Organizers can update series points"
  ON series_points FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM series s
      WHERE s.id = series_id AND s.organizer_id = auth.uid()
    )
  );

CREATE POLICY "Organizers can delete series points"
  ON series_points FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM series s
      WHERE s.id = series_id AND s.organizer_id = auth.uid()
    )
  );

-- ============================================
-- ビュー定義
-- ============================================

-- シリーズランキングビュー
CREATE VIEW series_rankings AS
SELECT
  sp.series_id,
  sp.user_id,
  sp.team_id,
  COALESCE(p.display_name, NULL) AS name,
  SUM(sp.points) AS total_points,
  COUNT(sp.tournament_id) AS tournaments_played,
  SUM(sp.wins) AS total_wins,
  SUM(sp.losses) AS total_losses,
  RANK() OVER (PARTITION BY sp.series_id ORDER BY SUM(sp.points) DESC) AS rank
FROM series_points sp
LEFT JOIN profiles p ON p.id = sp.user_id
GROUP BY sp.series_id, sp.user_id, sp.team_id, p.display_name;
