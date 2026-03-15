-- ============================================
-- 015: Series/Tournament 分離リファクタ
-- 既存データ全削除前提の破壊的マイグレーション
-- ============================================

-- ============================================
-- 1. 既存の series 関連オブジェクトを削除
-- ============================================

-- ビュー削除
DROP VIEW IF EXISTS series_rankings CASCADE;

-- トリガー・関数削除
DROP TRIGGER IF EXISTS tournament_completed_auto_points ON tournaments;
DROP FUNCTION IF EXISTS trigger_auto_calculate_series_points();
DROP FUNCTION IF EXISTS calculate_series_points(UUID);
DROP FUNCTION IF EXISTS get_points_for_placement(JSONB, INTEGER);

-- テーブル削除
DROP TABLE IF EXISTS series_points CASCADE;

-- 既存 series テーブルの tournaments 参照を外す
ALTER TABLE tournaments DROP COLUMN IF EXISTS series_id;

-- 既存 series テーブル削除
DROP TABLE IF EXISTS series CASCADE;

-- 不要な ENUM 削除
DROP TYPE IF EXISTS series_status;
DROP TYPE IF EXISTS point_system;
DROP TYPE IF EXISTS point_calculation_mode;

-- ============================================
-- 2. 新 series テーブル作成
-- ============================================

CREATE TABLE series (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 基本情報
  title VARCHAR(100) NOT NULL,
  description TEXT,
  cover_image_url TEXT,
  organizer_id UUID NOT NULL REFERENCES profiles(id),

  -- 公開設定
  visibility visibility NOT NULL DEFAULT 'public',
  status tournament_status NOT NULL DEFAULT 'draft',

  -- チーム戦設定
  entry_type entry_type NOT NULL DEFAULT 'team',
  team_battle_format team_battle_format,
  team_size_min SMALLINT,
  team_size_max SMALLINT,

  -- ルール設定（JSONB で柔軟に）
  series_config JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- 画像テーマ
  theme_config JSONB NOT NULL DEFAULT '{
    "primaryColor": "#3b82f6",
    "secondaryColor": "#1e40af",
    "accentColor": "#f59e0b",
    "bgColor": "#0f172a",
    "textColor": "#f8fafc",
    "fontFamily": "sans-serif"
  }'::jsonb,

  is_demo BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_series_organizer ON series(organizer_id);
CREATE INDEX idx_series_status ON series(status);
CREATE INDEX idx_series_visibility_status ON series(visibility, status);

-- 更新時タイムスタンプ自動更新
CREATE TRIGGER update_series_updated_at
  BEFORE UPDATE ON series
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 3. tournaments にシリーズ参照 + 節番号追加
-- ============================================

ALTER TABLE tournaments
  ADD COLUMN series_id UUID REFERENCES series(id) ON DELETE CASCADE,
  ADD COLUMN round_number SMALLINT;

CREATE INDEX idx_tournaments_series ON tournaments(series_id);
CREATE INDEX idx_tournaments_round ON tournaments(series_id, round_number);

-- ============================================
-- 4. teams にシリーズ/大会の排他所属追加
-- ============================================

ALTER TABLE teams
  ADD COLUMN series_id UUID REFERENCES series(id),
  ADD COLUMN tournament_id UUID REFERENCES tournaments(id);

-- 排他制約: シリーズ or 大会のどちらかに所属
ALTER TABLE teams
  ADD CONSTRAINT teams_belongs_to_one CHECK (
    (series_id IS NOT NULL AND tournament_id IS NULL) OR
    (series_id IS NULL AND tournament_id IS NOT NULL)
  );

CREATE INDEX idx_teams_series ON teams(series_id);
CREATE INDEX idx_teams_tournament ON teams(tournament_id);

-- ============================================
-- 5. tournament_blocks にシリーズ参照追加
-- ============================================

ALTER TABLE tournament_blocks
  ADD COLUMN series_id UUID REFERENCES series(id);

CREATE INDEX idx_tournament_blocks_series ON tournament_blocks(series_id);

-- ============================================
-- 6. RLS: series テーブル
-- ============================================

ALTER TABLE series ENABLE ROW LEVEL SECURITY;

-- 公開シリーズは誰でも閲覧、非公開は主催者のみ
CREATE POLICY "series_select" ON series
  FOR SELECT USING (visibility = 'public' OR organizer_id = auth.uid());

-- ログインユーザーはシリーズを作成可能
CREATE POLICY "series_insert" ON series
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND organizer_id = auth.uid());

-- 主催者のみ更新可能
CREATE POLICY "series_update" ON series
  FOR UPDATE USING (organizer_id = auth.uid());

-- 主催者のみ削除可能
CREATE POLICY "series_delete" ON series
  FOR DELETE USING (organizer_id = auth.uid());

-- ============================================
-- 7. Realtime 設定
-- ============================================

ALTER PUBLICATION supabase_realtime ADD TABLE series;
